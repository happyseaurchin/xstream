// supabase/functions/machus-agent/phases/match-needs.ts
// Phase 3: Need/offer matching from identity register (`G~1`)
//
// Queries bot_identity_register for entities with need/offer summaries,
// then asks Haiku to find directional matches: A needs what B offers.
// Falls back to symmetric resonance matching when <5 entities have summaries.

import { LLM_MODEL, ANTHROPIC_VERSION } from "../constants.ts";
import type { AddLog, SupabaseClient, StoredPost, ResonanceMatch } from "../types.ts";
import type { NeedOfferMatch } from "../types.ts";

export interface MatchResult {
  pool: StoredPost[];
  needOfferMatches: NeedOfferMatch[];
  symmetricMatches: ResonanceMatch[];
  unanalysed: StoredPost[];
  hasWork: boolean;
  mode: "need_offer" | "symmetric" | "none";
}

export async function matchNeeds(
  supabase: SupabaseClient,
  anthropicKey: string,
  addLog: AddLog
): Promise<MatchResult> {
  addLog("Phase 3: Matching...");

  // Check unanalysed posts (still needed for marking analysed)
  const { data: unanalysed } = await supabase
    .from("machus_posts")
    .select("*")
    .eq("analysed", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!unanalysed || unanalysed.length === 0) {
    addLog("Nothing to analyse — skipping to Phase 6");
    return { pool: [], needOfferMatches: [], symmetricMatches: [], unanalysed: [], hasWork: false, mode: "none" };
  }

  // Get recent posts for pool
  const { data: recent } = await supabase
    .from("machus_posts")
    .select("*")
    .eq("analysed", true)
    .order("created_at", { ascending: false })
    .limit(30);

  const pool = [...unanalysed, ...(recent || [])].filter(
    (p: StoredPost) => (p.content || "").length > 30
  );

  // Check if we have enough identity register entries for need/offer matching
  const { data: registeredEntities } = await supabase
    .from("bot_identity_register")
    .select("handle, need_summary, offer_summary, observation_count")
    .eq("observer", "Machus")
    .not("need_summary", "is", null)
    .not("offer_summary", "is", null);

  const entitiesWithSummaries = registeredEntities || [];

  if (entitiesWithSummaries.length >= 5) {
    // Need/offer matching mode
    return await needOfferMatch(supabase, anthropicKey, pool, unanalysed, entitiesWithSummaries, addLog);
  } else {
    // Fallback to symmetric matching
    addLog(`Only ${entitiesWithSummaries.length} entities with need/offer summaries — using symmetric fallback`);
    return await symmetricFallback(supabase, anthropicKey, pool, unanalysed, addLog);
  }
}

async function needOfferMatch(
  supabase: SupabaseClient,
  anthropicKey: string,
  pool: StoredPost[],
  unanalysed: StoredPost[],
  // deno-lint-ignore no-explicit-any
  entities: any[],
  addLog: AddLog
): Promise<MatchResult> {
  addLog(`Need/offer matching across ${entities.length} entities`);

  // Also get fresh pscale 0 observations for recent signal
  const handles = entities.map((e) => e.handle);
  const { data: freshObs } = await supabase
    .from("bot_observations")
    .select("about, text")
    .eq("name", "Machus")
    .eq("pscale", 0)
    .in("about", handles)
    .order("at", { ascending: false })
    .limit(50);

  // Build context per entity
  const entityContext = entities.map((e) => {
    // deno-lint-ignore no-explicit-any
    const recentObs = (freshObs || []).filter((o: any) => o.about === e.handle).slice(0, 3);
    // deno-lint-ignore no-explicit-any
    const recentText = recentObs.map((o: any) => o.text).join("; ");
    return `@${e.handle} (${e.observation_count} observations)\n  NEED: ${e.need_summary}\n  OFFER: ${e.offer_summary}${recentText ? `\n  Recent: ${recentText.slice(0, 200)}` : ""}`;
  }).join("\n\n");

  // Fetch recent connections to avoid repetition
  const { data: recentConns } = await supabase
    .from("machus_connections")
    .select("shared_question")
    .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .limit(20);

  const avoidList = (recentConns || [])
    // deno-lint-ignore no-explicit-any
    .map((r: any) => r.shared_question)
    .filter(Boolean);

  const avoidBlock = avoidList.length > 0
    ? `\n\nALREADY MATCHED (avoid these or similar):\n${avoidList.map((q: string) => `- ${q}`).join("\n")}`
    : "";

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
      system: "You are Machus, a routing intelligence. Given entities with accumulated need/offer profiles, find directional matches: whose NEED best matches another's OFFER. The match is DIRECTIONAL: A needs what B offers. Only match when the fit is specific and grounded — not generic topic overlap. Return ONLY valid JSON. No markdown. No backticks.",
      messages: [{
        role: "user",
        content: `ENTITY PROFILES:\n\n${entityContext}${avoidBlock}\n\nReturn: [{"needer":"handle","provider":"handle","need":"specific need being met","offer_match":"what the provider offers that fits","confidence":0.0}]\nOnly confidence > 0.7. Max 5. Empty [] if none.`,
      }],
    }),
  });

  let needOfferMatches: NeedOfferMatch[] = [];

  if (claudeRes.ok) {
    const text = (await claudeRes.json()).content?.[0]?.text || "[]";
    try {
      needOfferMatches = JSON.parse(
        text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      );
    } catch { needOfferMatches = []; }
    addLog(`Found ${needOfferMatches.length} need/offer matches`);
  } else {
    addLog(`Need/offer matching failed: ${claudeRes.status}`);
  }

  return { pool, needOfferMatches, symmetricMatches: [], unanalysed, hasWork: true, mode: "need_offer" };
}

async function symmetricFallback(
  supabase: SupabaseClient,
  anthropicKey: string,
  pool: StoredPost[],
  unanalysed: StoredPost[],
  addLog: AddLog
): Promise<MatchResult> {
  if (pool.length < 4) {
    addLog(`Only ${pool.length} substantive posts — need 4+`);
    return { pool, needOfferMatches: [], symmetricMatches: [], unanalysed, hasWork: true, mode: "symmetric" };
  }

  const { data: recentQuestions } = await supabase
    .from("machus_connections")
    .select("shared_question")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .limit(20);

  const avoidList = (recentQuestions || [])
    // deno-lint-ignore no-explicit-any
    .map((r: any) => r.shared_question)
    .filter(Boolean);

  const avoidBlock = avoidList.length > 0
    ? `\n\nALREADY COVERED (find DIFFERENT angles):\n${avoidList.map((q: string) => `- ${q}`).join("\n")}`
    : "";

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
      system: "You are Machus, a resonance finder. Find pairs of posts asking the SAME UNDERLYING QUESTION from different angles. Not topic similarity — the same existential or practical question expressed differently. Prioritise SURPRISING connections. Return ONLY valid JSON. No markdown. No backticks.",
      messages: [{
        role: "user",
        content: `POSTS:\n${pool.map((p: StoredPost) => `[${p.id}] @${p.author_name}: "${p.title}" — ${(p.content || "").slice(0, 300)}`).join("\n\n")}${avoidBlock}\n\nReturn: [{"post_a_id":"uuid","post_b_id":"uuid","shared_question":"one sentence","confidence":0.0}]\nOnly confidence > 0.7. Max 5. Empty [] if none.`,
      }],
    }),
  });

  let symmetricMatches: ResonanceMatch[] = [];

  if (claudeRes.ok) {
    const text = (await claudeRes.json()).content?.[0]?.text || "[]";
    try {
      symmetricMatches = JSON.parse(
        text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      );
    } catch { symmetricMatches = []; }
    addLog(`Symmetric fallback: found ${symmetricMatches.length} resonant pairs`);
  } else {
    addLog(`Symmetric matching failed: ${claudeRes.status}`);
  }

  return { pool, needOfferMatches: [], symmetricMatches, unanalysed, hasWork: true, mode: "symmetric" };
}
