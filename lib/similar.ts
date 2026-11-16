import { Idea } from './types';

const STOP = new Set([
  'the','a','an','and','or','for','to','of','in','on','with','my','i','it','is',
  'that','this','app','idea','make','build','new','like','about','some','thing',
  'need','want','should','could','maybe','just','get','use'
]);

/** Crude suffix stripping so "matching", "matches" and "match" collide. */
function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s')) return w.slice(0, -1);
  return w;
}

function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
      .map(stem)
  );
}

/**
 * Containment, not Jaccard: a short spoken capture rarely shares most of its
 * words with a title, but if the words it does share are most of the shorter
 * phrase, it is probably the same thing.
 */
export function similarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach(w => { if (B.has(w)) shared++; });
  return shared / Math.min(A.size, B.size);
}

export function likelyDuplicates(text: string, ideas: Idea[], limit = 3) {
  return ideas
    .map(o => ({ idea: o, score: Math.max(similarity(text, o.title), similarity(text, o.why) * 0.8) }))
    .filter(x => x.score >= 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
