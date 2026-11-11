# Produto: Fluxo

Fluxo é um quadro de tarefas no estilo Trello, com uma área de atendimento. Roda local: interface React/Vite, API Node e banco SQLite.

## O que o app faz

- **Quadros:** um quadro por projeto. Criar, renomear e excluir (excluir apaga as listas e os cartões dele).
- **Listas:** colunas de etapas dentro do quadro. Criar, renomear e excluir (apaga os cartões dela).
- **Cartões:** título e descrição opcional. Criar, editar e excluir.
- **Mover cartões:** arrastando com o mouse, ou pelo menu do cartão em "Mover para" (escolhe a lista de destino).
- **Atendimento (menu lateral, `/atendimento`):** o usuário abre um ticket com título e descrição. Cada ticket é uma conversa. Dá para responder, fechar, reabrir e excluir.
- **Dados de exemplo:** na primeira execução o banco vem com os quadros "Sprint da semana" e "Ideias do produto".

## Como usar

1. Abra o app (`npm run dev` e o endereço da interface que ele mostrar).
2. Na tela de quadros, escolha um quadro na lateral ou crie um com o botão "+".
3. Crie listas para as etapas e adicione cartões em cada uma.
4. Clique no título do cartão para editar a descrição. Mova o cartão arrastando ou pelo menu "⋯" > "Mover para".
5. Para pedir ajuda, abra "Atendimento" na lateral, clique em "Novo ticket", preencha título e descrição.

## Limites conhecidos

- Não há tela de login: as rotas de cadastro e login existem na API, mas a interface não as usa.
- Não há preços, planos, prazos ou integrações definidos. Veja `automacao/commercial-catalog.json`.

## Onde fica cada coisa

- Quadros, listas e cartões: `client/src/TelaQuadro.jsx`, `Lista.jsx`, `Cartao.jsx`, `ordem.js` e `server/src/quadros.js`.
- Atendimento: `client/src/Atendimento.jsx` e `server/src/tickets.js`.
- Base de conhecimento dos agentes (o que cada issue e PR ensinaram): `docs/Knowledge/`, formato em `docs/Knowledge/README.md`.
