// Atendimento: tickets de suporte, cada um uma conversa. Contrato JSON em inglês, sem exigir login.
// Agentes autônomos (futuros) respondem com POST /api/tickets/:id/messages enviando role "agent".
import { randomUUID } from "node:crypto";
import { invalido, naoEncontrado, texto } from "./http.js";
import { transacao } from "./db.js";
import { garantirIssue, reconciliarIssue, repassarMensagens, trazerRespostas } from "./github.js";

const STATUS = ["open", "closed"];
const ROLES = ["user", "agent"];

const saidaMensagem = (m) => ({ id: m.id, ticketId: m.ticket_id, role: m.role, body: m.body, createdAt: m.criado_em });
const saidaTicket = (t) => ({
  id: t.id, title: t.title, status: t.status, createdAt: t.criado_em, updatedAt: t.atualizado_em,
  lastMessage: t.ultima ?? null, lastRole: t.ultima_role ?? null,
  issueNumber: t.issue_number ?? null, phase: t.fase,
});

const COOKIE = "fluxo_dono";
const COOKIE_ANTIGO = "fluxo-dono"; // versão anterior: cookie legível por JavaScript, criado pelo navegador
const ID_DONO = /^[\w-]{8,80}$/;

/**
 * Dono do ticket (sem login, é o que separa um usuário do outro): id anônimo num cookie HttpOnly que o SERVIDOR define.
 * O navegador não o lê nem o escolhe, e o cabeçalho x-dono não vale mais. Quem tinha o cookie antigo mantém o mesmo id,
 * então os atendimentos que já existiam continuam aparecendo.
 */
function donoDe({ req, res }) {
  const cookies = Object.fromEntries(String(req.headers.cookie ?? "").split(";").map((c) => c.trim().split(/=(.*)/s).slice(0, 2)).filter(([k]) => k));
  if (ID_DONO.test(cookies[COOKIE] ?? "")) return cookies[COOKIE];
  const id = ID_DONO.test(cookies[COOKIE_ANTIGO] ?? "") ? cookies[COOKIE_ANTIGO] : randomUUID();
  res.setHeader("set-cookie", `${COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000`);
  return id;
}

/** Título automático: primeira linha da mensagem, cortada em ~60 caracteres. */
const tituloDe = (mensagem) => {
  const linha = mensagem.split("\n").find((l) => l.trim())?.trim() ?? mensagem;
  return linha.length > 60 ? `${linha.slice(0, 57).trimEnd()}…` : linha;
};

export function rotasDeTickets(app, db) {
  const buscarTicket = (id, dono) => {
    const t = db.prepare("SELECT * FROM ticket WHERE id = ? AND owner = ?").get(id, dono);
    if (!t) throw naoEncontrado("Ticket");
    return t;
  };
  const porId = (id) => db.prepare("SELECT * FROM ticket WHERE id = ?").get(id);
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
  /** Sincroniza com o GitHub sem nunca derrubar a resposta: nova tentativa da issue pendente e repasse do que ficou para trás. */
  const sincronizar = async (id) => {
    await reconciliarIssue(db, porId(id));
    await repassarMensagens(db, porId(id));
  };

  app.get("/api/tickets", (ctx) => ({
    tickets: db.prepare("SELECT id FROM ticket WHERE owner = ? ORDER BY atualizado_em DESC, rowid DESC").all(donoDe(ctx)).map((t) => saidaTicket(resumo(t.id))),
  }));

  // Abrir ticket = criar a conversa já com a primeira mensagem do usuário e o requestId que a acompanha até a entrega.
  app.post("/api/tickets", async (ctx) => {
    const { corpo } = ctx;
    const criado = transacao(db, () => {
      const mensagem = texto(corpo, "message", { max: 4000 });
      const title = texto(corpo, "title", { max: 120, opcional: true }) ?? tituloDe(mensagem);
      const agora = new Date().toISOString();
      const id = randomUUID();
      db.prepare("INSERT INTO ticket (id, title, status, criado_em, atualizado_em, owner, request_id) VALUES (?, ?, 'open', ?, ?, ?, ?)")
        .run(id, title, agora, agora, donoDe(ctx), randomUUID());
      const primeira = gravarMensagem(id, "user", mensagem);
      return { id, mensagem, primeira };
    });
    // A issue nasce fora da transação: falha do GitHub deixa o ticket em `issue_pendente` e ele é tentado de novo.
    await garantirIssue(db, porId(criado.id), criado.mensagem);
    return { ticket: saidaTicket(resumo(criado.id)), messages: [saidaMensagem(criado.primeira)] };
  });

  app.get("/api/tickets/:id", async (ctx) => {
    const { params, url } = ctx;
    buscarTicket(params.id, donoDe(ctx));
    await sincronizar(params.id);
    const ticket = porId(params.id);
    await trazerRespostas(db, ticket, { forcar: url.searchParams.get("sync") === "1" }); // respostas do N1 publicadas na issue; sync=1 = botão Atualizar
    const messages = db.prepare("SELECT * FROM ticket_message WHERE ticket_id = ? ORDER BY criado_em, rowid").all(ticket.id).map(saidaMensagem);
    return { ticket: saidaTicket(resumo(ticket.id)), messages };
  });

  app.post("/api/tickets/:id/messages", async (ctx) => {
    const { params, corpo } = ctx;
    const resposta = transacao(db, () => {
      const ticket = buscarTicket(params.id, donoDe(ctx));
      const body = texto(corpo, "body", { max: 4000 });
      const role = papel(corpo);
      // Responder reabre um ticket fechado: a conversa continua de onde parou.
      if (ticket.status === "closed") db.prepare("UPDATE ticket SET status = 'open' WHERE id = ?").run(ticket.id);
      const m = gravarMensagem(ticket.id, role, body);
      return { message: saidaMensagem(m), ticket: saidaTicket(resumo(ticket.id)) };
    });
    await sincronizar(params.id); // a fala do cliente vai para a issue (fora da transação: falha do GitHub não perde a mensagem)
    return resposta;
  });

  app.patch("/api/tickets/:id", (ctx) => {
    const { params, corpo } = ctx;
    const ticket = buscarTicket(params.id, donoDe(ctx));
    const title = texto(corpo, "title", { max: 120, opcional: true }) ?? ticket.title;
    let status = ticket.status;
    if (corpo.status !== undefined) {
      if (!STATUS.includes(corpo.status)) throw invalido(`status deve ser ${STATUS.join(" ou ")}.`);
      status = corpo.status;
    }
    db.prepare("UPDATE ticket SET title = ?, status = ?, atualizado_em = ? WHERE id = ?").run(title, status, new Date().toISOString(), ticket.id);
    return { ticket: saidaTicket(resumo(ticket.id)) };
  });

  app.delete("/api/tickets/:id", (ctx) => {
    const ticket = buscarTicket(ctx.params.id, donoDe(ctx));
    db.prepare("DELETE FROM ticket WHERE id = ?").run(ticket.id); // mensagens caem em cascata
    return { ok: true };
  });
}
