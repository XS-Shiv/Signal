import { Idea, LIVE, Weights, Status } from './types';

const DAY = 86_400_000;

export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** Weighted value over effort, scaled to 0–100 so scores are comparable. */
export function score(o: Idea, w: Weights): number {
  const eff = Math.pow(clamp(o.effort || 3, 1, 5), w.wEff);
  const raw = (o.portfolio * w.wP + o.excite * w.wE + o.reach * w.wR + o.learn * w.wL) / eff;
  const max = (5 * w.wP + 5 * w.wE + 5 * w.wR + 5 * w.wL) / Math.pow(1, w.wEff);
  if (!isFinite(raw) || max === 0) return 0;
  return Math.round((raw / max) * 100);
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return null;
  return Math.floor((Date.now() - t) / DAY);
}

export function ago(iso: string | null): string {
  const d = daysSince(iso);
  if (d === null) return '—';
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  return `${d}d ago`;
}

export const isLive = (o: Idea) => LIVE.includes(o.status as Status);

export function isStale(o: Idea, w: Weights): boolean {
  return isLive(o) && (daysSince(o.touched_at) ?? 0) >= (w.staleDays || 14);
}

/** An idea with no spark or no next action is a note, not a captured idea. */
export function unfinished(o: Idea): boolean {
  return isLive(o) && (!o.next_action.trim() || !o.why.trim());
}

export function progress(o: Idea) {
  const t = o.tasks?.length ?? 0;
  if (!t) return null;
  const d = o.tasks.filter(x => x.done).length;
  return { done: d, total: t, pct: Math.round((d / t) * 100) };
}

export function isDue(p: { next_touch: string | null }): boolean {
  if (!p.next_touch) return false;
  return new Date(`${p.next_touch}T23:59:59`).getTime() <= Date.now();
}

export function effortBand(o: Idea): string {
  if (o.effort <= 2) return '1 · an evening or two';
  if (o.effort <= 3) return '2 · a weekend';
  return '3 · weeks';
}

export function scoreBand(o: Idea, w: Weights): string {
  const s = score(o, w);
  if (s >= 70) return '70+ · do these';
  if (s >= 45) return '45–69 · maybe';
  return 'under 45 · later';
}
