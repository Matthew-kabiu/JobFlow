import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RuntimeConfigProvider } from "./context/runtime-config";
import { ThemeProvider } from "next-themes";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" storageKey="jobflow-theme" enableSystem disableTransitionOnChange>
    <RuntimeConfigProvider><App /></RuntimeConfigProvider>
  </ThemeProvider>,
);
