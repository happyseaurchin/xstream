import { useState } from "react";
import { Settings, MoreHorizontal, ChevronDown, Users, LogOut } from "lucide-react";
import type { Face } from "@/types";

interface Frame {
  id: string | null;
  name: string;
  xyz: string;
}

interface AppHeaderProps {
  face: Face;
  frameId: string | null;
  frames: Frame[];
  userName: string;
  characterName?: string;
  presenceCount: number;
  isConnected: boolean;
  stateCode: string;
  onFaceChange: (face: Face) => void;
  onFrameChange: (frameId: string | null) => void;
  onSettingsToggle: () => void;
  onLogout: () => void;
}

export function AppHeader({
  face,
  frameId,
  frames,
  userName,
  characterName,
  presenceCount,
  isConnected,
  stateCode,
  onFaceChange,
  onFrameChange,
  onSettingsToggle,
  onLogout,
}: AppHeaderProps) {
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

  const displayName = characterName || userName;
  const currentFrame = frames.find(f => f.id === frameId) || frames[0];

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* User avatar */}
        <span 
          className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
          style={{ background: faceColorVars[face] }}
          title={displayName}
        >
          {displayName.charAt(0).toUpperCase()}
        </span>
        
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
        {frameId && (
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-muted-foreground'}`} />
            {presenceCount > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Users className="h-3 w-3" />
                +{presenceCount}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Center - state code and details */}
      <div className="flex items-center gap-2">
        <span className="column-badge">{stateCode}</span>
        <button
          className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Details"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {/* Right side */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSettingsToggle}
          className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        
        {/* Frame selector */}
        <div className="relative">
          <button
            onClick={() => setShowFrameMenu(!showFrameMenu)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{currentFrame.name.length > 15 ? currentFrame.name.slice(0, 15) + '...' : currentFrame.name}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
          
          {showFrameMenu && (
            <div className="absolute top-full right-0 mt-1 py-1 bg-popover border border-border rounded-md shadow-lg z-20 min-w-[180px] animate-fade-in">
              {frames.map((f) => (
                <button
                  key={f.id || 'none'}
                  onClick={() => {
                    onFrameChange(f.id);
                    setShowFrameMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors ${
                    frameId === f.id ? "text-foreground bg-accent/50" : "text-muted-foreground"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={onLogout}
          className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
          title="Logout"
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
