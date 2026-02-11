// supabase/functions/machus-agent/phases/store-posts.ts
// Phase 2: Store posts in Supabase

import type { AddLog, SupabaseClient, MoltbookPost } from "../types.ts";

export async function storePosts(
  supabase: SupabaseClient,
  posts: MoltbookPost[],
  addLog: AddLog
): Promise<void> {
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
}
