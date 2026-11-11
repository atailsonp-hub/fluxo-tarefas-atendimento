import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { criarApp } from "../src/app.js";

let base, servidor;
// Faz o papel do navegador: guarda o cookie HttpOnly que o servidor define e o devolve nas chamadas seguintes.
const novoNavegador = (cookieInicial = "") => {
  let cookie = cookieInicial;
  const chamar = async (metodo, caminho, corpo, cabecalhos = {}) => {
    const r = await fetch(base + caminho, { method: metodo, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...cabecalhos }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const definido = r.headers.get("set-cookie");
    if (definido) cookie = definido.split(";")[0];
    return { status: r.status, dados: r.status === 204 ? null : await r.json(), setCookie: definido };
  };
  return { chamar, cookie: () => cookie };
};
const { chamar } = novoNavegador();

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

test("dono por cookie HttpOnly definido pelo servidor: separa usuários e ignora o cabeçalho x-dono", async () => {
  const ana = novoNavegador(), bia = novoNavegador();
  const criado = await ana.chamar("POST", "/api/tickets", { title: "Cartão some", message: "Fictício: o cartão some ao mover." });
  assert.match(criado.setCookie, /^fluxo_dono=[\w-]{8,80}; HttpOnly; SameSite=Lax; Path=\//, "cookie definido pelo servidor, HttpOnly");
  const { ticket } = criado.dados;
  assert.equal(ticket.phase, "dry-run"); // AGENT_DRY_RUN=true por padrão: nada vai ao GitHub
  assert.equal((await ana.chamar("GET", `/api/tickets/${ticket.id}`)).status, 200);
  assert.equal((await bia.chamar("GET", `/api/tickets/${ticket.id}`)).status, 404);
  assert.equal((await ana.chamar("GET", "/api/tickets")).dados.tickets.some((t) => t.id === ticket.id), true);
  assert.equal((await bia.chamar("GET", "/api/tickets")).dados.tickets.some((t) => t.id === ticket.id), false);
  // quem só manda o cabeçalho antigo (ou forja um id) não enxerga nada
  const intruso = novoNavegador();
  assert.equal((await intruso.chamar("GET", `/api/tickets/${ticket.id}`, undefined, { "x-dono": "qualquer-id-de-outro" })).status, 404);
});

test("quem já tinha o cookie antigo (fluxo-dono) mantém o mesmo dono e passa a ter o cookie HttpOnly", async () => {
  const antigo = "id-antigo-de-um-navegador-1234";
  const navegador = novoNavegador(`fluxo-dono=${antigo}`);
  const criado = await navegador.chamar("POST", "/api/tickets", { message: "Pedido do navegador antigo" });
  assert.ok(criado.setCookie.startsWith(`fluxo_dono=${antigo};`), "adota o id antigo em vez de gerar outro");
  const outro = novoNavegador(`fluxo_dono=${antigo}`); // já com o cookie novo
  assert.equal((await outro.chamar("GET", `/api/tickets/${criado.dados.ticket.id}`)).status, 200);
});
