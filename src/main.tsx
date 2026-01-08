import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { Plex1Build } from "./pages/Plex1Build.tsx";
import "./index.css";

function Router() {
  const path = window.location.pathname;

  if (path === '/plex1-build') {
    return <Plex1Build />;
  }

  return <App />;
}

createRoot(document.getElementById("root")!).render(<Router />);
