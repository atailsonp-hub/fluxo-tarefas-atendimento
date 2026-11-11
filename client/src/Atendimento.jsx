import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "./api.js";
import { agruparPorData, aguardandoAgente, mesmaConversa } from "./atendimento.js";
import { BarraLateral } from "./BarraLateral.jsx";
import { Botao } from "./componentes/Botao.jsx";
import { Campo } from "./componentes/Campo.jsx";
import { Confirmar } from "./componentes/Confirmar.jsx";
import { Icone } from "./componentes/Icone.jsx";
import { Menu } from "./componentes/Menu.jsx";

const INTERVALO_MS = 4000;

const hora = (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Campo de envio: cresce com o texto, Enter envia e Shift+Enter quebra a linha. */
function Composer({ aoEnviar, enviando, valor, aoMudar, autoFocus }) {
  const campo = useRef(null);

  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [valor]);

  useEffect(() => {
    if (autoFocus) campo.current?.focus();
  }, [autoFocus]);

  const enviar = () => {
    if (valor.trim() && !enviando) aoEnviar(valor.trim());
  };

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); enviar(); }}>
      <div className="composer-caixa">
        <textarea
          ref={campo}
          className="composer-campo"
          rows={1}
          maxLength={4000}
          value={valor}
          placeholder="Descreva o que está acontecendo…"
          aria-label="Mensagem para o atendimento"
          onChange={(e) => aoMudar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              enviar();
            }
          }}
        />
        <button type="submit" className="composer-enviar" aria-label="Enviar mensagem" disabled={!valor.trim() || enviando}>
          <Icone nome="enviar" tamanho={18} />
        </button>
      </div>
      <p className="composer-dica">Enter envia · Shift+Enter quebra a linha</p>
    </form>
  );
}

function Mensagem({ mensagem }) {
  const agente = mensagem.role === "agent";
  return (
    <article className="msg" data-papel={mensagem.role} aria-label={agente ? "Resposta do atendimento" : "Sua mensagem"}>
      {agente ? (
        <span className="msg-avatar" aria-hidden="true"><Icone nome="suporte" tamanho={16} /></span>
      ) : null}
      <div className="msg-corpo">
        {agente ? <p className="msg-autor">Atendimento</p> : null}
        <p className="msg-texto">{mensagem.body}</p>
        <time className="msg-hora" dateTime={mensagem.createdAt}>{hora(mensagem.createdAt)}</time>
      </div>
    </article>
  );
}

function Conversa({ detalhe, aoMudarStatus, aoExcluir, aoAtualizar, sincronizando, atualizadoEm, aoEnviar, enviando, rascunho, aoMudarRascunho }) {
  const fim = useRef(null);
  const { ticket, messages } = detalhe;
  const aguardando = aguardandoAgente(detalhe);

  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [ticket.id, messages.length]);

  const fechado = ticket.status === "closed";
  return (
    <>
      <header className="chat-topo">
        <div className="chat-titulo-bloco">
          <h1 className="chat-titulo" title={ticket.title}>{ticket.title}</h1>
          <span className="selo-status" data-status={ticket.status}>{fechado ? "Fechado" : "Aberto"}</span>
        </div>
        <div className="chat-acoes">
          <Botao variante="fantasma" icone="atualizar" aria-label="Atualizar conversa" title="Buscar novas mensagens agora" disabled={sincronizando} onClick={aoAtualizar}>
            {sincronizando ? "Atualizando…" : "Atualizar"}
          </Botao>
          <Menu
            rotulo={`Opções do atendimento ${ticket.title}`}
            itens={[
              fechado
                ? { rotulo: "Reabrir atendimento", icone: "atualizar", aoClicar: () => aoMudarStatus("open") }
                : { rotulo: "Fechar atendimento", icone: "check", aoClicar: () => aoMudarStatus("closed") },
              { rotulo: "Excluir atendimento", icone: "lixeira", perigo: true, aoClicar: aoExcluir },
            ]}
          />
        </div>
      </header>

      <div className="chat-rolagem">
        <div className="chat-fio" role="log" aria-live="polite" aria-label={`Conversa do atendimento ${ticket.title}`}>
          {messages.map((m) => <Mensagem key={m.id} mensagem={m} />)}
          {/* Só estado da sincronização, nunca uma "mensagem" do atendimento: respostas aparecem só quando um agente as publica. */}
          <p className="chat-status" role="status">
            {aguardando ? "Aguardando resposta do atendimento" : "Conversa sincronizada"}
            {atualizadoEm ? ` · atualizado às ${atualizadoEm.toLocaleTimeString("pt-BR")}` : ""}
          </p>
          <div ref={fim} />
        </div>
      </div>

      <div className="chat-base">
        {fechado ? (
          <div className="chat-fechado">
            <span>Este atendimento está fechado.</span>
            <Botao icone="atualizar" onClick={() => aoMudarStatus("open")}>Reabrir atendimento</Botao>
          </div>
        ) : (
          <Composer aoEnviar={aoEnviar} enviando={enviando} valor={rascunho} aoMudar={aoMudarRascunho} autoFocus={ticket.id} />
        )}
      </div>
    </>
  );
}

/** Novo atendimento: título (resumo) + descrição (detalhes). A descrição vira a primeira mensagem da conversa. */
function ConversaNova({ aoAbrir, enviando }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const pronto = titulo.trim() && descricao.trim();

  return (
    <>
      <header className="chat-topo">
        <p className="chat-topo-nome">Atendimento</p>
      </header>
      <div className="chat-novo">
        <span className="chat-novo-icone" aria-hidden="true"><Icone nome="suporte" tamanho={24} /></span>
        <h1 className="chat-novo-titulo">Como podemos ajudar?</h1>
        <p className="chat-novo-texto">Dê um título ao assunto e descreva o que está acontecendo. Cada atendimento é uma conversa: você acompanha as respostas aqui mesmo.</p>
        <form
          className="novo-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (pronto && !enviando) aoAbrir(titulo.trim(), descricao.trim());
          }}
        >
          <Campo rotulo="Título" name="title" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={120} required autoFocus placeholder="Resumo do problema em uma frase" />
          <Campo rotulo="Descrição" name="description" value={descricao} onChange={(e) => setDescricao(e.target.value)} multilinha rows={8} maxLength={4000} required placeholder="O que você tentou fazer, o que aconteceu e o que esperava que acontecesse" />
          <div className="novo-form-acoes">
            <Botao variante="primario" type="submit" disabled={!pronto || enviando}>Abrir atendimento</Botao>
          </div>
        </form>
      </div>
    </>
  );
}

export function Atendimento({ aoNavegar }) {
  const [tickets, setTickets] = useState(null);
  const [ticketId, setTicketId] = useState(null); // null = nova conversa
  const [detalhe, setDetalhe] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState(null); // última vez que a conversa aberta foi relida do servidor
  const [sincronizando, setSincronizando] = useState(false);

  // Refs deixam a consulta periódica enxergar o estado atual sem recriar o intervalo.
  const idRef = useRef(null);
  const detalheRef = useRef(null);
  const versaoRef = useRef(0); // sobe a cada mudança local: respostas de consultas antigas são descartadas
  idRef.current = ticketId;
  detalheRef.current = detalhe;

  const aplicarLista = useCallback((lista) => {
    setTickets(lista);
    if (idRef.current && !lista.some((t) => t.id === idRef.current)) {
      setTicketId(null);
      setDetalhe(null);
    }
  }, []);

  const atualizarLista = useCallback(async () => {
    aplicarLista((await api.tickets.listar())?.tickets ?? []);
  }, [aplicarLista]);

  // Consulta periódica: é assim que respostas de agentes aparecem sem o usuário recarregar.
  useEffect(() => {
    let vivo = true;
    const ciclo = async (primeira) => {
      if (document.hidden) return;
      const versao = versaoRef.current;
      try {
        const lista = (await api.tickets.listar())?.tickets ?? [];
        if (!vivo) return;
        if (versao === versaoRef.current) aplicarLista(lista);
        const id = idRef.current;
        if (id && versao === versaoRef.current) {
          const novo = await api.tickets.detalhe(id);
          if (vivo && idRef.current === id && versao === versaoRef.current) {
            setDetalhe((atual) => (mesmaConversa(atual, novo) ? atual : novo));
            setAtualizadoEm(new Date());
          }
        }
        if (primeira) setErro(null);
      } catch (e) {
        if (primeira && vivo) { setErro(e.message); setTickets([]); }
      }
    };
    void ciclo(true);
    const t = setInterval(() => void ciclo(false), INTERVALO_MS);
    return () => { vivo = false; clearInterval(t); };
  }, [aplicarLista]);

  // Abrir um ticket da lateral: busca a conversa inteira.
  useEffect(() => {
    if (!ticketId) return;
    if (detalheRef.current?.ticket.id === ticketId) return; // acabou de ser criado: já temos os dados
    let vivo = true;
    setDetalhe(null);
    api.tickets.detalhe(ticketId)
      .then((d) => { if (vivo) { setDetalhe(d); setAtualizadoEm(new Date()); setErro(null); } })
      .catch((e) => { if (vivo) setErro(e.message); });
    return () => { vivo = false; };
  }, [ticketId]);

  const escolher = (id) => {
    if (id === ticketId) return;
    versaoRef.current++;
    setDetalhe(null);
    setRascunho("");
    setErro(null);
    setTicketId(id);
  };

  const executar = async (acao) => {
    try {
      setErro(null);
      await acao();
    } catch (e) {
      setErro(e.message);
    }
  };

  const abrir = async (titulo, descricao) => {
    setEnviando(true);
    await executar(async () => {
      versaoRef.current++;
      const r = await api.tickets.abrir(titulo, descricao);
      setDetalhe({ ticket: r.ticket, messages: r.messages });
      setTicketId(r.ticket.id);
      versaoRef.current++;
      await atualizarLista();
    });
    setEnviando(false);
  };

  const enviar = async (texto) => {
    setEnviando(true);
    await executar(async () => {
      versaoRef.current++;
      const r = await api.tickets.enviar(ticketId, texto);
      setDetalhe((atual) => (atual ? { ticket: r.ticket, messages: [...atual.messages, r.message] } : atual));
      setRascunho("");
      versaoRef.current++;
      await atualizarLista();
    });
    setEnviando(false);
  };

  // Botão Atualizar: pede ao servidor para reler a issue agora (sem esperar o intervalo) e traz o que o N1 já publicou.
  const atualizarAgora = async () => {
    const id = idRef.current;
    if (!id || sincronizando) return;
    setSincronizando(true);
    await executar(async () => {
      const novo = await api.tickets.detalhe(id, true);
      if (idRef.current === id) {
        setDetalhe((atual) => (mesmaConversa(atual, novo) ? atual : novo));
        setAtualizadoEm(new Date());
      }
      await atualizarLista();
    });
    setSincronizando(false);
  };

  const mudarStatus = (status) => executar(async () => {
    versaoRef.current++;
    const r = await api.tickets.editar(ticketId, { status });
    setDetalhe((atual) => (atual ? { ...atual, ticket: r.ticket } : atual));
    versaoRef.current++;
    await atualizarLista();
  });

  const excluir = () => executar(async () => {
    versaoRef.current++;
    await api.tickets.excluir(ticketId);
    setExcluindo(false);
    setTicketId(null);
    setDetalhe(null);
    versaoRef.current++;
    await atualizarLista();
  });

  const grupos = tickets ? agruparPorData(tickets) : [];

  return (
    <div className="app app-atend">
      <BarraLateral tela="atendimento" aoNavegar={aoNavegar} />

      <aside className="atend-lista" aria-label="Atendimentos">
        <Botao icone="mais" className="botao-bloco" onClick={() => escolher(null)}>Novo atendimento</Botao>

        {tickets === null ? (
          <p className="lateral-vazio">Carregando atendimentos…</p>
        ) : grupos.length ? (
          <div className="tickets-grupos">
            {grupos.map((g) => (
              <section key={g.rotulo} aria-label={g.rotulo}>
                <h2 className="lateral-titulo tickets-grupo-titulo">{g.rotulo}</h2>
                <ul className="lateral-lista tickets-lista">
                  {g.tickets.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        className="ticket-item"
                        data-ativo={t.id === ticketId ? "" : undefined}
                        data-status={t.status}
                        aria-current={t.id === ticketId ? "page" : undefined}
                        title={t.title}
                        onClick={() => escolher(t.id)}
                      >
                        <span className="ticket-item-titulo">{t.title}</span>
                        {t.status === "closed" ? <Icone nome="check" tamanho={14} rotulo="Fechado" className="ticket-item-check" /> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="lateral-vazio">Nenhum atendimento ainda. Abra o primeiro para começar.</p>
        )}
      </aside>

      <main className="canvas chat">
        {erro ? (
          <div className="aviso chat-aviso" role="alert">
            <span className="aviso-texto"><Icone nome="alerta" tamanho={18} /><span>{erro}</span></span>
            <Botao icone="atualizar" onClick={() => { setErro(null); void atualizarLista().catch((e) => setErro(e.message)); }}>Tentar de novo</Botao>
          </div>
        ) : null}

        {!ticketId ? (
          <ConversaNova aoAbrir={abrir} enviando={enviando} />
        ) : !detalhe ? (
          <p className="carregando-line chat-carregando" role="status">Carregando conversa…</p>
        ) : (
          <Conversa
            detalhe={detalhe}
            aoMudarStatus={mudarStatus}
            aoExcluir={() => setExcluindo(true)}
            aoAtualizar={atualizarAgora}
            sincronizando={sincronizando}
            atualizadoEm={atualizadoEm}
            aoEnviar={enviar}
            enviando={enviando}
            rascunho={rascunho}
            aoMudarRascunho={setRascunho}
          />
        )}
      </main>

      {excluindo && detalhe ? (
        <Confirmar
          aberto
          titulo="Excluir atendimento"
          descricao={`Excluir "${detalhe.ticket.title}" apaga toda a conversa. Não dá para desfazer.`}
          rotuloConfirmar="Excluir atendimento"
          aoConfirmar={() => void excluir()}
          aoFechar={() => setExcluindo(false)}
        />
      ) : null}
    </div>
  );
}
