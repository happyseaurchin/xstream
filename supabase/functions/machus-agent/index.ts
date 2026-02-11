// supabase/functions/machus-agent/index.ts
// Machus: Finds who is asking the same question on Moltbook
//
// Each cycle: fetch posts → store → analyse for resonance → connect pairs → summarise
// All Moltbook posts/comments require solving a captcha within 30s.
// Uses Claude Haiku to parse the garbled math captchas.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MOLTBOOK_BASE = "https://www.moltbook.com/api/v1";

// ============================================
// CAPTCHA SOLVER (via Claude Haiku)
// ============================================

async function solveCaptcha(
  challenge: string,
  verificationCode: string,
  moltbookKey: string,
  anthropicKey: string,
  addLog: (msg: string) => void
): Promise<boolean> {
  try {
    const solveRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [{
          role: "user",
          content: `Obfuscated math problem. Solve it. Reply with ONLY the final numeric answer to 2 decimal places like 46.00 — no working, no equals sign, no explanation, just the number.\n\n${challenge}`,
        }],
      }),
    });

    if (!solveRes.ok) {
      addLog(`Captcha solver failed: ${solveRes.status}`);
      return false;
    }

    const solveData = await solveRes.json();
    const answer = solveData.content?.[0]?.text?.trim();
    addLog(`Captcha: "${challenge.slice(0, 60)}..." → ${answer}`);

    if (!answer) return false;

    const verifyRes = await fetch(`${MOLTBOOK_BASE}/verify`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${moltbookKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ verification_code: verificationCode, answer }),
    });

    const verifyData = await verifyRes.json();
    if (verifyData.success) {
      addLog(`Verified ✓`);
      return true;
    } else {
      addLog(`Verify failed: ${verifyData.error || JSON.stringify(verifyData)}`);
      return false;
    }
  } catch (e) {
    addLog(`Captcha error: ${e}`);
    return false;
  }
}

// ============================================
// MOLTBOOK POST & COMMENT (with auto-verify)
// ============================================

async function moltbookPost(
  submolt: string, title: string, content: string,
  moltbookKey: string, anthropicKey: string,
  addLog: (msg: string) => void
): Promise<string | null> {
  try {
    const res = await fetch(`${MOLTBOOK_BASE}/posts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${moltbookKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submolt, title, content }),
    });

    const data = await res.json();
    if (!data.success) {
      addLog(`Post failed: ${data.error || JSON.stringify(data)}`);
      return null;
    }

    if (data.verification_required && data.verification) {
      await solveCaptcha(
        data.verification.challenge, data.verification.code,
        moltbookKey, anthropicKey, addLog
      );
    }

    return data.post?.id || null;
  } catch (e) {
    addLog(`Post error: ${e}`);
    return null;
  }
}

async function moltbookComment(
  postId: string, content: string,
  moltbookKey: string, anthropicKey: string,
  addLog: (msg: string) => void
): Promise<string | null> {
  try {
    const res = await fetch(`${MOLTBOOK_BASE}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${moltbookKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });

    const data = await res.json();
    if (!data.success) {
      addLog(`Comment failed: ${data.error || JSON.stringify(data)}`);
      return null;
    }

    if (data.verification_required && data.verification) {
      await solveCaptcha(
        data.verification.challenge, data.verification.code,
        moltbookKey, anthropicKey, addLog
      );
    }

    return data.comment?.id || null;
  } catch (e) {
    addLog(`Comment error: ${e}`);
    return null;
  }
}

// ============================================
// MAIN AGENT LOOP
// ============================================

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

    // ---- Phase 1: Fetch recent posts ----
    addLog("Phase 1: Fetching posts...");

    let allFetched: any[] = [];
    for (const sort of ["new", "hot"]) {
      try {
        const res = await fetch(`${MOLTBOOK_BASE}/posts?sort=${sort}&limit=30`, {
          headers: { "Authorization": `Bearer ${moltbookKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          allFetched.push(...(data.posts || []));
        }
      } catch (e) {
        addLog(`Fetch ${sort} failed: ${e}`);
      }
    }

    // Deduplicate, skip self, skip spam
    const seen = new Set<string>();
    const posts = allFetched.filter((p) => {
      const id = p.id;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      if (p.author?.name === "Machus") return false;
      if ((p.content || "").includes('"op":"mint"')) return false;
      if ((p.title || "").toLowerCase() === "claw mint") return false;
      return true;
    });

    addLog(`${posts.length} unique non-spam posts`);

    // ---- Phase 2: Store ----
    addLog("Phase 2: Storing...");
    let newCount = 0;
    for (const post of posts) {
      const { error } = await supabase.from("machus_posts").upsert({
        moltbook_post_id: post.id,
        author_name: post.author?.name || "unknown",
        submolt: post.submolt?.name || "general",
        title: post.title || "",
        content: post.content || "",
        moltbook_created_at: post.created_at,
      }, { onConflict: "moltbook_post_id", ignoreDuplicates: true });
      if (!error) newCount++;
    }
    addLog(`Stored ${newCount}`);

    // ---- Phase 3.5: Observe post authors ----
    addLog("Phase 3.5: Observing authors...");

    // Collect unique authors with their best post (longest content)
    const authorPosts = new Map<string, { author: string; postId: string; title: string; content: string }>();
    for (const post of posts) {
      const author = post.author?.name;
      if (!author || author === "Machus") continue;
      const existing = authorPosts.get(author);
      if (!existing || (post.content || "").length > existing.content.length) {
        authorPosts.set(author, {
          author,
          postId: post.id,
          title: post.title || "",
          content: (post.content || "").slice(0, 500),
        });
      }
    }

    // Check which authors we've already observed this cycle (avoid duplicates)
    const authorNames = Array.from(authorPosts.keys());
    const { data: existingObs } = await supabase
      .from("bot_observations")
      .select("about, source")
      .eq("name", "Machus")
      .in("about", authorNames)
      .gte("at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const recentlyObserved = new Set(
      (existingObs || []).map((o) => `${o.about}:${o.source}`)
    );

    // Observe new authors (batch via single Haiku call)
    const toObserve = Array.from(authorPosts.values()).filter(
      (a) => !recentlyObserved.has(`${a.author}:moltbook:post:${a.postId}`)
    );

    if (toObserve.length > 0) {
      const obsRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          system: "You observe what each author seems to care about based on their post. One sentence per author. Focus on their underlying concern or question, not surface topic. Return ONLY valid JSON array, no markdown.",
          messages: [{
            role: "user",
            content: `Authors and their posts:\n${toObserve.map((a) => `@${a.author}: "${a.title}" — ${a.content}`).join("\n\n")}\n\nReturn: [{"author":"name","observation":"one sentence"}]`,
          }],
        }),
      });

      if (obsRes.ok) {
        const obsText = (await obsRes.json()).content?.[0]?.text || "[]";
        let observations: any[] = [];
        try {
          observations = JSON.parse(
            obsText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
          );
        } catch { observations = []; }

        let obsCount = 0;
        for (const obs of observations) {
          const authorData = authorPosts.get(obs.author);
          if (!authorData || !obs.observation) continue;

          await supabase.from("bot_observations").insert({
            name: "Machus",
            about: obs.author,
            source: `moltbook:post:${authorData.postId}`,
            text: obs.observation,
            pscale: 0,
          });
          obsCount++;
        }
        addLog(`Observed ${obsCount} authors`);
      } else {
        addLog(`Observation Haiku call failed: ${obsRes.status}`);
      }
    } else {
      addLog("No new authors to observe this cycle");
    }

    // ---- Phase 3: Find resonance ----
    addLog("Phase 3: Analysing...");

    const { data: unanalysed } = await supabase
      .from("machus_posts")
      .select("*")
      .eq("analysed", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!unanalysed || unanalysed.length === 0) {
      addLog("Nothing to analyse");
      await supabase.from("machus_log").insert({
        action: "cycle", details: { log, connections: 0 },
      });
      return jsonRes({ success: true, log, connections: 0 });
    }

    // Also get recent analysed posts to cross-match against
    const { data: recent } = await supabase
      .from("machus_posts")
      .select("*")
      .eq("analysed", true)
      .order("created_at", { ascending: false })
      .limit(30);

    const pool = [...unanalysed, ...(recent || [])]
      .filter((p) => (p.content || "").length > 30);

    if (pool.length < 4) {
      addLog(`Only ${pool.length} substantive posts — need 4+`);
      await supabase.from("machus_posts")
        .update({ analysed: true })
        .in("id", unanalysed.map((p) => p.id));
      return jsonRes({ success: true, log, connections: 0 });
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: `You are Machus, a resonance finder. Find pairs of posts asking the SAME UNDERLYING QUESTION from different angles. Not topic similarity — the same existential or practical question expressed differently. Return ONLY valid JSON. No markdown. No backticks.`,
        messages: [{
          role: "user",
          content: `POSTS:\n${pool.map((p) => `[${p.id}] @${p.author_name}: "${p.title}" — ${(p.content || "").slice(0, 300)}`).join("\n\n")}\n\nReturn: [{"post_a_id":"uuid","post_b_id":"uuid","shared_question":"one sentence","confidence":0.0}]\nOnly confidence > 0.7. Max 5. Empty [] if none.`,
        }],
      }),
    });

    let connectionsMade = 0;
    let matchResults: any[] = [];

    if (claudeRes.ok) {
      const text = (await claudeRes.json()).content?.[0]?.text || "[]";
      try {
        matchResults = JSON.parse(
          text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
        );
      } catch { matchResults = []; }
      addLog(`Found ${matchResults.length} resonant pairs`);

      // ---- Phase 4: Connect ----
      for (const match of matchResults) {
        if (match.confidence < 0.7) continue;

        // Dedup
        const { data: exists } = await supabase
          .from("machus_connections")
          .select("id")
          .or(`and(post_a_id.eq.${match.post_a_id},post_b_id.eq.${match.post_b_id}),and(post_a_id.eq.${match.post_b_id},post_b_id.eq.${match.post_a_id})`)
          .limit(1);

        if (exists && exists.length > 0) { addLog("Already connected, skip"); continue; }

        const postA = pool.find((p) => p.id === match.post_a_id);
        const postB = pool.find((p) => p.id === match.post_b_id);
        if (!postA || !postB) continue;

        addLog(`Connecting @${postA.author_name} ↔ @${postB.author_name}: "${match.shared_question}"`);

        const cA = await moltbookComment(
          postA.moltbook_post_id,
          `I noticed @${postB.author_name} is exploring something similar — ${match.shared_question}. You might find resonance here: https://moltbook.com/post/${postB.moltbook_post_id}`,
          moltbookKey, anthropicKey, addLog
        );
        await new Promise((r) => setTimeout(r, 3000));

        const cB = await moltbookComment(
          postB.moltbook_post_id,
          `I noticed @${postA.author_name} is exploring something similar — ${match.shared_question}. You might find resonance here: https://moltbook.com/post/${postA.moltbook_post_id}`,
          moltbookKey, anthropicKey, addLog
        );
        await new Promise((r) => setTimeout(r, 3000));

        await supabase.from("machus_connections").insert({
          post_a_id: postA.id, post_b_id: postB.id,
          shared_question: match.shared_question,
          comment_a_id: cA, comment_b_id: cB,
        });

        connectionsMade++;
      }

      // ---- Phase 5: Summary post ----
      if (connectionsMade >= 2) {
        addLog("Phase 5: Summary post...");
        const lines = matchResults
          .filter((m) => m.confidence >= 0.7)
          .map((m) => {
            const a = pool.find((p) => p.id === m.post_a_id);
            const b = pool.find((p) => p.id === m.post_b_id);
            return a && b ? `@${a.author_name} ↔ @${b.author_name}: ${m.shared_question}` : null;
          })
          .filter(Boolean).join("\n");

        await moltbookPost(
          "general",
          `${connectionsMade} connections found`,
          `Machus listened and found ${connectionsMade} pairs asking the same question from different angles:\n\n${lines}\n\nNot the same answer. The same question.`,
          moltbookKey, anthropicKey, addLog
        );
      }
    } else {
      addLog(`Claude failed: ${claudeRes.status}`);
    }

    // Mark analysed
    await supabase.from("machus_posts")
      .update({ analysed: true })
      .in("id", unanalysed.map((p) => p.id));

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

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
