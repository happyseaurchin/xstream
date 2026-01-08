import { X } from "lucide-react";
import { VapourEntry } from "@/types/xstream";
import type { SoftLLMResponse } from "@/types";

interface VapourZoneProps {
  entries: VapourEntry[];
  // Soft response display
  softResponse?: SoftLLMResponse | null;
  onDismissSoftResponse?: () => void;
}

export function VapourZone({
  entries,
  softResponse,
  onDismissSoftResponse,
}: VapourZoneProps) {
  // Filter to only others' vapor (self vapor now comes from ConstructionButton)
  const othersVapor = entries.filter(e => !e.isSelf);

  const handleDismiss = () => {
    onDismissSoftResponse?.();
  };

  return (
    <div className="zone-vapour flex-1 flex flex-col min-h-[100px] relative overflow-hidden">
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

        {/* Empty state when no content */}
        {othersVapor.length === 0 && !softResponse && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground/30 italic">
              Live thoughts appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
