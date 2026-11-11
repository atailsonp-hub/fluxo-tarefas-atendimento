import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { Atendimento } from "./Atendimento.jsx";
import "./estilos.css";
import "./atendimento.css";
import { Landing } from "./Landing.jsx";
import "./landing.css";

/** Escolhe a tela pelo caminho e troca sem recarregar a página (history API). */
function Raiz() {
  const [caminho, setCaminho] = useState(window.location.pathname);
  useEffect(() => {
    const voltar = () => setCaminho(window.location.pathname);
    window.addEventListener("popstate", voltar);
    return () => window.removeEventListener("popstate", voltar);
  }, []);
  const navegar = useCallback((destino) => {
    window.history.pushState(null, "", destino);
    setCaminho(destino);
  }, []);

  if (caminho === "/") return <Landing />;
  if (caminho.startsWith("/atendimento")) return <Atendimento aoNavegar={navegar} />;
  return <App aoNavegar={navegar} />;
}

createRoot(document.getElementById("raiz")).render(<StrictMode><Raiz /></StrictMode>);
