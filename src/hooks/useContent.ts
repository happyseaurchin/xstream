/**
 * useContent - Hook for content table operations
 *
 * Provides:
 * - Insert/update/delete content
 * - Real-time subscription to proximate content
 * - Proximity filtering
 */

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { ContentRow, Content, Coordinates, Shelf } from '../types'
import { prefixPattern, areProximate } from '../lib/pscale'

interface UseContentOptions {
  /** Current user's coordinates */
  coordinates: Coordinates
  /** Which shelf states to subscribe to */
  shelves?: Shelf[]
  /** User ID for isSelf calculation */
  userId?: string
}

interface UseContentReturn {
  /** All proximate content */
  content: Content[]
  /** Loading state */
  loading: boolean
  /** Error state */
  error: Error | null
  /** Insert new content */
  insert: (text: string, shelf: Shelf) => Promise<ContentRow | null>
  /** Update content shelf state */
  updateShelf: (id: string, shelf: Shelf) => Promise<boolean>
  /** Delete content */
  remove: (id: string) => Promise<boolean>
}

export function useContent({
  coordinates,
  shelves = ['liquid', 'solid'],
  userId
}: UseContentOptions): UseContentReturn {
  const [content, setContent] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Fetch initial content
  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const fetchContent = async () => {
      try {
        // Query by spatial prefix (main proximity dimension)
        const sPattern = prefixPattern(coordinates.s)

        const { data, error: fetchError } = await supabase
          .from('content')
          .select('*')
          .in('shelf', shelves)
          .or(`s.like.${sPattern},s.eq.0.31,s.eq.0.32,s.eq.0.33`)  // Include skills

        if (fetchError) throw fetchError

        const enriched: Content[] = (data || []).map(row => ({
          ...row,
          isSelf: row.created_by === userId
        }))

        setContent(enriched)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchContent()
  }, [coordinates.s, shelves, userId])

  // Real-time subscription
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('content-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'content'
        },
        (payload) => {
          const row = payload.new as ContentRow | null
          const oldRow = payload.old as ContentRow | null

          if (payload.eventType === 'INSERT' && row) {
            // Check proximity before adding
            const rowCoords: Coordinates = { t: row.t, s: row.s, i: row.i }
            const prox = areProximate(coordinates, rowCoords)

            if (prox === 'close' || prox === 'nearby' || row.s.startsWith('0.')) {
              setContent(prev => [...prev, {
                ...row,
                isSelf: row.created_by === userId
              }])
            }
          }

          if (payload.eventType === 'UPDATE' && row) {
            setContent(prev => prev.map(c =>
              c.id === row.id ? { ...row, isSelf: row.created_by === userId } : c
            ))
          }

          if (payload.eventType === 'DELETE' && oldRow) {
            setContent(prev => prev.filter(c => c.id !== oldRow.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [coordinates, userId])

  // Insert content
  const insert = useCallback(async (text: string, shelf: Shelf): Promise<ContentRow | null> => {
    if (!supabase || !userId) return null

    const { data, error: insertError } = await supabase
      .from('content')
      .insert({
        t: coordinates.t,
        s: coordinates.s,
        i: coordinates.i,
        shelf,
        text,
        created_by: userId
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError)
      return null
    }

    return data
  }, [coordinates, userId])

  // Update shelf state
  const updateShelf = useCallback(async (id: string, shelf: Shelf): Promise<boolean> => {
    if (!supabase) return false

    const { error: updateError } = await supabase
      .from('content')
      .update({ shelf })
      .eq('id', id)

    if (updateError) {
      setError(updateError)
      return false
    }

    return true
  }, [])

  // Delete content
  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!supabase) return false

    const { error: deleteError } = await supabase
      .from('content')
      .delete()
      .eq('id', id)

    if (deleteError) {
      setError(deleteError)
      return false
    }

    return true
  }, [])

  return { content, loading, error, insert, updateShelf, remove }
}
