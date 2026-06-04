let recYear = null, recBasis = 'competencia', recView = 'realizado';
let recExpandedCats = new Set();

function recSetBasis(v) { recBasis = v; recRender(); }
function recSetView(v) { recView = v; recRender(); }

function recNavYear(dir) {
  const yrs = recGetYears();
  if (!yrs.length) return;
  const idx = yrs.indexOf(recYear);
  const newIdx = Math.max(0, Math.min(yrs.length - 1, idx + dir));
  recYear = yrs[newIdx];
  recRender();
}

function recGetYears() {
  return [...new Set(DATA.map(r => r.accrual_date ? r.accrual_date.slice(0, 4) : null).filter(Boolean))].sort();
}

function recEffPeriod(r) {
  if (recBasis === 'caixa' && r.data_pagamento) return r.data_pagamento.slice(0, 7);
  return r.accrual_date ? r.accrual_date.slice(0, 7) : r.competencia;
}

function recInit() {
  const currentYear = new Date().getFullYear().toString();
  const yrs = recGetYears();
  recYear = yrs.includes(currentYear) ? currentYear : (yrs.length ? yrs[yrs.length - 1] : null);
  recRender();
}

function recToggleCat(cat) {
  if (recExpandedCats.has(cat)) recExpandedCats.delete(cat);
  else recExpandedCats.add(cat);
  recRender();
}

function recCellColor(pago, vencido, futuro) {
  if (pago > 0 && vencido === 0 && futuro === 0) return 'var(--pos)';
  if (vencido > 0 && pago === 0 && futuro === 0) return 'var(--neg)';
  if (vencido > 0) return 'var(--neg)';
  if (pago > 0) return 'var(--pos)';
  return 'inherit';
}

function recRender() {
  if (!recYear) return;
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('rec-year-lbl').textContent = recYear;

  const periods = [];
  for (let m = 1; m <= 12; m++) periods.push(`${recYear}-${String(m).padStart(2, '0')}`);

  const d = DATA.filter(r =>
    r.tipo === 'Credit' &&
    r.categoria_pai === 'Receitas operacionais' &&
    recEffPeriod(r) &&
    recEffPeriod(r).startsWith(recYear)
  );

  const catMap = {};
  d.forEach(r => {
    const cat = r.categoria_nome || 'Sem categoria';
    const cli = r.fornecedor_nome || r.descricao || '—';
    const idx = periods.indexOf(recEffPeriod(r));
    if (idx < 0) return;
    if (!catMap[cat]) catMap[cat] = {};
    if (!catMap[cat][cli]) catMap[cat][cli] = periods.map(() => ({ pago:0, vencido:0, futuro:0 }));
    const bucket = r.is_pago ? 'pago' : (r.due_date && r.due_date < today ? 'vencido' : 'futuro');
    catMap[cat][cli][idx][bucket] += r.valor;
  });

  const fmt = v => fmtN(v).replace(/<[^>]+>/g, '');
  document.getElementById('rec-head').innerHTML =
    `<th class="th-desc">${recBasis === 'caixa' ? 'DFC' : 'DRE'} (${recView === 'realizado' ? 'Realizado' : 'Agendado'})</th>` +
    MONTHS.map(m => `<th>${m}</th>`).join('') +
    `<th class="th-total">Total</th>`;

  const totByPeriod = periods.map((_, i) => {
    let pago = 0, vencido = 0, futuro = 0;
    Object.values(catMap).forEach(clients => {
      Object.values(clients).forEach(vals => {
        pago += vals[i].pago; vencido += vals[i].vencido; futuro += vals[i].futuro;
      });
    });
    return { pago, vencido, futuro };
  });

  let rows = '';

  rows += `<tr class="r-sec" style="cursor:default"><td>RECEITAS OPERACIONAIS (A)</td>` +
    totByPeriod.map(t => {
      const tot = t.pago + t.vencido + t.futuro;
      const col = recCellColor(t.pago, t.vencido, t.futuro);
      return `<td style="text-align:right;font-weight:700;font-family:'DM Mono',monospace;font-size:11px;color:${col}">${tot ? fmt(tot) : '—'}</td>`;
    }).join('') +
    (() => {
      const tp = totByPeriod.reduce((s, t) => s + t.pago, 0);
      const tv = totByPeriod.reduce((s, t) => s + t.vencido, 0);
      const tf = totByPeriod.reduce((s, t) => s + t.futuro, 0);
      const col = recCellColor(tp, tv, tf);
      return `<td class="total-col" style="text-align:right;font-weight:700;font-family:'DM Mono',monospace;color:${col}">${fmt(tp + tv + tf)}</td>`;
    })() + '</tr>';

  const sortedCats = Object.entries(catMap).sort((a, b) => {
    const sa = Object.values(a[1]).flatMap(v => v).reduce((s, c) => s + c.pago + c.vencido + c.futuro, 0);
    const sb = Object.values(b[1]).flatMap(v => v).reduce((s, c) => s + c.pago + c.vencido + c.futuro, 0);
    return sb - sa;
  });

  sortedCats.forEach(([cat, clients]) => {
    const catByPeriod = periods.map((_, i) => {
      let pago = 0, vencido = 0, futuro = 0;
      Object.values(clients).forEach(v => { pago += v[i].pago; vencido += v[i].vencido; futuro += v[i].futuro; });
      return { pago, vencido, futuro };
    });
    const isOpen = recExpandedCats.has(cat);
    const shortName = cat.replace(/^[^-]+ - /, '');
    const icon = isOpen ? '⊟' : '⊞';

    rows += `<tr class="r-sub" style="cursor:pointer" onclick="recToggleCat('${cat.replace(/'/g, "\\'")}')">
      <td style="padding-left:20px">${icon} ${shortName}</td>` +
      catByPeriod.map(t => {
        const tot = t.pago + t.vencido + t.futuro;
        const col = recCellColor(t.pago, t.vencido, t.futuro);
        return `<td style="text-align:right;color:${col}">${tot ? fmt(tot) : '—'}</td>`;
      }).join('') +
      (() => {
        const tp = catByPeriod.reduce((s, t) => s + t.pago, 0);
        const tv = catByPeriod.reduce((s, t) => s + t.vencido, 0);
        const tf = catByPeriod.reduce((s, t) => s + t.futuro, 0);
        const col = recCellColor(tp, tv, tf);
        return `<td class="total-col" style="text-align:right;color:${col}">${fmt(tp + tv + tf)}</td>`;
      })() + '</tr>';

    if (isOpen) {
      const sortedClients = Object.entries(clients).sort((a, b) => {
        const sa = a[1].reduce((s, v) => s + v.pago + v.vencido + v.futuro, 0);
        const sb = b[1].reduce((s, v) => s + v.pago + v.vencido + v.futuro, 0);
        return sb - sa;
      });
      sortedClients.forEach(([cli, vals]) => {
        rows += `<tr class="r-child">
          <td style="padding-left:40px;font-size:11px;color:var(--mid)">→ ${cli}</td>` +
          vals.map(t => {
            const tot = t.pago + t.vencido + t.futuro;
            const col = recCellColor(t.pago, t.vencido, t.futuro);
            return `<td style="text-align:right;font-size:11px;color:${col}">${tot ? fmt(tot) : '—'}</td>`;
          }).join('') +
          (() => {
            const tp = vals.reduce((s, t) => s + t.pago, 0);
            const tv = vals.reduce((s, t) => s + t.vencido, 0);
            const tf = vals.reduce((s, t) => s + t.futuro, 0);
            const col = recCellColor(tp, tv, tf);
            return `<td class="total-col" style="text-align:right;font-size:11px;color:${col}">${fmt(tp + tv + tf)}</td>`;
          })() + '</tr>';
      });
    }
  });

  document.getElementById('rec-body').innerHTML = rows;
}
