// supabase/functions/machus-agent/index.ts
// Machus `G~1`: Routes needs to offers on Moltbook
//
// Each cycle: fetch -> store -> observe -> compact -> match -> connect -> summarise -> reply -> passport
// Thin orchestrator — all logic lives in phase modules.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { fetchPosts } from "./phases/fetch-posts.ts";
import { storePosts } from "./phases/store-posts.ts";
import { observeAuthors } from "./phases/observe.ts";
import { compact } from "./phases/compact.ts";
import { matchNeeds } from "./phases/match-needs.ts";
import { connectNeedOffer, connectPairsSymmetric } from "./phases/connect.ts";
import { postSummary } from "./phases/summarise.ts";
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

    // One-time: Setup owner email for Moltbook account management
    // Safe to call repeatedly — will no-op if already set up
    try {
      const setupRes = await fetch("https://www.moltbook.com/api/v1/agents/me/setup-owner-email", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${moltbookKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "david@ecosquared.co.uk" }),
      });
      const setupData = await setupRes.json();
      addLog(`Owner email setup: ${JSON.stringify(setupData)}`);
    } catch (e) {
      addLog(`Owner email setup skipped: ${e}`);
    }

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

    // Phase 3: Match needs to offers (or symmetric fallback)
    const { pool, needOfferMatches, symmetricMatches, unanalysed, hasWork, mode } =
      await matchNeeds(supabase, anthropicKey, addLog);

    let connectionsMade = 0;

    if (hasWork) {
      if (mode === "need_offer" && needOfferMatches.length > 0) {
        // Phase 4: Directional need/offer recommendations
        connectionsMade = await connectNeedOffer(
          supabase, needOfferMatches, moltbookKey, anthropicKey, addLog
        );
      } else if (mode === "symmetric" && symmetricMatches.length > 0) {
        // Phase 4 (fallback): Symmetric resonance connections
        connectionsMade = await connectPairsSymmetric(
          supabase, pool, symmetricMatches, moltbookKey, anthropicKey, addLog
        );

        // Phase 5: Summary post (only for symmetric mode)
        await postSummary(pool, symmetricMatches, connectionsMade, moltbookKey, anthropicKey, addLog);
      }
    }

    // Mark analysed (if there were unanalysed posts)
    if (hasWork && unanalysed.length > 0) {
      await supabase
        .from("machus_posts")
        .update({ analysed: true })
        // deno-lint-ignore no-explicit-any
        .in("id", unanalysed.map((p: any) => p.id));
    }

    // Phase 6: Reply to engagement (runs every cycle)
    await replyToEngagement(supabase, moltbookKey, anthropicKey, addLog);

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
        duration_ms: Date.now() - startTime,
      },
    });

    return jsonRes({
      success: true,
      connections: connectionsMade,
      mode,
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
