import { useState } from 'react'
import './App.css'

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

  // LLM generation (placeholder - will call edge function)
  const generateResponse = async (entry: ShelfEntry) => {
    setIsLoading(true)
    
    try {
      // Phase 1: Hard-coded prompt compilation
      // Later this becomes the skill loader → prompt compiler pipeline
      const systemPrompt = compilePrompt(entry, entries)
      
      // TODO: Call Supabase Edge Function for LLM
      // For now, echo with system prompt for testing
      const response = `[System would send to LLM]\n\nSystem: ${systemPrompt}\n\nUser (${entry.face}): ${entry.text}\n\n[Awaiting LLM integration...]`
      
      setEntries(prev => prev.map(e => 
        e.id === entry.id ? { ...e, state: 'committed' as TextState, response } : e
      ))
    } catch (error) {
      console.error('Generation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Hard-coded prompt compiler (Phase 1)
  // This will become the skill-driven compiler
  const compilePrompt = (entry: ShelfEntry, history: ShelfEntry[]): string => {
    const faceContext = {
      player: 'You are a Character-LLM helping a player navigate a scene. Respond in-character to their action.',
      author: 'You are an Author-LLM helping create world content. Respond with world-building assistance.',
      designer: 'You are a Designer-LLM helping define skills and rules. Respond with system design assistance.',
    }

    const recentContext = history
      .filter(e => e.state === 'committed' && e.response)
      .slice(-3)
      .map(e => `[${e.face}]: ${e.text}`)
      .join('\n')

    return `${faceContext[entry.face]}\n\nRecent context:\n${recentContext || '(no prior context)'}`
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
            <div key={entry.id} className="synthesis-entry">
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
    </div>
  )
}

export default App
