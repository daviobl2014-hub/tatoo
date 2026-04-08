/* ============================================
   PAINEL ADMIN — LÓGICA
   ============================================ */

const ALERT_FIELDS = [
  { key: 'drogas', label: 'Álcool/drogas', warn: false },
  { key: 'gravida', label: 'Grávida', warn: false },
  { key: 'hiv', label: 'HIV', warn: false },
  { key: 'hepatite', label: 'Hepatite', warn: false },
  { key: 'hemofilia', label: 'Hemofilia', warn: false },
  { key: 'cardiopata', label: 'Cardiopata', warn: true },
  { key: 'anticoagulante', label: 'Anticoagulante', warn: true },
  { key: 'isotretinoina', label: 'Isotretinoína', warn: true },
];

let allFichas = [];

async function loadFichas() {
  try {
    const res = await fetch('/api/fichas');
    if (!res.ok) throw new Error('Erro ao carregar');
    allFichas = await res.json();
    renderFichas(allFichas);
    renderStats(allFichas);
    document.getElementById('totalCount').textContent = allFichas.length;
  } catch (err) {
    document.getElementById('fichasBody').innerHTML = `
      <tr><td colspan="10" class="empty">Erro ao carregar fichas: ${err.message}</td></tr>
    `;
  }
}

function renderStats(fichas) {
  const today = new Date().toDateString();
  const todayCount = fichas.filter(f => new Date(f.createdAt).toDateString() === today).length;
  const alertCount = fichas.filter(f => getAlerts(f).length > 0).length;

  document.getElementById('statTotal').textContent = fichas.length;
  document.getElementById('statToday').textContent = todayCount;
  document.getElementById('statAlerts').textContent = alertCount;
}

function getAlerts(ficha) {
  return ALERT_FIELDS.filter(a => ficha[a.key] === 'sim');
}

function renderFichas(fichas) {
  const tbody = document.getElementById('fichasBody');
  if (fichas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty">Nenhuma ficha registrada ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = fichas.map(f => {
    const alerts = getAlerts(f);
    const alertsHtml = alerts.length
      ? alerts.map(a => `<span class="badge ${a.warn ? 'badge--warn' : ''}">${a.label}</span>`).join('')
      : '<span style="color:var(--ink-faint);font-size:11px">—</span>';

    const date = new Date(f.createdAt);
    const dateStr = date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return `
      <tr onclick="window.location.href='/admin/${f.id}'">
        <td class="col-id">#${String(f.id).padStart(4, '0')}</td>
        <td class="col-date">${dateStr}</td>
        <td class="col-name">${escapeHtml(f.nome)}</td>
        <td class="col-cpf">${escapeHtml(f.cpf)}</td>
        <td class="col-phone">${escapeHtml(f.whatsapp)}</td>
        <td><span class="tipo-pill">${escapeHtml(f.tipo || '—')}</span></td>
        <td>${escapeHtml(f.localCorpo || '—')}</td>
        <td>${f.valor ? 'R$ ' + escapeHtml(f.valor) : '—'}</td>
        <td><div class="col-alerts">${alertsHtml}</div></td>
        <td><button class="btn-ghost" onclick="event.stopPropagation();window.location.href='/admin/${f.id}'">Ver</button></td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Busca
document.getElementById('searchBox').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) {
    renderFichas(allFichas);
    return;
  }
  const filtered = allFichas.filter(f =>
    f.nome.toLowerCase().includes(q) ||
    f.cpf.toLowerCase().includes(q) ||
    f.whatsapp.toLowerCase().includes(q)
  );
  renderFichas(filtered);
});

// Init
loadFichas();

// Auto-refresh a cada 30s
setInterval(loadFichas, 30000);
