// Atendimento: tickets de suporte, cada um uma conversa. Contrato JSON em inglês, sem exigir login.
// Agentes autônomos (futuros) respondem com POST /api/tickets/:id/messages enviando role "agent".
import { randomUUID } from "node:crypto";
import { invalido, naoEncontrado, texto } from "./http.js";
import { transacao } from "./db.js";

const STATUS = ["open", "closed"];
const ROLES = ["user", "agent"];

const saidaMensagem = (m) => ({ id: m.id, ticketId: m.ticket_id, role: m.role, body: m.body, createdAt: m.criado_em });
const saidaTicket = (t) => ({
  id: t.id, title: t.title, status: t.status, createdAt: t.criado_em, updatedAt: t.atualizado_em,
  lastMessage: t.ultima ?? null, lastRole: t.ultima_role ?? null,
});

/** Título automático: primeira linha da mensagem, cortada em ~60 caracteres. */
const tituloDe = (mensagem) => {
  const linha = mensagem.split("\n").find((l) => l.trim())?.trim() ?? mensagem;
  return linha.length > 60 ? `${linha.slice(0, 57).trimEnd()}…` : linha;
};

export function rotasDeTickets(app, db) {
  const buscarTicket = (id) => {
    const t = db.prepare("SELECT * FROM ticket WHERE id = ?").get(id);
    if (!t) throw naoEncontrado("Ticket");
    return t;
  };
  const resumo = (id) => db.prepare(
    `SELECT t.*,
       (SELECT body FROM ticket_message WHERE ticket_id = t.id ORDER BY criado_em DESC, rowid DESC LIMIT 1) AS ultima,
       (SELECT role FROM ticket_message WHERE ticket_id = t.id ORDER BY criado_em DESC, rowid DESC LIMIT 1) AS ultima_role
     FROM ticket t WHERE t.id = ?`,
  ).get(id);
  const gravarMensagem = (ticketId, role, body) => {
    const m = { id: randomUUID(), ticket_id: ticketId, role, body, criado_em: new Date().toISOString() };
    db.prepare("INSERT INTO ticket_message (id, ticket_id, role, body, criado_em) VALUES (?, ?, ?, ?, ?)")
      .run(m.id, m.ticket_id, m.role, m.body, m.criado_em);
    db.prepare("UPDATE ticket SET atualizado_em = ? WHERE id = ?").run(m.criado_em, ticketId);
    return m;
  };
  const papel = (corpo) => {
    if (corpo.role === undefined) return "user";
    if (!ROLES.includes(corpo.role)) throw invalido(`role deve ser ${ROLES.join(" ou ")}.`);
    return corpo.role;
  };

  app.get("/api/tickets", () => ({
    tickets: db.prepare("SELECT id FROM ticket ORDER BY atualizado_em DESC, rowid DESC").all().map((t) => saidaTicket(resumo(t.id))),
  }));

  // Abrir ticket = criar a conversa já com a primeira mensagem do usuário.
  app.post("/api/tickets", ({ corpo }) => transacao(db, () => {
    const mensagem = texto(corpo, "message", { max: 4000 });
    const title = texto(corpo, "title", { max: 120, opcional: true }) ?? tituloDe(mensagem);
    const agora = new Date().toISOString();
    const id = randomUUID();
    db.prepare("INSERT INTO ticket (id, title, status, criado_em, atualizado_em) VALUES (?, ?, 'open', ?, ?)").run(id, title, agora, agora);
    const primeira = gravarMensagem(id, "user", mensagem);
    return { ticket: saidaTicket(resumo(id)), messages: [saidaMensagem(primeira)] };
  }));

  app.get("/api/tickets/:id", ({ params }) => {
    const ticket = buscarTicket(params.id);
    const messages = db.prepare("SELECT * FROM ticket_message WHERE ticket_id = ? ORDER BY criado_em, rowid").all(ticket.id).map(saidaMensagem);
    return { ticket: saidaTicket(resumo(ticket.id)), messages };
  });

  app.post("/api/tickets/:id/messages", ({ params, corpo }) => transacao(db, () => {
    const ticket = buscarTicket(params.id);
    const body = texto(corpo, "body", { max: 4000 });
    const role = papel(corpo);
    // Responder reabre um ticket fechado: a conversa continua de onde parou.
    if (ticket.status === "closed") db.prepare("UPDATE ticket SET status = 'open' WHERE id = ?").run(ticket.id);
    const m = gravarMensagem(ticket.id, role, body);
    return { message: saidaMensagem(m), ticket: saidaTicket(resumo(ticket.id)) };
  }));

  app.patch("/api/tickets/:id", ({ params, corpo }) => {
    const ticket = buscarTicket(params.id);
    const title = texto(corpo, "title", { max: 120, opcional: true }) ?? ticket.title;
    let status = ticket.status;
    if (corpo.status !== undefined) {
      if (!STATUS.includes(corpo.status)) throw invalido(`status deve ser ${STATUS.join(" ou ")}.`);
      status = corpo.status;
    }
    db.prepare("UPDATE ticket SET title = ?, status = ?, atualizado_em = ? WHERE id = ?").run(title, status, new Date().toISOString(), ticket.id);
    return { ticket: saidaTicket(resumo(ticket.id)) };
  });

  app.delete("/api/tickets/:id", ({ params }) => {
    const ticket = buscarTicket(params.id);
    db.prepare("DELETE FROM ticket WHERE id = ?").run(ticket.id); // mensagens caem em cascata
    return { ok: true };
  });
}
