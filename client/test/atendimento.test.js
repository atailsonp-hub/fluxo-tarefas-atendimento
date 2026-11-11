import assert from "node:assert/strict";
import { test } from "node:test";
import { agruparPorData, aguardandoAgente, mesmaConversa } from "../src/atendimento.js";

const agora = new Date(2026, 10, 11, 15, 0, 0);
const em = (diasAtras, hora = 10) => new Date(2026, 10, 11 - diasAtras, hora).toISOString();

test("agrupa tickets por data mantendo a ordem e omitindo grupos vazios", () => {
  const tickets = [
    { id: "a", updatedAt: em(0, 14) },
    { id: "b", updatedAt: em(0, 9) },
    { id: "c", updatedAt: em(1) },
    { id: "d", updatedAt: em(5) },
    { id: "e", updatedAt: em(30) },
  ];
  const grupos = agruparPorData(tickets, agora);
  assert.deepEqual(grupos.map((g) => g.rotulo), ["Hoje", "Ontem", "Últimos 7 dias", "Anteriores"]);
  assert.deepEqual(grupos[0].tickets.map((t) => t.id), ["a", "b"]);
  assert.deepEqual(agruparPorData([{ id: "x", updatedAt: em(30) }], agora).map((g) => g.rotulo), ["Anteriores"]);
  assert.deepEqual(agruparPorData([], agora), []);
});

test("aguardando agente: só ticket aberto com a última mensagem do usuário", () => {
  const det = (status, ...roles) => ({ ticket: { id: "t", status }, messages: roles.map((role, i) => ({ id: String(i), role })) });
  assert.equal(aguardandoAgente(det("open", "user")), true);
  assert.equal(aguardandoAgente(det("open", "user", "agent")), false);
  assert.equal(aguardandoAgente(det("closed", "user")), false);
  assert.equal(aguardandoAgente(null), false);
});

test("mesmaConversa detecta mensagem nova e mudança de status", () => {
  const base = { ticket: { id: "t", status: "open", title: "x" }, messages: [{ id: "1" }] };
  assert.equal(mesmaConversa(base, structuredClone(base)), true);
  assert.equal(mesmaConversa(base, { ...base, messages: [{ id: "1" }, { id: "2" }] }), false);
  assert.equal(mesmaConversa(base, { ...base, ticket: { ...base.ticket, status: "closed" } }), false);
  assert.equal(mesmaConversa(null, null), true);
  assert.equal(mesmaConversa(null, base), false);
});
