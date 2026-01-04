import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

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

  // Transform content row
  const transformContentRow = (row: any): ContentEntry => ({
    id: row.id,
    name: row.name,
    contentType: row.content_type,
    data: row.data || {},
    cosmologyId: row.cosmology_id,
    frameId: row.frame_id,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })

  // Transform character row
  const transformCharacterRow = (row: any): CharacterEntry => ({
    id: row.id,
    name: row.name,
    description: row.description,
    isNpc: row.is_npc,
    inhabitedBy: row.inhabited_by,
    cosmologyId: row.cosmology_id,
    createdAt: row.created_at,
  })

  // Load content and characters when frame changes
  useEffect(() => {
    if (!frameId || !supabase) {
      setContentEntries([])
      setCharacterEntries([])
      setCosmologyId(null)
      return
    }

    let currentCosmologyId: string | null = null

    const loadData = async () => {
      setIsLoading(true)
      try {
        // First get frame's cosmology
        const { data: frameData, error: frameError } = await supabase
          .from('frames')
          .select('cosmology_id')
          .eq('id', frameId)
          .single()

        if (frameError || !frameData?.cosmology_id) {
          console.error('[Content] Error loading frame cosmology:', frameError)
          setError('Failed to load frame cosmology')
          return
        }

        currentCosmologyId = frameData.cosmology_id
        setCosmologyId(currentCosmologyId)

        // Load content by cosmology
        const { data: contentData, error: contentError } = await supabase
          .from('content')
          .select('*')
          .eq('cosmology_id', currentCosmologyId)
          .order('created_at', { ascending: false })

        if (contentError) {
          console.error('[Content] Error loading content:', contentError)
        } else {
          setContentEntries((contentData || []).map(transformContentRow))
          console.log('[Content] Loaded content entries:', contentData?.length || 0)
        }

        // Load characters by cosmology
        const { data: charData, error: charError } = await supabase
          .from('characters')
          .select('*')
          .eq('cosmology_id', currentCosmologyId)
          .order('created_at', { ascending: false })

        if (charError) {
          console.error('[Content] Error loading characters:', charError)
        } else {
          setCharacterEntries((charData || []).map(transformCharacterRow))
          console.log('[Content] Loaded character entries:', charData?.length || 0)
        }

        setError(null)
      } catch (err) {
        console.error('[Content] Load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load content')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Subscribe to content table changes
    const contentChannel = supabase
      .channel(`content:${frameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Only process if matches our cosmology
          const newCosmology = payload.new?.cosmology_id
          const oldCosmology = payload.old?.cosmology_id
          
          if (newCosmology !== currentCosmologyId && oldCosmology !== currentCosmologyId) {
            return // Not our cosmology
          }

          console.log('[Content] Change:', payload.eventType)

          if (payload.eventType === 'INSERT' && newCosmology === currentCosmologyId) {
            const newEntry = transformContentRow(payload.new)
            setContentEntries(prev => {
              if (prev.some(e => e.id === newEntry.id)) return prev
              return [newEntry, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = transformContentRow(payload.new)
            setContentEntries(prev =>
              prev.map(e => (e.id === updated.id ? updated : e))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id
            if (deletedId) {
              setContentEntries(prev => prev.filter(e => e.id !== deletedId))
            }
          }
        }
      )
      .subscribe()

    // Subscribe to characters table changes
    const charChannel = supabase
      .channel(`characters-content:${frameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'characters',
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          const newCosmology = payload.new?.cosmology_id
          const oldCosmology = payload.old?.cosmology_id
          
          if (newCosmology !== currentCosmologyId && oldCosmology !== currentCosmologyId) {
            return
          }

          console.log('[Content] Character change:', payload.eventType)

          if (payload.eventType === 'INSERT' && newCosmology === currentCosmologyId) {
            const newEntry = transformCharacterRow(payload.new)
            setCharacterEntries(prev => {
              if (prev.some(e => e.id === newEntry.id)) return prev
              return [newEntry, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = transformCharacterRow(payload.new)
            setCharacterEntries(prev =>
              prev.map(e => (e.id === updated.id ? updated : e))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id
            if (deletedId) {
              setCharacterEntries(prev => prev.filter(e => e.id !== deletedId))
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[Content] Cleaning up subscriptions')
      if (supabase) {
        supabase.removeChannel(contentChannel)
        supabase.removeChannel(charChannel)
      }
    }
  }, [frameId])

  return {
    contentEntries,
    characterEntries,
    cosmologyId,
    isLoading,
    error,
  }
}
