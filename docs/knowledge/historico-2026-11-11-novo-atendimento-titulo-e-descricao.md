---
tipo: historico
titulo: "Como abrir um atendimento: título e descrição"
estado: integrado
resultado: code
data: 2026-11-11
url: https://github.com/atailsonp-hub/fluxo-tarefas-atendimento/commit/fd24386
relacionados: []
tags: [atendimento, abrir, titulo, descricao, issue, formulario]
arquivos: [client/src/Atendimento.jsx, client/src/BarraLateral.jsx, client/src/atendimento.css]
resumo: "A tela de atendimento tem três colunas e o novo atendimento pede título e descrição; o título vira o da issue e a descrição, o corpo."
fonte: retroativo
---

## Contexto
Para o atendimento virar uma issue no GitHub, o pedido precisa de título (resumo) e descrição (detalhes), e a tela segue o modelo de três colunas: navegação, lista de atendimentos e conversa.

## O que foi feito
Menu "Atendimento" na lateral (`/atendimento`), botão "Novo atendimento", formulário com **Título** e **Descrição** obrigatórios e botão "Abrir atendimento". A descrição é a primeira mensagem da conversa; cada atendimento é uma conversa e pode ser fechado, reaberto ou excluído pelo menu "⋯".

## Como conferir
Abrir `/atendimento`, clicar em "Novo atendimento", preencher e enviar: o atendimento aparece na lista e, com o modo real ligado, a issue `origin:app` é criada.

## Quando usar esta entrada
Dúvida de uso "como peço ajuda" ou "onde abro um atendimento": use estes passos. Peça sempre título e descrição objetivos (o que tentou, o que aconteceu, o que esperava).
