import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type Face = 'player' | 'author' | 'designer'

export interface LiquidEntry {
  id: string
  frameId: string | null
  userId: string
  userName: string
  face: Face
  content: string
  softLlmResponse: string | null
  committed: boolean
  createdAt: string
  updatedAt: string
}

export interface UseLiquidSubscriptionOptions {
  frameId: string | null
  userId: string
}

export interface UseLiquidSubscriptionReturn {
  // All liquid entries in the frame
  liquidEntries: LiquidEntry[]
  
  // Actions
  upsertLiquid: (data: {
    userName: string
    face: Face
    content: string
    softLlmResponse?: string | null
  }) => Promise<void>
  markCommitted: (entryId: string) => Promise<void>
  deleteLiquid: () => Promise<void>
  
  // State
  isLoading: boolean
  error: string | null
}

export function useLiquidSubscription({
  frameId,
  userId,
}: UseLiquidSubscriptionOptions): UseLiquidSubscriptionReturn {
  const [liquidEntries, setLiquidEntries] = useState<LiquidEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Transform database row to LiquidEntry
  const transformRow = (row: any): LiquidEntry => ({
    id: row.id,
    frameId: row.frame_id,
    userId: row.user_id,
    userName: row.user_name,
    face: row.face,
    content: row.content,
    softLlmResponse: row.soft_llm_response,
    committed: row.committed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })

  // Load initial liquid entries for frame
  useEffect(() => {
    if (!frameId || !supabase) {
      setLiquidEntries([])
      return
    }

    const loadLiquid = async () => {
      setIsLoading(true)
      try {
        const { data, error: err } = await supabase!
          .from('liquid')
          .select('*')
          .eq('frame_id', frameId)
          .order('created_at', { ascending: true })

        if (err) throw err
        setLiquidEntries((data || []).map(transformRow))
        setError(null)
      } catch (err) {
        console.error('[Liquid] Load error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load liquid')
      } finally {
        setIsLoading(false)
      }
    }

    loadLiquid()
  }, [frameId])

  // Subscribe to liquid table changes
  useEffect(() => {
    if (!frameId || !supabase) return

    console.log(`[Liquid] Subscribing to liquid changes for frame:${frameId}`)

    const channel = supabase
      .channel(`liquid:${frameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'liquid',
          filter: `frame_id=eq.${frameId}`,
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('[Liquid] Change:', payload.eventType, payload)

          if (payload.eventType === 'INSERT') {
            const newEntry = transformRow(payload.new)
            setLiquidEntries(prev => {
              // Avoid duplicates
              if (prev.some(e => e.id === newEntry.id)) return prev
              return [...prev, newEntry]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = transformRow(payload.new)
            setLiquidEntries(prev =>
              prev.map(e => (e.id === updated.id ? updated : e))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old?.id
            if (deletedId) {
              setLiquidEntries(prev => prev.filter(e => e.id !== deletedId))
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Liquid] Subscription status:', status)
      })

    return () => {
      console.log('[Liquid] Unsubscribing')
      supabase!.removeChannel(channel)
    }
  }, [frameId])

  // Upsert liquid entry (one per user per frame)
  const upsertLiquid = useCallback(async (data: {
    userName: string
    face: Face
    content: string
    softLlmResponse?: string | null
  }) => {
    if (!frameId || !supabase) return

    try {
      const { error: err } = await supabase
        .from('liquid')
        .upsert({
          frame_id: frameId,
          user_id: userId,
          user_name: data.userName,
          face: data.face,
          content: data.content,
          soft_llm_response: data.softLlmResponse || null,
          committed: false,
        }, {
          onConflict: 'frame_id,user_id',
        })

      if (err) throw err
      console.log('[Liquid] Upserted successfully')
    } catch (err) {
      console.error('[Liquid] Upsert error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save liquid')
    }
  }, [frameId, userId])

  // Mark liquid as committed
  const markCommitted = useCallback(async (entryId: string) => {
    if (!supabase) return

    try {
      const { error: err } = await supabase
        .from('liquid')
        .update({ committed: true })
        .eq('id', entryId)

      if (err) throw err
      console.log('[Liquid] Marked committed:', entryId)
    } catch (err) {
      console.error('[Liquid] Mark committed error:', err)
      setError(err instanceof Error ? err.message : 'Failed to update liquid')
    }
  }, [])

  // Delete user's liquid entry
  const deleteLiquid = useCallback(async () => {
    if (!frameId || !supabase) return

    try {
      const { error: err } = await supabase
        .from('liquid')
        .delete()
        .eq('frame_id', frameId)
        .eq('user_id', userId)

      if (err) throw err
      console.log('[Liquid] Deleted')
    } catch (err) {
      console.error('[Liquid] Delete error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete liquid')
    }
  }, [frameId, userId])

  return {
    liquidEntries,
    upsertLiquid,
    markCommitted,
    deleteLiquid,
    isLoading,
    error,
  }
}
