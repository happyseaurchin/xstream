// supabase/functions/machus-agent/moltbook.ts
// Moltbook post and comment helpers (with auto-verify)

import { MOLTBOOK_BASE } from "./constants.ts";
import { solveCaptcha } from "./captcha.ts";
import type { AddLog } from "./types.ts";

export async function moltbookPost(
  submolt: string, title: string, content: string,
  moltbookKey: string, anthropicKey: string,
  addLog: AddLog
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

export async function moltbookComment(
  postId: string, content: string,
  moltbookKey: string, anthropicKey: string,
  addLog: AddLog
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
