const { query, sql } = require("../models/db");

// POST /api/finanzas/registrar-pago
const registrarPago = async (req, res) => {
  const { unidadId, factura_id, monto, metodo, referencia, banco, notas, fecha_pago } = req.body;

  try {
    // Verificar unidad
    const check = await query(
      "SELECT id FROM unidades WHERE id=@uid AND copropiedad_id=@cid",
      [
        { name:"uid", type:sql.Int, value:parseInt(unidadId) },
        { name:"cid", type:sql.Int, value:req.usuario.copropiedad_id },
      ]
    );
    if (!check.recordset.length)
      return res.status(404).json({ ok:false, msg:"Unidad no encontrada" });

    const r = await query(
      `INSERT INTO pagos
         (copropiedad_id, factura_id, unidad_id, fecha_pago, monto, metodo, referencia, banco, notas, registrado_por)
       OUTPUT INSERTED.*
       VALUES (@cid, @fid, @uid, @fecha, @monto, @metodo, @ref, @banco, @notas, @reg)`,
      [
        { name:"cid",    type:sql.Int,              value:req.usuario.copropiedad_id },
        { name:"fid",    type:sql.Int,              value:factura_id ? parseInt(factura_id) : null },
        { name:"uid",    type:sql.Int,              value:parseInt(unidadId) },
        { name:"fecha",  type:sql.Date,             value:fecha_pago ? new Date(fecha_pago) : new Date() },
        { name:"monto",  type:sql.Decimal(14,2),   value:parseFloat(monto) },
        { name:"metodo", type:sql.NVarChar(20),    value:metodo },
        { name:"ref",    type:sql.NVarChar(100),   value:referencia || null },
        { name:"banco",  type:sql.NVarChar(80),    value:banco || null },
        { name:"notas",  type:sql.NVarChar(sql.MAX), value:notas || null },
        { name:"reg",    type:sql.Int,              value:req.usuario.id },
      ]
    );

    res.status(201).json({
      ok:      true,
      message: `Pago de $${Number(monto).toLocaleString("es-CO")} registrado para unidad ${unidadId}`,
      data:    r.recordset[0],
    });
  } catch (err) {
    console.error("[pagos/registrar]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

// GET /api/finanzas/pagos
const getPagos = async (req, res) => {
  const { unidad_id, fecha_desde, fecha_hasta, metodo, estado, page=1, limit=50 } = req.query;
  const offset = (page - 1) * limit;

  let where = "WHERE p.copropiedad_id = @cid";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  if (unidad_id)   { where += " AND p.unidad_id = @uid";      params.push({ name:"uid",  type:sql.Int,          value:parseInt(unidad_id) }); }
  if (fecha_desde) { where += " AND p.fecha_pago >= @fdesde"; params.push({ name:"fdesde",type:sql.Date,        value:new Date(fecha_desde) }); }
  if (fecha_hasta) { where += " AND p.fecha_pago <= @fhasta"; params.push({ name:"fhasta",type:sql.Date,        value:new Date(fecha_hasta) }); }
  if (metodo)      { where += " AND p.metodo = @metodo";      params.push({ name:"metodo",type:sql.NVarChar(20),value:metodo }); }
  if (estado)      { where += " AND p.estado = @estado";      params.push({ name:"estado",type:sql.NVarChar(15),value:estado }); }

  params.push({ name:"limit",  type:sql.Int, value:parseInt(limit) });
  params.push({ name:"offset", type:sql.Int, value:offset });

  try {
    const r = await query(
      `SELECT p.id, p.fecha_pago, p.monto, p.metodo, p.referencia,
              p.banco, p.estado, p.notas, p.created_at,
              u.numero AS unidad,
              f.periodo_anio, f.periodo_mes,
              usr.nombre_completo AS registrado_por
       FROM pagos p
       JOIN  unidades u ON u.id = p.unidad_id
       LEFT JOIN facturas f ON f.id = p.factura_id
       LEFT JOIN usuarios usr ON usr.id = p.registrado_por
       ${where}
       ORDER BY p.fecha_pago DESC, p.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      params
    );
    res.json({ ok:true, data:r.recordset });
  } catch (err) {
    console.error("[pagos/getPagos]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

// PATCH /api/finanzas/pagos/:id/verificar
const verificarPago = async (req, res) => {
  try {
    const r = await query(
      `UPDATE pagos
       SET estado='verificado', verificado_por=@uid, verificado_en=GETDATE()
       OUTPUT INSERTED.id, INSERTED.estado, INSERTED.monto
       WHERE id=@id AND copropiedad_id=@cid AND estado='registrado'`,
      [
        { name:"uid", type:sql.Int, value:req.usuario.id },
        { name:"id",  type:sql.Int, value:parseInt(req.params.id) },
        { name:"cid", type:sql.Int, value:req.usuario.copropiedad_id },
      ]
    );
    if (!r.recordset.length)
      return res.status(404).json({ ok:false, msg:"Pago no encontrado o ya verificado" });
    res.json({ ok:true, msg:"Pago verificado", data:r.recordset[0] });
  } catch (err) {
    console.error("[pagos/verificar]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { registrarPago, getPagos, verificarPago };
