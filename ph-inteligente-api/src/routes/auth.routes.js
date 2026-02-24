// ================================================================
//  routes/auth.routes.js
// ================================================================
const router = require("express").Router();
const { body } = require("express-validator");
const { login, verify, cambiarPassword } = require("../controllers/auth.controller");
const { validarJWT }    = require("../middleware/validar-jwt");
const { validarCampos } = require("../middleware/validar-campos");

router.post("/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty(), validarCampos],
  login
);
router.get("/verify", validarJWT, verify);
router.post("/cambiar-password",
  validarJWT,
  [body("password_actual").notEmpty(), body("password_nuevo").isLength({min:8}), validarCampos],
  cambiarPassword
);

module.exports = router;
