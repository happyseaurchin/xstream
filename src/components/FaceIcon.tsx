import type { Face } from '../types'

interface FaceIconProps {
  face: Face | string  // Allow string for backwards compatibility
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const FACE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  // Phase 0.9.0: Primary name
  character: { icon: '🎭', label: 'Character', color: 'var(--color-liquid, #fbbf24)' },
  author: { icon: '📖', label: 'Author', color: 'var(--color-vapor, #a78bfa)' },
  designer: { icon: '⚙️', label: 'Designer', color: 'var(--color-accent)' },
  // Legacy alias for backwards compatibility with presence data
  player: { icon: '🎭', label: 'Character', color: 'var(--color-liquid, #fbbf24)' },
}

// Default fallback for unknown faces
const DEFAULT_CONFIG = { icon: '❓', label: 'Unknown', color: 'var(--color-text-secondary)' }

export function FaceIcon({ face, size = 'md', showLabel = false }: FaceIconProps) {
  const config = FACE_CONFIG[face] || DEFAULT_CONFIG
  
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

export function getFaceEmoji(face: Face | string): string {
  return FACE_CONFIG[face]?.icon || DEFAULT_CONFIG.icon
}
