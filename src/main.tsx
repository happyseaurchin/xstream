/**
 * main.tsx — block-agents branch entry point.
 *
 * No auth gate. The API key IS the gate (player provides their own).
 * SetupScreen handles entry. Old auth system bypassed on this branch.
 */

import { createRoot } from "react-dom/client";
import App from "./App.block-agents.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
