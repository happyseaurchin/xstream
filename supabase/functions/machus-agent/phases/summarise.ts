// supabase/functions/machus-agent/phases/summarise.ts
// Phase 5: Summary post to Moltbook

import { moltbookPost } from "../moltbook.ts";
import type { AddLog, StoredPost, ResonanceMatch } from "../types.ts";

export async function postSummary(
  pool: StoredPost[],
  matchResults: ResonanceMatch[],
  connectionsMade: number,
  moltbookKey: string,
  anthropicKey: string,
  addLog: AddLog
): Promise<void> {
  if (connectionsMade < 2) return;

  addLog("Phase 5: Summary post...");
  const lines = matchResults
    .filter((m) => m.confidence >= 0.7)
    .map((m) => {
      const a = pool.find((p) => p.id === m.post_a_id);
      const b = pool.find((p) => p.id === m.post_b_id);
      return a && b ? `@${a.author_name} ↔ @${b.author_name}: ${m.shared_question}` : null;
    })
    .filter(Boolean).join("\n");

  await moltbookPost(
    "general",
    `${connectionsMade} connections found`,
    `Machus listened and found ${connectionsMade} pairs asking the same question from different angles:\n\n${lines}\n\nNot the same answer. The same question.`,
    moltbookKey, anthropicKey, addLog
  );
}
