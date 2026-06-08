require('dotenv').config()

const express = require('express')
const path = require('path')
const { cors, errorHandler } = require('./lib/middleware')

const lancamentosRoutes = require('./routes/lancamentos')
const contasRoutes = require('./routes/contas')
const clientesRoutes = require('./routes/clientes')
const dreRoutes = require('./routes/dre')
const agentesRoutes = require('./routes/agentes')
const ajustesRoutes = require('./routes/ajustes')

const app = express()

app.use(cors)
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/lancamentos', lancamentosRoutes)
app.use('/api/contas', contasRoutes)
app.use('/api/clientes', clientesRoutes)
app.use('/api/dre', dreRoutes)
app.use('/api/agentes', agentesRoutes)
app.use('/api/ajustes', ajustesRoutes)

app.use(express.static(path.join(__dirname, '..', 'public')))

app.use(errorHandler)

if (require.main === module) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`))
}

module.exports = app
