/* ============================================
   AGENDAMENTOS — Calendario semanal interativo
   ============================================ */

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const WEEKDAYS_MINI = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS_SHORT = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];
const MONTHS_LONG = ['Janeiro','Fevereiro','Marco','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const HOUR_START = 9;
const HOUR_END = 21;      // exclusive; rows go 09:00..20:00
const HOURS_TOTAL = HOUR_END - HOUR_START;

// ============ STATE ============
let allAgend = [];
let weekStart = startOfWeek(new Date());
let miniCalMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
let filters = { artist: 'all', type: 'all', status: 'all' };

// ============ HELPERS ============
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pad(n) { return String(n).padStart(2, '0'); }

function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfWeek(d) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - out.getDay()); // Sunday
  return out;
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

function parseDuration(s) {
  if (!s) return 60;
  const str = String(s).toLowerCase().replace(/\s/g, '');
  const hMatch = str.match(/(\d+(?:[.,]\d+)?)h/);
  let mMatch = str.match(/(\d+)min/);
  if (!mMatch && hMatch) {
    const after = str.split('h')[1];
    if (after && /^\d+$/.test(after)) mMatch = [after, after];
  }
  let mins = 0;
  if (hMatch) mins += parseFloat(hMatch[1].replace(',', '.')) * 60;
  if (mMatch) mins += parseInt(mMatch[1], 10);
  if (!hMatch && !mMatch) {
    const n = parseInt(str, 10);
    if (!isNaN(n)) mins = n * 60;
  }
  return Math.max(Math.round(mins), 30);
}

function parseTime(s) {
  if (!s) return null;
  const [h, m] = s.split(':').map(x => parseInt(x, 10));
  return { h, m: m || 0 };
}

function formatTime(h, m) {
  return `${pad(h)}:${pad(m)}`;
}

function addMinutes(h, m, mins) {
  const total = h * 60 + m + mins;
  return { h: Math.floor(total / 60), m: total % 60 };
}

function maskPhone(v) {
  v = v.replace(/\D/g, '').slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a && `(${a})`, b, c].filter(Boolean).join(' '));
  }
  return v.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (_, a, b, c) =>
    [a && `(${a})`, b, c].filter(Boolean).join(' '));
}

function maskMoney(v) {
  v = v.replace(/\D/g, '');
  if (!v) return '';
  v = (parseInt(v, 10) / 100).toFixed(2);
  return v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ============ DATA ============
async function loadAgend() {
  try {
    const res = await fetch('/api/agendamentos');
    if (!res.ok) throw new Error('Erro ao carregar');
    allAgend = await res.json();
    populateFilters();
    render();
  } catch (err) {
    console.error('Erro:', err);
  }
}

function populateFilters() {
  const artists = Array.from(new Set(allAgend.map(a => a.profissional).filter(Boolean))).sort();
  const types = Array.from(new Set(allAgend.map(a => a.tipo).filter(Boolean))).sort();

  const aSel = document.getElementById('filterArtist');
  aSel.innerHTML = '<option value="all">Todos os artistas</option>' +
    artists.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');

  const tSel = document.getElementById('filterType');
  tSel.innerHTML = '<option value="all">Todos os servi&ccedil;os</option>' +
    types.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');

  const dl = document.getElementById('artistsList');
  if (dl) dl.innerHTML = artists.map(a => `<option value="${escapeHtml(a)}">`).join('');
}

function applyFilters(list) {
  return list.filter(a => {
    if (filters.artist !== 'all' && a.profissional !== filters.artist) return false;
    if (filters.type !== 'all' && a.tipo !== filters.type) return false;
    if (filters.status !== 'all' && a.status !== filters.status) return false;
    return true;
  });
}

// ============ RENDER ============
function render() {
  updateWeekLabel();
  renderMiniCal();
  renderWeekGrid();
  renderStats();
}

function updateWeekLabel() {
  const end = addDays(weekStart, 6);
  const sd = weekStart.getDate();
  const ed = end.getDate();
  const sm = MONTHS_SHORT[weekStart.getMonth()];
  const em = MONTHS_SHORT[end.getMonth()];
  const sy = weekStart.getFullYear();
  const ey = end.getFullYear();
  let label;
  if (sm === em && sy === ey) label = `${sd} – ${ed} ${sm}, ${sy}`;
  else if (sy === ey)         label = `${sd} ${sm} – ${ed} ${em}, ${sy}`;
  else                         label = `${sd} ${sm} ${sy} – ${ed} ${em} ${ey}`;
  document.getElementById('weekRangeText').textContent = label;
}

function renderMiniCal() {
  const el = document.getElementById('miniCal');
  const y = miniCalMonth.getFullYear();
  const m = miniCalMonth.getMonth();
  const firstDay = new Date(y, m, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const prevMonthLast = new Date(y, m, 0).getDate();
  const today = new Date();

  const cells = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: prevMonthLast - i, other: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(y, m, d);
    cells.push({
      day: d,
      date,
      isToday: isSameDay(date, today),
      inViewWeek: date >= weekStart && date < addDays(weekStart, 7),
    });
  }
  const total = Math.ceil(cells.length / 7) * 7;
  let next = 1;
  while (cells.length < total) cells.push({ day: next++, other: true });

  el.innerHTML = `
    <div class="mini-cal__header">
      <button class="mini-cal__nav" id="miniPrev" aria-label="Mes anterior">&#8249;</button>
      <span class="mini-cal__month">${MONTHS_LONG[m]} ${y}</span>
      <button class="mini-cal__nav" id="miniNext" aria-label="Proximo mes">&#8250;</button>
    </div>
    <div class="mini-cal__weekdays">
      ${WEEKDAYS_MINI.map(w => `<span class="mini-cal__weekday">${w}</span>`).join('')}
    </div>
    <div class="mini-cal__days">
      ${cells.map(c => {
        const classes = [
          'mini-cal__day',
          c.other ? 'is-other-month' : '',
          c.isToday ? 'is-today' : '',
          c.inViewWeek && !c.other ? 'is-week' : '',
        ].filter(Boolean).join(' ');
        const attr = c.other ? '' : `data-date="${isoDate(c.date)}"`;
        return `<button class="${classes}" ${attr}>${c.day}</button>`;
      }).join('')}
    </div>
  `;

  document.getElementById('miniPrev').addEventListener('click', () => {
    miniCalMonth = new Date(y, m - 1, 1);
    renderMiniCal();
  });
  document.getElementById('miniNext').addEventListener('click', () => {
    miniCalMonth = new Date(y, m + 1, 1);
    renderMiniCal();
  });
  el.querySelectorAll('[data-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [yy, mm, dd] = btn.dataset.date.split('-').map(Number);
      weekStart = startOfWeek(new Date(yy, mm - 1, dd));
      miniCalMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
      render();
    });
  });
}

function renderWeekGrid() {
  const grid = document.getElementById('weekGrid');
  const today = new Date();
  let html = '<div class="week-grid__corner"></div>';

  // Day headers
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    const isToday = isSameDay(d, today);
    html += `
      <div class="day-header ${isToday ? 'is-today' : ''}">
        <span class="day-header__name">${WEEKDAYS[i]}</span>
        <span class="day-header__date">${pad(d.getDate())}/${pad(d.getMonth() + 1)}</span>
      </div>
    `;
  }

  // Hour rows
  for (let h = HOUR_START; h < HOUR_END; h++) {
    html += `<div class="time-label">${pad(h)}:00</div>`;
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const isToday = isSameDay(d, today);
      html += `<div class="time-cell ${isToday ? 'is-today-col' : ''}"></div>`;
    }
  }

  grid.innerHTML = html;

  // Place appointment cards
  const weekEnd = addDays(weekStart, 7);
  const filtered = applyFilters(allAgend);
  const ofWeek = filtered.filter(a => {
    if (!a.data) return false;
    const [y, m, d] = a.data.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt >= weekStart && dt < weekEnd;
  });

  ofWeek.forEach(a => {
    const [y, m, d] = a.data.split('-').map(Number);
    const dayIndex = (new Date(y, m - 1, d)).getDay();
    const t = parseTime(a.horario);
    if (!t) return;

    const durationMins = parseDuration(a.duracao);
    const endT = addMinutes(t.h, t.m, durationMins);
    const endStr = formatTime(endT.h, endT.m);

    const startRow = (t.h - HOUR_START);
    if (startRow < 0 || startRow >= HOURS_TOTAL) return;

    const rowSpan = Math.max(1, Math.min(HOURS_TOTAL - startRow, Math.ceil(durationMins / 60)));

    const card = document.createElement('div');
    card.className = `appt-card appt-card--${a.status || 'agendado'}`;
    card.style.gridColumn = `${dayIndex + 2}`;
    card.style.gridRow = `${startRow + 2} / span ${rowSpan}`;
    card.dataset.id = a.id;
    card.innerHTML = `
      <div class="appt-card__head">
        <span class="appt-card__name">${escapeHtml(a.cliente)}</span>
        <span class="appt-card__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21v-1a8 8 0 0 1 16 0v1"/>
          </svg>
        </span>
      </div>
      <div class="appt-card__time">${escapeHtml(a.horario)} &ndash; ${endStr}</div>
      ${a.profissional ? `<div class="appt-card__artist">${escapeHtml(a.profissional)}</div>` : ''}
      ${a.tipo ? `<div class="appt-card__service">${escapeHtml(a.tipo)}</div>` : ''}
    `;
    card.addEventListener('click', () => openModal(a.id));
    grid.appendChild(card);
  });
}

function renderStats() {
  const weekEnd = addDays(weekStart, 7);
  const filtered = applyFilters(allAgend);
  const ofWeek = filtered.filter(a => {
    if (!a.data) return false;
    const [y, m, d] = a.data.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt >= weekStart && dt < weekEnd;
  });

  const totalMinutes = ofWeek.reduce((sum, a) => sum + parseDuration(a.duracao), 0);
  const totalHours = totalMinutes / 60;

  // capacidade: 7 dias * HOURS_TOTAL (assumindo 1 cadeira)
  const capacityHours = 7 * HOURS_TOTAL;
  const occupancy = capacityHours > 0 ? Math.round((totalHours / capacityHours) * 100) : 0;

  document.getElementById('statAgendamentos').textContent = ofWeek.length;
  document.getElementById('statHoras').textContent = `${Math.round(totalHours)}h`;
  document.getElementById('statOcup').textContent = `${occupancy}%`;
}

// ============ NAV ============
document.getElementById('prevWeek').addEventListener('click', () => {
  weekStart = addDays(weekStart, -7);
  miniCalMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  render();
});

document.getElementById('nextWeek').addEventListener('click', () => {
  weekStart = addDays(weekStart, 7);
  miniCalMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  render();
});

document.getElementById('todayBtn').addEventListener('click', () => {
  weekStart = startOfWeek(new Date());
  miniCalMonth = new Date(weekStart.getFullYear(), weekStart.getMonth(), 1);
  render();
});

// ============ FILTERS ============
['filterArtist', 'filterType', 'filterStatus'].forEach(id => {
  document.getElementById(id).addEventListener('change', (e) => {
    const key = id === 'filterArtist' ? 'artist' : id === 'filterType' ? 'type' : 'status';
    filters[key] = e.target.value;
    renderWeekGrid();
    renderStats();
  });
});

// ============ MODAL ============
const modal = document.getElementById('modal');
const form = document.getElementById('agendForm');

function openModal(id) {
  form.reset();
  document.getElementById('agendId').value = id || '';
  document.getElementById('deleteBtn').hidden = !id;
  document.getElementById('modalTitle').textContent = id ? 'Editar agendamento' : 'Novo agendamento';

  if (id) {
    const a = allAgend.find(x => x.id === id);
    if (a) {
      document.getElementById('cliente').value = a.cliente || '';
      document.getElementById('whatsapp').value = a.whatsapp || '';
      document.getElementById('tipo').value = a.tipo || '';
      document.getElementById('data').value = a.data || '';
      document.getElementById('horario').value = a.horario || '';
      document.getElementById('profissional').value = a.profissional || '';
      document.getElementById('duracao').value = a.duracao || '';
      document.getElementById('valor').value = a.valor || '';
      document.getElementById('status').value = a.status || 'agendado';
      document.getElementById('obs').value = a.obs || '';
    }
  } else {
    document.getElementById('data').value = isoDate(new Date());
    document.getElementById('status').value = 'agendado';
  }

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('openNewBtn').addEventListener('click', () => openModal());
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
modal.querySelector('.modal__backdrop').addEventListener('click', closeModal);

document.getElementById('whatsapp').addEventListener('input', (e) => {
  e.target.value = maskPhone(e.target.value);
});
document.getElementById('valor').addEventListener('input', (e) => {
  e.target.value = maskMoney(e.target.value);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('agendId').value;
  const payload = {
    cliente: document.getElementById('cliente').value.trim(),
    whatsapp: document.getElementById('whatsapp').value.trim(),
    tipo: document.getElementById('tipo').value || null,
    data: document.getElementById('data').value,
    horario: document.getElementById('horario').value,
    profissional: document.getElementById('profissional').value.trim() || null,
    duracao: document.getElementById('duracao').value.trim() || null,
    valor: document.getElementById('valor').value.trim() || null,
    status: document.getElementById('status').value,
    obs: document.getElementById('obs').value.trim() || null,
  };

  const url = id ? `/api/agendamentos/${id}` : '/api/agendamentos';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao salvar');
    }
    closeModal();
    await loadAgend();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  const id = document.getElementById('agendId').value;
  if (!id) return;
  if (!confirm('Excluir este agendamento?')) return;

  try {
    const res = await fetch(`/api/agendamentos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir');
    closeModal();
    await loadAgend();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
});

// ============ INIT ============
loadAgend();
