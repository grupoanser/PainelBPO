const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

const FIELDS = 'id,tipo,descricao,valor,is_pago,due_date,accrual_date,schedule_date,schedule_id,categoria_nome,categoria_pai,fornecedor_nome,centro_custo_nome,criado_por'

async function fetchAllLancamentos() {
  let all = [], from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('lancamentos')
      .select(FIELDS)
      .eq('ativo', true)
      .order('due_date', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw { status: 400, message: error.message }
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

async function fetchPagamentosBySchedule() {
  // Baixas têm a data real de pagamento, linked via schedule_id
  let all = [], from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('baixas')
      .select('schedule_id,data_pagamento')
      .not('data_pagamento', 'is', null)
      .order('data_pagamento', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  // Mapa schedule_id → data_pagamento mais recente
  const map = {}
  for (const b of all) {
    if (!map[b.schedule_id]) map[b.schedule_id] = b.data_pagamento
  }
  return map
}

router.get('/', asyncHandler(async (req, res) => {
  const [lancamentos, pagamentos] = await Promise.all([
    fetchAllLancamentos(),
    fetchPagamentosBySchedule()
  ])

  const result = lancamentos.map(r => ({
    ...r,
    competencia: r.accrual_date ? r.accrual_date.slice(0, 7) : null,
    banco: null,
    // data_pagamento real das baixas; fallback para due_date só se is_pago e sem baixa
    data_pagamento: r.is_pago
      ? (pagamentos[r.schedule_id] || r.due_date || null)
      : null
  }))

  res.json(result)
}))

module.exports = router
