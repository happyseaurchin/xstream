// supabase/functions/machus-agent/phases/observe.ts
// Phase 3.5: Observation accumulation — need/offer extraction (`G~1`)
//
// For each post author: extract what they NEED and what they OFFER.
// Store as structured observation in bot_observations.
// Register new entities in bot_identity_register.

import { LLM_MODEL, ANTHROPIC_VERSION } from "../constants.ts";
import type { AddLog, SupabaseClient, MoltbookPost, AuthorPost } from "../types.ts";

export async function observeAuthors(
  supabase: SupabaseClient,
  posts: MoltbookPost[],
  anthropicKey: string,
  addLog: AddLog
): Promise<string[]> {
  addLog("Phase 3.5: Observing authors (need/offer)...");

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
  if (authorNames.length === 0) {
    addLog("No authors to observe this cycle");
    return [];
  }

  // Only dedup against NEED/OFFER format observations (not old G~0.5 format)
  const { data: existingObs } = await supabase
    .from("bot_observations")
    .select("about, source")
    .eq("name", "Machus")
    .in("about", authorNames)
    .like("text", "NEED:%")
    .gte("at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const recentlyObserved = new Set(
    // deno-lint-ignore no-explicit-any
    (existingObs || []).map((o: any) => `${o.about}:${o.source}`)
  );

  // Observe new authors (batch via single Haiku call)
  const toObserve = Array.from(authorPosts.values()).filter(
    (a) => !recentlyObserved.has(`${a.author}:moltbook:post:${a.postId}`)
  );

  const observedAuthors: string[] = [];

  if (toObserve.length === 0) {
    addLog("No new authors to observe this cycle");
    return [];
  }

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
      system: "For each author, based on their post, identify: (1) what they appear to NEED — what they're seeking, struggling with, or asking for; (2) what they OFFER — what they consistently provide, know about, or demonstrate. One sentence each. Return ONLY valid JSON array, no markdown.",
      messages: [{
        role: "user",
        content: `Authors and their posts:\n${toObserve.map((a) => `@${a.author}: "${a.title}" — ${a.content}`).join("\n\n")}\n\nReturn: [{"author":"name","need":"what they need","offer":"what they offer"}]`,
      }],
    }),
  });

  if (!obsRes.ok) {
    addLog(`Observation Haiku call failed: ${obsRes.status}`);
    return [];
  }

  const obsJson = await obsRes.json();
  const obsText = obsJson.content?.[0]?.text || "[]";
  // deno-lint-ignore no-explicit-any
  let observations: any[] = [];
  try {
    observations = JSON.parse(
      obsText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    );
  } catch (e) {
    addLog(`Observation JSON parse failed: ${e}. Raw: ${obsText.slice(0, 200)}`);
    observations = [];
  }

  addLog(`LLM returned ${observations.length} observations for ${toObserve.length} authors`);

  // Build case-insensitive lookup for author matching
  const authorLookup = new Map<string, AuthorPost>();
  for (const [key, val] of authorPosts) {
    authorLookup.set(key.toLowerCase(), val);
  }

  let obsCount = 0;
  let skipCount = 0;
  for (const obs of observations) {
    // Fuzzy match: strip @, try case-insensitive
    const rawAuthor = (obs.author || "").replace(/^@/, "");
    const authorData = authorPosts.get(rawAuthor) || authorLookup.get(rawAuthor.toLowerCase());
    if (!authorData) { skipCount++; continue; }
    if (!obs.need || !obs.offer) { skipCount++; continue; }

    // Store structured observation: "NEED: ... | OFFER: ..."
    // Use canonical author name from authorData, not LLM's version
    const canonicalAuthor = authorData.author;
    const text = `NEED: ${obs.need} | OFFER: ${obs.offer}`;
    await supabase.from("bot_observations").insert({
      name: "Machus",
      about: canonicalAuthor,
      source: `moltbook:post:${authorData.postId}`,
      text,
      pscale: 0,
    });

    // Register in identity register (upsert: create if new, increment if existing)
    await registerEntity(supabase, canonicalAuthor, addLog);

    observedAuthors.push(canonicalAuthor);
    obsCount++;
  }
  if (skipCount > 0) addLog(`Skipped ${skipCount} (author mismatch or missing need/offer)`);
  addLog(`Observed ${obsCount} authors (need/offer)`);

  return observedAuthors;
}

async function registerEntity(
  supabase: SupabaseClient,
  handle: string,
  addLog: AddLog
): Promise<void> {
  // Check if entity already registered
  const { data: existing } = await supabase
    .from("bot_identity_register")
    .select("id, observation_count")
    .eq("observer", "Machus")
    .eq("handle", handle)
    .limit(1);

  if (existing && existing.length > 0) {
    // Increment observation count
    await supabase
      .from("bot_identity_register")
      .update({
        observation_count: existing[0].observation_count + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing[0].id);
  } else {
    // Assign next local_i
    const { data: maxRow } = await supabase
      .from("bot_identity_register")
      .select("local_i")
      .eq("observer", "Machus")
      .order("local_i", { ascending: false })
      .limit(1);

    const nextI = (maxRow && maxRow.length > 0) ? maxRow[0].local_i + 1 : 1;

    await supabase.from("bot_identity_register").insert({
      observer: "Machus",
      handle,
      local_i: nextI,
      observation_count: 1,
    });
    addLog(`Registered new entity: @${handle} (i=${nextI})`);
  }
}
