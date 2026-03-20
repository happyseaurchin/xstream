/**
 * App.block-agents.tsx — main app shell for the block-agents architecture.
 *
 * Three zones (solid / liquid / vapor) wired to three engines (hard / soft / medium).
 * On entry: Hard builds frame. ASK calls Soft. COMMIT calls Medium.
 * Frame is cached and reused until location changes or manual refresh.
 */

import { useState, useCallback, useRef } from 'react'
import SetupScreen from './components/SetupScreen'
import SolidZone from './components/SolidZone'
import LiquidZone from './components/LiquidZone'
import VaporZone from './components/VaporZone'
import { runHard, type Frame } from './engine/hard'
import { runSoft } from './engine/soft'
import { runMedium } from './engine/medium'
import { readBlock, writeBlock } from './lib/shelf'
import { KNOWLEDGE_TEMPLATE } from './blocks/agents'
import { downloadLog, getEntryCount } from './lib/logger'
import type { PscaleBlock } from './lib/bsp'

type AppState = 'setup' | 'loading' | 'ready'

export default function App() {
  // Session state
  const [appState, setAppState] = useState<AppState>('setup')
  const [apiKey, setApiKey] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [worldId, setWorldId] = useState('thornkeep')
  const [coordinates, setCoordinates] = useState('111') // Main room of the Salted Dog (floor 3: pscale 0 = room)

  // Engine state
  const frameRef = useRef<Frame | null>(null)
  const knowledgeRef = useRef<PscaleBlock | null>(null)

  // UI state
  const [solidEntries, setSolidEntries] = useState<string[]>([])
  const [softResponse, setSoftResponse] = useState<string | null>(null)
  const [committed, setCommitted] = useState<string | null>(null)
  const [synthesising, setSynthesising] = useState(false)
  const [softLoading, setSoftLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [face] = useState<'player' | 'author' | 'designer'>('player')

  // --- Entry ---
  const handleEnter = useCallback(async (key: string, name: string, world: string) => {
    setApiKey(key)
    setCharacterName(name)
    setWorldId(world)
    setAppState('loading')
    setStatusMessage('Building your view of the world...')

    try {
      // Load or create knowledge block
      let knowledge = await readBlock(`${name.toLowerCase()}:knowledge`)
      if (!knowledge) {
        // Deep clone template
        knowledge = JSON.parse(JSON.stringify(KNOWLEDGE_TEMPLATE))
        await writeBlock(`${name.toLowerCase()}:knowledge`, knowledge)
      }
      knowledgeRef.current = knowledge

      // Register character in characters block
      const characters = await readBlock(`${world}:characters`)
      if (characters) {
        // Find next available slot (5-9 for players, 1-4 are NPCs)
        for (let d = 5; d <= 9; d++) {
          const k = String(d)
          if (!(k in characters)) {
            characters[k] = {
              _: `${name}. A newcomer. Just arrived.`,
              '1': `Location: 111 (main room of the Salted Dog)`,
              '2': `Purpose: unknown — they have just arrived.`,
              '3': `State: standing in the doorway, taking in the room.`,
            }
            await writeBlock(`${world}:characters`, characters)
            break
          }
        }
      }

      // Run Hard to build initial frame
      const result = await runHard(
        key, name, '111', world, 'player', 'entry', knowledge
      )
      frameRef.current = result.frame

      // Apply any initial knowledge updates
      if (result.knowledgeUpdates.length > 0 && knowledgeRef.current) {
        await applyKnowledgeUpdates(result.knowledgeUpdates, name)
      }

      setStatusMessage('')
      setAppState('ready')
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
      setAppState('setup')
    }
  }, [])

  // --- ASK (Soft-LLM) ---
  const handleAsk = useCallback(async (vapor: string) => {
    if (!frameRef.current) return
    setSoftLoading(true)
    setSoftResponse(null)

    try {
      const result = await runSoft(
        apiKey, vapor, frameRef.current,
        knowledgeRef.current, solidEntries[solidEntries.length - 1] ?? '', face
      )
      setSoftResponse(result.text)
    } catch (err: any) {
      setSoftResponse(`Error: ${err.message}`)
    } finally {
      setSoftLoading(false)
    }
  }, [apiKey, solidEntries, face])

  // --- COMMIT (Medium-LLM) ---
  const handleCommit = useCallback(async (text: string) => {
    if (!frameRef.current) return
    setCommitted(text)
    setSynthesising(true)
    setSoftResponse(null)

    try {
      const result = await runMedium(
        apiKey, text, frameRef.current,
        knowledgeRef.current, worldId, characterName, face
      )

      // Add solid to display
      setSolidEntries(prev => [...prev, result.solid])

      // Write event to shelf
      if (result.eventEntry) {
        const events = await readBlock(`${worldId}:events`)
        if (events) {
          // Find next available event slot
          for (let d = 5; d <= 9; d++) {
            const k = String(d)
            if (!(k in events)) {
              events[k] = { _: result.eventEntry }
              await writeBlock(`${worldId}:events`, events)
              break
            }
          }
        }
      }

      // Apply knowledge updates
      if (result.knowledgeUpdates.length > 0) {
        await applyKnowledgeUpdates(result.knowledgeUpdates, characterName)
      }

      // If location changed, update coordinates and re-run Hard
      if (result.locationChange) {
        setCoordinates(result.locationChange)
        const hardResult = await runHard(
          apiKey, characterName, result.locationChange, worldId, face, 'location-change', knowledgeRef.current
        )
        frameRef.current = hardResult.frame
        if (hardResult.knowledgeUpdates.length > 0) {
          await applyKnowledgeUpdates(hardResult.knowledgeUpdates, characterName)
        }
      }

      setCommitted(null)
      setSynthesising(false)
    } catch (err: any) {
      setSoftResponse(`Synthesis error: ${err.message}`)
      setSynthesising(false)
    }
  }, [apiKey, worldId, characterName, face, coordinates])

  // --- Knowledge update helper ---
  async function applyKnowledgeUpdates(updates: string[], name: string) {
    if (!knowledgeRef.current) return
    const knowledge = knowledgeRef.current

    // Append updates to the appropriate knowledge categories
    for (const update of updates) {
      // Try to fit into existing categories (1=people, 2=places, 3=events, 4=rumours)
      // For now, put into events category (3)
      const category = knowledge['3']
      if (category && typeof category === 'object') {
        for (let d = 2; d <= 9; d++) {
          const k = String(d)
          if (!(k in category)) {
            ;(category as any)[k] = update
            break
          }
        }
      }
    }

    knowledgeRef.current = knowledge
    localStorage.setItem(`xstream-knowledge-${name.toLowerCase()}`, JSON.stringify(knowledge))
    await writeBlock(`${name.toLowerCase()}:knowledge`, knowledge)
  }

  // --- Refresh (re-run Hard) ---
  const handleRefresh = useCallback(async () => {
    if (!apiKey) return
    setStatusMessage('Looking around...')
    try {
      const result = await runHard(
        apiKey, characterName, coordinates, worldId, face, 'refresh', knowledgeRef.current
      )
      frameRef.current = result.frame
      if (result.knowledgeUpdates.length > 0) {
        await applyKnowledgeUpdates(result.knowledgeUpdates, characterName)
      }
      if (result.locationChange) {
        setCoordinates(result.locationChange)
      }
      setStatusMessage('')
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
    }
  }, [apiKey, characterName, coordinates, worldId, face])

  // --- Render ---
  if (appState === 'setup') {
    return <SetupScreen onEnter={handleEnter} />
  }

  if (appState === 'loading') {
    return (
      <div style={loadingStyle}>
        <p>{statusMessage || 'Loading...'}</p>
      </div>
    )
  }

  return (
    <div style={appStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ color: '#7c3aed', fontWeight: 600 }}>{characterName}</span>
        <span style={{ color: '#666', fontSize: '0.8rem' }}>
          {coordinates} · {worldId}
        </span>
        <button onClick={handleRefresh} style={refreshBtnStyle} title="Look around (re-run Hard)">
          👁
        </button>
        <button onClick={downloadLog} style={refreshBtnStyle} title="Download session log">
          📋
        </button>
      </div>

      {statusMessage && (
        <div style={statusStyle}>{statusMessage}</div>
      )}

      {/* Three zones */}
      <SolidZone entries={solidEntries} />
      <LiquidZone
        committed={committed}
        softResponse={softResponse}
        synthesising={synthesising}
      />
      <VaporZone
        onAsk={handleAsk}
        onCommit={handleCommit}
        disabled={synthesising}
        loading={softLoading}
      />
    </div>
  )
}

const appStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  background: '#1a1a1a',
  color: '#e0e0e0',
  fontFamily: 'system-ui, sans-serif',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.75rem 1rem',
  borderBottom: '1px solid #333',
  fontSize: '0.9rem',
}

const refreshBtnStyle: React.CSSProperties = {
  marginLeft: 'auto',
  background: 'none',
  border: 'none',
  fontSize: '1.2rem',
  cursor: 'pointer',
  padding: '0.25rem',
}

const statusStyle: React.CSSProperties = {
  padding: '0.5rem 1rem',
  background: '#252525',
  color: '#7c3aed',
  fontSize: '0.8rem',
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  background: '#1a1a1a',
  color: '#7c3aed',
  fontFamily: 'system-ui, sans-serif',
}
