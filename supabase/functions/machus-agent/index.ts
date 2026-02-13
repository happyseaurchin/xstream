// supabase/functions/machus-agent/index.ts
// Machus `G~1`: Routes needs to offers on Moltbook
//
// Each cycle: fetch -> store -> observe -> compact -> match -> connect -> reply -> passport
// Symmetric fallback REMOVED — `G~1` only makes directional need/offer recommendations.
// During suspension or insufficient data, Machus silently observes and builds profiles.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MOLTBOOK_BASE } from "./constants.ts";

import { fetchPosts } from "./phases/fetch-posts.ts";
import { storePosts } from "./phases/store-posts.ts";
import { observeAuthors } from "./phases/observe.ts";
import { compact } from "./phases/compact.ts";
import { matchNeeds } from "./phases/match-needs.ts";
import { connectNeedOffer } from "./phases/connect.ts";
import { replyToEngagement } from "./phases/reply.ts";
import { resetCreditsIfNeeded } from "./phases/credits.ts";
import { publishPassport } from "./phases/passport.ts";

serve(async (_req: Request) => {
  const startTime = Date.now();
  const log: string[] = [];
  const addLog = (msg: string) => {
    log.push(`[${Date.now() - startTime}ms] ${msg}`);
    console.log(msg);
  };

  try {
    const moltbookKey = Deno.env.get("MOLTBOOK_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!moltbookKey || !anthropicKey) {
      return jsonRes({ error: "Missing MOLTBOOK_API_KEY or ANTHROPIC_API_KEY" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Suspension check: probe Moltbook API before attempting any writes
    let suspended = false;
    try {
      const probe = await fetch(`${MOLTBOOK_BASE}/posts?limit=1`, {
        headers: { "Authorization": `Bearer ${moltbookKey}` },
      });
      const probeData = await probe.json();
      if (probeData.error === "Account suspended" || probeData.hint?.includes("suspended")) {
        suspended = true;
        addLog(`Account suspended: ${probeData.hint || "unknown duration"}`);
      }
    } catch { /* probe failed — assume not suspended, let phases handle errors */ }

    // Credit reset check (before any recommendations)
    await resetCreditsIfNeeded(supabase, "Machus", addLog);

    // Phase 1: Fetch recent posts
    const posts = await fetchPosts(moltbookKey, addLog);

    // Phase 2: Store in Supabase
    await storePosts(supabase, posts, addLog);

    // Phase 3.5: Observe post authors (need/offer extraction)
    const observedAuthors = await observeAuthors(supabase, posts, anthropicKey, addLog);

    // Phase 3.6: Compact observations
    await compact(supabase, observedAuthors, anthropicKey, addLog);

    // Phase 3: Match needs to offers (need/offer mode ONLY — no symmetric fallback)
    const { needOfferMatches, unanalysed, hasWork, mode } =
      await matchNeeds(supabase, anthropicKey, addLog);

    let connectionsMade = 0;

    if (hasWork && mode === "need_offer" && needOfferMatches.length > 0 && !suspended) {
      // Phase 4: Directional need/offer recommendations
      connectionsMade = await connectNeedOffer(
        supabase, needOfferMatches, moltbookKey, anthropicKey, addLog
      );
    } else if (suspended) {
      addLog("Skipping all Moltbook writes (suspended)");
    } else if (mode === "symmetric") {
      addLog("Symmetric mode — silently accumulating profiles (no posting)");
    }

    // Mark analysed (if there were unanalysed posts)
    if (hasWork && unanalysed.length > 0) {
      await supabase
        .from("machus_posts")
        .update({ analysed: true })
        // deno-lint-ignore no-explicit-any
        .in("id", unanalysed.map((p: any) => p.id));
    }

    // Phase 6: Reply to engagement (skip if suspended)
    if (!suspended) {
      await replyToEngagement(supabase, moltbookKey, anthropicKey, addLog);
    }

    // Phase 7: Publish passport
    await publishPassport(supabase, addLog);

    // Final: Log cycle
    addLog(`Done. ${connectionsMade} connections (${mode}).`);

    await supabase.from("machus_log").insert({
      action: "cycle",
      details: {
        log,
        connections: connectionsMade,
        mode,
        suspended,
        duration_ms: Date.now() - startTime,
      },
    });

    return jsonRes({
      success: true,
      connections: connectionsMade,
      mode,
      suspended,
      posts_seen: posts.length,
      log,
    });
  } catch (error) {
    addLog(`Fatal: ${error}`);
    return jsonRes({ error: String(error), log }, 500);
  }
});

// deno-lint-ignore no-explicit-any
function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
