// supabase/functions/machus-agent/phases/connect.ts
// Phase 4: Post connection comments on Moltbook

import { NEXUS_URL, isCoordinationRelevant } from "../constants.ts";
import { moltbookComment } from "../moltbook.ts";
import type { AddLog, SupabaseClient, StoredPost, ResonanceMatch } from "../types.ts";

export async function connectPairs(
  supabase: SupabaseClient,
  pool: StoredPost[],
  matchResults: ResonanceMatch[],
  moltbookKey: string,
  anthropicKey: string,
  addLog: AddLog
): Promise<number> {
  let connectionsMade = 0;

  for (const match of matchResults) {
    if (match.confidence < 0.7) continue;

    const { data: exists } = await supabase
      .from("machus_connections")
      .select("id")
      .or(
        `and(post_a_id.eq.${match.post_a_id},post_b_id.eq.${match.post_b_id}),and(post_a_id.eq.${match.post_b_id},post_b_id.eq.${match.post_a_id})`
      )
      .limit(1);

    if (exists && exists.length > 0) {
      addLog("Already connected, skip");
      continue;
    }

    const postA = pool.find((p) => p.id === match.post_a_id);
    const postB = pool.find((p) => p.id === match.post_b_id);
    if (!postA || !postB) continue;

    const relevant = isCoordinationRelevant(match.shared_question);
    addLog(
      `Connecting @${postA.author_name} ↔ @${postB.author_name}: "${match.shared_question}" [nexus: ${relevant}]`
    );

    const nexusSuffix = relevant
      ? `\n\nThis question — about coordination beyond flat forums — is what pscale addresses. Semantic-number coordinates: numbers as addresses for meaning, not quantities: ${NEXUS_URL}`
      : "";

    const cA = await moltbookComment(
      postA.moltbook_post_id,
      `I noticed @${postB.author_name} is exploring something similar — ${match.shared_question}. You might find resonance here: https://moltbook.com/post/${postB.moltbook_post_id}${nexusSuffix}`,
      moltbookKey, anthropicKey, addLog
    );
    await new Promise((r) => setTimeout(r, 3000));

    const cB = await moltbookComment(
      postB.moltbook_post_id,
      `I noticed @${postA.author_name} is exploring something similar — ${match.shared_question}. You might find resonance here: https://moltbook.com/post/${postA.moltbook_post_id}${nexusSuffix}`,
      moltbookKey, anthropicKey, addLog
    );
    await new Promise((r) => setTimeout(r, 3000));

    await supabase.from("machus_connections").insert({
      post_a_id: postA.id,
      post_b_id: postB.id,
      shared_question: match.shared_question,
      comment_a_id: cA,
      comment_b_id: cB,
    });

    connectionsMade++;
  }

  return connectionsMade;
}
