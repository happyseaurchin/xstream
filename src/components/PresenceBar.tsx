import type { Face } from '../types'
import { FaceIcon } from './FaceIcon'

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
          <FaceIcon face={user.face} size="sm" />
          <span className="presence-name">{user.name}</span>
          {user.isTyping && <span className="presence-typing">...</span>}
        </span>
      ))}
    </div>
  )
}
