import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "./base.css";
import PortfolioTemplate from "./components/archive/PortfolioTemplate";
import PortfolioEditor from "./components/editor/PortfolioEditor";

function App() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const update = () => setRevision((value) => value + 1);
    window.addEventListener("portfolio-content-change", update);
    return () => window.removeEventListener("portfolio-content-change", update);
  }, []);
  return (
    <>
      <PortfolioTemplate key={revision} />
      <PortfolioEditor />
    </>
  );
}

const element = document.getElementById("root");
if (!element) throw new Error("Missing portfolio root");
createRoot(element).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
