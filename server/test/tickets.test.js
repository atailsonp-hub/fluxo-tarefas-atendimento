import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { criarApp } from "../src/app.js";

let base, servidor;
const chamar = async (metodo, caminho, corpo) => {
  const r = await fetch(base + caminho, { method: metodo, headers: { "content-type": "application/json" }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
  return { status: r.status, dados: r.status === 204 ? null : await r.json() };
};

before(async () => {
  ({ servidor } = criarApp());
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

test("abrir ticket cria a conversa com a primeira mensagem e título automático", async () => {
  const r = await chamar("POST", "/api/tickets", { message: "  Não consigo mover cartões\nacontece em todos os quadros  " });
  assert.equal(r.status, 201);
  assert.equal(r.dados.ticket.title, "Não consigo mover cartões");
  assert.equal(r.dados.ticket.status, "open");
  assert.equal(r.dados.messages.length, 1);
  assert.equal(r.dados.messages[0].role, "user");
  assert.equal((await chamar("POST", "/api/tickets", { message: "   " })).status, 400);
  assert.equal((await chamar("POST", "/api/tickets", {})).status, 400);
});

test("título longo é cortado e título explícito é respeitado", async () => {
  const longo = (await chamar("POST", "/api/tickets", { message: "a".repeat(200) })).dados.ticket;
  assert.ok(longo.title.length <= 60 && longo.title.endsWith("…"));
  const explicito = (await chamar("POST", "/api/tickets", { message: "oi", title: "Meu título" })).dados.ticket;
  assert.equal(explicito.title, "Meu título");
});

test("mensagens: usuário e agente na ordem; role inválido é recusado", async () => {
  const { ticket } = (await chamar("POST", "/api/tickets", { message: "Preciso de ajuda" })).dados;
  const resp = await chamar("POST", `/api/tickets/${ticket.id}/messages`, { body: "Olá! Como posso ajudar?", role: "agent" });
  assert.equal(resp.status, 201);
  assert.equal(resp.dados.message.role, "agent");
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { body: "Segue o print" })).dados.message.role, "user");
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { body: "x", role: "admin" })).status, 400);
  assert.equal((await chamar("POST", `/api/tickets/${ticket.id}/messages`, { body: " " })).status, 400);
  const det = (await chamar("GET", `/api/tickets/${ticket.id}`)).dados;
  assert.deepEqual(det.messages.map((m) => m.role), ["user", "agent", "user"]);
  assert.equal(det.ticket.lastMessage, "Segue o print");
  assert.equal((await chamar("POST", "/api/tickets/nao-existe/messages", { body: "x" })).status, 404);
});

test("listagem traz o mais recentemente atualizado primeiro, com última mensagem", async () => {
  const a = (await chamar("POST", "/api/tickets", { message: "Primeiro" })).dados.ticket;
  await new Promise((r) => setTimeout(r, 5));
  const b = (await chamar("POST", "/api/tickets", { message: "Segundo" })).dados.ticket;
  await new Promise((r) => setTimeout(r, 5));
  await chamar("POST", `/api/tickets/${a.id}/messages`, { body: "Resposta", role: "agent" });
  const { tickets } = (await chamar("GET", "/api/tickets")).dados;
  const ids = tickets.map((t) => t.id);
  assert.ok(ids.indexOf(a.id) < ids.indexOf(b.id));
  assert.equal(tickets[ids.indexOf(a.id)].lastMessage, "Resposta");
  assert.equal(tickets[ids.indexOf(a.id)].lastRole, "agent");
});

test("fechar, renomear, reabrir ao responder e excluir em cascata", async () => {
  const { ticket } = (await chamar("POST", "/api/tickets", { message: "Teste de ciclo" })).dados;
  const fechado = (await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "closed", title: "Renomeado" })).dados.ticket;
  assert.deepEqual([fechado.status, fechado.title], ["closed", "Renomeado"]);
  assert.equal((await chamar("PATCH", `/api/tickets/${ticket.id}`, { status: "pendente" })).status, 400);
  const resp = (await chamar("POST", `/api/tickets/${ticket.id}/messages`, { body: "Voltei" })).dados;
  assert.equal(resp.ticket.status, "open");
  assert.deepEqual((await chamar("DELETE", `/api/tickets/${ticket.id}`)).dados, { ok: true });
  assert.equal((await chamar("GET", `/api/tickets/${ticket.id}`)).status, 404);
});
