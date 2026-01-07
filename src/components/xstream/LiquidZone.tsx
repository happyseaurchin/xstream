import { Circle, CircleDot } from "lucide-react";
import { LiquidCard as LiquidCardType } from "@/types/xstream";

interface LiquidCardProps {
  card: LiquidCardType;
  isSelf: boolean;
  isLoading: boolean;
  onCommit?: () => void;
  onCopyToVapor?: () => void;
}

function LiquidCard({ card, isSelf, isLoading, onCommit, onCopyToVapor }: LiquidCardProps) {
  const handleClick = () => {
    if (onCopyToVapor) {
      onCopyToVapor();
    }
  };

  const handleCommitClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger copy-to-vapor
    if (onCommit && !isLoading) {
      onCommit();
    }
  };

  return (
    <div 
      className="card-liquid rounded-lg p-3 animate-slide-up cursor-pointer transition-colors hover:bg-accent/5"
      onClick={handleClick}
      title={isSelf ? "Click to copy to vapor" : `${card.userName}'s submission`}
    >
      {/* Header row: avatar, name, and commit button */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-medium text-white ${
          isSelf ? 'bg-face-accent' : 'bg-muted-foreground/50'
        }`}>
          {card.userName.charAt(0).toUpperCase()}
        </span>
        <span className={`text-xs flex-1 ${isSelf ? 'text-foreground/80' : 'text-muted-foreground'}`}>
          {card.userName}
          {isSelf && <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>}
        </span>
        
        {/* Commit button - only for self */}
        {isSelf && (
          <button
            onClick={handleCommitClick}
            disabled={isLoading}
            className={`h-6 w-6 rounded flex items-center justify-center transition-all ${
              isLoading 
                ? 'text-face-accent animate-pulse cursor-wait' 
                : 'text-muted-foreground hover:text-face-accent hover:bg-face-accent/10'
            }`}
            title={isLoading ? "Synthesizing..." : "Commit to Solid (Cmd+Enter)"}
          >
            {isLoading ? (
              <Circle className="h-4 w-4 animate-spin" />
            ) : (
              <CircleDot className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      
      {/* Content */}
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
        isSelf ? 'text-foreground/85' : 'text-foreground/70'
      }`}>
        {card.content}
      </p>
    </div>
  );
}

interface LiquidZoneProps {
  cards: LiquidCardType[];
  height: number;
  currentUserId: string;
  isLoading?: boolean;
  onCommit?: (cardId: string) => void;
  onCopyToVapor?: (text: string) => void;
}

export function LiquidZone({ 
  cards, 
  height, 
  currentUserId,
  isLoading = false,
  onCommit,
  onCopyToVapor,
}: LiquidZoneProps) {
  // Separate self vs others, self first
  const selfCards = cards.filter(c => c.userId === currentUserId || c.userId === 'self');
  const otherCards = cards.filter(c => c.userId !== currentUserId && c.userId !== 'self');
  const sortedCards = [...selfCards, ...otherCards];

  return (
    <div 
      className="zone-liquid overflow-y-auto px-3 py-3"
      style={{ height: `${height}px`, minHeight: "100px" }}
    >
      {sortedCards.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground/50 italic">
            Submitted content appears here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedCards.map((card) => {
            const isSelf = card.userId === currentUserId || card.userId === 'self';
            return (
              <LiquidCard 
                key={card.id} 
                card={card}
                isSelf={isSelf}
                isLoading={isSelf && isLoading}
                onCommit={isSelf && onCommit ? () => onCommit(card.id) : undefined}
                onCopyToVapor={onCopyToVapor ? () => onCopyToVapor(card.content) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
