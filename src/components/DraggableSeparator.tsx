import { useCallback, useRef, useEffect } from 'react'

interface DraggableSeparatorProps {
  onDrag: (delta: number) => void
  position: 'top' | 'bottom' // Which separator (solid/liquid or liquid/vapour)
}

export function DraggableSeparator({ onDrag, position }: DraggableSeparatorProps) {
  const isDragging = useRef(false)
  const lastY = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    lastY.current = e.clientY
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = e.clientY - lastY.current
      lastY.current = e.clientY
      onDrag(delta)
    }

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [onDrag])

  return (
    <div
      className={`draggable-separator ${position}`}
      onMouseDown={handleMouseDown}
      title="Drag to resize zones"
    >
      <div className="separator-grip" />
    </div>
  )
}
