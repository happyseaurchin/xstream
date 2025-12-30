import type { Face } from '../types'

export interface PresentUser {
  id: string
  name: string
  face: Face
  isTyping: boolean
}

interface PresenceBarProps {
  users: PresentUser[]
}

export function PresenceBar({ users }: PresenceBarProps) {
  if (users.length === 0) return null
  
  return (
    <div className="presence-bar">
      {users.map(user => (
        <span key={user.id} className={`presence-user ${user.face}`}>
          <span className="presence-face">[{user.face.charAt(0).toUpperCase()}]</span>
          <span className="presence-name">{user.name}</span>
          {user.isTyping && <span className="presence-typing">...</span>}
        </span>
      ))}
    </div>
  )
}
