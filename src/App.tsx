// App.tsx - Main app with vapor-flow UI wired to xstream hooks
import { useState, useCallback, useEffect } from 'react'
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

function App() {
  const auth = useAuth()
  const userId = auth.user?.id ?? ''
  const userName = auth.profile?.displayName ?? getDisplayName()
  
  // UI state
  const [face, setFace] = useState<Face>('character')
  const [theme, setTheme] = useState<Theme>(() => 
    (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
  )
  const [layout] = useState<Layout>('single')
  const [showVapourOthers, setShowVapourOthers] = useState(true)
  const [showDirectory, setShowDirectory] = useState(true)
  const [vaporText, setVaporText] = useState('')
  const [columnBackground, setColumnBackground] = useState<string>()
  
  // Hooks - only active when authenticated
  const { presentUsers, othersVapor, broadcastVapor, isConnected } = useFrameChannel({
    frameId: FRAME_ID,
    userId,
    userName,
    face,
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

  // Build column data using adapters
  const column = buildColumn({
    id: 'col-1',
    face,
    frameId: FRAME_ID,
    frameName: 'test-frame',
    characterName: face === 'character' ? userName : undefined,
    solidEntries,
    liquidEntries,
    othersVapor,
    selfVaporText: vaporText,
    currentUserId: userId,
    currentUserName: userName,
    stateCode: 'X0Y0Z0',
    background: columnBackground,
  })

  // Handlers
  const handleFaceChange = useCallback((_columnId: string, newFace: Face) => {
    setFace(newFace)
  }, [])

  const handleVapourSubmit = useCallback(async (_columnId: string, text: string) => {
    if (!text.trim()) return
    
    // Submit to liquid
    await upsertLiquid({
      userName,
      face,
      content: text,
    })
    
    // Clear vapor
    setVaporText('')
  }, [upsertLiquid, userName, face])

  const handleBackgroundChange = useCallback((_columnId: string, bg: string) => {
    setColumnBackground(bg || undefined)
  }, [])

  const handleLogout = useCallback(() => {
    auth.signOut()
  }, [auth])

  const handleAddColumn = useCallback(() => {
    // For now, single column - could expand later
    console.log('Add column requested')
  }, [])

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
        <XStreamColumn
          column={column}
          presenceCount={presentUsers.length}
          showVapourOthers={showVapourOthers}
          showDirectory={showDirectory}
          onFaceChange={handleFaceChange}
          onVapourSubmit={handleVapourSubmit}
          onShowVapourOthersChange={setShowVapourOthers}
          onShowDirectoryChange={setShowDirectory}
          onBackgroundChange={handleBackgroundChange}
        />
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
