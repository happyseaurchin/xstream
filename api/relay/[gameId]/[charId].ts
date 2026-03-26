/**
 * PUT /api/relay/[gameId]/[charId] — store a character's block
 * GET /api/relay/[gameId]/[charId] — get a specific character's block
 */
import { put, head } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { gameId, charId } = req.query as { gameId: string; charId: string };
  const key = `relay/${gameId}/${charId}.json`;

  if (req.method === 'PUT') {
    try {
      // Parse body — may be string or already parsed
      let block = req.body;
      if (typeof block === 'string') {
        block = JSON.parse(block);
      }
      if (!block || typeof block !== 'object') {
        return res.status(400).json({ error: 'Invalid JSON body', received: typeof block });
      }

      // Strip API key before storing — never relay secrets
      const safe = JSON.parse(JSON.stringify(block));
      if (safe.medium) safe.medium.api_key = '[REDACTED]';

      const json = JSON.stringify(safe);

      await put(key, json, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      return res.status(200).json({ ok: true, size: json.length });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      const stack = e instanceof Error ? e.stack?.split('\n').slice(0, 3).join('\n') : '';
      console.error('[relay PUT]', msg, stack);
      return res.status(500).json({ error: msg, detail: stack });
    }
  }

  if (req.method === 'GET') {
    try {
      const meta = await head(key);
      if (!meta) return res.status(404).json({ error: 'not found' });
      const resp = await fetch(meta.url);
      const data = await resp.json();
      return res.status(200).json(data);
    } catch {
      return res.status(404).json({ error: 'not found' });
    }
  }

  return res.status(405).json({ error: 'method not allowed' });
}
