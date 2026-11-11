---
tipo: historico
titulo: "Chat do atendimento sincroniza com a issue e não responde sozinho"
estado: integrado
resultado: code
data: 2026-11-11
url: https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/afc9a8a
relacionados: []
tags: [atendimento, chat, sincronizacao, atualizar, resposta-automatica, n1, issue]
arquivos: [client/src/Atendimento.jsx, client/src/api.js, server/src/github.js, server/src/tickets.js, .github/agents/n1.agent.md]
resumo: "A conversa relê a issue com a tela aberta (botão Atualizar força); a mensagem automática falsa de 'recebemos' foi removida: só aparece o que um agente publicou."
fonte: retroativo
---

## Contexto
O cliente via as respostas chegarem de uma vez no fim e uma mensagem "Recebemos sua mensagem" aparecia sozinha, parecendo de um agente sem análise nenhuma.

## O que foi feito
Com a conversa aberta, o app consulta o servidor a cada 4 s e o servidor relê os comentários do N1 na issue no máximo a cada 5 s (o botão **Atualizar** ignora esse limite com `?sync=1`). A resposta automática foi removida; sobra só uma linha discreta "Aguardando resposta do atendimento · atualizado às HH:MM:SS". Os prompts do N1 e do coordenador exigem mensagens com conteúdo real e um update por marco, assim que acontece.

## Como conferir
Simulação sem rede (GitHub falso): a mensagem do N1 entra, a leitura automática respeita o limite de 5 s, o botão traz a nova na hora e nada duplica. `npm test` e build passaram. Não conferido com o Copilot real.

## Quando usar esta entrada
"A resposta demora" ou "não chega": a mensagem só aparece quando o controlador a publica na issue (eventos do PR e do build); o app a mostra em poucos segundos depois. Oriente a usar **Atualizar** e a manter a conversa aberta. Não prometa resposta automática imediata.
