---
tipo: historico
titulo: "Atendimentos 'sumiram' quando a porta do app mudou (dono em cookie)"
estado: integrado
resultado: code
data: 2026-11-11
url: https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/a147e54
relacionados: []
tags: [atendimento, tickets, dono, sumiram, porta, cookie, lista-vazia]
arquivos: [client/src/api.js, server/src/tickets.js]
resumo: "O id do dono ficava no localStorage (por porta); em desenvolvimento a porta muda a cada reinício e a lista parecia vazia. Passou para um cookie compartilhado entre portas."
fonte: retroativo
---

## Contexto
Cada navegador é "dono" dos próprios atendimentos por um id anônimo enviado no cabeçalho `x-dono` (não há login). O servidor só lista e abre os atendimentos do dono. O id ficava no `localStorage`, que é separado por porta: ao reiniciar o `npm run dev` a porta mudava (5174, 5176, 5177...), nascia um id novo e a lista aparecia vazia.

## O que foi feito
O id passou a ficar num cookie `fluxo-dono` (vale para todas as portas de `127.0.0.1`, validade de um ano). Se já havia id no `localStorage`, ele é reaproveitado e copiado para o cookie.

## Como conferir
Abrir `/atendimento` em duas portas diferentes do mesmo navegador: a lista é a mesma. Testes do projeto (`npm test`) e build passaram.

## Quando usar esta entrada
Cliente diz que "os atendimentos sumiram" ou a lista está vazia. Primeiro confira se mudou de navegador, de endereço (cookies são por navegador) ou de banco/pasta do app. Atendimentos criados **antes** da correção continuam presos aos ids antigos e não voltam sozinhos. Não é perda de dados: confirme no banco antes de responder.
