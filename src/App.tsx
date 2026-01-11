import { useState } from 'react'
import { VapourZone } from '@/components/VapourZone'
import { LiquidZone } from '@/components/LiquidZone'
import { SolidZone } from '@/components/SolidZone'
import type { VapourEntry, LiquidCard, SolidBlock, SoftLLMResponse, Face } from '@/types'

// Demo data
const DEMO_VAPOUR: VapourEntry[] = []
const DEMO_LIQUID: LiquidCard[] = []
const DEMO_SOLID: SolidBlock[] = []

export default function App() {
  const [face] = useState<Face>('character')
  const [vapourEntries] = useState<VapourEntry[]>(DEMO_VAPOUR)
  const [liquidCards, setLiquidCards] = useState<LiquidCard[]>(DEMO_LIQUID)
  const [solidBlocks, setSolidBlocks] = useState<SolidBlock[]>(DEMO_SOLID)
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  const [isQuerying, setIsQuerying] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)

  const currentUserId = 'self'

  // Handlers - these will be wired to Supabase later
  const handleQuery = async (text: string) => {
    setIsQuerying(true)
    // TODO: Call soft-LLM
    setTimeout(() => {
      setSoftResponse({
        id: Date.now().toString(),
        originalInput: text,
        text: `This is a demo response to: "${text}"`,
        softType: 'info',
        face,
      })
      setIsQuerying(false)
    }, 500)
  }

  const handleSubmit = (text: string) => {
    const newCard: LiquidCard = {
      id: Date.now().toString(),
      userId: currentUserId,
      userName: 'You',
      content: text,
      timestamp: Date.now(),
    }
    setLiquidCards(prev => [newCard, ...prev])
    setSoftResponse(null)
  }

  const handleCommit = async (cardId: string) => {
    setIsCommitting(true)
    const card = liquidCards.find(c => c.id === cardId)
    if (card) {
      // TODO: Call medium-LLM for synthesis
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
    // This would set the vapor input value
    console.log('Copy to vapor:', text)
  }

  const handleDismissSoftResponse = () => {
    setSoftResponse(null)
  }

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      data-theme="dark"
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

        {/* Vapour Zone */}
        <VapourZone
          entries={vapourEntries}
          onQuery={handleQuery}
          onSubmit={handleSubmit}
          softResponse={softResponse}
          onDismissSoftResponse={handleDismissSoftResponse}
          isQuerying={isQuerying}
        />
      </main>
    </div>
  )
}
