require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const https = require('https');
const PDFDocument = require('pdfkit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { execSync } = require('child_process');

// Asegurar que OpenSSL esté instalado en el sistema (requerido por Prisma en Linux)
if (process.platform !== 'win32') {
  try {
    execSync('which openssl || command -v openssl');
  } catch (e) {
    console.log("⚙ OpenSSL no detectado. Intentando instalar en el contenedor...");
    try {
      execSync('apk add --no-cache openssl', { stdio: 'inherit' });
      console.log("✔ OpenSSL instalado correctamente con apk.");
    } catch (apkErr) {
      try {
        execSync('apt-get update && apt-get install -y openssl', { stdio: 'inherit' });
        console.log("✔ OpenSSL instalado correctamente con apt-get.");
      } catch (aptErr) {
        console.log("⚠ No se pudo instalar OpenSSL automáticamente. Si Prisma falla, instala openssl en tu contenedor.");
      }
    }
  }
}

// Autogenerar el cliente de Prisma en tiempo de ejecución si no existe
const clientPath = path.join(__dirname, 'generated-client');
if (!fs.existsSync(clientPath) || !fs.existsSync(path.join(clientPath, 'index.js'))) {
  console.log("=================================================");
  console.log("⚙ Prisma Client no encontrado. Generando...");
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log("✔ Prisma Client generado con éxito.");
    console.log("=================================================");
  } catch (err) {
    console.error("✖ Error al generar Prisma Client en arranque:", err);
  }
}

const { PrismaClient } = require('./generated-client');

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'controlbanquete-super-secret-key-2026';

app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
  if (req.path.includes('/api/webhooks/n8n') || req.path.includes('/api/quotations/generate-pdf') || req.path.includes('/api/quotations')) {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    console.log(`[BODY]`, JSON.stringify(req.body, null, 2));
  }
  next();
});
app.use(express.static(__dirname, { dotfiles: 'allow' }));

console.log("DATABASE_URL en Node:", process.env.DATABASE_URL ? "CONFIGURADA (Longitud: " + process.env.DATABASE_URL.length + ")" : "NO CONFIGURADA");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

// ==========================================
// INICIALIZACIÓN Y SEED DE BASE DE DATOS
// ==========================================
async function initializeDatabase() {
  try {
    const seedModule = await import('./js/seed.js');
    
    // Configuración global
    let settings = await prisma.settings.findUnique({ where: { id: "global" } });
    if (!settings) {
      await prisma.settings.create({ data: { tenantId: req.user.tenantId, 
          id: "global",
          companyName: seedModule.seedSettings.businessName || "Control Banquete",
          baseValues: seedModule.seedSettings
        }
      });
    }

    // Verificar usuarios
    const adminUser = await prisma.user.findUnique({ where: { email: "admin@controlbanquete.com" } });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("123456", 10);
      await prisma.user.createMany({
        data: [
          { email: "admin@controlbanquete.com", name: "Administrador Control Banquete", role: "superadmin", phone: "3163048505", password: hashedPassword },
          { email: "compras@controlbanquete.com", name: "Jefe de Compras", role: "compras", phone: "3007654321", password: hashedPassword },
          { email: "cocina@controlbanquete.com", name: "Chef Principal", role: "cocina", phone: "3011112222", password: hashedPassword },
          { email: "logistica@controlbanquete.com", name: "Coordinador de Logística", role: "logistica", phone: "3023334444", password: hashedPassword },
          { email: "cliente@controlbanquete.com", name: "Sara y Felipe", role: "cliente", phone: "3059990000", password: hashedPassword }
        ]
      });
    }

    // Seed default catering plans
    const cateringPlans = [
      { id: 'cat_basico', name: 'Plan Básico', category: 'catering', price: 36000, description: 'Incluye cóctel de bienvenida, torta o bizcocho, plato fuerte, postre y bebida.' },
      { id: 'cat_infantil', name: 'Plan Infantil', category: 'catering', price: 28000, description: 'Plato adaptado para niños, incluye helado, postre infantil y bebida.' },
      { id: 'cat_premium', name: 'Plan Premium', category: 'catering', price: 55000, description: 'Menú premium de gala con entrada especial, carnes finas, postre gourmet y bebidas ilimitadas.' }
    ];
    for (const plan of cateringPlans) {
      await prisma.product.upsert({
        where: { id: plan.id },
        update: {  price: plan.price, description: plan.description  },
        create: plan
      });
    }

    // Configurar por defecto allowMultiples: true para licores/cervezas/gaseosas existentes
    const multiProducts = await prisma.product.findMany({ where: { tenantId: req.user.tenantId, 
        OR: [
          { name: { contains: 'cerveza', mode: 'insensitive'  } },
          { name: { contains: 'licor', mode: 'insensitive' } },
          { name: { contains: 'aguardiente', mode: 'insensitive' } },
          { name: { contains: 'ron', mode: 'insensitive' } },
          { name: { contains: 'vino', mode: 'insensitive' } },
          { name: { contains: 'champagne', mode: 'insensitive' } },
          { name: { contains: 'gaseosa', mode: 'insensitive' } }
        ]
      }
    });
    for (const p of multiProducts) {
      await prisma.product.update({
        where: { id: p.id },
        data: { allowMultiples: true }
      });
    }

    console.log('✔ Base de datos PostgreSQL inicializada y verificada.');
  } catch (error) {
    console.error('✖ Error al inicializar base de datos PostgreSQL:', error.message);
  }
}

// Iniciar DB en el arranque
initializeDatabase();

// ==========================================
// N8N OUTBOUND WEBHOOK HELPER
// ==========================================
async function sendOutboundWebhook(action, payload) {
  if (!N8N_WEBHOOK_URL) return;
  
  // Limitar webhooks salientes solo a la creación de cotizaciones
  if (action !== 'quotation.created') {
    return;
  }

  const data = JSON.stringify({
    event: action,
    timestamp: new Date().toISOString(),
    data: payload
  });

  const url = new URL(N8N_WEBHOOK_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const clientModule = url.protocol === 'https:' ? https : http;
  const req = clientModule.request(options, (res) => {
    console.log(`Outbound webhook [${action}] enviado a N8N. Respuesta del servidor: ${res.statusCode}`);
  });

  req.on('error', (e) => {
    console.error(`Error enviando webhook a N8N: ${e.message}`);
  });

  req.write(data);
  req.end();
}

// Helpers de compatibilidad para el Frontend (mapeo de campos JSON)
function mapEventResponse(event) {
  if (!event) return null;
  return {
    ...event,
    selectedServices: event.extraServices || [],
    timeline: event.schedule || []
  };
}

function mapQuotationResponse(quotation) {
  if (!quotation) return null;
  return {
    ...quotation,
    selectedServices: quotation.extraServices || []
  };
}

// ==========================================

// ==========================================
// MIDDLEWARE DE SEGURIDAD MULTI-TENANT
// ==========================================
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Falta el token de autorización' });
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    // Si es superadmin o empleado, siempre tendrán un tenantId en el token
    if (!req.user.tenantId) {
      req.user.tenantId = 'default';
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// ENDPOINTS DE API REST
// ==========================================
// 1. Configuración Dinámica
app.get('/api/config', (req, res) => {
  res.json({ useMockData: false });
});

// 2. Configuración Global (Settings)
app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const doc = await prisma.settings.findUnique({ where: { tenantId: req.user.tenantId } });
    return res.json(doc ? doc.baseValues : {});
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    await prisma.settings.upsert({ where: { tenantId: req.user.tenantId },
      update: {  baseValues: data, companyName: data.businessName || 'Control Banquete'  },
      create: { tenantId: req.user.tenantId,  tenantId: req.user.tenantId, companyName: data.businessName || 'Control Banquete', baseValues: data }
    });
    sendOutboundWebhook('settings.updated', data);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Catálogo de Productos y Tarifas
app.get('/api/products', requireAuth, async (req, res) => {
  try {
    const list = await prisma.product.findMany({ where: { tenantId: req.user.tenantId,  tenantId: req.user.tenantId  } });
    // Ordenar por posición (de menor a mayor), y por nombre en caso de empate
    list.sort((a, b) => {
      const posA = a.position !== undefined && a.position !== null ? a.position : 999999;
      const posB = b.position !== undefined && b.position !== null ? b.position : 999999;
      if (posA !== posB) return posA - posB;
      return a.name.localeCompare(b.name);
    });
    
    const structured = { venues: [], photography: [], decoration: [], catering: [], recreation: [], services: { boda: [], grados_otros: [], comuniones: [], quinces: [], fiesta_infantil: [], empresarial: [] }, coctel: [], arroz: [], carne: [], ensalada: [], postre: [], liquido: [], torta: [], pasabocas: [] };
    list.forEach(p => {
      if (p.category === 'venue') structured.venues.push(p);
      else if (p.category === 'photography') structured.photography.push(p);
      else if (p.category === 'decoration') structured.decoration.push(p);
      else if (p.category === 'catering') structured.catering.push(p);
      else if (p.category === 'recreation') structured.recreation.push(p);
      else if (p.category === 'service' && p.eventType) {
        if (p.eventType === 'todos') {
          // Agregar a todas las categorías
          ['boda', 'quinces', 'comuniones', 'grados_otros', 'fiesta_infantil', 'empresarial'].forEach(evt => {
            if (!structured.services[evt]) structured.services[evt] = [];
            structured.services[evt].push(p);
          });
        } else {
          const evts = p.eventType.split(',').map(x => x.trim().toLowerCase());
          evts.forEach(evt => {
            if (evt) {
              if (!structured.services[evt]) structured.services[evt] = [];
              structured.services[evt].push(p);
            }
          });
        }
      } else if (structured[p.category]) {
        structured[p.category].push(p);
      }
    });
    return res.json(structured);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', requireAuth, async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || 'prod_' + Math.random().toString(36).substr(2, 9);
    
    // Extraer campos para prisma
    const data = {
      id,
      category: p.category,
      name: p.name,
      description: p.description || null,
      price: parseFloat(p.price) || 0,
      image: p.image || null,
      infoUrl: p.infoUrl || null,
      eventType: p.eventType || null,
      ingredients: p.ingredients || null,
      shoppingList: p.shoppingList || null,
      managementList: p.managementList || null,
      allowMultiples: p.allowMultiples === true || p.allowMultiples === 'true',
      position: p.position !== undefined ? parseInt(p.position) : undefined
    };

    const saved = await prisma.product.upsert({
      where: { id },
      update: data,
      create: { ...data, tenantId: req.user.tenantId }
    });
    sendOutboundWebhook('product.saved', saved);
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/reorder', requireAuth, async (req, res) => {
  try {
    const { orders } = req.body;
    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders must be an array' });
    }
    
    const updates = orders.map(item => 
      prisma.product.update({
        where: { id: item.id },
        data: { position: parseInt(item.position) }
      })
    );
    await prisma.$transaction(updates);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    sendOutboundWebhook('product.deleted', { id: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3.5. Proveedores (CRUD)
app.get('/api/providers', requireAuth, async (req, res) => {
  try {
    const list = await prisma.provider.findMany({ orderBy: { name: 'asc' } });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/providers', requireAuth, async (req, res) => {
  try {
    const p = req.body;
    const id = p.id || 'prov_' + Math.random().toString(36).substr(2, 9);
    const data = {
      id,
      name: p.name,
      phone: p.phone || null,
      email: p.email || null,
      address: p.address || null,
      description: p.description || null
    };

    const saved = await prisma.provider.upsert({
      where: { id },
      update: data,
      create: { ...data, tenantId: req.user.tenantId }
    });
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/providers/:id', requireAuth, async (req, res) => {
  try {
    await prisma.provider.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3.6. Notificaciones
app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const list = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.body;
    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true }
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Eventos
app.get('/api/events', requireAuth, async (req, res) => {
  try {
    const list = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
    const mapped = list.map(mapEventResponse);
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', requireAuth, async (req, res) => {
  try {
    const event = req.body;
    const id = event.id || 'e_' + Math.random().toString(36).substr(2, 9);
    const paidAmount = (event.payments || []).reduce((sum, p) => sum + p.amount, 0);
    const totalValue = parseFloat(event.totalValue) || 0;
    const balance = totalValue - paidAmount;

    const data = {
      id,
      clientName: event.clientName || 'Sin Nombre',
      clientEmail: event.clientEmail || '',
      clientPhone: event.clientPhone || '',
      eventType: event.eventType || 'grados_otros',
      date: event.date || new Date().toISOString().substring(0, 10),
      time: event.time || '',
      guests: parseInt(event.guests) || 0,
      totalValue,
      paidAmount,
      balance,
      discount: parseFloat(event.discount) || 0,
      discountLabel: event.discountLabel || '',
      status: event.status || 'confirmado',
      notes: event.notes || '',
      menu: event.menu || null,
      extraServices: event.selectedServices || event.extraServices || null,
      payments: event.payments || null,
      schedule: event.timeline || event.schedule || null,
      clientId: event.clientId || null,
      venueId: event.venueId || null,
      photographyId: event.photographyId || null,
      decorationId: event.decorationId || null,
      recreationId: event.recreationId || null,
      cateringId: event.cateringId || null,
      quotationId: event.quotationId || null,
      photoDriveLink: event.photoDriveLink || null,
      photoSelectionText: event.photoSelectionText || null,
      photoSelectionLocked: event.photoSelectionLocked === true || event.photoSelectionLocked === 'true',
      photoStatus: event.photoStatus || 'sin_fotografia',
      allowColorSelection: event.allowColorSelection === true || event.allowColorSelection === 'true',
      selectedColor: event.selectedColor || null,
      selectedColors: event.selectedColors || null,
      appointments: event.appointments || null,
      completedTasks: event.completedTasks || null,
      completedPurchases: event.completedPurchases || null
    };

    const saved = await prisma.event.upsert({
      where: { id },
      update: data,
      create: { ...data, tenantId: req.user.tenantId }
    });
    sendOutboundWebhook('event.created', saved);
    return res.json(mapEventResponse(saved));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;
    
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const mergedPayments = updateData.payments !== undefined ? updateData.payments : existing.payments;
    const paidAmount = (mergedPayments || []).reduce((sum, p) => sum + p.amount, 0);
    const totalValue = updateData.totalValue !== undefined ? parseFloat(updateData.totalValue) : existing.totalValue;
    const balance = totalValue - paidAmount;

    // Construir objeto data explícito para evitar mandar campos desconocidos a Prisma
    const data = {};
    if (updateData.clientName !== undefined) data.clientName = updateData.clientName;
    if (updateData.clientEmail !== undefined) data.clientEmail = updateData.clientEmail;
    if (updateData.clientPhone !== undefined) data.clientPhone = updateData.clientPhone;
    if (updateData.eventType !== undefined) data.eventType = updateData.eventType;
    if (updateData.date !== undefined) data.date = updateData.date;
    if (updateData.time !== undefined) data.time = updateData.time;
    if (updateData.guests !== undefined) data.guests = parseInt(updateData.guests) || 0;
    if (updateData.discount !== undefined) data.discount = parseFloat(updateData.discount) || 0;
    if (updateData.discountLabel !== undefined) data.discountLabel = updateData.discountLabel;
    if (updateData.status !== undefined) data.status = updateData.status;
    if (updateData.notes !== undefined) data.notes = updateData.notes;
    if (updateData.menu !== undefined) data.menu = updateData.menu;
    
    if (updateData.selectedServices !== undefined || updateData.extraServices !== undefined) {
      data.extraServices = updateData.selectedServices !== undefined ? updateData.selectedServices : updateData.extraServices;
    }
    if (updateData.timeline !== undefined || updateData.schedule !== undefined) {
      data.schedule = updateData.timeline !== undefined ? updateData.timeline : updateData.schedule;
    }
    
    if (updateData.payments !== undefined) data.payments = updateData.payments;
    if (updateData.clientId !== undefined) data.clientId = updateData.clientId;
    if (updateData.venueId !== undefined) data.venueId = updateData.venueId;
    if (updateData.photographyId !== undefined) data.photographyId = updateData.photographyId;
    if (updateData.decorationId !== undefined) data.decorationId = updateData.decorationId;
    if (updateData.recreationId !== undefined) data.recreationId = updateData.recreationId;
    if (updateData.cateringId !== undefined) data.cateringId = updateData.cateringId;
    if (updateData.quotationId !== undefined) data.quotationId = updateData.quotationId;
    if (updateData.photoDriveLink !== undefined) data.photoDriveLink = updateData.photoDriveLink;
    if (updateData.photoSelectionText !== undefined) data.photoSelectionText = updateData.photoSelectionText;
    if (updateData.photoSelectionLocked !== undefined) {
      data.photoSelectionLocked = updateData.photoSelectionLocked === true || updateData.photoSelectionLocked === 'true';
    }
    if (updateData.photoStatus !== undefined) data.photoStatus = updateData.photoStatus;
    if (updateData.allowColorSelection !== undefined) {
      data.allowColorSelection = updateData.allowColorSelection === true || updateData.allowColorSelection === 'true';
    }
    if (updateData.selectedColor !== undefined) data.selectedColor = updateData.selectedColor;
    if (updateData.selectedColors !== undefined) data.selectedColors = updateData.selectedColors;
    if (updateData.appointments !== undefined) data.appointments = updateData.appointments;
    if (updateData.completedTasks !== undefined) data.completedTasks = updateData.completedTasks;
    if (updateData.completedPurchases !== undefined) data.completedPurchases = updateData.completedPurchases;
    
    data.totalValue = totalValue;
    data.paidAmount = paidAmount;
    data.balance = balance;

    const saved = await prisma.event.update({
      where: { id },
      data
    });

    // Triggers de Notificaciones
    if (updateData.payments !== undefined) {
      const oldPaymentsCount = (existing.payments || []).length;
      const newPaymentsCount = (updateData.payments || []).length;
      if (newPaymentsCount > oldPaymentsCount) {
        const newPayment = updateData.payments[newPaymentsCount - 1];
        await prisma.notification.create({ data: { tenantId: req.user.tenantId, 
            title: "Abono Registrado",
            message: `Se registró un pago de $${newPayment.amount.toLocaleString()} COP para el evento de ${existing.clientName}.`,
            type: "payment",
            role: "superadmin"
          }
        }).catch(e => console.error("Error al crear notificación:", e));
      }
    }

    if (updateData.contractSigned === true && existing.status !== 'contrato_firmado') {
      sendOutboundWebhook('contract.signed', saved);
      await prisma.notification.create({ data: { tenantId: req.user.tenantId, 
          title: "Contrato Firmado",
          message: `El cliente ${saved.clientName} ha firmado el contrato digital de su evento.`,
          type: "contract",
          role: "superadmin"
        }
      }).catch(e => console.error("Error al crear notificación:", e));
    } else {
      sendOutboundWebhook('event.updated', saved);
    }
    return res.json(mapEventResponse(saved));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Cotizaciones
app.get('/api/quotations', requireAuth, async (req, res) => {
  try {
    const list = await prisma.quotation.findMany({ orderBy: { createdAt: 'desc' } });
    const mapped = list.map(mapQuotationResponse);
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotations', requireAuth, async (req, res) => {
  try {
    const q = req.body;
    const id = q.id || 'q_' + Math.random().toString(36).substr(2, 9);
    
    const data = {
      id,
      clientName: q.clientName || 'Sin Nombre',
      clientEmail: q.clientEmail || '',
      clientPhone: q.clientPhone || '',
      eventType: q.eventType || 'grados_otros',
      date: q.date || new Date().toISOString().substring(0, 10),
      guests: parseInt(q.guests) || 0,
      totalValue: parseFloat(q.totalValue) || 0,
      discount: parseFloat(q.discount) || 0,
      discountLabel: q.discountLabel || '',
      status: q.status || 'pendiente',
      notes: q.notes || '',
      menu: q.menu || null,
      extraServices: q.selectedServices || q.extraServices || null,
      venueId: q.venueId || null,
      photographyId: q.photographyId || null,
      decorationId: q.decorationId || null,
      cateringId: q.cateringId || null,
      recreationId: q.recreationId || null
    };

    const saved = await prisma.quotation.upsert({
      where: { id },
      update: data,
      create: { ...data, tenantId: req.user.tenantId }
    });
    sendOutboundWebhook('quotation.created', saved);

    await prisma.notification.create({ data: { tenantId: req.user.tenantId, 
        title: "Nueva Cotización Recibida",
        message: `El cliente ${saved.clientName} ha enviado una solicitud para ${saved.eventType} en ${saved.date}.`,
        type: "quote",
        role: "superadmin"
      }
    }).catch(e => console.error("Error al crear notificación:", e));

    return res.json(mapQuotationResponse(saved));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/quotations/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    const q = req.body;
    
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Quotation not found' });

    // Limpiar y mapear datos explícitamente para evitar campos desconocidos en Prisma
    const data = {};
    if (q.clientName !== undefined) data.clientName = q.clientName;
    if (q.clientEmail !== undefined) data.clientEmail = q.clientEmail;
    if (q.clientPhone !== undefined) data.clientPhone = q.clientPhone;
    if (q.eventType !== undefined) data.eventType = q.eventType;
    if (q.date !== undefined) data.date = q.date;
    if (q.guests !== undefined) data.guests = parseInt(q.guests) || 0;
    if (q.totalValue !== undefined) data.totalValue = parseFloat(q.totalValue) || 0;
    if (q.discount !== undefined) data.discount = parseFloat(q.discount) || 0;
    if (q.discountLabel !== undefined) data.discountLabel = q.discountLabel;
    if (q.status !== undefined) data.status = q.status;
    if (q.notes !== undefined) data.notes = q.notes;
    if (q.menu !== undefined) data.menu = q.menu;
    
    if (q.selectedServices !== undefined || q.extraServices !== undefined) {
      data.extraServices = q.selectedServices !== undefined ? q.selectedServices : q.extraServices;
    }
    
    if (q.venueId !== undefined) data.venueId = q.venueId;
    if (q.photographyId !== undefined) data.photographyId = q.photographyId;
    if (q.decorationId !== undefined) data.decorationId = q.decorationId;
    if (q.cateringId !== undefined) data.cateringId = q.cateringId;
    if (q.recreationId !== undefined) data.recreationId = q.recreationId;

    const saved = await prisma.quotation.update({
      where: { id },
      data
    });
    sendOutboundWebhook('quotation.updated', saved);
    return res.json(mapQuotationResponse(saved));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/quotations/:id', requireAuth, async (req, res) => {
  try {
    await prisma.quotation.delete({ where: { id: req.params.id } });
    sendOutboundWebhook('quotation.deleted', { id: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Recetario
app.get('/api/recipes', requireAuth, async (req, res) => {
  try {
    const list = await prisma.recipe.findMany({ where: { tenantId: req.user.tenantId,  tenantId: req.user.tenantId  } });
    const mapped = list.map(item => {
      const supplies = item.supplies || {};
      return {
        id: item.id,
        productId: item.productId,
        name: supplies.name || 'Sin nombre',
        category: supplies.category || 'general',
        baseGuests: supplies.baseGuests || 50,
        procedure: supplies.procedure || '',
        ingredients: supplies.ingredients || []
      };
    });
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes', requireAuth, async (req, res) => {
  try {
    const r = req.body;
    const id = r.id || 'rec_' + Math.random().toString(36).substr(2, 9);
    
    const suppliesData = r.supplies || {
      name: r.name || 'Sin nombre',
      category: r.category || 'general',
      baseGuests: parseInt(r.baseGuests) || 50,
      procedure: r.procedure || '',
      ingredients: r.ingredients || []
    };

    const saved = await prisma.recipe.upsert({
      where: { id },
      update: {  
        productId: r.productId || 'unknown', 
        supplies: suppliesData 
       },
      create: { tenantId: req.user.tenantId,  
        id, 
        productId: r.productId || 'unknown', 
        supplies: suppliesData 
      }
    });

    return res.json({
      id: saved.id,
      productId: saved.productId,
      name: saved.supplies.name || '',
      category: saved.supplies.category || '',
      baseGuests: saved.supplies.baseGuests || 50,
      procedure: saved.supplies.procedure || '',
      ingredients: saved.supplies.ingredients || []
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/recipes/:id', requireAuth, async (req, res) => {
  try {
    await prisma.recipe.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Inventario
app.get('/api/inventory', requireAuth, async (req, res) => {
  try {
    const list = await prisma.inventory.findMany({ where: { tenantId: req.user.tenantId,  tenantId: req.user.tenantId  } });
    const mapped = list.map(item => ({
      ...item,
      quantity: item.stock
    }));
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', requireAuth, async (req, res) => {
  try {
    const i = req.body;
    const id = i.id || 'inv_' + Math.random().toString(36).substr(2, 9);
    const data = {
      id,
      category: i.category || 'general',
      name: i.name || 'Sin nombre',
      unit: i.unit || 'und',
      costPerUnit: parseFloat(i.costPerUnit) || 0,
      stock: parseFloat(i.stock !== undefined ? i.stock : i.quantity) || 0,
      minStock: parseFloat(i.minStock) || 0,
      supplier: i.supplier || ''
    };
    const saved = await prisma.inventory.upsert({
      where: { id },
      update: data,
      create: { ...data, tenantId: req.user.tenantId }
    });

    if (saved.stock < saved.minStock) {
      await prisma.notification.create({ data: { tenantId: req.user.tenantId, 
          title: "Inventario Bajo",
          message: `El insumo ${saved.name} se encuentra por debajo del stock mínimo (${saved.stock} / ${saved.minStock} ${saved.unit}).`,
          type: "inventory",
          role: "compras"
        }
      }).catch(e => console.error("Error al crear notificación:", e));
    }

    // Map stock to quantity for frontend response compatibility
    const responseData = {
      ...saved,
      quantity: saved.stock
    };
    return res.json(responseData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', requireAuth, async (req, res) => {
  try {
    await prisma.inventory.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Usuarios y Autenticación JWT
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const list = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, phone: true }
    });
    // Frontend espera uid en lugar de id
    const mapped = list.map(u => ({ uid: u.id, ...u }));
    return res.json(mapped);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireAuth, async (req, res) => {
  try {
    const u = req.body;
    let uid = u.uid || u.id;
    if (!uid) {
      uid = 'usr_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Si no hay password, ponemos uno por defecto (solo para creación desde admin)
    const password = u.password || '123456';
    const hashedPassword = await bcrypt.hash(password, 10);

    const data = {
      id: uid,
      email: u.email,
      name: u.name || 'Usuario',
      role: u.role || 'cliente',
      phone: u.phone || '',
      password: hashedPassword
    };

    const existing = await prisma.user.findUnique({ where: { id: uid } });
    let saved;
    if (existing) {
      // Si ya existe y se manda update, no actualizar password aquí
      saved = await prisma.user.update({
        where: { id: uid },
        data: { email: u.email, name: u.name, role: u.role, phone: u.phone }
      });
    } else {
      saved = await prisma.user.create({ data });
    }

    sendOutboundWebhook('user.saved', saved);
    return res.json({ uid: saved.id, email: saved.email, name: saved.name, role: saved.role });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:uid', requireAuth, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.uid } });
    sendOutboundWebhook('user.deleted', { uid: req.params.uid });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Login Endpoint

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, businessName, phone } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'El email ya está en uso' });

    // Generar tenantId único para el nuevo negocio
    const tenantId = 't_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        tenantId,
        email,
        password: hashedPassword,
        name,
        businessName,
        phone,
        role: 'superadmin',
        subscriptionStatus: 'trial',
        trialStartDate: new Date()
      }
    });

    // Crear Settings base para el tenant
    await prisma.settings.create({
      data: {
        tenantId,
        companyName: businessName || 'Mi Negocio',
        baseValues: { businessName, defaultLanguage: 'es' }
      }
    });

    const token = jwt.sign(
      { uid: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: { uid: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { uid: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: { uid: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
// SUBSCRIPTION ENDPOINTS (Google Play)
// ==========================================

let globalConfig = {
  trialDays: parseInt(process.env.TRIAL_DAYS || '3'),
  supportEmail: 'soporte@controlbanquete.app',
  plansEnabled: true
};

function getTrialStatus(user) {
  if (!user) return { isActive: false, isTrial: false, daysLeft: 0, status: 'none', planName: 'Ninguno' };
  
  if (user.subscriptionStatus === 'expired') {
    return { status: 'expired', daysLeft: 0, plan: null };
  }
  if (user.subscriptionStatus === 'cancelled' || user.subscriptionStatus === 'canceled') {
    return { status: 'cancelled', daysLeft: 0, plan: null };
  }
  
  if (user.subscriptionStatus === 'active') {
    const planNames = { monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual', 'cb_monthly': 'Mensual', 'cb_quarterly': 'Trimestral', 'cb_yearly': 'Anual' };
    return {
      isActive: true,
      isTrial: false,
      daysLeft: 999,
      status: 'active',
      planName: planNames[user.subscriptionPlan] || user.subscriptionPlan
    };
  }
  
  const TRIAL_DAYS = parseInt(user.customTrialDays != null ? user.customTrialDays : globalConfig.trialDays);
  const start = new Date(user.trialStartDate || user.createdAt);
  const now = new Date();
  const msPassed = now - start;
  const daysPassed = Math.floor(msPassed / (1000 * 60 * 60 * 24));
  const daysLeft = Math.max(0, TRIAL_DAYS - daysPassed);
  const isTrial = daysLeft > 0;
  
  return {
    isActive: isTrial,
    isTrial: true,
    daysLeft,
    status: isTrial ? 'trial' : 'expired',
    planName: 'Prueba Gratuita'
  };
}

app.get('/api/subscription/status', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.uid } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    const trialInfo = getTrialStatus(user);
    res.json({
      ...trialInfo,
      email: user.email,
      businessName: "Tu Negocio",
      trialStartDate: user.trialStartDate || user.createdAt
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscription/activate', requireAuth, async (req, res) => {
  try {
    const { plan, purchaseToken } = req.body;
    
    if (!purchaseToken) return res.status(400).json({ error: 'Token de compra inválido' });

    // Bloquear tokens de simulación/desarrollo en producción
    if (purchaseToken.startsWith('dev_token_') && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'El modo desarrollo no está permitido en producción' });
    }

    const now = new Date();
    const expiry = new Date(now);
    if (plan.includes('monthly') || plan === 'mensual') expiry.setMonth(expiry.getMonth() + 1);
    else if (plan.includes('quarterly') || plan === 'trimestral') expiry.setMonth(expiry.getMonth() + 3);
    else if (plan.includes('year') || plan.includes('annual') || plan === 'anual') expiry.setFullYear(expiry.getFullYear() + 1);
    else expiry.setMonth(expiry.getMonth() + 1); // fallback

    await prisma.user.update({
      where: { id: req.user.uid },
      data: {
        subscriptionStatus: 'active',
        subscriptionPlan: plan,
        subscriptionExpiry: expiry
      }
    });

    res.json({ success: true, plan, expiry: expiry.toISOString() });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscription/restore', requireAuth, async (req, res) => {
  // TODO: Conectar con Google Play Developer API
  res.json({ success: false, message: 'No se encontró una suscripción activa para restaurar' });
});

app.post('/api/subscription/cancel', requireAuth, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.uid },
      data: { subscriptionStatus: 'canceled' }
    });
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================

// ==========================================
// RUTAS PÚBLICAS (COTIZADOR SAAS)
// ==========================================
app.get('/api/public/business', async (req, res) => {
  const tenantId = req.query.t || 'default';
  try {
    const settings = await prisma.settings.findUnique({ where: { tenantId } });
    if (!settings) return res.status(404).json({ error: 'Negocio no encontrado' });
    
    // Obtener info del dueño
    const owner = await prisma.user.findFirst({ where: { tenantId, role: 'superadmin' } });
    
    res.json({
      tenantId,
      businessName: settings.companyName || owner?.businessName || 'Control Banquete',
      phone: owner?.phone || '',
      email: owner?.email || '',
      settings: settings.baseValues || {}
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/products', async (req, res) => {
  const tenantId = req.query.t || 'default';
  try {
    const list = await prisma.product.findMany({
      where: { tenantId, active: true },
      orderBy: [ { position: 'asc' }, { name: 'asc' } ]
    });
    
    const structured = {
      venues: [], photography: [], decoration: [], catering: [], recreation: [],
      services: { boda: [], grados_otros: [], comuniones: [], quinces: [], fiesta_infantil: [], empresarial: [] },
      coctel: [], arroz: [], carne: [], ensalada: [], postre: [], liquido: [], torta: [], pasabocas: []
    };

    list.forEach(p => {
      if (p.category === 'venue') structured.venues.push(p);
      else if (p.category === 'photography') structured.photography.push(p);
      else if (p.category === 'decoration') structured.decoration.push(p);
      else if (p.category === 'catering') structured.catering.push(p);
      else if (p.category === 'recreation') structured.recreation.push(p);
      else if (p.category === 'service' && p.eventType) {
        const evts = p.eventType === 'todos'
          ? ['boda','quinces','comuniones','grados_otros','fiesta_infantil','empresarial']
          : p.eventType.split(',').map(x => x.trim().toLowerCase());
        evts.forEach(evt => { if (!structured.services[evt]) structured.services[evt] = []; structured.services[evt].push(p); });
      } else if (structured[p.category]) structured[p.category].push(p);
    });

    res.json(structured);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/public/availability', async (req, res) => {
  const tenantId = req.query.t || 'default';
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'Falta parámetro date' });
  try {
    const events = await prisma.event.findMany({
      where: { tenantId, date, status: { not: 'cancelado' } }
    });
    const bookedVenueIds = events.map(e => e.venueId).filter(Boolean);
    res.json({ bookedVenueIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/public/quotations', async (req, res) => {
  const tenantId = req.query.t || 'default';
  const q = req.body;
  try {
    const item = await prisma.quotation.create({
      data: {
        tenantId,
        clientName: q.clientName || 'Sin Nombre', 
        clientEmail: q.clientEmail || '',
        clientPhone: q.clientPhone || '', 
        eventType: q.eventType || 'grados_otros',
        date: q.date || new Date().toISOString().substring(0, 10),
        guests: parseInt(q.guests) || 0, 
        totalValue: parseFloat(q.totalValue) || 0,
        discount: 0, 
        discountLabel: '', 
        status: 'nueva',
        notes: q.notes || 'Solicitud desde el cotizador público.',
        menu: q.menu || null, 
        extraServices: q.selectedServices || [],
        venueId: q.venueId || null, 
        photographyId: q.photographyId || null,
        decorationId: q.decorationId || null, 
        cateringId: q.cateringId || null,
        recreationId: q.recreationId || null
      }
    });

    await prisma.notification.create({
      data: {
        tenantId,
        title: '🎉 Nueva Cotización Recibida',
        message: `${item.clientName} solicita cotización para ${item.eventType} el ${item.date} (${item.guests} personas). Total estimado: ${item.totalValue.toLocaleString('es-CO')} COP`,
        type: 'quote',
        role: 'superadmin'
      }
    });

    res.json({ success: true, id: item.id, message: '¡Cotización enviada!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// INBOUND WEBHOOK N8N
// ==========================================
app.post('/api/webhooks/n8n', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.action) return res.status(400).json({ error: 'Falta parámetro action' });

  try {
    switch (payload.action) {
      case 'create_quotation': {
        const q = payload.data;
        if (!q) return res.status(400).json({ error: 'Falta data de la cotización' });

        // Buscar si ya existe una cotización reciente (últimos 3 minutos) con datos similares para evitar duplicados sin servicios
        const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
        let existingQuote = null;
        
        if (q.clientEmail || q.clientPhone || q.clientName) {
          existingQuote = await prisma.quotation.findFirst({
            where: {
              OR: [
                q.clientEmail ? { clientEmail: q.clientEmail } : null,
                q.clientPhone ? { clientPhone: q.clientPhone } : null,
                q.clientName ? { clientName: q.clientName } : null
              ].filter(Boolean),
              createdAt: { gte: threeMinutesAgo }
            },
            orderBy: { createdAt: 'desc' }
          });
        }

        if (existingQuote) {
          console.log(`[Webhook N8N] Reutilizando cotización existente para evitar pérdida de servicios: ${existingQuote.id}`);
          
          // Si la request de N8N trae campos más actualizados (como totalValue o discount calculados por N8N), los actualizamos
          const updateData = {};
          if (q.totalValue && !existingQuote.totalValue) updateData.totalValue = parseFloat(q.totalValue);
          if (q.discount && !existingQuote.discount) updateData.discount = parseFloat(q.discount);
          if (q.discountLabel && !existingQuote.discountLabel) updateData.discountLabel = q.discountLabel;
          
          if (Object.keys(updateData).length > 0) {
            await prisma.quotation.update({
              where: { id: existingQuote.id },
              data: updateData
            });
          }
          
          return res.json({ 
            success: true, 
            message: 'Cotización existente reutilizada (evitando duplicado vacío)', 
            id: existingQuote.id 
          });
        }

        const id = q.id || 'q_n8n_' + Math.random().toString(36).substr(2, 9);
        const data = {
          id,
          clientName: q.clientName || 'Lead N8N',
          clientEmail: q.clientEmail || '',
          clientPhone: q.clientPhone || '',
          eventType: q.eventType || 'grados_otros',
          date: q.date || new Date().toISOString().substring(0, 10),
          guests: parseInt(q.guests) || 0,
          totalValue: parseFloat(q.totalValue) || 0,
          discount: parseFloat(q.discount) || 0,
          discountLabel: q.discountLabel || '',
          status: q.status || 'pendiente',
          notes: q.notes || '',
          menu: q.menu || null,
          extraServices: q.selectedServices || q.extraServices || null,
          venueId: q.venueId || null,
          photographyId: q.photographyId || null,
          decorationId: q.decorationId || null,
          cateringId: q.cateringId || null,
          recreationId: q.recreationId || null
        };
        const saved = await prisma.quotation.create({ data });
        await prisma.notification.create({ data: { tenantId: req.user.tenantId, 
            title: "Nueva Cotización Recibida (Webhook)",
            message: `El cliente ${saved.clientName} ha enviado una solicitud para ${saved.eventType} en ${saved.date}.`,
            type: "quote",
            role: "superadmin"
          }
        }).catch(e => console.error("Error al crear notificación:", e));
        return res.json({ success: true, message: 'Cotización creada vía webhook', id });
      }

      case 'update_event_status': {
        const { id, status } = payload;
        if (!id || !status) return res.status(400).json({ error: 'Falta id o status de evento' });
        await prisma.event.update({
          where: { id },
          data: { status }
        });
        return res.json({ success: true, message: `Estado del evento ${id} actualizado a ${status}` });
      }

      default:
        return res.status(400).json({ error: `Acción no soportada: ${payload.action}` });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper para traducir el tipo de evento
function translateEventType(type) {
  if (!type) return '';
  const map = {
    boda: 'Boda (Matrimonio)',
    quinces: 'Fiesta de Quinces',
    grados_otros: 'Cumpleaños, Grados u Otros',
    comuniones: 'Primera Comunión',
    todos: 'Todos los eventos',
    fiesta_infantil: 'Fiesta Infantil',
    empresarial: 'Evento Empresarial'
  };
  if (type.includes(',')) {
    return type.split(',').map(t => map[t.trim().toLowerCase()] || t.trim()).join(', ');
  }
  return map[type.toLowerCase()] || type;
}

// Helper para calcular detalles de la cotización dinámicamente
async function calculateQuotationDetails(data) {
  const guests = Math.max(10, parseInt(data.guests) || 50);
  
  // 1. Obtener configuraciones de base de datos
  let settingsObj = { costoMesero: 110000, costoAlimentacion: 36000, descripcionAlimentacion: '' };
  try {
    const sett = await prisma.settings.findUnique({ where: { tenantId: req.user.tenantId } });
    if (sett && sett.baseValues) {
      settingsObj = { ...settingsObj, ...sett.baseValues };
    }
  } catch(e) {}

  const meseros = Math.ceil(guests / 35);
  const costoMeseros = meseros * (settingsObj.costoMesero || 110000);

  // 2. Obtener productos de base de datos
  let allProducts = { venues: [], photography: [], decoration: [], catering: [], recreation: [], services: {}, flat: [] };
  try {
    const list = await prisma.product.findMany({ where: { tenantId: req.user.tenantId,  tenantId: req.user.tenantId  } });
    allProducts.flat = list;
    list.forEach(p => {
      if (p.category === 'venue') allProducts.venues.push(p);
      else if (p.category === 'photography') allProducts.photography.push(p);
      else if (p.category === 'decoration') allProducts.decoration.push(p);
      else if (p.category === 'catering') allProducts.catering.push(p);
      else if (p.category === 'recreation') allProducts.recreation.push(p);
      else if (p.category === 'service' && p.eventType) {
        if (p.eventType === 'todos') {
          ['boda', 'quinces', 'comuniones', 'grados_otros', 'fiesta_infantil', 'empresarial'].forEach(evt => {
            if (!allProducts.services[evt]) allProducts.services[evt] = [];
            allProducts.services[evt].push(p);
          });
        } else {
          const evts = p.eventType.split(',').map(x => x.trim().toLowerCase());
          evts.forEach(evt => {
            if (evt) {
              if (!allProducts.services[evt]) allProducts.services[evt] = [];
              allProducts.services[evt].push(p);
            }
          });
        }
      }
    });
  } catch(e) {}

  // Calcular catering dinámicamente
  let costoAlimentacion = 0;
  let descripcionAlimentacion = 'Sin servicio de catering';
  let selectedCateringPlanName = 'Sin Alimentación';

  if (data.cateringId !== undefined && data.cateringId !== null) {
    if (data.cateringId === 'none' || data.cateringId === 'ninguno' || data.cateringId === '') {
      costoAlimentacion = 0;
      descripcionAlimentacion = 'No incluye servicio de alimentación.';
      selectedCateringPlanName = 'Sin Alimentación';
    } else {
      const selectedPlan = allProducts.catering.find(p => p.id === data.cateringId || p.name === data.cateringId);
      if (selectedPlan) {
        costoAlimentacion = guests * selectedPlan.price;
        descripcionAlimentacion = selectedPlan.description || selectedPlan.name;
        selectedCateringPlanName = selectedPlan.name;
      } else {
        costoAlimentacion = 0;
        descripcionAlimentacion = 'Plan de catering no encontrado.';
        selectedCateringPlanName = 'No encontrado';
      }
    }
  } else {
    // Si no viene cateringId, usar el fallback legacy global
    costoAlimentacion = guests * (settingsObj.costoAlimentacion || 36000);
    descripcionAlimentacion = settingsObj.descripcionAlimentacion || 'Servicio de Catering Básico';
    selectedCateringPlanName = 'Catering Estándar';
  }

  // Normalizar el tipo de evento recibido
  let eventType = 'grados_otros';
  if (data.eventType) {
    const etLower = data.eventType.toLowerCase();
    if (etLower.includes('boda') || etLower.includes('matrimonio')) eventType = 'boda';
    else if (etLower.includes('quince') || etLower.includes('15')) eventType = 'quinces';
    else if (etLower.includes('comunión') || etLower.includes('comunion') || etLower.includes('bautizo')) eventType = 'comuniones';
    else if (etLower.includes('infantil') || etLower.includes('niño') || etLower.includes('nino')) eventType = 'fiesta_infantil';
    else if (etLower.includes('empresa') || etLower.includes('corporativo') || etLower.includes('empresarial')) eventType = 'empresarial';
    else if (['boda', 'quinces', 'comuniones', 'grados_otros', 'fiesta_infantil', 'empresarial'].includes(etLower)) eventType = etLower;
  }

  const availableServices = allProducts.services[eventType] || [];

  const venueOptions = [];
  allProducts.venues.forEach(v => {
    const totalVenueCost = costoMeseros + costoAlimentacion + v.price;
    venueOptions.push({
      id: v.id,
      name: v.name,
      price: v.price,
      total: totalVenueCost,
      description: v.description || ''
    });
  });

  return {
    guests,
    meseros,
    costoMeseros,
    costoAlimentacion,
    descripcionAlimentacion,
    selectedCateringPlanName,
    venueOptions,
    availableServices,
    eventType,
    settings: settingsObj,
    allProducts
  };
}

function drawPDFQuote(doc, details, rawData) {
  const marginX = 40;
  
  // Fondo de Cabecera (Navy/Slate Premium)
  doc.rect(0, 0, doc.page.width, 130).fill('#1a1d2e');
  
  // Línea de Acento Dorado en Cabecera
  doc.rect(0, 127, doc.page.width, 3).fill('#b39264');
  
  // Título Principal
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(22)
     .text('CONTROL BANQUETE', marginX, 38);
     
  doc.fillColor('#a0aec0')
     .font('Helvetica')
     .fontSize(9.5)
     .text('Sistema de Gestión Integral de Eventos', marginX, 64);
     
  // Contacto Cabecera
  const phone1 = details.settings.telefonoContacto1 || '3163048505';
  const phone2 = details.settings.telefonoContacto2 || '3197188973';
  doc.fillColor('#ffffff')
     .fontSize(8.5)
     .text(`WhatsApp: ${phone1}${phone2 ? ' / ' + phone2 : ''}`, doc.page.width - 240, 43, { align: 'right', width: 200 })
     .text('info@controlbanquete.com', doc.page.width - 240, 58, { align: 'right', width: 200 });

  // Título de Propuesta
  doc.fillColor('#1a1d2e')
     .font('Helvetica-Bold')
     .fontSize(14)
     .text('PROPUESTA DE SERVICIO ESTIMADA', marginX, 150);
     
  doc.moveTo(marginX, 168).lineTo(doc.page.width - marginX, 168).strokeColor('#b39264').lineWidth(1).stroke();

  // Datos de Cliente y Evento
  const clientName = rawData.clientName || 'Cliente Distinguido';
  const clientEmail = rawData.clientEmail || 'No Proporcionado';
  const clientPhone = rawData.clientPhone || 'No Proporcionado';
  const eventTypeName = translateEventType(details.eventType);
  const dateStr = rawData.date || new Date().toISOString().substring(0, 10);
  
  // Dibujar tarjetas para los datos (x1 = 40, x2 = 305)
  doc.rect(marginX, 185, 250, 65).fill('#faf8f5');
  doc.rect(marginX, 185, 250, 65).strokeColor('#ebdcc5').lineWidth(0.5).stroke();
  
  doc.rect(305, 185, 250, 65).fill('#faf8f5');
  doc.rect(305, 185, 250, 65).strokeColor('#ebdcc5').lineWidth(0.5).stroke();
  
  // Contenido Tarjeta 1
  doc.fillColor('#1a1d2e').font('Helvetica-Bold').fontSize(8.5).text('INFORMACIÓN DEL CLIENTE', marginX + 10, 193);
  doc.font('Helvetica').fontSize(8).fillColor('#4a5568');
  doc.text(`Nombre: ${clientName}`, marginX + 10, 206);
  doc.text(`Correo: ${clientEmail}`, marginX + 10, 217);
  doc.text(`WhatsApp: ${clientPhone}`, marginX + 10, 228);

  // Contenido Tarjeta 2
  doc.fillColor('#1a1d2e').font('Helvetica-Bold').fontSize(8.5).text('DETALLES DEL EVENTO', 315, 193);
  doc.font('Helvetica').fontSize(8).fillColor('#4a5568');
  doc.text(`Tipo de Evento: ${eventTypeName}`, 315, 206);
  doc.text(`Fecha Planeada: ${dateStr}`, 315, 217);
  doc.text(`Invitados Estimados: ${details.guests} personas`, 315, 228);

  // Tabla de Costos Base (Catering y Meseros)
  doc.fillColor('#1a1d2e')
     .font('Helvetica-Bold')
     .fontSize(11)
     .text('1. COSTOS BASE OPERATIVOS', marginX, 265);
     
  doc.rect(marginX, 280, doc.page.width - (marginX * 2), 18).fill('#1a1d2e');
  doc.fillColor('#ffffff')
     .font('Helvetica-Bold')
     .fontSize(8)
     .text('Servicio Incluido', marginX + 10, 285)
     .text('Costo Calculado (COP)', doc.page.width - 160, 285, { align: 'right', width: 110 });

  let y = 305;
  
  // Helper to clean emojis and weird characters for PDFKit
  const cleanText = (str) => {
    if (!str) return '';
    return str
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\uFE00-\uFE0F]/g, '') // Variation Selectors
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces/joiners
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Agregar fila
  function addRow(name, val, desc = '') {
    name = cleanText(name);
    desc = cleanText(desc);
    
    const descWidth = doc.page.width - (marginX * 2) - 180;
    let descHeight = 0;
    
    if (desc) {
      doc.font('Helvetica-Oblique').fontSize(7.5);
      descHeight = doc.heightOfString(desc, { width: descWidth });
    }
    
    const rowHeight = desc ? Math.max(23, 9 + descHeight + 6) : 15;
    
    // Si la fila se desborda de la página, creamos una página nueva
    if (y + rowHeight > doc.page.height - 95) {
      doc.addPage();
      
      // Cabecera de continuación en la nueva página
      doc.rect(0, 0, doc.page.width, 40).fill('#1a1d2e');
      doc.rect(0, 37, doc.page.width, 3).fill('#b39264');
      
      doc.fillColor('#ffffff')
         .font('Helvetica-Bold')
         .fontSize(11)
         .text('CONTROL BANQUETE - CONTINUACIÓN DE PROPUESTA', marginX, 15);
         
      y = 60;
    }
    
    if ((y / 15) % 2 === 0) {
      doc.rect(marginX, y - 2, doc.page.width - (marginX * 2), rowHeight).fill('#faf9f6');
    }
    
    doc.fillColor('#2d3748').font('Helvetica').fontSize(8);
    doc.text(name, marginX + 10, y);
    const sign = val < 0 ? '-' : '';
    const cleanVal = Math.abs(val);
    doc.text(`${sign}$${cleanVal.toLocaleString()}`, doc.page.width - 160, y, { align: 'right', width: 110 });
    
    if (desc) {
      y += 9;
      doc.fillColor('#718096').font('Helvetica-Oblique').fontSize(7.5);
      doc.text(desc, marginX + 15, y, { width: descWidth });
      y += Math.max(14, descHeight + 6);
    } else {
      y += 15;
    }
  }
  
  if (details.costoAlimentacion > 0) {
    const planName = details.selectedCateringPlanName || 'Catering';
    addRow(`Servicio de Catering: ${planName} (${details.guests} platillos)`, details.costoAlimentacion, details.descripcionAlimentacion);
  }
  addRow(`Atención de Meseros calificados (${details.meseros} meseros asignados)`, details.costoMeseros, `Servicio profesional y protocolo durante todo el evento (1 mesero cada 35 invitados).`);

  const baseTotal = details.costoAlimentacion + details.costoMeseros;
  doc.fillColor('#1a1d2e').font('Helvetica-Bold');
  addRow('Subtotal Base (Menú + Servicio):', baseTotal);

  const isPersonalized = !!rawData.venueId;

  if (isPersonalized) {
    // 2. DETALLE DE SERVICIOS SELECCIONADOS
    y += 10;
    doc.fillColor('#1a1d2e')
       .font('Helvetica-Bold')
       .fontSize(11)
       .text('2. DETALLE DE SERVICIOS SELECCIONADOS', marginX, y);
       
    y += 15;
    doc.rect(marginX, y, doc.page.width - (marginX * 2), 18).fill('#b39264');
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text('Descripción del Servicio', marginX + 10, y + 5)
       .text('Costo (COP)', doc.page.width - 160, y + 5, { align: 'right', width: 110 });

    y += 22;
    
    const allProducts = details.allProducts || { venues: [], photography: [], decoration: [], services: {}, flat: [] };
    const flatProducts = allProducts.flat || [];
    
    // 1. Salón
    const selectedVenue = flatProducts.find(v => v.id === rawData.venueId || v.name === rawData.venueId);
    const venueName = selectedVenue ? selectedVenue.name : 'Salón de Recepción';
    const venuePrice = selectedVenue ? parseInt(selectedVenue.price) || 0 : 0;
    const venueDesc = selectedVenue ? selectedVenue.description : '';
    addRow(`Salón de Recepciones: ${venueName}`, venuePrice, venueDesc);
    
    // 2. Fotografía
    let photoPrice = 0;
    if (rawData.photographyId && rawData.photographyId !== 'ninguno') {
      const selectedPhoto = flatProducts.find(p => p.id === rawData.photographyId);
      const photoName = selectedPhoto ? selectedPhoto.name : 'Servicio de Fotografía';
      const photoDesc = selectedPhoto ? selectedPhoto.description : '';
      photoPrice = selectedPhoto ? parseInt(selectedPhoto.price) || 0 : 0;
      addRow(`Fotografía: ${photoName}`, photoPrice, photoDesc);
    }
    
    // 3. Decoración
    let decoPrice = 0;
    if (rawData.decorationId && rawData.decorationId !== 'ninguno') {
      const selectedDeco = flatProducts.find(d => d.id === rawData.decorationId);
      const decoName = selectedDeco ? selectedDeco.name : 'Servicio de Decoración';
      const decoDesc = selectedDeco ? selectedDeco.description : '';
      decoPrice = selectedDeco ? parseInt(selectedDeco.price) || 0 : 0;
      addRow(`Decoración: ${decoName}`, decoPrice, decoDesc);
    }

    // 3.5 Recreación (Paquete Recreativo)
    let recreationPrice = 0;
    if (rawData.recreationId && rawData.recreationId !== 'ninguno' && rawData.recreationId !== 'none') {
      const selectedRecreation = flatProducts.find(p => p.id === rawData.recreationId);
      const recreationName = selectedRecreation ? selectedRecreation.name : 'Paquete Recreativo';
      const recreationDesc = selectedRecreation ? selectedRecreation.description : '';
      recreationPrice = selectedRecreation ? parseInt(selectedRecreation.price) || 0 : 0;
      addRow(`Recreación: ${recreationName}`, recreationPrice, recreationDesc);
    }
    
    // 4. Servicios Individuales Seleccionados
    let servicesSum = 0;
    let rawSelServices = rawData.selectedServices || rawData.extraServices || [];
    
    // Normalizar si viene como string
    if (typeof rawSelServices === 'string') {
      try {
        rawSelServices = JSON.parse(rawSelServices);
      } catch (e) {
        rawSelServices = rawSelServices.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    
    // Normalizar si viene como objeto (ej. {"0": "prod_1", "1": "prod_2"})
    if (rawSelServices && typeof rawSelServices === 'object' && !Array.isArray(rawSelServices)) {
      rawSelServices = Object.values(rawSelServices);
    }
    
    // Forzar a array vacío si no es un array válido
    if (!Array.isArray(rawSelServices)) {
      rawSelServices = [];
    }
    
    const serviceCounts = {};
    rawSelServices.forEach(sid => {
      if (sid) {
        serviceCounts[sid] = (serviceCounts[sid] || 0) + 1;
      }
    });

    Object.keys(serviceCounts).forEach(sid => {
      const s = flatProducts.find(item => item.id === sid);
      if (s) {
        const qty = serviceCounts[sid];
        const qtyText = qty > 1 ? ` (x${qty})` : '';
        addRow(`Servicio Adicional: ${s.name}${qtyText}`, s.price * qty, s.description || '');
        servicesSum += s.price * qty;
      }
    });
    
    // 5. Cálculos de totales
    const finalTotalValue = baseTotal + venuePrice + photoPrice + decoPrice + recreationPrice + servicesSum;
    const discountVal = parseInt(rawData.discount) || 0;
    const netTotal = finalTotalValue - discountVal;
    
    y += 5;
    doc.moveTo(marginX, y).lineTo(doc.page.width - marginX, y).strokeColor('#ebdcc5').lineWidth(0.5).stroke();
    y += 10;
    
    doc.fillColor('#1a1d2e').font('Helvetica-Bold').fontSize(8);
    addRow('VALOR TOTAL PROPUESTA:', finalTotalValue);
    
    if (discountVal > 0) {
      const discountLabel = rawData.discountLabel ? `Descuento (${rawData.discountLabel}):` : 'Descuento Especial:';
      doc.fillColor('#e53e3e');
      addRow(discountLabel, -discountVal);
    }
    
    y += 5;
    // Caja del Total Neto Elegante
    doc.rect(doc.page.width - 260, y, 220, 24).fill('#1a1d2e');
    doc.rect(doc.page.width - 260, y, 220, 24).strokeColor('#b39264').lineWidth(0.5).stroke();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    doc.text('TOTAL PROPUESTA NETO:', doc.page.width - 250, y + 8);
    doc.fillColor('#ffcf4b').fontSize(10);
    doc.text(`$${netTotal.toLocaleString()}`, doc.page.width - 150, y + 8, { align: 'right', width: 100 });
    y += 30;

  } else {
    // Tabla de Opciones de Salón
    y += 10;
    doc.fillColor('#1a1d2e')
       .font('Helvetica-Bold')
       .fontSize(11)
       .text('2. OPCIONES DE SALONES (VALOR TOTAL INCLUYENDO BASE)', marginX, y);
       
    y += 15;
    doc.rect(marginX, y, doc.page.width - (marginX * 2), 18).fill('#b39264');
    doc.fillColor('#ffffff')
       .font('Helvetica-Bold')
       .fontSize(8)
       .text('Salón de Recepción / Ubicación', marginX + 10, y + 5)
       .text('Alquiler Salón', doc.page.width - 260, y + 5, { align: 'right', width: 90 })
       .text('TOTAL PROPUESTA', doc.page.width - 160, y + 5, { align: 'right', width: 110 });

    y += 22;
    details.venueOptions.forEach(opt => {
      if ((y / 15) % 2 === 0) {
        doc.rect(marginX, y - 2, doc.page.width - (marginX * 2), 15).fill('#faf9f6');
      }
      doc.fillColor('#1a1d2e').font('Helvetica-Bold').fontSize(8);
      doc.text(cleanText(opt.name), marginX + 10, y);
      
      doc.fillColor('#555555').font('Helvetica');
      doc.text(`$${opt.price.toLocaleString()}`, doc.page.width - 260, y, { align: 'right', width: 90 });
      
      doc.fillColor('#b39264').rect(doc.page.width - 160, y - 2, 110, 15).fill('#1a1d2e');
      doc.fillColor('#ffcf4b').font('Helvetica-Bold');
      doc.text(`$${opt.total.toLocaleString()}`, doc.page.width - 160, y + 3, { align: 'right', width: 100 });
      
      y += 15;
    });

    // Servicios Adicionales Disponibles
    y += 10;
    doc.fillColor('#1a1d2e')
       .font('Helvetica-Bold')
       .fontSize(11)
       .text('3. SERVICIOS ADICIONALES OPCIONALES DISPONIBLES', marginX, y);
       
    y += 15;
    doc.fillColor('#64748b')
       .font('Helvetica')
       .fontSize(8)
       .text('Puedes enriquecer tu evento añadiendo cualquiera de los siguientes servicios al momento de tu contacto final:', marginX, y);
       
    y += 10;
    const cols = 2;
    let colX = marginX;
    let colY = y;
    
    details.availableServices.slice(0, 8).forEach((serv, index) => {
      if (index > 0 && index % cols === 0) {
        colX = marginX;
        colY += 14;
      } else if (index > 0) {
        colX = doc.page.width / 2 + 10;
      }
      doc.fillColor('#2d3748').font('Helvetica-Bold').fontSize(7.5);
      doc.text(`• ${cleanText(serv.name)}:`, colX, colY);
      
      // Dibujar fondo oscuro pequeño detrás de los precios
      const priceText = `$${serv.price.toLocaleString()}`;
      const textWidth = doc.widthOfString(priceText) + 6;
      doc.rect(colX + 130, colY - 2, textWidth, 10).fill('#1a1d2e');
      doc.fillColor('#ffcf4b').font('Helvetica-Bold').text(priceText, colX + 133, colY + 1);
    });
  }

  // Footer / Condiciones
  doc.fillColor('#1a1d2e')
     .font('Helvetica-Bold')
     .fontSize(8.5)
     .text('Condiciones del servicio de catering:', marginX, doc.page.height - 75);
     
  doc.fillColor('#64748b')
     .font('Helvetica')
     .fontSize(7.5)
     .text(details.descripcionAlimentacion || 'El servicio incluye plato caliente, menaje, meseros y logística básica. Precios sujetos a cambios de acuerdo al número final de invitados.', marginX, doc.page.height - 63, { width: doc.page.width - 80 });

  doc.fillColor('#a0aec0')
     .font('Helvetica-Oblique')
     .fontSize(7)
     .text('Generado automáticamente por Control Banquete. Desarrollado por crececonexpandete.com', marginX, doc.page.height - 35, { align: 'center', width: doc.page.width - 80 });
}

// Ruta POST para generar PDF y devolverlo como archivo binario
app.post('/api/quotations/generate-pdf', requireAuth, async (req, res) => {
  try {
    let rawData = req.body;
    
    // Si viene del webhook de N8N que envía todo el payload, extraemos el nodo 'data'
    if (rawData.data && typeof rawData.data === 'object') {
      rawData = { ...rawData, ...rawData.data };
    }
    
    // Si viene con un ID de cotización, cargamos los datos directo de la base de datos para asegurar consistencia
    let quoteId = rawData.id || rawData.quotationId || rawData.quoteId || rawData.quote_id || rawData.quotation_id;
    
    // Si no se encuentra un ID explícito, buscamos una cotización reciente (últimos 5 minutos) con el mismo email, teléfono o nombre para asegurar consistencia
    if (!quoteId && (rawData.clientEmail || rawData.clientPhone || rawData.clientName)) {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentQuote = await prisma.quotation.findFirst({
          where: {
            OR: [
              rawData.clientEmail ? { clientEmail: rawData.clientEmail } : null,
              rawData.clientPhone ? { clientPhone: rawData.clientPhone } : null,
              rawData.clientName ? { clientName: rawData.clientName } : null
            ].filter(Boolean),
            createdAt: { gte: fiveMinutesAgo }
          },
          orderBy: { createdAt: 'desc' }
        });
        if (recentQuote) {
          quoteId = recentQuote.id;
          console.log(`[Generate PDF] ID no recibido. Asignado cotización reciente encontrada: ${quoteId}`);
        }
      } catch (err) {
        console.error("Error buscando cotización reciente en generate-pdf:", err);
      }
    }

    if (quoteId) {
      try {
        const dbQuote = await prisma.quotation.findUnique({ where: { id: quoteId } });
        if (dbQuote) {
          // Mezclar los datos de la base de datos con los de la request.
          // El arreglo extraServices guardado en la base de datos es la verdad absoluta para servicios adicionales.
          rawData = { 
            ...rawData, 
            ...dbQuote,
            selectedServices: dbQuote.extraServices || [],
            extraServices: dbQuote.extraServices || []
          };
        }
      } catch (err) {
        console.error("Error cargando cotización de BD en generate-pdf:", err);
      }
    }
    
    // Validar parámetros mínimos
    if (!rawData.guests || !rawData.eventType) {
      return res.status(400).json({ error: 'Falta número de invitados (guests) o tipo de evento (eventType)' });
    }

    const details = await calculateQuotationDetails(rawData);
    
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    
    // Configurar cabeceras de respuesta para descargar el PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cotizacion_${rawData.clientName ? rawData.clientName.replace(/\s+/g, '_') : 'evento'}.pdf`);
    
    // Pipear el PDF directamente al cliente
    doc.pipe(res);
    drawPDFQuote(doc, details, rawData);
    doc.end();
    
    console.log(`✉ PDF generado dinámicamente para ${rawData.clientName || 'Cliente'} (${rawData.guests} pers.)`);
  } catch (error) {
    console.error('Error generando PDF en el servidor:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// PANEL ULTRA-ADMIN (POSTGRESQL / PRISMA)
// ==========================================

const ULTRA_ADMIN_EMAIL = process.env.ULTRA_ADMIN_EMAIL || 'ultra@controlbanquete.com';
const ULTRA_ADMIN_PASSWORD = process.env.ULTRA_ADMIN_PASSWORD || 'UltraAdmin2026!';

app.post('/api/auth/ultraadmin', async (req, res) => {
  const { email, password } = req.body;
  if (email !== ULTRA_ADMIN_EMAIL || password !== ULTRA_ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const token = jwt.sign({ uid: 'ultra', email, role: 'ultraadmin' }, JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token, user: { uid: 'ultra', email, role: 'ultraadmin', name: 'Ultra Admin' } });
});

function requireUltraAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'ultraadmin') return res.status(403).json({ error: 'Acceso denegado' });
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
}

// Listado de tenants
app.get('/api/admin/tenants', requireUltraAdmin, async (req, res) => {
  try {
    const superadmins = await prisma.user.findMany({
      where: { role: 'superadmin' }
    });

    const data = await Promise.all(superadmins.map(async (user) => {
      const usersCount = await prisma.user.count({ where: { tenantId: user.tenantId } });
      const eventsCount = await prisma.event.count({ where: { tenantId: user.tenantId } });
      const trialInfo = getTrialStatus(user);

      return {
        tenantId: user.tenantId,
        email: user.email,
        name: user.name,
        businessName: user.businessName || 'Sin Nombre',
        createdAt: user.createdAt.toISOString(),
        subscriptionStatus: trialInfo.status,
        subscriptionPlan: user.subscriptionPlan || '',
        subscriptionExpiry: user.subscriptionExpiry ? user.subscriptionExpiry.toISOString() : null,
        customTrialDays: user.customTrialDays,
        trialStartDate: user.trialStartDate ? user.trialStartDate.toISOString() : null,
        daysLeft: trialInfo.daysLeft,
        usersCount,
        eventsCount
      };
    }));

    const stats = {
      total: data.length,
      active: data.filter(d => d.subscriptionStatus === 'active').length,
      trial: data.filter(d => d.subscriptionStatus === 'trial').length,
      expired: data.filter(d => d.subscriptionStatus === 'expired').length,
      cancelled: data.filter(d => d.subscriptionStatus === 'cancelled').length,
      revenue: {
        monthly: data.filter(d => d.subscriptionStatus === 'active' && d.subscriptionPlan === 'monthly').length * 10,
        quarterly: data.filter(d => d.subscriptionStatus === 'active' && d.subscriptionPlan === 'quarterly').length * 35,
        annual: data.filter(d => d.subscriptionStatus === 'active' && d.subscriptionPlan === 'annual').length * 95
      }
    };
    stats.revenue.total = stats.revenue.monthly + stats.revenue.quarterly + stats.revenue.annual;

    res.json({ tenants: data, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Modificar suscripción de un tenant
app.put('/api/admin/tenants/:tenantId/subscription', requireUltraAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan, status, expiryDate, extendDays } = req.body;
    const user = await prisma.user.findFirst({
      where: { tenantId, role: 'superadmin' }
    });
    if (!user) return res.status(404).json({ error: 'Tenant no encontrado' });

    const updates = {};
    if (status) updates.subscriptionStatus = status;
    if (plan !== undefined) updates.subscriptionPlan = plan;

    const now = new Date();
    if (expiryDate) {
      updates.subscriptionExpiry = new Date(expiryDate);
    } else if (req.body.hasOwnProperty('expiryDate') && req.body.expiryDate === null) {
      updates.subscriptionExpiry = null;
    } else if (extendDays && parseInt(extendDays) > 0) {
      const base = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : new Date();
      base.setDate(base.getDate() + parseInt(extendDays));
      updates.subscriptionExpiry = base;
    } else if (status === 'active' && plan && (!user.subscriptionExpiry || new Date(user.subscriptionExpiry) <= now)) {
      const expiry = new Date(now);
      if (plan === 'monthly')   expiry.setMonth(expiry.getMonth() + 1);
      if (plan === 'quarterly') expiry.setMonth(expiry.getMonth() + 3);
      if (plan === 'annual')    expiry.setFullYear(expiry.getFullYear() + 1);
      updates.subscriptionExpiry = expiry;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updates
    });

    res.json({
      success: true,
      tenantId,
      subscriptionStatus: updatedUser.subscriptionStatus,
      subscriptionPlan: updatedUser.subscriptionPlan,
      subscriptionExpiry: updatedUser.subscriptionExpiry ? updatedUser.subscriptionExpiry.toISOString() : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear suscripción nueva manualmente
app.post('/api/admin/tenants/:tenantId/subscription', requireUltraAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { plan } = req.body;
    const user = await prisma.user.findFirst({
      where: { tenantId, role: 'superadmin' }
    });
    if (!user) return res.status(404).json({ error: 'Tenant no encontrado' });

    const now = new Date();
    const expiry = new Date(now);
    if (plan === 'monthly')   expiry.setMonth(expiry.getMonth() + 1);
    if (plan === 'quarterly') expiry.setMonth(expiry.getMonth() + 3);
    if (plan === 'annual')    expiry.setFullYear(expiry.getFullYear() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: 'active',
        subscriptionPlan: plan,
        subscriptionExpiry: expiry
      }
    });

    res.json({ success: true, plan, expiry: expiry.toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar tenant y todos sus datos
app.delete('/api/admin/tenants/:tenantId', requireUltraAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const exists = await prisma.user.findFirst({
      where: { tenantId, role: 'superadmin' }
    });
    if (!exists) return res.status(404).json({ error: 'Tenant no encontrado' });

    await prisma.$transaction([
      prisma.user.deleteMany({ where: { tenantId } }),
      prisma.product.deleteMany({ where: { tenantId } }),
      prisma.event.deleteMany({ where: { tenantId } }),
      prisma.quotation.deleteMany({ where: { tenantId } }),
      prisma.provider.deleteMany({ where: { tenantId } }),
      prisma.recipe.deleteMany({ where: { tenantId } }),
      prisma.inventory.deleteMany({ where: { tenantId } }),
      prisma.notification.deleteMany({ where: { tenantId } }),
      prisma.settings.deleteMany({ where: { tenantId } })
    ]);

    res.json({ success: true, message: 'Tenant y todos sus datos eliminados.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Config global
app.get('/api/admin/config', requireUltraAdmin, (req, res) => {
  res.json({ ...globalConfig });
});

app.put('/api/admin/config', requireUltraAdmin, (req, res) => {
  const { trialDays, supportEmail, plansEnabled } = req.body;
  if (trialDays !== undefined) {
    const d = parseInt(trialDays);
    if (isNaN(d) || d < 0 || d > 365) return res.status(400).json({ error: 'trialDays debe ser entre 0 y 365' });
    globalConfig.trialDays = d;
  }
  if (supportEmail !== undefined) globalConfig.supportEmail = supportEmail;
  if (plansEnabled !== undefined) globalConfig.plansEnabled = !!plansEnabled;
  res.json({ success: true, config: { ...globalConfig } });
});

// Días de prueba personalizados por tenant
app.put('/api/admin/tenants/:tenantId/trial', requireUltraAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { trialDays, resetTrialDate } = req.body;
    const user = await prisma.user.findFirst({
      where: { tenantId, role: 'superadmin' }
    });
    if (!user) return res.status(404).json({ error: 'Tenant no encontrado' });

    const updates = {};
    if (trialDays !== undefined) {
      const d = parseInt(trialDays);
      if (isNaN(d) || d < 0 || d > 365) return res.status(400).json({ error: 'trialDays debe ser entre 0 y 365' });
      updates.customTrialDays = d;
    }
    if (resetTrialDate) {
      updates.trialStartDate = new Date();
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updates
    });

    res.json({
      success: true,
      tenantId,
      customTrialDays: updatedUser.customTrialDays,
      trialStartDate: updatedUser.trialStartDate ? updatedUser.trialStartDate.toISOString() : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Arrancar Servidor
app.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`🚀 Control Banquete — Servidor Express`);
  console.log(`🚀 Corriendo en http://localhost:${PORT}`);
  console.log(`📦 Modo: PRODUCCIÓN (POSTGRESQL)`);
  console.log(`🔗 Webhook Saliente N8N: ${N8N_WEBHOOK_URL ? N8N_WEBHOOK_URL : 'DESACTIVADO'}`);
  console.log(`=================================================`);
});
