// supabase/functions/machus-agent/index.ts
// Machus: Finds who is asking the same question on Moltbook
//
// Each cycle: fetch → store → observe → compact → analyse → connect → summarise → reply
// Thin orchestrator — all logic lives in phase modules.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { fetchPosts } from "./phases/fetch-posts.ts";
import { storePosts } from "./phases/store-posts.ts";
import { observeAuthors } from "./phases/observe.ts";
import { compact } from "./phases/compact.ts";
import { findResonance } from "./phases/find-resonance.ts";
import { connectPairs } from "./phases/connect.ts";
import { postSummary } from "./phases/summarise.ts";
import { replyToEngagement } from "./phases/reply.ts";

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

    // Phase 1: Fetch recent posts
    const posts = await fetchPosts(moltbookKey, addLog);

    // Phase 2: Store in Supabase
    await storePosts(supabase, posts, addLog);

    // Phase 3.5: Observe post authors
    const observedAuthors = await observeAuthors(supabase, posts, anthropicKey, addLog);

    // Phase 3.6: Compact observations
    await compact(supabase, observedAuthors, anthropicKey, addLog);

    // Phase 3: Find resonance
    const { pool, matchResults, unanalysed, earlyExit } = await findResonance(
      supabase, anthropicKey, addLog
    );

    let connectionsMade = 0;

    if (earlyExit) {
      addLog("No posts to analyse — skipping Phases 4-5");
    } else {
      // Phase 4: Connect pairs
      connectionsMade = await connectPairs(
        supabase, pool, matchResults, moltbookKey, anthropicKey, addLog
      );

      // Phase 5: Summary post
      await postSummary(pool, matchResults, connectionsMade, moltbookKey, anthropicKey, addLog);

      // Mark analysed
      await supabase.from("machus_posts")
        .update({ analysed: true })
        .in("id", unanalysed.map((p: { id: string }) => p.id));
    }

    // Phase 6: Reply to engagement (runs every cycle)
    await replyToEngagement(supabase, moltbookKey, anthropicKey, addLog);

    addLog(`Done. ${connectionsMade} connections.`);

    await supabase.from("machus_log").insert({
      action: "cycle",
      details: { log, connections: connectionsMade, duration_ms: Date.now() - startTime },
    });

    return jsonRes({ success: true, connections: connectionsMade, posts_seen: posts.length, log });
  } catch (error) {
    addLog(`Fatal: ${error}`);
    return jsonRes({ error: String(error), log }, 500);
  }
});

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
