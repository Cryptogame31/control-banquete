// Test de aislamiento multi-tenant
// Crea 2 negocios independientes y verifica que sus datos NO se mezclan

const http = require('http');

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost', port: 8080, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };
    const req = http.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TEST DE AISLAMIENTO MULTI-TENANT — Control Banquete');
  console.log('======================================================\n');

  let passed = 0, failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('  ✅ PASS:', message);
      passed++;
    } else {
      console.log('  ❌ FAIL:', message);
      failed++;
    }
  }

  // ──────────────────────────────────────────────
  // 1. Registrar Negocio A
  // ──────────────────────────────────────────────
  console.log('📋 PASO 1: Registrar Negocio A (Banquetes La Perla)');
  const regA = await apiCall('POST', '/api/auth/register', {
    email: 'test_a_' + Date.now() + '@test.com',
    password: 'test123456',
    name: 'Admin La Perla',
    businessName: 'Banquetes La Perla'
  });
  assert(regA.status === 200, 'Negocio A registrado exitosamente');
  assert(regA.data.user?.role === 'superadmin', 'Usuario A tiene rol superadmin');
  assert(!!regA.data.user?.tenantId, 'Usuario A tiene tenantId asignado');
  const tokenA = regA.data.token;
  const tenantIdA = regA.data.user?.tenantId;
  console.log('   TenantID A:', tenantIdA, '\n');

  // ──────────────────────────────────────────────
  // 2. Registrar Negocio B
  // ──────────────────────────────────────────────
  console.log('📋 PASO 2: Registrar Negocio B (El Jardín Eventos)');
  const regB = await apiCall('POST', '/api/auth/register', {
    email: 'test_b_' + Date.now() + '@test.com',
    password: 'test123456',
    name: 'Admin El Jardín',
    businessName: 'El Jardín Eventos'
  });
  assert(regB.status === 200, 'Negocio B registrado exitosamente');
  assert(regB.data.user?.tenantId !== tenantIdA, 'Negocio B tiene tenantId DIFERENTE al de A');
  const tokenB = regB.data.token;
  const tenantIdB = regB.data.user?.tenantId;
  console.log('   TenantID B:', tenantIdB, '\n');

  // ──────────────────────────────────────────────
  // 3. Negocio A crea una cotización exclusiva
  // ──────────────────────────────────────────────
  console.log('📋 PASO 3: Negocio A crea cotización "Boda García-López"');
  const cotA = await apiCall('POST', '/api/quotations', {
    clientName: 'Boda García-López',
    clientEmail: 'garcia@test.com',
    eventType: 'boda',
    date: '2026-12-15',
    guests: 200,
    totalValue: 5000000
  }, tokenA);
  assert(cotA.status === 200, 'Cotización A creada');
  assert(cotA.data.clientName === 'Boda García-López', 'Cotización A tiene el nombre correcto');
  console.log('');

  // ──────────────────────────────────────────────
  // 4. Negocio B crea una cotización exclusiva
  // ──────────────────────────────────────────────
  console.log('📋 PASO 4: Negocio B crea cotización "Quinceañera Martínez"');
  const cotB = await apiCall('POST', '/api/quotations', {
    clientName: 'Quinceañera Martínez',
    clientEmail: 'martinez@test.com',
    eventType: 'quinces',
    date: '2026-11-20',
    guests: 80,
    totalValue: 2000000
  }, tokenB);
  assert(cotB.status === 200, 'Cotización B creada');
  console.log('');

  // ──────────────────────────────────────────────
  // 5. Negocio A SOLO ve SUS cotizaciones
  // ──────────────────────────────────────────────
  console.log('📋 PASO 5: Verificar aislamiento de cotizaciones');
  const quotsA = await apiCall('GET', '/api/quotations', null, tokenA);
  const quotsB = await apiCall('GET', '/api/quotations', null, tokenB);

  const aSeesGarcia   = quotsA.data.some(q => q.clientName === 'Boda García-López');
  const aSeesMartin   = quotsA.data.some(q => q.clientName === 'Quinceañera Martínez');
  const bSeesMartinez = quotsB.data.some(q => q.clientName === 'Quinceañera Martínez');
  const bSeesGarcia   = quotsB.data.some(q => q.clientName === 'Boda García-López');

  assert(aSeesGarcia,   'Negocio A ve su cotización "Boda García-López"');
  assert(!aSeesMartin,  '🔒 Negocio A NO ve cotización de Negocio B (Martínez)');
  assert(bSeesMartinez, 'Negocio B ve su cotización "Quinceañera Martínez"');
  assert(!bSeesGarcia,  '🔒 Negocio B NO ve cotización de Negocio A (García)');
  console.log('   Cotizaciones visibles para A:', quotsA.data.length);
  console.log('   Cotizaciones visibles para B:', quotsB.data.length, '\n');

  // ──────────────────────────────────────────────
  // 6. Productos independientes por tenant
  // ──────────────────────────────────────────────
  console.log('📋 PASO 6: Negocio A agrega producto exclusivo');
  const prodA = await apiCall('POST', '/api/products', {
    category: 'catering', name: 'Menú Exclusivo La Perla', price: 75000
  }, tokenA);
  assert(prodA.status === 200, 'Producto A creado');

  const prodsA = await apiCall('GET', '/api/products', null, tokenA);
  const prodsB = await apiCall('GET', '/api/products', null, tokenB);

  const aSeesMenuPerla = prodsA.data.catering?.some(p => p.name === 'Menú Exclusivo La Perla');
  const bSeesMenuPerla = prodsB.data.catering?.some(p => p.name === 'Menú Exclusivo La Perla');

  assert(aSeesMenuPerla,  'Negocio A ve su "Menú Exclusivo La Perla"');
  assert(!bSeesMenuPerla, '🔒 Negocio B NO ve el menú privado de Negocio A');
  console.log('');

  // ──────────────────────────────────────────────
  // 7. Usuarios independientes por tenant
  // ──────────────────────────────────────────────
  console.log('📋 PASO 7: Verificar usuarios por tenant');
  const usersA = await apiCall('GET', '/api/users', null, tokenA);
  const usersB = await apiCall('GET', '/api/users', null, tokenB);

  const aSeesAdminB = usersA.data.some(u => u.email === regB.data.user?.email);
  const bSeesAdminA = usersB.data.some(u => u.email === regA.data.user?.email);

  assert(!aSeesAdminB, '🔒 Negocio A NO ve usuarios de Negocio B');
  assert(!bSeesAdminA, '🔒 Negocio B NO ve usuarios de Negocio A');
  console.log('   Usuarios de A:', usersA.data.length);
  console.log('   Usuarios de B:', usersB.data.length, '\n');

  // ──────────────────────────────────────────────
  // 8. Suscripción por tenant
  // ──────────────────────────────────────────────
  console.log('📋 PASO 8: Verificar estado de suscripción individual');
  const subA = await apiCall('GET', '/api/subscription/status', null, tokenA);
  const subB = await apiCall('GET', '/api/subscription/status', null, tokenB);
  assert(subA.status === 200 && subA.data.status === 'trial', 'Negocio A está en período trial');
  assert(subB.status === 200 && subB.data.status === 'trial', 'Negocio B está en período trial');
  assert(subA.data.daysLeft >= 2, `Negocio A tiene ${subA.data.daysLeft} días de prueba`);
  console.log('   Días trial A:', subA.data.daysLeft);
  console.log('   Días trial B:', subB.data.daysLeft, '\n');

  // ──────────────────────────────────────────────
  // RESULTADO FINAL
  // ──────────────────────────────────────────────
  console.log('======================================================');
  console.log(`🏁 RESULTADO FINAL: ${passed} pruebas pasadas / ${failed} fallidas`);
  if (failed === 0) {
    console.log('✅ AISLAMIENTO MULTI-TENANT 100% VERIFICADO');
    console.log('   Los datos de cada negocio son completamente independientes.');
  } else {
    console.log('⚠️  Hay problemas de aislamiento que necesitan corrección.');
  }
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Error ejecutando tests:', err.message);
  console.error('Asegúrate de que el servidor esté corriendo en http://localhost:8080');
});
