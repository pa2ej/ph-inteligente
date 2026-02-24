const sql = require("mssql");

// ── Configuración de conexion SQL Server ──────────────────────
const config = {
  server:   process.env.DB_SERVER   || "localhost",
  port:     Number(process.env.DB_PORT) || 1433,
  database: process.env.DB_DATABASE || "ph_inteligente",
  user:     process.env.DB_USER     || "sa",
  password: process.env.DB_PASSWORD,
  options: {
    encrypt:              process.env.DB_ENCRYPT    === "true",
    trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
    enableArithAbort:     true,
  },
  pool: {
    max:     10,
    min:     0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout:  5000,
  requestTimeout:    30000,
};

let pool = null;

/**
 * Inicializa y retorna el pool de conexiones.
 * Singleton: crea el pool solo una vez.
 */
const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
};

/**
 * Ejecuta una query parametrizada.
 * @param {string}   queryText  - SQL con parámetros @nombre
 * @param {object[]} params     - [{ name, type, value }]
 *
 * Tipos disponibles: sql.Int, sql.NVarChar, sql.Bit, sql.Date,
 *                    sql.DateTime2, sql.Decimal, sql.SmallInt
 *
 * Uso:
 *   const res = await query(
 *     'SELECT * FROM usuarios WHERE id = @id',
 *     [{ name: 'id', type: sql.Int, value: 1 }]
 *   );
 */
const query = async (queryText, params = []) => {
  const p = await getPool();
  const req = p.request();

  for (const { name, type, value } of params) {
    req.input(name, type, value);
  }

  return req.query(queryText);
};

/**
 * Ejecuta un Stored Procedure.
 * @param {string}   spName  - Nombre del SP
 * @param {object[]} params  - [{ name, type, value }]
 */
const execSP = async (spName, params = []) => {
  const p = await getPool();
  const req = p.request();

  for (const { name, type, value } of params) {
    req.input(name, type, value);
  }

  return req.execute(spName);
};

/**
 * Verifica la conexión al arrancar.
 */
const testConnection = async () => {
  try {
    const res = await query("SELECT GETDATE() AS ts, DB_NAME() AS db");
    const row = res.recordset[0];
    console.log(`✅  SQL Server conectado — DB: ${row.db} — ${row.ts}`);
  } catch (err) {
    console.error("❌  Error conectando a SQL Server:", err.message);
    process.exit(1);
  }
};

module.exports = { sql, getPool, query, execSP, testConnection };
