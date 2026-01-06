import { useCallback, useRef, useEffect, useState } from "react";

interface ZoneSeparatorProps {
  onDrag: (delta: number) => void;
  className?: string;
}

export function ZoneSeparator({ onDrag, className = "" }: ZoneSeparatorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientY - startY.current;
      startY.current = e.clientY;
      onDrag(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onDrag]);

  return (
    <div
      className={`separator-handle ${isDragging ? "opacity-100" : "opacity-60 hover:opacity-100"} ${className}`}
      onMouseDown={handleMouseDown}
    />
  );
}
