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

  // Load content and characters when frame changes
  useEffect(() => {
    if (!frameId || !supabase) {
      setContentEntries([])
      setCharacterEntries([])
      setCosmologyId(null)
      return
    }

    // Store reference to supabase for cleanup
    const sb = supabase
    let currentCosmologyId: string | null = null

    const loadData = async () => {
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

        currentCosmologyId = frameData.cosmology_id
        setCosmologyId(currentCosmologyId)

        // Load content by cosmology
        const { data: contentData, error: contentError } = await sb
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
        const { data: charData, error: charError } = await sb
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
    const contentChannel = sb
      .channel(`content:${frameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content',
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          // Only process if matches our cosmology
          const newRecord = payload.new as Record<string, unknown> | undefined
          const oldRecord = payload.old as Record<string, unknown> | undefined
          const newCosmology = newRecord?.cosmology_id as string | undefined
          const oldCosmology = oldRecord?.cosmology_id as string | undefined
          
          if (newCosmology !== currentCosmologyId && oldCosmology !== currentCosmologyId) {
            return // Not our cosmology
          }

          console.log('[Content] Change:', payload.eventType)

          if (payload.eventType === 'INSERT' && newRecord && newCosmology === currentCosmologyId) {
            const newEntry = transformContentRow(newRecord)
            setContentEntries(prev => {
              if (prev.some(e => e.id === newEntry.id)) return prev
              return [newEntry, ...prev]
            })
          } else if (payload.eventType === 'UPDATE' && newRecord) {
            const updated = transformContentRow(newRecord)
            setContentEntries(prev =>
              prev.map(e => (e.id === updated.id ? updated : e))
            )
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            const deletedId = oldRecord.id as string | undefined
            if (deletedId) {
              setContentEntries(prev => prev.filter(e => e.id !== deletedId))
            }
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
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const newRecord = payload.new as Record<string, unknown> | undefined
          const oldRecord = payload.old as Record<string, unknown> | undefined
          const newCosmology = newRecord?.cosmology_id as string | undefined
          const oldCosmology = oldRecord?.cosmology_id as string | undefined
          
          if (newCosmology !== currentCosmologyId && oldCosmology !== currentCosmologyId) {
            return
          }

          console.log('[Content] Character change:', payload.eventType)

          if (payload.eventType === 'INSERT' && newRecord && newCosmology === currentCosmologyId) {
            const newEntry = transformCharacterRow(newRecord)
            setCharacterEntries(prev => {
              if (prev.some(e => e.id === newEntry.id)) return prev
              return [newEntry, ...prev]
            })
          } else if (payload.eventType === 'UPDATE' && newRecord) {
            const updated = transformCharacterRow(newRecord)
            setCharacterEntries(prev =>
              prev.map(e => (e.id === updated.id ? updated : e))
            )
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            const deletedId = oldRecord.id as string | undefined
            if (deletedId) {
              setCharacterEntries(prev => prev.filter(e => e.id !== deletedId))
            }
          }
        }
      )
      .subscribe()

    return () => {
      console.log('[Content] Cleaning up subscriptions')
      sb.removeChannel(contentChannel)
      sb.removeChannel(charChannel)
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
