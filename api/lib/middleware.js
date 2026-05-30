const cors = require('cors')

const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

function errorHandler(err, req, res, next) {
  console.error(err)
  const status = err.status || 500
  res.status(status).json({ error: err.message || 'Erro interno no servidor' })
}

module.exports = { cors: cors(corsOptions), asyncHandler, errorHandler }
