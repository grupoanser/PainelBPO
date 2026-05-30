const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

// GET /api/dre?ano=2025&cliente=id
router.get('/', asyncHandler(async (req, res) => {
  const { ano, cliente_id } = req.query

  let query = supabase.from('dre').select('*')

  if (ano) query = query.eq('ano', ano)
  if (cliente_id) query = query.eq('cliente_id', cliente_id)

  const { data, error } = await query

  if (error) throw { status: 400, message: error.message }

  res.json(data)
}))

// GET /api/dre/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('dre')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) throw { status: 404, message: 'Registro não encontrado' }

  res.json(data)
}))

module.exports = router
