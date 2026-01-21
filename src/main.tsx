import { createRoot } from "react-dom/client";
import { useAuth } from "./hooks/useAuth";
import { AuthPageOTP, Phase2Capture } from "./components";
import App from "./App.tsx";
import { Plex1Build } from "./pages/Plex1Build.tsx";
import "./index.css";

// Admin whitelist - only these emails get the full app
const ADMIN_EMAILS = ['david@ecosquared.co.uk']

/**
 * AuthGate - Clean separation of concerns
 *
 * 1. Not logged in → Login page
 * 2. Logged in + admin → App (with all its hooks)
 * 3. Logged in + not admin → Phase 2 page (simple, no app hooks)
 */
function AuthGate() {
  const auth = useAuth()

  // Loading state
  if (auth.isLoading) {
    return (
      <div className="app loading-screen">
        <div className="loading-text">Loading...</div>
      </div>
    )
  }

  // Not logged in
  if (!auth.user) {
    // No reload needed - useAuth will react to the auth state change automatically
    return <AuthPageOTP onSuccess={() => console.log('[AuthGate] Login success, auth state will update')} />
  }

  // Logged in - check if admin
  const isAdmin = ADMIN_EMAILS.includes(auth.user.email || '')

  if (isAdmin) {
    // Admin gets the full app
    return <App />
  }

  // Everyone else gets Phase 2 - clean, simple, no app hooks loaded
  return (
    <Phase2Capture
      userEmail={auth.user.email || ''}
      userId={auth.user.id}
      onComplete={() => {
        // Users stay on Phase 2 - this is intentional
        console.log('[AuthGate] Phase 2 save completed')
      }}
    />
  )
}

function Router() {
  const path = window.location.pathname;

  if (path === '/plex1-build') {
    return <Plex1Build />;
  }

  return <AuthGate />;
}

createRoot(document.getElementById("root")!).render(<Router />);
