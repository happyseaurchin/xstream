import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Character {
  id: string
  name: string
  description: string | null
  appearance: string | null
  createdBy: string
  inhabitedBy: string | null
  isNpc: boolean
  cosmologyId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateCharacterInput {
  name: string
  description?: string
  appearance?: string
  isNpc?: boolean
}

export interface UseCharactersReturn {
  characters: Character[]
  myCharacter: Character | null
  isLoading: boolean
  error: string | null
  createCharacter: (input: CreateCharacterInput) => Promise<Character | null>
  updateCharacter: (id: string, updates: Partial<CreateCharacterInput>) => Promise<boolean>
  deleteCharacter: (id: string) => Promise<boolean>
  inhabitCharacter: (characterId: string) => Promise<boolean>
  leaveCharacter: () => Promise<boolean>
}

export function useCharacters(userId: string | null): UseCharactersReturn {
  const [characters, setCharacters] = useState<Character[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Map database row to Character interface
  const mapRow = (row: Record<string, unknown>): Character => ({
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    appearance: row.appearance as string | null,
    createdBy: row.created_by as string,
    inhabitedBy: row.inhabited_by as string | null,
    isNpc: row.is_npc as boolean,
    cosmologyId: row.cosmology_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  })

  // Load characters
  const loadCharacters = useCallback(async () => {
    if (!supabase || !userId) {
      setIsLoading(false)
      return
    }

    try {
      const { data, error: err } = await supabase
        .from('characters')
        .select('*')
        .or(`created_by.eq.${userId},inhabited_by.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (err) {
        console.error('[Characters] Load error:', err)
        setError(err.message)
        return
      }

      setCharacters((data || []).map(mapRow))
    } catch (err) {
      console.error('[Characters] Load exception:', err)
      setError(err instanceof Error ? err.message : 'Failed to load characters')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadCharacters()
  }, [loadCharacters])

  // Subscribe to changes
  useEffect(() => {
    if (!supabase || !userId) return

    const channel = supabase
      .channel('characters-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'characters' },
        () => {
          loadCharacters()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, loadCharacters])

  // Derived: character I'm currently inhabiting
  const myCharacter = characters.find(c => c.inhabitedBy === userId) || null

  const createCharacter = useCallback(async (input: CreateCharacterInput): Promise<Character | null> => {
    if (!supabase || !userId) {
      setError('Not authenticated')
      return null
    }

    setError(null)

    try {
      const { data, error: err } = await supabase
        .from('characters')
        .insert({
          name: input.name,
          description: input.description || null,
          appearance: input.appearance || null,
          is_npc: input.isNpc || false,
          created_by: userId,
          inhabited_by: input.isNpc ? null : userId, // Auto-inhabit if not NPC
        })
        .select()
        .single()

      if (err) {
        setError(err.message)
        return null
      }

      const character = mapRow(data)
      setCharacters(prev => [character, ...prev])
      return character
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character')
      return null
    }
  }, [userId])

  const updateCharacter = useCallback(async (id: string, updates: Partial<CreateCharacterInput>): Promise<boolean> => {
    if (!supabase) {
      setError('Not authenticated')
      return false
    }

    setError(null)

    try {
      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.appearance !== undefined) dbUpdates.appearance = updates.appearance
      if (updates.isNpc !== undefined) dbUpdates.is_npc = updates.isNpc

      const { error: err } = await supabase
        .from('characters')
        .update(dbUpdates)
        .eq('id', id)

      if (err) {
        setError(err.message)
        return false
      }

      setCharacters(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates, updatedAt: dbUpdates.updated_at as string } : c
      ))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update character')
      return false
    }
  }, [])

  const deleteCharacter = useCallback(async (id: string): Promise<boolean> => {
    if (!supabase) {
      setError('Not authenticated')
      return false
    }

    setError(null)

    try {
      const { error: err } = await supabase
        .from('characters')
        .delete()
        .eq('id', id)

      if (err) {
        setError(err.message)
        return false
      }

      setCharacters(prev => prev.filter(c => c.id !== id))
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete character')
      return false
    }
  }, [])

  const inhabitCharacter = useCallback(async (characterId: string): Promise<boolean> => {
    if (!supabase || !userId) {
      setError('Not authenticated')
      return false
    }

    setError(null)

    try {
      // First, leave any currently inhabited character
      await supabase
        .from('characters')
        .update({ inhabited_by: null })
        .eq('inhabited_by', userId)

      // Then inhabit the new one
      const { error: err } = await supabase
        .from('characters')
        .update({ inhabited_by: userId })
        .eq('id', characterId)

      if (err) {
        setError(err.message)
        return false
      }

      await loadCharacters()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to inhabit character')
      return false
    }
  }, [userId, loadCharacters])

  const leaveCharacter = useCallback(async (): Promise<boolean> => {
    if (!supabase || !userId) {
      setError('Not authenticated')
      return false
    }

    setError(null)

    try {
      const { error: err } = await supabase
        .from('characters')
        .update({ inhabited_by: null })
        .eq('inhabited_by', userId)

      if (err) {
        setError(err.message)
        return false
      }

      await loadCharacters()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave character')
      return false
    }
  }, [userId, loadCharacters])

  return {
    characters,
    myCharacter,
    isLoading,
    error,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    inhabitCharacter,
    leaveCharacter,
  }
}
