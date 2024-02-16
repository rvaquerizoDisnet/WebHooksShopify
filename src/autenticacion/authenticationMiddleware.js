// authenticationMiddleware.js
const jwt = require('jsonwebtoken');

const generarToken = (usuario) => {
  return jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const verificarToken = (req, res, next) => {
  const token = req.cookies.token;
  const errorMessage = encodeURIComponent('Se requiere iniciar sesión para acceder a esta ruta.');
  const errorMessage2 = encodeURIComponent('Su sesión a expirado, vuelva a iniciar sesión.');
  if (!token) {
    res.redirect(`/users/login?error=${errorMessage}`);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded.usuario;
    next();
  } catch (error) {
    res.redirect(`/users/login?error=${errorMessage2}`);
  }
};

module.exports = { generarToken, verificarToken };