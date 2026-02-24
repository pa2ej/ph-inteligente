// ================================================================
//  reservas.controller.js
// ================================================================
const { query, sql } = require("../models/db");

const getAreas = async (req, res) => {
  try {
    const r = await query(
      "SELECT * FROM areas_comunes WHERE copropiedad_id=@cid AND activa=1 ORDER BY nombre",
      [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }]
    );
    res.json({ ok:true, data:r.recordset });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const getReservas = async (req, res) => {
  const { area_id, fecha_desde, fecha_hasta, estado } = req.query;
  let where = "WHERE ac.copropiedad_id=@cid";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  if (area_id)     { where += " AND r.area_id=@aid";      params.push({ name:"aid",    type:sql.Int,   value:parseInt(area_id) }); }
  if (fecha_desde) { where += " AND r.fecha_inicio>=@fd"; params.push({ name:"fd",     type:sql.DateTime2, value:new Date(fecha_desde) }); }
  if (fecha_hasta) { where += " AND r.fecha_fin<=@fh";    params.push({ name:"fh",     type:sql.DateTime2, value:new Date(fecha_hasta) }); }
  if (estado)      { where += " AND r.estado=@est";       params.push({ name:"est",    type:sql.NVarChar(15), value:estado }); }

  try {
    const r = await query(
      `SELECT r.id, r.fecha_inicio, r.fecha_fin, r.estado, r.motivo, r.asistentes,
              r.valor_cobrado, r.notas,
              ac.nombre AS area,
              u.numero  AS unidad,
              p.nombre+' '+p.apellido AS solicitante
       FROM reservas r
       JOIN areas_comunes ac ON ac.id=r.area_id
       JOIN unidades u       ON u.id=r.unidad_id
       LEFT JOIN personas p  ON p.id=r.persona_id
       ${where}
       ORDER BY r.fecha_inicio`, params
    );
    res.json({ ok:true, data:r.recordset });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const createReserva = async (req, res) => {
  const { area_id, unidad_id, persona_id, fecha_inicio, fecha_fin, motivo, asistentes } = req.body;

  try {
    // Verificar conflicto de horario
    const conf = await query(
      `SELECT id FROM reservas
       WHERE area_id=@aid AND estado IN ('solicitada','aprobada')
         AND fecha_inicio < @fin AND fecha_fin > @fini`,
      [
        { name:"aid",  type:sql.Int,       value:parseInt(area_id) },
        { name:"fini", type:sql.DateTime2, value:new Date(fecha_inicio) },
        { name:"fin",  type:sql.DateTime2, value:new Date(fecha_fin) },
      ]
    );
    if (conf.recordset.length)
      return res.status(409).json({ ok:false, msg:"El area ya esta reservada en ese horario" });

    const r = await query(
      `INSERT INTO reservas (area_id,unidad_id,persona_id,fecha_inicio,fecha_fin,motivo,asistentes)
       OUTPUT INSERTED.id, INSERTED.estado
       VALUES (@aid,@uid,@pid,@fini,@fin,@mot,@asi)`,
      [
        { name:"aid",  type:sql.Int,       value:parseInt(area_id) },
        { name:"uid",  type:sql.Int,       value:parseInt(unidad_id) },
        { name:"pid",  type:sql.Int,       value:persona_id ? parseInt(persona_id) : null },
        { name:"fini", type:sql.DateTime2, value:new Date(fecha_inicio) },
        { name:"fin",  type:sql.DateTime2, value:new Date(fecha_fin) },
        { name:"mot",  type:sql.NVarChar(200), value:motivo || null },
        { name:"asi",  type:sql.SmallInt,  value:asistentes ? parseInt(asistentes) : null },
      ]
    );
    res.status(201).json({ ok:true, msg:"Reserva solicitada", data:r.recordset[0] });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const cambiarEstado = async (req, res) => {
  const { estado, notas } = req.body;

  try {
    const r = await query(
      `UPDATE reservas SET estado=@est, notas=ISNULL(@notas,notas), aprobado_por=@uid
       OUTPUT INSERTED.id, INSERTED.estado
       WHERE id=@id`,
      [
        { name:"est",   type:sql.NVarChar(15), value:estado },
        { name:"notas", type:sql.NVarChar(sql.MAX), value:notas || null },
        { name:"uid",   type:sql.Int,          value:req.usuario.id },
        { name:"id",    type:sql.Int,          value:parseInt(req.params.id) },
      ]
    );
    if (!r.recordset.length)
      return res.status(404).json({ ok:false, msg:"Reserva no encontrada" });
    res.json({ ok:true, msg:`Reserva ${estado}`, data:r.recordset[0] });
  } catch (err) {
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { getAreas, getReservas, createReserva, cambiarEstado };
