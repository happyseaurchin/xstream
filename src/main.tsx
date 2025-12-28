import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Construction } from './pages/Construction'
import './index.css'

// Simple routing based on pathname
// TODO: Replace with proper router when needed
function Router() {
  const path = window.location.pathname

  if (path === '/construction') {
    return <Construction />
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)
