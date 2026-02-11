// supabase/functions/machus-agent/captcha.ts
// Captcha solver via Claude Haiku

import { MOLTBOOK_BASE, LLM_MODEL, ANTHROPIC_VERSION } from "./constants.ts";
import type { AddLog } from "./types.ts";

export async function solveCaptcha(
  challenge: string,
  verificationCode: string,
  moltbookKey: string,
  anthropicKey: string,
  addLog: AddLog
): Promise<boolean> {
  try {
    const solveRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
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
