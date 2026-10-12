import type { Skill } from './types';

/**
 * Scheduling model (per skill, not per card):
 * - correct -> interval grows by the skill's ease (1d, 3d, ~6d, ~15d, ...), a fresh problem each time
 * - wrong   -> due again in minutes, and the skill's ease drops so it grows more slowly from now on
 * - easy skills (always right) gain ease and fade out faster
 * - 3 correct in a row (any days) = section "cleared": the first pass is done
 * - 3 correct in a row on separate days at a level -> next level unlocks
 * - a miss right after levelling up drops the next problem back one level
 */

export const STREAK_TO_LEVEL_UP = 3;
export const CLEAR_RUN = 3;
const RETRY_DELAY = 10 * 60 * 1000;
const MAX_INTERVAL = 180;
export const EASE = { start: 2.5, min: 1.3, max: 3.2, up: 0.1, down: 0.25 };

export interface SkillState {
  /** Level currently being trained (0-based). */
  level: number;
  /** Consecutive correct answers on distinct days at `level`. */
  streak: number;
  lastCorrectDay: string | null;
  /** Current interval in days; 0 = still learning. */
  interval: number;
  due: number;
  /** Interval multiplier, learned from your history with this skill. */
  ease: number;
  /** Consecutive correct answers, regardless of day. */
  run: number;
  /** First pass done: CLEAR_RUN correct in a row at some point. */
  cleared: boolean;
  /** All levels done reliably. */
  mastered: boolean;
  /** Next problem is served one level lower to rebuild. */
  stepDown: boolean;
  /** Consecutive misses, drives the "weak skills" list. */
  missStreak: number;
  attempts: number;
  correct: number;
  introducedAt: number;
}

export interface LogEntry {
  t: number;
  skill: string;
  level: number;
  ok: boolean;
}

export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Start of the local day after `t` plus `days - 1`, so "1 day" means "tomorrow morning". */
const daysFrom = (t: number, days: number) => {
  const d = new Date(t);
  d.setHours(4, 0, 0, 0);
  if (d.getTime() <= t) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + Math.max(0, Math.round(days) - 1));
  return d.getTime();
};

export function newState(now: number): SkillState {
  return {
    level: 0,
    streak: 0,
    lastCorrectDay: null,
    interval: 0,
    due: now,
    ease: EASE.start,
    run: 0,
    cleared: false,
    mastered: false,
    stepDown: false,
    missStreak: 0,
    attempts: 0,
    correct: 0,
    introducedAt: now,
  };
}

/** Fill in fields added after a state was saved (older backups). */
export function upgradeState(s: Partial<SkillState>, now: number): SkillState {
  const base = newState(s.introducedAt ?? now);
  const out = { ...base, ...s } as SkillState;
  if (s.cleared === undefined) out.cleared = (s.level ?? 0) > 0 || !!s.mastered;
  return out;
}

/** Which level to generate the next problem at. */
export const servedLevel = (s: SkillState) => (s.stepDown && s.level > 0 ? s.level - 1 : s.level);

const clamp = (x: number) => Math.min(EASE.max, Math.max(EASE.min, x));

export function review(s: SkillState, skill: Skill, ok: boolean, now: number): SkillState {
  const n: SkillState = { ...s, attempts: s.attempts + 1 };
  const today = dayKey(now);
  const maxLevel = skill.levels.length - 1;

  if (!ok) {
    n.missStreak = s.missStreak + 1;
    n.run = 0;
    n.streak = 0;
    n.interval = 0;
    n.ease = clamp(s.ease - EASE.down);
    n.due = now + RETRY_DELAY;
    // A miss on a level you haven't landed yet: rebuild one level down first.
    if (!s.stepDown && s.level > 0 && s.streak === 0 && !s.mastered) n.stepDown = true;
    return n;
  }

  n.correct = s.correct + 1;
  n.missStreak = 0;
  n.run = s.run + 1;
  if (n.run >= CLEAR_RUN) n.cleared = true;

  if (s.stepDown) {
    // Rebuilt the lower level; try the real level again soon.
    n.stepDown = false;
    n.due = now + RETRY_DELAY;
    return n;
  }

  const newDay = s.lastCorrectDay !== today;
  if (newDay) n.streak = s.streak + 1;
  n.lastCorrectDay = today;

  if (!newDay) {
    // Another correct answer the same day: see it tomorrow, no extra credit toward spacing.
    n.interval = Math.max(s.interval, 1);
    n.due = Math.max(s.due, daysFrom(now, 1));
    return n;
  }

  // Only a correct answer on a new day says something about retention.
  if (s.attempts > 0) n.ease = clamp(s.ease + EASE.up);

  if (n.streak >= STREAK_TO_LEVEL_UP && n.level < maxLevel && !s.mastered) {
    n.level += 1;
    n.streak = 0;
    n.interval = 1;
    n.due = daysFrom(now, 1);
    return n;
  }
  if (n.streak >= STREAK_TO_LEVEL_UP && n.level === maxLevel) n.mastered = true;

  n.interval = s.interval === 0 ? 1 : Math.min(MAX_INTERVAL, Math.max(s.interval + 1, s.interval * n.ease));
  n.due = daysFrom(now, n.interval);
  return n;
}

export type Status = 'new' | 'learning' | 'cleared' | 'mastered';

export function status(s: SkillState | undefined): Status {
  if (!s) return 'new';
  if (s.mastered) return 'mastered';
  if (s.cleared) return 'cleared';
  return 'learning';
}

/** Levels finished, for progress pips. */
export const levelsDone = (s: SkillState | undefined, total: number) => (!s ? 0 : s.mastered ? total : s.level);

/**
 * Mixed review: everything due, weakest first, capped, then reordered so consecutive
 * problems come from different chapters where possible.
 */
export function reviewQueue(
  skillIds: string[],
  chapterOf: (id: string) => string,
  states: Record<string, SkillState>,
  now: number,
  cap: number,
): string[] {
  const due = skillIds
    .filter((id) => states[id] && states[id].due <= now)
    .sort((a, b) => {
      const sa = states[a];
      const sb = states[b];
      return sb.missStreak - sa.missStreak || sa.ease - sb.ease || sa.due - sb.due;
    })
    .slice(0, cap);
  const out: string[] = [];
  while (due.length) {
    const prev = out.length ? chapterOf(out[out.length - 1]) : null;
    const i = Math.max(0, due.findIndex((id) => chapterOf(id) !== prev));
    out.push(due.splice(i, 1)[0]);
  }
  return out;
}
