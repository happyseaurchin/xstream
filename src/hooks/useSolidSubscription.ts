import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type Face = 'player' | 'author' | 'designer'

export interface SolidEntry {
  id: string
  frameId: string
  face: Face
  narrative: string | null
  sourceLiquidIds: string[]
  participantUserIds: string[]
  createdAt: string
}

export interface UseSolidSubscriptionOptions {
  frameId: string | null
}

export interface UseSolidSubscriptionReturn {
  solidEntries: SolidEntry[]
  isLoading: boolean
  error: string | null
  clearSolid: () => Promise<void>  // Phase 0.10.3.2: Clear all solid entries for frame
}

export function useSolidSubscription({
  frameId,
}: UseSolidSubscriptionOptions): UseSolidSubscriptionReturn {
  const [solidEntries, setSolidEntries] = useState<SolidEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Transform database row to SolidEntry
  const transformRow = (row: Record<string, unknown>): SolidEntry => ({
    id: row.id as string,
    frameId: row.frame_id as string,
    face: row.face as Face,
    narrative: row.narrative as string | null,
    sourceLiquidIds: (row.source_liquid_ids as string[]) || [],
    participantUserIds: (row.participant_user_ids as string[]) || [],
    createdAt: row.created_at as string,
  })

  // Load initial solid entries for frame
  useEffect(() => {
    if (!frameId || !supabase) {
      setSolidEntries([])
      return
    }

    // Capture supabase reference for async use
    const sb = supabase

    const loadSolid = async () => {
      setIsLoading(true)
      try {
        const { data, error: err } = await sb
          .from('solid')
          .select('*')
          .eq('frame_id', frameId)
          .order('created_at', { ascending: true })

        if (err) throw err
        setSolidEntries((data || []).map(transformRow))
        setError(null)
      } catch (err) {
        console.error('[Solid] Load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load solid')
      } finally {
        setIsLoading(false)
      }
    }

    loadSolid()
  }, [frameId])

  // Subscribe to solid table changes
  useEffect(() => {
    if (!frameId || !supabase) return

    const sb = supabase
    console.log(`[Solid] Subscribing to solid changes for frame:${frameId}`)

    const channel = sb
      .channel(`solid:${frameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solid',
          filter: `frame_id=eq.${frameId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[Solid] Change:', payload.eventType)

          const newRecord = payload.new as Record<string, unknown> | undefined
          const oldRecord = payload.old as Record<string, unknown> | undefined

          if (payload.eventType === 'INSERT' && newRecord) {
            const newEntry = transformRow(newRecord)
            setSolidEntries(prev => {
              // Avoid duplicates
              if (prev.some(e => e.id === newEntry.id)) return prev
              return [...prev, newEntry]
            })
          } else if (payload.eventType === 'UPDATE' && newRecord) {
            const updated = transformRow(newRecord)
            setSolidEntries(prev =>
              prev.map(e => (e.id === updated.id ? updated : e))
            )
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            const deletedId = oldRecord.id as string | undefined
            if (deletedId) {
              setSolidEntries(prev => prev.filter(e => e.id !== deletedId))
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Solid] Subscription status:', status)
      })

    return () => {
      console.log('[Solid] Unsubscribing')
      sb.removeChannel(channel)
    }
  }, [frameId])

  // Phase 0.10.3.2: Clear all solid entries for current frame
  const clearSolid = useCallback(async () => {
    if (!frameId || !supabase) return

    const sb = supabase
    console.log('[Solid] Clearing all solid entries for frame:', frameId)
    try {
      const { error: err } = await sb
        .from('solid')
        .delete()
        .eq('frame_id', frameId)

      if (err) {
        console.error('[Solid] Clear error:', err)
        throw err
      }

      // Local state will update via realtime subscription
      console.log('[Solid] Cleared successfully')
    } catch (err) {
      console.error('[Solid] Clear failed:', err)
    }
  }, [frameId])

  return {
    solidEntries,
    isLoading,
    error,
    clearSolid,
  }
}
