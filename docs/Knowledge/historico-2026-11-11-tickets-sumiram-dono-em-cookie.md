---
id: "historico-2026-11-11-tickets-sumiram-dono-em-cookie"
title: "Atendimentos 'sumiram' quando a porta do app mudou (dono em cookie)"
type: "historico"
status: "integrado"
source: "https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/a147e54"
source_revision: "a147e54ac863fe5524f00d9581f349e5fe903701"
source_state: "committed"
source_closed_at: null
updated_at: "2026-11-11"
tags: ["atendimento", "tickets", "dono", "sumiram", "porta", "cookie", "lista-vazia"]
paths: ["client/src/api.js", "server/src/tickets.js"]
related: []
---

# Atendimentos 'sumiram' quando a porta do app mudou (dono em cookie)

## Quando consultar
O cliente diz que os atendimentos sumiram, ou a lista de atendimentos aparece vazia.

## Contexto e causa
Cada navegador é "dono" dos próprios atendimentos por um id anônimo enviado no cabeçalho `x-dono` (não há login); o servidor só lista e abre os do dono. O id ficava no `localStorage`, que é separado por porta: ao reiniciar o `npm run dev` a porta mudava (5174, 5176, 5177...), nascia um id novo e a lista parecia vazia.

## Solução e decisão
O id passou a ficar num cookie `fluxo-dono` (vale para todas as portas de `127.0.0.1`, validade de um ano). Se já havia id no `localStorage`, ele é reaproveitado e copiado para o cookie.

## Evidências e validação
Abrir `/atendimento` em duas portas diferentes do mesmo navegador mostra a mesma lista. `npm test` e o build passaram na época (commit a147e54). Não houve teste automatizado do cookie no navegador.

## Limites e prevenção
Atendimentos criados **antes** da correção continuam presos aos ids antigos e não voltam sozinhos. Cookie é por navegador e por host: outro navegador, outro endereço ou outro banco/pasta do app mostra outra lista. Não é perda de dados: confirme no banco antes de responder. A Aula-2 (original do professor) usa cookie `HttpOnly` definido pelo servidor, mais seguro que este cookie legível por JavaScript.
