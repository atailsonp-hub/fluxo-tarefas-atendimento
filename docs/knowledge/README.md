# Base de conhecimento dos agentes

Memória do projeto, versionada junto com o código. Toda **issue resolvida** e todo **PR gerado** vira uma entrada aqui, escrita pelo agente `conhecimento`. Os agentes **consultam esta pasta antes de trabalhar**: para responder uma dúvida, decidir uma mudança ou mexer no código.

## Como consultar (antes de agir)

1. Busque em `docs/knowledge/` por palavras do pedido, por `tags` e por caminhos em `arquivos` no frontmatter (ex.: `grep -ril "ordem.js" docs/knowledge`).
2. Leia as entradas relevantes inteiras. Se uma entrada já resolve o pedido, use-a (e cite a entrada na resposta interna).
3. Se uma entrada contradiz o código atual, confie no código e registre a diferença na nova entrada.

## Quando criar entradas

| Fato | Entrada | Arquivo |
|---|---|---|
| Issue `origin:app` resolvida (com código, só resposta ou encaminhada) | `tipo: issue` | `issue-<número>-<slug>.md` |
| PR que altera código ou documentação além do relatório | `tipo: pr` | `pr-<número>-<slug>.md` |
| Histórico anterior ao fluxo de issues/PRs (retroativo) | `tipo: historico` | `historico-<data>-<slug>.md` |

A entrada entra **no mesmo PR** do trabalho (o PR do Copilot já existe quando o agente conhece o número). Em respostas sem código, o PR leva só a entrada e o relatório. O `slug` é o título em minúsculas, sem acento, com hífens (máximo 6 palavras).

## Formato

Frontmatter YAML + corpo curto em português. Modelo:

```markdown
---
tipo: issue            # issue | pr | historico
numero: 12             # número da issue ou do PR (omita em historico)
titulo: "Cartão some ao arrastar para outra lista"
estado: integrado      # issue: respondida | integrado | pendente | encaminhada. pr: integrado | fechado
resultado: code        # code | answered | waiting-customer | commercial | human-review
data: 2026-11-11       # dia da resolução (AAAA-MM-DD)
url: https://github.com/dono/repositorio/issues/12
relacionados: [pr-15]  # entradas ligadas (issue <-> pr)
tags: [quadro, cartao, arrastar]
arquivos: [client/src/ordem.js, client/src/TelaQuadro.jsx]
resumo: "Uma frase que diz o problema e como foi resolvido."
fonte: agente          # agente | retroativo
---

## Contexto
O que o cliente pediu ou o problema, em termos do produto (sem dados pessoais).

## O que foi feito
A resposta dada ou a mudança (por quê, não só o quê).

## Como conferir
Passo curto para ver funcionando ou o comando executado.

## Quando usar esta entrada
Que pedidos futuros se parecem com este, e o que reaproveitar ou evitar.
```

## Regras

- **Sem segredos nem dados pessoais.** O repositório é público: nada de tokens, e-mails, nomes de clientes ou ids de dono. Parafraseie o pedido.
- Uma entrada por issue e uma por PR; não duplique texto, ligue com `relacionados`.
- Curta e verdadeira: só o que foi confirmado (build, teste, conferência). Diga o que não foi conferido.
- Entradas são história: não reescreva as antigas; se algo mudou, crie outra e cite a anterior em `relacionados`.
- Só o agente `conhecimento` escreve aqui, e só nesta pasta.
