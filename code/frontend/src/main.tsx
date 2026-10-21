import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { RuntimeConfigProvider } from "./context/runtime-config";

createRoot(document.getElementById("root")!).render(<RuntimeConfigProvider><App /></RuntimeConfigProvider>);
