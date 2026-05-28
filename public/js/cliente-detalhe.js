/* ============================================
   DETALHE DO CLIENTE — visao 360
   Contato + agendamentos + ficha de anamnese
   ============================================ */

const id = window.location.pathname.split('/').pop();
let clienteData = null;
let lanBase = null; // base com IP da rede (para o link da ficha no celular)

const HEALTH_FIELDS = [
  { key: 'fumante', label: 'Fumante' },
  { key: 'alergia', label: 'Alergia', spec: 'alergiaSpec' },
  { key: 'gravida', label: 'Grávida/amamentando' },
  { key: 'menstruada', label: 'Menstruada' },
  { key: 'herpes', label: 'Herpes' },
  { key: 'queloide', label: 'Queloide' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'epilepsia', label: 'Epilepsia' },
  { key: 'cardiopata', label: 'Cardiopata', alert: true },
  { key: 'anemia', label: 'Anemia' },
  { key: 'hemofilia', label: 'Hemofilia', alert: true },
  { key: 'depressao', label: 'Depressão' },
  { key: 'vitiligo', label: 'Vitiligo' },
  { key: 'hiv', label: 'HIV', alert: true },
  { key: 'marcapasso', label: 'Marcapasso', alert: true },
  { key: 'hepatite', label: 'Hepatite', spec: 'hepatiteSpec', alert: true },
  { key: 'hipertensao', label: 'Hipertensão' },
  { key: 'autoimune', label: 'Autoimune', spec: 'autoimuneSpec' },
  { key: 'alimentou', label: 'Alimentou-se (24h)' },
  { key: 'drogas', label: 'Álcool/drogas', alert: true },
  { key: 'bronzeada', label: 'Pele bronzeada' },
  { key: 'cancer', label: 'Câncer', spec: 'cancerSpec', alert: true },
  { key: 'peleCicatriz', label: 'Problema cicatrização', spec: 'peleCicatrizSpec' },
  { key: 'medicamento', label: 'Medicamento diário', spec: 'medicamentoSpec' },
  { key: 'tratamento', label: 'Em tratamento médico', spec: 'tratamentoSpec' },
  { key: 'transmissivel', label: 'Doença transmissível', spec: 'transmissivelSpec', alert: true },
  { key: 'anticoagulante', label: 'Anticoagulante', alert: true },
  { key: 'isotretinoina', label: 'Isotretinoína (6 meses)', alert: true },
];

const STATUS_LABEL = { agendado: 'Aguardando', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };

function val(v, fb = '—') { return v == null || v === '' ? fb : v; }
function escapeHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function yesNo(v, alert = false) {
  if (v === 'sim') return `<span class="${alert ? 'detail-item__val--alert' : 'detail-item__val--sim'}">SIM</span>`;
  if (v === 'nao') return `<span class="detail-item__val--nao">Não</span>`;
  return `<span class="detail-item__val--nao">—</span>`;
}
function fmtDateBR(iso) { if (!iso) return '—'; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; }

async function load() {
  try {
    // pega base de rede (IP) para o link da ficha; nao bloqueia se falhar
    fetch('/api/qr').then(r => r.ok ? r.json() : null).then(d => { if (d) lanBase = d.url; }).catch(()=>{});

    const res = await fetch(`/api/clientes/${id}`);
    if (!res.ok) throw new Error('Cliente não encontrado');
    clienteData = await res.json();
    render(clienteData);
  } catch (err) {
    document.getElementById('content').innerHTML =
      `<div class="detail-section"><p>Erro: ${escapeHtml(err.message)}</p></div>`;
  }
}

function render(c) {
  const codigo = 'CL' + String(c.id).padStart(3, '0');
  document.getElementById('clienteSub').textContent =
    `#${codigo} · cadastrado em ${new Date(c.createdAt).toLocaleDateString('pt-BR')}`;

  const ficha = c.fichas && c.fichas.length ? c.fichas[0] : null;
  const fichaLink = `/ficha?t=${c.token}`;

  // ===== Ações =====
  const acoes = `
    <div class="actions-row">
      <a class="btn-primary" href="/admin/agendamentos">+ Agendar</a>
      <button class="btn-ghost" id="copyFichaBtn">Copiar link da ficha</button>
      <a class="btn-ghost" href="${fichaLink}" target="_blank" rel="noopener">Abrir ficha</a>
    </div>
  `;

  // ===== Contato =====
  const contato = `
    <div class="detail-section">
      <div class="detail-section__title">Contato</div>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-item__key">Nome</span><span class="detail-item__val">${escapeHtml(c.nome)}</span></div>
        <div class="detail-item"><span class="detail-item__key">WhatsApp</span><span class="detail-item__val">${escapeHtml(val(c.whatsapp))}</span></div>
        <div class="detail-item"><span class="detail-item__key">E-mail</span><span class="detail-item__val">${escapeHtml(val(c.email))}</span></div>
        <div class="detail-item"><span class="detail-item__key">CPF</span><span class="detail-item__val">${escapeHtml(val(c.cpf))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Como nos conheceu</span><span class="detail-item__val">${escapeHtml(val(c.origem))}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-item__key">Observações</span><span class="detail-item__val">${escapeHtml(val(c.obs))}</span></div>
      </div>
    </div>
  `;

  // ===== Agendamentos =====
  const ags = c.agendamentos || [];
  const agendItens = ags.length
    ? ags.map(a => `
        <div class="appt-line">
          <span class="appt-line__date">${fmtDateBR(a.data)} &middot; ${escapeHtml(a.horario)}</span>
          <span class="appt-line__tipo">${escapeHtml(a.tipo || '—')}</span>
          <span class="appt-line__prof">${escapeHtml(a.profissional || '—')}</span>
          <span class="appt-line__valor">${a.valor ? 'R$ ' + escapeHtml(a.valor) : '—'}</span>
          <span class="status-pill status--${a.status}">${STATUS_LABEL[a.status] || a.status}</span>
        </div>`).join('')
    : `<p class="muted">Nenhum agendamento ainda.</p>`;

  const agendamentos = `
    <div class="detail-section">
      <div class="detail-section__title">Agendamentos (${ags.length})</div>
      <div class="appt-list">${agendItens}</div>
    </div>
  `;

  // ===== Ficha de anamnese =====
  let fichaSection;
  if (!ficha) {
    fichaSection = `
      <div class="detail-section detail-section--empty">
        <div class="detail-section__title">Ficha de anamnese</div>
        <p class="muted">Este cliente ainda não preencheu a ficha de saúde.</p>
        <p class="muted">Use o botão <strong>"Copiar link da ficha"</strong> acima e mande pro cliente — a identificação já vai preenchida, ele só completa saúde e assinatura.</p>
      </div>
    `;
  } else {
    const alerts = HEALTH_FIELDS.filter(f => f.alert && ficha[f.key] === 'sim');
    const alertBlock = alerts.length ? `
      <div class="detail-section" style="border-color: var(--accent); border-left: 3px solid var(--accent);">
        <div class="detail-section__title">⚠ Atenção — Alertas críticos</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${alerts.map(a => {
            const spec = a.spec && ficha[a.spec] ? ` (${escapeHtml(ficha[a.spec])})` : '';
            return `<span class="detail-item__val--alert">${a.label}${spec}</span>`;
          }).join('')}
        </div>
      </div>` : '';

    const health = `
      <div class="detail-section">
        <div class="detail-section__title">Ficha de anamnese — saúde</div>
        <div class="detail-grid detail-grid--3">
          ${HEALTH_FIELDS.map(f => {
            const spec = f.spec && ficha[f.spec] ? `<br><small style="color:var(--ink-faint)">${escapeHtml(ficha[f.spec])}</small>` : '';
            return `<div class="detail-item"><span class="detail-item__key">${f.label}</span><span class="detail-item__val">${yesNo(ficha[f.key], f.alert)}${spec}</span></div>`;
          }).join('')}
        </div>
        <div class="detail-grid" style="margin-top:20px;padding-top:20px;border-top:1px solid var(--line)">
          <div class="detail-item"><span class="detail-item__key">Tipo sanguíneo</span><span class="detail-item__val">${escapeHtml(val(ficha.sangue))}</span></div>
          <div class="detail-item"><span class="detail-item__key">Fitzpatrick</span><span class="detail-item__val">${escapeHtml(val(ficha.fitzpatrick))}</span></div>
          <div class="detail-item" style="grid-column:1/-1"><span class="detail-item__key">Outras condições</span><span class="detail-item__val">${escapeHtml(val(ficha.outras))}</span></div>
        </div>
      </div>
    `;

    const consent = `
      <div class="detail-section">
        <div class="detail-section__title">Consentimentos (LGPD)</div>
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-item__key">Termo de responsabilidade</span><span class="detail-item__val">${ficha.aceiteTermo ? '✓ Aceito' : '✗'}</span></div>
          <div class="detail-item"><span class="detail-item__key">Tratamento de dados</span><span class="detail-item__val">${ficha.aceiteLgpd ? '✓ Aceito' : '✗'}</span></div>
          <div class="detail-item"><span class="detail-item__key">Cessão de imagem</span><span class="detail-item__val">${ficha.aceiteImagem ? '✓ Autorizou' : '— Não'}</span></div>
          <div class="detail-item"><span class="detail-item__key">Confirmação final</span><span class="detail-item__val">${ficha.aceiteFinal ? '✓' : '✗'}</span></div>
        </div>
      </div>
    `;

    const sig = ficha.assinatura ? `
      <div class="detail-section">
        <div class="detail-section__title">Assinatura digital</div>
        <div class="signature-display"><img src="${ficha.assinatura}" alt="Assinatura"></div>
      </div>` : '';

    fichaSection = alertBlock + health + consent + sig;
  }

  document.getElementById('content').innerHTML = acoes + contato + agendamentos + fichaSection;

  // copiar link da ficha (com IP da rede se disponivel)
  const copyBtn = document.getElementById('copyFichaBtn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const base = lanBase ? lanBase.replace(/\/$/, '') : location.origin;
      const url = `${base}/ficha?t=${c.token}`;
      try {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = 'Link copiado!';
        setTimeout(() => copyBtn.textContent = 'Copiar link da ficha', 2000);
      } catch {
        prompt('Copie o link da ficha:', url);
      }
    });
  }
}

// Excluir cliente
document.getElementById('deleteBtn').addEventListener('click', async () => {
  if (!confirm('Excluir este cliente?\n\nRemove o cadastro e a ficha de anamnese (LGPD Art. 18). Os agendamentos ficam no histórico sem vínculo.')) return;
  try {
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir');
    window.location.href = '/admin/clientes';
  } catch (err) {
    alert('Erro: ' + err.message);
  }
});

load();
