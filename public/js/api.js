async function fetchLancamentos(onProgress) {
  const res = await fetch(API_BASE + '/api/lancamentos');
  if (!res.ok) throw new Error('Erro ao buscar lançamentos: ' + res.status);
  const data = await res.json();
  if (onProgress) onProgress(data.length);
  return data.map(r => ({
    ...r,
    competencia: r.accrual_date ? r.accrual_date.slice(0, 7) : null,
    banco: null,
    // data_pagamento já vem correta do backend (via baixas.schedule_id)
  }));
}

async function fetchContas() {
  const res = await fetch(API_BASE + '/api/contas');
  if (!res.ok) return [];
  return res.json();
}

async function fetchCliente() {
  const res = await fetch(API_BASE + '/api/clientes');
  if (!res.ok) return null;
  return res.json();
}
