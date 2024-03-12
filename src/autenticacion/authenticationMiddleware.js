// authenticationMiddleware.js
const jwt = require('jsonwebtoken');

const generarToken = (usuario) => {
  return jwt.sign({ usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const verificarToken = (req, res, next) => {
  const token = req.cookies.token;
  const errorMessage = encodeURIComponent('Se requiere iniciar sesión para acceder a esta ruta.');
  const errorMessage2 = encodeURIComponent('Su sesión ha expirado, vuelva a iniciar sesión.');
  
  if (!token) {
    return res.redirect(`/users/login?error=${errorMessage}`);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded.usuario;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return redirectToLogin(res, errorMessage2); // Usamos una función externa para redireccionar
    } else {
      console.error('Error de autenticación:', error.message);
      return res.status(401).send('Error de autenticación');
    }
  }
};

// Función externa para redireccionar en caso de token expirado
const redirectToLogin = (res, errorMessage) => {
  return res.redirect(`/users/login?error=${errorMessage}`);
};

module.exports = { generarToken, verificarToken };



module.exports = { generarToken, verificarToken };