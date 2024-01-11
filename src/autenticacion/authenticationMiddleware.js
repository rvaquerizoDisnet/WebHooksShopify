// authenticationMiddleware.js
const jwt = require('jsonwebtoken');

const generarToken = (usuario) => {
  const horaActual = new Date();
  const horaExpiracion = new Date(horaActual);
  horaExpiracion.setHours(horaActual.getHours() + 1); // Expira en 1 hora

  const token = jwt.sign({ usuario, exp: Math.floor(horaExpiracion.getTime() / 1000) }, process.env.JWT_SECRET);
  return token;
};

const verificarToken = (req, res, next) => {
  const token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ mensaje: 'Acceso no autorizado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded.usuario;
    next();
  } catch (error) {
    res.status(401).json({ mensaje: 'Token no válido.' });
  }
};

module.exports = { generarToken, verificarToken };
