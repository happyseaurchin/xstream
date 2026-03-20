/**
 * SetupScreen.tsx — API key + character name entry.
 *
 * Simple gate: enter your Anthropic API key and character name,
 * pick a world (just Thornkeep for now), and enter.
 * Key stored in localStorage. Never leaves the browser.
 */

import { useState } from 'react'

interface SetupScreenProps {
  onEnter: (apiKey: string, characterName: string, worldId: string) => void
}

export default function SetupScreen({ onEnter }: SetupScreenProps) {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem('xstream-api-key') ?? ''
  )
  const [name, setName] = useState(
    () => localStorage.getItem('xstream-character-name') ?? ''
  )
  const [error, setError] = useState('')

  function handleEnter() {
    const key = apiKey.trim()
    const charName = name.trim()

    if (!key) {
      setError('API key is required.')
      return
    }
    if (!key.startsWith('sk-ant-')) {
      setError('That doesn\'t look like an Anthropic API key.')
      return
    }
    if (!charName) {
      setError('Give your character a name.')
      return
    }

    localStorage.setItem('xstream-api-key', key)
    localStorage.setItem('xstream-character-name', charName)
    setError('')
    onEnter(key, charName, 'thornkeep')
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      fontFamily: 'system-ui, sans-serif',
      background: '#1a1a1a',
      color: '#e0e0e0',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#fff' }}>
        xstream
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '2rem' }}>
        Thornkeep — The Broken Coast
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
          onKeyDown={e => e.key === 'Enter' && handleEnter()}
          style={inputStyle}
        />

        {error && (
          <p style={{ color: '#e55', fontSize: '0.8rem', margin: 0 }}>{error}</p>
        )}

        <button onClick={handleEnter} style={buttonStyle}>
          Enter Thornkeep
        </button>

        <p style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>
          Your API key stays in your browser. It is never sent to our server.
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderRadius: 6,
  border: '1px solid #333',
  background: '#252525',
  color: '#e0e0e0',
  fontSize: '0.9rem',
  outline: 'none',
}

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem',
  borderRadius: 6,
  border: 'none',
  background: '#7c3aed',
  color: '#fff',
  fontSize: '0.9rem',
  cursor: 'pointer',
  fontWeight: 600,
}
