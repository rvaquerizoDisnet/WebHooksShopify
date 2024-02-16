// authMiddleware.js
const jwt = require('jsonwebtoken');

const verificarUsuarioLogueado = (req, res, next) => {
  const token = req.body.token || req.header('Authorization');
  if (token) {
    try {
      console.log('Verificando token:', token); // Agrega este registro
      console.log('Clave secreta:', process.env.JWT_SECRET); // Agrega este registro
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded;
      next();
    } catch (error) {
      console.error('Error al verificar el token:', error.message);
      res.status(401).json({ mensaje: 'Token inválido' });
    }
  } else {
    res.redirect('/users/login?error=Inicie sesión de nuevo, ha habido un error.');
  }
};


const verificarUsuarioLogueado2 = (req, res, next) => {
  let token = req.headers['authorization'];

  console.log("Token: " + token)
  if (token) {
    token = token.replace('Bearer ', '');
    console.log("Token2: " + token)
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.usuario = decoded;
      console.log(req.usuario)
      next();
    } catch (error) {
      console.error('Error al verificar el token:', error.message);
      res.status(401).json({ mensaje: 'Token inválido' });
    }
  } else {
    // Enviar un mensaje de error en formato JSON
    res.status(401).json({ mensaje: 'Token no proporcionado' });
  }
};






module.exports = { verificarUsuarioLogueado, verificarUsuarioLogueado2 };
