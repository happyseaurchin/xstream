/**
 * App.tsx - Main orchestrator for xstream fresh-build
 *
 * PLEX 1 NOTE:
 * This demo wiring shows the UI working. For plex 1, replace with:
 * - Supabase realtime subscriptions for content at coordinates
 * - Edge functions for soft/medium/hard LLM calls
 * - Coordinate-based queries instead of type-based state
 */

import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { AuthPage } from './components/AuthPage'
import { VapourZone } from './components/VapourZone'
import { LiquidZone } from './components/LiquidZone'
import { SolidZone } from './components/SolidZone'
import { ZoneSeparator } from './components/ZoneSeparator'
import { ConstructionButton } from './components/ConstructionButton'
import type { VapourEntry, LiquidCard, SolidBlock, SoftLLMResponse, Theme } from './types'

export default function App() {
  const auth = useAuth()
  const [theme, setTheme] = useState<Theme>('light')
  const [vapourEntries] = useState<VapourEntry[]>([])
  const [liquidCards, setLiquidCards] = useState<LiquidCard[]>([])
  const [solidBlocks, setSolidBlocks] = useState<SolidBlock[]>([])
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  const [isQuerying, setIsQuerying] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [inputValue, setInputValue] = useState('')

  // Zone heights
  const [solidHeight, setSolidHeight] = useState(180)
  const [liquidHeight, setLiquidHeight] = useState(200)

  const handleSolidSeparatorDrag = useCallback((delta: number) => {
    setSolidHeight((h) => Math.max(80, Math.min(400, h + delta)))
    setLiquidHeight((h) => Math.max(100, h - delta))
  }, [])

  const handleLiquidSeparatorDrag = useCallback((delta: number) => {
    setLiquidHeight((h) => Math.max(100, Math.min(500, h + delta)))
  }, [])

  const currentUserId = auth.user?.id || 'self'

  // Query handler - calls soft-LLM
  const handleQuery = async (text: string) => {
    setIsQuerying(true)
    // TODO: Call soft-LLM edge function
    setTimeout(() => {
      setSoftResponse({
        id: Date.now().toString(),
        originalInput: text,
        text: `Demo response to: "${text}"`,
        softType: 'info',
        face: 'character',
      })
      setIsQuerying(false)
    }, 500)
  }

  // Submit handler - adds to liquid
  const handleSubmit = (text: string) => {
    const newCard: LiquidCard = {
      id: Date.now().toString(),
      userId: currentUserId,
      userName: auth.profile?.displayName || 'You',
      content: text,
      timestamp: Date.now(),
    }
    setLiquidCards(prev => [newCard, ...prev])
    setSoftResponse(null)
    setInputValue('')
  }

  // Commit handler - moves liquid to solid
  const handleCommit = async (cardId: string) => {
    setIsCommitting(true)
    const card = liquidCards.find(c => c.id === cardId)
    if (card) {
      // TODO: Call medium-LLM edge function for synthesis
      setTimeout(() => {
        const newBlock: SolidBlock = {
          id: Date.now().toString(),
          content: card.content,
          timestamp: Date.now(),
        }
        setSolidBlocks(prev => [newBlock, ...prev])
        setLiquidCards(prev => prev.filter(c => c.id !== cardId))
        setIsCommitting(false)
      }, 500)
    }
  }

  const handleCopyToVapor = (text: string) => {
    setInputValue(text)
  }

  const handleDismissSoftResponse = () => {
    setSoftResponse(null)
  }

  const handleLogout = () => {
    auth.signOut()
  }

  // Show loading state
  if (auth.isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-foreground" data-theme={theme}>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // Show auth page if not logged in
  if (!auth.user) {
    return (
      <div data-theme={theme}>
        <AuthPage auth={auth} />
      </div>
    )
  }

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden bg-background text-foreground"
      data-theme={theme}
    >
      {/* Simple header */}
      <header className="shrink-0 h-10 border-b border-border/50 flex items-center px-4 bg-card/30">
        <h1 className="text-sm font-medium text-foreground/80">xstream</h1>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {auth.profile?.displayName || auth.user.email}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content - three zones */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Solid Zone */}
        <div style={{ height: solidHeight, minHeight: 80 }}>
          <SolidZone blocks={solidBlocks} />
        </div>

        {/* Draggable Separator */}
        <ZoneSeparator onDrag={handleSolidSeparatorDrag} />

        {/* Liquid Zone */}
        <div style={{ height: liquidHeight, minHeight: 100 }}>
          <LiquidZone
            cards={liquidCards}
            currentUserId={currentUserId}
            isLoading={isCommitting}
            onCommit={handleCommit}
            onCopyToVapor={handleCopyToVapor}
          />
        </div>

        {/* Draggable Separator */}
        <ZoneSeparator onDrag={handleLiquidSeparatorDrag} />

        {/* Vapour Zone - fills remaining space */}
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
