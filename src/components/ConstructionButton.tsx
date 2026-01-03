import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './ConstructionButton.css'

// Supabase client for dev operations
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// Test frame ID - hardcoded for now
const TEST_FRAME_ID = 'bbbbbbbb-0000-0000-0000-000000000001'

// Permission check placeholder - will be replaced with actual auth later
interface ConstructionPermissions {
  canAccessConstruction: boolean
  canChangeTheme: boolean
  canAccessDashboard: boolean
  canClearFrame: boolean
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
    canClearFrame: true,
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
  const [isClearing, setIsClearing] = useState(false)
  const [clearMessage, setClearMessage] = useState<string | null>(null)

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

  const handleClearTestFrame = async () => {
    if (!supabase) {
      setClearMessage('Supabase not configured')
      return
    }

    if (!confirm('Clear all liquid and solid from test-frame? This cannot be undone.')) {
      return
    }

    setIsClearing(true)
    setClearMessage(null)

    try {
      // Delete liquid first (has no FK dependencies)
      const { error: liquidError } = await supabase
        .from('liquid')
        .delete()
        .eq('frame_id', TEST_FRAME_ID)

      if (liquidError) throw liquidError

      // Delete solid
      const { error: solidError } = await supabase
        .from('solid')
        .delete()
        .eq('frame_id', TEST_FRAME_ID)

      if (solidError) throw solidError

      console.log('[Construction] Cleared test-frame liquid and solid')
      setClearMessage('✓ Cleared!')
      
      // Auto-dismiss message after 2 seconds
      setTimeout(() => setClearMessage(null), 2000)
      
    } catch (error) {
      console.error('[Construction] Clear failed:', error)
      setClearMessage('✗ Error: ' + (error instanceof Error ? error.message : 'Unknown'))
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="construction-container">
      {isOpen && (
        <div className="construction-menu">
          <div className="construction-menu-header">
            Construction
          </div>
          
          {permissions.canChangeTheme && (
            <button 
              className="construction-menu-item"
              onClick={toggleTheme}
            >
              <span className="menu-icon">{theme === 'light' ? 'D' : 'L'}</span>
              <span>Switch to {theme === 'light' ? 'dark' : 'light'} theme</span>
            </button>
          )}
          
          {permissions.canClearFrame && (
            <button 
              className="construction-menu-item"
              onClick={handleClearTestFrame}
              disabled={isClearing}
            >
              <span className="menu-icon">⌫</span>
              <span>
                {isClearing ? 'Clearing...' : 'Clear test-frame'}
                {clearMessage && <span className="clear-status"> {clearMessage}</span>}
              </span>
            </button>
          )}
          
          {permissions.canAccessDashboard && (
            <button 
              className="construction-menu-item"
              onClick={handleDashboardClick}
            >
              <span className="menu-icon">*</span>
              <span>Construction Dashboard</span>
            </button>
          )}

          <div className="construction-menu-footer">
            <span className="version">Phase 0.9.3 | Testing commit flow</span>
          </div>
        </div>
      )}
      
      <button 
        className={`construction-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Construction menu"
      >
        #
      </button>
    </div>
  )
}
