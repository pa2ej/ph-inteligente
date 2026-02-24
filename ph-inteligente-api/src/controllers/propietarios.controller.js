const { query, sql, getPool } = require("../models/db");
const mssql = require("mssql");

const getPropietarios = async (req, res) => {
  const { buscar } = req.query;
  let where = "WHERE u.copropiedad_id=@cid AND p.activa=1";
  const params = [{ name:"cid", type:sql.Int, value:req.usuario.copropiedad_id }];

  if (buscar) {
    where += " AND (p.nombre LIKE @b OR p.apellido LIKE @b OR p.num_doc LIKE @b OR p.email LIKE @b)";
    params.push({ name:"b", type:sql.NVarChar(100), value:`%${buscar}%` });
  }

  try {
    const r = await query(
      `SELECT DISTINCT p.id, p.tipo_doc, p.num_doc, p.nombre, p.apellido,
              p.nombre + ' ' + p.apellido AS nombre_completo,
              p.telefono, p.telefono2, p.email, p.activa,
              STRING_AGG(u.numero + ' (' + o.rol + ')', ', ') AS unidades
       FROM personas p
       JOIN ocupaciones o ON o.persona_id=p.id AND o.activa=1
       JOIN unidades u    ON u.id=o.unidad_id
       ${where}
       GROUP BY p.id, p.tipo_doc, p.num_doc, p.nombre, p.apellido,
                p.telefono, p.telefono2, p.email, p.activa
       ORDER BY p.apellido, p.nombre`, params
    );
    res.json({ ok:true, total:r.recordset.length, data:r.recordset });
  } catch (err) {
    console.error("[propietarios/getAll]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const getPropietarioById = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const pRes = await query("SELECT * FROM personas WHERE id=@id", [{ name:"id", type:sql.Int, value:id }]);
    const uRes = await query(
      `SELECT u.id, u.numero, u.tipo, u.piso, o.rol, o.fecha_inicio
       FROM ocupaciones o JOIN unidades u ON u.id=o.unidad_id
       WHERE o.persona_id=@id AND o.activa=1`,
      [{ name:"id", type:sql.Int, value:id }]
    );
    if (!pRes.recordset.length)
      return res.status(404).json({ ok:false, msg:"Propietario no encontrado" });
    res.json({ ok:true, data:{ ...pRes.recordset[0], unidades:uRes.recordset } });
  } catch (err) {
    console.error("[propietarios/getById]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const createPropietario = async (req, res) => {
  const { tipo_doc="CC", num_doc, nombre, apellido, telefono, telefono2, email, direccion, unidad_id, rol="propietario" } = req.body;
  const pool        = await getPool();
  const transaction = new mssql.Transaction(pool);

  try {
    await transaction.begin();

    // 1. Crear persona
    const r1 = new mssql.Request(transaction);
    r1.input("tdoc", sql.NVarChar(5),        tipo_doc);
    r1.input("ndoc", sql.NVarChar(20),       num_doc);
    r1.input("nom",  sql.NVarChar(60),       nombre);
    r1.input("ape",  sql.NVarChar(60),       apellido);
    r1.input("tel",  sql.NVarChar(20),       telefono  || null);
    r1.input("tel2", sql.NVarChar(20),       telefono2 || null);
    r1.input("mail", sql.NVarChar(100),      email     || null);
    r1.input("dir",  sql.NVarChar(sql.MAX),  direccion || null);
    const pRes = await r1.query(
      `INSERT INTO personas (tipo_doc,num_doc,nombre,apellido,telefono,telefono2,email,direccion)
       OUTPUT INSERTED.id VALUES (@tdoc,@ndoc,@nom,@ape,@tel,@tel2,@mail,@dir)`
    );
    const personaId = pRes.recordset[0].id;

    // 2. Asignar a unidad
    if (unidad_id) {
      const r2 = new mssql.Request(transaction);
      r2.input("uid", sql.Int,          parseInt(unidad_id));
      r2.input("pid", sql.Int,          personaId);
      r2.input("rol", sql.NVarChar(20), rol);
      await r2.query(
        "INSERT INTO ocupaciones (unidad_id,persona_id,rol,fecha_inicio) VALUES (@uid,@pid,@rol,CAST(GETDATE() AS DATE))"
      );
    }

    await transaction.commit();
    res.status(201).json({ ok:true, msg:"Propietario registrado", data:{ id:personaId } });
  } catch (err) {
    await transaction.rollback().catch(()=>{});
    if (err.number === 2627 || err.number === 2601)
      return res.status(409).json({ ok:false, msg:"Ya existe una persona con ese documento" });
    console.error("[propietarios/create]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

const updatePropietario = async (req, res) => {
  const { nombre, apellido, telefono, telefono2, email, direccion } = req.body;
  const id = parseInt(req.params.id);
  const sets = [];
  const params = [{ name:"id", type:sql.Int, value:id }];

  if (nombre    !== undefined) { sets.push("nombre=@nom");    params.push({ name:"nom",  type:sql.NVarChar(60),       value:nombre }); }
  if (apellido  !== undefined) { sets.push("apellido=@ape");  params.push({ name:"ape",  type:sql.NVarChar(60),       value:apellido }); }
  if (telefono  !== undefined) { sets.push("telefono=@tel");  params.push({ name:"tel",  type:sql.NVarChar(20),       value:telefono }); }
  if (telefono2 !== undefined) { sets.push("telefono2=@tel2");params.push({ name:"tel2", type:sql.NVarChar(20),       value:telefono2 }); }
  if (email     !== undefined) { sets.push("email=@mail");    params.push({ name:"mail", type:sql.NVarChar(100),      value:email }); }
  if (direccion !== undefined) { sets.push("direccion=@dir"); params.push({ name:"dir",  type:sql.NVarChar(sql.MAX),  value:direccion }); }

  if (!sets.length) return res.status(400).json({ ok:false, msg:"Nada que actualizar" });

  try {
    const r = await query(
      `UPDATE personas SET ${sets.join(",")} OUTPUT INSERTED.id, INSERTED.nombre, INSERTED.apellido WHERE id=@id`,
      params
    );
    if (!r.recordset.length)
      return res.status(404).json({ ok:false, msg:"Propietario no encontrado" });
    res.json({ ok:true, msg:"Actualizado", data:r.recordset[0] });
  } catch (err) {
    console.error("[propietarios/update]", err.message);
    res.status(500).json({ ok:false, msg:err.message });
  }
};

module.exports = { getPropietarios, getPropietarioById, createPropietario, updatePropietario };
