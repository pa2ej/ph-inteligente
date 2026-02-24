const { query, sql } = require("../models/db");

const getUnidades = async (req, res) => {
  const { tipo, activa="true", torre_id } = req.query;
  let where = "WHERE u.copropiedad_id = @cid";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  where += ` AND u.activa = ${activa === "true" ? 1 : 0}`;
  if (tipo)     { where += " AND u.tipo = @tipo";       params.push({ name:"tipo",    type:sql.NVarChar(30), value:tipo }); }
  if (torre_id) { where += " AND u.torre_id = @torrid"; params.push({ name:"torrid",  type:sql.Int,          value:parseInt(torre_id) }); }

  try {
    const r = await query(
      `SELECT u.id, u.numero, u.piso, u.tipo, u.area_m2, u.coeficiente, u.activa, u.observaciones,
              t.nombre AS torre,
              p.nombre + ' ' + p.apellido AS propietario,
              p.telefono AS tel_propietario, p.email AS email_propietario, o.rol AS rol_ocupante,
              ISNULL(f_act.estado, 'sin_factura') AS estado_factura_actual
       FROM unidades u
       LEFT JOIN torres t ON t.id = u.torre_id
       LEFT JOIN ocupaciones o   ON o.unidad_id=u.id AND o.activa=1 AND o.rol='propietario'
       LEFT JOIN personas p      ON p.id=o.persona_id
       LEFT JOIN facturas f_act  ON f_act.unidad_id=u.id
             AND f_act.periodo_anio=YEAR(GETDATE())
             AND f_act.periodo_mes=MONTH(GETDATE())
       ${where}
       ORDER BY u.piso, u.numero`,
      params
    );
    res.json({ ok:true, total:r.recordset.length, data:r.recordset });
  } catch (err) {
    console.error("[unidades/getAll]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const getUnidadById = async (req, res) => {
  try {
    const r = await query(
      `SELECT u.*, t.nombre AS torre FROM unidades u
       LEFT JOIN torres t ON t.id = u.torre_id
       WHERE u.id=@id AND u.copropiedad_id=@cid`,
      [
        { name:"id",  type:sql.Int, value:parseInt(req.params.id) },
        { name:"cid", type:sql.Int, value:req.usuario.copropiedad_id },
      ]
    );
    if (!r.recordset.length)
      return res.status(404).json({ ok:false, msg:"Unidad no encontrada" });

    const ocup = await query(
      `SELECT o.rol, o.fecha_inicio, o.fecha_fin,
              p.id AS persona_id, p.nombre+' '+p.apellido AS nombre,
              p.tipo_doc, p.num_doc, p.telefono, p.email
       FROM ocupaciones o JOIN personas p ON p.id=o.persona_id
       WHERE o.unidad_id=@id AND o.activa=1`,
      [{ name:"id", type:sql.Int, value:parseInt(req.params.id) }]
    );

    res.json({ ok:true, data:{ ...r.recordset[0], ocupantes:ocup.recordset } });
  } catch (err) {
    console.error("[unidades/getById]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const createUnidad = async (req, res) => {
  const { numero, piso, tipo="apartamento", area_m2, coeficiente, torre_id, observaciones } = req.body;

  try {
    const r = await query(
      `INSERT INTO unidades (copropiedad_id, torre_id, numero, piso, tipo, area_m2, coeficiente, observaciones)
       OUTPUT INSERTED.*
       VALUES (@cid, @torrid, @num, @piso, @tipo, @am2, @coef, @obs)`,
      [
        { name:"cid",    type:sql.Int,           value:req.usuario.copropiedad_id },
        { name:"torrid", type:sql.Int,           value:torre_id ? parseInt(torre_id) : null },
        { name:"num",    type:sql.NVarChar(20),  value:numero },
        { name:"piso",   type:sql.SmallInt,      value:piso ? parseInt(piso) : null },
        { name:"tipo",   type:sql.NVarChar(30),  value:tipo },
        { name:"am2",    type:sql.Decimal(8,2),  value:area_m2 ? parseFloat(area_m2) : null },
        { name:"coef",   type:sql.Decimal(10,6), value:coeficiente ? parseFloat(coeficiente) : null },
        { name:"obs",    type:sql.NVarChar(sql.MAX), value:observaciones || null },
      ]
    );
    res.status(201).json({ ok:true, msg:"Unidad creada", data:r.recordset[0] });
  } catch (err) {
    if (err.number === 2627 || err.number === 2601)
      return res.status(409).json({ ok:false, msg:`Ya existe la unidad ${numero}` });
    console.error("[unidades/create]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const updateUnidad = async (req, res) => {
  const { numero, piso, tipo, area_m2, coeficiente, observaciones, activa } = req.body;

  try {
    const sets = [];
    const params = [
      { name:"id",  type:sql.Int, value:parseInt(req.params.id) },
      { name:"cid", type:sql.Int, value:req.usuario.copropiedad_id },
    ];

    if (numero      !== undefined) { sets.push("numero=@num");       params.push({ name:"num",  type:sql.NVarChar(20),  value:numero }); }
    if (piso        !== undefined) { sets.push("piso=@piso");        params.push({ name:"piso", type:sql.SmallInt,      value:parseInt(piso) }); }
    if (tipo        !== undefined) { sets.push("tipo=@tipo");        params.push({ name:"tipo", type:sql.NVarChar(30),  value:tipo }); }
    if (area_m2     !== undefined) { sets.push("area_m2=@am2");     params.push({ name:"am2",  type:sql.Decimal(8,2),  value:parseFloat(area_m2) }); }
    if (coeficiente !== undefined) { sets.push("coeficiente=@coef"); params.push({ name:"coef", type:sql.Decimal(10,6), value:parseFloat(coeficiente) }); }
    if (observaciones!== undefined){ sets.push("observaciones=@obs");params.push({ name:"obs",  type:sql.NVarChar(sql.MAX), value:observaciones }); }
    if (activa      !== undefined) { sets.push("activa=@activa");    params.push({ name:"activa",type:sql.Bit,          value:activa ? 1 : 0 }); }

    if (!sets.length)
      return res.status(400).json({ ok:false, msg:"No hay campos para actualizar" });

    const r = await query(
      `UPDATE unidades SET ${sets.join(",")} OUTPUT INSERTED.*
       WHERE id=@id AND copropiedad_id=@cid`,
      params
    );

    if (!r.recordset.length)
      return res.status(404).json({ ok:false, msg:"Unidad no encontrada" });

    res.json({ ok:true, msg:"Unidad actualizada", data:r.recordset[0] });
  } catch (err) {
    console.error("[unidades/update]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { getUnidades, getUnidadById, createUnidad, updateUnidad };
