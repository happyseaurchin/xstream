// supabase/functions/machus-agent/phases/fetch-posts.ts
// Phase 1: Fetch recent posts from Moltbook

import { MOLTBOOK_BASE } from "../constants.ts";
import type { AddLog, MoltbookPost } from "../types.ts";

export async function fetchPosts(
  moltbookKey: string,
  addLog: AddLog
): Promise<MoltbookPost[]> {
  addLog("Phase 1: Fetching posts...");

  // deno-lint-ignore no-explicit-any
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
  return posts;
}
