/**
 * App.block-agents.tsx — xstream-real: real-world coordination interface.
 *
 * Three zones with draggable separators, themes, floating input.
 * Engines: Hard (frame), Soft (thought partner), Medium (synthesis).
 * Pure localStorage — no server, no database.
 * The real world is the world — LLM knowledge provides content.
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

export default function App() {
  // Session
  const [phase, setPhase] = useState<AppPhase>('setup')
  const [apiKey, setApiKey] = useState('')
  const [userName, setUserName] = useState('')
  const [worldId, setWorldId] = useState('real')
  const [coordinates, setCoordinates] = useState('111')
  const userContextRef = useRef<string>('')

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
  const handleEnter = useCallback(async (key: string, name: string, world: string, context: string) => {
    setApiKey(key)
    setUserName(name)
    setWorldId(world)
    userContextRef.current = context
    setPhase('loading')
    setStatusMessage('Building your context...')

    try {
      // Init knowledge block
      let knowledge = await readBlock(`${name.toLowerCase()}:knowledge`)
      if (!knowledge) {
        knowledge = JSON.parse(JSON.stringify(KNOWLEDGE_TEMPLATE))
        // Seed with user context if provided
        if (context) {
          const k = knowledge as any
          if (k['6'] && typeof k['6'] === 'object') {
            k['6']['1'] = context
          }
        }
        await writeBlock(`${name.toLowerCase()}:knowledge`, knowledge)
      }
      knowledgeRef.current = knowledge

      // Register user in characters block
      const characters = await readBlock(`${world}:characters`)
      if (characters) {
        for (let d = 1; d <= 9; d++) {
          const k = String(d)
          if (!(k in characters)) {
            characters[k] = {
              _: `${name}. A real person. Just arrived.`,
              '1': `Location: unresolved`,
              '2': `Focus: ${context || 'not yet specified'}`,
              '3': `State: just entered xstream.`,
            }
            await writeBlock(`${world}:characters`, characters)
            break
          }
        }
      }

      // Run Hard to build initial frame
      const result = await runHard(
        key, name, '111', world, 'player', 'entry',
        knowledge, context
      )
      frameRef.current = result.frame

      if (result.knowledgeUpdates.length > 0) {
        await applyKnowledgeUpdates(result.knowledgeUpdates, name)
      }

      setStatusMessage('')
      setPhase('ready')
    } catch (err: any) {
      console.error('❌ [ENTER] Failed:', err)
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
      userName: userName,
      content: text,
      timestamp: Date.now(),
    }
    setLiquidCards(prev => [...prev, card])
  }, [userName])

  // --- COMMIT (Medium) ---
  const handleCommit = useCallback(async (cardId: string) => {
    const card = liquidCards.find(c => c.id === cardId)
    if (!card || !frameRef.current) return

    setSynthesising(true)
    setSoftResponse(null)

    try {
      const result = await runMedium(
        apiKey, card.content, frameRef.current,
        knowledgeRef.current, worldId, userName, 'player'
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
          for (let d = 1; d <= 9; d++) {
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
        await applyKnowledgeUpdates(result.knowledgeUpdates, userName)
      }

      // Context shift — refresh Hard frame
      if (result.locationChange) {
        setCoordinates(result.locationChange)
      }

      // Always refresh frame after a commit
      const hardResult = await runHard(
        apiKey, userName, coordinates, worldId, 'player', 'context-shift',
        knowledgeRef.current, userContextRef.current
      )
      frameRef.current = hardResult.frame
      if (hardResult.knowledgeUpdates.length > 0) {
        await applyKnowledgeUpdates(hardResult.knowledgeUpdates, userName)
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
  }, [apiKey, worldId, userName, coordinates, liquidCards])

  // --- Copy liquid card text back to vapor input ---
  const handleCopyToVapor = useCallback((text: string) => {
    setVaporText(text)
  }, [])

  // --- Knowledge helper ---
  async function applyKnowledgeUpdates(updates: any[], name: string) {
    if (!knowledgeRef.current) return
    const knowledge = knowledgeRef.current

    for (const raw of updates) {
      const update = typeof raw === 'string' ? raw : (raw?.update ?? raw?.description ?? String(raw))
      const categoryHint = typeof raw === 'object' ? (raw?.category ?? '').toLowerCase() : ''

      let categoryKey = '3' // default: Events
      if (categoryHint.includes('people') || categoryHint.includes('person')) {
        categoryKey = '1'
      } else if (categoryHint.includes('topic')) {
        categoryKey = '2'
      } else if (categoryHint.includes('event')) {
        categoryKey = '3'
      } else if (categoryHint.includes('connection')) {
        categoryKey = '4'
      } else if (categoryHint.includes('output')) {
        categoryKey = '5'
      } else if (categoryHint.includes('context')) {
        categoryKey = '6'
      } else {
        const lower = update.toLowerCase()
        if (lower.includes('person') || lower.includes('user') || lower.includes('name')) {
          categoryKey = '1'
        } else if (lower.includes('topic') || lower.includes('about') || lower.includes('field')) {
          categoryKey = '2'
        } else if (lower.includes('connect') || lower.includes('link') || lower.includes('relate')) {
          categoryKey = '4'
        }
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
        <span className="text-face-accent font-medium">{userName}</span>
        <span className="text-muted-foreground text-xs">real</span>
        <div className="flex-1" />
        <button onClick={() => downloadLog()} className="text-muted-foreground hover:text-foreground text-xs" title="Download log">📋</button>
        <button onClick={handleReset} className="text-muted-foreground hover:text-foreground text-xs" title="Reset">🔄</button>
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
        placeholder="What are you thinking?"
      />
    </div>
  )
}
