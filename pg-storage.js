/**
 * pg-storage.js — Control Banquete
 * 
 * Capa de persistencia PostgreSQL con patrón dual-write.
 * 
 * Modo de operación:
 *   - Si DATABASE_URL está definido → usa PostgreSQL + mantiene memDB en sync
 *   - Si no → solo memDB (modo dev/offline)
 * 
 * Esquema: una sola tabla "records" con JSONB para flexibilidad máxima.
 * Esto evita migrations complejas y permite cambiar el schema sin ALTER TABLE.
 */

let pool = null;
let isReady = false;

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
async function initPG(memDB) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.log('📦 Almacenamiento: Modo Memoria (sin DATABASE_URL)');
    isReady = true;
    return;
  }

  const { Pool } = require('pg');

  try {
    console.log('🔄 Conectando a PostgreSQL...');
    pool = new Pool({
      connectionString: dbUrl,
      ssl: (dbUrl.includes('localhost') || dbUrl.includes('sslmode=disable')) ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    // Verificar conexión
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    // Crear tablas si no existen
    await createSchema();

    // Cargar datos existentes en memDB (hidratación)
    await hydrateMemDB(memDB);

    isReady = true;
    console.log('✅ PostgreSQL conectado y datos hidratados en memoria');
  } catch (err) {
    if (err.message.includes('does not support SSL') || err.message.includes('SSL connection') || err.message.includes('SSL')) {
      console.log('⚠️  El servidor de base de datos no soporta SSL. Reintentando de forma segura sin SSL...');
      try {
        if (pool) await pool.end().catch(() => {});
        pool = new Pool({
          connectionString: dbUrl,
          ssl: false,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000
        });

        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();

        await createSchema();
        await hydrateMemDB(memDB);

        isReady = true;
        console.log('✅ PostgreSQL conectado (sin SSL) y datos hidratados en memoria');
        return;
      } catch (retryErr) {
        console.error('⚠️  PostgreSQL no disponible (reintento sin SSL falló):', retryErr.message);
      }
    } else {
      console.error('⚠️  PostgreSQL no disponible:', err.message);
    }
    console.error('   (Los datos NO persistirán entre reinicios)');
    pool = null;
    isReady = true;
  }
}

// ──────────────────────────────────────────────
// SCHEMA
// ──────────────────────────────────────────────
async function createSchema() {
  const sql = `
    CREATE TABLE IF NOT EXISTS cb_records (
      id          VARCHAR(200) PRIMARY KEY,
      tenant_id   VARCHAR(100),
      rec_type    VARCHAR(50) NOT NULL,
      data        JSONB NOT NULL DEFAULT '{}',
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_cb_records_tenant_type
      ON cb_records(tenant_id, rec_type);

    CREATE INDEX IF NOT EXISTS idx_cb_records_type
      ON cb_records(rec_type);

    -- Tabla de config global (clave-valor)
    CREATE TABLE IF NOT EXISTS cb_global_config (
      key   VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL
    );
  `;
  await pool.query(sql);
}

// ──────────────────────────────────────────────
// HIDRATACIÓN: PG → memDB al inicio
// ──────────────────────────────────────────────
async function hydrateMemDB(memDB) {
  if (!pool) return;

  const { rows } = await pool.query(
    'SELECT id, tenant_id, rec_type, data FROM cb_records ORDER BY created_at ASC'
  );

  // Limpiar memDB antes de hidratar
  memDB.users = [];
  memDB.products = [];
  memDB.quotations = [];
  memDB.events = [];
  memDB.providers = [];
  memDB.recipes = [];
  memDB.inventory = [];
  memDB.clients = [];
  memDB.notifications = [];

  for (const row of rows) {
    const item = { ...row.data, id: row.id, tenantId: row.tenant_id };

    if (row.rec_type === 'settings') {
      // Settings usa clave especial en memDB
      memDB['settings_' + row.tenant_id] = row.data;
    } else if (Array.isArray(memDB[row.rec_type])) {
      memDB[row.rec_type].push(item);
    }
  }

  // Cargar config global
  const { rows: cfgRows } = await pool.query('SELECT key, value FROM cb_global_config');
  return cfgRows;  // el servidor los aplica
}

// ──────────────────────────────────────────────
// WRITE HELPERS
// ──────────────────────────────────────────────

/** Guarda o actualiza un registro en PostgreSQL */
async function upsert(recType, tenantId, id, data) {
  if (!pool) return;
  try {
    // Quitar id y tenantId del JSONB (ya están en columnas)
    const { id: _id, tenantId: _tid, ...cleanData } = data;
    await pool.query(
      `INSERT INTO cb_records(id, tenant_id, rec_type, data, updated_at)
       VALUES($1, $2, $3, $4, NOW())
       ON CONFLICT(id) DO UPDATE SET data = $4, updated_at = NOW()`,
      [id, tenantId, recType, JSON.stringify(cleanData)]
    );
  } catch (err) {
    console.error(`[PG] upsert ${recType} ${id}:`, err.message);
  }
}

/** Elimina un registro de PostgreSQL */
async function remove(id) {
  if (!pool) return;
  try {
    await pool.query('DELETE FROM cb_records WHERE id = $1', [id]);
  } catch (err) {
    console.error(`[PG] remove ${id}:`, err.message);
  }
}

/** Elimina todos los registros de un tenant */
async function removeTenant(tenantId) {
  if (!pool) return;
  try {
    await pool.query('DELETE FROM cb_records WHERE tenant_id = $1', [tenantId]);
  } catch (err) {
    console.error(`[PG] removeTenant ${tenantId}:`, err.message);
  }
}

/** Guarda settings de un tenant */
async function upsertSettings(tenantId, data) {
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO cb_records(id, tenant_id, rec_type, data, updated_at)
       VALUES($1, $2, 'settings', $3, NOW())
       ON CONFLICT(id) DO UPDATE SET data = $3, updated_at = NOW()`,
      ['settings_' + tenantId, tenantId, JSON.stringify(data)]
    );
  } catch (err) {
    console.error(`[PG] upsertSettings ${tenantId}:`, err.message);
  }
}

/** Guarda config global */
async function saveGlobalConfig(config) {
  if (!pool) return;
  try {
    for (const [key, value] of Object.entries(config)) {
      await pool.query(
        `INSERT INTO cb_global_config(key, value) VALUES($1, $2)
         ON CONFLICT(key) DO UPDATE SET value = $2`,
        [key, JSON.stringify(value)]
      );
    }
  } catch (err) {
    console.error('[PG] saveGlobalConfig:', err.message);
  }
}

/** Carga config global desde PostgreSQL */
async function loadGlobalConfig() {
  if (!pool) return null;
  try {
    const { rows } = await pool.query('SELECT key, value FROM cb_global_config');
    const cfg = {};
    for (const row of rows) {
      cfg[row.key] = row.value;
    }
    return cfg;
  } catch (err) {
    console.error('[PG] loadGlobalConfig:', err.message);
    return null;
  }
}

// ──────────────────────────────────────────────
// EXPORTS
// ──────────────────────────────────────────────
module.exports = {
  initPG,
  isReady: () => isReady,
  isPG: () => !!pool,
  upsert,
  remove,
  removeTenant,
  upsertSettings,
  saveGlobalConfig,
  loadGlobalConfig,
  hydrateMemDB,
  pool: () => pool
};
