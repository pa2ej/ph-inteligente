const { query, sql } = require("../models/db");

const getEgresos = async (req, res) => {
  const { fecha_desde, fecha_hasta, page=1, limit=30 } = req.query;
  const offset = (page-1)*limit;
  let where = "WHERE e.copropiedad_id=@cid";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  if (fecha_desde) { where += " AND e.fecha>=@fd"; params.push({ name:"fd", type:sql.Date, value:new Date(fecha_desde) }); }
  if (fecha_hasta) { where += " AND e.fecha<=@fh"; params.push({ name:"fh", type:sql.Date, value:new Date(fecha_hasta) }); }
  params.push({ name:"limit",  type:sql.Int, value:parseInt(limit) });
  params.push({ name:"offset", type:sql.Int, value:offset });

  try {
    const r = await query(
      `SELECT e.id, e.concepto, e.fecha, e.monto, e.metodo_pago, e.referencia,
              p.rubro AS presupuesto, pr.razon_social AS proveedor,
              u.nombre_completo AS aprobado_por
       FROM egresos e
       LEFT JOIN presupuestos p  ON p.id=e.presupuesto_id
       LEFT JOIN proveedores pr  ON pr.id=e.proveedor_id
       LEFT JOIN usuarios u      ON u.id=e.aprobado_por
       ${where}
       ORDER BY e.fecha DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );

    const totalR = await query(
      "SELECT ISNULL(SUM(monto),0) AS total FROM egresos WHERE copropiedad_id=@cid",
      [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }]
    );

    res.json({ ok:true, total_egresos:parseFloat(totalR.recordset[0].total), data:r.recordset });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const createEgreso = async (req, res) => {
  const { presupuesto_id, proveedor_id, concepto, fecha, monto, metodo_pago="transferencia", referencia } = req.body;

  try {
    const r = await query(
      `INSERT INTO egresos (copropiedad_id,presupuesto_id,proveedor_id,concepto,fecha,monto,metodo_pago,referencia,aprobado_por)
       OUTPUT INSERTED.id, INSERTED.concepto, INSERTED.monto
       VALUES (@cid,@presid,@provid,@conc,@fecha,@monto,@met,@ref,@uid)`,
      [
        { name:"cid",    type:sql.Int,          value:req.usuario.copropiedad_id },
        { name:"presid", type:sql.Int,          value:presupuesto_id ? parseInt(presupuesto_id) : null },
        { name:"provid", type:sql.Int,          value:proveedor_id ? parseInt(proveedor_id) : null },
        { name:"conc",   type:sql.NVarChar(200),value:concepto },
        { name:"fecha",  type:sql.Date,         value:fecha ? new Date(fecha) : new Date() },
        { name:"monto",  type:sql.Decimal(14,2),value:parseFloat(monto) },
        { name:"met",    type:sql.NVarChar(20), value:metodo_pago },
        { name:"ref",    type:sql.NVarChar(100),value:referencia || null },
        { name:"uid",    type:sql.Int,          value:req.usuario.id },
      ]
    );
    res.status(201).json({ ok:true, msg:"Egreso registrado", data:r.recordset[0] });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { getEgresos, createEgreso };
