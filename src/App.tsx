// Temporary App.tsx - renders XStreamApp with sample data to verify vapor-flow UI
// Will be replaced with hook-wired version after build verification

import { useAuth } from './hooks/useAuth'
import { AuthPage } from './components'
import { XStreamApp } from './components/xstream'
import './index.css'

function App() {
  const auth = useAuth()

  // Show loading while checking auth
  if (auth.isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Show auth page if not logged in
  if (!auth.user) {
    return <AuthPage auth={auth} />
  }

  // Render vapor-flow UI with sample data
  return <XStreamApp />
}

export default App
