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

## Base de conhecimento (`docs/Knowledge/`)

- **Estrutura:** `docs/Knowledge/README.md` define o formato (frontmatter YAML + corpo curto), onde consultar e quando criar entradas: uma `issue-<n>-<slug>.md` por issue resolvida (qualquer resultado), uma `pr-<n>-<slug>.md` por PR que mexe em código ou documentação, e `historico-...` para o que veio antes do fluxo de issues/PRs.
- **Agentes:** novo agente `conhecimento` escreve as entradas (só em `docs/Knowledge/`, sem segredos nem dados pessoais) e o coordenador o chama por último, depois do Revisor; as entradas entram no mesmo PR. Todos os agentes foram instruídos a **consultar a base antes de agir** (busca por palavras, `tags` e `arquivos`). A política de autonomia foi atualizada.
- **Controlador:** o PR de uma dúvida respondida (só entrada de conhecimento + relatório) agora **não é mais fechado**. Com `AUTO_MERGE=true`, build verde e arquivos só nesses caminhos, ele é integrado sem bypass; caso contrário fica disponível. Esclarecimento pendente mantém o PR aberto para a conversa continuar nele.
- **Retroativo:** não havia nenhum PR (aberto ou fechado) nem issue fechada nos dois repositórios, então não há entrada de PR/issue retroativa. A base foi semeada com 4 entradas `historico` do que já foi resolvido por commits (dono em cookie, Copilot Free 403, chat sincronizado, abrir atendimento).

## Triagem antes de atribuir (trazido da Aula-2)

- **O que muda:** ao receber uma issue `origin:app`, o controlador chama o N1 pelo Copilot CLI para o **acolhimento real** (recebimento, resumo e encaminhamento, sem antecipar a resposta) e publica na issue (id `recebimento`). Em seguida N1 e coordenador (e o PO, se o coordenador pedir) triam: `answer` responde e fecha a issue sem PR; `clarification` pergunta e a issue espera o cliente; `code` atribui a MESMA issue ao Copilot (`custom_agent=coordenador`) levando a triagem como ponto de partida. Divergência entre N1 e coordenador ou resposta fora do contrato interrompe antes de atribuir.
- **Segurança:** o CLI roda só com `view,grep,glob`, sem shell nem escrita, e só recebe o token do CLI no ambiente (não vê `GITHUB_TOKEN` nem `COPILOT_AGENT_TOKEN`). O texto do cliente entra como dado JSON.
- **Resposta do cliente:** o backend repassa cada mensagem do cliente à issue como comentário marcado (`<!-- cliente-msg:ID -->`, dentro de cerca, como dado); o workflow reage a `issue_comment` só com essa marca e só do autor da issue, e triam de novo com a conversa. O primeiro pedido não é repetido (já está no corpo).
- **Configuração:** `COPILOT_CLI_TOKEN` (secret) = PAT fino com **Account > Copilot Requests (Read-only)** e licença Copilot ativa; sem esse secret o workflow tenta `COPILOT_AGENT_TOKEN`, que hoje NÃO tem essa permissão (a triagem então falha e nada é atribuído, a issue fica em `novo`). `AGENT_TRIAGE=false` (variável) desliga a triagem e volta ao comportamento anterior. O workflow instala `@github/copilot@1.0.109` só em modo real.
- **Conferido:** 19 cenários simulados (GitHub e CLI falsos) cobrindo código, dúvida, esclarecimento, consulta ao PO, divergência, falha de acolhimento/retomada, resposta inválida, triagem desligada e dry-run; repasse das falas do cliente sem duplicar; testes do projeto (27) e build. **Com o Copilot CLI real**, uma vez, localmente e com dados fictícios (token OAuth do `gh`, plano Copilot Free): o acolhimento só confirmou o recebimento e a triagem devolveu `answer` com orientação correta e evidências em arquivos reais. Isso corrigiu dois pontos do contrato (o modelo respondia `answered` e antecipava a resposta no acolhimento).
- **Não conferido:** execução no GitHub Actions (falta o token do CLI com a permissão acima) e o laço completo de esclarecimento no GitHub real.

## Progresso incremental pelo PR e varredura a cada 5 min (trazido da Aula-2)

- **Bloco no PR:** o coordenador mantém na descrição do PR um bloco `native-agents-progress` (via `report_progress`) com todos os marcos. O controlador lê o bloco como dado (só vale com o `requestId` e o `issueNumber` desta solicitação, ids seguros) e publica cada marco **novo** na issue: comentário interno e, se houver `publicText`, comentário público do N1, que o backend importa para o ticket. Isso funciona mesmo antes de existir o relatório final, então a conversa avança durante o trabalho em vez de tudo no fim. O relatório JSON em `resultPath` continua para o fim (`outcome`, `review`).
- **Varredura:** `schedule` a cada 5 minutos reconcilia todas as issues `origin:app` abertas, uma a uma (erro numa não para as outras). Ela acha o PR do Copilot da issue sozinha (autor Copilot, mesmo repositório, `base=main`, `#N` no corpo) e retoma issues paradas em `novo` há mais de 15 minutos (antes disso o evento da própria issue cuida). O GitHub pode atrasar o agendamento e desativa workflows agendados após 60 dias sem atividade no repositório.
- **Contrato:** `docs/automacao-atendimento/COMUNICACAO.md` (formato do bloco, quem escreve o quê; só o N1 escreve `publicText`) e o prompt do coordenador foram atualizados; o `custom_instructions` da atribuição aponta para eles.
- **Conferido:** 13 cenários simulados (bloco publicado sem relatório final, sem duplicar, marco novo incremental, blocos inválidos ignorados, varredura acha o PR, PR de terceiros ignorado, issue recente em `novo` intocada e issue antiga retomada) + as suítes anteriores (entrega 22, triagem 19, sincronização e repasse), 27 testes do projeto e build. **Não conferido** no GitHub real nem com o Copilot escrevendo o bloco.

## Conhecimento padronizado (trazido da Aula-2)

- **Pasta e nome:** `docs/knowledge` virou `docs/Knowledge` (como na Aula-2); todas as referências foram atualizadas.
- **Contrato:** `AGENTS.md` na raiz (consultar antes de agir, curadoria dentro da própria tarefa, estados `proposta/integrado/em-atendimento/resolvido`), `docs/Knowledge/TEMPLATE.md` e o novo README, com frontmatter `id, title, type, status, source, source_revision, source_state, source_closed_at, updated_at, tags, paths, related` e as cinco seções (Quando consultar, Contexto e causa, Solução e decisão, Evidências e validação, Limites e prevenção). Nomes `pr-N.md`, `issue-N.md` e `historico-AAAA-MM-DD-slug.md`. Sem índice no README (conflitaria entre PRs em paralelo); a consulta é por busca em `title`, `tags` e `paths`.
- **Auditoria:** `automacao/conhecimento.mjs` (somente leitura; `revisaoFonte`, `reconciliar` e `--revisao pr|issue N`) e o workflow manual `knowledge.yml`. PRs só de conhecimento (artigos + relatório) ficam fora para evitar recursão.
- **Dúvida sem código:** a triagem passou a publicar, no comentário interno da resposta e antes de fechar a issue, um registro estruturado de conhecimento (solução, evidências, limites).
- **Artigos existentes:** os 4 `historico` foram convertidos para o esquema novo (`source_revision` = SHA do commit).
- **Teste:** `server/test/conhecimento.test.js` (auditoria + validação de todos os artigos: campos, estado por tipo, seções, caminhos existentes, relações, sem segredo). 32 testes do projeto passam e o build também. A auditoria não foi executada no GitHub real.
- **Diferença deliberada:** mantivemos o agente `conhecimento` (a Aula-2 também o prevê) e `source_revision = null` quando o hash não puder ser calculado (o agente não tem token garantido), em vez de inventar.

## Dono seguro, requestId desde o ticket, issue pendente e acompanhamento (trazido da Aula-2)

- **Dono por cookie HttpOnly do servidor:** `fluxo_dono` é definido pelo servidor (`HttpOnly; SameSite=Lax`), o navegador não o lê nem o escolhe, e o cabeçalho `x-dono` deixou de valer (quem forja um id não vê nada). Quem tinha o cookie antigo (`fluxo-dono`, legível por JavaScript) mantém o mesmo id, então os atendimentos existentes continuam aparecendo. O cliente não manda mais cabeçalho nenhum.
- **requestId desde a criação:** o ticket nasce com `request_id` (UUID, coluna nova com preenchimento dos existentes e índice único) gravado no corpo da issue logo após a marca do ticket. O controlador o reaproveita (`requestIdDaIssue`: só o do começo do corpo, nunca texto do cliente); issues criadas à mão ganham `req-N-...` como antes.
- **issue_pendente:** falha ao criar a issue deixa o ticket em `issue_pendente` (substitui `erro-issue`) e uma nova tentativa, no máximo a cada 30 s ao abrir a conversa ou enviar mensagem, relê o GitHub pela marca do ticket antes de criar, então não duplica e mantém o mesmo requestId.
- **Acompanhamento no cliente:** `client/src/acompanhar-ticket.js` consulta a cada 5 s só com a aba visível, de novo ao voltar para a aba ou focar a janela, uma consulta por vez; depois de parar nada altera a tela; o botão Atualizar força a releitura da issue. Falha de consulta aparece na linha de status sem perder o histórico.
- **Conferido:** 43 testes do projeto (novos: cookie HttpOnly e dono, cookie antigo adotado, issue com requestId, nova tentativa sem duplicar e dry-run, e 6 do acompanhamento) e build; suítes simuladas do controlador (entrega 22, triagem 21, progresso 13, sincronização e repasse); migração aplicada ao banco real (versão 7, os 2 tickets existentes ganharam requestId). **Não conferido** no navegador real nem com o GitHub real.
