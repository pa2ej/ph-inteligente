const { query, execSP, sql } = require("../models/db");

// POST /api/finanzas/generar-mensual
const generarMensual = async (req, res) => {
  const { anio, mes, valorBaseAdmin, metodo } = req.body;

  try {
    const r = await execSP("sp_generar_facturacion_mensual", [
      { name: "copropiedad_id", type: sql.Int,          value: req.usuario.copropiedad_id },
      { name: "anio",           type: sql.SmallInt,     value: parseInt(anio) },
      { name: "mes",            type: sql.SmallInt,     value: parseInt(mes) },
      { name: "valor_base",     type: sql.Decimal(14,2),value: parseFloat(valorBaseAdmin) },
      { name: "metodo",         type: sql.NVarChar(15), value: metodo },
      { name: "dias_venc",      type: sql.Int,          value: 20 },
      { name: "usuario_id",     type: sql.Int,          value: req.usuario.id },
    ]);

    const row = r.recordset[0];
    res.status(201).json({
      ok: true,
      message: `Facturacion ${anio}-${String(mes).padStart(2,"0")} completada: ${row.total_generadas} generadas, ${row.total_omitidas} omitidas`,
      data: row,
    });
  } catch (err) {
    console.error("[facturacion/generar-mensual]", err.message);
    res.status(500).json({ ok: false, msg: err.message });
  }
};

// GET /api/finanzas/facturas
const getFacturas = async (req, res) => {
  const { anio, mes, estado, unidad_id, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  let where  = "WHERE f.copropiedad_id = @cid";
  const params = [{ name: "cid", type: sql.Int, value: req.usuario.copropiedad_id }];

  if (anio)      { where += " AND f.periodo_anio = @anio";  params.push({ name:"anio",     type:sql.SmallInt,    value:parseInt(anio) }); }
  if (mes)       { where += " AND f.periodo_mes = @mes";    params.push({ name:"mes",      type:sql.SmallInt,    value:parseInt(mes) }); }
  if (estado)    { where += " AND f.estado = @estado";      params.push({ name:"estado",   type:sql.NVarChar(15),value:estado }); }
  if (unidad_id) { where += " AND f.unidad_id = @uid";      params.push({ name:"uid",      type:sql.Int,         value:parseInt(unidad_id) }); }

  params.push({ name:"limit",  type:sql.Int, value:parseInt(limit) });
  params.push({ name:"offset", type:sql.Int, value:offset });

  try {
    const sqlText = `
      SELECT f.id, f.periodo_anio, f.periodo_mes, f.fecha_emision, f.fecha_vencimiento,
             f.valor_admin, f.valor_extra, f.valor_mora, f.descuento, f.total,
             f.estado, f.notas,
             u.numero AS unidad, u.tipo AS tipo_unidad,
             p.nombre + ' ' + p.apellido AS propietario,
             ISNULL(pg.pagado,0) AS total_pagado,
             f.total - ISNULL(pg.pagado,0) AS saldo
      FROM facturas f
      JOIN unidades u ON u.id = f.unidad_id
      LEFT JOIN ocupaciones o ON o.unidad_id = u.id AND o.activa=1 AND o.rol='propietario'
      LEFT JOIN personas p    ON p.id = o.persona_id
      LEFT JOIN (SELECT factura_id, SUM(monto) AS pagado FROM pagos
                 WHERE estado IN ('registrado','verificado') GROUP BY factura_id) pg
             ON pg.factura_id = f.id
      ${where}
      ORDER BY u.numero, f.periodo_anio DESC, f.periodo_mes DESC
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `;
    const r = await query(sqlText, params);
    res.json({ ok: true, page: parseInt(page), data: r.recordset });
  } catch (err) {
    console.error("[facturacion/getFacturas]", err.message);
    res.status(500).json({ ok: false, msg: err.message });
  }
};

// GET /api/finanzas/resumen
const getResumen = async (req, res) => {
  const { anio, mes } = req.query;
  let where = "WHERE copropiedad_id = @cid";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  if (anio) { where += " AND periodo_anio = @anio"; params.push({ name:"anio", type:sql.SmallInt, value:parseInt(anio) }); }
  if (mes)  { where += " AND periodo_mes = @mes";   params.push({ name:"mes",  type:sql.SmallInt, value:parseInt(mes) }); }

  try {
    const r = await query(
      `SELECT TOP 12 * FROM v_resumen_mensual ${where} ORDER BY periodo_anio DESC, periodo_mes DESC`,
      params
    );
    res.json({ ok: true, data: r.recordset });
  } catch (err) {
    console.error("[facturacion/resumen]", err.message);
    res.status(500).json({ ok: false, msg: err.message });
  }
};

// PATCH /api/finanzas/facturas/:id/anular
const anularFactura = async (req, res) => {
  const { motivo } = req.body;

  try {
    const r = await query(
      `UPDATE facturas
       SET estado='anulada', anulada_por=@uid, anulada_en=GETDATE(), motivo_anulacion=@motivo
       OUTPUT INSERTED.id, INSERTED.estado
       WHERE id=@id AND copropiedad_id=@cid AND estado != 'anulada'`,
      [
        { name:"uid",    type:sql.Int,          value:req.usuario.id },
        { name:"motivo", type:sql.NVarChar(sql.MAX), value:motivo },
        { name:"id",     type:sql.Int,          value:parseInt(req.params.id) },
        { name:"cid",    type:sql.Int,          value:req.usuario.copropiedad_id },
      ]
    );

    if (!r.recordset.length)
      return res.status(404).json({ ok:false, msg:"Factura no encontrada o ya anulada" });

    res.json({ ok:true, msg:"Factura anulada", data:r.recordset[0] });
  } catch (err) {
    console.error("[facturacion/anular]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { generarMensual, getFacturas, getResumen, anularFactura };
