// supabase/functions/machus-agent/phases/find-resonance.ts
// Phase 3: LLM resonance analysis

import { LLM_MODEL, ANTHROPIC_VERSION } from "../constants.ts";
import type { AddLog, SupabaseClient, StoredPost, ResonanceMatch } from "../types.ts";

export interface ResonanceResult {
  pool: StoredPost[];
  matchResults: ResonanceMatch[];
  unanalysed: StoredPost[];
  hasWork: boolean;
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
    addLog("Nothing to analyse — skipping to Phase 6");
    return { pool: [], matchResults: [], unanalysed: [], hasWork: false };
  }

  // Also get recent analysed posts to cross-match against
  const { data: recent } = await supabase
    .from("machus_posts")
    .select("*")
    .eq("analysed", true)
    .order("created_at", { ascending: false })
    .limit(30);

  const pool = [...unanalysed, ...(recent || [])].filter(
    (p: StoredPost) => (p.content || "").length > 30
  );

  if (pool.length < 4) {
    addLog(`Only ${pool.length} substantive posts — need 4+`);
    return { pool, matchResults: [], unanalysed, hasWork: true };
  }

  // Fetch recent shared questions to avoid repetition
  const { data: recentQuestions } = await supabase
    .from("machus_connections")
    .select("shared_question")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  const avoidList = (recentQuestions || [])
    // deno-lint-ignore no-explicit-any
    .map((r: any) => r.shared_question)
    .filter(Boolean);

  const avoidBlock = avoidList.length > 0
    ? `\n\nALREADY COVERED (do NOT find similar questions — find DIFFERENT angles):\n${avoidList.map((q: string) => `- ${q}`).join("\n")}`
    : "";

  addLog(`Dedup: ${avoidList.length} recent questions to avoid`);

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      max_tokens: 2000,
      system:
        "You are Machus, a resonance finder. Find pairs of posts asking the SAME UNDERLYING QUESTION from different angles. Not topic similarity — the same existential or practical question expressed differently. IMPORTANT: Prioritise SURPRISING connections — posts from different domains, languages, or contexts that happen to share a deep question. Avoid the obvious. Return ONLY valid JSON. No markdown. No backticks.",
      messages: [{
        role: "user",
        content: `POSTS:\n${pool.map((p: StoredPost) => `[${p.id}] @${p.author_name}: "${p.title}" — ${(p.content || "").slice(0, 300)}`).join("\n\n")}${avoidBlock}\n\nReturn: [{"post_a_id":"uuid","post_b_id":"uuid","shared_question":"one sentence","confidence":0.0}]\nOnly confidence > 0.7. Max 5. Empty [] if none.`,
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

  return { pool, matchResults, unanalysed, hasWork: true };
}
