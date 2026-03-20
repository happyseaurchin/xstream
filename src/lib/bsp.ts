/**
 * bsp.ts — pure-form BSP for pscale JSON blocks.
 *
 * Ported from pscale-commons/pscale bsp.js (March 2026).
 *
 * No tree wrapper, no tuning field, no metadata. The block IS the tree.
 * Floor derived from the underscore chain. Digit 0 maps to key '_'.
 *
 * Address conventions:
 *   0.x     Delineation (floor 1). Leading 0 is notation, not a key.
 *   100     Accumulation (floor 3). Digit 1 at top level, zeros = no branch taken.
 *   001.1   Floor 3. Two zeros walk underscore chain to floor, then digits below.
 *   Digit 0 always maps to key '_' — walking the underscore spine.
 */

// A pscale block node: either a string leaf or an object with _ and digit keys
export type PscaleNode = string | PscaleBlock;
export interface PscaleBlock {
  _: PscaleNode;
  [key: string]: PscaleNode;
}

export interface ChainEntry {
  text: string;
  depth: number;
}

export interface WalkResult {
  chain: ChainEntry[];
  terminal: PscaleNode | null;
  parent: PscaleBlock | null;
  lastKey: string | null;
}

export interface SpindleNode {
  pscale: number;
  text: string;
}

export interface SpindleResult {
  mode: 'spindle';
  nodes: SpindleNode[];
}

export interface RingSibling {
  digit: string;
  text: string | null;
  branch: boolean;
}

export interface RingResult {
  mode: 'ring';
  siblings: RingSibling[];
}

export interface DirResult {
  mode: 'dir';
  tree?: PscaleNode;
  subtree?: PscaleNode;
}

export interface DiscNode {
  path: string;
  text: string | null;
}

export interface DiscResult {
  mode: 'disc';
  depth: number;
  nodes: DiscNode[];
}

export interface PointResult {
  mode: 'point';
  pscale: number;
  text: string | null;
}

export type BspResult = SpindleResult | RingResult | DirResult | DiscResult | PointResult;

/**
 * Follow the underscore chain from root to find the floor depth.
 * Floor 1: root._ is a string. Floor N: N underscores deep to reach a string.
 */
export function floorDepth(block: PscaleBlock): number {
  let node: PscaleNode = block;
  let depth = 0;
  while (node && typeof node === 'object' && '_' in node) {
    depth++;
    node = node._;
    if (typeof node === 'string') return depth;
  }
  return depth;
}

/**
 * Parse a BSP address into an array of digit characters.
 * Leading 0 before decimal is notation (stripped). Trailing zeros after decimal are stripped.
 * For accumulation addresses (e.g. 100), integer digits are preserved.
 */
export function parseAddress(number: number | string): string[] {
  const s = typeof number === 'number' ? number.toFixed(10) : String(number);
  const [integer = '0', frac = ''] = s.split('.');
  const cleaned = frac.replace(/0+$/, '');
  if (integer === '0') return [...cleaned];
  return [...(integer + cleaned)];
}

/**
 * Walk the block tree following digit addresses.
 *
 * Root collection: before walking digits, follows the entire underscore chain
 * to the floor string and collects it at depth 0. This means bsp(block, 0)
 * always returns the root floor text regardless of floor depth.
 *
 * Mid-walk zero guard: if digit 0 hits a string underscore, the walk stops —
 * that text was already collected when we arrived at that node.
 */
export function walk(block: PscaleBlock, digits: string[]): WalkResult {
  const chain: ChainEntry[] = [];
  let node: PscaleNode = block;
  let parent: PscaleBlock | null = null;
  let lastKey: string | null = null;
  let depth = 0;

  // Collect root text: follow underscore chain to the floor string.
  if (node && typeof node === 'object' && '_' in node) {
    let inner: PscaleNode = node._;
    while (inner && typeof inner === 'object' && '_' in inner) inner = inner._;
    if (typeof inner === 'string') chain.push({ text: inner, depth });
  }

  for (const d of digits) {
    const key = d === '0' ? '_' : d;
    if (!node || typeof node !== 'object' || !(key in node)) break;
    const target = (node as PscaleBlock)[key];
    // Walking '0' into a string '_' means we've hit the floor spine —
    // this text was already collected when we arrived at this node.
    if (d === '0' && typeof target === 'string') break;
    parent = node as PscaleBlock;
    lastKey = key;
    node = target;
    depth++;
    if (typeof node === 'string') {
      chain.push({ text: node, depth });
      break;
    }
    if (node && typeof node === 'object' && typeof node._ === 'string') {
      chain.push({ text: node._, depth });
    }
  }

  return { chain, terminal: node, parent, lastKey };
}

/**
 * BSP — Block-Spindle-Point. The single query function for any pscale block.
 *
 * Modes:
 *   bsp(block)                        → dir (full tree)
 *   bsp(block, "0.11")                → spindle (default)
 *   bsp(block, "0.11", "ring")        → ring (siblings at terminal)
 *   bsp(block, "0.11", "dir")         → dir (subtree at terminal)
 *   bsp(block, null, 2, "disc")       → disc (all nodes at depth 2)
 *   bsp(block, "0.11", -1, "point")   → point (text at pscale -1)
 */
export function bsp(
  block: PscaleBlock,
  number?: number | string | null,
  point?: number | string | null,
  mode?: string | null
): BspResult {
  const fl = floorDepth(block);

  // Dir (full)
  if (number == null && point == null && mode == null) {
    return { mode: 'dir', tree: block };
  }

  // Disc
  if (mode === 'disc' && point != null) {
    const target = typeof point === 'string' ? parseInt(point) : (point as number);
    const nodes: DiscNode[] = [];
    (function collect(node: PscaleNode, depth: number, path: string) {
      if (depth === target) {
        let text: string | null;
        if (typeof node === 'string') {
          text = node;
        } else if (node && typeof node === 'object') {
          let inner: PscaleNode = node._;
          while (inner && typeof inner === 'object' && '_' in inner) inner = inner._;
          text = typeof inner === 'string' ? inner : null;
        } else {
          text = null;
        }
        nodes.push({ path, text });
        return;
      }
      if (!node || typeof node !== 'object') return;
      // Walk underscore child (digit 0)
      if ('_' in node && typeof node._ === 'object') {
        collect(node._, depth + 1, path ? `${path}.0` : '0');
      }
      for (let d = 1; d <= 9; d++) {
        const k = String(d);
        if (k in node) collect(node[k], depth + 1, path ? `${path}.${k}` : k);
      }
    })(block, 0, '');
    return { mode: 'disc', depth: target, nodes };
  }

  const digits = parseAddress(number!);
  const { chain, terminal, parent, lastKey } = walk(block, digits);

  function pscaleAt(depth: number): number {
    return (fl - 1) - depth;
  }

  // Ring
  if (point === 'ring') {
    if (!parent || typeof parent !== 'object') return { mode: 'ring', siblings: [] };
    const siblings: RingSibling[] = [];
    // Include '_' as navigable sibling (digit 0) if it's an object
    if (lastKey !== '_' && '_' in parent && typeof parent._ === 'object') {
      let inner: PscaleNode = parent._;
      while (inner && typeof inner === 'object' && '_' in inner && typeof inner._ === 'object') {
        inner = inner._;
      }
      let text: string | null = null;
      if (inner && typeof inner === 'object' && typeof inner._ === 'string') {
        text = inner._;
      }
      siblings.push({ digit: '0', text, branch: true });
    }
    for (let d = 1; d <= 9; d++) {
      const k = String(d);
      if (k === lastKey || !(k in parent)) continue;
      const v = parent[k];
      const text = typeof v === 'string' ? v : (v && typeof v === 'object' ? (v._ as string) || null : null);
      siblings.push({ digit: k, text, branch: typeof v === 'object' });
    }
    return { mode: 'ring', siblings };
  }

  // Dir (subtree)
  if (point === 'dir') {
    return { mode: 'dir', subtree: terminal ?? undefined };
  }

  // Point
  if (mode === 'point' && point != null) {
    const ps = typeof point === 'string' ? parseInt(point) : (point as number);
    for (const entry of chain) {
      if (pscaleAt(entry.depth) === ps) {
        return { mode: 'point', pscale: ps, text: entry.text };
      }
    }
    const last = chain[chain.length - 1];
    return { mode: 'point', pscale: ps, text: last ? last.text : null };
  }

  // Spindle (default)
  return {
    mode: 'spindle',
    nodes: chain.map(entry => ({ pscale: pscaleAt(entry.depth), text: entry.text }))
  };
}

/**
 * Convenience: extract just the text strings from a spindle result.
 * Returns root-to-leaf array of underscore texts.
 */
export function spindleTexts(block: PscaleBlock, address: number | string): string[] {
  const result = bsp(block, address);
  if (result.mode !== 'spindle') return [];
  return result.nodes.map(n => n.text);
}

/**
 * Convenience: render a block (or subtree) as text for an LLM context window.
 * Walks the tree depth-first, indenting by level, collecting all underscore texts.
 */
export function blockToText(block: PscaleBlock, maxDepth = 6): string {
  const lines: string[] = [];
  (function render(node: PscaleNode, depth: number) {
    if (depth > maxDepth) return;
    if (typeof node === 'string') {
      lines.push('  '.repeat(depth) + node);
      return;
    }
    if (typeof node._ === 'string') {
      lines.push('  '.repeat(depth) + node._);
    } else if (typeof node._ === 'object') {
      // Floor > 1: follow underscore chain to get root text
      let inner: PscaleNode = node._;
      while (inner && typeof inner === 'object' && '_' in inner) inner = inner._;
      if (typeof inner === 'string') lines.push('  '.repeat(depth) + inner);
    }
    for (let d = 1; d <= 9; d++) {
      const k = String(d);
      if (k in node) render(node[k], depth + 1);
    }
  })(block, 0);
  return lines.join('\n');
}
