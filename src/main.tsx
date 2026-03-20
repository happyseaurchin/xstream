/**
 * main.tsx — block-agents branch entry point.
 *
 * No server. No database. Blocks live in localStorage.
 * World seeds on first run from bundled JSON files.
 */

import { createRoot } from "react-dom/client";
import App from "./App.block-agents.tsx";
import { seedIfNeeded } from "./lib/world-seed";
import "./index.css";

// Seed world blocks to localStorage on first visit
seedIfNeeded();

createRoot(document.getElementById("root")!).render(<App />);
