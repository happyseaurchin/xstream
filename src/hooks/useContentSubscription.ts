import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Content entry from database - author-created world content
 * Phase 0.10.3.2: Queries by cosmology_id (content belongs to world, frame views it)
 */
export interface ContentEntry {
  id: string
  name: string
  contentType: string  // location, npc, item, event, lore, faction, character, etc.
  data: Record<string, unknown>
  cosmologyId: string | null
  frameId: string | null  // Provenance: which frame was active when created
  authorId: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Character entry from database
 */
export interface CharacterEntry {
  id: string
  name: string
  description: string | null
  isNpc: boolean
  inhabitedBy: string | null
  cosmologyId: string | null
  createdAt: string
}

export interface UseContentSubscriptionOptions {
  frameId: string | null
}

export interface UseContentSubscriptionReturn {
  contentEntries: ContentEntry[]      // For author directory
  characterEntries: CharacterEntry[]  // For character directory
  cosmologyId: string | null
  isLoading: boolean
  error: string | null
  deleteContent: (contentId: string) => Promise<boolean>      // Phase 0.10.3.2: Delete content
  deleteCharacter: (characterId: string) => Promise<boolean>  // Phase 0.10.3.2: Delete character
  refresh: () => Promise<void>                                 // Phase 0.10.3.2: Manual refresh
}

/**
 * Hook to subscribe to content and characters for a frame's cosmology
 * 
 * Content belongs to cosmology (the world), not to frame.
 * Frame determines what's visible (aperture) - for now, shows all content in cosmology.
 * Later: pscale proximity filtering will narrow what each frame "sees".
 */
export function useContentSubscription({
  frameId,
}: UseContentSubscriptionOptions): UseContentSubscriptionReturn {
  const [contentEntries, setContentEntries] = useState<ContentEntry[]>([])
  const [characterEntries, setCharacterEntries] = useState<CharacterEntry[]>([])
  const [cosmologyId, setCosmologyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use ref to track cosmologyId for subscriptions (fixes race condition)
  const cosmologyIdRef = useRef<string | null>(null)

  // Transform content row
  const transformContentRow = (row: Record<string, unknown>): ContentEntry => ({
    id: row.id as string,
    name: row.name as string,
    contentType: row.content_type as string,
    data: (row.data as Record<string, unknown>) || {},
    cosmologyId: row.cosmology_id as string | null,
    frameId: row.frame_id as string | null,
    authorId: row.author_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  })

  // Transform character row
  const transformCharacterRow = (row: Record<string, unknown>): CharacterEntry => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    isNpc: row.is_npc as boolean,
    inhabitedBy: row.inhabited_by as string | null,
    cosmologyId: row.cosmology_id as string | null,
    createdAt: row.created_at as string,
  })

  // Load data function - can be called for refresh
  const loadData = useCallback(async (targetCosmologyId: string) => {
    if (!supabase) return

    const sb = supabase

    // Load content by cosmology
    const { data: contentData, error: contentError } = await sb
      .from('content')
      .select('*')
      .eq('cosmology_id', targetCosmologyId)
      .order('created_at', { ascending: false })

    if (contentError) {
      console.error('[Content] Error loading content:', contentError)
    } else {
      setContentEntries((contentData || []).map(transformContentRow))
      console.log('[Content] Loaded content entries:', contentData?.length || 0)
    }

    // Load characters by cosmology
    const { data: charData, error: charError } = await sb
      .from('characters')
      .select('*')
      .eq('cosmology_id', targetCosmologyId)
      .order('created_at', { ascending: false })

    if (charError) {
      console.error('[Content] Error loading characters:', charError)
    } else {
      setCharacterEntries((charData || []).map(transformCharacterRow))
      console.log('[Content] Loaded character entries:', charData?.length || 0)
    }
  }, [])

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (cosmologyIdRef.current) {
      await loadData(cosmologyIdRef.current)
    }
  }, [loadData])

  // Load content and characters when frame changes
  useEffect(() => {
    if (!frameId || !supabase) {
      setContentEntries([])
      setCharacterEntries([])
      setCosmologyId(null)
      cosmologyIdRef.current = null
      return
    }

    const sb = supabase

    const initAndSubscribe = async () => {
      setIsLoading(true)
      try {
        // First get frame's cosmology
        const { data: frameData, error: frameError } = await sb
          .from('frames')
          .select('cosmology_id')
          .eq('id', frameId)
          .single()

        if (frameError || !frameData?.cosmology_id) {
          console.error('[Content] Error loading frame cosmology:', frameError)
          setError('Failed to load frame cosmology')
          return
        }

        const currentCosmologyId = frameData.cosmology_id
        cosmologyIdRef.current = currentCosmologyId
        setCosmologyId(currentCosmologyId)

        // Load initial data
        await loadData(currentCosmologyId)
        setError(null)
      } catch (err) {
        console.error('[Content] Load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load content')
      } finally {
        setIsLoading(false)
      }
    }

    initAndSubscribe()

    // Subscribe to content table changes
    // Phase 0.10.3.2: Simplified - reload on any change to avoid race conditions
    const contentChannel = sb
      .channel(`content:${frameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
        },
        () => {
          console.log('[Content] Content table change detected, reloading...')
          if (cosmologyIdRef.current) {
            loadData(cosmologyIdRef.current)
          }
        }
      )
      .subscribe()

    // Subscribe to characters table changes
    const charChannel = sb
      .channel(`characters-content:${frameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
        },
        () => {
          console.log('[Content] Characters table change detected, reloading...')
          if (cosmologyIdRef.current) {
            loadData(cosmologyIdRef.current)
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[Content] Cleaning up subscriptions')
      sb.removeChannel(contentChannel)
      sb.removeChannel(charChannel)
    }
  }, [frameId, loadData])

  // Phase 0.10.3.2: Delete content entry
  const deleteContent = useCallback(async (contentId: string): Promise<boolean> => {
    if (!supabase) return false

    console.log('[Content] Deleting content:', contentId)
    try {
      const { error: err } = await supabase
        .from('content')
        .delete()
        .eq('id', contentId)

      if (err) {
        console.error('[Content] Delete error:', err)
        return false
      }

      // State will update via realtime subscription
      console.log('[Content] Deleted successfully')
      return true
    } catch (err) {
      console.error('[Content] Delete failed:', err)
      return false
    }
  }, [])

  // Phase 0.10.3.2: Delete character entry
  const deleteCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    if (!supabase) return false

    console.log('[Content] Deleting character:', characterId)
    try {
      const { error: err } = await supabase
        .from('characters')
        .delete()
        .eq('id', characterId)

      if (err) {
        console.error('[Content] Delete character error:', err)
        return false
      }

      // State will update via realtime subscription
      console.log('[Content] Character deleted successfully')
      return true
    } catch (err) {
      console.error('[Content] Character delete failed:', err)
      return false
    }
  }, [])

  return {
    contentEntries,
    characterEntries,
    cosmologyId,
    isLoading,
    error,
    deleteContent,
    deleteCharacter,
    refresh,
  }
}
