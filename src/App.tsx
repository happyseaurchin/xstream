import { useState } from 'react'
import { ConstructionButton } from './components/ConstructionButton'
import './App.css'

// Supabase Edge Function URL
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const GENERATE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/generate` : null

// Types matching spec
type Face = 'player' | 'author' | 'designer'
type TextState = 'draft' | 'submitted' | 'committed'

interface ShelfEntry {
  id: string
  text: string
  face: Face
  state: TextState
  timestamp: string
  response?: string
  error?: string
}

// Phase 1: X0Y0Z0 - ephemeral, bleeding edge, fixed world
// Nothing persists after refresh - this is the proof case
function App() {
  const [face, setFace] = useState<Face>('player')
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Submit: draft → submitted (liquid state)
  const handleSubmit = () => {
    if (!input.trim()) return
    
    const entry: ShelfEntry = {
      id: crypto.randomUUID(),
      text: input.trim(),
      face,
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

  // LLM generation via Supabase Edge Function
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

      // Build context from recent committed entries
      const context = entries
        .filter(e => e.state === 'committed' && e.response)
        .slice(-3)
        .map(e => `[${e.face}]: ${e.text}`)

      // Call edge function
      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text: entry.text,
          face: entry.face,
          context,
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setEntries(prev => [
        ...prev.filter(e => e.id !== entry.id), 
        { ...entry, state: 'committed' as TextState, response: data.response }
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
        <div className="face-selector">
          <select value={face} onChange={(e) => setFace(e.target.value as Face)}>
            <option value="player">Player</option>
            <option value="author">Author</option>
            <option value="designer">Designer</option>
          </select>
        </div>
        <div className="frame-info">
          Frame: X0Y0Z0 (ephemeral)
        </div>
      </header>

      <main className="main">
        {/* Synthesis area - LLM output */}
        <section className="synthesis">
          {entries.filter(e => e.response).map(entry => (
            <div key={entry.id} className={`synthesis-entry ${entry.error ? 'error' : ''}`}>
              <div className="entry-meta">
                <span className="face-badge">{entry.face}</span>
                <span className="text-input">{entry.text}</span>
              </div>
              <div className="response">{entry.response}</div>
            </div>
          ))}
          {entries.length === 0 && (
            <div className="empty-state">
              X0Y0Z0: Pure ephemeral play. Nothing persists.<br/>
              Enter text, commit, see response. Refresh to reset.
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
