function relInit() {
  const nomes = [...new Set(DATA.map(r => r.fornecedor_nome).filter(Boolean))].sort();
  const selN = document.getElementById('rel-nome');
  if (selN && selN.options.length <= 1) nomes.forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; selN.appendChild(o); });

  const cats = [...new Set(DATA.map(r => r.categoria_nome).filter(Boolean))].sort();
  const selC = document.getElementById('rel-categoria');
  if (selC && selC.options.length <= 1) cats.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; selC.appendChild(o); });

  const ccs = [...new Set(DATA.map(r => r.centro_custo_nome).filter(Boolean))].sort();
  const selCC = document.getElementById('rel-cc');
  if (selCC && selCC.options.length <= 1) ccs.forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; selCC.appendChild(o); });

  const bancos = [...new Set(DATA.map(r => r.banco).filter(Boolean))].sort();
  const selB = document.getElementById('rel-banco');
  if (selB && selB.options.length <= 1) bancos.forEach(b => { const o = document.createElement('option'); o.value = b; o.textContent = b; selB.appendChild(o); });

  const fmt = d => d.toISOString().slice(0, 10);
  const di = document.getElementById('rel-data-ini');
  const df = document.getElementById('rel-data-fim');
  if (di && !di.value) {
    // Usa o período mais recente com dados; se não, últimos 90 dias
    const paidDates = DATA.filter(r => r.due_date).map(r => r.due_date).sort();
    if (paidDates.length) {
      const last = new Date(paidDates[paidDates.length - 1]);
      const first = new Date(last);
      first.setDate(first.getDate() - 90);
      di.value = fmt(first);
      df.value = fmt(last);
    } else {
      const now = new Date(), ago90 = new Date(now);
      ago90.setDate(ago90.getDate() - 90);
      di.value = fmt(ago90);
      df.value = fmt(now);
    }
  }

  relRender();
}

function relGetData() {
  const tipo = document.getElementById('rel-tipo')?.value || '';
  const status = document.getElementById('rel-status')?.value || '';
  const busca = (document.getElementById('rel-busca')?.value || '').toLowerCase();
  const nome = document.getElementById('rel-nome')?.value || '';
  const cat = document.getElementById('rel-categoria')?.value || '';
  const cc = document.getElementById('rel-cc')?.value || '';
  const banco = document.getElementById('rel-banco')?.value || '';
  const dataIni = document.getElementById('rel-data-ini')?.value || '';
  const dataFim = document.getElementById('rel-data-fim')?.value || '';
  const valMin = parseFloat(document.getElementById('rel-val-min')?.value) || 0;
  const valMax = parseFloat(document.getElementById('rel-val-max')?.value) || Infinity;
  const today = rTodayStr;

  return DATA.filter(r => {
    if (tipo && r.tipo !== tipo) return false;
    if (status === 'pago' && !r.is_pago) return false;
    if (status === 'pendente' && (r.is_pago || !r.due_date || r.due_date < today)) return false;
    if (status === 'vencido' && (r.is_pago || !r.due_date || r.due_date >= today)) return false;
    if (busca && ![(r.fornecedor_nome || ''), (r.descricao || ''), (r.categoria_nome || '')].join(' ').toLowerCase().includes(busca)) return false;
    if (nome && r.fornecedor_nome !== nome) return false;
    if (cat && r.categoria_nome !== cat) return false;
    if (cc && r.centro_custo_nome !== cc) return false;
    if (banco && r.banco !== banco) return false;
    if (dataIni && (!r.due_date || r.due_date < dataIni)) return false;
    if (dataFim && (!r.due_date || r.due_date > dataFim)) return false;
    if (r.valor < valMin || r.valor > valMax) return false;
    return true;
  }).sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''));
}

function relRender() {
  const data = relGetData();
  const today = rTodayStr;
  const tbody = document.getElementById('rel-tbody');
  const count = document.getElementById('rel-count');
  if (!tbody) return;

  const statusBadge = r => {
    if (r.is_pago) return '<span class="rel-badge pago">Pago</span>';
    if (r.due_date && r.due_date < today) return '<span class="rel-badge venc">Vencido</span>';
    return '<span class="rel-badge pend">Pendente</span>';
  };

  const MAX = 500;
  tbody.innerHTML = data.slice(0, MAX).map(r => `<tr>
    <td>${rFmtDate(r.due_date)}</td>
    <td>${rFmtDate(r.accrual_date)}</td>
    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${r.fornecedor_nome || '—'}</td>
    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;color:var(--muted)">${r.descricao || '—'}</td>
    <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;color:var(--muted)">${(r.categoria_nome || '—').replace(/^[^-]+ - /, '')}</td>
    <td style="color:var(--muted)">${r.centro_custo_nome || '—'}</td>
    <td><span style="padding:2px 7px;border-radius:8px;font-size:10px;font-weight:600;background:${r.tipo === 'Credit' ? '#E6F4EE' : '#FCEAEA'};color:${r.tipo === 'Credit' ? 'var(--pos)' : 'var(--neg)'}">${r.tipo === 'Credit' ? 'Receita' : 'Despesa'}</span></td>
    <td>${statusBadge(r)}</td>
    <td style="text-align:right;font-family:'DM Mono',monospace;color:${r.tipo === 'Credit' ? 'var(--pos)' : 'var(--neg)'}">${rFmtVal(r.valor)}</td>
    <td>${rFmtDate(r.data_pagamento)}</td>
    <td style="color:var(--muted)">${r.banco || '—'}</td>
  </tr>`).join('');

  const total = data.reduce((s, r) => s + (r.tipo === 'Credit' ? r.valor : -r.valor), 0);
  document.getElementById('rel-total').textContent = rFmtVal(total);
  document.getElementById('rel-total').style.color = total >= 0 ? 'var(--pos)' : 'var(--neg)';
  if (count) count.textContent = `${data.length.toLocaleString('pt-BR')} registros${data.length > MAX ? ' (exibindo ' + MAX + ')' : ''}`;
}

function relExportCSV() {
  const data = relGetData();
  const hdr = 'Vencimento,Competência,Nome,Descrição,Categoria,Centro de Custo,Tipo,Status,Valor,Pagamento,Banco';
  const today = rTodayStr;
  const rows = data.map(r => [
    r.due_date, r.accrual_date,
    '"' + (r.fornecedor_nome || '').replace(/"/g, '""') + '"',
    '"' + (r.descricao || '').replace(/"/g, '""') + '"',
    '"' + (r.categoria_nome || '').replace(/"/g, '""') + '"',
    r.centro_custo_nome || '', r.tipo,
    r.is_pago ? 'Pago' : r.due_date && r.due_date < today ? 'Vencido' : 'Pendente',
    r.valor.toFixed(2).replace('.', ','),
    r.data_pagamento || '', r.banco || ''
  ].join(','));
  const blob = new Blob([hdr + '\n' + rows.join('\n')], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'relatorio.csv';
  a.click();
}
