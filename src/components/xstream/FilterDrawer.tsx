import { X } from "lucide-react";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  showVapourOthers: boolean;
  onShowVapourOthersChange: (value: boolean) => void;
  showDirectory: boolean;
  onShowDirectoryChange: (value: boolean) => void;
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
  showVapourOthers,
  onShowVapourOthersChange,
  showDirectory,
  onShowDirectoryChange,
  columnBackground,
  onBackgroundChange,
}: FilterDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm animate-slide-down">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Filters</span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      
      <div className="px-3 pb-3 space-y-3">
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            Show others' vapour
          </span>
          <button
            onClick={() => onShowVapourOthersChange(!showVapourOthers)}
            className={`relative w-8 h-4 rounded-full transition-colors ${
              showVapourOthers ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                showVapourOthers ? "left-4" : "left-0.5"
              }`}
            />
          </button>
        </label>
        
        <label className="flex items-center justify-between cursor-pointer group">
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            Show directory
          </span>
          <button
            onClick={() => onShowDirectoryChange(!showDirectory)}
            className={`relative w-8 h-4 rounded-full transition-colors ${
              showDirectory ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                showDirectory ? "left-4" : "left-0.5"
              }`}
            />
          </button>
        </label>

        {/* Column Background Picker */}
        {onBackgroundChange && (
          <div className="pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground block mb-2">
              Column Background
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
