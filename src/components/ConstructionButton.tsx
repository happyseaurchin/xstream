import { useState, useEffect } from 'react'
import './ConstructionButton.css'

// Permission check placeholder - will be replaced with actual auth later
interface ConstructionPermissions {
  canAccessConstruction: boolean
  canChangeTheme: boolean
  canAccessDashboard: boolean
}

// Temporary: everyone has access during construction phase
// TODO: Replace with actual role-based permissions from Supabase
function useConstructionPermissions(): ConstructionPermissions {
  // In future, this will check user.role or user.permissions from Supabase
  // For now, return full access for development
  return {
    canAccessConstruction: true,
    canChangeTheme: true,
    canAccessDashboard: true,
  }
}

type Theme = 'light' | 'dark'

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return (localStorage.getItem('xstream-theme') as Theme) || 'light'
}

function setStoredTheme(theme: Theme) {
  localStorage.setItem('xstream-theme', theme)
  document.documentElement.setAttribute('data-theme', theme)
}

export function ConstructionButton() {
  const permissions = useConstructionPermissions()
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  // Don't render if user doesn't have construction access
  if (!permissions.canAccessConstruction) {
    return null
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    setStoredTheme(newTheme)
  }

  const handleDashboardClick = () => {
    // For now, just navigate - later this will be a proper router
    window.location.href = '/construction'
  }

  return (
    <div className="construction-container">
      {isOpen && (
        <div className="construction-menu">
          <div className="construction-menu-header">
            🚧 Construction
          </div>
          
          {permissions.canChangeTheme && (
            <button 
              className="construction-menu-item"
              onClick={toggleTheme}
            >
              <span className="menu-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
              <span>Switch to {theme === 'light' ? 'dark' : 'light'} theme</span>
            </button>
          )}
          
          {permissions.canAccessDashboard && (
            <button 
              className="construction-menu-item"
              onClick={handleDashboardClick}
            >
              <span className="menu-icon">⚙️</span>
              <span>Construction Dashboard</span>
            </button>
          )}

          <div className="construction-menu-footer">
            <span className="version">Plex 0.1 • X0Y0Z0</span>
          </div>
        </div>
      )}
      
      <button 
        className={`construction-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Construction menu"
      >
        🔧
      </button>
    </div>
  )
}
