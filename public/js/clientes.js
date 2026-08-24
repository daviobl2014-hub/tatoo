/* ============================================
   CLIENTES — lista a partir de /api/clientes
   (Cliente e a entidade central; ficha e agenda ligam a ele)
   ============================================ */

const MONTHS_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

let clientes = [];
let agendamentos = [];

const state = {
  search: '',
  status: 'all',
  sort: 'nome-az',
  page: 1,
  perPage: 10,
  weekStart: startOfWeek(new Date()),
};

// ============ HELPERS ============
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function pad(n) { return String(n).padStart(2, '0'); }
function startOfWeek(d) { const o = new Date(d); o.setHours(0,0,0,0); o.setDate(o.getDate() - o.getDay()); return o; }
function addDays(d, n) { const o = new Date(d); o.setDate(o.getDate() + n); return o; }
function initials(name) {
  const p = (name || '').trim().split(/\s+/);
  return ((p[0] && p[0][0] || '') + (p.length > 1 ? p[p.length-1][0] : '')).toUpperCase() || '?';
}
function fmtDateBR(iso) { if (!iso) return ''; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; }

function maskPhone(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 10) return v.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_,a,b,c)=>[a&&`(${a})`,b,c].filter(Boolean).join(' '));
  return v.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (_,a,b,c)=>[a&&`(${a})`,b,c].filter(Boolean).join(' '));
}
function maskCPF(v) {
  return v.replace(/\D/g,'').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2').slice(0,14);
}

// ============ LOAD ============
async function load() {
  try {
    const [cr, ar] = await Promise.all([
      fetch('/api/clientes'),
      fetch('/api/agendamentos'),
    ]);
    clientes = cr.ok ? await cr.json() : [];
    agendamentos = ar.ok ? await ar.json() : [];
    updateWeekLabel();
    render();
  } catch (err) {
    document.getElementById('clientesBody').innerHTML =
      `<tr><td colspan="6" class="empty">Erro ao carregar: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// ============ STATS ============
function renderStats() {
  const total = clientes.length;
  document.getElementById('statTotal').textContent = total;

  const ws = state.weekStart, we = addDays(ws, 7);
  const idsComAgenda = new Set(
    agendamentos.filter(a => {
      if (!a.data) return false;
      const [y,m,d] = a.data.split('-').map(Number);
      const dt = new Date(y, m-1, d);
      return dt >= ws && dt < we;
    }).map(a => a.clienteId).filter(Boolean)
  );
  document.getElementById('statWeek').textContent = idsComAgenda.size;

  const recorrentes = clientes.filter(c => c.sessions > 1).length;
  document.getElementById('statRecorrentes').textContent = total ? `${Math.round((recorrentes/total)*100)}%` : '0%';

  if (clientes.length) {
    const latest = [...clientes].sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt))[0];
    const d = new Date(latest.createdAt);
    const isToday = d.toDateString() === new Date().toDateString();
    document.getElementById('statUltimo').textContent = isToday
      ? `Hoje, ${pad(d.getHours())}:${pad(d.getMinutes())}` : d.toLocaleDateString('pt-BR');
    document.getElementById('statUltimoNome').textContent = latest.nome;
  } else {
    document.getElementById('statUltimo').textContent = '--';
    document.getElementById('statUltimoNome').textContent = '—';
  }
}

// ============ FILTER + SORT ============
function getFiltered() {
  const q = state.search.toLowerCase().trim();
  let list = clientes.filter(c => {
    if (state.status !== 'all' && c.status !== state.status) return false;
    if (q) {
      const hay = `${c.nome} ${c.whatsapp} ${c.email || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  switch (state.sort) {
    case 'nome-az': list.sort((a,b)=> a.nome.localeCompare(b.nome,'pt-BR')); break;
    case 'nome-za': list.sort((a,b)=> b.nome.localeCompare(a.nome,'pt-BR')); break;
    case 'sessoes':  list.sort((a,b)=> b.sessions - a.sessions); break;
    case 'recente':  list.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt)); break;
  }
  return list;
}

// ============ RENDER ============
function render() {
  renderStats();
  const filtered = getFiltered();
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / state.perPage));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.perPage;
  const pageItems = filtered.slice(start, start + state.perPage);

  const tbody = document.getElementById('clientesBody');
  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Nenhum cliente encontrado.</td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map(renderRow).join('');
    attachRowEvents();
  }
  renderPagination(totalItems, totalPages, start, pageItems.length);
}

function renderRow(c) {
  const statusLabel = { ativo:'Ativo', aguardando:'Aguardando', inativo:'Inativo' }[c.status];
  const codigo = 'CL' + String(c.id).padStart(3,'0');
  const fichaTag = c.hasFicha
    ? '<span class="ficha-tag ficha-tag--ok">ficha ok</span>'
    : '<span class="ficha-tag ficha-tag--no">sem ficha</span>';

  const apptHtml = c.lastAppt
    ? `<div class="cli-appt">
         <span class="cli-appt__date">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
           ${fmtDateBR(c.lastAppt.data)} &bull; ${escapeHtml(c.lastAppt.horario)}
         </span>
         ${c.lastAppt.tipo ? `<span class="cli-appt__type">${escapeHtml(c.lastAppt.tipo)}</span>` : ''}
       </div>`
    : `<span class="cli-appt--none">Nenhum agendamento</span>`;

  return `
    <tr data-open="${c.id}">
      <td>
        <div class="cli-cell">
          <span class="cli-avatar">${escapeHtml(initials(c.nome))}</span>
          <div class="cli-info">
            <span class="cli-name">${escapeHtml(c.nome)}</span>
            <span class="cli-code">#${codigo} &middot; ${fichaTag}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="cli-contact">
          <span class="cli-contact__row is-phone">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            ${escapeHtml(c.whatsapp || '—')}
          </span>
          <span class="cli-contact__row">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>
            ${escapeHtml(c.email || '—')}
          </span>
        </div>
      </td>
      <td>${apptHtml}</td>
      <td>
        <div class="cli-sessions">
          <span class="cli-sessions__num">${c.sessions}</span>
          <span class="cli-sessions__label">${c.sessions === 1 ? 'sess&atilde;o' : 'sess&otilde;es'}</span>
        </div>
      </td>
      <td><span class="status-pill status--${c.status}">${statusLabel}</span></td>
      <td>
        <div class="cli-actions">
          <button class="icon-btn" data-view="${c.id}" title="Ver cliente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="icon-btn" data-edit="${c.id}" title="Editar cadastro">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="icon-btn icon-btn--danger" data-delete="${c.id}" data-nome="${escapeHtml(c.nome)}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function attachRowEvents() {
  const tbody = document.getElementById('clientesBody');
  const go = (id) => window.location.href = `/admin/clientes/${id}`;
  tbody.querySelectorAll('tr[data-open]').forEach(tr =>
    tr.addEventListener('click', () => go(tr.dataset.open)));
  tbody.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', (e) => { e.stopPropagation(); go(b.dataset.view); }));
  tbody.querySelectorAll('[data-edit]').forEach(b =>
    b.addEventListener('click', (e) => { e.stopPropagation(); openModal(parseInt(b.dataset.edit,10)); }));
  tbody.querySelectorAll('[data-delete]').forEach(b =>
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Excluir o cliente "${b.dataset.nome}"?\n\nIsso remove o cadastro e a ficha de anamnese (LGPD Art. 18). Os agendamentos ficam no histórico sem vínculo.`)) return;
      try {
        const res = await fetch(`/api/clientes/${b.dataset.delete}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Erro ao excluir');
        await load();
      } catch (err) { alert('Erro: ' + err.message); }
    }));
}

// ============ PAGINATION ============
function renderPagination(totalItems, totalPages, start, shown) {
  const from = totalItems ? start + 1 : 0;
  document.getElementById('pagInfo').textContent =
    `Mostrando ${from} a ${start + shown} de ${totalItems} clientes`;

  const cur = state.page;
  const nums = [];
  if (totalPages <= 7) { for (let i=1;i<=totalPages;i++) nums.push(i); }
  else {
    nums.push(1);
    if (cur > 3) nums.push('...');
    for (let i=Math.max(2,cur-1); i<=Math.min(totalPages-1,cur+1); i++) nums.push(i);
    if (cur < totalPages-2) nums.push('...');
    nums.push(totalPages);
  }
  let html = `<button class="page-btn" data-go="${cur-1}" ${cur===1?'disabled':''}>&#8249;</button>`;
  html += nums.map(n => n === '...'
    ? `<span class="page-ellipsis">…</span>`
    : `<button class="page-btn ${n===cur?'is-active':''}" data-go="${n}">${n}</button>`).join('');
  html += `<button class="page-btn" data-go="${cur+1}" ${cur===totalPages?'disabled':''}>&#8250;</button>`;
  const pages = document.getElementById('pagPages');
  pages.innerHTML = html;
  pages.querySelectorAll('[data-go]').forEach(b =>
    b.addEventListener('click', () => {
      const g = parseInt(b.dataset.go,10);
      if (g >= 1 && g <= totalPages) { state.page = g; render(); }
    }));
}

// ============ WEEK LABEL ============
function updateWeekLabel() {
  const end = addDays(state.weekStart, 6);
  const sm = MONTHS_SHORT[state.weekStart.getMonth()], em = MONTHS_SHORT[end.getMonth()];
  const y = end.getFullYear();
  document.getElementById('weekRangeText').textContent =
    sm === em ? `${state.weekStart.getDate()} – ${end.getDate()} ${sm}, ${y}`
              : `${state.weekStart.getDate()} ${sm} – ${end.getDate()} ${em}, ${y}`;
}

// ============ MODAL ============
const modal = document.getElementById('clienteModal');
const form = document.getElementById('clienteForm');

function openModal(id) {
  form.reset();
  document.getElementById('clienteId').value = id || '';
  document.getElementById('clienteModalTitle').textContent = id ? 'Editar cliente' : 'Novo cliente';
  if (id) {
    const c = clientes.find(x => x.id === id);
    if (c) {
      document.getElementById('cl_nome').value = c.nome || '';
      document.getElementById('cl_whatsapp').value = c.whatsapp || '';
      document.getElementById('cl_email').value = c.email || '';
      document.getElementById('cl_origem').value = c.origem || '';
      document.getElementById('cl_cpf').value = c.cpf || '';
      document.getElementById('cl_obs').value = c.obs || '';
    }
  }
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('cl_nome').focus();
}
function closeModal() { modal.hidden = true; document.body.style.overflow = ''; }

document.getElementById('openNewCliente').addEventListener('click', () => openModal());
document.getElementById('clienteModalClose').addEventListener('click', closeModal);
document.getElementById('clienteCancel').addEventListener('click', closeModal);
modal.querySelector('.modal__backdrop').addEventListener('click', closeModal);

document.getElementById('cl_whatsapp').addEventListener('input', (e)=> e.target.value = maskPhone(e.target.value));
document.getElementById('cl_cpf').addEventListener('input', (e)=> e.target.value = maskCPF(e.target.value));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('clienteId').value;
  const payload = {
    nome: document.getElementById('cl_nome').value.trim(),
    whatsapp: document.getElementById('cl_whatsapp').value.trim(),
    email: document.getElementById('cl_email').value.trim() || null,
    origem: document.getElementById('cl_origem').value || null,
    cpf: document.getElementById('cl_cpf').value.trim() || null,
    obs: document.getElementById('cl_obs').value.trim() || null,
  };
  if (!payload.nome || !payload.whatsapp) { alert('Nome e WhatsApp são obrigatórios.'); return; }

  const url = id ? `/api/clientes/${id}` : '/api/clientes';
  const method = id ? 'PUT' : 'POST';
  try {
    const res = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    if (!res.ok) { const er = await res.json().catch(()=>({})); throw new Error(er.error || 'Erro ao salvar'); }
    closeModal();
    await load();
  } catch (err) { alert('Erro: ' + err.message); }
});

// ============ FILTROS ============
document.getElementById('searchBox').addEventListener('input', (e)=>{ state.search = e.target.value; state.page = 1; render(); });
document.getElementById('filterStatus').addEventListener('change', (e)=>{ state.status = e.target.value; state.page = 1; render(); });
document.getElementById('sortBy').addEventListener('change', (e)=>{ state.sort = e.target.value; render(); });
document.getElementById('perPage').addEventListener('change', (e)=>{ state.perPage = parseInt(e.target.value,10); state.page = 1; render(); });
document.getElementById('prevWeek').addEventListener('click', ()=>{ state.weekStart = addDays(state.weekStart,-7); updateWeekLabel(); renderStats(); });
document.getElementById('nextWeek').addEventListener('click', ()=>{ state.weekStart = addDays(state.weekStart,7); updateWeekLabel(); renderStats(); });

// ============ INIT ============
load();
