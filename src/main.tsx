import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "./lib/themeProvider";

// Apply theme before React mounts to prevent flash
initTheme();

createRoot(document.getElementById("root")!).render(<App />);
