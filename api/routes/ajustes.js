const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

// Categorias de ajuste que não estão na tabela lancamentos principal
const AJUSTE_KEYWORDS = ['Desconto', 'Juros', 'Multa', 'Estorno', 'Acréscimo']

router.get('/', asyncHandler(async (req, res) => {
  const orFilter = AJUSTE_KEYWORDS
    .map(k => `categoria_nome.ilike.%${k}%`)
    .join(',')

  let all = [], from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('lancamentos_categorias')
      .select('schedule_id,categoria_nome,categoria_pai,tipo,valor')
      .or(orFilter)
      .range(from, from + PAGE - 1)
    if (error) throw { status: 400, message: error.message }
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }

  res.json(all)
}))

module.exports = router
