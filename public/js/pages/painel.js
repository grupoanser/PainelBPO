let showAV = false, showAH = false;
let centroFilter = '';
let basisMode = 'caixa';
let viewMode = 'realizado';
let activeYear = null;
let chartInst = null, chartLiqInst = null;

const SECTION_KEYS = { secA:['rb'], secB:['ded','imp'], secC:['cus'], secD:['dp','da','te','ut','tr'], secE:['recfin','inv'], secF:['fin'] };

const GROUP_FILTERS = {
  rb:     r => r.tipo === 'Credit' && r.categoria_pai === 'Receitas operacionais',
  ded:    r => r.tipo === 'Debit' && r.categoria_pai === 'Receitas operacionais' && r.categoria_nome.startsWith('Deduções'),
  imp:    r => r.tipo === 'Debit' && r.categoria_pai === 'Receitas operacionais' && r.categoria_nome.startsWith('Impostos'),
  cus:    r => r.tipo === 'Debit' && r.categoria_pai === 'Custos operacionais',
  dp:     r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Despesas Pessoais'),
  da:     r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Despesas Admin.'),
  te:     r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Terceirizados'),
  ut:     r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Utilidades'),
  tr:     r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Tributos'),
  recfin: r => r.tipo === 'Credit' && r.categoria_pai === 'Atividades de investimento',
  inv:    r => r.tipo === 'Debit' && r.categoria_pai === 'Atividades de investimento',
  fin:    r => r.categoria_pai === 'Atividades de financiamento',
};

const GROUP_SIGN = { rb:false, ded:true, imp:true, cus:true, dp:true, da:true, te:true, ut:true, tr:true, recfin:false, inv:true, fin:false };

function effectivePeriod(r) {
  if (basisMode === 'caixa') {
    if (r.data_pagamento) return r.data_pagamento.slice(0, 7);
    if (r.due_date) return r.due_date.slice(0, 7);
  }
  if (r.accrual_date) return r.accrual_date.slice(0, 7);
  return r.competencia;
}

function workingData() {
  const today = new Date().toISOString().slice(0, 10);
  const base = centroFilter ? DATA.filter(r => r.centro_custo_nome === centroFilter) : DATA;
  if (viewMode === 'realizado') {
    return base.filter(r => {
      if (!r.is_pago) return false;
      if (basisMode === 'caixa') return r.data_pagamento && r.data_pagamento <= today;
      const dateRef = r.accrual_date;
      return !dateRef || dateRef <= today;
    });
  }
  return base;
}

function activePeriods() { return [...new Set(workingData().map(r => effectivePeriod(r)))].sort(); }
function activeYears() { return [...new Set(activePeriods().filter(p => p && p.includes('-')).map(p => p.split('-')[0]))].sort(); }

function compute(period) {
  const d = workingData().filter(r => effectivePeriod(r) === period);
  const sum = rows => rows.reduce((s, r) => s + r.valor, 0);

  const rb_i = d.filter(r => r.tipo === 'Credit' && r.categoria_pai === 'Receitas operacionais');
  const rb = sum(rb_i); const A = rb;

  const ded_i = d.filter(r => r.tipo === 'Debit' && r.categoria_pai === 'Receitas operacionais' && r.categoria_nome.includes('Deduções'));
  const ded = sum(ded_i);
  const imp_i = d.filter(r => r.tipo === 'Debit' && r.categoria_pai === 'Receitas operacionais' && r.categoria_nome.includes('Impostos'));
  const imp = sum(imp_i);
  const B_ded = -(ded + imp);
  const receitaLiquida = A + B_ded;

  const cus_i = d.filter(r => r.tipo === 'Debit' && r.categoria_pai === 'Custos operacionais');
  const cus = sum(cus_i); const C_cus = -cus; const B = C_cus;
  const margem = receitaLiquida + C_cus;
  const margemPct = A > 0 ? (margem / A * 100) : 0;

  const da_i = d.filter(r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Despesas Admin.'));
  const da = sum(da_i);
  const te_i = d.filter(r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Terceirizados'));
  const te = sum(te_i);
  const ut_i = d.filter(r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Utilidades'));
  const ut = sum(ut_i);
  const dp_i = d.filter(r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Despesas Pessoais'));
  const dp = sum(dp_i);
  const tr_i = d.filter(r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Tributos'));
  const tr = sum(tr_i);
  const D_desp = -(dp + da + te + ut + tr);
  const resOp = A + B_ded + C_cus + D_desp;
  const C = D_desp;

  const recfin_i = d.filter(r => r.categoria_pai === 'Atividades de investimento' && (r.categoria_nome || '').toLowerCase().includes('rec. financeiras'));
  const recfin = recfin_i.reduce((s, r) => s + (r.tipo === 'Credit' ? r.valor : -r.valor), 0);
  const inv_i = d.filter(r => r.categoria_pai === 'Atividades de investimento' && !(r.categoria_nome || '').toLowerCase().includes('rec. financeiras'));
  const inv = inv_i.reduce((s, r) => s + (r.tipo === 'Credit' ? r.valor : -r.valor), 0);
  const E = recfin + inv;

  const fin_i = d.filter(r => r.categoria_pai === 'Atividades de financiamento');
  const fin = fin_i.reduce((s, r) => s + (r.tipo === 'Credit' ? r.valor : -r.valor), 0);

  const resultadoLiq = resOp + recfin + inv + fin;

  return { rb, rb_i, A, ded, ded_i, imp, imp_i, B_ded, receitaLiquida, cus, cus_i, C_cus, B, margem, margemPct, dp, dp_i, da, da_i, te, te_i, ut, ut_i, tr, tr_i, D_desp, C, resOp, recfin, recfin_i, inv, inv_i, E, fin, fin_i, resultadoLiq };
}

function getGroupBreakdown(key, comp) {
  const fn = GROUP_FILTERS[key]; if (!fn) return [];
  const wd = workingData();
  const allNames = new Set();
  comp.forEach(c => { wd.filter(r => effectivePeriod(r) === c.period && fn(r)).forEach(r => allNames.add(r.categoria_nome)); });
  return [...allNames].sort().map(nome => ({ nome, vals: comp.map(c => wd.filter(r => effectivePeriod(r) === c.period && fn(r) && r.categoria_nome === nome).reduce((s, r) => s + r.valor, 0)) }));
}

function getItemsByKey(key, period) {
  const d = period ? workingData().filter(r => effectivePeriod(r) === period) : workingData();
  const map = {
    rb: r => r.tipo === 'Credit' && r.categoria_pai === 'Receitas operacionais',
    ded: r => r.tipo === 'Debit' && r.categoria_pai === 'Receitas operacionais' && r.categoria_nome.includes('Deduções'),
    imp: r => r.tipo === 'Debit' && r.categoria_pai === 'Receitas operacionais' && r.categoria_nome.includes('Impostos'),
    cus: r => r.tipo === 'Debit' && r.categoria_pai === 'Custos operacionais',
    da: r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Despesas Admin.'),
    te: r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Terceirizados'),
    ut: r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas' && r.categoria_nome.startsWith('Utilidades'),
    dp: r => false, tr: r => false,
    recfin: r => r.categoria_pai === 'Atividades de investimento' && r.tipo === 'Credit',
    inv: r => r.categoria_pai === 'Atividades de investimento' && r.tipo === 'Debit',
    fin: r => r.categoria_pai === 'Atividades de financiamento',
    A: r => r.categoria_pai === 'Receitas operacionais',
    B: r => r.tipo === 'Debit' && r.categoria_pai === 'Custos operacionais',
    C: r => r.tipo === 'Debit' && r.categoria_pai === 'Despesas operacionais e outras receitas',
    E: r => r.categoria_pai === 'Atividades de investimento',
  };
  const fn = map[key];
  return fn ? d.filter(fn) : [];
}

function renderKPIs(comp) {
  const tRb = comp.reduce((s, c) => s + c.rb, 0);
  const tMarg = comp.reduce((s, c) => s + c.margem, 0);
  const tEbit = comp.reduce((s, c) => s + c.resOp, 0);
  const tLiq = comp.reduce((s, c) => s + c.resultadoLiq, 0);
  const pMarg = tRb > 0 ? (tMarg / tRb * 100) : 0;
  const pEbit = tRb > 0 ? (tEbit / tRb * 100) : 0;
  const pLiq = tRb > 0 ? (tLiq / tRb * 100) : 0;

  document.getElementById('kpi-rb').innerHTML = fmtN(tRb);
  const periods = comp.map(c => fmtP(c.period));
  let periodLabel = periods.length === 1 ? periods[0] : periods.length === 12 ? (activeYear || '') : (periods[0] + ' – ' + periods[periods.length - 1]);
  document.getElementById('kpi-rb-h').textContent = periodLabel;

  const margEl = document.getElementById('kpi-marg-val');
  margEl.innerHTML = fmtN(tMarg); margEl.className = 'kpi-val ' + (tMarg >= 0 ? 'pos' : 'neg');
  document.getElementById('kpi-marg-pct').textContent = pMarg.toFixed(1) + '%';
  document.getElementById('kpi-marg-pct').style.color = tMarg >= 0 ? 'var(--pos)' : 'var(--neg)';

  const ebitEl = document.getElementById('kpi-ebit');
  ebitEl.innerHTML = fmtN(tEbit); ebitEl.className = 'kpi-val ' + (tEbit >= 0 ? 'pos' : 'neg');
  document.getElementById('kpi-ebit-pct').textContent = pEbit.toFixed(1) + '%';
  document.getElementById('kpi-ebit-pct').style.color = tEbit >= 0 ? 'var(--pos)' : 'var(--neg)';

  const liqEl = document.getElementById('kpi-liq');
  liqEl.innerHTML = fmtN(tLiq); liqEl.className = 'kpi-val ' + (tLiq >= 0 ? 'pos' : 'neg');
  document.getElementById('kpi-liq-pct').textContent = pLiq.toFixed(1) + '%';
  document.getElementById('kpi-liq-pct').style.color = tLiq >= 0 ? 'var(--pos)' : 'var(--neg)';
}

function render() {
  const comp = selected.map(p => ({ period: p, ...compute(p) }));
  renderKPIs(comp);
  renderHead(comp);
  renderBody(comp);
  renderChart(comp);
  renderChartLiq(comp);
}

function renderHead(comp) {
  const h = document.getElementById('dre-head');
  let html = `<th class="th-desc">${basisMode === 'caixa' ? 'DFC' : 'DRE'} (${viewMode === 'realizado' ? 'Realizado' : 'Agendado'})</th>`;
  comp.forEach(c => {
    html += `<th>${fmtP(c.period)}</th>`;
    if (showAV) html += '<th class="th-av">AV%</th>';
    if (showAH) html += '<th class="th-ah">AH%</th>';
  });
  html += '<th class="th-total">Total</th>';
  if (showAV) html += '<th class="th-av">AV%</th>';
  h.innerHTML = html;
}

function renderBody(comp) {
  const body = document.getElementById('dre-body');

  function cells(vs) {
    const total = vs.reduce((s, v) => s + v, 0);
    const rbVals = comp.map(c => c.A);
    const rbTotal = rbVals.reduce((s, v) => s + v, 0);
    let out = '';
    vs.forEach((v, i) => {
      out += `<td>${fmtN(v)}</td>`;
      if (showAV) { const rb = rbVals[i]; const av = (rb !== 0 && v !== 0) ? (v / rb * 100).toFixed(1) + '%' : '—'; out += `<td class="av-cell">${av}</td>`; }
      if (showAH) { let ah = '<td class="ah-cell na">—</td>'; if (i > 0 && vs[i - 1] !== 0) { const pct = (v - vs[i - 1]) / Math.abs(vs[i - 1]) * 100; const c = pct > 0 ? 'up' : pct < 0 ? 'dn' : 'na'; ah = `<td class="ah-cell ${c}">${pct > 0 ? '+' : ''}${pct.toFixed(1)}%</td>`; } out += ah; }
    });
    out += `<td class="total-col">${fmtN(total)}</td>`;
    if (showAV) { const av = (rbTotal !== 0 && total !== 0) ? (total / rbTotal * 100).toFixed(1) + '%' : '—'; out += `<td class="av-cell">${av}</td>`; }
    return out;
  }

  function pctCells(vs) {
    const n = comp.length;
    let out = '';
    vs.forEach(() => { out += `<td>—</td>`; if (showAV) out += '<td class="av-cell">—</td>'; if (showAH) out += '<td class="ah-cell na">—</td>'; });
    out += `<td class="total-col">${fmtPctRow(vs.reduce((s, v) => s + v, 0) / n)}</td>`;
    if (showAV) out += '<td class="av-cell">—</td>';
    return out;
  }

  function secRow(label, key, vs, sectionId) {
    const tot = vs.reduce((s, v) => s + v, 0);
    let cs = '';
    vs.forEach((v, i) => {
      cs += `<td>${fmtN(v)}</td>`;
      if (showAV) { const rb = comp[i].A; const av = (rb !== 0 && v !== 0) ? (v / rb * 100).toFixed(1) + '%' : '—'; cs += `<td class="av-cell">${av}</td>`; }
      if (showAH) { let ah = '<td class="ah-cell na">—</td>'; if (i > 0 && vs[i - 1] !== 0) { const pct = (v - vs[i - 1]) / Math.abs(vs[i - 1]) * 100; const c = pct > 0 ? 'up' : pct < 0 ? 'dn' : 'na'; ah = `<td class="ah-cell ${c}">${pct > 0 ? '+' : ''}${pct.toFixed(1)}%</td>`; } cs += ah; }
    });
    cs += `<td class="total-col">${fmtN(tot)}</td>`;
    if (showAV) { const rb = comp.reduce((s, c) => s + c.A, 0); const av = (rb !== 0 && tot !== 0) ? (tot / rb * 100).toFixed(1) + '%' : '—'; cs += `<td class="av-cell">${av}</td>`; }
    return `<tr class="r-sec" data-sec="${sectionId}" onclick="toggleSection('${sectionId}')"><td><span class="toggle-icon" id="ti-${sectionId}">⊟</span>${H(label)}</td>${cs}</tr>`;
  }

  function subRow(label, key, vs, sectionId) {
    const isExp = GROUP_SIGN[key] === true;
    const tot = vs.reduce((s, v) => s + v, 0);
    let cs = '';
    vs.forEach((v, i) => {
      cs += `<td>${fmtN(isExp ? -Math.abs(v) : v)}</td>`;
      if (showAV) { const rb = comp[i].A; const av = (rb !== 0 && v !== 0) ? (v / rb * 100).toFixed(1) + '%' : '—'; cs += `<td class="av-cell">${av}</td>`; }
      if (showAH) { let ah = '<td class="ah-cell na">—</td>'; if (i > 0 && vs[i - 1] !== 0) { const pct = (v - vs[i - 1]) / Math.abs(vs[i - 1]) * 100; const c = pct > 0 ? 'up' : pct < 0 ? 'dn' : 'na'; ah = `<td class="ah-cell ${c}">${pct > 0 ? '+' : ''}${pct.toFixed(1)}%</td>`; } cs += ah; }
    });
    cs += `<td class="total-col">${fmtN(isExp ? -Math.abs(tot) : tot)}</td>`;
    if (showAV) { const rb = comp.reduce((s, c) => s + c.A, 0); const av = (rb !== 0 && tot !== 0) ? (tot / rb * 100).toFixed(1) + '%' : '—'; cs += `<td class="av-cell">${av}</td>`; }
    const breakdown = getGroupBreakdown(key, comp);
    let childHtml = '';
    breakdown.forEach(({ nome, vals }) => {
      const ctot = vals.reduce((s, v) => s + v, 0);
      if (ctot === 0 && vals.every(v => v === 0)) return;
      let ccs = '';
      vals.forEach((v, i) => {
        const dv = isExp ? -Math.abs(v) : v;
        const p2 = comp[i].period;
        ccs += `<td onclick="showDetailByNome('${H(nome).replace(/'/g, "\\'")}','${key}','${p2}')" style="cursor:pointer">${fmtN(dv)}</td>`;
        if (showAV) { const rb = comp[i].A; const av = (rb !== 0 && v !== 0) ? (v / rb * 100).toFixed(1) + '%' : '—'; ccs += `<td class="av-cell">${av}</td>`; }
        if (showAH) { let ah = '<td class="ah-cell na">—</td>'; if (i > 0 && vals[i - 1] !== 0) { const pct = (v - vals[i - 1]) / Math.abs(vals[i - 1]) * 100; const c = pct > 0 ? 'up' : pct < 0 ? 'dn' : 'na'; ah = `<td class="ah-cell ${c}">${pct > 0 ? '+' : ''}${pct.toFixed(1)}%</td>`; } ccs += ah; }
      });
      const cdv = isExp ? -Math.abs(ctot) : ctot;
      ccs += `<td class="total-col">${fmtN(cdv)}</td>`;
      if (showAV) { const rb = comp.reduce((s, c) => s + c.A, 0); const av = (rb !== 0 && ctot !== 0) ? (ctot / rb * 100).toFixed(1) + '%' : '—'; ccs += `<td class="av-cell">${av}</td>`; }
      childHtml += `<tr class="r-child sec-${sectionId} child-${key}"><td onclick="showDetail('${key}')" style="cursor:pointer">${H(nome)}</td>${ccs}</tr>`;
    });
    return `<tr class="r-sub sec-${sectionId}" onclick="toggleGroup('${key}')">
      <td><span class="sub-icon" id="icon-${key}">⊟</span>${H(label)}</td>${cs}</tr>` + childHtml;
  }

  let html = '';
  html += secRow('A · Receitas Operacionais', 'rb', comp.map(c => c.A), 'secA');
  html += subRow('Receitas Operacionais', 'rb', comp.map(c => c.rb), 'secA');
  html += `<tr class="r-sp"><td colspan="${comp.length + (showAV ? comp.length : 0) + (showAH ? comp.length : 0) + 2}"></td></tr>`;
  html += secRow('B · Deduções & Impostos', 'ded', comp.map(c => c.B_ded), 'secB');
  html += subRow('Deduções', 'ded', comp.map(c => c.ded), 'secB');
  html += subRow('Impostos sobre faturamento', 'imp', comp.map(c => c.imp), 'secB');
  html += `<tr class="r-margem"><td>= Receita Líquida</td>${cells(comp.map(c => c.receitaLiquida))}</tr>`;
  html += `<tr class="r-sp"><td colspan="${comp.length + (showAV ? comp.length : 0) + (showAH ? comp.length : 0) + 2}"></td></tr>`;
  html += secRow('C · Custos Operacionais', 'cus', comp.map(c => c.C_cus), 'secC');
  html += subRow('Custos operacionais', 'cus', comp.map(c => c.cus), 'secC');
  html += `<tr class="r-margem"><td>= Margem de Contribuição (A+B+C)</td>${cells(comp.map(c => c.margem))}</tr>`;
  html += `<tr class="r-pct"><td>% sobre Receita Bruta</td>${pctCells(comp.map(c => c.margemPct))}</tr>`;
  html += `<tr class="r-sp"><td colspan="${comp.length + (showAV ? comp.length : 0) + (showAH ? comp.length : 0) + 2}"></td></tr>`;
  html += secRow('D · Despesas Operacionais', 'da', comp.map(c => c.D_desp), 'secD');
  html += subRow('Despesas Pessoais', 'dp', comp.map(c => c.dp), 'secD');
  html += subRow('Despesas Administrativas', 'da', comp.map(c => c.da), 'secD');
  html += subRow('Terceirizados', 'te', comp.map(c => c.te), 'secD');
  html += subRow('Utilidades', 'ut', comp.map(c => c.ut), 'secD');
  html += subRow('Tributos', 'tr', comp.map(c => c.tr), 'secD');
  html += `<tr class="r-res"><td>= Resultado Operacional (A+B+C+D)</td>${cells(comp.map(c => c.resOp))}</tr>`;
  html += `<tr class="r-sp"><td colspan="${comp.length + (showAV ? comp.length : 0) + (showAH ? comp.length : 0) + 2}"></td></tr>`;
  html += secRow('E · Atividade de Investimento', 'recfin', comp.map(c => c.E), 'secE');
  html += subRow('Receitas Financeiras', 'recfin', comp.map(c => c.recfin), 'secE');
  html += subRow('Investimentos', 'inv', comp.map(c => Math.abs(c.inv)), 'secE');
  html += `<tr class="r-sp"><td colspan="${comp.length + (showAV ? comp.length : 0) + (showAH ? comp.length : 0) + 2}"></td></tr>`;
  html += secRow('F · Atividade de Financiamento', 'fin', comp.map(c => c.fin), 'secF');
  html += subRow('Financiamento', 'fin', comp.map(c => Math.abs(c.fin)), 'secF');
  html += `<tr class="r-res"><td>= Resultado Líquido do Período</td>${cells(comp.map(c => c.resultadoLiq))}</tr>`;

  body.innerHTML = html;
}

function toggleSection(id) {
  const rows = document.querySelectorAll('.sec-' + id);
  const icon = document.getElementById('ti-' + id);
  const isOpen = icon.textContent === '⊟';
  rows.forEach(r => r.classList.toggle('hidden', isOpen));
  if (isOpen) { (SECTION_KEYS[id] || []).forEach(key => { document.querySelectorAll('.child-' + key).forEach(r => r.classList.add('hidden')); const si = document.getElementById('icon-' + key); if (si) si.textContent = '⊞'; }); }
  icon.textContent = isOpen ? '⊞' : '⊟';
}

function toggleGroup(key) {
  const rows = document.querySelectorAll('.child-' + key);
  const icon = document.getElementById('icon-' + key);
  if (!icon) return;
  const isOpen = icon.textContent === '⊟';
  rows.forEach(r => r.classList.toggle('hidden', isOpen));
  icon.textContent = isOpen ? '⊞' : '⊟';
}

function showDetailByNome(nome, key, onlyPeriod) {
  const fn = GROUP_FILTERS[key] || (() => false);
  const selectedItems = [];
  const periodsToShow = onlyPeriod ? [onlyPeriod] : selected;
  periodsToShow.forEach(period => { workingData().filter(r => effectivePeriod(r) === period && r.categoria_nome === nome && fn(r)).forEach(r => selectedItems.push(r)); });
  const total = selectedItems.reduce((s, r) => s + (r.tipo === 'Credit' ? r.valor : -r.valor), 0);
  const pais = { rb:'Receitas operacionais', ded:'Receitas operacionais', imp:'Receitas operacionais', cus:'Custos operacionais', da:'Despesas operacionais', te:'Despesas operacionais', ut:'Despesas operacionais', recfin:'Atividades de investimento', inv:'Atividades de investimento', fin:'Atividades de financiamento' };
  document.getElementById('p-pai').textContent = pais[key] || '';
  document.getElementById('p-nome').textContent = nome;
  document.getElementById('p-total').textContent = R(total);
  _renderDetailItems(selectedItems);
  document.getElementById('overlay').classList.add('open');
}

function showDetail(key) {
  const selectedItems = [];
  selected.forEach(period => { getItemsByKey(key, period).forEach(r => { if (effectivePeriod(r) === period) selectedItems.push(r); }); });
  const labels = { rb:'Receitas Operacionais', ded:'Deduções', imp:'Impostos sobre faturamento', cus:'Custos operacionais', da:'Despesas Administrativas', te:'Terceirizados', ut:'Utilidades', recfin:'Receitas e despesas financeiras', inv:'Investimento', fin:'Financiamento', dp:'Despesas Pessoais', tr:'Tributos', A:'Receitas Operacionais (total)', B:'Custos Operacionais (total)', C:'Despesas Operacionais (total)', E:'Atividade de Investimento (total)' };
  const pais = { rb:'Receitas operacionais', ded:'Receitas operacionais', imp:'Receitas operacionais', cus:'Custos operacionais', da:'Despesas operacionais', te:'Despesas operacionais', ut:'Despesas operacionais', recfin:'Atividades de investimento', inv:'Atividades de investimento', fin:'Atividades de financiamento', dp:'Despesas operacionais', tr:'Despesas operacionais' };
  const total = selectedItems.reduce((s, r) => s + (r.tipo === 'Credit' ? r.valor : -r.valor), 0);
  document.getElementById('p-pai').textContent = pais[key] || '';
  document.getElementById('p-nome').textContent = labels[key] || key;
  document.getElementById('p-total').textContent = R(total);
  _renderDetailItems(selectedItems);
  document.getElementById('overlay').classList.add('open');
}

function _renderDetailItems(selectedItems) {
  const byPeriod = {};
  selectedItems.forEach(r => { const p = effectivePeriod(r); if (!byPeriod[p]) byPeriod[p] = []; byPeriod[p].push(r); });
  let html = '';
  if (selectedItems.length === 0) html = '<p style="color:var(--muted);font-size:13px;text-align:center;padding:32px 0">Nenhum lançamento encontrado.</p>';
  Object.entries(byPeriod).sort().forEach(([p, rows]) => {
    const pt = rows.reduce((s, r) => s + (r.tipo === 'Credit' ? r.valor : -r.valor), 0);
    html += `<div class="pg"><div class="pg-lbl">${fmtP(p)} <span>${R(pt)}</span></div>`;
    rows.forEach(r => {
      const cr = r.tipo === 'Credit';
      html += `<div class="lanc"><div class="l-desc">${H(r.descricao?.trim() || '—')}</div><div class="l-meta"><div class="l-info">${r.fornecedor_nome ? `<span class="l-forn">${H(r.fornecedor_nome)}</span>` : ''}<span class="tag ${r.is_pago ? 'tg-p' : 'tg-n'}">${r.is_pago ? 'Pago' : 'Pendente'}</span>${r.due_date ? `<span class="l-date">Venc: ${r.due_date}</span>` : ''}</div><div class="l-val ${cr ? 'cr' : 'db'}">${cr ? '+' : '−'}${R(r.valor)}</div></div></div>`;
    });
    html += '</div>';
  });
  document.getElementById('p-body').innerHTML = html;
}

function setCentro(val) { centroFilter = val; initYearNav(); }

function initCentroDropdown() {
  const sel = document.getElementById('cc-select');
  const centros = [...new Set(DATA.map(r => r.centro_custo_nome).filter(Boolean))].sort();
  centros.forEach(c => { const opt = document.createElement('option'); opt.value = c; opt.textContent = c; sel.appendChild(opt); });
}

function setYear(yr) {
  const yrs = activeYears();
  activeYear = yr;
  document.getElementById('yr-label').textContent = yr;
  const i = yrs.indexOf(yr);
  document.getElementById('yr-prev').style.opacity = i === 0 ? '0.3' : '1';
  document.getElementById('yr-next').style.opacity = i === yrs.length - 1 ? '0.3' : '1';
  selected = activePeriods().filter(p => p.startsWith(yr + '-'));
  if (selected.length === 0) selected = [activePeriods()[activePeriods().length - 1] || ALL_PERIODS[0]];
  render();
}

function initYearNav() {
  const yrs = activeYears();
  const yr = yrs.includes(activeYear) ? activeYear : yrs[yrs.length - 1];
  setYear(yr);
}

function exportPDF() { window.print(); }

function exportCSV() {
  const comp = selected.map(p => ({ period: p, ...compute(p) }));
  const headers = ['Descrição', ...comp.map(c => fmtP(c.period)), 'Total'];
  const rows = [headers];
  function addRow(label, vals) { const tot = vals.reduce((s, v) => s + v, 0); rows.push([label, ...vals.map(v => Math.round(v)), Math.round(tot)]); }
  addRow('RECEITAS OPERACIONAIS (A)', comp.map(c => c.A));
  addRow('  Receitas Operacionais', comp.map(c => c.rb));
  addRow('DEDUÇÕES (B)', comp.map(c => c.B_ded));
  addRow('  Deduções', comp.map(c => -c.ded));
  addRow('  Impostos sobre faturamento', comp.map(c => -c.imp));
  addRow('(=) Receita Líquida', comp.map(c => c.receitaLiquida));
  addRow('CUSTOS OPERACIONAIS (C)', comp.map(c => c.B));
  addRow('  Custos operacionais', comp.map(c => -c.cus));
  addRow('Margem de contribuição', comp.map(c => c.margem));
  addRow('DESPESAS OPERACIONAIS (D)', comp.map(c => c.D_desp));
  addRow('  Despesas Pessoais', comp.map(c => -c.dp));
  addRow('  Despesas Administrativas', comp.map(c => -c.da));
  addRow('  Terceirizados', comp.map(c => -c.te));
  addRow('  Utilidades', comp.map(c => -c.ut));
  addRow('  Tributos', comp.map(c => -c.tr));
  addRow('RESULTADO OPERACIONAL', comp.map(c => c.resOp));
  addRow('ATIVIDADE DE INVESTIMENTO (E)', comp.map(c => c.E));
  addRow('ATIVIDADE DE FINANCIAMENTO (F)', comp.map(c => c.fin));
  addRow('RESULTADO LÍQUIDO DO PERÍODO', comp.map(c => c.resultadoLiq));
  const csv = rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? '"' + v + '"' : v).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `DRE_${activeYear || ''}_${viewMode}_${basisMode}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function toggleAV() { if (showAV) { showAV = false; } else { showAV = true; showAH = false; } document.getElementById('btn-av').classList.toggle('on', showAV); document.getElementById('btn-ah').classList.toggle('on', showAH); render(); }
function toggleAH() { if (showAH) { showAH = false; } else { showAH = true; showAV = false; } document.getElementById('btn-av').classList.toggle('on', showAV); document.getElementById('btn-ah').classList.toggle('on', showAH); render(); }

function renderChart(comp) {
  const ctx = document.getElementById('main-chart').getContext('2d');
  if (chartInst) chartInst.destroy();
  const labels = comp.map(c => fmtP(c.period));
  const rb = comp.map(c => c.rb);
  const desp = comp.map(c => Math.abs(c.C_cus) + Math.abs(c.D_desp) + Math.abs(c.B_ded) + Math.abs(c.inv));
  const ebit = comp.map(c => c.resOp);
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [
      { type:'bar', label:'Receita Bruta', data:rb, backgroundColor:'rgba(39,174,96,.75)', borderColor:'#1B7A3E', borderWidth:1, borderRadius:4, order:2 },
      { type:'bar', label:'Despesas Totais', data:desp, backgroundColor:'rgba(192,57,43,.72)', borderColor:'#C0392B', borderWidth:1, borderRadius:4, order:2 },
      { type:'line', label:'Resultado Operacional', data:ebit, borderColor:'#162336', borderWidth:2.5, pointBackgroundColor:ebit.map(v => v >= 0 ? '#162336' : '#C0392B'), pointRadius:5, pointHoverRadius:7, fill:false, tension:.3, order:1 }
    ]},
    options: { responsive:true, maintainAspectRatio:false, plugins: { legend: { position:'bottom', labels: { font: { family:'Montserrat', size:12 }, padding:16, color:'#475569', boxWidth:12, boxHeight:12 } }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtN(ctx.raw).replace(/<[^>]+>/g, '') }, bodyFont: { family:'Montserrat', size:12 } } }, scales: { x: { grid: { display:false }, ticks: { font: { family:'Montserrat', size:12 }, color:'#475569' } }, y: { grid: { color:'rgba(0,0,0,.05)' }, ticks: { font: { family:'Montserrat', size:11 }, color:'#8896A8', callback: v => 'R$' + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } } } }
  });
}

function renderChartLiq(comp) {
  const ctx = document.getElementById('liq-chart').getContext('2d');
  if (chartLiqInst) chartLiqInst.destroy();
  const labels = comp.map(c => fmtP(c.period));
  const rb = comp.map(c => c.rb);
  const desp = comp.map(c => Math.abs(c.C_cus) + Math.abs(c.D_desp) + Math.abs(c.fin) + Math.abs(c.B_ded) + Math.abs(c.inv));
  const liq = comp.map(c => c.resultadoLiq);
  chartLiqInst = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [
      { type:'bar', label:'Receita Bruta', data:rb, backgroundColor:'rgba(39,174,96,.75)', borderColor:'#1B7A3E', borderWidth:1, borderRadius:4, order:2 },
      { type:'bar', label:'Despesas Totais', data:desp, backgroundColor:'rgba(192,57,43,.72)', borderColor:'#C0392B', borderWidth:1, borderRadius:4, order:2 },
      { type:'line', label:'Resultado Líquido', data:liq, borderColor:'#162336', borderWidth:2.5, pointBackgroundColor:liq.map(v => v >= 0 ? '#162336' : '#C0392B'), pointRadius:5, pointHoverRadius:7, fill:false, tension:.3, order:1 }
    ]},
    options: { responsive:true, maintainAspectRatio:false, plugins: { legend: { position:'bottom', labels: { font: { family:'Montserrat', size:12 }, padding:16, color:'#475569', boxWidth:12, boxHeight:12 } }, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ': ' + fmtN(ctx.raw).replace(/<[^>]+>/g, '') }, bodyFont: { family:'Montserrat', size:12 } } }, scales: { x: { grid: { display:false }, ticks: { font: { family:'Montserrat', size:12 }, color:'#475569' } }, y: { grid: { color:'rgba(0,0,0,.05)' }, ticks: { font: { family:'Montserrat', size:11 }, color:'#8896A8', callback: v => 'R$' + (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) } } } }
  });
}
