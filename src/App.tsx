import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFrameChannel, getDisplayName, setDisplayName } from './hooks/useFrameChannel'
import { useLiquidSubscription } from './hooks/useLiquidSubscription'
import { useSolidSubscription } from './hooks/useSolidSubscription'
import { useContentSubscription } from './hooks/useContentSubscription'
import {
  AuthPage,
  PresenceBar,
  DraggableSeparator,
} from './components'
// New zone components
import { SolidZone } from './components/xstream/SolidZone'
import { LiquidZone } from './components/xstream/LiquidZone'
import { VapourZone } from './components/xstream/VapourZone'
import { ConstructionButton } from './components/xstream/ConstructionButton'
import { ColumnHeader } from './components/xstream/ColumnHeader'
import { DirectoryDrawer } from './components/xstream/DirectoryDrawer'
import { FilterDrawer } from './components/xstream/FilterDrawer'
import { adaptSolidEntries, combineLiquidCards, adaptVaporContents } from './utils/adapters'
import type {
  Face,
  LLMMode,
  SolidView,
  SoftType,
  Frame,
  VisibilitySettings,
  FrameSkill,
  ShelfEntry,
  SoftLLMResponse,
  ZoneProportions,
} from './types'
import type { Theme } from './types/xstream'
import { parseInputTypography, parseArtifactFromText } from './utils/parsing'
import { supabase } from './lib/supabase'
import './App.css'

// Config - use shared supabase client from lib/supabase to avoid multiple GoTrueClient instances
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const GENERATE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/generate-v2` : null
const EDIT_DEBOUNCE_MS = 500

// Character type for selector (dropdown)
interface FrameCharacter {
  id: string
  name: string
  is_npc: boolean
  inhabited_by: string | null
}

// Zone proportion defaults and constraints
const DEFAULT_PROPORTIONS: ZoneProportions = { solid: 40, liquid: 30, vapour: 30 }
const MIN_ZONE_HEIGHT = 60 // pixels
const ZONE_STORAGE_KEY = 'xstream-zone-proportions'
const THEME_STORAGE_KEY = 'xstream-theme'
const BACKGROUND_STORAGE_KEY = 'xstream-column-background'

// Load zone proportions from localStorage
function loadZoneProportions(): ZoneProportions {
  try {
    const stored = localStorage.getItem(ZONE_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed.solid && parsed.liquid && parsed.vapour) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('[Zones] Failed to load proportions:', e)
  }
  return DEFAULT_PROPORTIONS
}

// Save zone proportions to localStorage
function saveZoneProportions(proportions: ZoneProportions): void {
  try {
    localStorage.setItem(ZONE_STORAGE_KEY, JSON.stringify(proportions))
  } catch (e) {
    console.warn('[Zones] Failed to save proportions:', e)
  }
}

// Theme persistence
function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && ['dark', 'light', 'cyber', 'soft'].includes(stored)) {
      return stored as Theme
    }
  } catch (e) {
    console.warn('[Theme] Failed to load:', e)
  }
  return 'dark'
}

function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch (e) {
    console.warn('[Theme] Failed to save:', e)
  }
}

// Background persistence
function loadBackground(): string {
  try {
    return localStorage.getItem(BACKGROUND_STORAGE_KEY) || ''
  } catch (e) {
    console.warn('[Background] Failed to load:', e)
  }
  return ''
}

function saveBackground(bg: string): void {
  try {
    localStorage.setItem(BACKGROUND_STORAGE_KEY, bg)
  } catch (e) {
    console.warn('[Background] Failed to save:', e)
  }
}

// Available frames
const FRAMES: Frame[] = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-00000000000b', name: 'test-frame-B', xyz: 'X0Y0Z0' },  // Same cosmology as test-frame
  { id: 'cccccccc-0000-0000-0000-000000000001', name: 'test-frame-2', xyz: 'X0Y0Z0' },  // Fresh cosmology
]

function App() {
  // Auth hook - must be first
  const auth = useAuth()
  
  // Core state - use auth user when available
  const userId = auth.user?.id ?? ''
  const [userName, setUserName] = useState<string>(() => auth.profile?.displayName ?? getDisplayName())
  const [face, setFace] = useState<Face>(() => (auth.profile?.defaultFace as Face) ?? 'character')
  const [frameId, setFrameId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [entries, setEntries] = useState<ShelfEntry[]>([])
  
  // Theme state (for vapor ConstructionButton)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  
  // Column background state
  const [columnBackground, setColumnBackground] = useState<string>(loadBackground)
  
  // Character selection state (Phase 0.9.3)
  const [frameCharacters, setFrameCharacters] = useState<FrameCharacter[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null)
  const selectedCharacter = frameCharacters.find(c => c.id === selectedCharacterId)
  
  // Zone proportions (Phase 0.9.0)
  const [zoneProportions, setZoneProportions] = useState<ZoneProportions>(loadZoneProportions)
  const mainRef = useRef<HTMLElement>(null)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isQuerying, setIsQuerying] = useState(false)
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false)
  
  // UI state
  const [showMeta, setShowMeta] = useState(false)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false)
  const [showDirectory, setShowDirectory] = useState(false)
  const [solidView, setSolidView] = useState<SolidView>('log')
  const [frameSkills, setFrameSkills] = useState<FrameSkill[]>([])
  const [softResponse, setSoftResponse] = useState<SoftLLMResponse | null>(null)
  
  // Liquid history navigation (Phase 0.9.3)
  const [liquidHistoryIndex, setLiquidHistoryIndex] = useState(0)
  
  const [visibility, setVisibility] = useState<VisibilitySettings>({
    shareVapor: true,
    shareLiquid: true,
    showVapor: true,
    showLiquid: true,
    showSolid: true,
  })

  const debounceTimerRef = useRef<number | null>(null)

  // Theme change handler
  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    saveTheme(newTheme)
  }, [])

  // Background change handler
  const handleBackgroundChange = useCallback((bg: string) => {
    setColumnBackground(bg)
    saveBackground(bg)
  }, [])

  // Sync userName with profile
  useEffect(() => {
    if (auth.profile?.displayName) {
      setUserName(auth.profile.displayName)
      setDisplayName(auth.profile.displayName)
    }
  }, [auth.profile?.displayName])

  // Reset all session state when user changes (login/logout/switch user)
  const prevUserIdRef = useRef<string | null>(null)
  useEffect(() => {
    const currentUserId = auth.user?.id ?? null
    const prevUserId = prevUserIdRef.current
    
    // Only reset if userId actually changed (not just on mount)
    if (prevUserId !== null && prevUserId !== currentUserId) {
      console.log('[App] User changed, resetting session state:', prevUserId, '→', currentUserId)
      
      // Reset all session-specific state
      setFrameId(null)
      setInput('')
      setEntries([])
      setFrameCharacters([])
      setSelectedCharacterId(null)
      setSoftResponse(null)
      setLiquidHistoryIndex(0)
      setFrameSkills([])
      setShowDirectory(false)
      setShowFilterDrawer(false)
      setShowMeta(false)
    }
    
    prevUserIdRef.current = currentUserId
  }, [auth.user?.id])

  // Load characters when frame changes + realtime subscription
  useEffect(() => {
    if (!frameId || !supabase) {
      setFrameCharacters([])
      setSelectedCharacterId(null)
      return
    }

    const loadCharacters = async () => {
      if (!supabase) return
      
      console.log('[App] Loading characters for frame:', frameId)
      
      // First get frame's cosmology
      const { data: frameData, error: frameError } = await supabase
        .from('frames')
        .select('cosmology_id')
        .eq('id', frameId)
        .single()
      
      if (frameError || !frameData?.cosmology_id) {
        console.error('[App] Error loading frame cosmology:', frameError)
        return
      }
      
      const cosmologyId = frameData.cosmology_id
      
      const { data, error } = await supabase
        .from('characters')
        .select('id, name, is_npc, inhabited_by')
        .eq('cosmology_id', cosmologyId)

      if (error) {
        console.error('[App] Error loading characters:', error)
        return
      }

      const characters: FrameCharacter[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: row.name as string,
        is_npc: row.is_npc as boolean,
        inhabited_by: row.inhabited_by as string | null,
      }))

      console.log('[App] Loaded characters:', characters.map(c => c.name))
      setFrameCharacters(characters)
      
      // Auto-select if user already inhabits a character here
      const inhabited = characters.find(c => c.inhabited_by === userId)
      if (inhabited) {
        setSelectedCharacterId(inhabited.id)
      }
    }

    loadCharacters()

    // Realtime subscription for character changes
    const channel = supabase
      .channel(`characters-${frameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters' },
        () => {
          console.log('[App] Character change detected, reloading...')
          loadCharacters()
        }
      )
      .subscribe()

    return () => {
      console.log('[App] Cleaning up character subscription')
      if (supabase) supabase.removeChannel(channel)
    }
  }, [frameId, userId])

  // Hooks - only active when authenticated
  const { 
    presentUsers, 
    isConnected, 
    othersVapor,
    broadcastVapor, 
    error: channelError 
  } = useFrameChannel({ frameId, userId, userName, face })

  // Phase 0.12 Set 3: Pass characterId for proximity-based filtering
  const {
    liquidEntries: dbLiquidEntries,
    upsertLiquid,
    commitLiquid,
    deleteLiquid,
  } = useLiquidSubscription({ frameId, userId, characterId: selectedCharacterId })

  // Phase 0.10.3.3: When placeholder solid appears (synthesis starting), clear local liquid for that face
  // This callback is triggered by realtime subscription when solid with narrative=null is inserted
  const handleSynthesisStart = useCallback((synthesizingFace: Face) => {
    console.log('[App] Synthesis started for face:', synthesizingFace, '- clearing local liquid')
    setEntries(prev => prev.filter(e => !(e.face === synthesizingFace && e.state === 'submitted')))
    setLiquidHistoryIndex(0)
  }, [])

  // Solid entries from database
  const { solidEntries: dbSolidEntries, clearSolid } = useSolidSubscription({ 
    frameId,
    onSynthesisStart: handleSynthesisStart,
  })

  // Content and character entries for directory view
  const {
    contentEntries: dbContentEntries,
    characterEntries: dbCharacterEntries,
    isLoading: isLoadingContent,
    deleteContent,
    deleteCharacter,
  } = useContentSubscription({ frameId })

  // Derived state
  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]
  
  // LIQUID: Only submitted entries for this face - staging area only
  const myLiquidEntries = entries
    .filter(e => e.face === face && e.state === 'submitted')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  
  // Clamp index to valid range when entries change
  useEffect(() => {
    if (liquidHistoryIndex >= myLiquidEntries.length) {
      setLiquidHistoryIndex(Math.max(0, myLiquidEntries.length - 1))
    }
  }, [myLiquidEntries.length, liquidHistoryIndex])
  
  // Reset to newest when face changes
  useEffect(() => {
    setLiquidHistoryIndex(0)
  }, [face])
  
  // OTHERS' LIQUID: One entry per other user
  const othersLiquidRaw = dbLiquidEntries.filter(e => e.userId !== userId && e.face === face)
  const othersLiquid = Object.values(
    othersLiquidRaw.reduce((acc, entry) => {
      const existing = acc[entry.userId]
      if (!existing || new Date(entry.updatedAt) > new Date(existing.updatedAt)) {
        acc[entry.userId] = entry
      }
      return acc
    }, {} as Record<string, typeof othersLiquidRaw[0]>)
  )
  
  const hasLiquidToClear = myLiquidEntries.length > 0

  // Zone drag handlers
  const handleTopSeparatorDrag = useCallback((delta: number) => {
    if (!mainRef.current) return
    const totalHeight = mainRef.current.clientHeight
    const deltaPercent = (delta / totalHeight) * 100
    
    setZoneProportions(prev => {
      const newSolid = Math.max(MIN_ZONE_HEIGHT / totalHeight * 100, 
                                Math.min(prev.solid + deltaPercent, 100 - 2 * MIN_ZONE_HEIGHT / totalHeight * 100))
      const newLiquid = Math.max(MIN_ZONE_HEIGHT / totalHeight * 100,
                                 Math.min(prev.liquid - deltaPercent, 100 - newSolid - MIN_ZONE_HEIGHT / totalHeight * 100))
      const newVapour = 100 - newSolid - newLiquid
      
      const result = { solid: newSolid, liquid: newLiquid, vapour: newVapour }
      saveZoneProportions(result)
      return result
    })
  }, [])

  const handleBottomSeparatorDrag = useCallback((delta: number) => {
    if (!mainRef.current) return
    const totalHeight = mainRef.current.clientHeight
    const deltaPercent = (delta / totalHeight) * 100
    
    setZoneProportions(prev => {
      const newLiquid = Math.max(MIN_ZONE_HEIGHT / totalHeight * 100,
                                 Math.min(prev.liquid + deltaPercent, 100 - prev.solid - MIN_ZONE_HEIGHT / totalHeight * 100))
      const newVapour = Math.max(MIN_ZONE_HEIGHT / totalHeight * 100,
                                 100 - prev.solid - newLiquid)
      
      const result = { solid: prev.solid, liquid: newLiquid, vapour: newVapour }
      saveZoneProportions(result)
      return result
    })
  }, [])

  // Helper: Replace the current active entry for a face
  const replaceActiveEntry = useCallback((newEntry: ShelfEntry, targetFace: Face) => {
    setEntries(prev => {
      const filtered = prev.filter(e => !(e.face === targetFace && e.state === 'submitted'))
      return [...filtered, newEntry]
    })
    setLiquidHistoryIndex(0)
  }, [])

  // Effects
  useEffect(() => {
    if (visibility.shareVapor) {
      broadcastVapor(input)
    } else {
      broadcastVapor('')
    }
  }, [input, broadcastVapor, visibility.shareVapor])

  useEffect(() => {
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current) }
  }, [])

  // Load skills when directory opens for designer face
  useEffect(() => {
    if (showDirectory && face === 'designer') {
      loadFrameSkills()
    }
  }, [showDirectory, frameId, face])

  // API calls
  const loadFrameSkills = async () => {
    if (!GENERATE_URL || !SUPABASE_ANON_KEY) return
    setIsLoadingDirectory(true)
    try {
      const res = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'list_frame_skills', frame_id: frameId }),
      })
      const data = await res.json()
      if (data.success && data.skills) setFrameSkills(data.skills)
    } catch (error) {
      console.error('Error loading frame skills:', error)
    } finally {
      setIsLoadingDirectory(false)
    }
  }

  // Generate response using Medium-LLM synthesis
  const generateResponse = async (entry: ShelfEntry) => {
    console.log('[App] generateResponse START', { entryId: entry.id, frameId: entry.frameId, face: entry.face })
    setIsLoading(true)
    
    // Timeout safety - reset isLoading after 60 seconds no matter what
    const timeoutId = setTimeout(() => {
      console.error('[App] generateResponse TIMEOUT - resetting isLoading after 60s')
      setIsLoading(false)
    }, 60000)
    
    try {
      if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
        console.warn('[App] Supabase not configured')
        return
      }

      let createdSkill = null

      if (entry.frameId) {
        console.log('[App] Step 1: Calling commitLiquid...')
        
        const liquidId = await commitLiquid({
          userName: selectedCharacter?.name || userName,
          face: entry.face,
          content: entry.text,
          characterId: selectedCharacterId,
        })

        console.log('[App] Step 2: commitLiquid returned:', liquidId)
        
        if (!liquidId) {
          throw new Error('Failed to commit to liquid table')
        }

        console.log('[App] Step 3: Calling generate-v2 edge function...')
        const res = await fetch(GENERATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ mode: 'medium' as LLMMode, liquid_id: liquidId }),
        })
        
        console.log('[App] Step 4: Edge function responded:', res.status)
        const data = await res.json()
        console.log('[App] Step 5: Parsed response:', { success: data.success, error: data.error })

        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

        if (data.result?.skillData) createdSkill = data.result.skillData

        console.log('[App] Step 6: Synthesis complete')
        
        // Note: Local liquid clearing now happens via onSynthesisStart callback
        // when placeholder solid is detected by realtime subscription

      } else {
        console.log('[App] No frameId on entry - using non-frame path')
        const res = await fetch(GENERATE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ text: entry.text, face: entry.face, frame_id: null, user_id: userId }),
        })
        const data = await res.json()

        if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)
      }

      if (createdSkill && showDirectory && face === 'designer') loadFrameSkills()
      console.log('[App] generateResponse SUCCESS')

    } catch (error) {
      console.error('[App] generateResponse ERROR:', error)
    } finally {
      clearTimeout(timeoutId)
      console.log('[App] generateResponse FINALLY - setting isLoading=false')
      setIsLoading(false)
    }
  }

  // Core query function
  const executeQuery = async (textToSend: string, currentFace: Face, currentFrameId: string | null) => {
    if (!GENERATE_URL || !SUPABASE_ANON_KEY) {
      setSoftResponse({ id: crypto.randomUUID(), originalInput: textToSend, text: `[Soft-LLM would process: "${textToSend}"]`, softType: 'refine', face: currentFace, frameId: currentFrameId })
      return
    }

    const res = await fetch(GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ 
        text: textToSend, 
        face: currentFace, 
        frame_id: currentFrameId, 
        user_id: userId, 
        user_name: selectedCharacter?.name || userName,
        character_id: selectedCharacterId,
        mode: 'soft' as LLMMode 
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`)

    const softType: SoftType = data.soft_type || 'refine'
    
    if (softType === 'artifact' && data.document) {
      const artifact = parseArtifactFromText(data.document, currentFace)
      const newEntry: ShelfEntry = { 
        id: crypto.randomUUID(), 
        text: data.document, 
        face: currentFace, 
        frameId: currentFrameId, 
        state: 'submitted', 
        timestamp: new Date().toISOString(), 
        artifactName: artifact?.name, 
        artifactType: artifact?.type 
      }
      replaceActiveEntry(newEntry, currentFace)
      setSoftResponse(null)
    } else if (softType === 'action') {
      const newEntry: ShelfEntry = { 
        id: crypto.randomUUID(), 
        text: data.text, 
        face: currentFace, 
        frameId: currentFrameId, 
        state: 'submitted', 
        timestamp: new Date().toISOString()
      }
      replaceActiveEntry(newEntry, currentFace)
      setInput('')
      setSoftResponse(null)
      if (currentFrameId && visibility.shareLiquid) upsertLiquid({ 
        userName: selectedCharacter?.name || userName, 
        face: currentFace, 
        content: data.text,
        characterId: selectedCharacterId,
      })
    } else if (softType === 'info') {
      setSoftResponse({ id: crypto.randomUUID(), originalInput: textToSend, text: data.text, softType: 'info', face: currentFace, frameId: currentFrameId })
      setInput('')
    } else {
      setSoftResponse({ id: crypto.randomUUID(), originalInput: textToSend, text: data.text, softType, options: data.options, face: currentFace, frameId: currentFrameId })
    }
  }

  // Handlers
  const handleSkillClick = (skill: FrameSkill) => {
    const document = `SKILL_CREATE\nname: ${skill.name}\ncategory: ${skill.category}\napplies_to: ${skill.applies_to.join(', ')}\ncontent: |\n${skill.content.split('\n').map(line => '  ' + line).join('\n')}`
    const newEntry: ShelfEntry = { 
      id: crypto.randomUUID(), 
      text: document, 
      face: 'designer', 
      frameId, 
      state: 'submitted', 
      timestamp: new Date().toISOString() 
    }
    replaceActiveEntry(newEntry, 'designer')
    setShowDirectory(false)
  }

  const handleDeleteContent = useCallback((contentId: string) => {
    console.log('[App] Deleting content:', contentId)
    deleteContent(contentId)
  }, [deleteContent])

  const handleDeleteCharacter = useCallback((characterId: string) => {
    console.log('[App] Deleting character:', characterId)
    deleteCharacter(characterId)
  }, [deleteCharacter])

  const handleLiquidEdit = useCallback((entryId: string, newText: string) => {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, text: newText, isEditing: true } : e))
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(() => {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, isEditing: false } : e))
    }, EDIT_DEBOUNCE_MS)
  }, [])

  const handleLiquidNavigate = useCallback((direction: 'prev' | 'next') => {
    setLiquidHistoryIndex(prev => {
      if (direction === 'prev') {
        return Math.min(prev + 1, myLiquidEntries.length - 1)
      } else {
        return Math.max(prev - 1, 0)
      }
    })
  }, [myLiquidEntries.length])

  const handleCopyToVapor = useCallback((text: string) => {
    setInput(text)
  }, [])

  const handleQuery = async () => {
    if (!input.trim()) return
    const parsed = parseInputTypography(input)
    
    if (parsed.route === 'liquid') { handleSubmitDirect(parsed.text); return }
    if (parsed.route === 'solid') { handleCommitDirect(parsed.text); return }
    
    const textToSend = parsed.text
    const currentFace = face
    const currentFrameId = frameId
    
    setIsQuerying(true)

    try {
      await executeQuery(textToSend, currentFace, currentFrameId)
    } catch (error) {
      console.error('Soft-LLM query error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setSoftResponse({ id: crypto.randomUUID(), originalInput: textToSend, text: `[Error: ${errorMsg}]`, softType: 'refine', face: currentFace, frameId: currentFrameId })
    } finally {
      setIsQuerying(false)
    }
  }

  const handleDismissSoftResponse = () => {
    setSoftResponse(null)
  }

  const handleSubmitDirect = (text: string) => {
    if (!text.trim()) return
    const artifact = parseArtifactFromText(text, face)
    const newEntry: ShelfEntry = { 
      id: crypto.randomUUID(), 
      text: text.trim(), 
      face, 
      frameId, 
      state: 'submitted', 
      timestamp: new Date().toISOString(), 
      artifactName: artifact?.name, 
      artifactType: artifact?.type 
    }
    replaceActiveEntry(newEntry, face)
    setInput('')
    if (frameId && visibility.shareLiquid) upsertLiquid({ 
      userName: selectedCharacter?.name || userName, 
      face, 
      content: text.trim(),
      characterId: selectedCharacterId,
    })
  }

  const handleSubmit = () => {
    if (input.trim()) {
      const parsed = parseInputTypography(input)
      if (parsed.route === 'solid') { handleCommitDirect(parsed.text); return }
      handleSubmitDirect(parsed.text)
      return
    }
    
    if (hasLiquidToClear) {
      const currentLiquid = myLiquidEntries[liquidHistoryIndex]
      if (currentLiquid) {
        setEntries(prev => prev.filter(e => e.id !== currentLiquid.id))
        if (frameId) {
          deleteLiquid()
        }
      }
    }
  }

  const handleCommitDirect = async (text: string) => {
    if (!text.trim()) return
    const artifact = parseArtifactFromText(text, face)
    const entry: ShelfEntry = { 
      id: crypto.randomUUID(), 
      text: text.trim(), 
      face, 
      frameId, 
      state: 'submitted', 
      timestamp: new Date().toISOString(), 
      artifactName: artifact?.name, 
      artifactType: artifact?.type 
    }
    setInput('')
    await generateResponse(entry)
  }

  const handleCommitEntry = async (entryId: string) => {
    console.log('[App] handleCommitEntry called with:', entryId)
    const entry = entries.find(e => e.id === entryId)
    if (!entry) {
      console.warn('[App] handleCommitEntry: entry not found in state')
      return
    }
    
    console.log('[App] Found entry:', { id: entry.id, text: entry.text.slice(0, 50), frameId: entry.frameId })
    
    // Remove entry from local state immediately
    setEntries(prev => prev.filter(e => e.id !== entryId))
    
    // Process the entry
    await generateResponse(entry)
  }

  const handleCommit = async () => {
    if (input.trim()) {
      const parsed = parseInputTypography(input)
      await handleCommitDirect(parsed.text)
      return
    }
    const currentLiquid = myLiquidEntries[liquidHistoryIndex]
    if (currentLiquid && currentLiquid.state === 'submitted') {
      await handleCommitEntry(currentLiquid.id)
    }
  }

  const handleClear = () => {
    setInput('')
    setSoftResponse(null)
    setEntries(prev => prev.filter(e => !(e.face === face && e.state === 'submitted')))
    if (frameId) {
      deleteLiquid()
      broadcastVapor('')
      clearSolid()
    }
  }

  const handleNameChange = (name: string) => {
    setDisplayName(name)
    setUserName(name)
    if (auth.user) {
      auth.updateProfile({ displayName: name })
    }
  }

  const handleSelectOption = async (opt: string) => {
    setSoftResponse(null)
    setIsQuerying(true)
    
    try {
      await executeQuery(opt, face, frameId)
    } catch (error) {
      console.error('Option execution error:', error)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setSoftResponse({ id: crypto.randomUUID(), originalInput: opt, text: `[Error: ${errorMsg}]`, softType: 'refine', face, frameId })
    } finally {
      setIsQuerying(false)
    }
  }

  const handleCharacterSelect = (characterId: string | null) => {
    setSelectedCharacterId(characterId)
    if (characterId) {
      const char = frameCharacters.find(c => c.id === characterId)
      console.log('[App] Selected character:', char?.name || 'none')
    }
  }

  // Directory toggle - close filter drawer if opening directory
  const handleDirectoryToggle = useCallback(() => {
    setShowDirectory(prev => {
      if (!prev) setShowFilterDrawer(false)
      return !prev
    })
  }, [])

  // Filter toggle - close directory if opening filter
  const handleFilterToggle = useCallback(() => {
    setShowFilterDrawer(prev => {
      if (!prev) setShowDirectory(false)
      return !prev
    })
  }, [])

  // Compute zone heights
  const getZoneHeight = (zone: 'solid' | 'liquid' | 'vapour') => {
    if (!mainRef.current) return 200
    return Math.floor(mainRef.current.clientHeight * zoneProportions[zone] / 100)
  }

  // Adapt content entries for directory
  const directoryContentEntries = dbContentEntries.map(e => ({
    id: e.id,
    type: e.type,
    name: e.name,
    preview: e.content?.slice(0, 100),
  }))

  // Adapt skills for directory
  const directorySkills = frameSkills.map(s => ({
    id: s.id || crypto.randomUUID(),
    name: s.name,
    category: s.category,
    applies_to: s.applies_to,
  }))

  // Column background style (vapor-flow pattern with CSS variable)
  const columnBgStyle: React.CSSProperties | undefined = columnBackground
    ? { '--xstream-column-bg': columnBackground } as React.CSSProperties
    : undefined

  // Show loading while checking auth
  if (auth.isLoading) {
    return (
      <div className="app loading-screen">
        <div className="loading-text">Loading...</div>
      </div>
    )
  }

  // Show auth page if not logged in
  if (!auth.user) {
    return <AuthPage auth={auth} />
  }

  return (
    <div 
      className="app" 
      data-theme={theme} 
      data-face={face} 
      data-layout="single"
      data-column-bg={columnBackground ? "true" : "false"}
      style={columnBgStyle}
    >
      {/* Vapor-flow style header */}
      <ColumnHeader
        face={face}
        frame={currentFrame.name}
        character={selectedCharacter?.name}
        stateCode={currentFrame.xyz}
        presenceCount={presentUsers.length}
        isConnected={isConnected}
        frames={FRAMES.map(f => ({ id: f.id, name: f.name }))}
        selectedFrameId={frameId}
        onFrameSelect={setFrameId}
        onFaceChange={setFace}
        onDirectoryToggle={handleDirectoryToggle}
        onFilterToggle={handleFilterToggle}
        onDetailsToggle={() => setShowMeta(!showMeta)}
        isDirectoryOpen={showDirectory}
        isFilterOpen={showFilterDrawer}
      />

      {/* Directory drawer - face-specific content */}
      <DirectoryDrawer
        isOpen={showDirectory}
        onClose={() => setShowDirectory(false)}
        face={face}
        characters={frameCharacters}
        selectedCharacterId={selectedCharacterId}
        currentUserId={userId}
        onCharacterSelect={handleCharacterSelect}
        contentEntries={directoryContentEntries}
        onContentSelect={(entry) => {
          handleCopyToVapor(entry.name)
          setShowDirectory(false)
        }}
        onContentDelete={handleDeleteContent}
        skills={directorySkills}
        onSkillSelect={(skill) => {
          const fullSkill = frameSkills.find(s => s.name === skill.name)
          if (fullSkill) handleSkillClick(fullSkill)
        }}
        isLoading={isLoadingDirectory || isLoadingContent}
      />

      {/* Filter drawer - vapor-flow style */}
      <FilterDrawer
        isOpen={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        visibility={visibility}
        onToggle={(key) => setVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
        userName={userName}
        onNameChange={handleNameChange}
        columnBackground={columnBackground}
        onBackgroundChange={handleBackgroundChange}
      />

      {frameId && <PresenceBar users={presentUsers} />}

      <main 
        className="main" 
        ref={mainRef}
      >
        {visibility.showSolid && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.solid}%` }}>
            <SolidZone
              blocks={adaptSolidEntries(dbSolidEntries)}
              height={getZoneHeight('solid')}
            />
          </div>
        )}

        {visibility.showSolid && visibility.showLiquid && (
          <DraggableSeparator position="top" onDrag={handleTopSeparatorDrag} />
        )}

        {visibility.showLiquid && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.liquid}%` }}>
            <LiquidZone
              cards={combineLiquidCards(myLiquidEntries, selectedCharacter?.name || userName, othersLiquid)}
              height={getZoneHeight('liquid')}
              currentUserId={userId}
              isLoading={isLoading}
              onCommit={handleCommitEntry}
              onCopyToVapor={handleCopyToVapor}
            />
          </div>
        )}

        {visibility.showLiquid && visibility.showVapor && (
          <DraggableSeparator position="bottom" onDrag={handleBottomSeparatorDrag} />
        )}

        {visibility.showVapor && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.vapour}%` }}>
            <VapourZone
              entries={adaptVaporContents(othersVapor)}
              softResponse={softResponse}
              onDismissSoftResponse={handleDismissSoftResponse}
            />
          </div>
        )}
      </main>

      <ConstructionButton
        onThemeChange={handleThemeChange}
        onLogout={() => auth.signOut()}
        currentTheme={theme}
        value={input}
        onChange={setInput}
        onQuery={handleQuery}
        onSubmit={handleSubmitDirect}
        isQuerying={isQuerying}
        placeholder={`As ${selectedCharacter?.name || userName}...`}
      />
    </div>
  )
}

export default App
