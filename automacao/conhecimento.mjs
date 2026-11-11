// Auditoria da base docs/Knowledge: SOMENTE LEITURA. Lista artigos ausentes e snapshots divergentes.
// A curadoria pertence à entrega original; este script nunca cria issues/PRs, comentários ou atribuições.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PASTA = "docs/Knowledge/";

/** Hash do snapshot da fonte (PR ou issue), como descrito em docs/Knowledge/README.md. */
export function revisaoFonte(tipo, fonte) {
  const dados = tipo === "pr"
    ? [fonte.title, fonte.body, fonte.state, fonte.head.sha, fonte.merged_at]
    : [fonte.title, fonte.body, fonte.state, fonte.closed_at, fonte.state_reason];
  return createHash("sha256").update(JSON.stringify(dados)).digest("hex");
}

// PR só de conhecimento (artigos + relatório do controlador) fica de fora: evita recursão de curadoria.
const soConhecimento = (arquivos) => arquivos.length > 0
  && arquivos.every((f) => f.filename.startsWith(PASTA) || f.filename.startsWith("automacao/resultados/"));

export async function reconciliar(api, { ler = (caminho) => (existsSync(caminho) ? readFileSync(caminho, "utf8") : "") } = {}) {
  async function listar(caminho) {
    const itens = [];
    for (let pagina = 1; ; pagina++) {
      const lote = await api(`${caminho}&page=${pagina}`);
      itens.push(...lote);
      if (lote.length < 100) return itens;
    }
  }
  const issues = await listar("/issues?state=all&per_page=100");
  const prs = await listar("/pulls?state=all&per_page=100");
  const pendencias = [];
  for (const [tipo, fontes] of [["pr", prs], ["issue", issues.filter((i) => !i.pull_request && i.state === "closed")]]) {
    for (const fonte of fontes) {
      if (tipo === "pr" && soConhecimento(await listar(`/pulls/${fonte.number}/files?per_page=100`))) continue;
      const artigo = `${PASTA}${tipo}-${fonte.number}.md`;
      const texto = ler(artigo);
      if (texto.includes(`source_revision: "${revisaoFonte(tipo, fonte)}"`)) continue;
      pendencias.push({ tipo, numero: fonte.number, artigo, motivo: texto ? "snapshot-divergente" : "artigo-ausente" });
    }
  }
  return { pendentes: pendencias.length, pendencias };
}

function cliente(repo, token) {
  return async (caminho) => {
    const resposta = await fetch(`https://api.github.com/repos/${repo}${caminho}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resposta.ok) throw new Error(`GitHub GET ${caminho}: HTTP ${resposta.status}`);
    return resposta.json();
  };
}

async function executar(argv) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? "")) throw new Error("GITHUB_REPOSITORY inválido.");
  if (!process.env.GITHUB_TOKEN) throw new Error("Configure GITHUB_TOKEN para a auditoria de leitura.");
  const api = cliente(repo, process.env.GITHUB_TOKEN);
  const i = argv.indexOf("--revisao");
  if (i >= 0) { // node conhecimento.mjs --revisao pr|issue N  ->  imprime o source_revision para o artigo
    const [tipo, numero] = [argv[i + 1], Number(argv[i + 2])];
    if (!["pr", "issue"].includes(tipo) || !Number.isInteger(numero)) throw new Error("Uso: --revisao pr|issue NUMERO");
    return console.log(revisaoFonte(tipo, await api(`/${tipo === "pr" ? "pulls" : "issues"}/${numero}`)));
  }
  console.log(JSON.stringify(await reconciliar(api), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  executar(process.argv.slice(2)).catch((erro) => { console.error(erro.message); process.exitCode = 1; });
}
