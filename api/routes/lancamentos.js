const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

const FIELDS = 'id,tipo,descricao,valor,is_pago,due_date,accrual_date,schedule_date,categoria_nome,categoria_pai,fornecedor_nome,centro_custo_nome,criado_por'

router.get('/', asyncHandler(async (req, res) => {
  let all = []
  let from = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(FIELDS)
      .order('due_date', { ascending: false })
      .range(from, from + PAGE - 1)

    if (error) throw { status: 400, message: error.message }
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }

  res.json(all)
}))

module.exports = router
