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
- Criar o secret `COPILOT_AGENT_TOKEN` (Etapa 03, abaixo). Os agentes em `.github/agents/` já existem.

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

## Ensaio real (2026-11-11)

- Secret `COPILOT_AGENT_TOKEN` e variáveis `AGENT_RUNTIME=github-native`, `AGENT_DRY_RUN=false` configurados no repositório; label `origin:app` criado; `.env` local com o token do backend (ignorado pelo git).
- Ticket fictício aberto no app -> issue #1 criada (`origin:app`) e o workflow `native-agents` disparou.
- **Bloqueio:** a atribuição ao Copilot devolveu 403. A conta está no plano `free_limited_copilot` (Copilot Free): o cloud agent não está disponível e `copilot-swe-agent` não aparece entre os assignees possíveis do repositório. Falta um plano com cloud agent (Copilot Pro ou superior) para a etapa seguir.
- Quando houver acesso: rode o workflow `native-agents` por `workflow_dispatch` com `issue_number=1` (o `requestId` já está reservado no estado da issue).
- Recomendado: revogar e recriar os dois tokens usados no ensaio (apareceram no chat).

## Etapa 05: entrega da resposta e retomadas

- **Fluxo:** o coordenador abre o PR e grava o relatório com o parecer do Revisor (`review`). O controlador (`automacao/controlador.mjs`) espera o check `build` verde do commit atual (`.github/workflows/build.yml`) e o parecer `ok`. Com `AUTO_MERGE=false` (padrão, variável do repositório) o PR fica disponível para a demonstração. Com `AUTO_MERGE=true`, previamente autorizado, ele integra só o commit conferido (`sha`), respeitando as regras da branch e sem bypass; se as regras barrarem, o PR continua disponível.
- **Resposta e fechamento:** só depois do merge na main o N1 publica a resposta curta (diz que o código foi integrado e que o app local precisa de atualização, sem afirmar que a máquina do aluno já está atualizada) e a issue é fechada. O corpo do PR perde `Fixes/Closes/Resolves` (vira `Refs #N`), para o merge nunca fechar a issue antes da resposta. Cada mensagem tem ID estável (`update:ID`) e é relida antes de postar. Quando o app consulta, o backend importa a resposta marcada para o ticket do dono. Dúvida de uso é respondida sem código e fecha o caso; esclarecimento pendente mantém a issue aberta.
- **Falha:** build vermelho ou parecer `ajustar` pede **uma** correção ao Copilot, por comentário `@copilot` no MESMO PR com o erro curto e o `requestId`. Se continuar falhando, a fase vira `pendente-instrutor` e a pendência fica registrada na issue; nenhum ticket novo é aberto.
- **Retomada (um parágrafo):** o estado (issue, requestId, PR, fase, correção e IDs já publicados) fica num comentário da própria issue, então qualquer execução relê o que já aconteceu antes de agir. Se uma execução cair, as próximas voltam sozinhas pelos eventos `pull_request_target` (inclusive `closed`) e `workflow_run` do `build`; para forçar, rode `native-agents` por `workflow_dispatch` com o número da issue: ele acha o PR pelo estado e continua de onde parou. Falha depois do merge retoma só resposta e fechamento (sem reintegrar). Se o PR for fechado sem merge, a fase vira `pr-fechado` e o instrutor decide.
- **Conferido:** entrega simulada com um GitHub falso em memória (19 verificações: build pendente/vermelho, uma única correção, AUTO_MERGE falso/verdadeiro, merge barrado, merge por pessoa, resposta sem código, esclarecimento pendente, retomada após merge e por `workflow_dispatch`, sem duplicar mensagens e sem token na saída). Testes do projeto (27) e build passam. Nada foi executado no GitHub real.
- **Atenção:** os PRs do Copilot podem exigir que um mantenedor aprove a execução dos workflows (botão "Approve and run workflows") antes de o `build` rodar; enquanto isso o controlador fica em `aguardando-build`. O Copilot cloud agent continua indisponível nesta conta (plano Free), então o fluxo completo ainda não rodou de ponta a ponta.

## Base de conhecimento (`docs/knowledge/`)

- **Estrutura:** `docs/knowledge/README.md` define o formato (frontmatter YAML + corpo curto), onde consultar e quando criar entradas: uma `issue-<n>-<slug>.md` por issue resolvida (qualquer resultado), uma `pr-<n>-<slug>.md` por PR que mexe em código ou documentação, e `historico-...` para o que veio antes do fluxo de issues/PRs.
- **Agentes:** novo agente `conhecimento` escreve as entradas (só em `docs/knowledge/`, sem segredos nem dados pessoais) e o coordenador o chama por último, depois do Revisor; as entradas entram no mesmo PR. Todos os agentes foram instruídos a **consultar a base antes de agir** (busca por palavras, `tags` e `arquivos`). A política de autonomia foi atualizada.
- **Controlador:** o PR de uma dúvida respondida (só entrada de conhecimento + relatório) agora **não é mais fechado**. Com `AUTO_MERGE=true`, build verde e arquivos só nesses caminhos, ele é integrado sem bypass; caso contrário fica disponível. Esclarecimento pendente mantém o PR aberto para a conversa continuar nele.
- **Retroativo:** não havia nenhum PR (aberto ou fechado) nem issue fechada nos dois repositórios, então não há entrada de PR/issue retroativa. A base foi semeada com 4 entradas `historico` do que já foi resolvido por commits (dono em cookie, Copilot Free 403, chat sincronizado, abrir atendimento).
