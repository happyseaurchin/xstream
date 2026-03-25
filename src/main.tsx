/**
 * main.tsx — sovereign kernel entry point.
 *
 * The browser IS the kernel. No server-side intelligence.
 * Each player runs their own kernel, their own LLM calls.
 * The relay (Vercel Blob) is a dumb bucket for block exchange.
 */

import { createRoot } from "react-dom/client";
import App from "./App.kernel.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
