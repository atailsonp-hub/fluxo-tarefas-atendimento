import { Botao } from "./componentes/Botao.jsx";
import { Icone } from "./componentes/Icone.jsx";

const TELAS = [
  { id: "quadros", rotulo: "Quadros", caminho: "/quadro", icone: "colunas" },
  { id: "atendimento", rotulo: "Atendimento", caminho: "/atendimento", icone: "suporte" },
];

/**
 * Lateral do sistema: marca, menu de telas e o conteúdo da tela atual.
 * Na tela de Quadros mostra a lista de quadros; a de Atendimento tem a sua própria coluna de conversas.
 */
export function BarraLateral({ tela = "quadros", aoNavegar, quadros, quadroId, aoSelecionar, aoNovoQuadro, aoRenomear, aoExcluir }) {
  return (
    <aside className="lateral" aria-label={tela === "atendimento" ? "Atendimento" : "Quadros"}>
      <a className="marca" href="/" aria-label="Fluxo, voltar ao início" style={{ textDecoration: "none" }}>
        <span className="marca-simbolo" aria-hidden="true">
          <Icone nome="colunas" tamanho={18} />
        </span>
        <span className="marca-nome">Fluxo</span>
      </a>

      <nav className="lateral-nav" aria-label="Telas do sistema">
        {TELAS.map((t) => (
          <a
            key={t.id}
            className="lateral-nav-link"
            href={t.caminho}
            aria-current={t.id === tela ? "page" : undefined}
            onClick={(e) => {
              if (!aoNavegar || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              aoNavegar(t.caminho);
            }}
          >
            <Icone nome={t.icone} tamanho={18} />
            {t.rotulo}
          </a>
        ))}
      </nav>

      {tela === "quadros" ? (
        <>
          <div className="lateral-topo">
            <h2 className="lateral-titulo">Quadros</h2>
            <Botao variante="fantasma" icone="mais" aria-label="Criar quadro" onClick={aoNovoQuadro} />
          </div>

          {quadros === null ? (
            <p className="lateral-vazio">Carregando quadros…</p>
          ) : quadros.length ? (
            <ul className="lateral-lista">
              {quadros.map((quadro) => (
                <li key={quadro.id}>
                  <div className="lateral-item" data-ativo={quadro.id === quadroId ? "" : undefined}>
                    <button
                      type="button"
                      className="lateral-escolha"
                      aria-current={quadro.id === quadroId ? "page" : undefined}
                      onClick={() => aoSelecionar(quadro.id)}
                    >
                      {quadro.title}
                    </button>
                    <span className="lateral-acoes">
                      <Botao variante="fantasma" icone="lapis" aria-label={`Renomear quadro ${quadro.title}`} onClick={() => aoRenomear(quadro)} />
                      <Botao variante="fantasma" icone="lixeira" aria-label={`Excluir quadro ${quadro.title}`} onClick={() => aoExcluir(quadro)} />
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lateral-vazio">Nenhum quadro ainda. Crie o primeiro para começar.</p>
          )}
        </>
      ) : null}
    </aside>
  );
}
