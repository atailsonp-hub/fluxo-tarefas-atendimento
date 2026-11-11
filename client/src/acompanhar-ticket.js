// Acompanha uma conversa de atendimento: consulta o servidor em intervalo, uma de cada vez, só com a aba visível,
// e de novo ao voltar para a aba ou focar a janela. Sem dependência de React: testável com documento/janela falsos.
export function acompanharTicket({ ler, aoLer, aoErro = () => {}, aoCarregar = () => {},
  documento = document, janela = window, intervalo = 5000 }) {
  let ativo = true;
  let pendente = null;

  const atualizar = (forcar = false) => {
    if (!ativo) return Promise.resolve();
    if (pendente) return pendente; // uma consulta por vez: pedidos repetidos reaproveitam a que está em andamento
    aoCarregar(true);
    pendente = Promise.resolve()
      .then(() => ler(forcar))
      .then(
        (resultado) => { if (ativo) aoLer(resultado); }, // depois de parar, nada mais altera a tela
        (erro) => { if (ativo) aoErro(erro); },
      )
      .finally(() => {
        pendente = null;
        if (ativo) aoCarregar(false);
      });
    return pendente;
  };

  const retomar = () => { if (documento.visibilityState !== "hidden") void atualizar(); };
  const timer = janela.setInterval(retomar, intervalo);
  documento.addEventListener("visibilitychange", retomar);
  janela.addEventListener("focus", retomar);
  void atualizar();

  return {
    /** Botão Atualizar: consulta agora e pede ao servidor para reler a issue sem esperar o limite curto. */
    atualizar: () => atualizar(true),
    parar() {
      ativo = false;
      janela.clearInterval(timer);
      documento.removeEventListener("visibilitychange", retomar);
      janela.removeEventListener("focus", retomar);
    },
  };
}
