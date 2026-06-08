let DATA = [];
let ALL_PERIODS = [];
let selected = [];
let AJUSTES_ENRICHED = []; // itens de ajuste (descontos, juros, multas) da lancamentos_categorias

function renderContas(contas) {
  const list = document.getElementById('r-saldo-list');
  const totalEl = document.getElementById('r-saldo-total');
  if (!list) return;
  if (!contas || contas.length === 0) {
    list.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:8px 0">Nenhuma conta disponível</div>';
    return;
  }
  const ativas = contas.filter(c => c.ativa);
  const total = ativas.reduce((s, c) => s + (c.saldo_atual || 0), 0);
  if (totalEl) totalEl.textContent = total.toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
  list.innerHTML = contas.map(c => {
    const cor = c.ativa ? '#4A90D9' : '#ccc';
    const op = c.ativa ? '1' : '0.5';
    const valColor = (c.saldo_atual || 0) < 0 ? 'color:var(--neg)' : '';
    const val = (c.saldo_atual || 0).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
    return `<div class="r-account-row" style="opacity:${op}">
      <div class="r-account-name"><span class="r-chk" style="background:${cor};flex-shrink:0"></span><span class="r-account-name-text" title="${c.nome}">${c.nome}</span></div>
      <div class="r-account-val" style="${valColor}">${val}</div>
    </div>`;
  }).join('');
}

function navTo(section, el) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + section).classList.add('active');
  document.querySelectorAll('.site-nav a').forEach(a => a.classList.remove('active'));
  if (el) el.classList.add('active');

  if (section === 'resumo') {
    setTimeout(() => { rInitFluxo(); rRenderBadges(); rRenderTxn('rec', 'prox'); rRenderTxn('pag', 'prox'); }, 50);
  }
  if (section === 'agentes') agInit();
  if (section === 'receitas') recInit();
  if (section === 'relatorios') relInit();
  if (section === 'painel') {
    setTimeout(() => {
      if (typeof renderChart === 'function' && typeof selected !== 'undefined') {
        const comp = selected.map(p => ({ period: p, ...compute(p) }));
        renderChart(comp); renderChartLiq(comp);
      }
    }, 100);
  }
}

(async function init() {
  try {
    const [lancamentos, contas, cliente, ajustes] = await Promise.all([
      fetchLancamentos(count => {
        const el = document.getElementById('loading-count');
        if (el) el.textContent = count + ' registros carregados...';
      }),
      fetchContas(),
      fetchCliente(),
      fetchAjustes()
    ]);

    DATA = lancamentos;
    ALL_PERIODS = [...new Set(DATA.map(r => r.competencia))].filter(Boolean).sort();
    selected = [...ALL_PERIODS];
    renderContas(contas);

    // Enriquecer ajustes com datas do lancamento pai (via schedule_id)
    const scheduleMap = {};
    DATA.forEach(r => { if (r.schedule_id) scheduleMap[r.schedule_id] = r; });
    AJUSTES_ENRICHED = ajustes.map(a => {
      const parent = scheduleMap[a.schedule_id];
      if (!parent) return null;
      return {
        ...parent,
        categoria_nome: a.categoria_nome,
        categoria_pai: a.categoria_pai,
        tipo: a.tipo === 'in' ? 'Credit' : 'Debit',
        valor: Math.abs(a.valor),
        _isAjuste: true
      };
    }).filter(Boolean);

    if (cliente) {
      const el = document.getElementById('hd-cliente-nome');
      if (el) el.textContent = cliente.nome;
    }
  } catch (e) {
    const errEl = document.getElementById('loading-error');
    if (errEl) { errEl.style.display = 'block'; errEl.textContent = 'Erro ao carregar dados: ' + e.message; }
    console.error(e);
    return;
  }

  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';

  initCentroDropdown();
  const _yrs = activeYears();
  const _currentYear = new Date().getFullYear().toString();
  // Prefere o ano atual se tiver dados, senão o mais recente com dados
  activeYear = _yrs.includes(_currentYear) ? _currentYear : (_yrs.length ? _yrs[_yrs.length - 1] : null);
  initYearNav();

  // Posicionar Fluxo de Caixa no trimestre mais recente que tem dados pagos
  (function findFluxoQuarter() {
    const now = new Date();
    for (let offset = 0; offset >= -16; offset--) {
      const q  = Math.floor(now.getMonth() / 3) + offset;
      const yr = now.getFullYear() + Math.floor(q / 4);
      const qn = ((q % 4) + 4) % 4;
      const s  = qn * 3;
      const start = new Date(yr, s, 1).toISOString().slice(0, 10);
      const end   = new Date(yr, s + 3, 0).toISOString().slice(0, 10);
      if (DATA.some(r => r.is_pago && r.due_date >= start && r.due_date <= end)) {
        rFluxoQ = offset;
        break;
      }
    }
  })();

  // Resumo inicial
  setTimeout(() => { rInitFluxo(); rRenderBadges(); rRenderTxn('rec', 'prox'); rRenderTxn('pag', 'prox'); }, 100);

  // Eventos do painel
  document.getElementById('yr-prev').addEventListener('click', () => { const yrs = activeYears(), i = yrs.indexOf(activeYear); if (i > 0) setYear(yrs[i - 1]); });
  document.getElementById('yr-next').addEventListener('click', () => { const yrs = activeYears(), i = yrs.indexOf(activeYear); if (i < yrs.length - 1) setYear(yrs[i + 1]); });
  document.querySelectorAll('[data-basis]').forEach(ro => { ro.addEventListener('click', () => { document.querySelectorAll('[data-basis]').forEach(r => r.classList.remove('active')); ro.classList.add('active'); basisMode = ro.dataset.basis; initYearNav(); }); });
  document.querySelectorAll('[data-visao]').forEach(ro => { ro.addEventListener('click', () => { document.querySelectorAll('[data-visao]').forEach(r => r.classList.remove('active')); ro.classList.add('active'); viewMode = ro.dataset.visao; initYearNav(); }); });

  // Detail panel
  document.getElementById('overlay').addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open'); });
  document.getElementById('pcl').addEventListener('click', () => document.getElementById('overlay').classList.remove('open'));
})();
