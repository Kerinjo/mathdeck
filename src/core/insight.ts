// Read-only views over the answer log: per-section history and weak spots.
import { solved, type LogEntry, type Rating, type SkillState } from './scheduler';

/** Ratings, with entries from before self-rating existed read as good / again. */
export const ratingOf = (e: LogEntry): Rating => e.rating ?? (e.ok ? 'good' : 'again');

export interface SectionHistory {
  entries: LogEntry[];
  counts: Record<Rating, number>;
  first: number | null;
  last: number | null;
  /** Distinct days with at least one answer. */
  days: number;
  /** Share solved (hinted counts) over the last 30 days; null without answers there. */
  recentSolved: number | null;
}

const DAY = 86_400_000;
const zero = (): Record<Rating, number> => ({ again: 0, slip: 0, hinted: 0, hard: 0, good: 0, easy: 0 });

export function sectionHistory(log: LogEntry[], skillId: string, now: number): SectionHistory {
  const entries = log.filter((e) => e.skill === skillId);
  const counts = zero();
  for (const e of entries) counts[ratingOf(e)]++;
  const recent = entries.filter((e) => e.t > now - 30 * DAY);
  return {
    entries,
    counts,
    first: entries[0]?.t ?? null,
    last: entries[entries.length - 1]?.t ?? null,
    days: new Set(entries.map((e) => new Date(e.t).toDateString())).size,
    recentSolved: recent.length ? recent.filter((e) => solved(ratingOf(e))).length / recent.length : null,
  };
}

/**
 * How much each rating says "this isn't solid yet". A slip is a careless error, not a gap,
 * so it weighs little; "hard" means solved but shaky.
 */
const COST: Record<Rating, number> = { again: 1, hinted: 0.6, slip: 0.3, hard: 0.25, good: 0, easy: 0 };
/** Answers considered per section, newest first, each worth DECAY times the next newer one. */
export const WINDOW = 8;
const DECAY = 0.8;
/** Score from which a section counts as a weak spot. */
export const WEAK_AT = 0.3;

export type WeakReason = 'again' | 'hinted' | 'slip' | 'hard';

export interface WeakSpot {
  skill: string;
  /** 0 (solid) to 1 (every recent answer was "didn't know how"). */
  score: number;
  /** The kind of trouble that contributes most. */
  reason: WeakReason;
  /** How many of the `of` most recent answers had that rating. */
  count: number;
  of: number;
}

/**
 * Sections whose recent answers show trouble, worst first. Recency-weighted so a section you've
 * since got right fades out on its own. Needs at least 2 answers, so one bad day isn't a pattern.
 */
export function weakSpots(log: LogEntry[], states: Record<string, SkillState>, isActive: (id: string) => boolean): WeakSpot[] {
  const recent = new Map<string, LogEntry[]>();
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i];
    const xs = recent.get(e.skill) ?? [];
    if (xs.length < WINDOW) recent.set(e.skill, [...xs, e]);
  }
  const out: WeakSpot[] = [];
  for (const [skill, xs] of recent) {
    if (!states[skill] || !isActive(skill) || xs.length < 2) continue;
    let cost = 0;
    let weight = 0;
    const byReason: Record<WeakReason, number> = { again: 0, hinted: 0, slip: 0, hard: 0 };
    xs.forEach((e, i) => {
      const w = DECAY ** i;
      const r = ratingOf(e);
      cost += w * COST[r];
      weight += w;
      if (r in byReason) byReason[r as WeakReason] += w * COST[r];
    });
    const score = cost / weight;
    if (score < WEAK_AT) continue;
    const reason = (Object.keys(byReason) as WeakReason[]).reduce((a, b) => (byReason[b] > byReason[a] ? b : a));
    out.push({ skill, score, reason, count: xs.filter((e) => ratingOf(e) === reason).length, of: xs.length });
  }
  return out.sort((a, b) => b.score - a.score);
}
