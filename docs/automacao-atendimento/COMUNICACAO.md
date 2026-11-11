# Comunicação durante o trabalho

O cliente acompanha a conversa no app **enquanto o trabalho acontece**. Cada marco real vira uma mensagem na issue, e o app a mostra. Nada é simulado: só aparece o que um agente de fato escreveu.

## Caminho de um marco

1. O coordenador registra o marco na **descrição do PR**, dentro de um bloco `native-agents-progress` (via `report_progress`).
2. O controlador lê o bloco (como dado) e publica cada marco novo na issue: um comentário interno (`internalText`) e, se houver `publicText`, um comentário público do N1.
3. O backend do app importa os comentários públicos para o ticket do dono; a tela os mostra em poucos segundos, com a conversa aberta ou pelo botão **Atualizar**.

O controlador lê o PR nos eventos do PR e do build, quando o cliente responde, manualmente (`workflow_dispatch`) e **a cada 5 minutos** (varredura). Não há prazo garantido: o GitHub pode atrasar a varredura e o início do Actions/Copilot.

## O bloco de progresso

Exatamente um bloco na descrição do PR, com **todos** os marcos anteriores:

````markdown
```native-agents-progress
{"requestId":"req-12-abc","issueNumber":12,"updates":[{"id":"entendimento","agent":"n1","internalText":"Pedido lido; envolve ordem.js.","publicText":"Entendi que o cartão some ao arrastar para outra lista; vou conferir a causa em ordem.js."},{"id":"revisao-1","agent":"revisor","internalText":"npm run build verde; diff conferido.","publicText":""}]}
```
````

- `requestId` e `issueNumber` são os do pedido (do `custom_instructions`); com valores diferentes o bloco é ignorado.
- `id`: estável (letras, números, `_` ou `-`, até 40 caracteres). `agent`: quem fez o trabalho. Os dois textos são obrigatórios; `publicText` pode ser vazio.
- Não edite um marco já publicado: correções entram como **outro** id.
- Até 100 marcos; `internalText` até 2.000 caracteres e `publicText` até 1.000 (o resto é cortado).

## Quem escreve o quê

- **Especialistas** devolvem ao coordenador o que fizeram, com evidências reais (comando e resultado). Não escrevem ao cliente.
- **Coordenador** registra todo marco relevante em `internalText` e, quando há algo útil ao cliente (entendimento do pedido, causa encontrada, mudança feita, validação, pergunta, bloqueio), invoca o **N1**.
- **Só o N1 escreve `publicText`**: conteúdo real, curto e sem detalhes internos (comandos, caminhos de arquivo, segredos, decisões). Nunca uma confirmação genérica ("recebemos", "estamos analisando"). Sem nada real a dizer, `publicText` fica `""` e o marco fica só na issue.
- Não prometa prazo, conclusão, deploy nem disponibilidade sem evidência.
- Publique o marco **quando ele acontece**, não no fim: se a ferramenta `agent` só devolve ao concluir a chamada, delegue um marco por chamada para poder publicar entre elas.

## Fim do trabalho

Ao concluir, grave o relatório JSON em `resultPath` (com `outcome`, `review` etc., conforme o contrato do coordenador). A resposta final ao cliente e o fechamento da issue só acontecem depois do merge na main (ou, em dúvida respondida, pela triagem). O PR não usa palavras de fechamento (`Fixes`, `Closes`, `Resolves`): escreva `Refs #número`.
