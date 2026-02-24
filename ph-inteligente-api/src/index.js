require("dotenv").config();
const express  = require("express");
const helmet   = require("helmet");
const cors     = require("cors");
const morgan   = require("morgan");
const path     = require("path");

const { testConnection } = require("./models/db");

// ── Routers ───────────────────────────────────────────────────
const authRoutes         = require("./routes/auth.routes");
const unidadesRoutes     = require("./routes/unidades.routes");
const facturacionRoutes  = require("./routes/facturacion.routes");
const pagosRoutes        = require("./routes/pagos.routes");
const propietariosRoutes = require("./routes/propietarios.routes");
const pqrRoutes          = require("./routes/pqr.routes");
const reservasRoutes     = require("./routes/reservas.routes");
const reportesRoutes     = require("./routes/reportes.routes");
const mantenimientoRoutes = require("./routes/mantenimiento.routes");
const egresosRoutes      = require("./routes/egresos.routes");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globales ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:         process.env.FRONTEND_URL || "http://localhost:5173",
  methods:        ["GET","POST","PUT","PATCH","DELETE"],
  allowedHeaders: ["Content-Type","x-token"],
  credentials:    true,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Servir PDFs generados estáticamente
app.use("/pdfs", express.static(path.join(__dirname, "..", "pdfs")));

// ── Health check ──────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV, ts: new Date().toISOString() });
});

// ── Rutas de la API ───────────────────────────────────────────
app.use("/api/auth",          authRoutes);
app.use("/api/unidades",      unidadesRoutes);
app.use("/api/finanzas",      facturacionRoutes);
app.use("/api/finanzas",      pagosRoutes);
app.use("/api/propietarios",  propietariosRoutes);
app.use("/api/pqr",           pqrRoutes);
app.use("/api/reservas",      reservasRoutes);
app.use("/api/reportes",      reportesRoutes);
app.use("/api/mantenimientos", mantenimientoRoutes);
app.use("/api/egresos",       egresosRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ ok: false, msg: `Ruta no encontrada: ${req.method} ${req.path}` });
});

// ── Error handler global ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  console.error(`[ERROR ${status}]`, err.message);
  res.status(status).json({
    ok:  false,
    msg: process.env.NODE_ENV === "production" ? "Error interno" : err.message,
  });
});

// ── Arranque ──────────────────────────────────────────────────
(async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🏢  PH Inteligente API   →  http://localhost:${PORT}/api`);
    console.log(`📋  Health check         →  http://localhost:${PORT}/api/health\n`);
  });
})();
