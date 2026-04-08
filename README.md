# Tattoo Ficha — Sistema Local de Anamnese

Servidor Node.js local para receber fichas de anamnese via QR code no estúdio. Cliente escaneia o código no celular, preenche, e os dados caem direto no seu banco SQLite. Zero hospedagem, zero custo, zero dados saindo da sua rede.

## Como funciona

```
   ┌─────────────────────────┐
   │  Seu notebook no estúdio│
   │  (Node.js + SQLite)     │
   └────────┬────────────────┘
            │
            │ WiFi local
            │
   ┌────────▼────────┐    ┌────────────────┐
   │ Celular cliente │◄───│ QR code na tela│
   └─────────────────┘    └────────────────┘
```

1. Você liga o servidor no seu notebook (no estúdio)
2. O sistema detecta o IP local e gera um QR code
3. Cliente conecta no WiFi do estúdio e escaneia o QR
4. Preenche a ficha no próprio celular
5. Dados caem no banco SQLite do seu notebook
6. Você vê tudo no painel admin (só acessa no seu notebook)

**Importante**: Os dados **nunca saem da sua rede local**. Sem internet pública, sem servidor de terceiros, sem problema de LGPD internacional.

## Estrutura de pastas

```
Tattoo/
├── server.js                 ← Servidor Express
├── package.json
├── .env                      ← DATABASE_URL e PORT
├── .gitignore
├── README.md
├── prisma/
│   ├── schema.prisma         ← Modelo do banco
│   └── dev.db                ← Banco SQLite (criado após migrate)
└── public/
    ├── index.html            ← Ficha do cliente
    ├── admin.html            ← Painel admin (listagem)
    ├── admin-detail.html     ← Painel admin (detalhe de uma ficha)
    ├── qr.html               ← Página do QR code em tela cheia
    ├── css/
    │   ├── styles.css        ← Estilo da ficha
    │   └── admin.css         ← Estilo do painel
    ├── js/
    │   ├── script.js         ← Lógica da ficha
    │   ├── admin.js          ← Lógica da listagem
    │   └── admin-detail.js   ← Lógica do detalhe
    └── assets/               ← (reservado para futuras imagens)
```

## Instalação (primeira vez)

Pré-requisito: Node.js 18+. Verifique com `node --version`. Se não tiver, baixe em https://nodejs.org

```bash
# 1. Entre na pasta do projeto
cd Tattoo

# 2. Instale as dependências
npm install

# 3. Crie o banco de dados (roda uma vez só)
npx prisma migrate dev --name init

# 4. Inicie o servidor
npm start
```

Ao iniciar, você vai ver algo assim no terminal:

```
╔══════════════════════════════════════════════════════╗
║          TATTOO FICHA — SERVIDOR ATIVO               ║
╚══════════════════════════════════════════════════════╝

  📱 Cliente (WiFi do estúdio):
     http://192.168.0.15:3000/

  🖥  Painel admin (só neste computador):
     http://localhost:3000/admin

──────────────────────────────────────────────────────
  Escaneie o QR code abaixo com o celular do cliente:
──────────────────────────────────────────────────────

  ██████████████████████████████
  ██ ▄▄▄▄▄ █▀█ █▄█ ▀▄█ ▄▄▄▄▄ ██
  ██ █   █ █▀▀▀█ ▀▀█▀█ █   █ ██
  ...
```

## Uso diário

### Fluxo do cliente (no estúdio)

1. Cliente chega, você conecta ele no WiFi do estúdio
2. Abra no seu computador: **http://localhost:3000/admin/qr**
3. Mostra a tela (ou vira o laptop) — o QR code fica grande
4. Cliente abre a câmera do celular, aponta para o QR
5. Celular abre a ficha direto no navegador
6. Cliente preenche, assina, envia
7. Você vê aparecer no painel admin em tempo real

### Fluxo do profissional (no computador)

- **Listagem**: http://localhost:3000/admin
- **QR code**: http://localhost:3000/admin/qr
- **Visualizar banco**: `npx prisma studio` (abre em http://localhost:5555)

## Segurança

Este sistema tem **duas camadas de proteção** implementadas:

1. **Binding em 0.0.0.0** — aceita conexões da rede local (WiFi do estúdio), mas só da rede local. Roteadores domésticos não expõem isso pra internet por padrão.

2. **Painel admin bloqueado para localhost** — mesmo que alguém no WiFi do estúdio descubra o IP, só vai conseguir acessar a **ficha pública**. As rotas `/admin` e `/api/fichas` (listar/detalhar) retornam 403 pra qualquer IP que não seja 127.0.0.1.

### O que você ainda precisa fazer no mundo físico

- **Senha forte** no usuário do sistema operacional do seu notebook
- **Criptografia de disco**: [BitLocker](https://support.microsoft.com/pt-br/windows/criptografia-de-dispositivo-no-windows-ad5dcf4b-dbe0-2331-228f-7925c2a3012d) (Windows) ou [FileVault](https://support.apple.com/pt-br/guide/mac-help/mh11785/mac) (Mac)
- **Bloquear tela** quando sair de perto do computador
- **Backup regular** do arquivo `prisma/dev.db` (pendrive ou nuvem pessoal)
- **WiFi do estúdio com senha WPA2/WPA3** — não deixe aberto

## Endpoints da API

### Públicos (qualquer dispositivo no WiFi)

| Método | Rota           | Descrição                      |
|--------|----------------|-------------------------------|
| GET    | /              | Ficha de anamnese             |
| POST   | /api/fichas    | Envia uma ficha preenchida    |

### Privados (só localhost)

| Método | Rota              | Descrição                        |
|--------|-------------------|---------------------------------|
| GET    | /admin            | Painel de listagem              |
| GET    | /admin/qr         | Tela do QR code                 |
| GET    | /admin/:id        | Detalhe de uma ficha            |
| GET    | /api/fichas       | JSON com listagem               |
| GET    | /api/fichas/:id   | JSON de uma ficha               |
| GET    | /api/qr           | QR code como base64             |
| DELETE | /api/fichas/:id   | Excluir ficha (LGPD Art. 18)    |

## Troubleshooting

**"Não consigo acessar do celular"**
- Confirma que o celular tá no MESMO WiFi do notebook
- Alguns roteadores têm "isolamento de clientes" (AP isolation) — desative essa opção
- Firewall do Windows pode bloquear a porta 3000: libere nas configurações

**"O IP mudou e o QR não funciona mais"**
- Normal — reinicia o servidor (`Ctrl+C` e `npm start` de novo). Ele detecta o IP novo automaticamente.

**"Quero rodar em outra porta"**
- Edita o `.env` e muda `PORT=3000` para outra (ex: `PORT=8080`)

## LGPD — o básico que você precisa saber

Dados de saúde são classificados como **dados sensíveis** pelo Art. 5º, II da [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm). Como titular dos dados, o cliente tem direito a:

- **Acesso**: saber o que você tem dele (Art. 18, II)
- **Correção**: corrigir dados errados (Art. 18, III)
- **Exclusão**: pedir que você apague (Art. 18, VI) — o botão "Excluir" no painel admin cumpre isso
- **Portabilidade**: receber os dados em formato estruturado (Art. 18, V)
- **Revogação do consentimento**: a qualquer momento (Art. 8º, § 5º)

Mais info na [cartilha da ANPD](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes).

## Roadmap possível

- [ ] Login no painel admin (multi-usuário, senhas)
- [ ] Criptografia de campos sensíveis no banco
- [ ] Exportar ficha como PDF assinado
- [ ] Backup automático diário
- [ ] Dashboard com estatísticas
- [ ] Integração WhatsApp (notificação ao preencher)
- [ ] Migração pra PostgreSQL quando escalar
