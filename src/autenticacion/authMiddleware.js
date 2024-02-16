// authMiddleware.js
const jwt = require('jsonwebtoken');

const protegerRuta = (rolesPermitidos) => {
  return (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
      return res.redirect('/users/redirectLogin?mensaje=Debes iniciar sesión para acceder a esta página.');
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (rolesPermitidos.includes(decoded.usuario.rol)) {
        req.usuario = decoded.usuario;
        next();
      } else {
        res.status(403).json({ mensaje: 'Acceso prohibido. No tienes los permisos necesarios.' });
      }
    } catch (error) {
      res.status(401).json({ mensaje: 'Token no válido.' });
    }
  };
};

module.exports = { protegerRuta };