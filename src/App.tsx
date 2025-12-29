import { useState, useRef, useEffect, useCallback } from 'react'
import { ConstructionButton } from './components/ConstructionButton'
import './App.css'

// Supabase Edge Function URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const GENERATE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/generate-v2` : null

// Types matching spec
type Face = 'player' | 'author' | 'designer'
type TextState = 'draft' | 'submitted' | 'committed'

// Available frames (Phase 0.3)
const FRAMES = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
] as const

// Visibility settings for sharing and filtering
interface VisibilitySettings {
  // What you share with others
  shareVapor: boolean    // Live keystrokes
  shareLiquid: boolean   // Submitted intentions
  // What you see from others
  showVapor: boolean     // Others' typing indicators
  showLiquid: boolean    // Others' submitted intentions
  showSolid: boolean     // Committed/synthesized results
}

interface SkillUsed {
  category: string
  name: string
}

interface ShelfEntry {
  id: string
  text: string
  face: Face
  frameId: string | null
  state: TextState
  timestamp: string
  isEditing?: boolean      // Currently being edited
  response?: string
  error?: string
  skillsUsed?: SkillUsed[]
}

// Debounce delay for liquid edits (ms)
const EDIT_DEBOUNCE_MS = 500

// Phase 0.1: Core loop (X0Y0Z0)
// Phase 0.2: Skills loaded from database
// Phase 0.3: Frame selection
// Phase 0.4: Text states (vapor/liquid/solid) visible
function App() {
  const [face, setFace] = useState<Face>('player')
  const [frameId, setFrameId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showMeta, setShowMeta] = useState(false)
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false)
  
  // Visibility settings
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    shareVapor: true,
    shareLiquid: true,
    showVapor: true,
    showLiquid: true,
    showSolid: true,
  })

  // Track which entry is being edited and debounce timer
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const debounceTimerRef = useRef<number | null>(null)

  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]

  // Get entries by state
  const liquidEntries = entries.filter(e => e.state === 'submitted')
  const solidEntries = entries.filter(e => e.state === 'committed' && e.response)

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Handle liquid entry edit with debouncing
  const handleLiquidEdit = useCallback((entryId: string, newText: string) => {
    // Mark as editing immediately
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, text: newText, isEditing: true } : e
    ))
    setEditingEntryId(entryId)

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer - will broadcast after pause
    debounceTimerRef.current = window.setTimeout(() => {
      setEntries(prev => prev.map(e => 
        e.id === entryId ? { ...e, isEditing: false } : e
      ))
      setEditingEntryId(null)
      // Future: WebSocket broadcast here (Phase 0.6)
      console.log('[Debounced] Would broadcast liquid update:', { entryId, newText })
    }, EDIT_DEBOUNCE_MS)
  }, [])

  // Submit: input -> liquid (submitted state)
  const handleSubmit = () => {
    if (!input.trim()) return
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: input.trim(),
      face,
      frameId,
      state: 'submitted',
      timestamp: new Date().toISOString(),
    }
    
    setEntries(prev => [...prev, entry])
    setInput('')
    
    // Future: Soft-LLM processing here (Phase 0.5+)
    console.log('[Submit] Created liquid entry:', entry.id)
  }

  // Commit specific entry: submitted -> committed -> triggers generation
  const handleCommitEntry = async (entryId: string) => {
    const entry = entries.find(e => e.id === entryId)
    if (!entry || entry.state !== 'submitted') return

    // Mark as committed
    setEntries(prev => prev.map(e => 
      e.id === entryId ? { ...e, state: 'committed' as TextState, isEditing: false } : e
    ))
    
    await generateResponse(entry)
  }

  // Commit: submit current input OR commit last liquid entry
  const handleCommit = async () => {
    // If there's input, submit and commit in one action
    if (input.trim()) {
      const entry: ShelfEntry = {
        id: crypto.randomUUID(),
        text: input.trim(),
        face,
        frameId,
        state: 'committed',
        timestamp: new Date().toISOString(),
      }
      setInput('')
      setEntries(prev => [...prev, entry])
      await generateResponse(entry)
      return
    }

    // Otherwise commit the last liquid entry
    const lastLiquid = [...entries].reverse().find(e => e.state === 'submitted')
    if (lastLiquid) {
      await handleCommitEntry(lastLiquid.id)
    }
  }

  // LLM generation via Supabase Edge Function (generate-v2)
  const generateResponse = async (entry: ShelfEntry) => {
    setIsLoading(true)
    
    try {
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        const response = `[Supabase not configured]\n\nTo enable LLM responses, add environment variables:\n- VITE_SUPABASE_URL\n- VITE_SUPABASE_ANON_KEY\n\nYour input (${entry.face}): ${entry.text}`
        setEntries(prev => prev.map(e => 
          e.id === entry.id ? { ...e, state: 'committed' as TextState, response } : e
        ))
        return
      }

      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text: entry.text,
          face: entry.face,
          frame_id: entry.frameId,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { 
          ...e, 
          state: 'committed' as TextState, 
          response: data.text,
          skillsUsed: data.metadata?.skills_used || [],
        } : e
      ))
    } catch (error) {
      console.error('Generation error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { 
          ...e, 
          state: 'committed' as TextState, 
          error: errorMsg, 
          response: `[Error: ${errorMsg}]` 
        } : e
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Toggle visibility setting
  const toggleVisibility = (key: keyof VisibilitySettings) => {
    setVisibility(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <div className="app">
      <header className="header">
        <div className="selectors">
          <select 
            value={face} 
            onChange={(e) => setFace(e.target.value as Face)}
            className="face-selector"
          >
            <option value="player">Player</option>
            <option value="author">Author</option>
            <option value="designer">Designer</option>
          </select>
          <select
            value={frameId || ''}
            onChange={(e) => setFrameId(e.target.value || null)}
            className="frame-selector"
          >
            {FRAMES.map(f => (
              <option key={f.id || 'none'} value={f.id || ''}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="header-controls">
          <span className="xyz-badge">{currentFrame.xyz}</span>
          <button 
            className={`visibility-toggle ${showVisibilityPanel ? 'active' : ''}`}
            onClick={() => setShowVisibilityPanel(!showVisibilityPanel)}
            title="Visibility settings"
          >
            *
          </button>
          <button 
            className="meta-toggle"
            onClick={() => setShowMeta(!showMeta)}
            title="Toggle skill metadata"
          >
            {showMeta ? '#' : 'o'}
          </button>
        </div>
      </header>

      {/* Visibility Settings Panel */}
      {showVisibilityPanel && (
        <div className="visibility-panel">
          <div className="visibility-section">
            <span className="visibility-label">Share:</span>
            <button 
              className={`visibility-btn ${visibility.shareVapor ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('shareVapor')}
              title="Share live typing (vapor)"
            >
              ~ Vapor
            </button>
            <button 
              className={`visibility-btn ${visibility.shareLiquid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('shareLiquid')}
              title="Share submitted intentions (liquid)"
            >
              o Liquid
            </button>
          </div>
          <div className="visibility-section">
            <span className="visibility-label">Show:</span>
            <button 
              className={`visibility-btn ${visibility.showVapor ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showVapor')}
              title="See others' typing"
            >
              ~ Vapor
            </button>
            <button 
              className={`visibility-btn ${visibility.showLiquid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showLiquid')}
              title="See others' intentions"
            >
              o Liquid
            </button>
            <button 
              className={`visibility-btn ${visibility.showSolid ? 'on' : 'off'}`}
              onClick={() => toggleVisibility('showSolid')}
              title="See committed results"
            >
              # Solid
            </button>
          </div>
        </div>
      )}

      <main className="main">
        {/* SOLID: Synthesis area - committed results */}
        {visibility.showSolid && (
          <section className="synthesis-area">
            <div className="area-header">
              <span className="area-label"># Solid</span>
              <span className="area-hint">Committed results</span>
            </div>
            {solidEntries.length > 0 ? (
              solidEntries.map(entry => (
                <div key={entry.id} className={`solid-entry ${entry.error ? 'error' : ''}`}>
                  <div className="entry-header">
                    <span className="face-badge">{entry.face}</span>
                    {entry.frameId && <span className="frame-badge">test-frame</span>}
                    <span className="state-badge committed">committed</span>
                  </div>
                  <div className="entry-input">"{entry.text}"</div>
                  <div className="entry-response">{entry.response}</div>
                  {showMeta && entry.skillsUsed && entry.skillsUsed.length > 0 && (
                    <div className="skills-meta">
                      Skills: {entry.skillsUsed.map(s => s.name).join(', ')}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                No committed results yet. Submit and commit to generate.
              </div>
            )}
          </section>
        )}

        {/* LIQUID: Submitted intentions area */}
        {visibility.showLiquid && (
          <section className="liquid-area">
            <div className="area-header">
              <span className="area-label">o Liquid</span>
              <span className="area-hint">Submitted intentions (editable)</span>
            </div>
            {liquidEntries.length > 0 ? (
              liquidEntries.map(entry => (
                <div key={entry.id} className={`liquid-entry ${entry.isEditing ? 'editing' : ''}`}>
                  <div className="entry-header">
                    <span className="face-badge">{entry.face}</span>
                    <span className={`state-badge ${entry.isEditing ? 'editing' : 'submitted'}`}>
                      {entry.isEditing ? 'editing' : 'submitted'}
                    </span>
                  </div>
                  <textarea
                    className="liquid-text"
                    value={entry.text}
                    onChange={(e) => handleLiquidEdit(entry.id, e.target.value)}
                    disabled={isLoading}
                  />
                  <div className="entry-actions">
                    <button
                      className="commit-entry-btn"
                      onClick={() => handleCommitEntry(entry.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? '...' : 'Commit'}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-hint">
                Type below and submit to create a liquid entry
              </div>
            )}
          </section>
        )}

        {/* VAPOR: Typing indicators area (placeholder for multi-user) */}
        {visibility.showVapor && (
          <section className="vapor-area">
            <div className="area-header">
              <span className="area-label">~ Vapor</span>
              <span className="area-hint">Live presence</span>
            </div>
            {input.trim() && visibility.shareVapor && (
              <div className="vapor-indicator self">
                <span className="typing-dot">*</span>
                <span className="vapor-preview">typing: "{input.slice(0, 30)}{input.length > 30 ? '...' : ''}"</span>
              </div>
            )}
            {/* Future: Others' vapor indicators will appear here (Phase 0.6) */}
            {!input.trim() && (
              <div className="empty-hint">
                Typing indicators appear here
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Enter text as ${face}...`}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.metaKey) {
              handleCommit()
            } else if (e.key === 'Enter' && e.shiftKey) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <div className="buttons">
          <button 
            onClick={handleSubmit} 
            disabled={isLoading || !input.trim()}
            title="Submit to liquid (Shift+Enter)"
          >
            Submit
          </button>
          <button 
            onClick={handleCommit} 
            disabled={isLoading}
            className="commit-btn"
            title="Commit and generate (Cmd+Enter)"
          >
            {isLoading ? 'Generating...' : 'Commit'}
          </button>
        </div>
      </footer>

      <ConstructionButton />
    </div>
  )
}

export default App
