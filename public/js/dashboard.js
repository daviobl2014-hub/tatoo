/* ============================================
   DASHBOARD — dados derivados de agendamentos,
   clientes e fichas (sem modulo financeiro proprio:
   receita = soma dos "valores" dos agendamentos).
   ============================================ */

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const MONTHS_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const STYLE_COLORS = ['#c8102e', '#d4a04f', '#8a0a1f', '#6a6660', '#a8554f', '#4a9d5c', '#7a6f5f'];
const STATUS_LABEL = { agendado:'Aguardando', confirmado:'Confirmado', concluido:'Concluído', cancelado:'Cancelado' };

let agendamentos = [];
let clientes = [];
let fichas = [];
let weekStart = startOfWeek(new Date());

// ============ HELPERS ============
function escapeHtml(s){ if(s==null) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function pad(n){ return String(n).padStart(2,'0'); }
function startOfWeek(d){ const o=new Date(d); o.setHours(0,0,0,0); o.setDate(o.getDate()-o.getDay()); return o; }
function addDays(d,n){ const o=new Date(d); o.setDate(o.getDate()+n); return o; }
function initials(name){ const p=(name||'').trim().split(/\s+/); return ((p[0]&&p[0][0]||'')+(p.length>1?p[p.length-1][0]:'')).toUpperCase()||'?'; }

// "1.850,00" -> 1850.00 ; "500,00" -> 500 ; "" -> 0
function parseValor(v){
  if(!v) return 0;
  const n = parseFloat(String(v).replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,''));
  return isNaN(n) ? 0 : n;
}
function fmtBRL(n){
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function dateFromIso(iso){ const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); }
function inRange(iso, start, end){ if(!iso) return false; const dt=dateFromIso(iso); return dt>=start && dt<end; }
function isoOf(dateStr){ const d = new Date(dateStr); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }

// ============ LOAD ============
async function load(){
  try{
    const [ar, cr, fr] = await Promise.all([
      fetch('/api/agendamentos'),
      fetch('/api/clientes'),
      fetch('/api/fichas/full'),
    ]);
    agendamentos = ar.ok ? await ar.json() : [];
    clientes = cr.ok ? await cr.json() : [];
    fichas = fr.ok ? await fr.json() : [];
    render();
  }catch(err){
    console.error('Erro no dashboard:', err);
  }
}

// ============ RENDER ============
function render(){
  updateWeekLabel();
  const ws = weekStart, we = addDays(ws, 7);
  const pws = addDays(ws, -7), pwe = ws; // semana anterior

  const agSemana = agendamentos.filter(a => inRange(a.data, ws, we) && a.status !== 'cancelado');
  const agAnterior = agendamentos.filter(a => inRange(a.data, pws, pwe) && a.status !== 'cancelado');

  renderKpis(agSemana, agAnterior, ws, we, pws, pwe);
  renderChart(agSemana, ws);
  renderRanking(agSemana);
  renderDonut(agSemana);
  renderLocais();
  renderOrigem();
  renderAtividades();
}

// ---- KPIs ----
function delta(atual, anterior){
  if(anterior === 0) return atual > 0 ? { pct: 100, dir: 'up' } : { pct: 0, dir: 'flat' };
  const p = Math.round(((atual - anterior) / anterior) * 100);
  return { pct: Math.abs(p), dir: p > 0 ? 'up' : (p < 0 ? 'down' : 'flat') };
}
function deltaHtml(d){
  const arrow = d.dir === 'up' ? '↗' : d.dir === 'down' ? '↘' : '→';
  const cls = 'kpi__delta--' + d.dir;
  const txt = d.dir === 'flat' ? 'estável' : `${d.pct}%`;
  return `<div class="kpi__delta ${cls}">${arrow} ${txt} <small>vs. semana anterior</small></div>`;
}

function renderKpis(agSemana, agAnterior, ws, we, pws, pwe){
  const receita = agSemana.reduce((s,a)=>s+parseValor(a.valor),0);
  const receitaAnt = agAnterior.reduce((s,a)=>s+parseValor(a.valor),0);

  const qtd = agSemana.length;
  const qtdAnt = agAnterior.length;

  const novos = clientes.filter(c => inRange(isoOf(c.createdAt), ws, we)).length;
  const novosAnt = clientes.filter(c => inRange(isoOf(c.createdAt), pws, pwe)).length;

  const ticket = qtd ? receita / qtd : 0;
  const ticketAnt = qtdAnt ? receitaAnt / qtdAnt : 0;

  const cards = [
    { label:'Entrada (período)', val: fmtBRL(receita), d: delta(receita, receitaAnt), icon:
      '<path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    { label:'Agendamentos', val: String(qtd), d: delta(qtd, qtdAnt), icon:
      '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' },
    { label:'Novos clientes', val: String(novos), d: delta(novos, novosAnt), icon:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>' },
    { label:'Ticket médio', val: fmtBRL(ticket), d: delta(Math.round(ticket), Math.round(ticketAnt)), icon:
      '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' },
  ];

  document.getElementById('kpiRow').innerHTML = cards.map(c => `
    <div class="kpi">
      <span class="kpi__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg></span>
      <div class="kpi__body">
        <div class="kpi__label">${c.label}</div>
        <div class="kpi__val">${c.val}</div>
        ${deltaHtml(c.d)}
      </div>
    </div>
  `).join('');
}

// ---- CHART (entrada por dia) ----
function renderChart(agSemana, ws){
  const dias = [];
  for(let i=0;i<7;i++){
    const d = addDays(ws, i);
    const iso = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const total = agSemana.filter(a=>a.data===iso).reduce((s,a)=>s+parseValor(a.valor),0);
    dias.push({ d, total });
  }
  const max = Math.max(...dias.map(x=>x.total), 1);
  const W = 700, H = 240, padL = 10, padR = 10, padT = 30, padB = 40;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const stepX = innerW / 6;
  const pts = dias.map((x,i)=>({
    x: padL + i*stepX,
    y: padT + innerH - (x.total/max)*innerH,
    d: x.d, total: x.total,
  }));
  const linePath = pts.map((p,i)=>`${i===0?'M':'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[6].x},${padT+innerH} L${pts[0].x},${padT+innerH} Z`;
  const peakIdx = dias.reduce((mi,x,i,arr)=> x.total>arr[mi].total?i:mi, 0);

  document.getElementById('chartEntrada').innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img">
      <defs><linearGradient id="gradEntrada" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#c8102e" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#c8102e" stop-opacity="0"/>
      </linearGradient></defs>
      <path class="chart-area" d="${areaPath}"/>
      <path class="chart-line" d="${linePath}"/>
      ${pts.map((p,i)=>`
        <g class="${i===peakIdx && p.total>0 ? 'chart-peak':''}">
          <circle class="chart-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4"/>
          ${p.total>0 ? `<text class="chart-val" x="${p.x.toFixed(1)}" y="${(p.y-12).toFixed(1)}">R$ ${Math.round(p.total).toLocaleString('pt-BR')}</text>` : ''}
          <text class="chart-xlabel" x="${p.x.toFixed(1)}" y="${H-18}">${pad(p.d.getDate())}/${pad(p.d.getMonth()+1)}</text>
          <text class="chart-xday" x="${p.x.toFixed(1)}" y="${H-5}">${WEEKDAYS[i]}</text>
        </g>
      `).join('')}
    </svg>
  `;

  const total = dias.reduce((s,x)=>s+x.total,0);
  const diasComMov = dias.filter(x=>x.total>0).length;
  const media = diasComMov ? total/diasComMov : 0;
  const melhor = dias[peakIdx];
  document.getElementById('chartSummary').innerHTML = `
    <div><div class="csum__label">Total da semana</div><div class="csum__val">${fmtBRL(total)}</div></div>
    <div><div class="csum__label">Melhor dia</div><div class="csum__val">${melhor.total>0 ? `${pad(melhor.d.getDate())}/${pad(melhor.d.getMonth()+1)} <small>(${WEEKDAYS[peakIdx]})</small>` : '—'}</div></div>
    <div><div class="csum__label">Média diária</div><div class="csum__val">${fmtBRL(media)}</div></div>
  `;
}

// ---- RANKING (por receita) ----
function renderRanking(agSemana){
  const map = {};
  for(const a of agSemana){
    const nome = a.cliente || 'Sem nome';
    map[nome] = (map[nome]||0) + parseValor(a.valor);
  }
  const top = Object.entries(map).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const el = document.getElementById('ranking');
  if(!top.length){ el.innerHTML = '<p class="empty">Sem receita registrada nesta semana.</p>'; return; }
  el.innerHTML = top.map(([nome,val],i)=>`
    <div class="rank-row">
      <span class="rank-pos">${i+1}</span>
      <span class="rank-avatar">${escapeHtml(initials(nome))}</span>
      <span class="rank-name">${escapeHtml(nome)}</span>
      <span class="rank-val">${fmtBRL(val)}</span>
    </div>
  `).join('');
}

// ---- DONUT (estilos) ----
function renderDonut(agSemana){
  const map = {};
  for(const a of agSemana){ const t=a.tipo||'Outros'; map[t]=(map[t]||0)+1; }
  let entries = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const total = entries.reduce((s,[,c])=>s+c,0);
  const el = document.getElementById('donutWrap');
  if(!total){ el.innerHTML = '<p class="empty">Nenhum atendimento nesta semana.</p>'; return; }

  if(entries.length > 6){
    const head = entries.slice(0,5);
    const restCount = entries.slice(5).reduce((s,[,c])=>s+c,0);
    entries = [...head, ['Outros', restCount]];
  }

  let acc = 0;
  const stops = entries.map(([,count],i)=>{
    const start = (acc/total)*360;
    acc += count;
    const end = (acc/total)*360;
    return `${STYLE_COLORS[i % STYLE_COLORS.length]} ${start.toFixed(1)}deg ${end.toFixed(1)}deg`;
  }).join(', ');

  el.innerHTML = `
    <div class="donut" style="background: conic-gradient(${stops})">
      <div class="donut__center">
        <div class="donut__total">${total}</div>
        <div class="donut__total-label">Total</div>
      </div>
    </div>
    <div class="donut-legend">
      ${entries.map(([name,count],i)=>{
        const pct = Math.round((count/total)*100);
        return `<div class="dleg">
          <span class="dleg__dot" style="background:${STYLE_COLORS[i % STYLE_COLORS.length]}"></span>
          <span class="dleg__name">${escapeHtml(name)}</span>
          <span class="dleg__count">${count}</span>
          <span class="dleg__pct">${pct}%</span>
        </div>`;
      }).join('')}
    </div>
  `;
}

// ---- LOCALIZACOES (bairro + cidade, ranqueado por nº de pessoas) ----
function renderLocais(){
  const map = {}; // chave -> { bairro, cidade, count }
  for(const f of fichas){
    const bairro = (f.bairro || '').trim();
    const cidade = (f.cidade || '').trim();
    if(!bairro && !cidade) continue;
    const chave = `${bairro.toLowerCase()}|${cidade.toLowerCase()}`;
    if(!map[chave]) map[chave] = { bairro, cidade, count: 0 };
    map[chave].count++;
  }
  let entries = Object.values(map).sort((a,b)=> b.count - a.count);
  const total = entries.reduce((s,e)=>s+e.count,0);
  const el = document.getElementById('locList');
  if(!total){ el.innerHTML = '<p class="empty">Sem bairro/cidade preenchidos nas fichas ainda.</p>'; return; }

  // top 5 + agrupa o resto em "Outros"
  if(entries.length > 5){
    const head = entries.slice(0,4);
    const restCount = entries.slice(4).reduce((s,e)=>s+e.count,0);
    entries = [...head, { bairro:'Outros', cidade:'', count: restCount }];
  }
  const max = Math.max(...entries.map(e=>e.count));

  el.innerHTML = entries.map(e=>{
    const pct = Math.round((e.count/total)*100);
    const w = Math.round((e.count/max)*100);
    const principal = e.bairro || e.cidade || '—';
    const sub = (e.bairro && e.cidade) ? e.cidade : '';
    return `<div class="loc-row">
      <span class="loc-name">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <span class="loc-text">
          <span class="loc-bairro">${escapeHtml(principal)}</span>
          ${sub ? `<span class="loc-cidade">${escapeHtml(sub)}</span>` : ''}
        </span>
      </span>
      <span class="loc-bar"><span class="loc-bar__fill" style="width:${w}%"></span></span>
      <span class="loc-pct">${pct}% <small>${e.count}</small></span>
    </div>`;
  }).join('');
}

// ---- COMO NOS CONHECEU (origem do cadastro) ----
function renderOrigem(){
  const map = {};
  for(const c of clientes){
    const o = (c.origem || '').trim();
    if(!o) continue;
    map[o] = (map[o]||0) + 1;
  }
  let entries = Object.entries(map).sort((a,b)=> b[1]-a[1]);
  const total = entries.reduce((s,[,n])=>s+n,0);
  const el = document.getElementById('origemList');
  if(!total){ el.innerHTML = '<p class="empty">Sem origem informada nas fichas ainda.</p>'; return; }

  if(entries.length > 5){
    const head = entries.slice(0,4);
    const rest = entries.slice(4).reduce((s,[,n])=>s+n,0);
    entries = [...head, ['Outros', rest]];
  }
  const max = Math.max(...entries.map(([,n])=>n));
  el.innerHTML = entries.map(([nome,n])=>{
    const pct = Math.round((n/total)*100);
    const w = Math.round((n/max)*100);
    return `<div class="loc-row">
      <span class="loc-name">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>
        <span class="loc-text"><span class="loc-bairro">${escapeHtml(nome)}</span></span>
      </span>
      <span class="loc-bar"><span class="loc-bar__fill" style="width:${w}%"></span></span>
      <span class="loc-pct">${pct}% <small>${n}</small></span>
    </div>`;
  }).join('');
}

// ---- ATIVIDADES (agendamentos recentes) ----
function renderAtividades(){
  const recent = [...agendamentos]
    .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0,6);
  const el = document.getElementById('activity');
  if(!recent.length){ el.innerHTML = '<p class="empty">Nenhuma atividade ainda.</p>'; return; }
  el.innerHTML = recent.map(a=>{
    const dt = new Date(a.createdAt);
    const quando = `${pad(dt.getDate())}/${pad(dt.getMonth()+1)} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    const [, m, d] = (a.data||'--').split('-');
    return `<div class="act-row">
      <span class="act-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>
      <div class="act-body">
        <div class="act-title">${escapeHtml(a.cliente)}</div>
        <div class="act-sub">${escapeHtml(a.tipo||'—')} &middot; ${d?`${d}/${m}`:'—'} ${escapeHtml(a.horario||'')} &middot; ${STATUS_LABEL[a.status]||a.status}</div>
      </div>
      <div class="act-meta">
        <div class="act-val">${a.valor ? fmtBRL(parseValor(a.valor)) : '—'}</div>
        <div class="act-time">${quando}</div>
      </div>
    </div>`;
  }).join('');
}

// ---- WEEK NAV ----
function updateWeekLabel(){
  const end = addDays(weekStart, 6);
  const sm = MONTHS_SHORT[weekStart.getMonth()], em = MONTHS_SHORT[end.getMonth()];
  const y = end.getFullYear();
  document.getElementById('weekRangeText').textContent =
    sm===em ? `${weekStart.getDate()} – ${end.getDate()} ${sm} ${y}`
            : `${weekStart.getDate()} ${sm} – ${end.getDate()} ${em} ${y}`;
}
document.getElementById('prevWeek').addEventListener('click', ()=>{ weekStart = addDays(weekStart,-7); render(); });
document.getElementById('nextWeek').addEventListener('click', ()=>{ weekStart = addDays(weekStart,7); render(); });

// ============ INIT ============
load();
