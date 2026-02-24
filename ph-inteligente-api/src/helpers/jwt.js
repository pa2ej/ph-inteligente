const jwt = require("jsonwebtoken");

const generarJWT = (payload) =>
  new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
      (err, token) => {
        if (err) reject(new Error("No se pudo generar el token: " + err.message));
        else resolve(token);
      }
    );
  });

module.exports = { generarJWT };
