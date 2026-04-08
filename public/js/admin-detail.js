/* ============================================
   DETALHE DA FICHA
   ============================================ */

const id = window.location.pathname.split('/').pop();

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

async function loadFicha() {
  try {
    const res = await fetch(`/api/fichas/${id}`);
    if (!res.ok) throw new Error('Ficha não encontrada');
    const ficha = await res.json();
    render(ficha);
  } catch (err) {
    document.getElementById('content').innerHTML = `
      <div class="detail-section"><p>Erro: ${err.message}</p></div>
    `;
  }
}

function val(v, fallback = '—') {
  return v == null || v === '' ? fallback : v;
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

function yesNo(v, isAlert = false) {
  if (v === 'sim') {
    return `<span class="${isAlert ? 'detail-item__val--alert' : 'detail-item__val--sim'}">SIM</span>`;
  }
  if (v === 'nao') return `<span class="detail-item__val--nao">Não</span>`;
  return `<span class="detail-item__val--nao">—</span>`;
}

function render(ficha) {
  document.getElementById('fichaId').textContent =
    `#${String(ficha.id).padStart(4, '0')} · ${new Date(ficha.createdAt).toLocaleString('pt-BR')}`;

  // Alertas críticos primeiro
  const alerts = HEALTH_FIELDS.filter(f => f.alert && ficha[f.key] === 'sim');
  const alertSection = alerts.length ? `
    <div class="detail-section" style="border-color: var(--accent); border-left: 3px solid var(--accent);">
      <div class="detail-section__title">⚠ Atenção — Alertas críticos</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${alerts.map(a => {
          const spec = a.spec && ficha[a.spec] ? ` (${escapeHtml(ficha[a.spec])})` : '';
          return `<span class="detail-item__val--alert">${a.label}${spec}</span>`;
        }).join('')}
      </div>
    </div>
  ` : '';

  // Seção: Identificação
  const identSection = `
    <div class="detail-section">
      <div class="detail-section__title">Identificação</div>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-item__key">Nome completo</span><span class="detail-item__val">${escapeHtml(ficha.nome)}</span></div>
        <div class="detail-item"><span class="detail-item__key">CPF</span><span class="detail-item__val">${escapeHtml(ficha.cpf)}</span></div>
        <div class="detail-item"><span class="detail-item__key">RG</span><span class="detail-item__val">${val(escapeHtml(ficha.rg))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Nascimento</span><span class="detail-item__val">${val(escapeHtml(ficha.nascimento))}</span></div>
        <div class="detail-item"><span class="detail-item__key">WhatsApp</span><span class="detail-item__val">${escapeHtml(ficha.whatsapp)}</span></div>
        <div class="detail-item"><span class="detail-item__key">E-mail</span><span class="detail-item__val">${escapeHtml(ficha.email)}</span></div>
        <div class="detail-item"><span class="detail-item__key">Endereço</span><span class="detail-item__val">${val(escapeHtml(ficha.endereco))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Bairro / Cidade</span><span class="detail-item__val">${val(escapeHtml(ficha.bairro))} / ${val(escapeHtml(ficha.cidade))}</span></div>
        <div class="detail-item"><span class="detail-item__key">CEP</span><span class="detail-item__val">${val(escapeHtml(ficha.cep))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Como nos conheceu</span><span class="detail-item__val">${val(escapeHtml(ficha.origem))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Emergência</span><span class="detail-item__val">${escapeHtml(ficha.emergNome)} · ${escapeHtml(ficha.emergTel)}</span></div>
      </div>
    </div>
  `;

  // Seção: Procedimento
  const procSection = `
    <div class="detail-section">
      <div class="detail-section__title">Procedimento</div>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-item__key">Tipo</span><span class="detail-item__val">${val(escapeHtml(ficha.tipo))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Profissional</span><span class="detail-item__val">${val(escapeHtml(ficha.profissional))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Local do corpo</span><span class="detail-item__val">${val(escapeHtml(ficha.localCorpo))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Valor</span><span class="detail-item__val">${ficha.valor ? 'R$ ' + escapeHtml(ficha.valor) : '—'}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-item__key">Observações</span><span class="detail-item__val">${val(escapeHtml(ficha.obs))}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-item__key">Tatuagens anteriores / reações</span><span class="detail-item__val">${val(escapeHtml(ficha.tattoosAnteriores))}</span></div>
      </div>
    </div>
  `;

  // Seção: Histórico de saúde
  const healthSection = `
    <div class="detail-section">
      <div class="detail-section__title">Histórico de saúde</div>
      <div class="detail-grid detail-grid--3">
        ${HEALTH_FIELDS.map(f => {
          const spec = f.spec && ficha[f.spec] ? `<br><small style="color:var(--ink-faint)">${escapeHtml(ficha[f.spec])}</small>` : '';
          return `
            <div class="detail-item">
              <span class="detail-item__key">${f.label}</span>
              <span class="detail-item__val">${yesNo(ficha[f.key], f.alert)}${spec}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="detail-grid" style="margin-top:20px;padding-top:20px;border-top:1px solid var(--line)">
        <div class="detail-item"><span class="detail-item__key">Tipo sanguíneo</span><span class="detail-item__val">${val(escapeHtml(ficha.sangue))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Fitzpatrick</span><span class="detail-item__val">${val(escapeHtml(ficha.fitzpatrick))}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-item__key">Outras condições</span><span class="detail-item__val">${val(escapeHtml(ficha.outras))}</span></div>
      </div>
    </div>
  `;

  // Seção: Consentimentos
  const consentSection = `
    <div class="detail-section">
      <div class="detail-section__title">Consentimentos (LGPD)</div>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-item__key">Termo de responsabilidade</span><span class="detail-item__val">${ficha.aceiteTermo ? '✓ Aceito' : '✗ Recusado'}</span></div>
        <div class="detail-item"><span class="detail-item__key">Tratamento de dados (LGPD)</span><span class="detail-item__val">${ficha.aceiteLgpd ? '✓ Aceito' : '✗ Recusado'}</span></div>
        <div class="detail-item"><span class="detail-item__key">Cessão de imagem</span><span class="detail-item__val">${ficha.aceiteImagem ? '✓ Autorizou' : '— Não autorizou'}</span></div>
        <div class="detail-item"><span class="detail-item__key">Confirmação final</span><span class="detail-item__val">${ficha.aceiteFinal ? '✓ Confirmou' : '✗'}</span></div>
      </div>
    </div>
  `;

  // Seção: Assinatura
  const sigSection = ficha.assinatura ? `
    <div class="detail-section">
      <div class="detail-section__title">Assinatura digital</div>
      <div class="signature-display">
        <img src="${ficha.assinatura}" alt="Assinatura">
      </div>
    </div>
  ` : '';

  // Metadados
  const metaSection = `
    <div class="detail-section">
      <div class="detail-section__title">Metadados técnicos</div>
      <div class="detail-grid">
        <div class="detail-item"><span class="detail-item__key">IP</span><span class="detail-item__val">${val(escapeHtml(ficha.ipAddress))}</span></div>
        <div class="detail-item"><span class="detail-item__key">Criado em</span><span class="detail-item__val">${new Date(ficha.createdAt).toLocaleString('pt-BR')}</span></div>
        <div class="detail-item" style="grid-column:1/-1"><span class="detail-item__key">User agent</span><span class="detail-item__val" style="font-size:11px;font-family:monospace">${val(escapeHtml(ficha.userAgent))}</span></div>
      </div>
    </div>
  `;

  document.getElementById('content').innerHTML =
    alertSection + identSection + procSection + healthSection + consentSection + sigSection + metaSection;
}

// Excluir
document.getElementById('deleteBtn').addEventListener('click', async () => {
  if (!confirm('Tem certeza? Esta ação não pode ser desfeita.\n\nPela LGPD (Art. 18), o titular tem direito à exclusão de seus dados.')) return;
  try {
    const res = await fetch(`/api/fichas/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir');
    alert('Ficha excluída.');
    window.location.href = '/admin';
  } catch (err) {
    alert('Erro: ' + err.message);
  }
});

loadFicha();
