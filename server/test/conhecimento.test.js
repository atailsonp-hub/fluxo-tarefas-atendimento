import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { reconciliar, revisaoFonte } from "../../automacao/conhecimento.mjs";

const repo = "exemplo/fluxo";
const pr = { number: 12, title: "Corrigir chat", body: "Contexto", state: "open", head: { sha: "abc" }, merged_at: null, html_url: `https://github.com/${repo}/pull/12` };
const issue = { number: 9, title: "Como criar quadro", body: "Dúvida", state: "closed", closed_at: "2026-11-11T12:00:00Z", state_reason: "completed", html_url: `https://github.com/${repo}/issues/9` };

function ambiente({ prs = [pr], issues = [issue], arquivos = [{ filename: "client/src/tela.jsx" }] } = {}) {
  return {
    api: async (caminho, operacao) => {
      assert.equal(operacao, undefined, "a auditoria não pode escrever na API");
      if (caminho.startsWith("/issues?")) return issues;
      if (caminho.startsWith("/pulls?")) return prs;
      if (caminho.includes("/files?")) return arquivos;
      throw new Error(`Consulta inesperada: ${caminho}`);
    },
  };
}

test("fontes sem artigo são relatadas, só com leitura", async () => {
  const resultado = await reconciliar(ambiente().api, { ler: () => "" });
  assert.deepEqual(resultado.pendencias.map((p) => [p.artigo, p.motivo]), [
    ["docs/Knowledge/pr-12.md", "artigo-ausente"],
    ["docs/Knowledge/issue-9.md", "artigo-ausente"],
  ]);
});

test("snapshot igual é omitido; head ou merge diferentes só geram diagnóstico", async () => {
  const ler = () => `source_revision: "${revisaoFonte("pr", pr)}"`;
  assert.equal((await reconciliar(ambiente({ issues: [] }).api, { ler })).pendentes, 0);
  for (const nova of [{ ...pr, head: { sha: "def" } }, { ...pr, state: "closed", merged_at: "2026-11-11" }]) {
    const resultado = await reconciliar(ambiente({ prs: [nova], issues: [] }).api, { ler });
    assert.equal(resultado.pendencias[0].motivo, "snapshot-divergente");
  }
});

test("PR só de conhecimento (artigos e relatório) fica fora; PR de produto e issue fechada entram; issue aberta não", async () => {
  const soBase = ambiente({ issues: [], arquivos: [{ filename: "docs/Knowledge/pr-4.md" }, { filename: "automacao/resultados/req-1.json" }] });
  assert.equal((await reconciliar(soBase.api, { ler: () => "" })).pendentes, 0);
  const comProduto = ambiente({ issues: [{ ...issue, state: "open" }], arquivos: [{ filename: "docs/Knowledge/pr-12.md" }, { filename: "client/src/tela.jsx" }] });
  assert.equal((await reconciliar(comProduto.api, { ler: () => "" })).pendentes, 1);
});

test("paginação lê além da primeira página, sem escrever", async () => {
  let pagina2 = false;
  const base = ambiente({ prs: [], issues: [] });
  const api = async (caminho, operacao) => {
    if (caminho.startsWith("/pulls?")) {
      if (caminho.endsWith("page=1")) return Array.from({ length: 100 }, (_, i) => ({ ...pr, number: i + 100 }));
      pagina2 = true;
      return [pr];
    }
    return base.api(caminho, operacao);
  };
  assert.equal((await reconciliar(api, { ler: () => "" })).pendentes, 101);
  assert.ok(pagina2);
});

test("artigos da base têm metadados completos, seções, caminhos e relações válidos", () => {
  const pasta = new URL("../../docs/Knowledge/", import.meta.url);
  const campos = ["id", "title", "type", "status", "source", "source_revision", "source_state", "source_closed_at", "updated_at", "tags", "paths", "related"];
  const estados = { pr: ["proposta", "integrado", "descartado"], issue: ["em-atendimento", "resolvido", "encerrado-sem-solucao"], historico: ["integrado", "pendente"] };
  const secoes = ["## Quando consultar", "## Contexto e causa", "## Solução e decisão", "## Evidências e validação", "## Limites e prevenção"];
  const arquivos = readdirSync(pasta).filter((n) => n.endsWith(".md") && !["README.md", "TEMPLATE.md"].includes(n));
  const ids = new Set(arquivos.map((n) => n.slice(0, -3)));
  assert.ok(arquivos.length > 0, "a base não pode estar vazia");
  for (const nome of arquivos) {
    assert.match(nome, /^(pr-\d+|issue-\d+|historico-\d{4}-\d{2}-\d{2}-[a-z0-9-]+)\.md$/, `${nome}: nome fora do padrão`);
    const texto = readFileSync(new URL(nome, pasta), "utf8").replace(/\r\n/g, "\n");
    const front = texto.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(front, `${nome}: sem frontmatter`);
    const meta = Object.fromEntries(front[1].split("\n").map((l) => { const i = l.indexOf(":"); return [l.slice(0, i), JSON.parse(l.slice(i + 1))]; }));
    for (const campo of campos) assert.ok(Object.hasOwn(meta, campo), `${nome}: falta ${campo}`);
    assert.equal(`${meta.id}.md`, nome, `${nome}: id diferente do arquivo`);
    assert.ok(estados[meta.type]?.includes(meta.status), `${nome}: status ${meta.status} inválido para ${meta.type}`);
    assert.ok(meta.type === "historico" ? /^[a-f0-9]{40}$/.test(meta.source_revision) : meta.source_revision === null || /^[a-f0-9]{64}$/.test(meta.source_revision), `${nome}: source_revision inválido`);
    assert.match(meta.updated_at, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(meta.tags.length > 0, `${nome}: sem tags`);
    for (const caminho of meta.paths) assert.ok(existsSync(new URL(`../../${caminho}`, import.meta.url)), `${nome}: caminho inexistente ${caminho}`);
    for (const rel of meta.related) assert.ok(ids.has(rel), `${nome}: relação inexistente ${rel}`);
    for (const secao of secoes) assert.ok(texto.includes(secao), `${nome}: falta ${secao}`);
    assert.ok(!/github_pat_|gho_|ghp_|Bearer |@gmail\./i.test(texto), `${nome}: possível segredo ou dado pessoal`);
  }
});
