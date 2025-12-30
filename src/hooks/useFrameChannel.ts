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

// Vapor content from other users (live typing)
export interface VaporContent {
  userId: string
  userName: string
  face: Face
  text: string
  timestamp: number
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
  
  // Live vapor from others
  othersVapor: VaporContent[]
  
  // Actions
  broadcastVapor: (text: string) => void
  
  // Error state
  error: string | null
}

// Throttle vapor broadcasts to ~50ms for character-by-character feel
const VAPOR_THROTTLE_MS = 50

export function useFrameChannel({
  frameId,
  userId,
  userName,
  face,
}: UseFrameChannelOptions): UseFrameChannelReturn {
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [othersVapor, setOthersVapor] = useState<VaporContent[]>([])
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastVaporBroadcast = useRef<number>(0)

  // Subscribe to frame channel when frameId changes
  useEffect(() => {
    // Clean up previous channel
    if (channelRef.current) {
      console.log('[Channel] Cleaning up previous channel')
      supabase?.removeChannel(channelRef.current)
      channelRef.current = null
      setPresentUsers([])
      setOthersVapor([])
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

    // Handle user leave - clear their vapor
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('[Presence] Leave:', key, leftPresences)
      const leftUserId = (leftPresences[0] as any)?.user_id
      if (leftUserId) {
        setOthersVapor(prev => prev.filter(v => v.userId !== leftUserId))
      }
    })

    // Handle vapor broadcasts from others
    channel.on('broadcast', { event: 'vapor' }, ({ payload }) => {
      if (payload.user_id === userId) return // Ignore own broadcasts
      
      console.log('[Vapor] Received:', payload.user_name, payload.text?.slice(0, 20))
      
      setOthersVapor(prev => {
        // Update or add vapor for this user
        const existing = prev.findIndex(v => v.userId === payload.user_id)
        const newVapor: VaporContent = {
          userId: payload.user_id,
          userName: payload.user_name,
          face: payload.face,
          text: payload.text || '',
          timestamp: Date.now(),
        }
        
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = newVapor
          return updated
        } else if (payload.text) {
          return [...prev, newVapor]
        }
        return prev
      })
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

  // Broadcast vapor text (throttled for character-by-character)
  const broadcastVapor = useCallback((text: string) => {
    if (!channelRef.current || !isConnected) return
    
    const now = Date.now()
    if (now - lastVaporBroadcast.current < VAPOR_THROTTLE_MS) {
      return // Throttle
    }
    
    lastVaporBroadcast.current = now
    
    // Update presence typing state
    const isTyping = text.length > 0
    channelRef.current.track({
      user_id: userId,
      user_name: userName,
      face: face,
      is_typing: isTyping,
      online_at: new Date().toISOString(),
    })
    
    // Broadcast actual vapor content
    channelRef.current.send({
      type: 'broadcast',
      event: 'vapor',
      payload: {
        user_id: userId,
        user_name: userName,
        face: face,
        text: text,
      },
    })
  }, [isConnected, userId, userName, face])

  // Clean up stale vapor (older than 5 seconds with no updates)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const cutoff = Date.now() - 5000
      setOthersVapor(prev => prev.filter(v => v.timestamp > cutoff || v.text.length > 0))
    }, 2000)
    
    return () => clearInterval(cleanup)
  }, [])

  return {
    presentUsers,
    isConnected,
    othersVapor,
    broadcastVapor,
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
