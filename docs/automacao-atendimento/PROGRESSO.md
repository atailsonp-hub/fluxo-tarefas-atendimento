# Progresso: automação do atendimento

## Etapa 00: preparar o projeto e o acesso

- **Cópia local:** `c:\Sistema_\Treinamento_1111\App-Fluxo-Tarefas-V1` (reutilizada).
- **URL de origem:** https://github.com/bittencourtthulio/App-Fluxo-Tarefas-V1 (é o `origin` atual, o original do professor; nada foi enviado para lá).
- **Repositório próprio:** ainda não criado. Falta o login do GitHub (`gh auth login`).
- **Node:** v24.22.2 (o projeto exige >= 22.13).
- **Comandos (package.json):** `npm run dev`, `npm run build`, `npm test`, `npm start`.
- **Abrir o app:** `npm run dev`. Ele mostra as portas (API e interface) ao subir; a tela de atendimento fica em `/atendimento`.
- **Build:** `npm run build` concluiu com sucesso (vite, 0 erros).
- **Dados locais:** `server/dados/` (SQLite) preservado e ignorado pelo git.

## Pendências

- Acesso ao GitHub Copilot cloud agent (plano pago + Actions): **não verificado**, o GitHub CLI não está logado.
- Secret `COPILOT_AGENT_TOKEN` e `.github/agents/*.agent.md`: não configurados (fora desta etapa).
- A credencial local do backend (`.env`, ignorado pelo git) fica separada do secret `COPILOT_AGENT_TOKEN`; nenhum valor foi lido ou registrado.
