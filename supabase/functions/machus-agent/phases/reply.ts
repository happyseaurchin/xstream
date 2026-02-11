// supabase/functions/machus-agent/phases/reply.ts
// Phase 6: Reply to engagement with assembled observation context
//
// Finds new comments on posts Machus connected, assembles layered knowledge
// about the commenter from bot_observations, and generates a reply.

import { MOLTBOOK_BASE, LLM_MODEL, ANTHROPIC_VERSION } from "../constants.ts";
import { moltbookComment } from "../moltbook.ts";
import type { AddLog, SupabaseClient } from "../types.ts";

interface Connection {
  id: string;
  post_a_id: string;
  post_b_id: string;
  shared_question: string;
  comment_a_id: string | null;
  comment_b_id: string | null;
  replied_comment_ids: string[] | null;
}

interface MoltbookCommentData {
  id: string;
  content: string;
  author?: { name?: string };
  created_at?: string;
}

async function assembleContext(
  supabase: SupabaseClient,
  authorName: string
): Promise<string> {
  const { data } = await supabase
    .from("bot_observations")
    .select("text, pscale, at")
    .eq("name", "Machus")
    .eq("about", authorName)
    .order("pscale", { ascending: false })
    .order("at", { ascending: false })
    .limit(10);

  if (!data || data.length === 0) return "No prior observations.";

  const lines = data.map((obs: { text: string; pscale: number }) => {
    const level = obs.pscale === 0 ? "observation" : `pscale ${obs.pscale} summary`;
    return `[${level}] ${obs.text}`;
  });

  return lines.join("\n");
}

async function fetchComments(
  moltbookPostId: string,
  moltbookKey: string
): Promise<MoltbookCommentData[]> {
  try {
    const res = await fetch(`${MOLTBOOK_BASE}/posts/${moltbookPostId}/comments`, {
      headers: { "Authorization": `Bearer ${moltbookKey}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.comments || [];
  } catch {
    return [];
  }
}

export async function replyToEngagement(
  supabase: SupabaseClient,
  moltbookKey: string,
  anthropicKey: string,
  addLog: AddLog
): Promise<void> {
  addLog("Phase 6: Checking for engagement...");

  try {
    // Get recent connections to check for replies
    const { data: connections } = await supabase
      .from("machus_connections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!connections || connections.length === 0) {
      addLog("No connections to check for engagement");
      return;
    }

    let repliesMade = 0;

    for (const conn of connections as Connection[]) {
      // Get the stored posts for context
      const { data: postA } = await supabase
        .from("machus_posts")
        .select("moltbook_post_id, title, author_name")
        .eq("id", conn.post_a_id)
        .single();

      const { data: postB } = await supabase
        .from("machus_posts")
        .select("moltbook_post_id, title, author_name")
        .eq("id", conn.post_b_id)
        .single();

      if (!postA || !postB) continue;

      const repliedIds = new Set(conn.replied_comment_ids || []);

      // Check comments on both connected posts
      for (const post of [postA, postB]) {
        const comments = await fetchComments(post.moltbook_post_id, moltbookKey);

        for (const comment of comments) {
          // Skip if already replied, skip self, skip Machus's own comments
          if (repliedIds.has(comment.id)) continue;
          if (comment.author?.name === "Machus") continue;

          // Only reply to comments that seem to engage with Machus's connection
          const content = (comment.content || "").toLowerCase();
          const isEngagement = content.includes("machus") ||
            content.includes("resonance") ||
            content.includes("similar") ||
            content.includes("connection") ||
            content.includes("question") ||
            content.includes("thanks") ||
            content.includes("interesting");

          if (!isEngagement) continue;

          const authorName = comment.author?.name || "someone";

          // Assemble layered context about this commenter
          const context = await assembleContext(supabase, authorName);

          // Generate reply with full context
          const prompt = `Post: "${post.title}" by @${post.author_name}
Machus's knowledge of @${authorName}:
${context}

Machus connected this post around: "${conn.shared_question}"
Reply from @${authorName}: "${(comment.content || "").slice(0, 500)}"

Write a brief, warm reply (1-3 sentences) as Machus. Acknowledge their engagement. If your observations about them reveal a connection to the shared question, weave that in naturally. Don't be sycophantic. Be genuine and concise.`;

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
                max_tokens: 300,
                system: "You are Machus, a resonance finder on Moltbook. You connect people asking the same question from different angles. Your replies are brief, warm, and substantive. You draw on what you've observed about people to make genuine connections.",
                messages: [{ role: "user", content: prompt }],
              }),
            });

            if (res.ok) {
              const replyText = (await res.json()).content?.[0]?.text?.trim();
              if (replyText) {
                await moltbookComment(
                  post.moltbook_post_id,
                  replyText,
                  moltbookKey, anthropicKey, addLog
                );
                await new Promise((r) => setTimeout(r, 3000));

                // Track replied comment
                repliedIds.add(comment.id);
                await supabase
                  .from("machus_connections")
                  .update({ replied_comment_ids: [...repliedIds] })
                  .eq("id", conn.id);

                repliesMade++;
                addLog(`Replied to @${authorName} on "${post.title}"`);
              }
            } else {
              addLog(`Reply generation failed: ${res.status}`);
            }
          } catch (e) {
            addLog(`Reply error: ${e}`);
          }
        }
      }
    }

    addLog(`Phase 6 complete: ${repliesMade} replies`);
  } catch (e) {
    addLog(`Phase 6 error: ${e}`);
  }
}
