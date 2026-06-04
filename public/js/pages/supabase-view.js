let sbPage = 0;
const SB_PAGE_SIZE = 50;
let sbFiltered = [];

function sbFmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
}

function sbFmtVal(v) {
  return Number(v).toLocaleString('pt-BR', { style:'currency', currency:'BRL' });
}

function sbStatusBadge(r) {
  const today = new Date().toISOString().slice(0, 10);
  if (r.is_pago) return '<span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#E6F4EE;color:var(--pos)">Pago</span>';
  if (r.due_date && r.due_date < today) return '<span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#FCEAEA;color:var(--neg)">Vencido</span>';
  return '<span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#FFF8EC;color:#7A4F00">Pendente</span>';
}

function sbInit() {
  const sel = document.getElementById('sb-periodo');
  if (sel && sel.options.length <= 1) {
    const periodos = [...new Set(DATA.map(r => r.competencia).filter(Boolean))].sort().reverse();
    periodos.forEach(p => {
      const o = document.createElement('option');
      o.value = p;
      const [y, m] = p.split('-');
      o.textContent = `${MONTHS[+m - 1]}/${y}`;
      sel.appendChild(o);
    });
  }

  const total = DATA.length;
  const receitas = DATA.filter(r => r.tipo === 'Credit').reduce((s, r) => s + r.valor, 0);
  const despesas = DATA.filter(r => r.tipo === 'Debit').reduce((s, r) => s + r.valor, 0);
  const resultado = receitas - despesas;

  document.getElementById('sb-kpi-total').textContent = total.toLocaleString('pt-BR');
  document.getElementById('sb-kpi-rec').textContent = sbFmtVal(receitas);
  document.getElementById('sb-kpi-desp').textContent = sbFmtVal(despesas);
  const resEl = document.getElementById('sb-kpi-result');
  resEl.textContent = sbFmtVal(resultado);
  resEl.style.color = resultado >= 0 ? 'var(--pos)' : 'var(--neg)';

  const upd = document.getElementById('sb-last-update');
  if (upd) upd.textContent = `Atualizado: ${new Date().toLocaleString('pt-BR')}`;

  sbPage = 0;
  sbRender();
}

function sbGetFiltered() {
  const busca = (document.getElementById('sb-busca')?.value || '').toLowerCase();
  const tipo = document.getElementById('sb-tipo')?.value || '';
  const status = document.getElementById('sb-status')?.value || '';
  const periodo = document.getElementById('sb-periodo')?.value || '';
  const today = new Date().toISOString().slice(0, 10);

  return DATA.filter(r => {
    if (tipo && r.tipo !== tipo) return false;
    if (periodo && r.competencia !== periodo) return false;
    if (status === 'pago' && !r.is_pago) return false;
    if (status === 'pendente' && (r.is_pago || (r.due_date && r.due_date < today))) return false;
    if (status === 'vencido' && (r.is_pago || !r.due_date || r.due_date >= today)) return false;
    if (busca && !`${r.descricao || ''} ${r.fornecedor_nome || ''}`.toLowerCase().includes(busca)) return false;
    return true;
  }).sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''));
}

function sbRender() {
  sbFiltered = sbGetFiltered();
  const total = sbFiltered.length;
  const start = sbPage * SB_PAGE_SIZE;
  const page = sbFiltered.slice(start, start + SB_PAGE_SIZE);
  const tbody = document.getElementById('sb-tbody');
  if (!tbody) return;

  tbody.innerHTML = page.map((r, i) => {
    const bg = i % 2 === 0 ? '#fff' : '#FAFBFD';
    const cor = r.tipo === 'Credit' ? 'var(--pos)' : 'var(--neg)';
    const tipoLabel = r.tipo === 'Credit'
      ? '<span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#E6F4EE;color:var(--pos)">Receita</span>'
      : '<span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:#FCEAEA;color:var(--neg)">Despesa</span>';
    const cat = (r.categoria_nome || '—').replace(/^[^-]+ - /, '');
    return `<tr style="background:${bg};border-bottom:1px solid var(--border)">
      <td style="padding:10px 14px;white-space:nowrap;color:var(--mid)">${sbFmtDate(r.due_date)}</td>
      <td style="padding:10px 14px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.descricao || '—'}</td>
      <td style="padding:10px 14px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--mid)">${r.fornecedor_nome || '—'}</td>
      <td style="padding:10px 14px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px">${cat}</td>
      <td style="padding:10px 14px;text-align:center">${tipoLabel}</td>
      <td style="padding:10px 14px;text-align:center">${sbStatusBadge(r)}</td>
      <td style="padding:10px 14px;text-align:right;font-family:'DM Mono',monospace;font-weight:600;color:${cor};white-space:nowrap">${sbFmtVal(r.valor)}</td>
    </tr>`;
  }).join('');

  const pages = Math.ceil(total / SB_PAGE_SIZE);
  document.getElementById('sb-count').textContent = `${total.toLocaleString('pt-BR')} registros`;
  document.getElementById('sb-page-info').textContent = `Página ${sbPage + 1} de ${pages || 1}`;
  document.getElementById('sb-prev').disabled = sbPage === 0;
  document.getElementById('sb-next').disabled = sbPage >= pages - 1;
  document.getElementById('sb-prev').style.opacity = sbPage === 0 ? '0.4' : '1';
  document.getElementById('sb-next').style.opacity = sbPage >= pages - 1 ? '0.4' : '1';
}

function sbNextPage() { sbPage++; sbRender(); window.scrollTo(0, 0); }
function sbPrevPage() { if (sbPage > 0) { sbPage--; sbRender(); window.scrollTo(0, 0); } }
function sbResetFiltros() {
  ['sb-busca','sb-tipo','sb-status','sb-periodo'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  sbPage = 0;
  sbRender();
}
