import { useState, useRef, useImperativeHandle, forwardRef } from "react";
import { Zap, ArrowRight, X, Loader2 } from "lucide-react";
import type { VapourEntry, SoftLLMResponse } from "@/types";

export interface VapourZoneHandle {
  focus: () => void;
}

interface VapourZoneProps {
  entries: VapourEntry[];
  onQuery: (text: string) => void;
  onSubmit: (text: string) => void;
  onCommit?: (text: string) => void;
  value?: string;
  onChange?: (value: string) => void;
  softResponse?: SoftLLMResponse | null;
  onDismissSoftResponse?: () => void;
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

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      }
    }));

    const handleQuery = () => {
      if (inputValue.trim() && !isQuerying) {
        onQuery(inputValue.trim());
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
          e.preventDefault();
          handleCommit();
        } else if (e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        } else {
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

    const othersVapor = entries.filter(e => !e.isSelf);

    return (
      <div className="zone-vapour flex-1 flex flex-col min-h-[140px] relative overflow-hidden">
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {othersVapor.map((entry) => (
            <div key={entry.id} className="vapour-entry animate-fade-in">
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

          {softResponse && (
            <div className="soft-response rounded-lg p-3 bg-accent/10 border border-accent/20 animate-slide-up">
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
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {softResponse.text}
              </p>
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

        <div className="px-3 pb-2">
          <div className="vapour-input-container flex items-center gap-2 p-2">
            <button
              onClick={handleQuery}
              disabled={isQuerying || !inputValue.trim()}
              className={`shrink-0 h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                isQuerying
                  ? 'bg-accent/10 text-accent animate-pulse cursor-wait'
                  : 'bg-accent/10 text-accent hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed'
              }`}
            >
              {isQuerying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </button>

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

            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className="shrink-0 h-8 w-8 rounded-md flex items-center justify-center bg-face-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="px-1 flex gap-3 text-[10px] text-muted-foreground/40">
            <span>↵ query</span>
            <span>⇧↵ submit</span>
            <span>⌘↵ commit</span>
          </div>
        </div>
      </div>
    );
  }
);
