// 1. Configuración Dinámica
app.get('/api/config', (req, res) => {
  res.json({ useMockData: false });
});

// 2. Configuración Global (Settings)
app.get('/api/settings', async (req, res) => {
  try {
    const doc = await prisma.settings.findUnique({ where: { id: 'global' } });
    return res.json(doc ? doc.baseValues : {});
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const data = req.body;
    await prisma.settings.upsert({
      where: { id: 'global' },
      update: { baseValues: data, companyName: data.businessName || 'Control Banquete' },
      create: { id: 'global', companyName: data.businessName || 'Control Banquete', baseValues: data }
    });
    sendOutboundWebhook('settings.updated', data);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Catálogo de Productos y Tarifas
app.get('/api/products', async (req, res) => {
  try {
    const list = await prisma.product.findMany();
    const structured = { venues: [], photography: [], decoration: [], services: { boda: [], grados_otros: [], comuniones: [], quinces: [] }, coctel: [], arroz: [], carne: [], ensalada: [], postre: [], liquido: [], torta: [], pasabocas: [] };
    list.forEach(p => {
      if (p.category === 'venue') structured.venues.push(p);
      else if (p.category === 'photography') structured.photography.push(p);
      else if (p.category === 'decoration') structured.decoration.push(p);
      else if (p.category === 'service' && p.eventType) {
        if (!structured.services[p.eventType]) structured.services[p.eventType] = [];
        structured.services[p.eventType].push(p);
      } else if (structured[p.category]) {
        structured[p.category].push(p);
      }
    });
    return res.json(structured);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
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
      eventType: p.eventType || null,
      ingredients: p.ingredients || null
    };

    const saved = await prisma.product.upsert({
      where: { id },
      update: data,
      create: data
    });
    sendOutboundWebhook('product.saved', saved);
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    sendOutboundWebhook('product.deleted', { id: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Eventos
app.get('/api/events', async (req, res) => {
  try {
    const list = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', async (req, res) => {
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
      extraServices: event.extraServices || null,
      payments: event.payments || null,
      schedule: event.schedule || null
    };

    const saved = await prisma.event.upsert({
      where: { id },
      update: data,
      create: data
    });
    sendOutboundWebhook('event.created', saved);
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updateData = req.body;
    
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const mergedPayments = updateData.payments !== undefined ? updateData.payments : existing.payments;
    const paidAmount = (mergedPayments || []).reduce((sum, p) => sum + p.amount, 0);
    const totalValue = updateData.totalValue !== undefined ? parseFloat(updateData.totalValue) : existing.totalValue;
    const balance = totalValue - paidAmount;

    const saved = await prisma.event.update({
      where: { id },
      data: {
        ...updateData,
        paidAmount,
        totalValue,
        balance
      }
    });

    if (updateData.contractSigned === true && existing.status !== 'contrato_firmado') {
      sendOutboundWebhook('contract.signed', saved);
    } else {
      sendOutboundWebhook('event.updated', saved);
    }
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Cotizaciones
app.get('/api/quotations', async (req, res) => {
  try {
    const list = await prisma.quotation.findMany({ orderBy: { createdAt: 'desc' } });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotations', async (req, res) => {
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
      extraServices: q.extraServices || null
    };

    const saved = await prisma.quotation.upsert({
      where: { id },
      update: data,
      create: data
    });
    sendOutboundWebhook('quotation.created', saved);
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/quotations/:id', async (req, res) => {
  try {
    const saved = await prisma.quotation.update({
      where: { id: req.params.id },
      data: req.body
    });
    sendOutboundWebhook('quotation.updated', saved);
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/quotations/:id', async (req, res) => {
  try {
    await prisma.quotation.delete({ where: { id: req.params.id } });
    sendOutboundWebhook('quotation.deleted', { id: req.params.id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Recetario
app.get('/api/recipes', async (req, res) => {
  try {
    const list = await prisma.recipe.findMany();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/recipes', async (req, res) => {
  try {
    const r = req.body;
    const id = r.id || 'rec_' + Math.random().toString(36).substr(2, 9);
    const saved = await prisma.recipe.upsert({
      where: { id },
      update: { productId: r.productId || 'unknown', supplies: r.supplies || null },
      create: { id, productId: r.productId || 'unknown', supplies: r.supplies || null }
    });
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  try {
    await prisma.recipe.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Inventario
app.get('/api/inventory', async (req, res) => {
  try {
    const list = await prisma.inventory.findMany();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const i = req.body;
    const id = i.id || 'inv_' + Math.random().toString(36).substr(2, 9);
    const data = {
      id,
      category: i.category || 'general',
      name: i.name || 'Sin nombre',
      unit: i.unit || 'und',
      costPerUnit: parseFloat(i.costPerUnit) || 0,
      stock: parseFloat(i.stock) || 0,
      minStock: parseFloat(i.minStock) || 0,
      supplier: i.supplier || ''
    };
    const saved = await prisma.inventory.upsert({
      where: { id },
      update: data,
      create: data
    });
    return res.json(saved);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await prisma.inventory.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. Usuarios y Autenticación JWT
app.get('/api/users', async (req, res) => {
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

app.post('/api/users', async (req, res) => {
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

app.delete('/api/users/:uid', async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.uid } });
    sendOutboundWebhook('user.deleted', { uid: req.params.uid });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { uid: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: { uid: user.id, email: user.email, role: user.role, name: user.name }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ==========================================
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
        const id = q.id || 'q_n8n_' + Math.random().toString(36).substr(2, 9);
        const data = {
          id,
          clientName: q.clientName || 'Lead N8N',
          clientEmail: q.clientEmail || '',
          clientPhone: q.clientPhone || '',
          eventType: q.eventType || 'grados_otros',
          date: q.date || new Date().toISOString().substring(0, 10),
          guests: parseInt(q.guests) || 0,
          status: q.status || 'pendiente'
        };
        await prisma.quotation.create({ data });
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
  const map = {
    boda: 'Boda (Matrimonio)',
    quinces: 'Fiesta de Quinces',
    grados_otros: 'Cumpleaños, Grados u Otros',
    comuniones: 'Primera Comunión'
  };
  return map[type] || type;
}

// Helper para calcular detalles de la cotización dinámicamente
async function calculateQuotationDetails(data) {
  const guests = Math.max(10, parseInt(data.guests) || 50);
  
  // 1. Obtener configuraciones de base de datos
  let settingsObj = { costoMesero: 110000, costoAlimentacion: 36000, descripcionAlimentacion: '' };
  try {
    const sett = await prisma.settings.findUnique({ where: { id: 'global' } });
    if (sett && sett.baseValues) {
      settingsObj = { ...settingsObj, ...sett.baseValues };
    }
  } catch(e) {}

  const meseros = Math.ceil(guests / 35);
  const costoMeseros = meseros * (settingsObj.costoMesero || 110000);
  const costoAlimentacion = guests * (settingsObj.costoAlimentacion || 36000);
  const descripcionAlimentacion = settingsObj.descripcionAlimentacion || 'Plato especial';

  // 2. Obtener productos de base de datos
  let allProducts = { venues: [], photography: [], decoration: [], services: {} };
  try {
    const list = await prisma.product.findMany();
    list.forEach(p => {
      if (p.category === 'venue') allProducts.venues.push(p);
      else if (p.category === 'photography') allProducts.photography.push(p);
      else if (p.category === 'decoration') allProducts.decoration.push(p);
      else if (p.category === 'service' && p.eventType) {
        if (!allProducts.services[p.eventType]) allProducts.services[p.eventType] = [];
        allProducts.services[p.eventType].push(p);
      }
    });
  } catch(e) {}

  // Normalizar el tipo de evento recibido
  let eventType = 'grados_otros';
  if (data.eventType) {
    const etLower = data.eventType.toLowerCase();
    if (etLower.includes('boda') || etLower.includes('matrimonio')) eventType = 'boda';
    else if (etLower.includes('quince') || etLower.includes('15')) eventType = 'quinces';
    else if (etLower.includes('comunión') || etLower.includes('comunion') || etLower.includes('bautizo')) eventType = 'comuniones';
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
    venueOptions,
    availableServices,
    eventType,
    settings: settingsObj,
    allProducts
  };
}
