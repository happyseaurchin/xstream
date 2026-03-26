/**
 * App.block-agents.tsx — xstream UI powered by sovereign browser kernel.
 *
 * Three zones with draggable separators, themes, floating input button.
 * Engine: Kernel (polls relay, fires medium-LLM on commit/domino).
 * Soft-LLM (ASK) remains a direct call — no coordination needed.
 * Pure browser — no server runs LLM calls. All API costs are the player's.
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import SetupScreen from './components/SetupScreen'
import { SolidZone } from './components/xstream/SolidZone'
import { LiquidZone } from './components/xstream/LiquidZone'
import { VapourZone } from './components/xstream/VapourZone'
import { DraggableSeparator } from './components/DraggableSeparator'
import { ConstructionButton } from './components/xstream/ConstructionButton'
import { Kernel } from './kernel/kernel'
import { createBlock, generateGameCode } from './kernel/block-factory'
import { callClaude } from './kernel/claude-direct'
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
  const [characterName, setCharacterName] = useState('')
  const [gameCode, setGameCode] = useState('')

  // Kernel
  const kernelRef = useRef<Kernel | null>(null)

  // UI data
  const [solidBlocks, setSolidBlocks] = useState<SolidBlock[]>([])
  const [liquidCards, setLiquidCards] = useState<LiquidCard[]>([])
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  const [synthesising, setSynthesising] = useState(false)
  const [softLoading, setSoftLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [vaporText, setVaporText] = useState('')
  const [kernelStatus, setKernelStatus] = useState('idle')
  const [kernelLogs, setKernelLogs] = useState<string[]>([])
  const [accumulatedCount, setAccumulatedCount] = useState(0)
  const [dominoMode, setDominoMode] = useState<'auto' | 'informed' | 'silent'>('auto')

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

  // Cleanup kernel on unmount
  useEffect(() => {
    return () => { kernelRef.current?.stop() }
  }, [])

  // --- Draggable separator handlers ---
  const handleTopDrag = useCallback((delta: number) => {
    setSolidHeight(h => Math.max(MIN_ZONE, h + delta))
    setLiquidHeight(h => Math.max(MIN_ZONE, h - delta))
  }, [])

  const handleBottomDrag = useCallback((delta: number) => {
    setLiquidHeight(h => Math.max(MIN_ZONE, h + delta))
  }, [])

  // --- Kernel callbacks ---
  const makeKernelCallbacks = useCallback(() => ({
    onSolid: (solid: string) => {
      if (!solid) return
      setSolidBlocks(prev => [...prev, {
        id: Date.now().toString(),
        content: solid,
        timestamp: Date.now(),
      }])
      setSynthesising(false)
    },
    onStatusChange: (status: string) => {
      setKernelStatus(status)
      setSynthesising(status === 'resolving' || status === 'domino_responding')
    },
    onAccumulate: (_source: string, count: number) => {
      setAccumulatedCount(prev => prev + count)
    },
    onDomino: (source: string, context: string) => {
      setKernelLogs(prev => [...prev.slice(-50), `💥 Domino from ${source}: ${context.slice(0, 80)}`])
    },
    onError: (error: string) => {
      console.error('[kernel]', error)
      setKernelLogs(prev => [...prev.slice(-50), `❌ ${error}`])
      setSynthesising(false)
    },
    onLog: (msg: string) => {
      console.log('[kernel]', msg)
      setKernelLogs(prev => [...prev.slice(-50), msg])
    },
  }), [])

  // --- Create Game ---
  const handleCreateGame = useCallback((key: string, name: string, state: string, scene: string) => {
    setApiKey(key)
    setCharacterName(name)
    setPhase('loading')
    setStatusMessage('Creating game...')

    const code = generateGameCode()
    setGameCode(code)

    const charId = name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const block = createBlock(charId, name, state || `${name}. A newcomer.`, scene, key)

    const kernel = new Kernel(block, code, makeKernelCallbacks())
    kernelRef.current = kernel
    kernel.start()

    setStatusMessage('')
    setPhase('ready')
  }, [makeKernelCallbacks])

  // --- Join Game ---
  const handleJoinGame = useCallback(async (key: string, name: string, state: string, code: string) => {
    setApiKey(key)
    setCharacterName(name)
    setGameCode(code)
    setPhase('loading')
    setStatusMessage('Joining game...')

    try {
      // Fetch existing game to get the scene
      const res = await fetch(`/api/relay/${code}?exclude=_nobody_`)
      let scene = ''
      if (res.ok) {
        const blocks = await res.json()
        if (blocks.length > 0) {
          scene = blocks[0].scene || ''
        }
      }

      const charId = name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const block = createBlock(charId, name, state || `${name}. A newcomer.`, scene, key)

      const kernel = new Kernel(block, code, makeKernelCallbacks())
      kernelRef.current = kernel
      kernel.start()

      setStatusMessage('')
      setPhase('ready')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to join'
      setStatusMessage(`Error: ${msg}`)
      setPhase('setup')
    }
  }, [makeKernelCallbacks])

  // --- ASK (Soft — direct call, no kernel needed) ---
  const handleQuery = useCallback(async (text: string) => {
    if (!text.trim() || !kernelRef.current) return
    setSoftLoading(true)
    setSoftResponse(null)

    try {
      const block = kernelRef.current.block
      const recentSolid = block.character.solid_history.slice(-1)[0] || ''
      const scene = block.scene || ''

      const prompt = `You are a thinking partner for ${characterName} in this scene:
${scene}

Recent narrative: ${recentSolid}

The player is thinking: "${text}"

Help them think. Be vivid and brief (1-3 sentences). Don't narrate — suggest, provoke, or clarify. Second person present tense.`

      const response = await callClaude(apiKey, 'claude-haiku-4-5-20251001', prompt, 256)

      setSoftResponse({
        id: Date.now().toString(),
        originalInput: text,
        text: response,
        softType: 'refine',
        face: 'character',
        frameId: null,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Soft call failed'
      setSoftResponse({
        id: Date.now().toString(),
        originalInput: text,
        text: `Error: ${msg}`,
        softType: 'info',
        face: 'character',
        frameId: null,
      })
    } finally {
      setSoftLoading(false)
    }
  }, [apiKey, characterName])

  // --- SUBMIT to Liquid ---
  const handleSubmit = useCallback((text: string) => {
    if (!text.trim() || !kernelRef.current) return
    const card: LiquidCard = {
      id: Date.now().toString(),
      userId: 'self',
      userName: characterName,
      content: text,
      timestamp: Date.now(),
    }
    setLiquidCards(prev => [...prev, card])
    // Also set as pending liquid in kernel
    kernelRef.current.submitLiquid(text)
  }, [characterName])

  // --- COMMIT (fires kernel, which fires medium on next cycle) ---
  const handleCommit = useCallback((_cardId: string) => {
    if (!kernelRef.current) return
    setSynthesising(true)
    kernelRef.current.commit()
    // Clear liquid cards — kernel will handle the rest
    setLiquidCards([])
  }, [])

  // --- Copy liquid card text back to vapor input ---
  const handleCopyToVapor = useCallback((text: string) => {
    setVaporText(text)
  }, [])

  // --- Domino mode toggle ---
  const handleDominoModeToggle = useCallback(() => {
    const modes: Array<'auto' | 'informed' | 'silent'> = ['auto', 'informed', 'silent']
    const next = modes[(modes.indexOf(dominoMode) + 1) % modes.length]
    setDominoMode(next)
    if (kernelRef.current) {
      kernelRef.current.block.trigger.domino_mode = next
    }
  }, [dominoMode])

  // --- Reset ---
  const handleReset = useCallback(() => {
    kernelRef.current?.stop()
    kernelRef.current = null
    setPhase('setup')
    setSolidBlocks([])
    setLiquidCards([])
    setSoftResponse(null)
    setVaporText('')
    setStatusMessage('')
    setKernelLogs([])
    setAccumulatedCount(0)
    setKernelStatus('idle')
  }, [])

  // --- Render ---
  if (phase === 'setup') {
    return <SetupScreen onCreateGame={handleCreateGame} onJoinGame={handleJoinGame} />
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
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-[44px] border-b border-border/50 text-sm shrink-0">
        <span className="text-face-accent font-medium">{characterName}</span>
        <span className="text-muted-foreground text-xs font-mono"
              style={{ cursor: 'pointer' }}
              title="Click to copy game code"
              onClick={() => navigator.clipboard.writeText(gameCode)}>
          {gameCode}
        </span>
        <span className="text-xs" style={{ opacity: 0.5 }}>
          {kernelStatus === 'idle' ? '🟢' : kernelStatus === 'resolving' ? '🟡' : kernelStatus === 'domino_responding' ? '💥' : '⚪'}
        </span>
        <button
          onClick={handleDominoModeToggle}
          className="text-xs"
          style={{ opacity: 0.7, cursor: 'pointer', background: 'none', border: 'none', color: 'inherit', padding: '2px 4px' }}
          title={`Domino mode: ${dominoMode}. Click to cycle.`}
        >
          {dominoMode === 'auto' ? '🔄auto' : dominoMode === 'informed' ? '👁️watch' : '🔇silent'}
        </button>
        {accumulatedCount > 0 && (
          <span className="text-xs text-face-accent" title="Accumulated peer events">
            📥 {accumulatedCount}
          </span>
        )}
        <div className="flex-1" />
        <button onClick={() => {
          const text = solidBlocks.map(b => b.content).join('\n\n---\n\n')
          const blob = new Blob([`${characterName} — ${gameCode}\n${new Date().toLocaleString()}\n\n${text}`], { type: 'text/plain' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `${characterName.toLowerCase()}-${gameCode}.txt`
          a.click()
        }} className="text-muted-foreground hover:text-foreground text-xs" title="Download story">📜</button>
        <button onClick={handleReset} className="text-muted-foreground hover:text-foreground text-xs" title="Leave game">🚪</button>
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
