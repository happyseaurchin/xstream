// supabase/functions/machus-agent/phases/connect.ts
// Phase 4: Post connection comments on Moltbook (`G~1`)
//
// Two modes:
//   need/offer: directional recommendation on needer's thread
//   symmetric:  fallback symmetric comments (same as `G~0.5`)

import { NEXUS_URL, isCoordinationRelevant } from "../constants.ts";
import { moltbookComment } from "../moltbook.ts";
import type { AddLog, SupabaseClient, StoredPost, ResonanceMatch, NeedOfferMatch } from "../types.ts";
import { checkCredit, spendCredit } from "./credits.ts";

// --- Need/offer directional recommendations ---

export async function connectNeedOffer(
  supabase: SupabaseClient,
  needOfferMatches: NeedOfferMatch[],
  moltbookKey: string,
  anthropicKey: string,
  addLog: AddLog
): Promise<number> {
  let connectionsMade = 0;

  for (const match of needOfferMatches) {
    if (match.confidence < 0.7) continue;

    // Check credit before each recommendation
    const hasCredit = await checkCredit(supabase, "Machus", addLog);
    if (!hasCredit) {
      addLog("Daily credit exhausted — stopping recommendations");
      break;
    }

    // Find needer's most recent post to comment on
    const { data: neederPost } = await supabase
      .from("machus_posts")
      .select("id, moltbook_post_id, title")
      .eq("author_name", match.needer)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!neederPost || neederPost.length === 0) {
      addLog(`No post found for needer @${match.needer} — skip`);
      continue;
    }

    // Check if we've already connected these two in the last 48h
    const { data: recentConn } = await supabase
      .from("machus_connections")
      .select("id")
      .or(`and(post_a_id.eq.${neederPost[0].id},shared_question.ilike.%${match.need.slice(0, 30)}%)`)
      .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recentConn && recentConn.length > 0) {
      addLog(`Already connected @${match.needer} recently — skip`);
      continue;
    }

    const relevant = isCoordinationRelevant(match.need);
    const nexusSuffix = relevant
      ? `\n\nThis touches coordination architecture — semantic-number coordinates as addresses for meaning: ${NEXUS_URL}`
      : "";

    addLog(`Recommending @${match.provider} to @${match.needer}: "${match.need.slice(0, 60)}"`);

    const commentId = await moltbookComment(
      neederPost[0].moltbook_post_id,
      `@${match.needer}, based on what I've observed, @${match.provider} may have what you're looking for — ${match.offer_match}. ${match.need}${nexusSuffix}`,
      moltbookKey, anthropicKey, addLog
    );
    await new Promise((r) => setTimeout(r, 3000));

    // Store connection
    await supabase.from("machus_connections").insert({
      post_a_id: neederPost[0].id,
      post_b_id: neederPost[0].id, // directional: both reference needer's post
      shared_question: `NEED: ${match.need} | OFFER: ${match.offer_match}`,
      comment_a_id: commentId,
      comment_b_id: null,
    });

    // Create routing entry
    const chainId = `machus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await supabase.from("bot_routing").insert({
      chain_id: chainId,
      bot_name: "Machus",
      received_from: match.needer,
      content_ref: neederPost[0].moltbook_post_id,
      action: "routed",
      passed_to: match.provider,
      credit_spent: 0.1,
    });

    // Debit credit
    await spendCredit(supabase, "Machus", 0.1, addLog);

    connectionsMade++;
  }

  return connectionsMade;
}

// --- Symmetric fallback (same as `G~0.5`) ---

export async function connectPairsSymmetric(
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

    // Check credit before each recommendation
    const hasCredit = await checkCredit(supabase, "Machus", addLog);
    if (!hasCredit) {
      addLog("Daily credit exhausted — stopping recommendations");
      break;
    }

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
      `Connecting @${postA.author_name} <-> @${postB.author_name}: "${match.shared_question}" [nexus: ${relevant}]`
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

    // Routing entry for each symmetric recommendation (counts as 2)
    const chainId = `machus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await supabase.from("bot_routing").insert({
      chain_id: chainId,
      bot_name: "Machus",
      received_from: postA.author_name,
      content_ref: postA.moltbook_post_id,
      action: "routed",
      passed_to: postB.author_name,
      credit_spent: 0.1,
    });
    await spendCredit(supabase, "Machus", 0.1, addLog);

    connectionsMade++;
  }

  return connectionsMade;
}
