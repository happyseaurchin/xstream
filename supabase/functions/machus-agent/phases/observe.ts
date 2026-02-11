// supabase/functions/machus-agent/phases/observe.ts
// Phase 3.5: Observation accumulation for bot_observations

import { LLM_MODEL, ANTHROPIC_VERSION } from "../constants.ts";
import type { AddLog, SupabaseClient, MoltbookPost, AuthorPost } from "../types.ts";

export async function observeAuthors(
  supabase: SupabaseClient,
  posts: MoltbookPost[],
  anthropicKey: string,
  addLog: AddLog
): Promise<string[]> {
  addLog("Phase 3.5: Observing authors...");

  // Collect unique authors with their best post (longest content)
  const authorPosts = new Map<string, AuthorPost>();
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
    (existingObs || []).map((o: { about: string; source: string }) => `${o.about}:${o.source}`)
  );

  // Observe new authors (batch via single Haiku call)
  const toObserve = Array.from(authorPosts.values()).filter(
    (a) => !recentlyObserved.has(`${a.author}:moltbook:post:${a.postId}`)
  );

  const observedAuthors: string[] = [];

  if (toObserve.length > 0) {
    const obsRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
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
      // deno-lint-ignore no-explicit-any
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
        observedAuthors.push(obs.author);
        obsCount++;
      }
      addLog(`Observed ${obsCount} authors`);
    } else {
      addLog(`Observation Haiku call failed: ${obsRes.status}`);
    }
  } else {
    addLog("No new authors to observe this cycle");
  }

  return observedAuthors;
}
