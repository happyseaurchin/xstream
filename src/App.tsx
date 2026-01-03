import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFrameChannel, getDisplayName, setDisplayName } from './hooks/useFrameChannel'
import { useLiquidSubscription } from './hooks/useLiquidSubscription'
import { useSolidSubscription } from './hooks/useSolidSubscription'
import {
  AuthPage,
  ConstructionButton,
  PresenceBar,
  VisibilityPanel,
  VaporPanel,
  LiquidPanel,
  SolidPanel,
  DraggableSeparator,
} from './components'
import type { VaporPanelHandle } from './components/VaporPanel'
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
import { parseInputTypography, parseArtifactFromText } from './utils/parsing'
import { supabase } from './lib/supabase'
import './App.css'

// Config - use shared supabase client from lib/supabase to avoid multiple GoTrueClient instances
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const GENERATE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/generate-v2` : null
const EDIT_DEBOUNCE_MS = 500

// Character type for selector
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

// Available frames
const FRAMES: Frame[] = [
  { id: null, name: 'None (platform defaults)', xyz: 'X0Y0Z0' },
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', name: 'test-frame', xyz: 'X0Y0Z0' },
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
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false)
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
  const vaporPanelRef = useRef<VaporPanelHandle>(null)

  // Sync userName with profile
  useEffect(() => {
    if (auth.profile?.displayName) {
      setUserName(auth.profile.displayName)
      setDisplayName(auth.profile.displayName)
    }
  }, [auth.profile?.displayName])

  // Load characters when frame changes
  useEffect(() => {
    if (!frameId || !supabase) {
      setFrameCharacters([])
      setSelectedCharacterId(null)
      return
    }

    const loadCharacters = async () => {
      // TypeScript needs explicit check even though we checked above
      if (!supabase) return
      
      console.log('[App] Loading characters for frame:', frameId)
      
      // Get characters that have coordinates in this frame
      const { data, error } = await supabase
        .from('character_coordinates')
        .select(`
          character_id,
          characters!inner(id, name, is_npc, inhabited_by)
        `)
        .eq('frame_id', frameId)

      if (error) {
        console.error('[App] Error loading characters:', error)
        return
      }

      const characters: FrameCharacter[] = (data || []).map((row: any) => ({
        id: row.characters.id,
        name: row.characters.name,
        is_npc: row.characters.is_npc,
        inhabited_by: row.characters.inhabited_by,
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
  }, [frameId, userId])

  // Hooks - only active when authenticated
  const { 
    presentUsers, 
    isConnected, 
    othersVapor,
    broadcastVapor, 
    error: channelError 
  } = useFrameChannel({ frameId, userId, userName, face })

  const {
    liquidEntries: dbLiquidEntries,
    upsertLiquid,
    commitLiquid,
    deleteLiquid,
  } = useLiquidSubscription({ frameId, userId })

  // Solid entries from database
  const { solidEntries: dbSolidEntries } = useSolidSubscription({ frameId })

  // Derived state
  const currentFrame = FRAMES.find(f => f.id === frameId) || FRAMES[0]
  
  // LIQUID: Only submitted entries for this face - staging area only
  // Committed entries are removed immediately, result appears in solid
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
  
  const directoryEntries = entries.filter(e => {
    if (e.state !== 'committed' || e.face !== face || face === 'designer') return false
    return parseArtifactFromText(e.text, face) !== null
  })
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
      // Remove any existing submitted entry for this face
      const filtered = prev.filter(e => !(e.face === targetFace && e.state === 'submitted'))
      return [...filtered, newEntry]
    })
    // Reset to newest entry after adding
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

  useEffect(() => {
    if (solidView === 'dir' && face === 'designer') loadFrameSkills()
  }, [solidView, frameId, face])

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

  // Phase 0.7: Generate response using Medium-LLM synthesis
  // Phase 0.9.3: Added detailed logging and timeout safety
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
        console.log('[App] Step 1: Calling commitLiquid...', { 
          userName: selectedCharacter?.name || userName,
          characterId: selectedCharacterId,
          currentFrameId: frameId,
          entryFrameId: entry.frameId
        })
        
        const liquidId = await commitLiquid({
          userName: selectedCharacter?.name || userName,
          face: entry.face,
          content: entry.text,
          characterId: selectedCharacterId,
        })

        console.log('[App] Step 2: commitLiquid returned:', liquidId)
        
        if (!liquidId) {
          throw new Error('Failed to commit to liquid table - commitLiquid returned null (frameId or supabase may be null)')
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

        console.log('[App] Step 6: Medium mode synthesis complete:', {
          solidId: data.stored?.solidId,
          contentId: data.stored?.contentId,
          skillId: data.stored?.skillId,
        })

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

      if (createdSkill && solidView === 'dir') loadFrameSkills()
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
  const handleShelfEntryClick = (entry: ShelfEntry) => {
    const newEntry: ShelfEntry = { 
      id: crypto.randomUUID(), 
      text: entry.text, 
      face: entry.face, 
      frameId, 
      state: 'submitted', 
      timestamp: new Date().toISOString() 
    }
    replaceActiveEntry(newEntry, entry.face)
    setSolidView('log')
  }

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
    setSolidView('log')
  }

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

  // Copy liquid text to vapor for editing
  const handleCopyToVapor = useCallback((text: string) => {
    setInput(text)
    setTimeout(() => vaporPanelRef.current?.focus(), 10)
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
    setTimeout(() => vaporPanelRef.current?.focus(), 10)
    
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
    setTimeout(() => vaporPanelRef.current?.focus(), 10)
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
    // If vapor has content, submit it to liquid
    if (input.trim()) {
      const parsed = parseInputTypography(input)
      if (parsed.route === 'solid') { handleCommitDirect(parsed.text); return }
      handleSubmitDirect(parsed.text)
      return
    }
    
    // If vapor is empty but liquid exists, clear the liquid
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
    // Don't add to entries - just send directly for processing
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
    
    // Remove entry from local state immediately - liquid is staging only
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
    // Clear all submitted entries for current face
    setEntries(prev => prev.filter(e => !(e.face === face && e.state === 'submitted')))
    if (frameId) {
      deleteLiquid()
      broadcastVapor('')
    }
  }

  const handleNameChange = (name: string) => {
    setDisplayName(name)
    setUserName(name)
    // Also update profile if authenticated
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

  // User is authenticated - go directly to main app
  // Character creation happens via LLM in vapour zone (Phase 0.9.2)

  return (
    <div className="app">
      <header className="header">
        <div className="selectors">
          <select value={face} onChange={(e) => setFace(e.target.value as Face)} className="face-selector">
            <option value="character">🎭 Character</option>
            <option value="author">📖 Author</option>
            <option value="designer">⚙️ Designer</option>
          </select>
          <select value={frameId || ''} onChange={(e) => setFrameId(e.target.value || null)} className="frame-selector">
            {FRAMES.map(f => <option key={f.id || 'none'} value={f.id || ''}>{f.name}</option>)}
          </select>
        </div>
        <div className="header-controls">
          {/* Character selector - only show when in character face and frame selected */}
          {face === 'character' && frameId && frameCharacters.length > 0 && (
            <select 
              value={selectedCharacterId || ''} 
              onChange={(e) => handleCharacterSelect(e.target.value || null)}
              className="character-selector"
              title="Select character to inhabit"
            >
              <option value="">-- Select Character --</option>
              {frameCharacters.map(c => (
                <option key={c.id} value={c.id} disabled={c.inhabited_by !== null && c.inhabited_by !== userId}>
                  {c.name} {c.is_npc ? '(NPC)' : ''} {c.inhabited_by === userId ? '✓' : c.inhabited_by ? '⊘' : ''}
                </option>
              ))}
            </select>
          )}
          <div className="presence-indicator">
            {frameId && (
              <>
                <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`} title={isConnected ? 'Connected' : channelError || 'Disconnected'}>●</span>
                {presentUsers.length > 0 && <span className="presence-count" title={presentUsers.map(u => `${u.name} (${u.face})`).join(', ')}>+{presentUsers.length}</span>}
              </>
            )}
          </div>
          <span className="xyz-badge">{currentFrame.xyz}</span>
          <button className={`visibility-toggle ${showVisibilityPanel ? 'active' : ''}`} onClick={() => setShowVisibilityPanel(!showVisibilityPanel)} title="Visibility settings">⚙</button>
          <button className="meta-toggle" onClick={() => setShowMeta(!showMeta)} title="Toggle skill metadata">{showMeta ? '◉' : '○'}</button>
          <button className="logout-btn" onClick={() => auth.signOut()} title={`Signed in as ${userName}`}>↪</button>
        </div>
      </header>

      {showVisibilityPanel && (
        <VisibilityPanel
          visibility={visibility}
          onToggle={(key) => setVisibility(prev => ({ ...prev, [key]: !prev[key] }))}
          userName={userName}
          onNameChange={handleNameChange}
        />
      )}

      {frameId && <PresenceBar users={presentUsers} />}

      <main className="main" ref={mainRef}>
        {visibility.showSolid && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.solid}%` }}>
            <SolidPanel
              solidView={solidView}
              onViewChange={setSolidView}
              solidEntries={dbSolidEntries}
              frameSkills={frameSkills}
              directoryEntries={directoryEntries}
              face={face}
              frameId={frameId}
              isLoadingDirectory={isLoadingDirectory}
              showMeta={showMeta}
              onSkillClick={handleSkillClick}
              onEntryClick={handleShelfEntryClick}
            />
          </div>
        )}

        {visibility.showSolid && visibility.showLiquid && (
          <DraggableSeparator position="top" onDrag={handleTopSeparatorDrag} />
        )}

        {visibility.showLiquid && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.liquid}%` }}>
            <LiquidPanel
              liquidEntries={myLiquidEntries}
              currentIndex={liquidHistoryIndex}
              othersLiquid={othersLiquid}
              isLoading={isLoading}
              onEdit={handleLiquidEdit}
              onCommit={handleCommitEntry}
              onDismiss={(id) => {
                setEntries(prev => prev.filter(e => e.id !== id))
              }}
              onNavigate={handleLiquidNavigate}
              onCopyToVapor={handleCopyToVapor}
            />
          </div>
        )}

        {visibility.showLiquid && visibility.showVapor && (
          <DraggableSeparator position="bottom" onDrag={handleBottomSeparatorDrag} />
        )}

        {visibility.showVapor && (
          <div className="zone-wrapper" style={{ flex: `0 0 ${zoneProportions.vapour}%` }}>
            <VaporPanel
              ref={vaporPanelRef}
              input={input}
              onInputChange={setInput}
              userName={selectedCharacter?.name || userName}
              face={face}
              othersVapor={othersVapor}
              softResponse={softResponse}
              onDismissSoftResponse={handleDismissSoftResponse}
              onSelectOption={handleSelectOption}
              isLoading={isLoading}
              isQuerying={isQuerying}
              hasLiquidToClear={hasLiquidToClear}
              onQuery={handleQuery}
              onSubmit={handleSubmit}
              onCommit={handleCommit}
              onClear={handleClear}
            />
          </div>
        )}
      </main>

      <ConstructionButton />
    </div>
  )
}

export default App
