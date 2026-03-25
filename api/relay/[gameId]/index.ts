/**
 * GET /api/relay/[gameId]?exclude=charId — list all blocks for a game
 *
 * Returns an array of character blocks, excluding the requester's own.
 * This is what the kernel polls to discover peer events and dominos.
 */
import { list } from '@vercel/blob';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const { gameId, exclude } = req.query as { gameId: string; exclude?: string };
  const prefix = `relay/${gameId}/`;

  try {
    const { blobs } = await list({ prefix });

    // Fetch each blob's content, excluding the requester's own
    const blocks = await Promise.all(
      blobs
        .filter(blob => {
          if (!exclude) return true;
          // blob.pathname is like "relay/abc123/kael.json"
          const charId = blob.pathname.split('/').pop()?.replace('.json', '');
          return charId !== exclude;
        })
        .map(async blob => {
          try {
            const resp = await fetch(blob.url);
            return await resp.json();
          } catch {
            return null;
          }
        })
    );

    return res.status(200).json(blocks.filter(Boolean));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
