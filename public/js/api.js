async function fetchLancamentos(onProgress) {
  // Usa o endpoint detalhado: uma linha por categoria de rateio
  const res = await fetch(API_BASE + '/api/lancamentos-detalhado');
  if (!res.ok) throw new Error('Erro ao buscar lançamentos: ' + res.status);
  const data = await res.json();
  if (onProgress) onProgress(data.length);
  return data;
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
