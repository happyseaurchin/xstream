import { useState, useEffect, useCallback, useRef } from "react";
import { Hash, Plus, User, LogOut, Palette, X, GripVertical } from "lucide-react";
import { Theme } from "../../types/vapor-flow-ui";

interface ConstructionButtonProps {
  onAddColumn: () => void;
  onThemeChange: (theme: Theme) => void;
  onLogout: () => void;
  currentTheme: Theme;
}

const STORAGE_KEY = "xstream-construction-btn-pos";

export function ConstructionButton({
  onAddColumn,
  onThemeChange,
  onLogout,
  currentTheme,
}: ConstructionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 70, y: window.innerHeight - 120 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragStart.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragStart.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const themes: { value: Theme; label: string }[] = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
    { value: "cyber", label: "Cyber" },
    { value: "soft", label: "Soft" },
  ];

  return (
    <div
      ref={buttonRef}
      className="fixed z-50"
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
    >
      {/* Menu */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 w-56 glass rounded-lg overflow-hidden shadow-lg animate-slide-up">
          <div className="px-4 py-3 border-b border-border/50">
            <span className="text-sm font-medium">Construction</span>
          </div>
          
          <div className="py-1">
            <button
              onClick={() => {
                onAddColumn();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors"
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              Add Column
            </button>
            
            <div className="px-2 py-1">
              <div className="flex items-center gap-3 px-2 py-1.5 text-sm">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span>Theme</span>
              </div>
              <div className="flex gap-1 px-2 py-1">
                {themes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => onThemeChange(theme.value)}
                    className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                      currentTheme === theme.value 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted/50 hover:bg-accent/50"
                    }`}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent/50 transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </button>
            
            <div className="border-t border-border/50 mt-1 pt-1">
              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
          
          <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
            <span className="text-[10px] text-muted-foreground font-mono">
              v0.11.0
            </span>
          </div>
        </div>
      )}
      
      {/* Drag handle + Main button */}
      <div className={`flex items-center gap-1 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}>
        <div className="p-1 text-muted-foreground opacity-50 hover:opacity-100 transition-opacity">
          <GripVertical className="h-4 w-4" />
        </div>
        <button
        onClick={() => {
          if (!isDragging) {
            setIsOpen(!isOpen);
          }
        }}
          className={`floating-button ${isOpen ? "rotate-45" : ""} transition-transform duration-200`}
          style={{ position: "relative" }}
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Hash className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
