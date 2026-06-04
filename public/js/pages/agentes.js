let agTipo = 'Todos', agSearch = '', agSelected = null;

function agInit() {
  agRenderList();
}

function agRenderList() {
  const list = document.getElementById('ag-list');
  if (!list) return;
  const agMap = {};
  DATA.forEach(r => {
    if (!r.fornecedor_nome) return;
    if (!agMap[r.fornecedor_nome]) {
      let tipo = 'Fornecedor';
      if (r.tipo === 'Credit') tipo = 'Cliente';
      agMap[r.fornecedor_nome] = { nome: r.fornecedor_nome, tipo };
    }
  });
  let agents = Object.values(agMap).sort((a, b) => a.nome.localeCompare(b.nome));
  if (agTipo !== 'Todos') agents = agents.filter(a => a.tipo === agTipo);
  if (agSearch) agents = agents.filter(a => a.nome.toLowerCase().includes(agSearch.toLowerCase()));
  list.innerHTML = agents.map(a => `
    <div class="ag-item${agSelected === a.nome ? ' active' : ''}" onclick="agSelect('${a.nome.replace(/'/g, "\\'")}')">
      <div class="ag-item-name">${a.nome}</div>
      <div class="ag-item-tipo">${a.tipo}</div>
    </div>`).join('');
}

function agSetTipo(tipo, el) {
  agTipo = tipo;
  document.querySelectorAll('.ag-type-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  agRenderList();
}

function agFilter(val) { agSearch = val; agRenderList(); }

function agSelect(nome) {
  agSelected = nome;
  agRenderList();
  const txns = DATA.filter(r => r.fornecedor_nome === nome);
  const credits = txns.filter(r => r.tipo === 'Credit');
  const debits = txns.filter(r => r.tipo === 'Debit');
  const emAberto = txns.filter(r => !r.is_pago && r.due_date >= rTodayStr);
  const vencido = txns.filter(r => !r.is_pago && r.due_date && r.due_date < rTodayStr);
  const s = arr => arr.reduce((t, r) => t + r.valor, 0);
  const fmtRow = r => `<tr style="border-bottom:1px solid var(--border)">
    <td style="padding:7px 10px;font-size:11.5px;color:var(--muted)">${rFmtDate(r.due_date)}</td>
    <td style="padding:7px 10px;font-size:11.5px">${(r.descricao || '').slice(0, 40)}</td>
    <td style="padding:7px 10px;font-size:11px;color:var(--muted)">${(r.categoria_nome || '').replace(/^[^-]+ - /, '')}</td>
    <td style="padding:7px 10px;font-size:11.5px;font-family:'DM Mono',monospace;color:${r.tipo === 'Credit' ? 'var(--pos)' : 'var(--neg)'};text-align:right">${r.tipo === 'Credit' ? '+' : '-'}${rFmtVal(r.valor)}</td>
    <td style="padding:7px 10px"><span style="padding:2px 7px;border-radius:8px;font-size:10px;font-weight:600;background:${r.is_pago ? '#E6F4EE' : '#FCEAEA'};color:${r.is_pago ? 'var(--pos)' : 'var(--neg)'}">${r.is_pago ? 'Pago' : 'Pendente'}</span></td>
  </tr>`;
  const recent = txns.filter(r => r.is_pago).sort((a, b) => (b.data_pagamento || '').localeCompare(a.data_pagamento || '')).slice(0, 5);
  const upcoming = [...emAberto, ...vencido].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')).slice(0, 5);
  document.getElementById('ag-detail').innerHTML = `
    <div>
      <div class="ag-detail-name">${nome}</div>
      <div class="ag-detail-tipo">${credits.length ? 'Cliente/Receita' : ''} ${debits.length ? 'Fornecedor/Despesa' : ''}</div>
      <div class="ag-kpis">
        <div class="ag-kpi"><div class="ag-kpi-lbl">Total Recebido</div><div class="ag-kpi-val" style="color:var(--pos)">${rFmtVal(s(credits.filter(r => r.is_pago)))}</div></div>
        <div class="ag-kpi"><div class="ag-kpi-lbl">Em Aberto</div><div class="ag-kpi-val" style="color:var(--neg)">${rFmtVal(s(emAberto))}</div></div>
        <div class="ag-kpi"><div class="ag-kpi-lbl">Vencido</div><div class="ag-kpi-val" style="color:var(--neg)">${rFmtVal(s(vencido))}</div></div>
      </div>
      ${upcoming.length ? `<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text)">Próximos lançamentos</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
        <thead><tr style="background:var(--bg)"><th style="padding:6px 10px;font-size:10.5px;text-align:left;color:var(--muted)">Venc.</th><th style="padding:6px 10px;font-size:10.5px;text-align:left;color:var(--muted)">Descrição</th><th style="padding:6px 10px;font-size:10.5px;text-align:left;color:var(--muted)">Categoria</th><th style="padding:6px 10px;font-size:10.5px;text-align:right;color:var(--muted)">Valor</th><th style="padding:6px 10px;font-size:10.5px;color:var(--muted)">Status</th></tr></thead>
        <tbody>${upcoming.map(fmtRow).join('')}</tbody>
      </table>` : ''}
      ${recent.length ? `<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text)">Últimos pagamentos</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:var(--bg)"><th style="padding:6px 10px;font-size:10.5px;text-align:left;color:var(--muted)">Venc.</th><th style="padding:6px 10px;font-size:10.5px;text-align:left;color:var(--muted)">Descrição</th><th style="padding:6px 10px;font-size:10.5px;text-align:left;color:var(--muted)">Categoria</th><th style="padding:6px 10px;font-size:10.5px;text-align:right;color:var(--muted)">Valor</th><th style="padding:6px 10px;font-size:10.5px;color:var(--muted)">Status</th></tr></thead>
        <tbody>${recent.map(fmtRow).join('')}</tbody>
      </table>` : ''}
    </div>`;
}
