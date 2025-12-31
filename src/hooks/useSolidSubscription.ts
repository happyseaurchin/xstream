import { useEffect, useState } from 'react'
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
}

export function useSolidSubscription({
  frameId,
}: UseSolidSubscriptionOptions): UseSolidSubscriptionReturn {
  const [solidEntries, setSolidEntries] = useState<SolidEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Transform database row to SolidEntry
  const transformRow = (row: any): SolidEntry => ({
    id: row.id,
    frameId: row.frame_id,
    face: row.face,
    narrative: row.narrative,
    sourceLiquidIds: row.source_liquid_ids || [],
    participantUserIds: row.participant_user_ids || [],
    createdAt: row.created_at,
  })

  // Load initial solid entries for frame
  useEffect(() => {
    if (!frameId || !supabase) {
      setSolidEntries([])
      return
    }

    const loadSolid = async () => {
      setIsLoading(true)
      try {
        const { data, error: err } = await supabase!
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

    console.log(`[Solid] Subscribing to solid changes for frame:${frameId}`)

    const channel = supabase
      .channel(`solid:${frameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'solid',
          filter: `frame_id=eq.${frameId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[Solid] Change:', payload.eventType, payload)

          if (payload.eventType === 'INSERT') {
            const newEntry = transformRow(payload.new)
            setSolidEntries(prev => {
              // Avoid duplicates
              if (prev.some(e => e.id === newEntry.id)) return prev
              return [...prev, newEntry]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = transformRow(payload.new)
            setSolidEntries(prev =>
              prev.map(e => (e.id === updated.id ? updated : e))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id
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
      supabase!.removeChannel(channel)
    }
  }, [frameId])

  return {
    solidEntries,
    isLoading,
    error,
  }
}
