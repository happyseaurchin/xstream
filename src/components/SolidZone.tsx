import type { SolidBlock } from "@/types";

interface SolidZoneProps {
  blocks: SolidBlock[];
}

export function SolidZone({ blocks }: SolidZoneProps) {
  return (
    <div className="zone-solid flex-1 overflow-y-auto px-3 py-4 min-h-[80px]">
      {blocks.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted-foreground/60 italic">
            No committed content yet
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {blocks.map((block) => (
            <article
              key={block.id}
              className="card-solid rounded-lg p-4 animate-fade-in"
            >
              {block.title && (
                <h3 className="mb-2 text-sm font-medium text-foreground/90">
                  {block.title}
                </h3>
              )}
              <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                {block.content}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
