// Lógica pura da tela de Atendimento (testada sem navegador).

const DIA = 24 * 60 * 60 * 1000;

/** Agrupa tickets (já ordenados do mais recente) em Hoje / Ontem / Últimos 7 dias / Anteriores. */
export function agruparPorData(tickets, agora = new Date()) {
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const grupos = [
    { rotulo: "Hoje", desde: inicioHoje, tickets: [] },
    { rotulo: "Ontem", desde: inicioHoje - DIA, tickets: [] },
    { rotulo: "Últimos 7 dias", desde: inicioHoje - 7 * DIA, tickets: [] },
    { rotulo: "Anteriores", desde: -Infinity, tickets: [] },
  ];
  for (const t of tickets) {
    const quando = new Date(t.updatedAt).getTime();
    grupos.find((g) => quando >= g.desde).tickets.push(t);
  }
  return grupos.filter((g) => g.tickets.length).map(({ rotulo, tickets: lista }) => ({ rotulo, tickets: lista }));
}

/** Ticket aberto cuja última mensagem é do usuário: está esperando a resposta de um agente. */
export function aguardandoAgente(detalhe) {
  if (!detalhe || detalhe.ticket.status !== "open") return false;
  return detalhe.messages.at(-1)?.role === "user";
}

/** Mesma conversa? Evita re-renderizar a cada consulta periódica quando nada mudou. */
export function mesmaConversa(a, b) {
  if (!a || !b) return a === b;
  return (
    a.ticket.id === b.ticket.id &&
    a.ticket.status === b.ticket.status &&
    a.ticket.title === b.ticket.title &&
    a.messages.length === b.messages.length &&
    a.messages.at(-1)?.id === b.messages.at(-1)?.id
  );
}
