import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Construction } from './pages/Construction'
import { Architecture } from './pages/Architecture'
import './index.css'

// Simple routing based on pathname
// TODO: Replace with proper router when needed
function Router() {
  const path = window.location.pathname

  if (path === '/construction') {
    return <Construction />
  }
  
  if (path === '/architecture') {
    return <Architecture />
  }

  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>,
)
