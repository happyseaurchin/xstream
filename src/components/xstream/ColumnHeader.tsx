import { useState } from "react";
import { Settings, MoreHorizontal, ChevronDown, Users, FolderOpen } from "lucide-react";
import { Face } from "@/types/xstream";

interface ColumnHeaderProps {
  face: Face;
  frame: string;
  character?: string;
  stateCode: string;
  presenceCount: number;
  isConnected?: boolean;
  // Character selection (extended from vapor-flow)
  characters?: Array<{ id: string; name: string; is_npc: boolean; inhabited_by: string | null }>;
  selectedCharacterId?: string | null;
  currentUserId?: string;
  onCharacterSelect?: (id: string | null) => void;
  // Frame selection (extended from vapor-flow)
  frames?: Array<{ id: string | null; name: string }>;
  selectedFrameId?: string | null;
  onFrameSelect?: (id: string | null) => void;
  // Actions
  onFaceChange: (face: Face) => void;
  onDirectoryToggle: () => void;
  onFilterToggle: () => void;
  onDetailsToggle: () => void;
  // Active states
  isDirectoryOpen?: boolean;
  isFilterOpen?: boolean;
}

export function ColumnHeader({
  face,
  frame,
  character,
  stateCode,
  presenceCount,
  isConnected = true,
  characters = [],
  selectedCharacterId,
  currentUserId,
  onCharacterSelect,
  frames = [],
  selectedFrameId,
  onFrameSelect,
  onFaceChange,
  onDirectoryToggle,
  onFilterToggle,
  onDetailsToggle,
  isDirectoryOpen = false,
  isFilterOpen = false,
}: ColumnHeaderProps) {
  const [showFaceMenu, setShowFaceMenu] = useState(false);
  const [showFrameMenu, setShowFrameMenu] = useState(false);

  const faceLabels: Record<Face, string> = {
    character: "Character",
    author: "Author",
    designer: "Designer",
  };

  const faceColorVars: Record<Face, string> = {
    character: "hsl(var(--face-character))",
    author: "hsl(var(--face-author))",
    designer: "hsl(var(--face-designer))",
  };

  return (
    <div className="relative" style={{ zIndex: 20 }}>
      {/* Face accent strip */}
      <div 
        className="face-accent-strip" 
        style={{ background: faceColorVars[face] }}
      />
      
      {/* Header content */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Character avatar (only shown for character face when character selected) */}
          {face === "character" && character && (
            <span 
              className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
              style={{ background: faceColorVars[face] }}
            >
              {character.charAt(0).toUpperCase()}
            </span>
          )}
          
          {/* Face selector */}
          <div className="relative">
            <button
              onClick={() => setShowFaceMenu(!showFaceMenu)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                showFaceMenu 
                  ? "bg-accent text-accent-foreground" 
                  : "hover:bg-accent/50"
              }`}
            >
              <span 
                className="h-2 w-2 rounded-full" 
                style={{ background: faceColorVars[face] }}
              />
              {faceLabels[face]}
              <ChevronDown className="h-3 w-3" />
            </button>
            
            {showFaceMenu && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-popover border border-border rounded-md shadow-lg z-20 min-w-[120px] animate-fade-in">
                {(["character", "author", "designer"] as Face[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      onFaceChange(f);
                      setShowFaceMenu(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
                      face === f ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span 
                      className="h-2 w-2 rounded-full" 
                      style={{ background: faceColorVars[f] }}
                    />
                    {faceLabels[f]}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Presence indicator */}
          <div className="presence-indicator flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted-foreground animate-pulse'}`} />
            {presenceCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Users className="h-3 w-3" />
                +{presenceCount}
              </span>
            )}
          </div>
        </div>
        
        {/* Center - state code */}
        <div className="flex items-center gap-2">
          <span className="column-badge">{stateCode}</span>
          <button
            onClick={onDetailsToggle}
            className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Details"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Directory toggle */}
          <button
            onClick={onDirectoryToggle}
            className={`p-1 rounded transition-colors ${
              isDirectoryOpen 
                ? "bg-accent text-accent-foreground" 
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
            }`}
            title="Directory"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
          
          {/* Filter toggle */}
          <button
            onClick={onFilterToggle}
            className={`p-1 rounded transition-colors ${
              isFilterOpen 
                ? "bg-accent text-accent-foreground" 
                : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
            }`}
            title="Filters"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
          
          {/* Frame selector */}
          <div className="relative">
            <button 
              onClick={() => setShowFrameMenu(!showFrameMenu)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>{frame}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            
            {showFrameMenu && frames.length > 0 && (
              <div className="absolute top-full right-0 mt-1 py-1 bg-popover border border-border rounded-md shadow-lg z-20 min-w-[160px] animate-fade-in">
                {frames.map((f) => (
                  <button
                    key={f.id || 'none'}
                    onClick={() => {
                      onFrameSelect?.(f.id);
                      setShowFrameMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
                      selectedFrameId === f.id ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
