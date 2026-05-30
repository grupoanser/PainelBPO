require('dotenv').config()

const express = require('express')
const { cors, errorHandler } = require('./lib/middleware')

const dreRoutes = require('./routes/dre')
const agentesRoutes = require('./routes/agentes')

const app = express()

app.use(cors)
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.use('/api/dre', dreRoutes)
app.use('/api/agentes', agentesRoutes)

app.use(errorHandler)

// Exporta para Vercel (serverless) e roda localmente se chamado direto
if (require.main === module) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => console.log(`API rodando em http://localhost:${PORT}`))
}

module.exports = app
