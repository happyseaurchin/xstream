// App.tsx - Main app with vapor-flow UI wired to xstream hooks
import { useState, useCallback, useEffect, useMemo } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFrameChannel, getDisplayName } from './hooks/useFrameChannel'
import { useLiquidSubscription } from './hooks/useLiquidSubscription'
import { useSolidSubscription } from './hooks/useSolidSubscription'
import { AuthPage } from './components'
import { XStreamColumn } from './components/xstream/XStreamColumn'
import { ConstructionButton } from './components/xstream/ConstructionButton'
import { buildColumn } from './utils/adapters'
import type { Face, Theme, Layout } from './types/vapor-flow-ui'
import './index.css'

const THEME_KEY = 'xstream-theme'
const FRAME_ID = 'bbbbbbbb-0000-0000-0000-000000000001' // test-frame

interface ColumnState {
  id: string
  face: Face
  background?: string
}

function App() {
  const auth = useAuth()
  const userId = auth.user?.id ?? ''
  const userName = auth.profile?.displayName ?? getDisplayName()
  
  // UI state
  const [columns, setColumns] = useState<ColumnState[]>([
    { id: 'col-1', face: 'character' }
  ])
  const [theme, setTheme] = useState<Theme>(() => 
    (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
  )
  const [showVapourOthers, setShowVapourOthers] = useState(true)
  const [showDirectory, setShowDirectory] = useState(true)
  const [vaporText, setVaporText] = useState('')
  
  // Derive layout from column count
  const layout: Layout = useMemo(() => {
    if (columns.length === 1) return 'single'
    if (columns.length === 2) return 'double'
    if (columns.length === 3) return 'triple'
    return 'auto'
  }, [columns.length])
  
  // Use first column's face for hooks (shared subscription)
  const primaryFace = columns[0]?.face ?? 'character'
  
  // Hooks - only active when authenticated
  const { presentUsers, othersVapor, broadcastVapor, isConnected } = useFrameChannel({
    frameId: FRAME_ID,
    userId,
    userName,
    face: primaryFace,
  })
  
  const { liquidEntries, upsertLiquid } = useLiquidSubscription({
    frameId: FRAME_ID,
    userId,
  })
  
  const { solidEntries } = useSolidSubscription({
    frameId: FRAME_ID,
  })

  // Save theme
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Broadcast vapor when typing
  useEffect(() => {
    broadcastVapor(vaporText)
  }, [vaporText, broadcastVapor])

  // Handlers
  const handleFaceChange = useCallback((columnId: string, newFace: Face) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, face: newFace } : col
    ))
  }, [])

  const handleVapourSubmit = useCallback(async (columnId: string, text: string) => {
    if (!text.trim()) return
    
    const col = columns.find(c => c.id === columnId)
    if (!col) return
    
    await upsertLiquid({
      userName,
      face: col.face,
      content: text,
    })
    
    setVaporText('')
  }, [upsertLiquid, userName, columns])

  const handleBackgroundChange = useCallback((columnId: string, bg: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, background: bg || undefined } : col
    ))
  }, [])

  const handleLogout = useCallback(() => {
    auth.signOut()
  }, [auth])

  const handleAddColumn = useCallback(() => {
    if (columns.length >= 3) return // Max 3 columns
    
    const faces: Face[] = ['character', 'author', 'designer']
    const newFace = faces[columns.length % 3]
    const newId = `col-${Date.now()}`
    
    setColumns(prev => [...prev, { id: newId, face: newFace }])
  }, [columns.length])

  // Loading state
  if (auth.isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    )
  }

  // Auth page
  if (!auth.user) {
    return <AuthPage auth={auth} />
  }

  return (
    <div
      className="app h-screen w-full overflow-hidden"
      data-theme={theme}
      data-layout={layout}
      data-show-presence="true"
      data-show-vapour-others={showVapourOthers}
      data-show-directory={showDirectory}
    >
      {/* Connection indicator */}
      {!isConnected && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-destructive/90 text-destructive-foreground text-xs rounded-full">
          Reconnecting...
        </div>
      )}
      
      {/* Columns container */}
      <div className="columns-container h-full grid">
        {columns.map(col => (
          <XStreamColumn
            key={col.id}
            column={buildColumn({
              id: col.id,
              face: col.face,
              frameId: FRAME_ID,
              frameName: 'test-frame',
              characterName: col.face === 'character' ? userName : undefined,
              solidEntries,
              liquidEntries,
              othersVapor,
              selfVaporText: vaporText,
              currentUserId: userId,
              currentUserName: userName,
              stateCode: 'X0Y0Z0',
              background: col.background,
            })}
            presenceCount={presentUsers.length}
            showVapourOthers={showVapourOthers}
            showDirectory={showDirectory}
            onFaceChange={handleFaceChange}
            onVapourSubmit={handleVapourSubmit}
            onShowVapourOthersChange={setShowVapourOthers}
            onShowDirectoryChange={setShowDirectory}
            onBackgroundChange={handleBackgroundChange}
          />
        ))}
      </div>

      {/* Floating construction button */}
      <ConstructionButton
        onAddColumn={handleAddColumn}
        onThemeChange={setTheme}
        onLogout={handleLogout}
        currentTheme={theme}
      />
    </div>
  )
}

export default App
