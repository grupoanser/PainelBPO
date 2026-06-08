const { Router } = require('express')
const supabase = require('../lib/supabase')
const { asyncHandler } = require('../lib/middleware')

const router = Router()

const LANC_FIELDS = 'id,tipo,descricao,valor,valor_pago,is_pago,due_date,accrual_date,schedule_date,schedule_id,categoria_nome,categoria_pai,fornecedor_nome,centro_custo_nome,criado_por'

async function fetchAll(table, select, filters = []) {
  let all = [], from = 0
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + 999)
    filters.forEach(f => { q = q[f.method](...f.args) })
    const { data, error } = await q
    if (error) throw { status: 400, message: error.message }
    all = all.concat(data)
    if (data.length < 1000) break
    from += 1000
  }
  return all
}

router.get('/', asyncHandler(async (req, res) => {
  // 1. Buscar todos os dados em paralelo
  const [lancamentos, categorias, baixas] = await Promise.all([
    fetchAll('lancamentos', LANC_FIELDS, [
      { method: 'eq', args: ['ativo', true] },
      { method: 'order', args: ['due_date', { ascending: false }] }
    ]),
    fetchAll('lancamentos_categorias', 'schedule_id,categoria_nome,categoria_pai,tipo,valor'),
    fetchAll('baixas', 'schedule_id,data_pagamento', [
      { method: 'not', args: ['data_pagamento', 'is', null] },
      { method: 'order', args: ['data_pagamento', { ascending: false }] }
    ])
  ])

  // 2. Mapas de lookup
  const catsBySchedule = {}
  categorias.forEach(c => {
    if (!catsBySchedule[c.schedule_id]) catsBySchedule[c.schedule_id] = []
    catsBySchedule[c.schedule_id].push(c)
  })

  const pagamentoBySchedule = {}
  baixas.forEach(b => {
    if (!pagamentoBySchedule[b.schedule_id]) pagamentoBySchedule[b.schedule_id] = b.data_pagamento
  })

  // 3. Montar linhas detalhadas
  const rows = []

  lancamentos.forEach(lanc => {
    const base = {
      schedule_id:       lanc.schedule_id,
      descricao:         lanc.descricao,
      fornecedor_nome:   lanc.fornecedor_nome,
      centro_custo_nome: lanc.centro_custo_nome,
      criado_por:        lanc.criado_por,
      is_pago:           lanc.is_pago,
      valor_pago:        lanc.valor_pago,
      due_date:          lanc.due_date,
      accrual_date:      lanc.accrual_date,
      schedule_date:     lanc.schedule_date,
      competencia:       lanc.accrual_date ? lanc.accrual_date.slice(0, 7) : null,
      banco:             null,
      data_pagamento:    lanc.is_pago
        ? (pagamentoBySchedule[lanc.schedule_id] || lanc.due_date || null)
        : null
    }

    const cats = catsBySchedule[lanc.schedule_id]

    if (cats && cats.length > 0) {
      // Lançamento com rateio: uma linha por categoria
      cats.forEach(c => {
        rows.push({
          ...base,
          categoria_nome: c.categoria_nome,
          categoria_pai:  c.categoria_pai,
          tipo:           c.tipo === 'in' ? 'Credit' : 'Debit',
          valor:          Math.abs(c.valor)
        })
      })
    } else {
      // Sem rateio: usa os dados do próprio lançamento (fallback)
      // valor_pago é passado para que efVal() use o valor líquido em pagamentos parciais
      rows.push({
        ...base,
        categoria_nome: lanc.categoria_nome,
        categoria_pai:  lanc.categoria_pai,
        tipo:           lanc.tipo,
        valor:          lanc.valor
      })
    }
  })

  res.json(rows)
}))

module.exports = router
