// ============================================
// TATTOO FICHA — SERVIDOR LOCAL
// Aceita conexões da rede local (WiFi do estúdio)
// Gera QR code automático para clientes escanearem
// ============================================

import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import qrcodeTerminal from 'qrcode-terminal';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// ============ DETECÇÃO DO IP LOCAL ============
/**
 * Procura o primeiro IP IPv4 não-interno da máquina.
 * Ex: 192.168.0.15, 10.0.0.8
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const LOCAL_IP = getLocalIP();
const CLIENT_URL = `http://${LOCAL_IP}:${PORT}/`;
const ADMIN_URL = `http://localhost:${PORT}/admin`;

// ============ SEGURANÇA ============
app.use(helmet({
  hsts: false,
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
}));

// Rate limit nas submissões (anti-flood)
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas. Aguarde alguns minutos.' },
});

// Middleware que bloqueia /admin pra outros dispositivos da rede
// Só o próprio computador (localhost) pode acessar o painel
function adminOnlyLocalhost(req, res, next) {
  const ip = req.ip.replace('::ffff:', ''); // normaliza IPv6-mapped
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return next();
  }
  return res.status(403).send(`
    <!DOCTYPE html>
    <html lang="pt-BR"><head><meta charset="UTF-8">
    <title>Acesso negado</title>
    <style>
      body{font-family:system-ui;background:#0a0a0a;color:#f4f1ea;
      display:flex;align-items:center;justify-content:center;
      min-height:100vh;margin:0;text-align:center;padding:20px}
      h1{color:#c8102e;font-size:24px}
      p{color:#a8a39a;max-width:400px;line-height:1.6}
    </style></head><body>
    <div>
      <h1>◆ Acesso restrito</h1>
      <p>O painel administrativo só pode ser acessado no computador onde o servidor está rodando.</p>
    </div></body></html>
  `);
}

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.set('trust proxy', 'loopback');

// Arquivos estáticos (ficha pública)
// Sem cache: estúdio roda local e em desenvolvimento — sempre serve a versão atual
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  },
}));

// ============ API ============

/**
 * POST /api/fichas — Cria uma nova ficha
 */
app.post('/api/fichas', submitLimiter, async (req, res) => {
  try {
    const data = req.body;

    if (!data.nome || !data.cpf || !data.email || !data.whatsapp) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }
    if (!data.aceite_termo || !data.aceite_lgpd || !data.aceite_final) {
      return res.status(400).json({ error: 'Consentimentos obrigatórios não foram aceitos' });
    }

    const ficha = await prisma.ficha.create({
      data: {
        nome: data.nome,
        cpf: data.cpf,
        rg: data.rg || null,
        nascimento: data.nascimento,
        whatsapp: data.whatsapp,
        email: data.email,
        endereco: data.endereco || null,
        bairro: data.bairro || null,
        cidade: data.cidade || null,
        cep: data.cep || null,
        origem: data.origem || null,
        emergNome: data.emerg_nome || '',
        emergTel: data.emerg_tel || '',

        fumante: data.fumante,
        alergia: data.alergia,
        alergiaSpec: data.alergia_spec,
        gravida: data.gravida,
        menstruada: data.menstruada,
        herpes: data.herpes,
        queloide: data.queloide,
        diabetes: data.diabetes,
        epilepsia: data.epilepsia,
        cardiopata: data.cardiopata,
        anemia: data.anemia,
        hemofilia: data.hemofilia,
        depressao: data.depressao,
        vitiligo: data.vitiligo,
        hiv: data.hiv,
        marcapasso: data.marcapasso,
        hepatite: data.hepatite,
        hepatiteSpec: data.hepatite_spec,
        hipertensao: data.hipertensao,
        autoimune: data.autoimune,
        autoimuneSpec: data.autoimune_spec,
        alimentou: data.alimentou,
        drogas: data.drogas,
        bronzeada: data.bronzeada,
        cancer: data.cancer,
        cancerSpec: data.cancer_spec,
        peleCicatriz: data.pele_cicatriz,
        peleCicatrizSpec: data.pele_cicatriz_spec,
        medicamento: data.medicamento,
        medicamentoSpec: data.medicamento_spec,
        tratamento: data.tratamento,
        tratamentoSpec: data.tratamento_spec,
        transmissivel: data.transmissivel,
        transmissivelSpec: data.transmissivel_spec,
        anticoagulante: data.anticoagulante,
        isotretinoina: data.isotretinoina,

        sangue: data.sangue || null,
        fitzpatrick: data.fitzpatrick || null,
        outras: data.outras || null,

        tipo: data.tipo || null,
        profissional: data.profissional || null,
        localCorpo: data.local_corpo || null,
        obs: data.obs || null,
        valor: data.valor || null,
        tattoosAnteriores: data.tattoos_anteriores || null,

        aceiteTermo: !!data.aceite_termo,
        aceiteLgpd: !!data.aceite_lgpd,
        aceiteImagem: !!data.aceite_imagem,
        aceiteFinal: !!data.aceite_final,

        assinatura: data.assinatura || null,

        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    res.json({ ok: true, id: ficha.id });
  } catch (err) {
    console.error('Erro ao salvar ficha:', err);
    res.status(500).json({ error: 'Erro interno ao salvar ficha' });
  }
});

/**
 * GET /api/fichas — Lista resumida (só localhost)
 */
app.get('/api/fichas', adminOnlyLocalhost, async (req, res) => {
  try {
    const fichas = await prisma.ficha.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, createdAt: true, nome: true, cpf: true, whatsapp: true,
        tipo: true, localCorpo: true, valor: true,
        drogas: true, gravida: true, hiv: true, hepatite: true,
        hemofilia: true, cardiopata: true, anticoagulante: true, isotretinoina: true,
      },
    });
    res.json(fichas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar fichas' });
  }
});

/**
 * GET /api/fichas/full — Lista completa (dashboard e clientes)
 * Definida ANTES de /api/fichas/:id para não ser capturada por :id
 */
app.get('/api/fichas/full', adminOnlyLocalhost, async (req, res) => {
  try {
    const fichas = await prisma.ficha.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(fichas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar fichas' });
  }
});

/**
 * GET /api/fichas/:id — Detalhe (só localhost)
 */
app.get('/api/fichas/:id', adminOnlyLocalhost, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const ficha = await prisma.ficha.findUnique({ where: { id } });
    if (!ficha) return res.status(404).json({ error: 'Ficha não encontrada' });
    res.json(ficha);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar ficha' });
  }
});

/**
 * DELETE /api/fichas/:id — Exclusão (direito LGPD Art. 18)
 */
app.delete('/api/fichas/:id', adminOnlyLocalhost, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.ficha.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir ficha' });
  }
});

// ============ AGENDAMENTOS ============

app.get('/api/agendamentos', adminOnlyLocalhost, async (req, res) => {
  try {
    const list = await prisma.agendamento.findMany({
      orderBy: [{ data: 'asc' }, { horario: 'asc' }],
    });
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar agendamentos' });
  }
});

app.post('/api/agendamentos', adminOnlyLocalhost, async (req, res) => {
  try {
    const d = req.body;
    if (!d.cliente || !d.whatsapp || !d.data || !d.horario) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' });
    }
    const agend = await prisma.agendamento.create({
      data: {
        cliente: d.cliente,
        whatsapp: d.whatsapp,
        tipo: d.tipo || null,
        profissional: d.profissional || null,
        data: d.data,
        horario: d.horario,
        duracao: d.duracao || null,
        valor: d.valor || null,
        obs: d.obs || null,
        status: d.status || 'agendado',
        fichaId: d.fichaId || null,
      },
    });
    res.json({ ok: true, id: agend.id });
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

app.put('/api/agendamentos/:id', adminOnlyLocalhost, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const d = req.body;
    const agend = await prisma.agendamento.update({
      where: { id },
      data: {
        cliente: d.cliente,
        whatsapp: d.whatsapp,
        tipo: d.tipo || null,
        profissional: d.profissional || null,
        data: d.data,
        horario: d.horario,
        duracao: d.duracao || null,
        valor: d.valor || null,
        obs: d.obs || null,
        status: d.status || 'agendado',
      },
    });
    res.json({ ok: true, id: agend.id });
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

app.delete('/api/agendamentos/:id', adminOnlyLocalhost, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.agendamento.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
});

/**
 * GET /api/qr — Retorna o QR code como data URL (base64)
 */
app.get('/api/qr', adminOnlyLocalhost, async (req, res) => {
  try {
    const dataUrl = await QRCode.toDataURL(CLIENT_URL, {
      width: 600,
      margin: 2,
      color: { dark: '#0a0a0a', light: '#f4f1ea' },
    });
    res.json({ url: CLIENT_URL, qr: dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao gerar QR' });
  }
});

// ============ PÁGINAS ============
app.get('/admin', adminOnlyLocalhost, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/dashboard', adminOnlyLocalhost, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/admin/agendamentos', adminOnlyLocalhost, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agendamentos.html'));
});

app.get('/admin/clientes', adminOnlyLocalhost, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'clientes.html'));
});

app.get('/admin/qr', adminOnlyLocalhost, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'qr.html'));
});

app.get('/admin/clientes/:id', adminOnlyLocalhost, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'cliente-detalhe.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ficha.html'));
});

// ============ START ============
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║          TATTOO FICHA — SERVIDOR ATIVO               ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('  📱 Cliente (WiFi do estúdio):');
  console.log(`     ${CLIENT_URL}`);
  console.log('');
  console.log('  🖥  Painel admin (só neste computador):');
  console.log(`     ${ADMIN_URL}`);
  console.log('');
  console.log('──────────────────────────────────────────────────────');
  console.log('  Escaneie o QR code abaixo com o celular do cliente:');
  console.log('──────────────────────────────────────────────────────');
  console.log('');

  qrcodeTerminal.generate(CLIENT_URL, { small: true });

  console.log('');
  console.log('  ⚠  IMPORTANTE:');
  console.log('     • O cliente PRECISA estar no WiFi do estúdio');
  console.log('     • Os dados NUNCA saem da sua rede local');
  console.log('     • Painel admin só abre neste computador');
  console.log('     • Pressione Ctrl+C para parar o servidor');
  console.log('');
});

process.on('SIGINT', async () => {
  console.log('\n  Encerrando servidor...');
  await prisma.$disconnect();
  process.exit(0);
});
