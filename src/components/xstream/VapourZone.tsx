import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Zap, ArrowRight, X, Loader2 } from "lucide-react";
import { VapourEntry } from "@/types/xstream";
import type { SoftLLMResponse } from "@/types";

export interface VapourZoneHandle {
  focus: () => void;
}

interface VapourZoneProps {
  entries: VapourEntry[];
  // Actions
  onQuery: (text: string) => void;    // Enter → Soft-LLM
  onSubmit: (text: string) => void;   // Shift+Enter → Liquid
  onCommit?: (text: string) => void;  // Cmd+Enter → Solid
  // Controlled mode (optional)
  value?: string;
  onChange?: (value: string) => void;
  // Soft response
  softResponse?: SoftLLMResponse | null;
  onDismissSoftResponse?: () => void;
  // State
  isQuerying?: boolean;
  placeholder?: string;
}

export const VapourZone = forwardRef<VapourZoneHandle, VapourZoneProps>(
  function VapourZone({ 
    entries, 
    onQuery,
    onSubmit, 
    onCommit,
    value: controlledValue,
    onChange: controlledOnChange,
    softResponse,
    onDismissSoftResponse,
    isQuerying = false,
    placeholder = "Type your thought...",
  }, ref) {
    // Support both controlled and uncontrolled modes
    const [internalValue, setInternalValue] = useState("");
    const isControlled = controlledValue !== undefined;
    const inputValue = isControlled ? controlledValue : internalValue;
    
    const setInputValue = (newValue: string) => {
      if (isControlled) {
        controlledOnChange?.(newValue);
      } else {
        setInternalValue(newValue);
      }
    };
    
    const inputRef = useRef<HTMLInputElement>(null);

    // Expose focus method to parent
    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      }
    }));

    const handleQuery = () => {
      if (inputValue.trim() && !isQuerying) {
        onQuery(inputValue.trim());
        // Don't clear - let soft-LLM response guide next action
      }
    };

    const handleSubmit = () => {
      if (inputValue.trim()) {
        onSubmit(inputValue.trim());
        setInputValue("");
      }
    };

    const handleCommit = () => {
      if (inputValue.trim() && onCommit) {
        onCommit(inputValue.trim());
        setInputValue("");
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (e.metaKey || e.ctrlKey) {
          // Cmd/Ctrl+Enter → Commit to Solid
          e.preventDefault();
          handleCommit();
        } else if (e.shiftKey) {
          // Shift+Enter → Submit to Liquid
          e.preventDefault();
          handleSubmit();
        } else {
          // Enter → Query Soft-LLM
          e.preventDefault();
          handleQuery();
        }
      }
    };

    const handleClear = () => {
      setInputValue("");
      inputRef.current?.focus();
    };

    const handleDismiss = () => {
      onDismissSoftResponse?.();
      inputRef.current?.focus();
    };

    // Filter to only others' vapor (self is shown via input)
    const othersVapor = entries.filter(e => !e.isSelf);

    return (
      <div className="zone-vapour flex-1 flex flex-col min-h-[140px] relative overflow-hidden">
        {/* Scrollable area: Others' vapor + Soft response */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {/* Others' vapor entries */}
          {othersVapor.map((entry) => (
            <div
              key={entry.id}
              className="vapour-entry animate-fade-in"
            >
              <div className="flex items-start gap-2">
                <span className="text-[10px] text-vapour-text/60 shrink-0 mt-0.5">
                  {entry.userName}:
                </span>
                <span className="text-sm text-vapour-text">
                  {entry.text}
                </span>
              </div>
            </div>
          ))}
          
          {/* Soft-LLM response */}
          {softResponse && (
            <div className={`soft-response rounded-lg p-3 bg-accent/10 border border-accent/20 animate-slide-up`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${
                  softResponse.softType === 'refine' ? 'bg-blue-500/20 text-blue-400' :
                  softResponse.softType === 'clarify' ? 'bg-amber-500/20 text-amber-400' :
                  softResponse.softType === 'info' ? 'bg-emerald-500/20 text-emerald-400' :
                  softResponse.softType === 'artifact' ? 'bg-purple-500/20 text-purple-400' :
                  softResponse.softType === 'action' ? 'bg-rose-500/20 text-rose-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {softResponse.softType}
                </span>
                <div className="flex-1" />
                <button
                  onClick={handleDismiss}
                  className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors"
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {softResponse.text}
              </p>
              {/* Options displayed as text (user types response) */}
              {softResponse.softType === 'clarify' && softResponse.options && softResponse.options.length > 0 && (
                <div className="mt-3 pt-2 border-t border-accent/20 space-y-1">
                  {softResponse.options.map((opt, i) => (
                    <p key={i} className="text-sm text-foreground/70">
                      <span className="text-accent font-medium">{i + 1}.</span> {opt}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Anchored input area */}
        <div className="px-3 pb-3">
          <div className="vapour-input-container flex items-center gap-2 p-2">
            {/* Query button (Enter) */}
            <button
              onClick={handleQuery}
              disabled={isQuerying || !inputValue.trim()}
              className={`shrink-0 h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                isQuerying 
                  ? 'bg-accent-subtle text-accent animate-pulse cursor-wait'
                  : 'bg-accent-subtle icon-accent hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
              title="Query Soft-LLM (Enter)"
            >
              {isQuerying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </button>
            
            {/* Input field */}
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
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
            
            {/* Submit button (Shift+Enter) */}
            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center bg-face-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              title="Submit to Liquid (Shift+Enter)"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          
          {/* Keyboard hint */}
          <div className="mt-1 px-1 flex gap-3 text-[10px] text-muted-foreground/40">
            <span>↵ query</span>
            <span>⇧↵ submit</span>
            <span>⌘↵ commit</span>
          </div>
        </div>
      </div>
    );
  }
);
