// errorHandlingMiddleware.js
const errorHandlingMiddleware = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ mensaje: err.message });
};

module.exports = { errorHandlingMiddleware };
