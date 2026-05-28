const ALERT_FIELDS = [
  'drogas', 'gravida', 'hiv', 'hepatite',
  'hemofilia', 'cardiopata', 'anticoagulante', 'isotretinoina',
];

function updateClock() {
  const now = new Date();
  document.getElementById('clock').textContent =
    now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
updateClock();
setInterval(updateClock, 30000);

const now = new Date();
document.getElementById('hubDate').textContent =
  now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

async function loadHub() {
  try {
    const [fichasRes, agendRes] = await Promise.all([
      fetch('/api/fichas'),
      fetch('/api/agendamentos'),
    ]);

    const fichas = fichasRes.ok ? await fichasRes.json() : [];
    const agendamentos = agendRes.ok ? await agendRes.json() : [];

    const today = new Date().toDateString();
    const todayStr = new Date().toISOString().slice(0, 10);

    document.getElementById('statTotal').textContent = fichas.length;
    document.getElementById('statToday').textContent =
      fichas.filter(f => new Date(f.createdAt).toDateString() === today).length;
    document.getElementById('statAlerts').textContent =
      fichas.filter(f => ALERT_FIELDS.some(k => f[k] === 'sim')).length;
    document.getElementById('statAgendHoje').textContent =
      agendamentos.filter(a => a.data === todayStr).length;

    renderRecent(fichas.slice(0, 5));
  } catch (err) {
    document.getElementById('recentList').innerHTML =
      '<p class="empty">Erro ao carregar dados.</p>';
  }
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderRecent(fichas) {
  const el = document.getElementById('recentList');
  if (!fichas.length) {
    el.innerHTML = '<p class="empty">Nenhuma ficha registrada ainda.</p>';
    return;
  }
  el.innerHTML = fichas.map(f => {
    const date = new Date(f.createdAt);
    const dateStr = date.toLocaleDateString('pt-BR') + ' ' +
      date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const alerts = ALERT_FIELDS.filter(k => f[k] === 'sim');
    return `
      <a href="/admin/clientes/${f.id}" class="recent-item">
        <div class="recent-item__info">
          <span class="recent-item__name">${escapeHtml(f.nome)}</span>
          <span class="recent-item__meta">${escapeHtml(f.tipo || 'N/A')} &middot; ${dateStr}</span>
        </div>
        ${alerts.length ? `<span class="badge">${alerts.length} alerta${alerts.length > 1 ? 's' : ''}</span>` : ''}
        <span class="recent-item__arrow">&rarr;</span>
      </a>
    `;
  }).join('');
}

loadHub();
