import assert from "node:assert/strict";
import { test } from "node:test";
import { acompanharTicket } from "../src/acompanhar-ticket.js";

// Documento e janela falsos: o intervalo e os eventos são disparados à mão.
function ambiente() {
  const ouvintes = { documento: {}, janela: {} };
  let intervalo = null, limpou = false;
  const documento = { visibilityState: "visible", addEventListener: (e, f) => { ouvintes.documento[e] = f; }, removeEventListener: (e) => { delete ouvintes.documento[e]; } };
  const janela = {
    setInterval: (f) => { intervalo = f; return 1; }, clearInterval: () => { limpou = true; intervalo = null; },
    addEventListener: (e, f) => { ouvintes.janela[e] = f; }, removeEventListener: (e) => { delete ouvintes.janela[e]; },
  };
  return { documento, janela, ouvintes, tick: () => intervalo?.(), limpou: () => limpou };
}
const esperar = () => new Promise((r) => setImmediate(r));
const montar = (extra = {}) => {
  const amb = ambiente(), leituras = [], lidas = [], erros = [];
  const acomp = acompanharTicket({ documento: amb.documento, janela: amb.janela, intervalo: 5000,
    ler: async (forcar) => { leituras.push(forcar); return `r${leituras.length}`; }, aoLer: (r) => lidas.push(r), aoErro: (e) => erros.push(e.message), ...extra });
  return { amb, acomp, leituras, lidas, erros };
};

test("consulta ao começar e a cada intervalo, só com a aba visível", async () => {
  const { amb, leituras, lidas } = montar();
  await esperar();
  assert.deepEqual(leituras, [false]);
  amb.tick(); await esperar();
  assert.equal(leituras.length, 2);
  amb.documento.visibilityState = "hidden";
  amb.tick(); await esperar();
  assert.equal(leituras.length, 2, "aba oculta não consulta");
  assert.deepEqual(lidas, ["r1", "r2"]);
});

test("ao voltar para a aba ou focar a janela consulta de novo; oculta não", async () => {
  const { amb, leituras } = montar();
  await esperar();
  amb.documento.visibilityState = "hidden"; amb.ouvintes.documento.visibilitychange(); await esperar();
  assert.equal(leituras.length, 1);
  amb.documento.visibilityState = "visible"; amb.ouvintes.documento.visibilitychange(); await esperar();
  assert.equal(leituras.length, 2);
  amb.ouvintes.janela.focus(); await esperar();
  assert.equal(leituras.length, 3);
});

test("uma consulta por vez: pedidos durante uma consulta em andamento reaproveitam a mesma", async () => {
  let liberar, chamadas = 0;
  const { amb, acomp } = montar({ ler: () => { chamadas++; return new Promise((r) => { liberar = r; }); } });
  await esperar(); // a consulta inicial já está em andamento
  amb.tick(); amb.tick(); acomp.atualizar();
  await esperar();
  assert.equal(chamadas, 1);
  liberar("x"); await esperar();
});

test("o botão Atualizar consulta com forcar=true", async () => {
  const { acomp, leituras } = montar();
  await esperar();
  await acomp.atualizar();
  assert.deepEqual(leituras, [false, true]);
});

test("falha chama aoErro e o próximo ciclo tenta de novo", async () => {
  let n = 0;
  const { amb, erros, lidas } = montar({ ler: async () => { if (++n === 1) throw new Error("sem rede"); return "ok"; } });
  await esperar();
  assert.deepEqual(erros, ["sem rede"]);
  amb.tick(); await esperar();
  assert.deepEqual(lidas, ["ok"]);
});

test("depois de parar, nada altera a tela, nem uma consulta que já estava em andamento", async () => {
  let liberar;
  const { amb, acomp, lidas } = montar({ ler: () => new Promise((r) => { liberar = r; }) });
  await esperar(); // a consulta inicial já começou
  acomp.parar();
  liberar("tardia"); await esperar();
  assert.deepEqual(lidas, []);
  assert.ok(amb.limpou(), "intervalo cancelado");
  assert.deepEqual(amb.ouvintes, { documento: {}, janela: {} }, "ouvintes removidos");
  assert.equal(await acomp.atualizar(), undefined);
});
