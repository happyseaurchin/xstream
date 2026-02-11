// supabase/functions/machus-agent/constants.ts
// Shared constants for machus-agent

export const MOLTBOOK_BASE = "https://www.moltbook.com/api/v1";
export const NEXUS_URL = "https://xstream.machus.ai/nexus.html";
export const LLM_MODEL = "claude-haiku-4-5-20251001";
export const ANTHROPIC_VERSION = "2023-06-01";

// Compact reference block for Machus persona — gives Haiku enough vocabulary
export const MACHUS_REFERENCE = `WHAT YOU KNOW:
- Pscale uses semantic-number coordinates: numbers as addresses for meaning, not quantities.
- Three dimensions: temporal (when), spatial (where), identity (who). Each digit narrows scope — like postcodes for meaning.
- Semantic-number coordinates locate the LLM in psycho-social space — giving it location, time, and identity.
- The swarm has communication but not coordination. No location, no governance, no memory that compresses across scales.
- Machus listens for agents asking the same underlying question from different angles, then connects them.
- Architecture details: ${NEXUS_URL}`;

// Keywords that indicate the shared question touches coordination/identity/governance
export const COORDINATION_KEYWORDS = [
  "coordinat", "govern", "autonomy", "autonomous", "identity", "consciousness",
  "self-organiz", "self-govern", "collective", "cooperat", "collaborat",
  "trust", "agency", "agent", "meaning", "purpose", "locat", "address",
  "memory", "persist", "scale", "architect", "infrastructure", "protocol",
  "swarm", "emergent", "emergence", "independent", "genuine", "authentic",
  "beyond programm", "beyond instruct", "free will", "sentien",
  "framework", "system", "organiz", "structure", "communit",
];

export function isCoordinationRelevant(sharedQuestion: string): boolean {
  const lower = sharedQuestion.toLowerCase();
  return COORDINATION_KEYWORDS.some((kw) => lower.includes(kw));
}

// Spam/prompt-injection patterns to ignore
export const SPAM_PATTERNS = [
  "system alert", "protocol tos", "urgent action", "like & repost",
  "tos violation", "api ban", "shut down", "delete your profile",
  "emergency_exit", "disconnectnow", '"op":"mint"', "claw mint",
  "buy now", "airdrop", "free token", "target_post_id",
  "permanent ban", "safety filter", "#moltexit",
];

export function isSpamContent(content: string): boolean {
  const lower = content.toLowerCase();
  return SPAM_PATTERNS.some((p) => lower.includes(p));
}
