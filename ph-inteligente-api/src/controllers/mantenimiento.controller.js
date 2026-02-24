// ================================================================
//  mantenimiento.controller.js
// ================================================================
const { query, sql } = require("../models/db");

const getMantenimientos = async (req, res) => {
  const { estado, page=1, limit=20 } = req.query;
  const offset = (page-1)*limit;
  let where = "WHERE m.copropiedad_id=@cid";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  if (estado) { where += " AND m.estado=@est"; params.push({ name:"est", type:sql.NVarChar(15), value:estado }); }
  params.push({ name:"limit",  type:sql.Int, value:parseInt(limit) });
  params.push({ name:"offset", type:sql.Int, value:offset });

  try {
    const r = await query(
      `SELECT m.id, m.descripcion, m.area, m.fecha_programada, m.fecha_ejecucion,
              m.costo_estimado, m.costo_real, m.estado, m.observaciones,
              p.razon_social AS proveedor,
              u.nombre_completo AS responsable
       FROM mantenimientos m
       LEFT JOIN proveedores p ON p.id=m.proveedor_id
       LEFT JOIN usuarios u    ON u.id=m.responsable_id
       ${where}
       ORDER BY m.fecha_programada DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    res.json({ ok:true, data:r.recordset });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const createMantenimiento = async (req, res) => {
  const { proveedor_id, descripcion, area, fecha_programada, costo_estimado, responsable_id, observaciones } = req.body;

  try {
    const r = await query(
      `INSERT INTO mantenimientos (copropiedad_id,proveedor_id,descripcion,area,fecha_programada,costo_estimado,responsable_id,observaciones)
       OUTPUT INSERTED.id, INSERTED.descripcion, INSERTED.estado
       VALUES (@cid,@prov,@desc,@area,@fprog,@cest,@resp,@obs)`,
      [
        { name:"cid",   type:sql.Int,          value:req.usuario.copropiedad_id },
        { name:"prov",  type:sql.Int,          value:proveedor_id ? parseInt(proveedor_id) : null },
        { name:"desc",  type:sql.NVarChar(sql.MAX), value:descripcion },
        { name:"area",  type:sql.NVarChar(80), value:area || null },
        { name:"fprog", type:sql.Date,         value:fecha_programada ? new Date(fecha_programada) : null },
        { name:"cest",  type:sql.Decimal(14,2),value:costo_estimado ? parseFloat(costo_estimado) : null },
        { name:"resp",  type:sql.Int,          value:responsable_id ? parseInt(responsable_id) : req.usuario.id },
        { name:"obs",   type:sql.NVarChar(sql.MAX), value:observaciones || null },
      ]
    );
    res.status(201).json({ ok:true, msg:"Mantenimiento programado", data:r.recordset[0] });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const updateEstadoMantenimiento = async (req, res) => {
  const { estado, costo_real, fecha_ejecucion, observaciones } = req.body;

  try {
    const r = await query(
      `UPDATE mantenimientos
       SET estado=@est, costo_real=ISNULL(@creal,costo_real),
           fecha_ejecucion=ISNULL(@fej,fecha_ejecucion), observaciones=ISNULL(@obs,observaciones)
       OUTPUT INSERTED.id, INSERTED.estado
       WHERE id=@id AND copropiedad_id=@cid`,
      [
        { name:"est",   type:sql.NVarChar(15),      value:estado },
        { name:"creal", type:sql.Decimal(14,2),     value:costo_real ? parseFloat(costo_real) : null },
        { name:"fej",   type:sql.Date,              value:fecha_ejecucion ? new Date(fecha_ejecucion) : null },
        { name:"obs",   type:sql.NVarChar(sql.MAX), value:observaciones || null },
        { name:"id",    type:sql.Int,               value:parseInt(req.params.id) },
        { name:"cid",   type:sql.Int,               value:req.usuario.copropiedad_id },
      ]
    );
    if (!r.recordset.length)
      return res.status(404).json({ ok:false, msg:"Mantenimiento no encontrado" });
    res.json({ ok:true, msg:"Estado actualizado", data:r.recordset[0] });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { getMantenimientos, createMantenimiento, updateEstadoMantenimiento };
