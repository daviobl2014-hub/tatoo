/* ============================================
   FICHA DE ANAMNESE — LÓGICA
   ============================================ */

// ============ DADOS DE SAÚDE ============
const healthItems = [
  { id: "fumante", label: "É fumante?" },
  { id: "alergia", label: "Possui alguma alergia?", spec: true, specLabel: "Qual?" },
  { id: "gravida", label: "Está grávida ou amamentando?" },
  { id: "menstruada", label: "Está menstruada?" },
  { id: "herpes", label: "Possui herpes?" },
  { id: "queloide", label: "Tem tendência a queloide?" },
  { id: "diabetes", label: "Diabetes?" },
  { id: "epilepsia", label: "Epilepsia?" },
  { id: "cardiopata", label: "Cardiopata?" },
  { id: "anemia", label: "Anemia?" },
  { id: "hemofilia", label: "Hemofilia ou distúrbio de coagulação?" },
  { id: "depressao", label: "Depressão ou ansiedade em tratamento?" },
  { id: "vitiligo", label: "Vitiligo ou doença de pele?" },
  { id: "hiv", label: "Portador de HIV?" },
  { id: "marcapasso", label: "Marca-passo?" },
  { id: "hepatite", label: "Hepatite?", spec: true, specLabel: "Tipo?" },
  { id: "hipertensao", label: "Hipertensão?" },
  { id: "autoimune", label: "Doença autoimune?", spec: true, specLabel: "Qual?" },
  { id: "alimentou", label: "Alimentou-se nas últimas 24h?" },
  { id: "drogas", label: "Está sob efeito de álcool/drogas?", alert: true },
  { id: "bronzeada", label: "Está com a pele bronzeada?" },
  { id: "cancer", label: "Possui ou teve câncer?", spec: true, specLabel: "Especifique" },
  { id: "pele_cicatriz", label: "Problema de cicatrização?", spec: true, specLabel: "Qual?" },
  { id: "medicamento", label: "Usa medicamento diário?", spec: true, specLabel: "Qual(is)?" },
  { id: "tratamento", label: "Está em tratamento médico?", spec: true, specLabel: "Qual?" },
  { id: "transmissivel", label: "Possui doença transmissível?", spec: true, specLabel: "Qual?" },
  { id: "anticoagulante", label: "Usa anticoagulantes (ex: AAS, varfarina)?" },
  { id: "isotretinoina", label: "Usou isotretinoína nos últimos 6 meses?", small: "Roacutan e similares afetam cicatrização" },
];

// Renderiza toggles
const togglesEl = document.getElementById("healthToggles");
togglesEl.innerHTML = healthItems.map(item => `
  <div class="toggle-row" data-id="${item.id}">
    <div class="toggle-row__label">
      ${item.label}
      ${item.small ? `<small>${item.small}</small>` : ""}
    </div>
    <div class="toggle-row__input">
      <input type="radio" name="${item.id}" value="sim" id="${item.id}_sim">
      <label for="${item.id}_sim">Sim</label>
      <input type="radio" name="${item.id}" value="nao" id="${item.id}_nao">
      <label for="${item.id}_nao">Não</label>
    </div>
    ${item.spec ? `
      <div class="toggle-row__spec">
        <input type="text" name="${item.id}_spec" placeholder="${item.specLabel}">
      </div>
    ` : ""}
  </div>
`).join("");

// Mostra campo de especificação quando marca "sim"
togglesEl.addEventListener("change", (e) => {
  if (e.target.type === "radio") {
    const row = e.target.closest(".toggle-row");
    row.classList.toggle("is-sim", e.target.value === "sim");
  }
});

// ============ MÁSCARAS ============
const maskCPF = (v) => v.replace(/\D/g, "")
  .replace(/(\d{3})(\d)/, "$1.$2")
  .replace(/(\d{3})(\d)/, "$1.$2")
  .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
  .slice(0, 14);

const maskCEP = (v) => v.replace(/\D/g, "")
  .replace(/(\d{5})(\d)/, "$1-$2")
  .slice(0, 9);

const maskPhone = (v) => {
  v = v.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{0,2})(\d{0,4})(\d{0,4})/, (_, a, b, c) =>
      [a && `(${a})`, b, c].filter(Boolean).join(" "));
  }
  return v.replace(/(\d{0,2})(\d{0,5})(\d{0,4})/, (_, a, b, c) =>
    [a && `(${a})`, b, c].filter(Boolean).join(" "));
};

const maskMoney = (v) => {
  v = v.replace(/\D/g, "");
  if (!v) return "";
  v = (parseInt(v, 10) / 100).toFixed(2);
  return v.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

document.getElementById("cpf").addEventListener("input", (e) => e.target.value = maskCPF(e.target.value));
document.getElementById("cep").addEventListener("input", (e) => e.target.value = maskCEP(e.target.value));
document.getElementById("whatsapp").addEventListener("input", (e) => e.target.value = maskPhone(e.target.value));
document.getElementById("emerg_tel").addEventListener("input", (e) => e.target.value = maskPhone(e.target.value));
document.getElementById("valor").addEventListener("input", (e) => e.target.value = maskMoney(e.target.value));

// ============ VALIDAÇÃO CPF ============
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i - 1]) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i - 1]) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf[10]);
}

// ============ NAVEGAÇÃO ENTRE STEPS ============
const steps = document.querySelectorAll(".step");
const totalSteps = steps.length;
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const currentStepEl = document.getElementById("currentStep");
let currentStep = 1;

function showStep(n) {
  steps.forEach(s => s.hidden = parseInt(s.dataset.step) !== n);
  currentStep = n;
  currentStepEl.textContent = n;
  prevBtn.disabled = n === 1;
  nextBtn.hidden = n === totalSteps;
  submitBtn.hidden = n !== totalSteps;
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (n === totalSteps) {
    renderSummary();
    setTimeout(initSignaturePad, 100);
  }
}

function validateStep(n) {
  const step = document.querySelector(`.step[data-step="${n}"]`);
  const requiredFields = step.querySelectorAll("[required]");
  let valid = true;
  let firstInvalid = null;

  requiredFields.forEach(field => {
    let fieldValid = field.value.trim() !== "";
    if (field.id === "cpf" && fieldValid) {
      fieldValid = validarCPF(field.value);
    }
    if (field.id === "email" && fieldValid) {
      fieldValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
    }
    if (field.type === "checkbox") {
      fieldValid = field.checked;
      const box = field.closest(".check-box");
      box.classList.toggle("is-invalid", !fieldValid);
    } else {
      field.classList.toggle("invalid", !fieldValid);
    }
    if (!fieldValid && !firstInvalid) firstInvalid = field;
    if (!fieldValid) valid = false;
  });

  if (!valid && firstInvalid) {
    firstInvalid.focus();
    if (firstInvalid.type === "checkbox") {
      firstInvalid.closest(".check-box").scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  return valid;
}

nextBtn.addEventListener("click", () => {
  if (!validateStep(currentStep)) {
    alertaInvalido();
    return;
  }
  if (currentStep < totalSteps) showStep(currentStep + 1);
});

prevBtn.addEventListener("click", () => {
  if (currentStep > 1) showStep(currentStep - 1);
});

function alertaInvalido() {
  // Feedback tátil se disponível
  if (navigator.vibrate) navigator.vibrate(80);
}

// ============ RESUMO ============
function renderSummary() {
  const form = document.getElementById("anamneseForm");
  const data = new FormData(form);
  const nome = data.get("nome") || "—";
  const cpf = data.get("cpf") || "—";
  const tipo = data.get("tipo") || "—";
  const local = data.get("local_corpo") || "—";
  const valor = data.get("valor") ? `R$ ${data.get("valor")}` : "—";

  const alertas = [];
  const alertaIds = ["drogas", "gravida", "hiv", "hepatite", "hemofilia", "cardiopata", "anticoagulante", "isotretinoina"];
  alertaIds.forEach(id => {
    if (data.get(id) === "sim") {
      const item = healthItems.find(h => h.id === id);
      alertas.push(item.label.replace("?", ""));
    }
  });

  const summaryEl = document.getElementById("summary");
  summaryEl.innerHTML = `
    <div class="summary__title">Resumo para conferência</div>
    <div class="summary__row"><div class="summary__key">Nome</div><div class="summary__val">${nome}</div></div>
    <div class="summary__row"><div class="summary__key">CPF</div><div class="summary__val">${cpf}</div></div>
    <div class="summary__row"><div class="summary__key">Procedimento</div><div class="summary__val">${tipo}</div></div>
    <div class="summary__row"><div class="summary__key">Local</div><div class="summary__val">${local}</div></div>
    <div class="summary__row"><div class="summary__key">Valor</div><div class="summary__val">${valor}</div></div>
    ${alertas.length ? `
      <div class="summary__row" style="border-top:1px solid var(--accent);margin-top:10px;padding-top:12px">
        <div class="summary__key" style="color:var(--accent)">⚠ Atenção</div>
        <div class="summary__val">${alertas.join(" · ")}</div>
      </div>
    ` : ""}
  `;
}

// ============ SIGNATURE PAD ============
let sigCtx, sigCanvas, drawing = false, hasSignature = false;

function initSignaturePad() {
  sigCanvas = document.getElementById("signaturePad");
  if (!sigCanvas || sigCanvas.dataset.init) return;
  sigCanvas.dataset.init = "1";

  // DPI scaling
  const rect = sigCanvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  sigCanvas.width = rect.width * dpr;
  sigCanvas.height = rect.height * dpr;
  sigCtx = sigCanvas.getContext("2d");
  sigCtx.scale(dpr, dpr);
  sigCtx.strokeStyle = "#0a0a0a";
  sigCtx.lineWidth = 2.2;
  sigCtx.lineCap = "round";
  sigCtx.lineJoin = "round";

  const getPos = (e) => {
    const rect = sigCanvas.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return {
      x: point.clientX - rect.left,
      y: point.clientY - rect.top
    };
  };

  const start = (e) => {
    e.preventDefault();
    drawing = true;
    hasSignature = true;
    const pos = getPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(pos.x, pos.y);
  };

  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    sigCtx.lineTo(pos.x, pos.y);
    sigCtx.stroke();
  };

  const end = () => { drawing = false; };

  sigCanvas.addEventListener("mousedown", start);
  sigCanvas.addEventListener("mousemove", move);
  sigCanvas.addEventListener("mouseup", end);
  sigCanvas.addEventListener("mouseleave", end);
  sigCanvas.addEventListener("touchstart", start, { passive: false });
  sigCanvas.addEventListener("touchmove", move, { passive: false });
  sigCanvas.addEventListener("touchend", end);

  document.getElementById("clearSig").addEventListener("click", () => {
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    hasSignature = false;
  });
}

// ============ SUBMIT ============
document.getElementById("anamneseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(currentStep)) {
    alertaInvalido();
    return;
  }
  if (!hasSignature) {
    alert("Por favor, assine a ficha antes de finalizar.");
    return;
  }

  // Coleta dados
  const form = e.target;
  const formData = new FormData(form);
  const dados = Object.fromEntries(formData.entries());
  dados.assinatura = sigCanvas.toDataURL("image/png");
  dados.data_preenchimento = new Date().toISOString();
  if (linkedClienteId) dados.clienteId = linkedClienteId;

  // Converte checkboxes pra boolean (FormData só pega se marcado)
  dados.aceite_termo = form.querySelector("#aceite_termo").checked;
  dados.aceite_lgpd = form.querySelector("#aceite_lgpd").checked;
  dados.aceite_imagem = form.querySelector("#aceite_imagem").checked;
  dados.aceite_final = form.querySelector("#aceite_final").checked;

  // Feedback visual no botão
  submitBtn.disabled = true;
  submitBtn.textContent = "Enviando...";

  try {
    const res = await fetch("/api/fichas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    if (!res.ok) {
      const erro = await res.json().catch(() => ({}));
      throw new Error(erro.error || "Erro ao enviar ficha");
    }

    const result = await res.json();

    // Esconde a barra de navegacao ANTES de trocar o conteudo
    // (ela fica dentro de .sheet; depois da troca ela some e viraria null)
    const navBar = document.querySelector(".nav-bar");
    if (navBar) navBar.style.display = "none";

    // Tela de sucesso
    document.querySelector(".sheet").innerHTML = `
      <div class="success-card">
        <div class="success-card__icon">◆</div>
        <h2>Ficha registrada</h2>
        <p>Protocolo: <strong>#${String(result.id).padStart(4, '0')}</strong><br>
        Suas informações foram salvas com sucesso.</p>
        <button type="button" class="btn-primary" onclick="window.print()">Imprimir / Salvar PDF</button>
      </div>
    `;
  } catch (err) {
    alert("Erro ao enviar ficha: " + err.message + "\n\nPor favor, tente novamente.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Finalizar ficha";
  }
});

// ============ PRÉ-PREENCHIMENTO (ficha vinculada a um cliente) ============
const _params = new URLSearchParams(location.search);
const fichaToken = _params.get("t");
let linkedClienteId = _params.get("cliente"); // fallback (uso no proprio PC)

async function prefillFromCliente() {
  try {
    let c = null;
    if (fichaToken) {
      // endpoint publico (funciona no celular do cliente, na rede local)
      const res = await fetch("/api/ficha-prefill/" + encodeURIComponent(fichaToken));
      if (res.ok) { c = await res.json(); linkedClienteId = c.clienteId; }
    } else if (linkedClienteId) {
      // fallback so funciona no localhost (uso em tablet do estudio)
      const res = await fetch("/api/clientes/" + linkedClienteId);
      if (res.ok) c = await res.json();
    }
    if (!c) return;

    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set("nome", c.nome);
    set("whatsapp", c.whatsapp);
    set("email", c.email);
    set("cpf", c.cpf);
    if (c.origem) { const o = document.getElementById("origem"); if (o) o.value = c.origem; }

    const header = document.querySelector(".masthead__title p");
    if (header) header.textContent = "Ficha de " + c.nome;
  } catch (err) {
    // se falhar, segue como ficha normal (anonima)
  }
}

// ============ INIT ============
showStep(1);
prefillFromCliente();
