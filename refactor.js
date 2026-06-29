const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// 1. Añadir requireAuth middleware
const requireAuth = `
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
`;

if (!content.includes('function requireAuth')) {
  content = content.replace('// ENDPOINTS DE API REST', requireAuth + '\n// ENDPOINTS DE API REST');
}

// 2. Modificar login para inyectar tenantId en JWT
content = content.replace(
  /const token = jwt\.sign\([\s\S]*?expiresIn: '24h' \}\s*\);/g,
  `const token = jwt.sign(
      { uid: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );`
);

content = content.replace(
  /user: \{ uid: user\.id, email: user\.email, role: user\.role, name: user\.name \}/g,
  `user: { uid: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId }`
);

// 3. Proteger todas las rutas y añadir tenantId a prisma
// Esto usa regex, es un poco arriesgado pero podemos hacer reemplazos masivos
const routePattern = /app\.(get|post|put|delete)\('(\/api\/(?!auth|webhooks|public)[^']+)'\s*,\s*async \((req, res)\) => \{/g;
content = content.replace(routePattern, "app.$1('$2', requireAuth, async (req, res) => {");

// Reemplazar prisma.settings
content = content.replace(/prisma\.settings\.findUnique\(\{\s*where:\s*\{\s*id:\s*'global'\s*\}\s*\}\)/g, "prisma.settings.findUnique({ where: { tenantId: req.user.tenantId } })");
content = content.replace(/prisma\.settings\.upsert\(\{\s*where:\s*\{\s*id:\s*'global'\s*\},/g, "prisma.settings.upsert({ where: { tenantId: req.user.tenantId },");
content = content.replace(/update:\s*\{([^}]*)\},/g, "update: { $1 },");
content = content.replace(/create:\s*\{\s*id:\s*'global',\s*companyName:/g, "create: { tenantId: req.user.tenantId, companyName:");

// Reemplazar prisma.*.findMany() vacío -> findMany({ where: { tenantId: req.user.tenantId } })
content = content.replace(/await prisma\.([a-zA-Z0-9_]+)\.findMany\(\)/g, "await prisma.$1.findMany({ where: { tenantId: req.user.tenantId } })");
content = content.replace(/await prisma\.([a-zA-Z0-9_]+)\.findMany\(\{\s*\}\)/g, "await prisma.$1.findMany({ where: { tenantId: req.user.tenantId } })");

// Reemplazar findMany({ where: { ... } }) -> findMany({ where: { tenantId: req.user.tenantId, ... } })
content = content.replace(/await prisma\.([a-zA-Z0-9_]+)\.findMany\(\{\s*where:\s*\{([^}]*)\}/g, "await prisma.$1.findMany({ where: { tenantId: req.user.tenantId, $2 }");

// Reemplazar create: { ... } en prisma.*.create() -> create: { tenantId: req.user.tenantId, ... }
content = content.replace(/await prisma\.([a-zA-Z0-9_]+)\.create\(\{\s*data:\s*\{/g, "await prisma.$1.create({ data: { tenantId: req.user.tenantId, ");

// Upserts y Updates no necesitan tenantId si usamos id, pero sí para create
content = content.replace(/create:\s*\{([^}]*)\}/g, "create: { tenantId: req.user.tenantId, $1}");

// Rutas Públicas (Cotizador)
const publicRoutes = `
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
        message: \`\${item.clientName} solicita cotización para \${item.eventType} el \${item.date} (\${item.guests} personas). Total estimado: \$\${item.totalValue.toLocaleString('es-CO')} COP\`,
        type: 'quote',
        role: 'superadmin'
      }
    });

    res.json({ success: true, id: item.id, message: '¡Cotización enviada!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
`;

if (!content.includes('/api/public/business')) {
  content = content.replace('// INBOUND WEBHOOK N8N', publicRoutes + '\n// INBOUND WEBHOOK N8N');
}

// Ruta de Registro de Nuevo Negocio
const registerRoute = `
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
`;

if (!content.includes('/api/auth/register')) {
  content = content.replace("app.post('/api/auth/login', async (req, res) => {", registerRoute + "\napp.post('/api/auth/login', async (req, res) => {");
}

fs.writeFileSync('server.js', content, 'utf8');
console.log('Refactor completado');
