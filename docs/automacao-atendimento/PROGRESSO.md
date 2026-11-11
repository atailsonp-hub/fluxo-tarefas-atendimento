# Progresso: automação do atendimento

## Etapa 00: preparar o projeto e o acesso

- **Origem do código:** https://github.com/bittencourtthulio/App-Fluxo-Tarefas-V1 (original do professor, intocado).
- **Minha cópia (repositório novo, público):** https://github.com/atailsonp-hub/fluxo-tarefas-atendimento (`origin`, histórico novo).
- **Pasta local:** `c:\Sistema_\Treinamento_1111\App-Fluxo-Tarefas-V1`.
- **Node:** v24.22.2 (o projeto exige >= 22.13).
- **Comandos (package.json):** `npm run dev`, `npm run build`, `npm test`, `npm start`.
- **Abrir o app:** `npm run dev` (mostra as portas ao subir; atendimento em `/atendimento`).
- **Build:** `npm run build` concluiu sem erros.
- **Dados locais:** `server/dados/` (SQLite) e `.env` não vão para o git.

## Acesso ao GitHub

- **GitHub CLI:** logado como `atailsonp-hub` (escopos `repo`, `read:org`, `gist`).
- **Actions:** habilitadas no repositório novo (`allowed_actions: all`).
- **Copilot:** plano `individual` e chat ativo. O Copilot cloud agent **não foi confirmado** (a API não informa), então falta testar na prática.
- **Credenciais:** a do backend (`.env` local) é separada do secret `COPILOT_AGENT_TOKEN` das Actions. Nenhum valor foi lido ou registrado.

## Pendências

- Confirmar o Copilot cloud agent no repositório (Settings do repositório, Copilot).
- Criar o secret `COPILOT_AGENT_TOKEN` e `.github/agents/*.agent.md` (próximas etapas).

## Etapa 03: app, issue e coordenador

- **Ticket -> issue:** o backend (`server/src/github.js`) cria UMA issue `origin:app` por ticket e guarda `issue_number`, `fase` e o dono no SQLite. O dono é um id anônimo do navegador (`x-dono`); cada um só vê os seus tickets.
- **Controlador:** `automacao/controlador.mjs` + `.github/workflows/native-agents.yml` (roda da `main`). Atribui a mesma issue ao Copilot (`custom_agent=coordenador`), guarda o estado mínimo num comentário da issue e publica os updates do relatório. `workflow_dispatch` retoma uma issue.
- **Resposta no app:** o controlador publica o texto do N1 como comentário marcado na issue; o backend lê esses comentários e os mostra no ticket.
- **Modo:** `AGENT_RUNTIME=github-native`, `AGENT_DRY_RUN=true` (padrão). Em dry-run nada sai da máquina. Não existia motor antigo para suspender.
- **Variáveis do backend:** `.env.example` (`GITHUB_REPO`, `GITHUB_ISSUES_TOKEN`). Esse token é diferente do secret `COPILOT_AGENT_TOKEN`.
- **Conferido localmente (dados fictícios):** testes (27) e build passam; a leitura do ticket pelo dono e a montagem da atribuição (`node automacao/controlador.mjs --exemplo`) funcionam. Nenhuma chamada ao GitHub foi feita.
- **Atenção:** o repositório é público, então as issues (com o texto do ticket) também serão públicas quando o dry-run for desligado. Use só dados fictícios no ensaio.

### Falta
- Criar o secret `COPILOT_AGENT_TOKEN` (Actions) e o token do backend no `.env`; criar o label `origin:app`.
- Ensaio real: desligar `AGENT_DRY_RUN` (variável do repositório e `.env`).
- Mensagem do cliente depois do primeiro pedido ainda não vai para a issue.
