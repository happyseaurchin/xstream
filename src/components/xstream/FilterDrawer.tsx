import { useState } from "react";
import { X } from "lucide-react";
import type { VisibilitySettings } from "@/types";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: VisibilitySettings;
  onToggle: (key: keyof VisibilitySettings) => void;
  userName: string;
  onNameChange: (name: string) => void;
  columnBackground?: string;
  onBackgroundChange?: (background: string) => void;
}

const backgroundPresets = [
  { label: "None", value: "" },
  { label: "Slate", value: "linear-gradient(180deg, hsl(220 15% 20%) 0%, hsl(220 15% 12%) 100%)" },
  { label: "Ocean", value: "linear-gradient(180deg, hsl(200 50% 25%) 0%, hsl(210 60% 15%) 100%)" },
  { label: "Forest", value: "linear-gradient(180deg, hsl(150 30% 22%) 0%, hsl(160 35% 12%) 100%)" },
  { label: "Sunset", value: "linear-gradient(180deg, hsl(20 40% 25%) 0%, hsl(350 30% 15%) 100%)" },
  { label: "Lavender", value: "linear-gradient(180deg, hsl(270 30% 25%) 0%, hsl(280 35% 15%) 100%)" },
];

export function FilterDrawer({
  isOpen,
  onClose,
  visibility,
  onToggle,
  userName,
  onNameChange,
  columnBackground = "",
  onBackgroundChange,
}: FilterDrawerProps) {
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [editingName, setEditingName] = useState("");

  if (!isOpen) return null;

  const handleNameSubmit = () => {
    if (editingName.trim()) {
      onNameChange(editingName.trim());
    }
    setShowNameEdit(false);
  };

  // Toggle switch component
  const Toggle = ({ 
    checked, 
    onChange, 
    label 
  }: { 
    checked: boolean; 
    onChange: () => void; 
    label: string;
  }) => (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
      <button
        onClick={onChange}
        className={`relative w-8 h-4 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );

  return (
    <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm animate-slide-down">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Filters</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 pb-3 space-y-4">
        {/* Share Settings */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Share with others
          </span>
          <Toggle
            checked={visibility.shareVapor}
            onChange={() => onToggle("shareVapor")}
            label="Share your typing (vapor)"
          />
          <Toggle
            checked={visibility.shareLiquid}
            onChange={() => onToggle("shareLiquid")}
            label="Share your submissions (liquid)"
          />
        </div>

        {/* Show Settings */}
        <div className="space-y-2 pt-2 border-t border-border/30">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
            Show zones
          </span>
          <Toggle
            checked={visibility.showVapor}
            onChange={() => onToggle("showVapor")}
            label="Vapor zone"
          />
          <Toggle
            checked={visibility.showLiquid}
            onChange={() => onToggle("showLiquid")}
            label="Liquid zone"
          />
          <Toggle
            checked={visibility.showSolid}
            onChange={() => onToggle("showSolid")}
            label="Solid zone"
          />
        </div>

        {/* Display Name */}
        <div className="pt-2 border-t border-border/30">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 block mb-2">
            Display name
          </span>
          {showNameEdit ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:border-primary"
                autoFocus
              />
              <button
                onClick={handleNameSubmit}
                className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
              >
                Save
              </button>
              <button
                onClick={() => setShowNameEdit(false)}
                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingName(userName);
                setShowNameEdit(true);
              }}
              className="w-full text-left px-2 py-1.5 text-xs bg-background border border-border rounded hover:border-primary transition-colors"
            >
              {userName}
            </button>
          )}
        </div>

        {/* Column Background Picker */}
        {onBackgroundChange && (
          <div className="pt-2 border-t border-border/30">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70 block mb-2">
              Column background
            </span>
            <div className="flex flex-wrap gap-1.5">
              {backgroundPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => onBackgroundChange(preset.value)}
                  className={`h-6 px-2 rounded text-[10px] font-medium transition-all ${
                    columnBackground === preset.value
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : "hover:opacity-80"
                  }`}
                  style={{
                    background: preset.value || "hsl(var(--muted))",
                    color: preset.value ? "white" : "hsl(var(--muted-foreground))",
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
