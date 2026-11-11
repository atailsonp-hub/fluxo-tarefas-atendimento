---
id: "historico-2026-11-11-novo-atendimento-titulo-e-descricao"
title: "Como abrir um atendimento: título e descrição"
type: "historico"
status: "integrado"
source: "https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/fd24386"
source_revision: "fd24386979f3244d298774af815eb4c2ab7d21e2"
source_state: "committed"
source_closed_at: null
updated_at: "2026-11-11"
tags: ["atendimento", "abrir", "titulo", "descricao", "issue", "formulario"]
paths: ["client/src/Atendimento.jsx", "client/src/BarraLateral.jsx", "client/src/atendimento.css"]
related: []
---

# Como abrir um atendimento: título e descrição

## Quando consultar
Dúvida de uso "como peço ajuda" ou "onde abro um atendimento".

## Contexto e causa
Para o atendimento virar uma issue no GitHub, o pedido precisa de título (resumo) e descrição (detalhes). A tela segue o modelo de três colunas: navegação, lista de atendimentos e conversa.

## Solução e decisão
Menu "Atendimento" na lateral (`/atendimento`), botão "Novo atendimento" e formulário com **Título** e **Descrição** obrigatórios e botão "Abrir atendimento". O título vira o da issue e a descrição, a primeira mensagem da conversa. Cada atendimento é uma conversa e pode ser fechado, reaberto ou excluído pelo menu "⋯".

## Evidências e validação
Abrindo `/atendimento` e enviando o formulário, o atendimento aparece na lista; com o modo real ligado a issue `origin:app` é criada (conferido no ensaio). `npm test` e o build passaram.

## Limites e prevenção
Peça sempre título e descrição objetivos (o que tentou, o que aconteceu, o que esperava). Um atendimento fechado é reaberto ao receber uma nova mensagem.
