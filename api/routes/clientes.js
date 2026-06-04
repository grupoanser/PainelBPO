const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id,nome,ativo')
    .eq('ativo', true)
    .limit(1)
    .single()

  if (error) throw { status: 400, message: error.message }
  res.json(data)
}))

module.exports = router
