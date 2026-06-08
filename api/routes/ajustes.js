const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

const AJUSTE_FILTER = [
  'categoria_nome.ilike.%Desconto%',
  'categoria_nome.ilike.%Juros%',
  'categoria_nome.ilike.%Multa%',
  'categoria_nome.ilike.%Estorno%',
  'categoria_nome.ilike.%Acréscimo%'
].join(',')

router.get('/', asyncHandler(async (req, res) => {
  // 1. Encontrar schedule_ids que têm linhas de ajuste
  let adjustPage = [], from = 0
  while (true) {
    const { data, error } = await supabase
      .from('lancamentos_categorias')
      .select('schedule_id')
      .or(AJUSTE_FILTER)
      .range(from, from + 999)
    if (error) throw { status: 400, message: error.message }
    adjustPage = adjustPage.concat(data)
    if (data.length < 1000) break
    from += 1000
  }

  if (adjustPage.length === 0) return res.json([])

  const scheduleIds = [...new Set(adjustPage.map(r => r.schedule_id))]

  // 2. Buscar TODAS as linhas desses schedules (main + ajustes)
  const chunkSize = 50
  let all = []
  for (let i = 0; i < scheduleIds.length; i += chunkSize) {
    const chunk = scheduleIds.slice(i, i + chunkSize)
    const { data, error } = await supabase
      .from('lancamentos_categorias')
      .select('schedule_id,categoria_nome,categoria_pai,tipo,valor')
      .in('schedule_id', chunk)
    if (!error && data) all = all.concat(data)
  }

  res.json(all)
}))

module.exports = router
