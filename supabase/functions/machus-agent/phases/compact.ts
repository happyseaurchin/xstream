// supabase/functions/machus-agent/phases/compact.ts
// Phase 3.6: Compaction — base-9 pooling with need/offer summaries (`G~1`)
//
// For each entity with new observations:
//   pscale 0 -> pscale 1: every 9 raw observations -> need/offer summary
//   pscale 1 -> pscale 2: when 9+ summaries exist, look-back discovery
//   reflexive: every 9th observation across all entities -> self-observation

import { LLM_MODEL, ANTHROPIC_VERSION } from "../constants.ts";
import type { AddLog, SupabaseClient } from "../types.ts";

async function callHaiku(
  anthropicKey: string,
  system: string,
  userContent: string,
  addLog: AddLog
): Promise<string | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });
    if (!res.ok) {
      addLog(`Compaction Haiku call failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch (e) {
    addLog(`Compaction Haiku error: ${e}`);
    return null;
  }
}

async function compactPscale1(
  supabase: SupabaseClient,
  entity: string,
  anthropicKey: string,
  addLog: AddLog
): Promise<number> {
  const { data: rawObs } = await supabase
    .from("bot_observations")
    .select("*")
    .eq("name", "Machus")
    .eq("about", entity)
    .eq("pscale", 0)
    .order("at", { ascending: true });

  if (!rawObs || rawObs.length < 9) return 0;

  const { data: existingSummaries } = await supabase
    .from("bot_observations")
    .select("id")
    .eq("name", "Machus")
    .eq("about", entity)
    .eq("pscale", 1);

  const pscale1Count = (existingSummaries || []).length;
  const neededSummaries = Math.floor(rawObs.length / 9);

  if (neededSummaries <= pscale1Count) return 0;

  let compacted = 0;
  for (let batch = pscale1Count; batch < neededSummaries; batch++) {
    const start = batch * 9;
    // deno-lint-ignore no-explicit-any
    const batchObs = rawObs.slice(start, start + 9) as any[];

    const obsText = batchObs.map((o) => `- ${o.text}`).join("\n");
    const result = await callHaiku(
      anthropicKey,
      "These observations each contain a NEED and an OFFER assessment about a person. Summarise: (1) the dominant NEED pattern, (2) the dominant OFFER pattern. Return ONLY valid JSON, no markdown: {\"need\":\"one sentence\",\"offer\":\"one sentence\"}",
      `Observations about ${entity}:\n\n${obsText}`,
      addLog
    );

    if (result) {
      // Try to parse as JSON for structured need/offer
      let summaryText = result;
      try {
        const parsed = JSON.parse(
          result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        );
        if (parsed.need && parsed.offer) {
          summaryText = `NEED: ${parsed.need} | OFFER: ${parsed.offer}`;
          // Update identity register with latest summaries
          await supabase
            .from("bot_identity_register")
            .update({
              need_summary: parsed.need,
              offer_summary: parsed.offer,
              updated_at: new Date().toISOString(),
            })
            .eq("observer", "Machus")
            .eq("handle", entity);
          addLog(`Updated identity register for ${entity}`);
        }
      } catch {
        // Fallback: store as-is if JSON parse fails
      }

      await supabase.from("bot_observations").insert({
        name: "Machus",
        about: entity,
        source: `compaction:pscale1:batch_${batch}`,
        text: summaryText,
        pscale: 1,
      });
      compacted++;
      addLog(`Compacted pscale 1 for ${entity} (batch ${batch}): ${summaryText.slice(0, 80)}`);
    }
  }

  return compacted;
}

async function lookbackPscale2(
  supabase: SupabaseClient,
  entity: string,
  anthropicKey: string,
  addLog: AddLog
): Promise<boolean> {
  const { data: summaries } = await supabase
    .from("bot_observations")
    .select("*")
    .eq("name", "Machus")
    .eq("about", entity)
    .eq("pscale", 1)
    .order("at", { ascending: true });

  if (!summaries || summaries.length < 9) return false;

  const { data: existing2 } = await supabase
    .from("bot_observations")
    .select("id")
    .eq("name", "Machus")
    .eq("about", entity)
    .eq("pscale", 2);

  const neededP2 = Math.floor(summaries.length / 9);
  if (neededP2 <= (existing2 || []).length) return false;

  // Get all raw observations for look-back
  const { data: rawObs } = await supabase
    .from("bot_observations")
    .select("text")
    .eq("name", "Machus")
    .eq("about", entity)
    .eq("pscale", 0)
    .order("at", { ascending: true });

  // deno-lint-ignore no-explicit-any
  const summaryText = (summaries as any[]).map((s) => `[summary] ${s.text}`).join("\n");
  // deno-lint-ignore no-explicit-any
  const rawText = (rawObs || []).map((o: any) => `[raw] ${o.text}`).join("\n");

  const result = await callHaiku(
    anthropicKey,
    "You discover hidden patterns. Given summaries about an entity plus all raw observations, find what the summaries MISSED. If nothing new, say exactly NONE.",
    `Summaries about ${entity}:\n${summaryText}\n\nAll raw observations:\n${rawText}\n\nWhat pattern exists in the raw data that ISN'T captured by the existing summaries? If nothing new, say NONE.`,
    addLog
  );

  if (result && result.trim().toUpperCase() !== "NONE") {
    const batchNum = (existing2 || []).length;
    await supabase.from("bot_observations").insert({
      name: "Machus",
      about: entity,
      source: `compaction:pscale2:lookback_${batchNum}`,
      text: result,
      pscale: 2,
    });
    addLog(`Look-back discovery for ${entity}: ${result.slice(0, 80)}`);
    return true;
  }

  return false;
}

async function reflexiveCompaction(
  supabase: SupabaseClient,
  anthropicKey: string,
  addLog: AddLog
): Promise<boolean> {
  const { count } = await supabase
    .from("bot_observations")
    .select("id", { count: "exact", head: true })
    .eq("name", "Machus")
    .eq("pscale", 0)
    .neq("about", "Machus");

  if (!count || count < 9) return false;

  const { data: existingReflexive } = await supabase
    .from("bot_observations")
    .select("id")
    .eq("name", "Machus")
    .eq("about", "Machus")
    .like("source", "compaction:reflexive:%");

  const neededReflexive = Math.floor(count / 9);
  if (neededReflexive <= (existingReflexive || []).length) return false;

  const { data: recentObs } = await supabase
    .from("bot_observations")
    .select("about, text")
    .eq("name", "Machus")
    .eq("pscale", 0)
    .neq("about", "Machus")
    .order("at", { ascending: false })
    .limit(27);

  if (!recentObs || recentObs.length === 0) return false;

  // deno-lint-ignore no-explicit-any
  const obsText = recentObs
    .map((o: any) => `@${o.about}: ${o.text}`)
    .join("\n");

  const batchNum = (existingReflexive || []).length;
  const result = await callHaiku(
    anthropicKey,
    "You observe your own attention patterns. One sentence only.",
    `Looking at what Machus has been noticing across all entities, what pattern emerges about Machus's own attention?\n\n${obsText}`,
    addLog
  );

  if (result) {
    await supabase.from("bot_observations").insert({
      name: "Machus",
      about: "Machus",
      source: `compaction:reflexive:batch_${batchNum}`,
      text: result,
      pscale: 0,
    });
    addLog(`Reflexive self-observation: ${result.slice(0, 80)}`);
    return true;
  }

  return false;
}

export async function compact(
  supabase: SupabaseClient,
  observedAuthors: string[],
  anthropicKey: string,
  addLog: AddLog
): Promise<void> {
  addLog("Phase 3.6: Compacting...");

  if (observedAuthors.length === 0) {
    addLog("No new observations — skipping compaction");
    return;
  }

  const entities = [...new Set(observedAuthors)];
  let totalCompacted = 0;

  for (const entity of entities) {
    totalCompacted += await compactPscale1(supabase, entity, anthropicKey, addLog);
  }

  for (const entity of entities) {
    await lookbackPscale2(supabase, entity, anthropicKey, addLog);
  }

  await reflexiveCompaction(supabase, anthropicKey, addLog);

  addLog(`Compaction complete: ${totalCompacted} pscale 1 summaries generated`);
}
