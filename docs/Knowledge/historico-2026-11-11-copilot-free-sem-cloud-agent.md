---
id: "historico-2026-11-11-copilot-free-sem-cloud-agent"
title: "Atribuição ao Copilot devolve 403 no plano Copilot Free"
type: "historico"
status: "pendente"
source: "https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/9e730c6"
source_revision: "9e730c6e6868665d41026d6514cef4df1546d1a4"
source_state: "committed"
source_closed_at: null
updated_at: "2026-11-11"
tags: ["copilot", "cloud-agent", "403", "assignees", "plano", "actions", "ensaio"]
paths: ["automacao/controlador.mjs", ".github/workflows/native-agents.yml", "docs/automacao-atendimento/PROGRESSO.md"]
related: []
---

# Atribuição ao Copilot devolve 403 no plano Copilot Free

## Quando consultar
O workflow `native-agents` falha com 403 em `POST /issues/N/assignees`, ou uma issue `origin:app` fica parada na fase "novo".

## Contexto e causa
No ensaio real o ticket aberto no app criou a issue `origin:app` e o workflow rodou, mas a atribuição ao Copilot (`copilot-swe-agent[bot]`, `custom_agent=coordenador`) respondeu 403. A conta estava no plano `free_limited_copilot` e o usuário `copilot-swe-agent` nem aparecia entre os assignees possíveis do repositório (`gh api repos/<dono>/<repo>/assignees`).

## Solução e decisão
Nada no código: é limitação do plano (Copilot cloud agent exige um plano pago, como Pro ou superior). O controlador grava o `requestId` no estado da issue antes de atribuir; quando houver plano, rodar o workflow `native-agents` por `workflow_dispatch` informando o número da issue retoma sem abrir outra sessão.

## Evidências e validação
Log do workflow no ensaio (POST /assignees com 403) e a listagem de assignees do repositório sem o Copilot. Não foi repetido depois de mudar de plano: o estado continua pendente.

## Limites e prevenção
Não é problema do token nem do código; encaminhe a uma pessoa. O Copilot CLI (usado na triagem) funcionou na mesma conta, então a falta de cloud agent bloqueia só a atribuição de código, não o acolhimento nem a resposta de dúvidas.
