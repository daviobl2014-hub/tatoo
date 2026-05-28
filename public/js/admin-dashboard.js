const ALERT_LABELS = {
  drogas: 'Alcool/drogas',
  gravida: 'Gravida',
  hiv: 'HIV',
  hepatite: 'Hepatite',
  hemofilia: 'Hemofilia',
  cardiopata: 'Cardiopata',
  anticoagulante: 'Anticoagulante',
  isotretinoina: 'Isotretinoina',
  diabetes: 'Diabetes',
  epilepsia: 'Epilepsia',
  hipertensao: 'Hipertensao',
  alergia: 'Alergia',
};

function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function loadDashboard() {
  try {
    const [fichasRes, agendRes] = await Promise.all([
      fetch('/api/fichas/full'),
      fetch('/api/agendamentos'),
    ]);
    const fichas = fichasRes.ok ? await fichasRes.json() : [];
    const agendamentos = agendRes.ok ? await agendRes.json() : [];
    renderStats(fichas);
    renderCharts(fichas, agendamentos);
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
  }
}

function renderStats(fichas) {
  const now = new Date();
  const today = now.toDateString();
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);

  document.getElementById('dTotal').textContent = fichas.length;
  document.getElementById('dToday').textContent =
    fichas.filter(f => new Date(f.createdAt).toDateString() === today).length;
  document.getElementById('dWeek').textContent =
    fichas.filter(f => new Date(f.createdAt) >= weekAgo).length;
  document.getElementById('dMonth').textContent =
    fichas.filter(f => new Date(f.createdAt) >= monthAgo).length;
}

function countBy(arr, fn) {
  const map = {};
  for (const item of arr) {
    const key = fn(item);
    if (key == null || key === '') continue;
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function renderBars(elId, entries, total) {
  const el = document.getElementById(elId);
  if (!entries.length) {
    el.innerHTML = '<p class="empty empty--small">Sem dados ainda.</p>';
    return;
  }
  const max = Math.max(...entries.map(e => e[1]), 1);
  el.innerHTML = entries.map(([label, count]) => {
    const pct = (count / max) * 100;
    const share = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="bar-row">
        <div class="bar-row__label">${escapeHtml(label)}</div>
        <div class="bar-row__bar">
          <div class="bar-row__fill" style="width:${pct}%"></div>
        </div>
        <div class="bar-row__val">${count} <small>${share}%</small></div>
      </div>
    `;
  }).join('');
}

function renderCharts(fichas, agendamentos) {
  const total = fichas.length;

  renderBars('chartTipo', countBy(fichas, f => f.tipo), total);
  renderBars('chartOrigem', countBy(fichas, f => f.origem), total);
  renderBars('chartSangue', countBy(fichas, f => f.sangue), total);

  const alertCounts = {};
  for (const f of fichas) {
    for (const key of Object.keys(ALERT_LABELS)) {
      if (f[key] === 'sim') {
        alertCounts[ALERT_LABELS[key]] = (alertCounts[ALERT_LABELS[key]] || 0) + 1;
      }
    }
  }
  const alertEntries = Object.entries(alertCounts).sort((a, b) => b[1] - a[1]);
  renderBars('chartAlerts', alertEntries, total);

  renderTimeline(fichas);

  const todayStr = new Date().toISOString().slice(0, 10);
  const agendHoje = agendamentos
    .filter(a => a.data === todayStr)
    .sort((a, b) => a.horario.localeCompare(b.horario));
  renderAgendHoje(agendHoje);

  renderBars('chartAgendStatus', countBy(agendamentos, a => a.status), agendamentos.length);
}

function renderTimeline(fichas) {
  const el = document.getElementById('chartTimeline');
  const days = 30;
  const counts = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(d.getDate() + 1);
    const c = fichas.filter(f => {
      const fd = new Date(f.createdAt);
      return fd >= d && fd < next;
    }).length;
    counts.push({ date: d, count: c });
  }
  const max = Math.max(...counts.map(c => c.count), 1);
  el.innerHTML = `
    <div class="timeline">
      ${counts.map(c => {
        const h = (c.count / max) * 100;
        const label = c.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        return `
          <div class="timeline__col" title="${label}: ${c.count} ficha${c.count !== 1 ? 's' : ''}">
            <div class="timeline__bar" style="height:${Math.max(h, 2)}%"></div>
            <span class="timeline__label">${c.date.getDate()}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderAgendHoje(list) {
  const el = document.getElementById('chartAgendHoje');
  if (!list.length) {
    el.innerHTML = '<p class="empty empty--small">Nenhum agendamento hoje.</p>';
    return;
  }
  el.innerHTML = list.map(a => `
    <a href="/admin/agendamentos" class="agend-row">
      <span class="agend-row__time">${escapeHtml(a.horario)}</span>
      <span class="agend-row__name">${escapeHtml(a.cliente)}</span>
      <span class="agend-row__tipo">${escapeHtml(a.tipo || '-')}</span>
    </a>
  `).join('');
}

loadDashboard();
