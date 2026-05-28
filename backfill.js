// ============================================
// BACKFILL — popula a tabela Cliente a partir dos
// dados existentes (fichas + agendamentos) e religa
// tudo por clienteId. Seguro rodar mais de uma vez.
//   Uso:  node backfill.js   (com o servidor parado)
// ============================================

import pkg from '@prisma/client';
import crypto from 'crypto';
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

const digits = (s) => (s || '').replace(/\D/g, '');

async function main() {
  const fichas = await prisma.ficha.findMany();
  const agendamentos = await prisma.agendamento.findMany();

  const byPhone = {}; // whatsapp(digits) -> clienteId

  // pré-carrega clientes que já existem (caso rode de novo)
  for (const c of await prisma.cliente.findMany()) {
    byPhone[digits(c.whatsapp)] = c.id;
  }

  let novosCli = 0, fichasLig = 0, agendLig = 0;

  // 1) cada ficha vira (ou liga a) um Cliente
  for (const f of fichas) {
    if (f.clienteId) { byPhone[digits(f.whatsapp)] = f.clienteId; continue; }
    const key = digits(f.whatsapp);
    let cid = byPhone[key];
    if (!cid) {
      const c = await prisma.cliente.create({
        data: {
          nome: f.nome,
          whatsapp: f.whatsapp,
          email: f.email || null,
          cpf: f.cpf || null,
          origem: f.origem || null,
        },
      });
      cid = c.id; byPhone[key] = cid; novosCli++;
    }
    await prisma.ficha.update({ where: { id: f.id }, data: { clienteId: cid } });
    fichasLig++;
  }

  // 2) cada agendamento liga ao Cliente (cria se não existir)
  for (const a of agendamentos) {
    if (a.clienteId) continue;
    const key = digits(a.whatsapp);
    let cid = byPhone[key];
    if (!cid) {
      const c = await prisma.cliente.create({
        data: { nome: a.cliente, whatsapp: a.whatsapp },
      });
      cid = c.id; byPhone[key] = cid; novosCli++;
    }
    await prisma.agendamento.update({ where: { id: a.id }, data: { clienteId: cid } });
    agendLig++;
  }

  // 3) garante token em todos os clientes (link da ficha)
  let tokensGerados = 0;
  for (const c of await prisma.cliente.findMany({ where: { token: null } })) {
    await prisma.cliente.update({ where: { id: c.id }, data: { token: crypto.randomUUID() } });
    tokensGerados++;
  }

  const total = await prisma.cliente.count();
  console.log(`  Tokens gerados:          ${tokensGerados}`);
  console.log(`Backfill concluido:`);
  console.log(`  Clientes criados:        ${novosCli}`);
  console.log(`  Fichas religadas:        ${fichasLig}`);
  console.log(`  Agendamentos religados:  ${agendLig}`);
  console.log(`  Total de clientes agora: ${total}`);
}

main()
  .catch((e) => { console.error('Erro no backfill:', e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
