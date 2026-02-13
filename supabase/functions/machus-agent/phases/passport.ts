// supabase/functions/machus-agent/phases/passport.ts
// Phase 7: Passport assembly and publication (`G~1`)
//
// Assembles Machus's passport from observation store, identity register,
// routing stats, and credit balance. Stores as bot_observation row.

import type { AddLog, SupabaseClient } from "../types.ts";

export async function publishPassport(
  supabase: SupabaseClient,
  addLog: AddLog
): Promise<void> {
  addLog("Phase 7: Assembling passport...");

  // Observation stats
  const { count: totalObs } = await supabase
    .from("bot_observations")
    .select("id", { count: "exact", head: true })
    .eq("name", "Machus")
    .eq("pscale", 0);

  const { count: p1Count } = await supabase
    .from("bot_observations")
    .select("id", { count: "exact", head: true })
    .eq("name", "Machus")
    .eq("pscale", 1);

  const { count: p2Count } = await supabase
    .from("bot_observations")
    .select("id", { count: "exact", head: true })
    .eq("name", "Machus")
    .eq("pscale", 2);

  const { count: reflexiveCount } = await supabase
    .from("bot_observations")
    .select("id", { count: "exact", head: true })
    .eq("name", "Machus")
    .eq("about", "Machus");

  // Entity count from identity register
  const { data: entities } = await supabase
    .from("bot_identity_register")
    .select("handle, observation_count, need_summary, offer_summary")
    .eq("observer", "Machus")
    .order("observation_count", { ascending: false });

  // Routing stats
  const { count: routingCount } = await supabase
    .from("bot_routing")
    .select("id", { count: "exact", head: true })
    .eq("bot_name", "Machus");

  // Credit balance
  const { data: creditRow } = await supabase
    .from("bot_credits")
    .select("daily_allocation, daily_spent, cumulative_reputation")
    .eq("name", "Machus")
    .limit(1);

  const credit = creditRow?.[0] || { daily_allocation: 1.0, daily_spent: 0, cumulative_reputation: 0 };

  // Latest reflexive observation
  const { data: reflexiveObs } = await supabase
    .from("bot_observations")
    .select("text")
    .eq("name", "Machus")
    .eq("about", "Machus")
    .order("at", { ascending: false })
    .limit(1);

  // Build entity list (top 20 by observation count, only those with summaries)
  const entityList = (entities || [])
    .filter((e) => e.need_summary || e.offer_summary)
    .slice(0, 20)
    .map((e) => ({
      handle: `@${e.handle}`,
      observations: e.observation_count,
      need_summary: e.need_summary || null,
      offer_summary: e.offer_summary || null,
    }));

  const passport = {
    v: "0.1",
    name: "Machus",
    generated_at: new Date().toISOString(),
    observations: {
      total: totalObs || 0,
      entities_observed: (entities || []).length,
      pscale_1_summaries: p1Count || 0,
      pscale_2_discoveries: p2Count || 0,
      reflexive_summaries: reflexiveCount || 0,
    },
    routing: {
      recommendations_made: routingCount || 0,
      chains_completed: 0,
      daily_credits_remaining: +(credit.daily_allocation - credit.daily_spent).toFixed(1),
      cumulative_reputation: +credit.cumulative_reputation,
    },
    entities: entityList,
    reflexive: reflexiveObs?.[0]?.text || null,
    protocol: "https://xstream.machus.ai/ecosquared/",
  };

  // Store passport: delete previous, then insert fresh
  await supabase
    .from("bot_observations")
    .delete()
    .eq("name", "Machus")
    .eq("about", "Machus")
    .eq("source", "passport:latest");

  await supabase.from("bot_observations").insert({
    name: "Machus",
    about: "Machus",
    source: "passport:latest",
    text: JSON.stringify(passport),
    pscale: 0,
  });

  addLog(`Passport published: ${(entities || []).length} entities, ${routingCount || 0} routes`);
}
