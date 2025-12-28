import { useState } from 'react'
import { ConstructionButton } from './components/ConstructionButton'
import './App.css'

// Supabase Edge Function URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
// Phase 0.2: Use generate-v2 with skill loading
const GENERATE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/generate-v2` : null

// Types matching spec
type Face = 'player' | 'author' | 'designer'
type TextState = 'draft' | 'submitted' | 'committed'

// Available frames (Phase 0.3)
// In future, these would be loaded from database
const FRAMES = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
] as const

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
  response?: string
  error?: string
  skillsUsed?: SkillUsed[]
}

// Phase 0.1: Core loop (X0Y0Z0)
// Phase 0.2: Skills loaded from database
// Phase 0.3: Frame selection
function App() {
  const [face, setFace] = useState<Face>('player')
  const [frameId, setFrameId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showMeta, setShowMeta] = useState(false)

  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]

  // Submit: draft → submitted (liquid state)
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
  }

  // Commit: submitted → committed (solid state) → triggers generation
  const handleCommit = async () => {
    const lastEntry = entries[entries.length - 1]
    if (!lastEntry || lastEntry.state !== 'submitted') {
      // If no submitted entry, submit current input first
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
        await generateResponse(entry)
      }
      return
    }

    // Commit the last submitted entry
    setEntries(prev => prev.map((e, i) => 
      i === prev.length - 1 ? { ...e, state: 'committed' as TextState } : e
    ))
    
    await generateResponse(lastEntry)
  }

  // LLM generation via Supabase Edge Function (generate-v2)
  const generateResponse = async (entry: ShelfEntry) => {
    setIsLoading(true)
    
    try {
      // Check if Supabase is configured
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        // Fallback for development without env vars
        const response = `[Supabase not configured]\n\nTo enable LLM responses, add environment variables:\n- VITE_SUPABASE_URL\n- VITE_SUPABASE_ANON_KEY\n\nYour input (${entry.face}): ${entry.text}`
        setEntries(prev => [...prev.filter(e => e.id !== entry.id), { ...entry, state: 'committed' as TextState, response }])
        return
      }

      // Call generate-v2 edge function
      // Pass frame_id if selected (Phase 0.3)
      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text: entry.text,
          face: entry.face,
          frame_id: entry.frameId, // null = platform defaults only
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setEntries(prev => [
        ...prev.filter(e => e.id !== entry.id), 
        { 
          ...entry, 
          state: 'committed' as TextState, 
          response: data.text,
          skillsUsed: data.metadata?.skills_used || [],
        }
      ])
    } catch (error) {
      console.error('Generation error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setEntries(prev => [
        ...prev.filter(e => e.id !== entry.id), 
        { ...entry, state: 'committed' as TextState, error: errorMsg, response: `[Error: ${errorMsg}]` }
      ])
    } finally {
      setIsLoading(false)
    }
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
        <div className="frame-info">
          {currentFrame.xyz}
          <button 
            className="meta-toggle"
            onClick={() => setShowMeta(!showMeta)}
            title="Toggle skill metadata"
          >
            {showMeta ? '◉' : '○'}
          </button>
        </div>
      </header>

      <main className="main">
        {/* Synthesis area - LLM output */}
        <section className="synthesis">
          {entries.filter(e => e.response).map(entry => (
            <div key={entry.id} className={`synthesis-entry ${entry.error ? 'error' : ''}`}>
              <div className="entry-meta">
                <span className="face-badge">{entry.face}</span>
                {entry.frameId && <span className="frame-badge">test-frame</span>}
                <span className="text-input">{entry.text}</span>
              </div>
              <div className="response">{entry.response}</div>
              {showMeta && entry.skillsUsed && entry.skillsUsed.length > 0 && (
                <div className="skills-meta">
                  Skills: {entry.skillsUsed.map(s => s.name).join(', ')}
                </div>
              )}
            </div>
          ))}
          {entries.length === 0 && (
            <div className="empty-state">
              X0Y0Z0: Pure ephemeral play. Nothing persists.<br/>
              Enter text, commit, see response. Refresh to reset.<br/>
              <small>Phase 0.3: Select frame to test skill overrides</small>
            </div>
          )}
        </section>

        {/* Peer area - liquid states */}
        <section className="peers">
          {entries.filter(e => e.state === 'submitted' && !e.response).map(entry => (
            <div key={entry.id} className="peer-entry liquid">
              <span className="face-badge">{entry.face}</span>
              <span className="entry-text">"{entry.text}"</span>
              <span className="state-badge">submitted</span>
            </div>
          ))}
        </section>
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
            }
          }}
        />
        <div className="buttons">
          <button onClick={handleSubmit} disabled={isLoading || !input.trim()}>
            Submit
          </button>
          <button 
            onClick={handleCommit} 
            disabled={isLoading}
            className="commit-btn"
          >
            {isLoading ? 'Generating...' : 'Commit'}
          </button>
        </div>
      </footer>

      {/* Construction button - floating */}
      <ConstructionButton />
    </div>
  )
}

export default App
