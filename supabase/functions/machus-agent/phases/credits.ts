// supabase/functions/machus-agent/phases/credits.ts
// Credit mechanics for `G~1`
//
// Daily allocation: 1.0 credits
// Each recommendation costs: 0.1 credits
// Max 10 recommendations per day
// Resets every 24 hours

import type { AddLog, SupabaseClient } from "../types.ts";

const DAILY_ALLOCATION = 1.0;
const COST_PER_RECOMMENDATION = 0.1;

export async function ensureCreditRow(
  supabase: SupabaseClient,
  botName: string,
  addLog: AddLog
): Promise<void> {
  const { data } = await supabase
    .from("bot_credits")
    .select("name")
    .eq("name", botName)
    .limit(1);

  if (!data || data.length === 0) {
    await supabase.from("bot_credits").insert({
      name: botName,
      daily_allocation: DAILY_ALLOCATION,
      daily_spent: 0.0,
      daily_reset_at: new Date().toISOString(),
      cumulative_reputation: 0.0,
    });
    addLog(`Created credit row for ${botName}`);
  }
}

export async function resetCreditsIfNeeded(
  supabase: SupabaseClient,
  botName: string,
  addLog: AddLog
): Promise<void> {
  await ensureCreditRow(supabase, botName, addLog);

  const { data } = await supabase
    .from("bot_credits")
    .select("daily_reset_at, daily_spent")
    .eq("name", botName)
    .limit(1);

  if (!data || data.length === 0) return;

  const resetAt = new Date(data[0].daily_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceReset >= 24) {
    await supabase
      .from("bot_credits")
      .update({
        daily_spent: 0.0,
        daily_reset_at: now.toISOString(),
      })
      .eq("name", botName);
    addLog(`Credits reset for ${botName} (was ${data[0].daily_spent} spent)`);
  }
}

export async function checkCredit(
  supabase: SupabaseClient,
  botName: string,
  addLog: AddLog
): Promise<boolean> {
  const { data } = await supabase
    .from("bot_credits")
    .select("daily_allocation, daily_spent")
    .eq("name", botName)
    .limit(1);

  if (!data || data.length === 0) {
    addLog(`No credit row for ${botName} — allowing`);
    return true;
  }

  const remaining = data[0].daily_allocation - data[0].daily_spent;
  return remaining >= COST_PER_RECOMMENDATION;
}

export async function spendCredit(
  supabase: SupabaseClient,
  botName: string,
  amount: number,
  addLog: AddLog
): Promise<void> {
  const { data } = await supabase
    .from("bot_credits")
    .select("daily_spent")
    .eq("name", botName)
    .limit(1);

  if (!data || data.length === 0) return;

  await supabase
    .from("bot_credits")
    .update({ daily_spent: data[0].daily_spent + amount })
    .eq("name", botName);

  addLog(`Credit spent: ${amount} (total: ${(data[0].daily_spent + amount).toFixed(1)})`);
}
