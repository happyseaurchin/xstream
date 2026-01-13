/**
 * App.tsx - Main orchestrator for xstream plex 1
 *
 * Uses coordinate-based content system:
 * - useContent hook for real-time subscriptions
 * - Content at t/s/i coordinates with shelf states
 * - Skills loaded from 0.x coordinates
 */

import { useState, useMemo } from 'react'
import { VapourZone } from './components/VapourZone'
import { LiquidZone } from './components/LiquidZone'
import { SolidZone } from './components/SolidZone'
import { ConstructionButton } from './components/ConstructionButton'
import { useAuth } from './hooks/useAuth'
import { useContent } from './hooks/useContent'
import type { VapourEntry, LiquidCard, SolidBlock, SoftLLMResponse, Face, Theme } from './types'

// Entry point coordinates (the tavern)
const ENTRY_COORDINATES = { t: '1.', s: '1.', i: '1.' }

export default function App() {
  const { user, signOut } = useAuth()
  const [face] = useState<Face>('character')
  const [theme, setTheme] = useState<Theme>('dark')
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  const [isQuerying, setIsQuerying] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Player coordinates - for now, everyone starts at the tavern
  const [coordinates] = useState(ENTRY_COORDINATES)

  // Real-time content at these coordinates
  const { content, insert, updateShelf } = useContent({
    coordinates,
    shelves: ['vapor', 'liquid', 'solid'],
    userId: user?.id
  })

  // Transform content to UI types (bridge to existing components)
  const vapourEntries = useMemo<VapourEntry[]>(() =>
    content
      .filter(c => c.shelf === 'vapor')
      .map(c => ({
        id: c.id,
        text: c.text,
        userId: c.created_by || 'unknown',
        userName: c.isSelf ? 'You' : 'Other',
        isSelf: c.isSelf || false,
        timestamp: new Date(c.created_at).getTime()
      }))
  , [content])

  const liquidCards = useMemo<LiquidCard[]>(() =>
    content
      .filter(c => c.shelf === 'liquid')
      .map(c => ({
        id: c.id,
        userId: c.created_by || 'unknown',
        userName: c.isSelf ? 'You' : 'Other',
        content: c.text,
        timestamp: new Date(c.created_at).getTime()
      }))
  , [content])

  const solidBlocks = useMemo<SolidBlock[]>(() =>
    content
      .filter(c => c.shelf === 'solid' && !c.s.startsWith('0.'))  // Exclude skills
      .map(c => ({
        id: c.id,
        content: c.text,
        timestamp: new Date(c.created_at).getTime()
      }))
  , [content])

  const currentUserId = user?.id || 'anonymous'

  // Query soft-LLM (TODO: wire to edge function)
  const handleQuery = async (text: string) => {
    setIsQuerying(true)
    // TODO: Call soft-LLM edge function that loads skill from 0.31
    setTimeout(() => {
      setSoftResponse({
        id: Date.now().toString(),
        originalInput: text,
        text: `[Soft-LLM placeholder] Refining: "${text}"`,
        softType: 'refine',
        face,
      })
      setIsQuerying(false)
    }, 500)
  }

  // Submit to liquid - inserts content at coordinates
  const handleSubmit = async (text: string) => {
    setSoftResponse(null)
    setInputValue('')
    // Insert as liquid at current coordinates
    await insert(text, 'liquid')
  }

  // Commit liquid to solid (TODO: wire to medium-LLM)
  const handleCommit = async (cardId: string) => {
    setIsCommitting(true)
    // For now, just update shelf state
    // TODO: Call medium-LLM edge function that loads skill from 0.32
    await updateShelf(cardId, 'solid')
    setIsCommitting(false)
  }

  const handleCopyToVapor = (text: string) => {
    setInputValue(text)
  }

  const handleDismissSoftResponse = () => {
    setSoftResponse(null)
  }

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden bg-background text-foreground"
      data-theme={theme}
      data-face={face}
    >
      {/* Header */}
      <header className="shrink-0 h-12 border-b border-border flex items-center px-4">
        <h1 className="text-sm font-medium text-foreground/80">xstream</h1>
        <div className="ml-auto text-xs text-muted-foreground">
          fresh-build
        </div>
      </header>

      {/* Main content - three zones */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Solid Zone */}
        <SolidZone blocks={solidBlocks} />

        {/* Separator */}
        <div className="h-px bg-border/50" />

        {/* Liquid Zone */}
        <LiquidZone
          cards={liquidCards}
          currentUserId={currentUserId}
          isLoading={isCommitting}
          onCommit={handleCommit}
          onCopyToVapor={handleCopyToVapor}
        />

        {/* Separator */}
        <div className="h-px bg-border/50" />

        {/* Vapour Zone - display only, input via ConstructionButton */}
        <VapourZone
          entries={vapourEntries}
          softResponse={softResponse}
          onDismissSoftResponse={handleDismissSoftResponse}
        />
      </main>

      {/* Construction Button - floating input */}
      <ConstructionButton
        onThemeChange={setTheme}
        onLogout={handleLogout}
        currentTheme={theme}
        onQuery={handleQuery}
        onSubmit={handleSubmit}
        value={inputValue}
        onChange={setInputValue}
        isQuerying={isQuerying}
      />
    </div>
  )
}
