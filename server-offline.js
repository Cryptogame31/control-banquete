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

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'controlbanquete-super-secret-key-2026';

// Config global mutable (puede ser modificada por ultra-admin en runtime)
let globalConfig = {
  trialDays: parseInt(process.env.TRIAL_DAYS) || 3,
  appName: 'Control Banquete',
  supportEmail: process.env.SUPPORT_EMAIL || 'soporte@controlbanquete.app',
  plansEnabled: true
};

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

console.log("=================================================");
console.log("🚀 Control Banquete — Modo OFFLINE/DEMO Multi-Tenant");
console.log("🚀 Corriendo en http://localhost:" + PORT);
console.log("=================================================");

// ==========================================
// BASE DE DATOS EN MEMORIA (multi-tenant)
// ==========================================
let memDB = {
  users: [],      // { id, tenantId, email, name, role, phone, password, businessName, trialStartDate, subscriptionStatus, subscriptionPlan, subscriptionExpiry }
  products: [],   // { id, tenantId, ... }
  quotations: [], // { id, tenantId, ... }
  events: [],     // { id, tenantId, ... }
  providers: [],  // { id, tenantId, ... }
  recipes: [],    // { id, tenantId, ... }
  inventory: [],  // { id, tenantId, ... }
  clients: [],    // { id, tenantId, ... }
  notifications: []
};

function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Seed de productos por defecto para un nuevo tenant
function seedTenantData(tenantId, businessName) {
  const defaultProducts = [
    { id: genId('prod'), tenantId, category: 'catering', name: 'Plan Básico', price: 36000, description: 'Incluye cóctel de bienvenida, torta o bizcocho, plato fuerte, postre y bebida.', allowMultiples: false, position: 1 },
    { id: genId('prod'), tenantId, category: 'catering', name: 'Plan Infantil', price: 28000, description: 'Plato adaptado para niños, incluye helado, postre infantil y bebida.', allowMultiples: false, position: 2 },
    { id: genId('prod'), tenantId, category: 'catering', name: 'Plan Premium', price: 55000, description: 'Menú premium de gala con entrada especial, carnes finas, postre gourmet y bebidas ilimitadas.', allowMultiples: false, position: 3 },
  ];
  defaultProducts.forEach(p => memDB.products.push(p));

  // Configuración por defecto para el tenant (incluye webhook n8n)
  const settingsKey = 'settings_' + tenantId;
  memDB[settingsKey] = {
    businessName: businessName || 'Mi Empresa de Banquetes',
    servicioTransporte: 180000,
    servicioAnimacion: 250000,
    servicioSonido: 300000,
    ivaPercent: 0,
    // Webhook n8n para correos — cada tenant configura el suyo
    webhookUrl: '',
    webhookSecret: '',
    webhookEnabled: false
  };
}

// ==========================================
// HELPERS JWT / TENANT
// ==========================================
function getTokenPayload(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch { return null; }
}

function getTenantId(req) {
  const payload = getTokenPayload(req);
  return payload ? (payload.tenantId || payload.uid) : null;
}

function requireAuth(req, res, next) {
  const payload = getTokenPayload(req);
  if (!payload) return res.status(401).json({ error: 'No autorizado' });
  req.user = payload;
  req.tenantId = payload.tenantId || payload.uid;
  next();
}

function getTrialStatus(user) {
  const now = new Date();
  const trialStart = new Date(user.trialStartDate || user.createdAt || now);
  const trialEnd = new Date(trialStart);
  // Usar dias de prueba del usuario si fue sobrescritos, de lo contrario usar config global
  const days = (user.customTrialDays !== undefined && user.customTrialDays !== null)
    ? user.customTrialDays
    : globalConfig.trialDays;
  trialEnd.setDate(trialEnd.getDate() + days);
  const msLeft = trialEnd - now;
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));

  if (user.subscriptionStatus === 'active' && user.subscriptionExpiry) {
    const expiry = new Date(user.subscriptionExpiry);
    if (expiry > now) return { status: 'active', daysLeft: null, plan: user.subscriptionPlan };
    return { status: 'expired', daysLeft: 0, plan: null };
  }
  if (daysLeft > 0) return { status: 'trial', daysLeft, plan: null };
  return { status: 'expired', daysLeft: 0, plan: null };
}

function mapEventResponse(e) { return e ? { ...e, selectedServices: e.extraServices || [], timeline: e.schedule || [] } : null; }
function mapQuotationResponse(q) { return q ? { ...q, selectedServices: q.extraServices || [] } : null; }

// ==========================================
// AUTH ENDPOINTS
// ==========================================

// Registro de nueva cuenta (crea superadmin + tenant)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, businessName } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Faltan campos requeridos' });
    if (memDB.users.find(u => u.email === email)) return res.status(400).json({ error: 'Este correo ya está registrado' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });

    const id = genId('usr');
    const tenantId = id; // el superadmin ES su propio tenant
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id, tenantId, email, name,
      role: 'superadmin', phone: '',
      password: hashedPassword,
      businessName: businessName || name,
      trialStartDate: new Date().toISOString(),
      subscriptionStatus: 'trial',
      subscriptionPlan: null,
      subscriptionExpiry: null,
      createdAt: new Date().toISOString()
    };
    memDB.users.push(user);
    seedTenantData(tenantId, businessName || name);

    const token = jwt.sign(
      { uid: id, email, role: 'superadmin', name, tenantId, businessName: user.businessName },
      JWT_SECRET, { expiresIn: '24h' }
    );
    return res.json({
      token,
      user: { uid: id, email, role: 'superadmin', name, tenantId, businessName: user.businessName }
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = memDB.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign(
      { uid: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId, businessName: user.businessName },
      JWT_SECRET, { expiresIn: '24h' }
    );
    return res.json({
      token,
      user: { uid: user.id, email: user.email, role: user.role, name: user.name, tenantId: user.tenantId, businessName: user.businessName }
    });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ==========================================
// SUBSCRIPTION ENDPOINTS
// ==========================================

app.get('/api/subscription/status', requireAuth, (req, res) => {
  const superadmin = memDB.users.find(u => u.tenantId === req.tenantId && u.role === 'superadmin');
  if (!superadmin) return res.status(404).json({ error: 'Tenant no encontrado' });
  const trialInfo = getTrialStatus(superadmin);
  res.json({
    ...trialInfo,
    businessName: superadmin.businessName,
    email: superadmin.email,
    trialStartDate: superadmin.trialStartDate
  });
});

// Activar suscripción (token de Google Play Billing)
app.post('/api/subscription/activate', requireAuth, (req, res) => {
  const { plan, purchaseToken } = req.body; // plan: 'monthly'|'quarterly'|'annual'
  const superadmin = memDB.users.find(u => u.tenantId === req.tenantId && u.role === 'superadmin');
  if (!superadmin) return res.status(404).json({ error: 'Tenant no encontrado' });

  // En producción: validar purchaseToken con Google Play Developer API
  // Por ahora, activamos directamente
  const now = new Date();
  const expiry = new Date(now);
  if (plan === 'monthly')    expiry.setMonth(expiry.getMonth() + 1);
  if (plan === 'quarterly')  expiry.setMonth(expiry.getMonth() + 3);
  if (plan === 'annual')     expiry.setFullYear(expiry.getFullYear() + 1);

  superadmin.subscriptionStatus = 'active';
  superadmin.subscriptionPlan = plan;
  superadmin.subscriptionExpiry = expiry.toISOString();

  const planNames = { monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' };
  res.json({ success: true, plan, planName: planNames[plan], expiry: expiry.toISOString() });
});

// Restaurar compra (Google Play)
app.post('/api/subscription/restore', requireAuth, (req, res) => {
  const { purchaseToken } = req.body;
  // En producción: verificar token con Google Play Developer API
  res.json({ success: false, message: 'No se encontró una suscripción activa para restaurar' });
});

// ==========================================
// CONFIG
// ==========================================
app.get('/api/config', (req, res) => res.json({ useMockData: false }));

// Settings (por tenant)
app.get('/api/settings', requireAuth, (req, res) => {
  const key = 'settings_' + req.tenantId;
  res.json(memDB[key] || {});
});
app.post('/api/settings', requireAuth, (req, res) => {
  const key = 'settings_' + req.tenantId;
  memDB[key] = { ...(memDB[key] || {}), ...req.body };
  res.json(memDB[key]);
});

// ==========================================
// PRODUCTS (por tenant)
// ==========================================
app.get('/api/products', requireAuth, (req, res) => {
  const list = memDB.products.filter(p => p.tenantId === req.tenantId).sort((a, b) => {
    const posA = a.position ?? 999999, posB = b.position ?? 999999;
    return posA !== posB ? posA - posB : a.name.localeCompare(b.name);
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
        ['boda','quinces','comuniones','grados_otros','fiesta_infantil','empresarial'].forEach(evt => { if (!structured.services[evt]) structured.services[evt] = []; structured.services[evt].push(p); });
      } else {
        p.eventType.split(',').map(x => x.trim().toLowerCase()).forEach(evt => { if (evt) { if (!structured.services[evt]) structured.services[evt] = []; structured.services[evt].push(p); } });
      }
    } else if (structured[p.category]) structured[p.category].push(p);
  });
  res.json(structured);
});
app.post('/api/products', requireAuth, (req, res) => {
  const p = req.body;
  const id = p.id || genId('prod');
  const idx = memDB.products.findIndex(x => x.id === id && x.tenantId === req.tenantId);
  const item = { ...p, id, tenantId: req.tenantId, price: parseFloat(p.price) || 0, allowMultiples: p.allowMultiples === true || p.allowMultiples === 'true', position: p.position !== undefined ? parseInt(p.position) : 999999 };
  if (idx >= 0) memDB.products[idx] = item; else memDB.products.push(item);
  res.json(item);
});
app.post('/api/products/reorder', requireAuth, (req, res) => {
  const { orders } = req.body;
  if (Array.isArray(orders)) orders.forEach(o => { const idx = memDB.products.findIndex(p => p.id === o.id && p.tenantId === req.tenantId); if (idx >= 0) memDB.products[idx].position = parseInt(o.position); });
  res.json({ success: true });
});
app.delete('/api/products/:id', requireAuth, (req, res) => {
  memDB.products = memDB.products.filter(p => !(p.id === req.params.id && p.tenantId === req.tenantId));
  res.json({ success: true });
});

// ==========================================
// PROVIDERS (por tenant)
// ==========================================
app.get('/api/providers', requireAuth, (req, res) => res.json(memDB.providers.filter(p => p.tenantId === req.tenantId).sort((a,b) => a.name.localeCompare(b.name))));
app.post('/api/providers', requireAuth, (req, res) => {
  const p = req.body; const id = p.id || genId('prov');
  const idx = memDB.providers.findIndex(x => x.id === id && x.tenantId === req.tenantId);
  const item = { ...p, id, tenantId: req.tenantId };
  if (idx >= 0) memDB.providers[idx] = item; else memDB.providers.push(item);
  res.json(item);
});
app.delete('/api/providers/:id', requireAuth, (req, res) => {
  memDB.providers = memDB.providers.filter(p => !(p.id === req.params.id && p.tenantId === req.tenantId));
  res.json({ success: true });
});

// ==========================================
// NOTIFICATIONS (por tenant)
// ==========================================
app.get('/api/notifications', requireAuth, (req, res) => {
  res.json(memDB.notifications.filter(n => n.tenantId === req.tenantId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,30));
});
app.post('/api/notifications/read', requireAuth, (req, res) => {
  const n = memDB.notifications.find(x => x.id === req.body.id && x.tenantId === req.tenantId);
  if (n) n.read = true;
  res.json({ success: true });
});
app.post('/api/notifications/read-all', requireAuth, (req, res) => {
  memDB.notifications.filter(n => n.tenantId === req.tenantId).forEach(n => n.read = true);
  res.json({ success: true });
});

// ==========================================
// EVENTS (por tenant)
// ==========================================
app.get('/api/events', requireAuth, (req, res) => {
  res.json(memDB.events.filter(e => e.tenantId === req.tenantId).map(mapEventResponse).sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)));
});
app.post('/api/events', requireAuth, (req, res) => {
  const event = req.body; const id = event.id || genId('e');
  const paidAmount = (event.payments || []).reduce((s,p) => s + p.amount, 0);
  const totalValue = parseFloat(event.totalValue) || 0;
  const item = { id, tenantId: req.tenantId, clientName: event.clientName||'Sin Nombre', clientEmail: event.clientEmail||'', clientPhone: event.clientPhone||'', eventType: event.eventType||'grados_otros', date: event.date||new Date().toISOString().substring(0,10), time: event.time||'', guests: parseInt(event.guests)||0, totalValue, paidAmount, balance: totalValue - paidAmount, discount: parseFloat(event.discount)||0, discountLabel: event.discountLabel||'', status: event.status||'confirmado', notes: event.notes||'', menu: event.menu||null, extraServices: event.selectedServices||event.extraServices||null, payments: event.payments||null, schedule: event.timeline||event.schedule||null, clientId: event.clientId||null, venueId: event.venueId||null, photographyId: event.photographyId||null, decorationId: event.decorationId||null, recreationId: event.recreationId||null, cateringId: event.cateringId||null, quotationId: event.quotationId||null, photoDriveLink: event.photoDriveLink||null, photoSelectionText: event.photoSelectionText||null, photoSelectionLocked: event.photoSelectionLocked===true, photoStatus: event.photoStatus||'sin_fotografia', allowColorSelection: event.allowColorSelection===true, selectedColor: event.selectedColor||null, selectedColors: event.selectedColors||null, appointments: event.appointments||null, completedTasks: event.completedTasks||null, completedPurchases: event.completedPurchases||null, createdAt: new Date().toISOString() };
  const idx = memDB.events.findIndex(x => x.id === id && x.tenantId === req.tenantId);
  if (idx >= 0) memDB.events[idx] = item; else memDB.events.push(item);
  res.json(mapEventResponse(item));
});
app.put('/api/events/:id', requireAuth, (req, res) => {
  const idx = memDB.events.findIndex(x => x.id === req.params.id && x.tenantId === req.tenantId);
  if (idx < 0) return res.status(404).json({ error: 'Event not found' });
  const merged = { ...memDB.events[idx], ...req.body };
  if (req.body.selectedServices !== undefined) merged.extraServices = req.body.selectedServices;
  if (req.body.timeline !== undefined) merged.schedule = req.body.timeline;
  const paidAmount = (merged.payments || []).reduce((s,p) => s + p.amount, 0);
  merged.paidAmount = paidAmount; merged.balance = (parseFloat(merged.totalValue)||0) - paidAmount;
  memDB.events[idx] = merged;
  res.json(mapEventResponse(merged));
});
app.delete('/api/events/:id', requireAuth, (req, res) => {
  memDB.events = memDB.events.filter(e => !(e.id === req.params.id && e.tenantId === req.tenantId));
  res.json({ success: true });
});

// ==========================================
// QUOTATIONS (por tenant)
// ==========================================
app.get('/api/quotations', requireAuth, (req, res) => {
  res.json(memDB.quotations.filter(q => q.tenantId === req.tenantId).map(mapQuotationResponse).sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)));
});
app.post('/api/quotations', requireAuth, (req, res) => {
  const q = req.body; const id = q.id || genId('q');
  const item = { id, tenantId: req.tenantId, clientName: q.clientName||'Sin Nombre', clientEmail: q.clientEmail||'', clientPhone: q.clientPhone||'', eventType: q.eventType||'grados_otros', date: q.date||new Date().toISOString().substring(0,10), guests: parseInt(q.guests)||0, totalValue: parseFloat(q.totalValue)||0, discount: parseFloat(q.discount)||0, discountLabel: q.discountLabel||'', status: q.status||'pendiente', notes: q.notes||'', menu: q.menu||null, extraServices: q.selectedServices||q.extraServices||null, venueId: q.venueId||null, photographyId: q.photographyId||null, decorationId: q.decorationId||null, cateringId: q.cateringId||null, recreationId: q.recreationId||null, createdAt: new Date().toISOString() };
  const idx = memDB.quotations.findIndex(x => x.id === id && x.tenantId === req.tenantId);
  if (idx >= 0) memDB.quotations[idx] = item; else memDB.quotations.push(item);
  memDB.notifications.push({ id: genId('notif'), tenantId: req.tenantId, title: 'Nueva Cotización', message: `El cliente ${item.clientName} solicitó cotización para ${item.eventType}.`, type: 'quote', role: 'superadmin', read: false, createdAt: new Date().toISOString() });
  res.json(mapQuotationResponse(item));
});
app.put('/api/quotations/:id', requireAuth, (req, res) => {
  const idx = memDB.quotations.findIndex(x => x.id === req.params.id && x.tenantId === req.tenantId);
  if (idx < 0) return res.status(404).json({ error: 'Quotation not found' });
  const merged = { ...memDB.quotations[idx], ...req.body };
  if (req.body.selectedServices !== undefined) merged.extraServices = req.body.selectedServices;
  memDB.quotations[idx] = merged;
  res.json(mapQuotationResponse(merged));
});
app.delete('/api/quotations/:id', requireAuth, (req, res) => {
  memDB.quotations = memDB.quotations.filter(q => !(q.id === req.params.id && q.tenantId === req.tenantId));
  res.json({ success: true });
});

// ==========================================
// RECIPES (por tenant)
// ==========================================
app.get('/api/recipes', requireAuth, (req, res) => {
  res.json(memDB.recipes.filter(r => r.tenantId === req.tenantId).map(item => { const s = item.supplies||{}; return { id: item.id, productId: item.productId, name: s.name||'Sin nombre', category: s.category||'general', baseGuests: s.baseGuests||50, procedure: s.procedure||'', ingredients: s.ingredients||[] }; }));
});
app.post('/api/recipes', requireAuth, (req, res) => {
  const r = req.body; const id = r.id || genId('rec');
  const suppliesData = r.supplies || { name: r.name||'Sin nombre', category: r.category||'general', baseGuests: parseInt(r.baseGuests)||50, procedure: r.procedure||'', ingredients: r.ingredients||[] };
  const item = { id, tenantId: req.tenantId, productId: r.productId||'unknown', supplies: suppliesData };
  const idx = memDB.recipes.findIndex(x => x.id === id && x.tenantId === req.tenantId);
  if (idx >= 0) memDB.recipes[idx] = item; else memDB.recipes.push(item);
  res.json({ id: item.id, productId: item.productId, name: item.supplies.name, category: item.supplies.category, baseGuests: item.supplies.baseGuests, procedure: item.supplies.procedure, ingredients: item.supplies.ingredients });
});
app.delete('/api/recipes/:id', requireAuth, (req, res) => {
  memDB.recipes = memDB.recipes.filter(r => !(r.id === req.params.id && r.tenantId === req.tenantId));
  res.json({ success: true });
});

// ==========================================
// INVENTORY (por tenant)
// ==========================================
app.get('/api/inventory', requireAuth, (req, res) => res.json(memDB.inventory.filter(i => i.tenantId === req.tenantId).map(item => ({ ...item, quantity: item.stock }))));
app.post('/api/inventory', requireAuth, (req, res) => {
  const p = req.body; const id = p.id || genId('inv');
  const item = { ...p, id, tenantId: req.tenantId, stock: parseInt(p.quantity||p.stock)||0 };
  const idx = memDB.inventory.findIndex(x => x.id === id && x.tenantId === req.tenantId);
  if (idx >= 0) memDB.inventory[idx] = item; else memDB.inventory.push(item);
  res.json({ ...item, quantity: item.stock });
});
app.delete('/api/inventory/:id', requireAuth, (req, res) => {
  memDB.inventory = memDB.inventory.filter(i => !(i.id === req.params.id && i.tenantId === req.tenantId));
  res.json({ success: true });
});

// ==========================================
// CLIENTS (por tenant)
// ==========================================
app.get('/api/clients', requireAuth, (req, res) => res.json(memDB.clients.filter(c => c.tenantId === req.tenantId)));
app.post('/api/clients', requireAuth, (req, res) => {
  const c = req.body; const id = c.id || genId('cli');
  const item = { ...c, id, tenantId: req.tenantId, createdAt: c.createdAt || new Date().toISOString() };
  const idx = memDB.clients.findIndex(x => x.id === id && x.tenantId === req.tenantId);
  if (idx >= 0) memDB.clients[idx] = item; else memDB.clients.push(item);
  res.json(item);
});
app.delete('/api/clients/:id', requireAuth, (req, res) => {
  memDB.clients = memDB.clients.filter(c => !(c.id === req.params.id && c.tenantId === req.tenantId));
  res.json({ success: true });
});

// ==========================================
// USERS (por tenant — solo superadmin de ese tenant)
// ==========================================
app.get('/api/users', requireAuth, (req, res) => {
  const tenantUsers = memDB.users.filter(u => u.tenantId === req.tenantId);
  res.json(tenantUsers.map(u => ({ id: u.id, uid: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone, tenantId: u.tenantId })));
});
app.post('/api/users', requireAuth, (req, res) => {
  const u = req.body;
  const id = u.id || u.uid || genId('usr');
  const idx = memDB.users.findIndex(x => x.id === id && x.tenantId === req.tenantId);
  if (idx >= 0) {
    memDB.users[idx] = { ...memDB.users[idx], ...(u.email ? { email: u.email } : {}), ...(u.name ? { name: u.name } : {}), ...(u.role ? { role: u.role } : {}), ...(u.phone !== undefined ? { phone: u.phone } : {}), ...(u.password ? { password: bcrypt.hashSync(u.password, 10) } : {}) };
    const saved = memDB.users[idx];
    return res.json({ id: saved.id, uid: saved.id, email: saved.email, name: saved.name, role: saved.role, phone: saved.phone });
  }
  const hashedPassword = u.password ? bcrypt.hashSync(u.password, 10) : bcrypt.hashSync('123456', 10);
  const item = { id, tenantId: req.tenantId, email: u.email, name: u.name, role: u.role||'cliente', phone: u.phone||'', password: hashedPassword, trialStartDate: new Date().toISOString(), subscriptionStatus: 'trial', subscriptionPlan: null, subscriptionExpiry: null };
  memDB.users.push(item);
  res.json({ id: item.id, uid: item.id, email: item.email, name: item.name, role: item.role, phone: item.phone });
});
app.put('/api/users/:id', requireAuth, (req, res) => {
  const idx = memDB.users.findIndex(x => x.id === req.params.id && x.tenantId === req.tenantId);
  if (idx < 0) return res.status(404).json({ error: 'User not found' });
  const u = req.body;
  memDB.users[idx] = { ...memDB.users[idx], ...(u.email ? { email: u.email } : {}), ...(u.name ? { name: u.name } : {}), ...(u.role ? { role: u.role } : {}), ...(u.phone !== undefined ? { phone: u.phone } : {}), ...(u.password ? { password: bcrypt.hashSync(u.password, 10) } : {}) };
  const saved = memDB.users[idx];
  res.json({ id: saved.id, uid: saved.id, email: saved.email, name: saved.name, role: saved.role, phone: saved.phone });
});
app.delete('/api/users/:id', requireAuth, (req, res) => {
  memDB.users = memDB.users.filter(u => !(u.id === req.params.id && u.tenantId === req.tenantId));
  res.json({ success: true });
});

// PDF
app.post('/api/quotations/generate-pdf', (req, res) => {
  try {
    const data = req.body;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cotizacion_${data.clientName||'cliente'}.pdf"`);
    doc.pipe(res);
    doc.fontSize(22).text('CONTROL BANQUETE', { align: 'center' });
    doc.fontSize(14).text('Cotización de Servicios', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Cliente: ${data.clientName||''}`).text(`Tipo de Evento: ${data.eventType||''}`).text(`Fecha: ${data.date||''}`).text(`Invitados: ${data.guests||0}`);
    doc.moveDown();
    doc.fontSize(14).text(`Total: $${(data.totalValue||0).toLocaleString('es-CO')} COP`);
    doc.end();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// WEBHOOK n8n POR TENANT
// Cada SuperAdmin configura su propia URL de n8n en Configuración.
// El backend reenvía los eventos al webhook del tenant correcto.
// ==========================================

// Obtener config del webhook del tenant autenticado
app.get('/api/webhook/config', requireAuth, (req, res) => {
  const key = 'settings_' + req.tenantId;
  const s = memDB[key] || {};
  res.json({
    webhookUrl: s.webhookUrl || '',
    webhookEnabled: s.webhookEnabled || false,
    webhookSecret: s.webhookSecret ? '••••••••' : ''  // no exponer el secreto completo
  });
});

// Guardar config del webhook del tenant
app.post('/api/webhook/config', requireAuth, (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Solo el SuperAdmin puede configurar el webhook' });
  const key = 'settings_' + req.tenantId;
  if (!memDB[key]) memDB[key] = {};
  const { webhookUrl, webhookEnabled, webhookSecret } = req.body;
  if (webhookUrl !== undefined) memDB[key].webhookUrl = webhookUrl;
  if (webhookEnabled !== undefined) memDB[key].webhookEnabled = webhookEnabled;
  if (webhookSecret !== undefined && webhookSecret && webhookSecret !== '••••••••') {
    memDB[key].webhookSecret = webhookSecret;
  }
  res.json({ success: true, webhookEnabled: memDB[key].webhookEnabled, webhookUrl: memDB[key].webhookUrl });
});

// Probar webhook del tenant
app.post('/api/webhook/test', requireAuth, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Acceso denegado' });
  const key = 'settings_' + req.tenantId;
  const s = memDB[key] || {};
  if (!s.webhookUrl) return res.status(400).json({ error: 'No hay webhook configurado' });
  try {
    const payload = {
      event: 'test',
      tenantId: req.tenantId,
      businessName: s.businessName || 'Mi Negocio',
      timestamp: new Date().toISOString(),
      message: 'Prueba de conexión desde Control Banquete'
    };
    const headers = { 'Content-Type': 'application/json' };
    if (s.webhookSecret) headers['X-Webhook-Secret'] = s.webhookSecret;
    const fetchFn = s.webhookUrl.startsWith('https') ? https : http;
    const url = new URL(s.webhookUrl);
    const postData = JSON.stringify(payload);
    const options = {
      hostname: url.hostname, port: url.port || (s.webhookUrl.startsWith('https') ? 443 : 80),
      path: url.pathname + url.search, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(postData) },
      timeout: 8000
    };
    await new Promise((resolve, reject) => {
      const request = fetchFn.request(options, (r) => {
        r.on('data', () => {}); r.on('end', resolve);
      });
      request.on('error', reject);
      request.on('timeout', () => { request.destroy(); reject(new Error('Timeout')); });
      request.write(postData);
      request.end();
    });
    res.json({ success: true, message: 'Webhook de prueba enviado correctamente' });
  } catch(e) { res.status(500).json({ success: false, error: 'Error al conectar con el webhook: ' + e.message }); }
});

// Disparar webhook del tenant (llamado internamente al crear cotizaciones/eventos)
async function fireWebhook(tenantId, event, data) {
  const key = 'settings_' + tenantId;
  const s = memDB[key] || {};
  if (!s.webhookEnabled || !s.webhookUrl) return;
  try {
    const payload = { event, tenantId, businessName: s.businessName, timestamp: new Date().toISOString(), data };
    const headers = { 'Content-Type': 'application/json' };
    if (s.webhookSecret) headers['X-Webhook-Secret'] = s.webhookSecret;
    const fetchFn = s.webhookUrl.startsWith('https') ? https : http;
    const url = new URL(s.webhookUrl);
    const postData = JSON.stringify(payload);
    const options = {
      hostname: url.hostname, port: url.port || (s.webhookUrl.startsWith('https') ? 443 : 80),
      path: url.pathname + url.search, method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(postData) },
      timeout: 5000
    };
    const request = fetchFn.request(options, (r) => { r.on('data', () => {}); r.on('end', () => {}); });
    request.on('error', (e) => console.warn(`[Webhook] ${tenantId} error:`, e.message));
    request.write(postData);
    request.end();
  } catch(e) { console.warn(`[Webhook] ${tenantId} error:`, e.message); }
}


app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/subscription', (req, res) => res.sendFile(path.join(__dirname, 'subscription.html')));
app.get('/cotizar', (req, res) => res.sendFile(path.join(__dirname, 'cotizar.html')));

// ==========================================
// ENDPOINTS PÚBLICOS (sin autenticación)
// Para el cotizador que cada negocio comparte con sus clientes
// ==========================================

// Info pública del negocio (nombre, logo, datos de contacto)
app.get('/api/public/business', (req, res) => {
  const tenantId = req.query.t;
  if (!tenantId) return res.status(400).json({ error: 'Falta parámetro t (tenantId)' });
  const owner = memDB.users.find(u => u.tenantId === tenantId && u.role === 'superadmin');
  if (!owner) return res.status(404).json({ error: 'Negocio no encontrado' });
  const settings = memDB['settings_' + tenantId] || {};
  res.json({
    tenantId,
    businessName: settings.businessName || owner.businessName || 'Sin nombre',
    phone: owner.phone || '',
    email: owner.email || '',
    settings
  });
});

// Productos públicos del negocio (para armar el cotizador)
app.get('/api/public/products', (req, res) => {
  const tenantId = req.query.t;
  if (!tenantId) return res.status(400).json({ error: 'Falta parámetro t' });

  const list = memDB.products.filter(p => p.tenantId === tenantId).sort((a, b) => {
    const posA = a.position ?? 999999, posB = b.position ?? 999999;
    return posA !== posB ? posA - posB : a.name.localeCompare(b.name);
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
});

// Enviar cotización pública (el cliente llena el formulario)
app.post('/api/public/quotations', (req, res) => {
  const tenantId = req.query.t;
  if (!tenantId) return res.status(400).json({ error: 'Falta parámetro t' });
  const owner = memDB.users.find(u => u.tenantId === tenantId && u.role === 'superadmin');
  if (!owner) return res.status(404).json({ error: 'Negocio no encontrado' });

  const q = req.body;
  const id = 'q_' + Date.now().toString(36);
  const item = {
    id, tenantId,
    clientName: q.clientName || 'Sin Nombre', clientEmail: q.clientEmail || '',
    clientPhone: q.clientPhone || '', eventType: q.eventType || 'grados_otros',
    date: q.date || new Date().toISOString().substring(0, 10),
    guests: parseInt(q.guests) || 0, totalValue: parseFloat(q.totalValue) || 0,
    discount: 0, discountLabel: '', status: 'nueva',
    notes: q.notes || 'Solicitud desde el cotizador público.',
    menu: q.menu || null, extraServices: q.selectedServices || [],
    venueId: q.venueId || null, photographyId: q.photographyId || null,
    decorationId: q.decorationId || null, cateringId: q.cateringId || null,
    recreationId: q.recreationId || null,
    createdAt: new Date().toISOString()
  };
  memDB.quotations.push(item);

  // Notificación al admin del negocio
  memDB.notifications.push({
    id: 'notif_' + Date.now().toString(36), tenantId,
    title: '🎉 Nueva Cotización Recibida',
    message: `${item.clientName} solicita cotización para ${item.eventType} el ${item.date} (${item.guests} personas). Total estimado: $${item.totalValue.toLocaleString('es-CO')} COP`,
    type: 'quote', role: 'superadmin', read: false, createdAt: new Date().toISOString()
  });

  res.json({ success: true, id: item.id, message: '¡Cotización enviada! El equipo se pondrá en contacto.' });
});

// Login del cliente (portal privado de su evento)
// El login normal ya funciona; este endpoint devuelve el tenantId del cliente al loguearse
// para que el portal sepa qué negocio mostrar.



// ==========================================
// ULTRA-ADMIN ENDPOINTS
// ==========================================

const ULTRA_ADMIN_EMAIL    = process.env.ULTRA_ADMIN_EMAIL    || 'ultra@controlbanquete.com';
const ULTRA_ADMIN_PASSWORD = process.env.ULTRA_ADMIN_PASSWORD || 'UltraAdmin2026!';

// Login ultra-admin (credenciales fijas, no en memDB)
app.post('/api/auth/ultraadmin', async (req, res) => {
  const { email, password } = req.body;
  if (email !== ULTRA_ADMIN_EMAIL || password !== ULTRA_ADMIN_PASSWORD)
    return res.status(401).json({ error: 'Credenciales inválidas' });
  const token = jwt.sign({ uid: 'ultra', email, role: 'ultraadmin' }, JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token, user: { uid: 'ultra', email, role: 'ultraadmin', name: 'Ultra Admin' } });
});

// Middleware ultra-admin
function requireUltraAdmin(req, res, next) {
  const payload = getTokenPayload(req);
  if (!payload || payload.role !== 'ultraadmin') return res.status(403).json({ error: 'Acceso denegado' });
  req.user = payload;
  next();
}

// Listado de todos los tenants + métricas
app.get('/api/admin/tenants', requireUltraAdmin, (req, res) => {
  const superadmins = memDB.users.filter(u => u.role === 'superadmin');
  const data = superadmins.map(u => {
    const trial = getTrialStatus(u);
    const tenantUsers = memDB.users.filter(x => x.tenantId === u.tenantId).length;
    const tenantEvents = memDB.events.filter(e => e.tenantId === u.tenantId).length;
    const tenantQuotations = memDB.quotations.filter(q => q.tenantId === u.tenantId).length;
    return {
      tenantId: u.tenantId,
      businessName: u.businessName || u.name,
      email: u.email,
      name: u.name,
      phone: u.phone || '',
      subscriptionStatus: trial.status,
      subscriptionPlan: u.subscriptionPlan,
      subscriptionExpiry: u.subscriptionExpiry,
      trialStartDate: u.trialStartDate,
      createdAt: u.createdAt,
      daysLeft: trial.daysLeft,
      usersCount: tenantUsers,
      eventsCount: tenantEvents,
      quotationsCount: tenantQuotations
    };
  });
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
});

// Modificar suscripción de un tenant
app.put('/api/admin/tenants/:tenantId/subscription', requireUltraAdmin, (req, res) => {
  const { tenantId } = req.params;
  const { plan, status, expiryDate, extendDays } = req.body;
  const user = memDB.users.find(u => u.tenantId === tenantId && u.role === 'superadmin');
  if (!user) return res.status(404).json({ error: 'Tenant no encontrado' });

  if (status) user.subscriptionStatus = status;
  if (plan) user.subscriptionPlan = plan;

  if (expiryDate) {
    user.subscriptionExpiry = new Date(expiryDate).toISOString();
  } else if (extendDays && parseInt(extendDays) > 0) {
    const base = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : new Date();
    base.setDate(base.getDate() + parseInt(extendDays));
    user.subscriptionExpiry = base.toISOString();
  } else if (status === 'active' && plan && !user.subscriptionExpiry) {
    const now = new Date();
    if (plan === 'monthly')   now.setMonth(now.getMonth() + 1);
    if (plan === 'quarterly') now.setMonth(now.getMonth() + 3);
    if (plan === 'annual')    now.setFullYear(now.getFullYear() + 1);
    user.subscriptionExpiry = now.toISOString();
  }

  res.json({ success: true, tenantId, subscriptionStatus: user.subscriptionStatus, subscriptionPlan: user.subscriptionPlan, subscriptionExpiry: user.subscriptionExpiry });
});

// Crear suscripción nueva manualmente
app.post('/api/admin/tenants/:tenantId/subscription', requireUltraAdmin, (req, res) => {
  const { tenantId } = req.params;
  const { plan } = req.body;
  const user = memDB.users.find(u => u.tenantId === tenantId && u.role === 'superadmin');
  if (!user) return res.status(404).json({ error: 'Tenant no encontrado' });

  const now = new Date(); const expiry = new Date(now);
  if (plan === 'monthly')   expiry.setMonth(expiry.getMonth() + 1);
  if (plan === 'quarterly') expiry.setMonth(expiry.getMonth() + 3);
  if (plan === 'annual')    expiry.setFullYear(expiry.getFullYear() + 1);
  user.subscriptionStatus = 'active';
  user.subscriptionPlan = plan;
  user.subscriptionExpiry = expiry.toISOString();

  res.json({ success: true, plan, expiry: expiry.toISOString() });
});

// Eliminar tenant y todos sus datos
app.delete('/api/admin/tenants/:tenantId', requireUltraAdmin, (req, res) => {
  const { tenantId } = req.params;
  const exists = memDB.users.find(u => u.tenantId === tenantId && u.role === 'superadmin');
  if (!exists) return res.status(404).json({ error: 'Tenant no encontrado' });

  memDB.users       = memDB.users.filter(u => u.tenantId !== tenantId);
  memDB.products    = memDB.products.filter(p => p.tenantId !== tenantId);
  memDB.events      = memDB.events.filter(e => e.tenantId !== tenantId);
  memDB.quotations  = memDB.quotations.filter(q => q.tenantId !== tenantId);
  memDB.clients     = memDB.clients.filter(c => c.tenantId !== tenantId);
  memDB.providers   = memDB.providers.filter(p => p.tenantId !== tenantId);
  memDB.inventory   = memDB.inventory.filter(i => i.tenantId !== tenantId);
  memDB.notifications = memDB.notifications.filter(n => n.tenantId !== tenantId);
  memDB.recipes     = memDB.recipes.filter(r => r.tenantId !== tenantId);
  delete memDB['settings_' + tenantId];

  res.json({ success: true, message: 'Tenant y todos sus datos eliminados.' });
});

// Cancelación de suscripción por el propio usuario
app.post('/api/subscription/cancel', requireAuth, (req, res) => {
  const superadmin = memDB.users.find(u => u.tenantId === req.tenantId && u.role === 'superadmin');
  if (!superadmin) return res.status(404).json({ error: 'Tenant no encontrado' });

  superadmin.subscriptionStatus = 'cancelled';
  // El acceso se mantiene hasta la fecha de expiración original
  res.json({
    success: true,
    message: 'Suscripción cancelada. Tendrás acceso hasta la fecha de expiración.',
    expiry: superadmin.subscriptionExpiry
  });
});


// ── Config global del sistema (ultra-admin)
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

// ── Días de prueba personalizados por tenant (ultra-admin)
app.put('/api/admin/tenants/:tenantId/trial', requireUltraAdmin, (req, res) => {
  const { tenantId } = req.params;
  const { trialDays, resetTrialDate } = req.body;
  const user = memDB.users.find(u => u.tenantId === tenantId && u.role === 'superadmin');
  if (!user) return res.status(404).json({ error: 'Tenant no encontrado' });

  if (trialDays !== undefined) {
    const d = parseInt(trialDays);
    if (isNaN(d) || d < 0 || d > 365) return res.status(400).json({ error: 'trialDays debe ser entre 0 y 365' });
    user.customTrialDays = d;
  }
  if (resetTrialDate) {
    user.trialStartDate = new Date().toISOString();
    if (user.subscriptionStatus !== 'active') user.subscriptionStatus = 'trial';
  }

  const trial = getTrialStatus(user);
  res.json({ success: true, tenantId, customTrialDays: user.customTrialDays, trialStatus: trial });
});

// Rutas páginas legales y ultra-admin
app.get('/ultraadmin', (req, res) => res.sendFile(path.join(__dirname, 'ultraadmin.html')));
app.get('/legal', (req, res) => res.sendFile(path.join(__dirname, 'legal.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'legal.html')));


app.get('/{*path}', (req, res) => {

  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✔ Servidor MULTI-TENANT corriendo en http://localhost:${PORT}`);
  console.log(`📋 Registra tu negocio en: http://localhost:${PORT}/register.html`);
});
