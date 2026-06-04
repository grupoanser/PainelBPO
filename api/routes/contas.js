const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  const [contasResult, baixasResult] = await Promise.all([
    supabase.from('contas').select('id,nome,saldo_inicial,ativa').order('nome'),
    supabase.from('baixas').select('conta_id,valor')
  ])

  if (contasResult.error) throw { status: 400, message: contasResult.error.message }

  // Somar baixas por conta
  const somaBaixas = {}
  for (const b of (baixasResult.data || [])) {
    somaBaixas[b.conta_id] = (somaBaixas[b.conta_id] || 0) + b.valor
  }

  const contas = contasResult.data.map(c => ({
    id: c.id,
    nome: c.nome,
    ativa: c.ativa,
    saldo_atual: (c.saldo_inicial || 0) + (somaBaixas[c.id] || 0)
  }))

  res.json(contas)
}))

module.exports = router
