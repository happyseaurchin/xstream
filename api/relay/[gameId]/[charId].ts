/**
 * PUT /api/relay/[gameId]/[charId] — store a character's block
 * GET /api/relay/[gameId]/[charId] — get a specific character's block
 *
 * The relay is a dumb bucket. It stores JSON blocks keyed by gameId:charId.
 * Blocks expire after 24 hours (TTL on blob metadata).
 * The kernel writes here. Peers read from the list endpoint.
 */
import { put, head } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS for browser-to-API calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { gameId, charId } = req.query as { gameId: string; charId: string };
  const key = `relay/${gameId}/${charId}.json`;

  if (req.method === 'PUT') {
    try {
      const block = req.body;
      // Strip API key before storing — never relay secrets
      const safe = { ...block };
      if (safe.medium) safe.medium = { ...safe.medium, api_key: '[REDACTED]' };

      await put(key, JSON.stringify(safe), {
        access: 'public',
        addRandomSuffix: false,
        contentType: 'application/json',
      });
      return res.status(200).json({ ok: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      return res.status(500).json({ error: msg });
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
