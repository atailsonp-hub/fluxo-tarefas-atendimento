---
tipo: historico
titulo: "Atribuição ao Copilot devolve 403 no plano Copilot Free"
estado: pendente
resultado: human-review
data: 2026-11-11
url: https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/9e730c6
relacionados: []
tags: [copilot, cloud-agent, 403, assignees, plano, actions, ensaio]
arquivos: [automacao/controlador.mjs, .github/workflows/native-agents.yml, docs/automacao-atendimento/PROGRESSO.md]
resumo: "No ensaio real a issue foi criada e o workflow disparou, mas POST /assignees falhou com 403: a conta estava no Copilot Free, sem cloud agent."
fonte: retroativo
---

## Contexto
O ticket aberto no app criou a issue `origin:app` e o workflow `native-agents` rodou, mas a atribuição ao Copilot (`copilot-swe-agent[bot]` com `custom_agent=coordenador`) respondeu 403. A conta estava no plano `free_limited_copilot` e o usuário `copilot-swe-agent` nem aparecia entre os assignees possíveis do repositório.

## O que foi feito
Nada no código: é limitação do plano. O controlador já grava o `requestId` no estado da issue antes de atribuir, então basta rodar o workflow de novo por `workflow_dispatch` (informando o número da issue) quando houver um plano com cloud agent; ele não abre outra sessão.

## Como conferir
`gh api repos/<dono>/<repo>/assignees` lista os assignees possíveis; sem o Copilot na lista, a atribuição falha.

## Quando usar esta entrada
Workflow `native-agents` falhando com 403 em `/assignees`, ou issue `origin:app` parada em fase "novo". Causa mais provável: plano sem cloud agent ou o recurso desligado no repositório. Não é problema do token nem do código; encaminhe a uma pessoa.
