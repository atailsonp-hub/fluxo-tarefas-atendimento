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
