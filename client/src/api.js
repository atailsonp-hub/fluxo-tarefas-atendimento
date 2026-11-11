// Cliente da API: um lugar só para falar com o servidor. Erros viram Error com a mensagem do servidor.
/** Id anônimo deste navegador: é o "dono" dos tickets (não há login). */
// Fica num cookie (vale para todas as portas de 127.0.0.1) e não no localStorage (que é por porta):
// no desenvolvimento a porta muda a cada reinício, e o dono não pode mudar junto.
function dono() {
  try {
    const guardado = /(?:^|; )fluxo-dono=([\w-]+)/.exec(document.cookie)?.[1];
    const id = guardado ?? localStorage.getItem("fluxo-dono") ?? crypto.randomUUID();
    if (!guardado) document.cookie = `fluxo-dono=${id}; path=/; max-age=31536000; SameSite=Lax`;
    return id;
  } catch {
    return "";
  }
}

async function pedir(metodo, caminho, corpo) {
  let resposta;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: { "x-dono": dono(), ...(corpo === undefined ? {} : { "content-type": "application/json" }) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: "same-origin",
    });
  } catch {
    throw new Error("Não foi possível falar com o servidor. Confira se ele está no ar.");
  }
  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const mensagem = dados?.error ?? dados?.mensagem ?? `Erro ${resposta.status}.`;
    throw new Error(mensagem);
  }
  return dados;
}

/** Remove campos vazios para não enviar `description: undefined` no corpo. */
const corpo = (dados) => Object.fromEntries(Object.entries(dados).filter(([, v]) => v !== undefined && v !== null));

export const api = {
  quadros: {
    listar: () => pedir("GET", "/boards"),
    criar: (title) => pedir("POST", "/boards", { title }),
    renomear: (id, title) => pedir("PATCH", `/boards/${id}`, { title }),
    excluir: (id) => pedir("DELETE", `/boards/${id}`),
    detalhe: (id) => pedir("GET", `/boards/${id}`),
  },
  listas: {
    criar: (boardId, title) => pedir("POST", `/boards/${boardId}/lists`, { title }),
    renomear: (id, title) => pedir("PATCH", `/lists/${id}`, { title }),
    excluir: (id) => pedir("DELETE", `/lists/${id}`),
  },
  cartoes: {
    criar: (listId, title, description) => pedir("POST", `/lists/${listId}/cards`, corpo({ title, description })),
    editar: (id, mudanca) => pedir("PATCH", `/cards/${id}`, corpo(mudanca)),
    excluir: (id) => pedir("DELETE", `/cards/${id}`),
    mover: (id, listId, position) => pedir("PATCH", `/cards/${id}`, corpo({ listId, position })),
  },
  tickets: {
    listar: () => pedir("GET", "/tickets"),
    abrir: (title, message) => pedir("POST", "/tickets", { title, message }),
    detalhe: (id, sync = false) => pedir("GET", `/tickets/${id}${sync ? "?sync=1" : ""}`),
    enviar: (id, body) => pedir("POST", `/tickets/${id}/messages`, { body }),
    editar: (id, mudanca) => pedir("PATCH", `/tickets/${id}`, corpo(mudanca)),
    excluir: (id) => pedir("DELETE", `/tickets/${id}`),
  },
};
