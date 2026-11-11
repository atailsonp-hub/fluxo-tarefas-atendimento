---
id: "historico-2026-11-11-dono-httponly-requestid-issue-pendente"
title: "Dono por cookie HttpOnly, requestId desde o ticket, issue pendente e acompanhamento da conversa"
type: "historico"
status: "integrado"
source: "https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/1a8c516"
source_revision: "1a8c51618ee45dd5cdd7e6a43340a35157e682c4"
source_state: "committed"
source_closed_at: null
updated_at: "2026-11-11"
tags: ["atendimento", "dono", "cookie", "httponly", "requestid", "issue-pendente", "sincronizacao", "tickets"]
paths: ["server/src/tickets.js", "server/src/github.js", "server/src/db.js", "client/src/acompanhar-ticket.js", "client/src/api.js", "automacao/controlador.mjs"]
related: ["historico-2026-11-11-tickets-sumiram-dono-em-cookie", "historico-2026-11-11-chat-sincroniza-com-a-issue"]
---

# Dono por cookie HttpOnly, requestId desde o ticket, issue pendente e acompanhamento da conversa

## Quando consultar
Atendimentos que "sumiram" ou aparecem para a pessoa errada; ticket sem issue no GitHub; dúvida sobre como o `requestId` liga ticket, issue e PR; conversa que não atualiza com a aba oculta ou ao voltar para ela.

## Contexto e causa
O dono era um id que o navegador escolhia e mandava no cabeçalho `x-dono` (e num cookie legível por JavaScript): quem forjasse o id via os tickets de outro, e a lista dependia do navegador. Além disso o `requestId` só nascia no controlador, uma falha ao criar a issue ficava sem nova tentativa (`erro-issue`) e a consulta da conversa tinha intervalo fixo, sem olhar a aba.

## Solução e decisão
- **Dono:** cookie `fluxo_dono` definido pelo **servidor** (`HttpOnly; SameSite=Lax; Path=/`, um ano). O cabeçalho `x-dono` não vale mais. Quem tinha o cookie antigo `fluxo-dono` mantém o mesmo id, então os atendimentos existentes continuam visíveis (ver o artigo relacionado).
- **requestId:** `ticket.request_id` (UUID) nasce com o ticket e vai no corpo da issue logo após a marca `<!-- ticket:ID -->`; o controlador o reaproveita (`requestIdDaIssue`, só o do começo do corpo). Issue criada à mão ganha `req-N-...`.
- **issue_pendente:** falha ao criar a issue deixa o ticket nessa fase; nova tentativa (no máximo a cada 30 s, ao abrir a conversa ou enviar mensagem) relê o GitHub pela marca do ticket antes de criar, sem duplicar.
- **Cliente:** `acompanharTicket` consulta a cada 5 s só com a aba visível, de novo ao voltar à aba ou focar a janela, uma consulta por vez, e o botão Atualizar força a releitura da issue.

## Evidências e validação
Testes do projeto (43 passam), incluindo cookie HttpOnly, id antigo adotado, issue com requestId, nova tentativa sem duplicar e o acompanhamento com documento falso; suítes simuladas do controlador; migração aplicada ao banco real (os tickets existentes ganharam `request_id`). Não conferido no navegador real nem com o GitHub real.

## Limites e prevenção
O cookie é por navegador e por host: outro navegador, outro endereço ou outro banco mostra outra lista (não é perda de dados). Tickets criados com um id que nunca virou cookie não voltam sozinhos. O cookie não tem `Secure` porque o app roda em `http` local; atrás de HTTPS acrescente `Secure`. A nova tentativa da issue só ocorre quando alguém abre a conversa ou envia mensagem (a varredura do GitHub não enxerga tickets sem issue).
