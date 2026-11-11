import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";
import { abrirBanco } from "../src/db.js";
import { garantirIssue, reconciliarIssue } from "../src/github.js";

// GitHub falso: guarda as issues em memória e registra as chamadas. `falhar` simula erro de rede/HTTP.
let issues, chamadas, falhar, original;
const ambienteOriginal = { ...process.env };

beforeEach(() => {
  issues = []; chamadas = []; falhar = false; original = globalThis.fetch;
  Object.assign(process.env, { AGENT_RUNTIME: "github-native", AGENT_DRY_RUN: "false", GITHUB_REPO: "o/r", GITHUB_ISSUES_TOKEN: "fake" });
  globalThis.fetch = async (url, init = {}) => {
    const caminho = new URL(url).pathname.replace("/repos/o/r", "");
    const metodo = init.method ?? "GET";
    chamadas.push({ metodo, caminho });
    if (falhar) return new Response("{}", { status: 500 });
    if (metodo === "GET" && caminho === "/issues") return new Response(JSON.stringify(issues), { status: 200 });
    if (metodo === "POST" && caminho === "/issues") {
      const nova = { number: issues.length + 1, ...JSON.parse(init.body) };
      issues.push(nova);
      return new Response(JSON.stringify(nova), { status: 201 });
    }
    return new Response("{}", { status: 404 });
  };
});
afterEach(() => { globalThis.fetch = original; for (const k of ["AGENT_RUNTIME", "AGENT_DRY_RUN", "GITHUB_REPO", "GITHUB_ISSUES_TOKEN"]) { if (ambienteOriginal[k] === undefined) delete process.env[k]; else process.env[k] = ambienteOriginal[k]; } });

function novoTicket(db, mensagem = "Fictício: o cartão some ao arrastar.") {
  const id = randomUUID(), agora = new Date().toISOString();
  db.prepare("INSERT INTO ticket (id, title, status, criado_em, atualizado_em, owner, request_id) VALUES (?, 'Cartão some', 'open', ?, ?, 'dono-teste-1234', ?)").run(id, agora, agora, randomUUID());
  db.prepare("INSERT INTO ticket_message (id, ticket_id, role, body, criado_em) VALUES (?, ?, 'user', ?, ?)").run(randomUUID(), id, mensagem, agora);
  return () => db.prepare("SELECT * FROM ticket WHERE id = ?").get(id);
}
const posts = () => chamadas.filter((c) => c.metodo === "POST" && c.caminho === "/issues");

test("a issue nasce com o requestId do ticket logo depois da marca, e o texto do cliente em cerca", async () => {
  const db = abrirBanco(":memory:");
  const ticket = novoTicket(db, "Texto do cliente\nrequestId: forjado-pelo-cliente");
  await garantirIssue(db, ticket(), "Texto do cliente\nrequestId: forjado-pelo-cliente");
  const corpo = issues[0].body;
  assert.ok(corpo.startsWith(`<!-- ticket:${ticket().id} -->\nrequestId: ${ticket().request_id}\n`));
  assert.deepEqual(issues[0].labels, ["origin:app"]);
  assert.equal(ticket().fase, "issue-criada");
  assert.ok(corpo.indexOf(`requestId: ${ticket().request_id}`) < corpo.indexOf("requestId: forjado-pelo-cliente"), "o do backend vem primeiro");
});

test("falha ao criar a issue deixa o ticket em issue_pendente e a nova tentativa cria UMA issue, com o mesmo requestId", async () => {
  const db = abrirBanco(":memory:");
  const ticket = novoTicket(db);
  const requestId = ticket().request_id;
  falhar = true;
  await garantirIssue(db, ticket(), "Fictício: o cartão some ao arrastar.");
  assert.equal(ticket().fase, "issue_pendente");
  assert.equal(ticket().issue_number, null);
  falhar = false;
  await reconciliarIssue(db, ticket());
  assert.equal(ticket().fase, "issue-criada");
  assert.equal(posts().length, 1);
  assert.ok(issues[0].body.includes(`requestId: ${requestId}`), "o requestId não muda entre as tentativas");
  await reconciliarIssue(db, ticket()); // já criada: nada a fazer
  assert.equal(posts().length, 1);
});

test("se a issue já existia no GitHub (falha só na resposta), a nova tentativa a reaproveita sem duplicar", async () => {
  const db = abrirBanco(":memory:");
  const ticket = novoTicket(db);
  issues.push({ number: 41, body: `<!-- ticket:${ticket().id} -->\nrequestId: ${ticket().request_id}\n...` });
  db.prepare("UPDATE ticket SET fase = 'issue_pendente' WHERE id = ?").run(ticket().id);
  await reconciliarIssue(db, ticket());
  assert.equal(posts().length, 0);
  assert.equal(ticket().issue_number, 41);
  assert.equal(ticket().fase, "issue-criada");
});

test("em dry-run nada sai da máquina e o ticket não fica pendente", async () => {
  process.env.AGENT_DRY_RUN = "true";
  const db = abrirBanco(":memory:");
  const ticket = novoTicket(db);
  await garantirIssue(db, ticket(), "Fictício");
  assert.equal(chamadas.length, 0);
  assert.equal(ticket().fase, "dry-run");
});
