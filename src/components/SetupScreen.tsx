/**
 * SetupScreen.tsx — API key + Create/Join game flow.
 *
 * Two modes:
 * - Create: pick a name, write a scene, generate a game code
 * - Join: enter a code, pick a name, join an existing game
 *
 * Key stored in localStorage. Never leaves the browser.
 */

import { useState } from 'react'
import { DEFAULT_SCENE } from '../kernel/block-factory'

type Mode = 'menu' | 'create' | 'join'

interface SetupScreenProps {
  onCreateGame: (apiKey: string, charName: string, charState: string, scene: string) => void
  onJoinGame: (apiKey: string, charName: string, charState: string, gameCode: string) => void
}

export default function SetupScreen({ onCreateGame, onJoinGame }: SetupScreenProps) {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('xstream-api-key') ?? ''
  )
  const [name, setName] = useState(
    () => localStorage.getItem('xstream-character-name') ?? ''
  )
  const [charState, setCharState] = useState('')
  const [scene, setScene] = useState(DEFAULT_SCENE)
  const [gameCode, setGameCode] = useState('')
  const [mode, setMode] = useState<Mode>('menu')
  const [error, setError] = useState('')

  function validate(): boolean {
    const key = apiKey.trim()
    const charName = name.trim()

    if (!key) { setError('API key is required.'); return false }
    if (!key.startsWith('sk-ant-')) { setError("That doesn't look like an Anthropic API key."); return false }
    if (!charName) { setError('Give your character a name.'); return false }

    localStorage.setItem('xstream-api-key', key)
    localStorage.setItem('xstream-character-name', charName)
    setError('')
    return true
  }

  function handleCreate() {
    if (!validate()) return
    onCreateGame(apiKey.trim(), name.trim(), charState.trim(), scene.trim())
  }

  function handleJoin() {
    if (!validate()) return
    const code = gameCode.trim().toUpperCase()
    if (!code || code.length < 4) { setError('Enter a valid game code.'); return }
    onJoinGame(apiKey.trim(), name.trim(), charState.trim(), code)
  }

  // Menu — choose create or join
  if (mode === 'menu') {
    return (
      <div style={containerStyle}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: '#fff' }}>xstream</h1>
        <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '2rem' }}>
          narrative coordination
        </p>

        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            placeholder="Anthropic API key (sk-ant-...)"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            style={inputStyle}
          />

          <input
            type="text"
            placeholder="Character name"
            value={name}
            onChange={e => setName(e.target.value)}
            style={inputStyle}
          />

          {error && <p style={{ color: '#e55', fontSize: '0.8rem', margin: 0 }}>{error}</p>}

          <button onClick={() => { if (validate()) setMode('create') }} style={buttonStyle}>
            Create Game
          </button>
          <button onClick={() => { if (validate()) setMode('join') }} style={{ ...buttonStyle, background: '#444' }}>
            Join Game
          </button>

          <p style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>
            Your API key stays in your browser. It is never sent to our server.
          </p>
        </div>
      </div>
    )
  }

  // Create — scene + character description
  if (mode === 'create') {
    return (
      <div style={containerStyle}>
        <button onClick={() => setMode('menu')} style={backStyle}>← Back</button>
        <h2 style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '1.5rem' }}>Create Game</h2>

        <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={labelStyle}>Character Description</label>
          <textarea
            placeholder="A weary traveller with a scarred hand..."
            value={charState}
            onChange={e => setCharState(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          <label style={labelStyle}>Scene</label>
          <textarea
            value={scene}
            onChange={e => setScene(e.target.value)}
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', fontSize: '0.8rem' }}
          />

          {error && <p style={{ color: '#e55', fontSize: '0.8rem', margin: 0 }}>{error}</p>}

          <button onClick={handleCreate} style={buttonStyle}>
            🌊 Create & Enter
          </button>
        </div>
      </div>
    )
  }

  // Join — enter game code
  return (
    <div style={containerStyle}>
      <button onClick={() => setMode('menu')} style={backStyle}>← Back</button>
      <h2 style={{ fontSize: '1.2rem', color: '#aaa', marginBottom: '1.5rem' }}>Join Game</h2>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={labelStyle}>Game Code</label>
        <input
          type="text"
          placeholder="ABC123"
          value={gameCode}
          onChange={e => setGameCode(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          style={{ ...inputStyle, fontSize: '1.5rem', textAlign: 'center', letterSpacing: '0.2em', fontFamily: 'monospace' }}
          maxLength={6}
        />

        <label style={labelStyle}>Character Description</label>
        <textarea
          placeholder="A weary traveller with a scarred hand..."
          value={charState}
          onChange={e => setCharState(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />

        {error && <p style={{ color: '#e55', fontSize: '0.8rem', margin: 0 }}>{error}</p>}

        <button onClick={handleJoin} style={buttonStyle}>
          🌊 Join & Enter
        </button>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', minHeight: '100vh',
  fontFamily: 'system-ui, sans-serif', background: '#1a1a1a',
  color: '#e0e0e0', padding: '2rem',
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem', borderRadius: 6, border: '1px solid #333',
  background: '#252525', color: '#e0e0e0', fontSize: '0.9rem', outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem', borderRadius: 6, border: 'none',
  background: '#7c3aed', color: '#fff', fontSize: '0.9rem',
  cursor: 'pointer', fontWeight: 600,
}

const backStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#888', cursor: 'pointer',
  fontSize: '0.85rem', marginBottom: '0.5rem', alignSelf: 'flex-start',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem', color: '#888', marginBottom: '-0.5rem',
}
