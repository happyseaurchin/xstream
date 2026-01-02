import type { Face } from '../types'

interface FaceIconProps {
  face: Face
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const FACE_CONFIG: Record<Face, { icon: string; label: string; color: string }> = {
  character: { icon: '🎭', label: 'Character', color: 'var(--color-liquid, #fbbf24)' },
  author: { icon: '📖', label: 'Author', color: 'var(--color-vapor, #a78bfa)' },
  designer: { icon: '⚙️', label: 'Designer', color: 'var(--color-accent)' },
}

export function FaceIcon({ face, size = 'md', showLabel = false }: FaceIconProps) {
  const config = FACE_CONFIG[face]
  
  const sizeClass = {
    sm: 'face-icon-sm',
    md: 'face-icon-md',
    lg: 'face-icon-lg',
  }[size]

  return (
    <span 
      className={`face-icon ${sizeClass}`} 
      style={{ '--face-color': config.color } as React.CSSProperties}
      title={config.label}
    >
      <span className="face-icon-emoji">{config.icon}</span>
      {showLabel && <span className="face-icon-label">{config.label}</span>}
    </span>
  )
}

export function getFaceEmoji(face: Face): string {
  return FACE_CONFIG[face]?.icon || '❓'
}
