let rFluxoInst = null, rFluxoQ = 0;

function rGetQuarter(offset) {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + offset;
  const yr = now.getFullYear() + Math.floor(q / 4);
  const qn = ((q % 4) + 4) % 4;
  const s = qn * 3, e = s + 2;
  return { start: new Date(yr, s, 1), end: new Date(yr, e + 1, 0), label: `${MONTHS[s]}/${yr} - ${MONTHS[e]}/${yr}` };
}

function rInitFluxo() {
  const { start, end, label } = rGetQuarter(rFluxoQ);
  document.getElementById('r-fluxo-lbl').textContent = label;
  const ss = start.toISOString().slice(0, 10), es = end.toISOString().slice(0, 10);
  const txns = DATA.filter(r => r.is_pago && r.data_pagamento >= ss && r.data_pagamento <= es);
  const byDate = {};
  txns.forEach(r => { const d = r.data_pagamento; if (!byDate[d]) byDate[d] = 0; byDate[d] += r.tipo === 'Credit' ? r.valor : -r.valor; });
  const dates = Object.keys(byDate).sort();
  let cum = 0, labels = [], values = [];
  dates.forEach(d => { cum += byDate[d]; labels.push(d.slice(5).replace('-', '/')); values.push(cum); });
  const ctx = document.getElementById('r-fluxo-chart').getContext('2d');
  if (rFluxoInst) rFluxoInst.destroy();
  if (!labels.length) { document.getElementById('r-fluxo-lbl').textContent = label + ' (sem dados)'; return; }
  rFluxoInst = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Saldo acumulado', data: values, borderColor: '#4A90D9', backgroundColor: 'rgba(74,144,217,.1)', borderWidth: 2, fill: true, tension: .4, pointRadius: 2, pointHoverRadius: 5 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => rFmtVal(c.raw) }, bodyFont: { family: 'Montserrat', size: 12 } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { family: 'Montserrat', size: 11 }, color: '#8896A8', maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { family: 'Montserrat', size: 11 }, color: '#8896A8', callback: v => 'R$' + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } }
      }
    }
  });
}

function rFluxoPrev() { rFluxoQ--; rInitFluxo(); }
function rFluxoNext() { rFluxoQ++; rInitFluxo(); }

function rRenderBadges() {
  const pend = DATA.filter(r => !r.is_pago);
  const recAberto = pend.filter(r => r.tipo === 'Credit');
  const recVencido = recAberto.filter(r => r.due_date && r.due_date < rTodayStr);
  const pagAberto = pend.filter(r => r.tipo === 'Debit');
  const pagVencido = pagAberto.filter(r => r.due_date && r.due_date < rTodayStr);
  const s = arr => arr.reduce((t, r) => t + r.valor, 0);
  const fmtBadge = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('r-badge-rec-aberto').textContent = fmtBadge(s(recAberto));
  document.getElementById('r-badge-rec-vencido').textContent = fmtBadge(s(recVencido));
  document.getElementById('r-badge-pag-aberto').textContent = fmtBadge(s(pagAberto));
  document.getElementById('r-badge-pag-vencido').textContent = fmtBadge(s(pagVencido));
}

function rGetItems(tipo, tab) {
  const pend = DATA.filter(r => !r.is_pago && r.tipo === tipo);
  if (tab === 'prox') return pend.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  if (tab === 'aberto') return pend.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  if (tab === 'vencido') return pend.filter(r => r.due_date && r.due_date < rTodayStr).sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  return [];
}

function rRenderTxn(side, tab) {
  const tipo = side === 'rec' ? 'Credit' : 'Debit';
  const items = rGetItems(tipo, tab);
  const el = document.getElementById('r-' + side + '-list');
  if (!items.length) { el.innerHTML = '<div class="r-txn-empty">Nenhum lançamento</div>'; return; }
  const today = rTodayStr;

  if (tab === 'vencido' || tab === 'aberto') {
    const grouped = {};
    items.forEach(r => {
      const key = r.fornecedor_nome || r.descricao || '—';
      if (!grouped[key]) grouped[key] = { nome: key, total: 0 };
      grouped[key].total += r.valor;
    });
    const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
    const valColor = tab === 'vencido' ? 'color:var(--neg)' : 'color:var(--text)';
    el.innerHTML = sorted.map(g => {
      const val = 'R$ ' + g.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return `<div class="r-txn-row">
        <div class="r-txn-info"><div class="r-txn-name" style="color:#4A90D9">${g.nome}</div></div>
        <span class="r-txn-val" style="${valColor}">${val}</span>
      </div>`;
    }).join('');
    return;
  }

  el.innerHTML = items.slice(0, 40).map(r => {
    const venc = r.due_date && r.due_date < today ? 'venc' : '';
    return `<div class="r-txn-row">
      <div class="r-txn-date ${venc}">${rFmtDate(r.due_date)}</div>
      <div class="r-txn-info">
        <div class="r-txn-name">${r.fornecedor_nome || r.descricao || '—'}</div>
        <div class="r-txn-cat">${(r.categoria_nome || '').replace(/^[^-]+ - /, '')}</div>
      </div>
      <span class="r-txn-val" style="color:${side === 'rec' ? 'var(--pos)' : 'var(--neg)'}">${rFmtVal(r.valor)}</span>
    </div>`;
  }).join('');
}

function rSwitchTab(side, tab, el) {
  const parent = el.closest('.r-tabs');
  if (parent) parent.querySelectorAll('.r-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  rRenderTxn(side, tab);
}
