---
id: "historico-2026-11-11-chat-sincroniza-com-a-issue"
title: "Chat do atendimento sincroniza com a issue e não responde sozinho"
type: "historico"
status: "integrado"
source: "https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/afc9a8a"
source_revision: "afc9a8a5ab90f89ec0e6b8233403dfe17d6c2bdb"
source_state: "committed"
source_closed_at: null
updated_at: "2026-11-11"
tags: ["atendimento", "chat", "sincronizacao", "atualizar", "resposta-automatica", "n1", "issue"]
paths: ["client/src/Atendimento.jsx", "client/src/api.js", "server/src/github.js", "server/src/tickets.js", ".github/agents/n1.agent.md"]
related: []
---

# Chat do atendimento sincroniza com a issue e não responde sozinho

## Quando consultar
"A resposta demora", "não chega", "a mensagem veio toda de uma vez", ou pedido de resposta automática imediata no chat.

## Contexto e causa
O cliente via as respostas chegarem de uma vez no fim e uma mensagem "Recebemos sua mensagem" aparecia sozinha, parecendo de um agente sem análise nenhuma. A mensagem era fixa na tela, não de um agente.

## Solução e decisão
Com a conversa aberta o app consulta o servidor a cada 4 s e o servidor relê os comentários do N1 na issue no máximo a cada 5 s (o botão **Atualizar** ignora o limite com `?sync=1`). A resposta automática foi removida: sobra só uma linha "Aguardando resposta do atendimento · atualizado às HH:MM:SS". Os prompts do N1 e do coordenador exigem mensagens com conteúdo real, um update por marco e nunca confirmação genérica.

## Evidências e validação
Simulação sem rede (GitHub falso): a mensagem do N1 entra, a leitura automática respeita o limite de 5 s, o botão traz a nova na hora e nada duplica. `npm test` e o build passaram. Não conferido com o Copilot real.

## Limites e prevenção
A mensagem só aparece quando o controlador a publica na issue (eventos do PR e do build, e a varredura a cada 5 minutos); o app a mostra em poucos segundos depois. Oriente a manter a conversa aberta e usar **Atualizar**. Não prometa resposta automática imediata nem prazo.
