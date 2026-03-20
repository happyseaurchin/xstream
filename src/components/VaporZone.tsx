/**
 * VaporZone.tsx — the user's input area.
 * Ephemeral thinking space. ASK calls Soft-LLM, COMMIT locks intention.
 */

import { useState } from 'react'

interface VaporZoneProps {
  onAsk: (vapor: string) => void
  onCommit: (text: string) => void
  disabled: boolean
  loading: boolean
}

export default function VaporZone({ onAsk, onCommit, disabled, loading }: VaporZoneProps) {
  const [text, setText] = useState('')

  function handleAsk() {
    if (!text.trim() || disabled) return
    onAsk(text.trim())
  }

  function handleCommit() {
    if (!text.trim() || disabled) return
    onCommit(text.trim())
    setText('')
  }

  return (
    <div style={zoneStyle}>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="What do you want to do?"
        disabled={disabled}
        style={textareaStyle}
        onKeyDown={e => {
          if (e.key === 'Enter' && e.metaKey) handleCommit()
          if (e.key === 'Enter' && e.shiftKey) handleAsk()
        }}
      />
      <div style={buttonRow}>
        <button
          onClick={handleAsk}
          disabled={disabled || !text.trim()}
          style={{ ...btnStyle, background: '#333' }}
        >
          {loading ? '...' : 'ASK'}
        </button>
        <button
          onClick={handleCommit}
          disabled={disabled || !text.trim()}
          style={{ ...btnStyle, background: '#7c3aed' }}
        >
          COMMIT
        </button>
      </div>
      <p style={hintStyle}>Shift+Enter to ask · Cmd+Enter to commit</p>
    </div>
  )
}

const zoneStyle: React.CSSProperties = {
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 80,
  padding: '0.75rem',
  borderRadius: 6,
  border: '1px solid #333',
  background: '#252525',
  color: '#e0e0e0',
  fontSize: '0.9rem',
  resize: 'vertical',
  outline: 'none',
  fontFamily: 'inherit',
}

const buttonRow: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
}

const btnStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.6rem',
  borderRadius: 6,
  border: 'none',
  color: '#fff',
  fontSize: '0.85rem',
  cursor: 'pointer',
  fontWeight: 600,
}

const hintStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#555',
  textAlign: 'center',
}
