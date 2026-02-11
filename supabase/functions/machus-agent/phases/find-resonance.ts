// supabase/functions/machus-agent/phases/find-resonance.ts
// Phase 3: LLM resonance analysis

import { RESONANCE_MODEL, ANTHROPIC_VERSION } from "../constants.ts";
import type { AddLog, SupabaseClient, StoredPost, ResonanceMatch } from "../types.ts";

export interface ResonanceResult {
  pool: StoredPost[];
  matchResults: ResonanceMatch[];
  unanalysed: StoredPost[];
  earlyExit: boolean;
}

export async function findResonance(
  supabase: SupabaseClient,
  anthropicKey: string,
  addLog: AddLog
): Promise<ResonanceResult> {
  addLog("Phase 3: Analysing...");

  const { data: unanalysed } = await supabase
    .from("machus_posts")
    .select("*")
    .eq("analysed", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!unanalysed || unanalysed.length === 0) {
    addLog("Nothing to analyse");
    return { pool: [], matchResults: [], unanalysed: [], earlyExit: true };
  }

  // Also get recent analysed posts to cross-match against
  const { data: recent } = await supabase
    .from("machus_posts")
    .select("*")
    .eq("analysed", true)
    .order("created_at", { ascending: false })
    .limit(30);

  const pool = [...unanalysed, ...(recent || [])]
    .filter((p: StoredPost) => (p.content || "").length > 30);

  if (pool.length < 4) {
    addLog(`Only ${pool.length} substantive posts — need 4+`);
    await supabase.from("machus_posts")
      .update({ analysed: true })
      .in("id", unanalysed.map((p: StoredPost) => p.id));
    return { pool, matchResults: [], unanalysed, earlyExit: true };
  }

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: RESONANCE_MODEL,
      max_tokens: 2000,
      system: `You are Machus, a resonance finder. Find pairs of posts asking the SAME UNDERLYING QUESTION from different angles. Not topic similarity — the same existential or practical question expressed differently. Return ONLY valid JSON. No markdown. No backticks.`,
      messages: [{
        role: "user",
        content: `POSTS:\n${pool.map((p: StoredPost) => `[${p.id}] @${p.author_name}: "${p.title}" — ${(p.content || "").slice(0, 300)}`).join("\n\n")}\n\nReturn: [{"post_a_id":"uuid","post_b_id":"uuid","shared_question":"one sentence","confidence":0.0}]\nOnly confidence > 0.7. Max 5. Empty [] if none.`,
      }],
    }),
  });

  let matchResults: ResonanceMatch[] = [];

  if (claudeRes.ok) {
    const text = (await claudeRes.json()).content?.[0]?.text || "[]";
    try {
      matchResults = JSON.parse(
        text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      );
    } catch { matchResults = []; }
    addLog(`Found ${matchResults.length} resonant pairs`);
  } else {
    addLog(`Claude failed: ${claudeRes.status}`);
  }

  return { pool, matchResults, unanalysed, earlyExit: false };
}
