const { query, sql } = require("../models/db");
const puppeteer       = require("puppeteer");
const path            = require("path");
const fs              = require("fs");

// ─────────────────────────────────────────────
//  GET /api/reportes/dashboard
// ─────────────────────────────────────────────
const dashboardKpis = async (req, res) => {
  const cid = req.usuario.copropiedad_id;

  try {
    const [unidades, facturasMes, pagosMes, mora, pqrOpen] = await Promise.all([
      query("SELECT COUNT(*) AS total FROM unidades WHERE copropiedad_id=@cid AND activa=1",
        [{ name:"cid", type:sql.Int, value:cid }]),
      query(
        `SELECT COUNT(*) AS total,
                SUM(total) AS facturado,
                SUM(CASE WHEN estado='pagada'    THEN 1 ELSE 0 END) AS pagadas,
                SUM(CASE WHEN estado='pendiente' THEN 1 ELSE 0 END) AS pendientes,
                SUM(CASE WHEN estado='vencida'   THEN 1 ELSE 0 END) AS vencidas
         FROM facturas
         WHERE copropiedad_id=@cid AND periodo_anio=YEAR(GETDATE()) AND periodo_mes=MONTH(GETDATE())`,
        [{ name:"cid", type:sql.Int, value:cid }]),
      query(
        `SELECT ISNULL(SUM(monto),0) AS recaudado FROM pagos
         WHERE copropiedad_id=@cid AND estado IN ('registrado','verificado')
           AND YEAR(fecha_pago)=YEAR(GETDATE()) AND MONTH(fecha_pago)=MONTH(GETDATE())`,
        [{ name:"cid", type:sql.Int, value:cid }]),
      query("SELECT COUNT(*) AS total FROM v_unidades_mora WHERE copropiedad_id=@cid",
        [{ name:"cid", type:sql.Int, value:cid }]),
      query("SELECT COUNT(*) AS total FROM pqr WHERE copropiedad_id=@cid AND estado NOT IN ('cerrado','archivado')",
        [{ name:"cid", type:sql.Int, value:cid }]),
    ]);

    res.json({
      ok:   true,
      data: {
        total_unidades: unidades.recordset[0].total,
        facturas_mes:   facturasMes.recordset[0],
        recaudado_mes:  parseFloat(pagosMes.recordset[0].recaudado),
        unidades_mora:  mora.recordset[0].total,
        pqr_abiertos:   pqrOpen.recordset[0].total,
      },
    });
  } catch (err) {
    console.error("[reportes/dashboard]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

// ─────────────────────────────────────────────
//  GET /api/reportes/mora
// ─────────────────────────────────────────────
const reporteMora = async (req, res) => {
  try {
    const r = await query(
      "SELECT * FROM v_unidades_mora WHERE copropiedad_id=@cid ORDER BY deuda_total DESC",
      [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }]
    );
    res.json({ ok:true, total:r.recordset.length, data:r.recordset });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

// ─────────────────────────────────────────────
//  GET /api/reportes/recaudo-anual?anio=
// ─────────────────────────────────────────────
const recaudoAnual = async (req, res) => {
  const anio = parseInt(req.query.anio) || new Date().getFullYear();

  try {
    const r = await query(
      `SELECT periodo_mes AS mes, total_facturado, total_recaudado,
              total_pendiente, pct_recaudo, total_facturas,
              facturas_pagadas, facturas_pendientes, facturas_vencidas
       FROM v_resumen_mensual
       WHERE copropiedad_id=@cid AND periodo_anio=@anio
       ORDER BY periodo_mes`,
      [
        { name:"cid",  type:sql.Int,     value:req.usuario.copropiedad_id },
        { name:"anio", type:sql.SmallInt,value:anio },
      ]
    );
    res.json({ ok:true, anio, data:r.recordset });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

// ─────────────────────────────────────────────
//  GET /api/reportes/estado-cartera
// ─────────────────────────────────────────────
const estadoCartera = async (req, res) => {
  const { anio, mes } = req.query;
  let where = "WHERE unidad_id IN (SELECT id FROM unidades WHERE copropiedad_id=@cid)";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  if (anio) { where += " AND periodo_anio=@anio"; params.push({ name:"anio", type:sql.SmallInt, value:parseInt(anio) }); }
  if (mes)  { where += " AND periodo_mes=@mes";   params.push({ name:"mes",  type:sql.SmallInt, value:parseInt(mes) }); }

  try {
    const r = await query(`SELECT * FROM v_estado_financiero ${where} ORDER BY unidad`, params);
    const totales = {
      total_facturado: r.recordset.reduce((s,x)=>s+parseFloat(x.valor_factura||0),0),
      total_pagado:    r.recordset.reduce((s,x)=>s+parseFloat(x.total_pagado||0),0),
      total_pendiente: r.recordset.reduce((s,x)=>s+parseFloat(x.saldo_pendiente||0),0),
    };
    res.json({ ok:true, totales, data:r.recordset });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

// ─────────────────────────────────────────────
//  GET /api/reportes/pdf/paz-y-salvo/:unidadId
//  Genera un PDF de paz y salvo para la unidad
// ─────────────────────────────────────────────
const pdfPazYSalvo = async (req, res) => {
  const unidadId = parseInt(req.params.unidadId);
  const cid = req.usuario.copropiedad_id;

  try {
    const [uRes, copRes, factRes] = await Promise.all([
      query(
        `SELECT u.numero, u.tipo, u.coeficiente,
                p.nombre+' '+p.apellido AS propietario, p.num_doc, p.tipo_doc
         FROM unidades u
         LEFT JOIN ocupaciones o ON o.unidad_id=u.id AND o.activa=1 AND o.rol='propietario'
         LEFT JOIN personas p ON p.id=o.persona_id
         WHERE u.id=@uid AND u.copropiedad_id=@cid`,
        [{ name:"uid", type:sql.Int, value:unidadId }, { name:"cid", type:sql.Int, value:cid }]
      ),
      query("SELECT * FROM copropiedades WHERE id=@cid", [{ name:"cid", type:sql.Int, value:cid }]),
      query(
        `SELECT COUNT(*) AS pendientes, ISNULL(SUM(f.total - ISNULL(pg.p,0)),0) AS deuda
         FROM facturas f
         LEFT JOIN (SELECT factura_id, SUM(monto) AS p FROM pagos WHERE estado IN ('registrado','verificado') GROUP BY factura_id) pg
             ON pg.factura_id=f.id
         WHERE f.unidad_id=@uid AND f.estado IN ('pendiente','parcial','vencida')`,
        [{ name:"uid", type:sql.Int, value:unidadId }]
      ),
    ]);

    if (!uRes.recordset.length)
      return res.status(404).json({ ok:false, msg:"Unidad no encontrada" });

    const unidad = uRes.recordset[0];
    const cop    = copRes.recordset[0];
    const cartera = factRes.recordset[0];
    const alDia  = parseFloat(cartera.deuda) === 0;

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
  .header { text-align:center; border-bottom: 3px solid #1e40af; padding-bottom:20px; margin-bottom:30px; }
  .title  { font-size:22px; font-weight:bold; color:#1e40af; }
  .badge  { display:inline-block; padding:6px 20px; border-radius:20px;
            font-size:18px; font-weight:bold; color:#fff;
            background:${alDia ? "#059669" : "#dc2626"}; margin-top:10px; }
  table { width:100%; border-collapse:collapse; margin:20px 0; }
  td    { padding:8px 12px; border-bottom:1px solid #e2e8f0; }
  td:first-child { font-weight:600; width:40%; color:#475569; }
  .footer { margin-top:40px; text-align:center; font-size:12px; color:#94a3b8; }
  .firma  { margin-top:60px; display:flex; justify-content:space-around; }
  .firma div { text-align:center; }
  .linea  { border-top:1px solid #334155; width:180px; margin-bottom:5px; }
</style></head>
<body>
<div class="header">
  <div class="title">${cop.nombre}</div>
  <div>${cop.direccion || ""} — ${cop.ciudad || ""}</div>
  <div><strong>PAZ Y SALVO DE ADMINISTRACIÓN</strong></div>
  <span class="badge">${alDia ? "✓ AL DÍA" : "⚠ CON DEUDA"}</span>
</div>

<p>La administración de <strong>${cop.nombre}</strong> certifica que la unidad:</p>

<table>
  <tr><td>Unidad</td><td><strong>${unidad.numero}</strong></td></tr>
  <tr><td>Tipo</td><td>${unidad.tipo}</td></tr>
  <tr><td>Propietario</td><td>${unidad.propietario || "Sin registrar"}</td></tr>
  <tr><td>Documento</td><td>${unidad.tipo_doc || ""} ${unidad.num_doc || ""}</td></tr>
  <tr><td>Coeficiente</td><td>${(parseFloat(unidad.coeficiente||0)*100).toFixed(4)}%</td></tr>
  <tr><td>Estado</td><td style="color:${alDia?"#059669":"#dc2626"};font-weight:bold">${alDia ? "AL DÍA" : "CARTERA PENDIENTE"}</td></tr>
  ${!alDia ? `<tr><td>Saldo pendiente</td><td style="color:#dc2626;font-weight:bold">$${parseFloat(cartera.deuda).toLocaleString("es-CO")}</td></tr>` : ""}
</table>

<p>Fecha de expedición: <strong>${new Date().toLocaleDateString("es-CO", { year:"numeric", month:"long", day:"numeric" })}</strong></p>
<p>Este documento tiene validez de <strong>30 días</strong> a partir de la fecha de expedición.</p>

<div class="firma">
  <div><div class="linea"></div><div>Administrador</div><div>${cop.representante || ""}</div></div>
  <div><div class="linea"></div><div>Firma Propietario</div></div>
</div>

<div class="footer">
  Generado por PH Inteligente • ${new Date().toLocaleString("es-CO")}
</div>
</body></html>`;

    // Generar PDF con Puppeteer
    const pdfDir = path.join(process.cwd(), "pdfs");
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });

    const filename  = `paz-salvo-${unidad.numero.replace(/[^a-zA-Z0-9]/g,"-")}-${Date.now()}.pdf`;
    const pdfPath   = path.join(pdfDir, filename);

    const browser = await puppeteer.launch({ args: ["--no-sandbox","--disable-setuid-sandbox"] });
    const page    = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: pdfPath, format: "A4", margin: { top:"20mm",bottom:"20mm",left:"15mm",right:"15mm" } });
    await browser.close();

    res.download(pdfPath, filename, () => {
      // Opcional: borrar el PDF después de servirlo
      // fs.unlinkSync(pdfPath);
    });
  } catch (err) {
    console.error("[reportes/pdf/paz-y-salvo]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

// GET /api/reportes/pdf/estado-cuenta/:unidadId
const pdfEstadoCuenta = async (req, res) => {
  const unidadId = parseInt(req.params.unidadId);
  const cid = req.usuario.copropiedad_id;

  try {
    const [uRes, copRes, factRes] = await Promise.all([
      query(
        `SELECT u.numero, u.tipo, p.nombre+' '+p.apellido AS propietario, p.email
         FROM unidades u
         LEFT JOIN ocupaciones o ON o.unidad_id=u.id AND o.activa=1 AND o.rol='propietario'
         LEFT JOIN personas p ON p.id=o.persona_id
         WHERE u.id=@uid AND u.copropiedad_id=@cid`,
        [{ name:"uid", type:sql.Int, value:unidadId }, { name:"cid", type:sql.Int, value:cid }]
      ),
      query("SELECT * FROM copropiedades WHERE id=@cid", [{ name:"cid", type:sql.Int, value:cid }]),
      query(
        `SELECT f.periodo_anio, f.periodo_mes, f.total AS valor_factura, f.estado,
                ISNULL(pg.pagado,0) AS pagado, f.total - ISNULL(pg.pagado,0) AS saldo,
                f.fecha_vencimiento
         FROM facturas f
         LEFT JOIN (SELECT factura_id, SUM(monto) AS pagado FROM pagos WHERE estado IN ('registrado','verificado') GROUP BY factura_id) pg
             ON pg.factura_id=f.id
         WHERE f.unidad_id=@uid
         ORDER BY f.periodo_anio DESC, f.periodo_mes DESC`,
        [{ name:"uid", type:sql.Int, value:unidadId }]
      ),
    ]);

    if (!uRes.recordset.length)
      return res.status(404).json({ ok:false, msg:"Unidad no encontrada" });

    const unidad  = uRes.recordset[0];
    const cop     = copRes.recordset[0];
    const facturas = factRes.recordset;
    const deudaTotal = facturas.reduce((s,f)=>s+parseFloat(f.saldo),0);

    const filas = facturas.map(f => `
      <tr>
        <td>${f.periodo_anio}-${String(f.periodo_mes).padStart(2,"0")}</td>
        <td>$${parseFloat(f.valor_factura).toLocaleString("es-CO")}</td>
        <td>$${parseFloat(f.pagado).toLocaleString("es-CO")}</td>
        <td style="color:${parseFloat(f.saldo)>0?"#dc2626":"#059669"};font-weight:bold">
          $${parseFloat(f.saldo).toLocaleString("es-CO")}</td>
        <td><span style="background:${f.estado==="pagada"?"#dcfce7":f.estado==="vencida"?"#fee2e2":"#fef9c3"};
            padding:2px 8px;border-radius:10px;font-size:12px">${f.estado}</span></td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<style>
  body { font-family:Arial,sans-serif; margin:40px; color:#1e293b; font-size:13px; }
  .header { display:flex; justify-content:space-between; border-bottom:3px solid #1e40af; padding-bottom:15px; }
  h1 { font-size:18px; color:#1e40af; margin:0; }
  table { width:100%; border-collapse:collapse; margin-top:20px; }
  th { background:#1e40af; color:#fff; padding:8px; text-align:left; font-size:12px; }
  td { padding:7px 10px; border-bottom:1px solid #e2e8f0; }
  tr:nth-child(even) { background:#f8fafc; }
  .resumen { display:flex; gap:20px; margin:20px 0; }
  .card { flex:1; padding:12px; border-radius:8px; text-align:center; }
  .footer { margin-top:30px; font-size:11px; color:#94a3b8; text-align:center; }
</style></head>
<body>
<div class="header">
  <div><h1>${cop.nombre}</h1><div>${cop.direccion||""}</div></div>
  <div style="text-align:right"><strong>ESTADO DE CUENTA</strong><br>
    Unidad: ${unidad.numero}<br>
    Propietario: ${unidad.propietario||"N/D"}<br>
    Fecha: ${new Date().toLocaleDateString("es-CO")}
  </div>
</div>

<div class="resumen">
  <div class="card" style="background:#eff6ff">
    <div style="font-size:22px;font-weight:bold;color:#1e40af">${facturas.length}</div>
    <div>Periodos</div>
  </div>
  <div class="card" style="background:#f0fdf4">
    <div style="font-size:22px;font-weight:bold;color:#059669">
      $${facturas.reduce((s,f)=>s+parseFloat(f.pagado),0).toLocaleString("es-CO")}
    </div>
    <div>Total pagado</div>
  </div>
  <div class="card" style="background:${deudaTotal>0?"#fef2f2":"#f0fdf4"}">
    <div style="font-size:22px;font-weight:bold;color:${deudaTotal>0?"#dc2626":"#059669"}">
      $${deudaTotal.toLocaleString("es-CO")}
    </div>
    <div>Saldo pendiente</div>
  </div>
</div>

<table>
  <thead><tr><th>Periodo</th><th>Valor</th><th>Pagado</th><th>Saldo</th><th>Estado</th></tr></thead>
  <tbody>${filas}</tbody>
</table>

<div class="footer">Generado por PH Inteligente • ${new Date().toLocaleString("es-CO")}</div>
</body></html>`;

    const pdfDir = path.join(process.cwd(), "pdfs");
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
    const filename = `estado-cuenta-${unidad.numero.replace(/[^a-zA-Z0-9]/g,"-")}-${Date.now()}.pdf`;
    const pdfPath  = path.join(pdfDir, filename);

    const browser = await puppeteer.launch({ args:["--no-sandbox","--disable-setuid-sandbox"] });
    const page    = await browser.newPage();
    await page.setContent(html, { waitUntil:"load" });
    await page.pdf({ path:pdfPath, format:"A4", margin:{ top:"15mm",bottom:"15mm",left:"15mm",right:"15mm" } });
    await browser.close();

    res.download(pdfPath, filename);
  } catch (err) {
    console.error("[reportes/pdf/estado-cuenta]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { dashboardKpis, reporteMora, recaudoAnual, estadoCartera, pdfPazYSalvo, pdfEstadoCuenta };
