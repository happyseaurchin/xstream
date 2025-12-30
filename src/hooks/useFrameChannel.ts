import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types for multi-user coordination
export type Face = 'player' | 'author' | 'designer'

export interface PresenceUser {
  id: string
  name: string
  face: Face
  isTyping: boolean
  lastSeen: string
}

export interface UseFrameChannelOptions {
  frameId: string | null
  userId: string
  userName: string
  face: Face
}

export interface UseFrameChannelReturn {
  // Presence state
  presentUsers: PresenceUser[]
  isConnected: boolean
  
  // Actions
  broadcastTyping: (isTyping: boolean) => void
  
  // Error state
  error: string | null
}

// Throttle typing broadcasts
const TYPING_THROTTLE_MS = 1000

export function useFrameChannel({
  frameId,
  userId,
  userName,
  face,
}: UseFrameChannelOptions): UseFrameChannelReturn {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastTypingBroadcast = useRef<number>(0)

  // Subscribe to frame channel when frameId changes
  useEffect(() => {
    // Clean up previous channel
    if (channelRef.current) {
      console.log('[Channel] Cleaning up previous channel')
      supabase?.removeChannel(channelRef.current)
      channelRef.current = null
      setPresentUsers([])
      setIsConnected(false)
    }

    // No frame selected or no supabase client
    if (!frameId || !supabase) {
      console.log('[Channel] No frame selected or Supabase not configured')
      return
    }

    console.log(`[Channel] Subscribing to frame:${frameId}`)
    
    // Create channel for this frame
    const channel = supabase.channel(`frame:${frameId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    // Handle presence sync (when presence state changes)
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      console.log('[Presence] Sync:', state)
      
      const users: PresenceUser[] = []
      
      for (const [_key, presences] of Object.entries(state)) {
        // Get the most recent presence for this user
        const presence = presences[0] as any
        if (presence && presence.user_id !== userId) {
          users.push({
            id: presence.user_id,
            name: presence.user_name || `User-${presence.user_id.slice(0, 4)}`,
            face: presence.face || 'player',
            isTyping: presence.is_typing || false,
            lastSeen: new Date().toISOString(),
          })
        }
      }
      
      setPresentUsers(users)
    })

    // Handle user join
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('[Presence] Join:', key, newPresences)
    })

    // Handle user leave
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Presence] Leave:', key, leftPresences)
    })

    // Subscribe and track our presence
    channel
      .subscribe(async (status) => {
        console.log('[Channel] Status:', status)
        
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          setError(null)
          
          // Track our presence
          const trackResult = await channel.track({
            user_id: userId,
            user_name: userName,
            face: face,
            is_typing: false,
            online_at: new Date().toISOString(),
          })
          
          console.log('[Presence] Tracked self:', trackResult)
        } else if (status === 'CHANNEL_ERROR') {
          setError('Channel connection error')
          setIsConnected(false)
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    // Cleanup on unmount or frame change
    return () => {
      console.log('[Channel] Cleanup effect running')
      if (channelRef.current) {
        supabase?.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [frameId, userId, userName, face])

  // Update face in presence when it changes
  useEffect(() => {
    if (!channelRef.current || !isConnected) return
    
    console.log('[Presence] Updating face to:', face)
    channelRef.current.track({
      user_id: userId,
      user_name: userName,
      face: face,
      is_typing: false,
      online_at: new Date().toISOString(),
    })
  }, [face, isConnected, userId, userName])

  // Broadcast typing state (throttled)
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!channelRef.current || !isConnected) return
    
    const now = Date.now()
    if (isTyping && now - lastTypingBroadcast.current < TYPING_THROTTLE_MS) {
      return // Throttle typing=true broadcasts
    }
    
    lastTypingBroadcast.current = now
    
    channelRef.current.track({
      user_id: userId,
      user_name: userName,
      face: face,
      is_typing: isTyping,
      online_at: new Date().toISOString(),
    })
  }, [isConnected, userId, userName, face])

  return {
    presentUsers,
    isConnected,
    broadcastTyping,
    error,
  }
}

// Helper to get/set display name
export function getDisplayName(): string {
  const stored = localStorage.getItem('xstream_display_name')
  if (stored) return stored
  
  // Generate a default name
  const adjectives = ['Swift', 'Bright', 'Calm', 'Bold', 'Keen', 'True', 'Wild', 'Wise']
  const nouns = ['Fox', 'Hawk', 'Wolf', 'Bear', 'Owl', 'Sage', 'Star', 'Wave']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const defaultName = `${adj}${noun}`
  
  localStorage.setItem('xstream_display_name', defaultName)
  return defaultName
}

export function setDisplayName(name: string): void {
  localStorage.setItem('xstream_display_name', name)
}
