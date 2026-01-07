import { X, User, FileText, Wrench, ChevronRight } from "lucide-react";
import { Face } from "@/types/xstream";

// Character type
interface Character {
  id: string;
  name: string;
  is_npc: boolean;
  inhabited_by: string | null;
}

// Content entry type
interface ContentEntry {
  id: string;
  type: string;
  name: string;
  preview?: string;
}

// Skill type
interface Skill {
  id: string;
  name: string;
  category: string;
  applies_to: string[];
}

interface DirectoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  face: Face;
  // Character face data
  characters?: Character[];
  selectedCharacterId?: string | null;
  currentUserId?: string;
  onCharacterSelect?: (id: string | null) => void;
  // Author face data
  contentEntries?: ContentEntry[];
  onContentSelect?: (entry: ContentEntry) => void;
  onContentDelete?: (id: string) => void;
  // Designer face data
  skills?: Skill[];
  onSkillSelect?: (skill: Skill) => void;
  // Loading state
  isLoading?: boolean;
}

export function DirectoryDrawer({
  isOpen,
  onClose,
  face,
  characters = [],
  selectedCharacterId,
  currentUserId,
  onCharacterSelect,
  contentEntries = [],
  onContentSelect,
  onContentDelete,
  skills = [],
  onSkillSelect,
  isLoading = false,
}: DirectoryDrawerProps) {
  if (!isOpen) return null;

  const faceLabels: Record<Face, string> = {
    character: "Characters",
    author: "Content",
    designer: "Skills",
  };

  const faceIcons: Record<Face, React.ReactNode> = {
    character: <User className="h-3.5 w-3.5" />,
    author: <FileText className="h-3.5 w-3.5" />,
    designer: <Wrench className="h-3.5 w-3.5" />,
  };

  return (
    <div className="border-b border-border/50 bg-card/80 backdrop-blur-sm animate-slide-down">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{faceIcons[face]}</span>
          <span className="text-xs font-medium text-muted-foreground">
            {faceLabels[face]}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-3 pb-3 max-h-[300px] overflow-y-auto">
        {isLoading ? (
          <div className="text-xs text-muted-foreground/50 italic text-center py-4">
            Loading...
          </div>
        ) : (
          <>
            {/* Character Face: Character List */}
            {face === "character" && (
              <div className="space-y-1">
                {characters.length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 italic text-center py-4">
                    No characters in this frame
                  </div>
                ) : (
                  characters.map((char) => {
                    const isSelected = selectedCharacterId === char.id;
                    const isInhabited = char.inhabited_by !== null && char.inhabited_by !== currentUserId;
                    const isMine = char.inhabited_by === currentUserId;

                    return (
                      <button
                        key={char.id}
                        onClick={() => !isInhabited && onCharacterSelect?.(isSelected ? null : char.id)}
                        disabled={isInhabited}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                          isSelected
                            ? "bg-primary/20 text-foreground"
                            : isInhabited
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white ${
                            isSelected ? "bg-primary" : "bg-muted-foreground/50"
                          }`}
                        >
                          {char.name.charAt(0).toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">
                            {char.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {char.is_npc ? "NPC" : "Player Character"}
                            {isMine && " · You"}
                            {isInhabited && " · Taken"}
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] text-primary font-medium">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Author Face: Content List */}
            {face === "author" && (
              <div className="space-y-1">
                {contentEntries.length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 italic text-center py-4">
                    No content in this frame
                  </div>
                ) : (
                  contentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 transition-colors"
                    >
                      <button
                        onClick={() => onContentSelect?.(entry)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate text-muted-foreground group-hover:text-foreground">
                            {entry.name}
                          </div>
                          {entry.preview && (
                            <div className="text-[10px] text-muted-foreground/70 truncate">
                              {entry.preview}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                      </button>
                      {onContentDelete && (
                        <button
                          onClick={() => onContentDelete(entry.id)}
                          className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Designer Face: Skills List */}
            {face === "designer" && (
              <div className="space-y-1">
                {skills.length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 italic text-center py-4">
                    No skills in this frame
                  </div>
                ) : (
                  skills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => onSkillSelect?.(skill)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-accent/50 transition-colors group"
                    >
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate text-muted-foreground group-hover:text-foreground">
                          {skill.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground/70">
                          {skill.category} · {skill.applies_to.join(", ")}
                        </div>
                      </div>
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
