const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtP(p) {
  if (!p || !p.includes('-')) return p || '';
  const [y, m] = p.split('-');
  return MONTHS[+m - 1] + '/' + y.slice(2);
}

function H(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function R(v) {
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 });
}

function fmtN(v) {
  if (v === null || v === undefined || Math.abs(v) < 0.005) return '<span class="zero">0</span>';
  const abs = Math.round(Math.abs(v));
  const str = abs.toLocaleString('pt-BR');
  if (v < 0) return '<span class="neg">(' + str + ')</span>';
  return str;
}

function fmtPctRow(v) {
  if (!isFinite(v) || Math.abs(v) < 0.005) return '<span class="zero">0 %</span>';
  return Math.round(v) + ' %';
}

function fmtK(v) {
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1).replace('.', ',') + 'M';
  if (Math.abs(v) >= 1000) return (v / 1000).toFixed(0).replace('.', ',') + 'k';
  return fmtN(v).replace(/<[^>]+>/g, '');
}

const rFmtDate = d => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y.slice(2)}`;
};

const rFmtVal = v => v.toLocaleString('pt-BR', { style:'currency', currency:'BRL', minimumFractionDigits:2 });

const rTodayStr = new Date().toISOString().slice(0, 10);
