import type { VisibilitySettings } from '../types'

interface VisibilityPanelProps {
  visibility: VisibilitySettings
  onToggle: (key: keyof VisibilitySettings) => void
  userName: string
  onNameChange: (name: string) => void
}

export function VisibilityPanel({ 
  visibility, 
  onToggle, 
  userName, 
  onNameChange 
}: VisibilityPanelProps) {
  const [showNameEdit, setShowNameEdit] = useState(false)
  const [editingName, setEditingName] = useState('')

  const handleNameSubmit = () => {
    if (editingName.trim()) {
      onNameChange(editingName.trim())
    }
    setShowNameEdit(false)
  }

  return (
    <div className="visibility-panel">
      <div className="visibility-section">
        <span className="visibility-label">Share:</span>
        <button 
          className={`visibility-btn ${visibility.shareVapor ? 'on' : 'off'}`}
          onClick={() => onToggle('shareVapor')}
        >
          ~ Vapor
        </button>
        <button 
          className={`visibility-btn ${visibility.shareLiquid ? 'on' : 'off'}`}
          onClick={() => onToggle('shareLiquid')}
        >
          o Liquid
        </button>
      </div>
      <div className="visibility-section">
        <span className="visibility-label">Show:</span>
        <button 
          className={`visibility-btn ${visibility.showVapor ? 'on' : 'off'}`}
          onClick={() => onToggle('showVapor')}
        >
          ~ Vapor
        </button>
        <button 
          className={`visibility-btn ${visibility.showLiquid ? 'on' : 'off'}`}
          onClick={() => onToggle('showLiquid')}
        >
          o Liquid
        </button>
        <button 
          className={`visibility-btn ${visibility.showSolid ? 'on' : 'off'}`}
          onClick={() => onToggle('showSolid')}
        >
          # Solid
        </button>
      </div>
      <div className="visibility-section name-section">
        <span className="visibility-label">Name:</span>
        {showNameEdit ? (
          <div className="name-edit">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              autoFocus
            />
            <button onClick={handleNameSubmit}>✓</button>
            <button onClick={() => setShowNameEdit(false)}>✕</button>
          </div>
        ) : (
          <button 
            className="name-display"
            onClick={() => {
              setEditingName(userName)
              setShowNameEdit(true)
            }}
          >
            {userName}
          </button>
        )}
      </div>
    </div>
  )
}

// Need to import useState
import { useState } from 'react'
