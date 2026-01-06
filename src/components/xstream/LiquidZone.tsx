import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { LiquidCard as LiquidCardType } from "@/types/xstream";

interface LiquidCardProps {
  card: LiquidCardType;
}

function LiquidCard({ card }: LiquidCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLongContent = card.content.length > 200;
  const displayContent = isExpanded || !isLongContent 
    ? card.content 
    : card.content.slice(0, 200) + "...";

  return (
    <div className="card-liquid rounded-lg p-3 animate-slide-up">
      <div className="mb-2 flex items-center gap-2">
        <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white bg-face-accent">
          {card.userName.charAt(0).toUpperCase()}
        </span>
        <span className="text-xs text-muted-foreground">{card.userName}</span>
      </div>
      
      <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
        {displayContent}
      </p>
      
      {isLongContent && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}

interface LiquidZoneProps {
  cards: LiquidCardType[];
  height: number;
}

export function LiquidZone({ cards, height }: LiquidZoneProps) {
  return (
    <div 
      className="zone-liquid overflow-y-auto px-3 py-3"
      style={{ height: `${height}px`, minHeight: "100px" }}
    >
      {cards.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground/50 italic">
            Submitted content appears here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <LiquidCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
