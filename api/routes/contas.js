const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

router.get('/', asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('contas')
    .select('id,nome,saldo_atual,ativa')
    .order('nome')

  if (error) throw { status: 400, message: error.message }
  res.json(data)
}))

module.exports = router
