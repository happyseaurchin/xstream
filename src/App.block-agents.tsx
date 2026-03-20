/**
 * App.block-agents.tsx — block-agents app with original xstream UI.
 *
 * Three zones with draggable separators, themes, floating input button.
 * Engines: Hard (frame), Soft (thought partner), Medium (narrator).
 * Pure localStorage — no server, no database.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import SetupScreen from './components/SetupScreen'
import { SolidZone } from './components/xstream/SolidZone'
import { LiquidZone } from './components/xstream/LiquidZone'
import { VapourZone } from './components/xstream/VapourZone'
import { DraggableSeparator } from './components/DraggableSeparator'
import { ConstructionButton } from './components/xstream/ConstructionButton'
import { runHard, type Frame } from './engine/hard'
import { runSoft } from './engine/soft'
import { runMedium } from './engine/medium'
import { readBlock, writeBlock } from './lib/shelf'
import { KNOWLEDGE_TEMPLATE } from './blocks/agents'
import { downloadLog } from './lib/logger'
import { resetWorld } from './lib/world-seed'
import type { PscaleBlock } from './lib/bsp'
import type { SolidBlock, LiquidCard } from './types/xstream'
import type { SoftLLMResponse } from './types'
import './App.css'

type AppPhase = 'setup' | 'loading' | 'ready'
type Theme = 'dark' | 'light' | 'cyber' | 'soft'

const MIN_ZONE = 80
const HEADER_HEIGHT = 44

export default function App() {
  // Session
  const [phase, setPhase] = useState<AppPhase>('setup')
  const [apiKey, setApiKey] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [worldId, setWorldId] = useState('thornkeep')
  const [coordinates, setCoordinates] = useState('111')

  // Engine
  const frameRef = useRef<Frame | null>(null)
  const knowledgeRef = useRef<PscaleBlock | null>(null)

  // UI data
  const [solidBlocks, setSolidBlocks] = useState<SolidBlock[]>([])
  const [liquidCards, setLiquidCards] = useState<LiquidCard[]>([])
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  const [synthesising, setSynthesising] = useState(false)
  const [softLoading, setSoftLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [vaporText, setVaporText] = useState('')

  // Theme
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem('xstream-theme') as Theme) || 'dark'
  )

  // Zone heights (proportional)
  const [solidHeight, setSolidHeight] = useState(() => window.innerHeight * 0.35)
  const [liquidHeight, setLiquidHeight] = useState(() => window.innerHeight * 0.30)

  useEffect(() => {
    localStorage.setItem('xstream-theme', theme)
  }, [theme])

  // --- Draggable separator handlers ---
  const handleTopDrag = useCallback((delta: number) => {
    setSolidHeight(h => Math.max(MIN_ZONE, h + delta))
    setLiquidHeight(h => Math.max(MIN_ZONE, h - delta))
  }, [])

  const handleBottomDrag = useCallback((delta: number) => {
    setLiquidHeight(h => Math.max(MIN_ZONE, h + delta))
  }, [])

  // --- Entry ---
  const handleEnter = useCallback(async (key: string, name: string, world: string) => {
    setApiKey(key)
    setCharacterName(name)
    setWorldId(world)
    setPhase('loading')
    setStatusMessage('Building your view of the world...')

    try {
      let knowledge = await readBlock(`${name.toLowerCase()}:knowledge`)
      if (!knowledge) {
        knowledge = JSON.parse(JSON.stringify(KNOWLEDGE_TEMPLATE))
        await writeBlock(`${name.toLowerCase()}:knowledge`, knowledge)
      }
      knowledgeRef.current = knowledge

      // Register character
      const characters = await readBlock(`${world}:characters`)
      if (characters) {
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

      const result = await runHard(key, name, '111', world, 'player', 'entry', knowledge)
      frameRef.current = result.frame

      if (result.knowledgeUpdates.length > 0) {
        await applyKnowledgeUpdates(result.knowledgeUpdates, name)
      }

      setStatusMessage('')
      setPhase('ready')
    } catch (err: any) {
      setStatusMessage(`Error: ${err.message}`)
      setPhase('setup')
    }
  }, [])

  // --- ASK (Soft) ---
  const handleQuery = useCallback(async (text: string) => {
    if (!frameRef.current || !text.trim()) return
    setSoftLoading(true)
    setSoftResponse(null)

    try {
      const result = await runSoft(
        apiKey, text, frameRef.current,
        knowledgeRef.current, solidBlocks[solidBlocks.length - 1]?.content ?? '', 'player'
      )
      setSoftResponse({
        id: Date.now().toString(),
        originalInput: text,
        text: result.text,
        softType: 'refine',
        face: 'character',
        frameId: null,
      })
    } catch (err: any) {
      setSoftResponse({
        id: Date.now().toString(),
        originalInput: text,
        text: `Error: ${err.message}`,
        softType: 'info',
        face: 'character',
        frameId: null,
      })
    } finally {
      setSoftLoading(false)
    }
  }, [apiKey, solidBlocks])

  // --- SUBMIT to Liquid ---
  const handleSubmit = useCallback((text: string) => {
    if (!text.trim()) return
    const card: LiquidCard = {
      id: Date.now().toString(),
      userId: 'self',
      userName: characterName,
      content: text,
      timestamp: Date.now(),
    }
    setLiquidCards(prev => [...prev, card])
  }, [characterName])

  // --- COMMIT (Medium) ---
  const handleCommit = useCallback(async (cardId: string) => {
    const card = liquidCards.find(c => c.id === cardId)
    if (!card || !frameRef.current) return

    setSynthesising(true)
    setSoftResponse(null)

    try {
      const result = await runMedium(
        apiKey, card.content, frameRef.current,
        knowledgeRef.current, worldId, characterName, 'player'
      )

      // Add to solid
      setSolidBlocks(prev => [...prev, {
        id: Date.now().toString(),
        content: result.solid,
        timestamp: Date.now(),
      }])

      // Remove committed card from liquid
      setLiquidCards(prev => prev.filter(c => c.id !== cardId))

      // Write event
      if (result.eventEntry) {
        const events = await readBlock(`${worldId}:events`)
        if (events) {
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

      // Knowledge updates
      if (result.knowledgeUpdates.length > 0) {
        await applyKnowledgeUpdates(result.knowledgeUpdates, characterName)
      }

      // Location change
      if (result.locationChange) {
        setCoordinates(result.locationChange)
        const hardResult = await runHard(
          apiKey, characterName, result.locationChange, worldId, 'player', 'location-change', knowledgeRef.current
        )
        frameRef.current = hardResult.frame
        if (hardResult.knowledgeUpdates.length > 0) {
          await applyKnowledgeUpdates(hardResult.knowledgeUpdates, characterName)
        }
      }

      setSynthesising(false)
    } catch (err: any) {
      setSoftResponse({
        id: Date.now().toString(),
        originalInput: card.content,
        text: `Synthesis error: ${err.message}`,
        softType: 'info',
        face: 'character',
        frameId: null,
      })
      setSynthesising(false)
    }
  }, [apiKey, worldId, characterName, liquidCards])

  // --- Copy liquid card text back to vapor input ---
  const handleCopyToVapor = useCallback((text: string) => {
    setVaporText(text)
  }, [])

  // --- Knowledge helper ---
  async function applyKnowledgeUpdates(updates: string[], name: string) {
    if (!knowledgeRef.current) return
    const knowledge = knowledgeRef.current

    for (const update of updates) {
      const lower = update.toLowerCase()
      let categoryKey = '3'
      if (lower.includes('person') || lower.includes('woman') || lower.includes('man') || lower.includes('name')) {
        categoryKey = '1'
      } else if (lower.includes('place') || lower.includes('room') || lower.includes('building')) {
        categoryKey = '2'
      } else if (lower.includes('rumour') || lower.includes('heard') || lower.includes('apparently')) {
        categoryKey = '4'
      }

      const category = knowledge[categoryKey]
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
    await writeBlock(`${name.toLowerCase()}:knowledge`, knowledge)
  }

  // --- Reset ---
  const handleReset = useCallback(() => {
    resetWorld()
    setPhase('setup')
    setSolidBlocks([])
    setLiquidCards([])
    setSoftResponse(null)
    setVaporText('')
    setStatusMessage('')
  }, [])

  // --- Render ---
  if (phase === 'setup') {
    return <SetupScreen onEnter={handleEnter} />
  }

  if (phase === 'loading') {
    return (
      <div className="app" data-theme={theme}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-sm text-muted-foreground animate-pulse">{statusMessage || 'Loading...'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app" data-theme={theme} data-face="character">
      {/* Minimal header */}
      <div className="flex items-center gap-3 px-4 h-[44px] border-b border-border/50 text-sm shrink-0">
        <span className="text-face-accent font-medium">{characterName}</span>
        <span className="text-muted-foreground text-xs font-mono">{coordinates}</span>
        <div className="flex-1" />
        <button onClick={() => downloadLog()} className="text-muted-foreground hover:text-foreground text-xs" title="Download log">📋</button>
        <button onClick={handleReset} className="text-muted-foreground hover:text-foreground text-xs" title="Reset world">🔄</button>
      </div>

      {statusMessage && (
        <div className="px-4 py-2 text-xs text-face-accent bg-accent/10">{statusMessage}</div>
      )}

      {/* Three zones with draggable separators */}
      <SolidZone blocks={solidBlocks} height={solidHeight} />
      <DraggableSeparator position="top" onDrag={handleTopDrag} />
      <LiquidZone
        cards={liquidCards}
        height={liquidHeight}
        currentUserId="self"
        isLoading={synthesising}
        onCommit={handleCommit}
        onCopyToVapor={handleCopyToVapor}
      />
      <DraggableSeparator position="bottom" onDrag={handleBottomDrag} />
      <VapourZone
        entries={[]}
        softResponse={softResponse}
        onDismissSoftResponse={() => setSoftResponse(null)}
      />

      {/* Floating construction button — input lives here */}
      <ConstructionButton
        onThemeChange={setTheme}
        onLogout={handleReset}
        currentTheme={theme}
        onQuery={handleQuery}
        onSubmit={handleSubmit}
        value={vaporText}
        onChange={setVaporText}
        isQuerying={softLoading}
        placeholder="What do you do?"
      />
    </div>
  )
}
