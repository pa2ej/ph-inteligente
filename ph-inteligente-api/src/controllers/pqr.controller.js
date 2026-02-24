const { query, sql } = require("../models/db");

const getPqr = async (req, res) => {
  const { estado, tipo, prioridad, page=1, limit=20 } = req.query;
  const offset = (page-1)*limit;
  let where = "WHERE pqr.copropiedad_id=@cid";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  if (estado)    { where += " AND pqr.estado=@est";    params.push({ name:"est",  type:sql.NVarChar(20), value:estado }); }
  if (tipo)      { where += " AND pqr.tipo=@tipo";     params.push({ name:"tipo", type:sql.NVarChar(30), value:tipo }); }
  if (prioridad) { where += " AND pqr.prioridad=@prio";params.push({ name:"prio", type:sql.SmallInt,     value:parseInt(prioridad) }); }
  params.push({ name:"limit",  type:sql.Int, value:parseInt(limit)  });
  params.push({ name:"offset", type:sql.Int, value:offset });

  try {
    const r = await query(
      `SELECT pqr.id, pqr.tipo, pqr.asunto, pqr.descripcion, pqr.estado, pqr.prioridad,
              pqr.fecha_limite, pqr.created_at, pqr.respuesta, pqr.respondido_en,
              u.numero AS unidad, p.nombre+' '+p.apellido AS solicitante,
              usr.nombre_completo AS asignado_a
       FROM pqr
       LEFT JOIN unidades u  ON u.id=pqr.unidad_id
       LEFT JOIN personas p  ON p.id=pqr.persona_id
       LEFT JOIN usuarios usr ON usr.id=pqr.asignado_a
       ${where}
       ORDER BY pqr.prioridad ASC, pqr.created_at DESC
       OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`, params
    );
    res.json({ ok:true, data:r.recordset });
  } catch (err) {
    console.error("[pqr/getAll]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const createPqr = async (req, res) => {
  const { tipo, asunto, descripcion, unidad_id, persona_id, prioridad=2, fecha_limite, anonimo=false } = req.body;

  try {
    const r = await query(
      `INSERT INTO pqr (copropiedad_id, tipo, asunto, descripcion, unidad_id, persona_id, prioridad, fecha_limite, anonimo)
       OUTPUT INSERTED.id, INSERTED.tipo, INSERTED.asunto, INSERTED.estado
       VALUES (@cid,@tipo,@asunto,@desc,@uid,@pid,@prio,@flim,@anon)`,
      [
        { name:"cid",   type:sql.Int,          value:req.usuario.copropiedad_id },
        { name:"tipo",  type:sql.NVarChar(30), value:tipo },
        { name:"asunto",type:sql.NVarChar(200),value:asunto },
        { name:"desc",  type:sql.NVarChar(sql.MAX), value:descripcion },
        { name:"uid",   type:sql.Int,          value:unidad_id ? parseInt(unidad_id) : null },
        { name:"pid",   type:sql.Int,          value:persona_id ? parseInt(persona_id) : null },
        { name:"prio",  type:sql.SmallInt,     value:parseInt(prioridad) },
        { name:"flim",  type:sql.Date,         value:fecha_limite ? new Date(fecha_limite) : null },
        { name:"anon",  type:sql.Bit,          value:anonimo ? 1 : 0 },
      ]
    );
    res.status(201).json({ ok:true, msg:"PQR creada", data:r.recordset[0] });
  } catch (err) {
    console.error("[pqr/create]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const responderPqr = async (req, res) => {
  const { respuesta, estado="respondido" } = req.body;

  try {
    const r = await query(
      `UPDATE pqr SET respuesta=@resp, estado=@est, respondido_por=@uid, respondido_en=GETDATE()
       OUTPUT INSERTED.id, INSERTED.asunto, INSERTED.estado
       WHERE id=@id AND copropiedad_id=@cid`,
      [
        { name:"resp", type:sql.NVarChar(sql.MAX), value:respuesta },
        { name:"est",  type:sql.NVarChar(20),      value:estado },
        { name:"uid",  type:sql.Int,               value:req.usuario.id },
        { name:"id",   type:sql.Int,               value:parseInt(req.params.id) },
        { name:"cid",  type:sql.Int,               value:req.usuario.copropiedad_id },
      ]
    );
    if (!r.recordset.length)
      return res.status(404).json({ ok:false, msg:"PQR no encontrada" });
    res.json({ ok:true, msg:"PQR respondida", data:r.recordset[0] });
  } catch (err) {
    console.error("[pqr/responder]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { getPqr, createPqr, responderPqr };
