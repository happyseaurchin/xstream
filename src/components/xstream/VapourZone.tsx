import { useState } from "react";
import { Zap, ArrowRight, X } from "lucide-react";
import { VapourEntry } from "../../types/vapor-flow-ui";

interface VapourZoneProps {
  entries: VapourEntry[];
  onSubmit: (text: string) => void;
  onLLMActivate?: () => void;
}

export function VapourZone({ entries, onSubmit, onLLMActivate }: VapourZoneProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleClear = () => {
    setInputValue("");
  };

  return (
    <div className="zone-vapour flex-1 flex flex-col min-h-[140px] relative overflow-hidden">
      {/* Vapour entries - floating text */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`vapour-entry ${entry.isSelf ? "vapour-self" : ""} animate-fade-in`}
          >
            <div className="flex items-start gap-2">
              <span className="text-[10px] text-vapour-text/60 shrink-0 mt-0.5">
                {entry.userName}:
              </span>
              <span 
                className={`text-sm ${
                  entry.isSelf 
                    ? "text-foreground/80" 
                    : "text-vapour-text"
                }`}
              >
                {entry.text}
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Immersed input area */}
      <div className="px-3 pb-3">
        <div className="vapour-input-container flex items-center gap-2 p-2">
          {/* LLM button - uses face accent */}
          <button
            onClick={onLLMActivate}
            className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center bg-accent-subtle icon-accent transition-colors hover:opacity-80"
            title="Activate LLM"
          >
            <Zap className="h-4 w-4" />
          </button>
          
          {/* Input field */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your thought..."
              className="w-full bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 pr-6"
            />
            {inputValue && (
              <button
                onClick={handleClear}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Submit button - uses face accent */}
          <button
            onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center bg-face-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
