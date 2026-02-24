const bcrypt         = require("bcryptjs");
const { query, sql } = require("../models/db");
const { generarJWT } = require("../helpers/jwt");

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const r = await query(
      `SELECT u.id, u.copropiedad_id, u.nombre_completo, u.email,
              u.password_hash, u.cargo, u.rol, u.activo,
              c.nombre AS nombre_ph
       FROM usuarios u
       JOIN copropiedades c ON c.id = u.copropiedad_id
       WHERE u.email = @email`,
      [{ name: "email", type: sql.NVarChar(100), value: email.toLowerCase().trim() }]
    );

    if (!r.recordset.length || !r.recordset[0].activo) {
      return res.status(401).json({ ok: false, msg: "Credenciales incorrectas" });
    }

    const usuario = r.recordset[0];
    const ok      = await bcrypt.compare(password, usuario.password_hash);
    if (!ok) return res.status(401).json({ ok: false, msg: "Credenciales incorrectas" });

    await query(
      "UPDATE usuarios SET ultimo_acceso = GETDATE() WHERE id = @id",
      [{ name: "id", type: sql.Int, value: usuario.id }]
    );

    const token = await generarJWT({
      id:             usuario.id,
      email:          usuario.email,
      rol:            usuario.rol,
      copropiedad_id: usuario.copropiedad_id,
    });

    res.json({
      ok: true,
      token,
      user: {
        id:              usuario.id,
        nombre_completo: usuario.nombre_completo,
        cargo:           usuario.cargo,
        rol:             usuario.rol,
        nombre_ph:       usuario.nombre_ph,
        copropiedad_id:  usuario.copropiedad_id,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err.message);
    res.status(500).json({ ok: false, msg: "Error interno" });
  }
};

// GET /api/auth/verify
const verify = async (req, res) => {
  try {
    const r = await query(
      `SELECT u.id, u.nombre_completo, u.cargo, u.rol, c.nombre AS nombre_ph
       FROM usuarios u JOIN copropiedades c ON c.id = u.copropiedad_id
       WHERE u.id = @id AND u.activo = 1`,
      [{ name: "id", type: sql.Int, value: req.usuario.id }]
    );

    if (!r.recordset.length) {
      return res.status(401).json({ ok: false, msg: "Usuario no encontrado" });
    }

    const token = await generarJWT({
      id:             r.recordset[0].id,
      email:          req.usuario.email,
      rol:            r.recordset[0].rol,
      copropiedad_id: req.usuario.copropiedad_id,
    });

    res.json({ ok: true, token, user: r.recordset[0] });
  } catch (err) {
    console.error("[auth/verify]", err.message);
    res.status(500).json({ ok: false, msg: "Error interno" });
  }
};

// POST /api/auth/cambiar-password
const cambiarPassword = async (req, res) => {
  const { password_actual, password_nuevo } = req.body;

  try {
    const r = await query(
      "SELECT password_hash FROM usuarios WHERE id = @id",
      [{ name: "id", type: sql.Int, value: req.usuario.id }]
    );

    const ok = await bcrypt.compare(password_actual, r.recordset[0].password_hash);
    if (!ok) return res.status(400).json({ ok: false, msg: "Contrasena actual incorrecta" });

    const nuevoHash = await bcrypt.hash(password_nuevo, 10);
    await query(
      "UPDATE usuarios SET password_hash = @hash WHERE id = @id",
      [
        { name: "hash", type: sql.NVarChar(sql.MAX), value: nuevoHash },
        { name: "id",   type: sql.Int,               value: req.usuario.id },
      ]
    );

    res.json({ ok: true, msg: "Contrasena actualizada correctamente" });
  } catch (err) {
    console.error("[auth/cambiar-password]", err.message);
    res.status(500).json({ ok: false, msg: "Error interno" });
  }
};

module.exports = { login, verify, cambiarPassword };
