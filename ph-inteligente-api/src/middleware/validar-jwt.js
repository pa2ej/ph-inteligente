// ================================================================
//  src/middleware/validar-jwt.js
// ================================================================
const jwt = require("jsonwebtoken");

const validarJWT = (req, res, next) => {
  const token = req.header("x-token");
  if (!token) {
    return res.status(401).json({ ok: false, msg: "No hay token en la peticion" });
  }
  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ ok: false, msg: "Token invalido o expirado" });
  }
};

const validarRol = (...roles) => (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ ok: false, msg: "Token requerido" });
  }
  if (!roles.includes(req.usuario.rol)) {
    return res.status(403).json({
      ok:  false,
      msg: `Acceso denegado. Rol requerido: ${roles.join(" | ")}`,
    });
  }
  next();
};

module.exports = { validarJWT, validarRol };
