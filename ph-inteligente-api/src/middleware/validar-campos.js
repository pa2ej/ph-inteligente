const { validationResult } = require("express-validator");

const validarCampos = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      ok:     false,
      msg:    "Errores de validacion",
      errors: errors.array().map((e) => ({ campo: e.path, msg: e.msg })),
    });
  }
  next();
};

module.exports = { validarCampos };
