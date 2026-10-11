import type { Skill } from './types';

/**
 * Scheduling model (per skill, not per card):
 * - correct -> interval grows (1d, 3d, 8d, 20d, ...), a fresh instance each time
 * - wrong   -> back in this session after a few cards, then tomorrow
 * - 3 correct in a row on separate days at a level = "reliable" -> unlock next level
 * - a miss right after levelling up drops the next problem back one level
 */

export const STREAK_TO_LEVEL_UP = 3;
const RETRY_DELAY = 10 * 60 * 1000;
const GROWTH = 2.6;
const MAX_INTERVAL = 180;

export interface SkillState {
  /** Level currently being trained (0-based). */
  level: number;
  /** Consecutive correct answers on distinct days at `level`. */
  streak: number;
  lastCorrectDay: string | null;
  /** Current interval in days; 0 = still learning. */
  interval: number;
  due: number;
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
    mastered: false,
    stepDown: false,
    missStreak: 0,
    attempts: 0,
    correct: 0,
    introducedAt: now,
  };
}

/** Which level to generate the next problem at. */
export const servedLevel = (s: SkillState) => (s.stepDown && s.level > 0 ? s.level - 1 : s.level);

export function review(s: SkillState, skill: Skill, ok: boolean, now: number): SkillState {
  const n: SkillState = { ...s, attempts: s.attempts + 1 };
  const today = dayKey(now);
  const maxLevel = skill.levels.length - 1;

  if (!ok) {
    n.missStreak = s.missStreak + 1;
    n.streak = 0;
    n.interval = 0;
    n.due = now + RETRY_DELAY;
    // A miss on a level you haven't landed yet: rebuild one level down first.
    if (!s.stepDown && s.level > 0 && s.streak === 0 && !s.mastered) n.stepDown = true;
    return n;
  }

  n.correct = s.correct + 1;
  n.missStreak = 0;

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
    // Second correct answer the same day (after an in-session retry): see it tomorrow.
    n.interval = Math.max(s.interval, 1);
    n.due = daysFrom(now, 1);
    return n;
  }

  if (n.streak >= STREAK_TO_LEVEL_UP && n.level < maxLevel && !s.mastered) {
    n.level += 1;
    n.streak = 0;
    n.interval = 1;
    n.due = daysFrom(now, 1);
    return n;
  }
  if (n.streak >= STREAK_TO_LEVEL_UP && n.level === maxLevel) n.mastered = true;

  n.interval = s.interval === 0 ? 1 : Math.min(MAX_INTERVAL, Math.max(s.interval + 1, s.interval * GROWTH));
  n.due = daysFrom(now, n.interval);
  return n;
}

/** A skill counts as a solid prerequisite once its first level is reliable. */
export const isReliable = (s: SkillState | undefined) => !!s && (s.level > 0 || s.mastered);

export type Status = 'locked' | 'available' | 'learning' | 'reliable' | 'mastered';

export function status(skill: Skill, states: Record<string, SkillState>): Status {
  const s = states[skill.id];
  if (s?.mastered) return 'mastered';
  if (isReliable(s)) return 'reliable';
  if (s) return 'learning';
  return skill.prereqs.every((p) => isReliable(states[p])) ? 'available' : 'locked';
}

/** Skills due now (oldest first), then up to `newLimit` unlocked new skills in curriculum order. */
export function buildQueue(
  skills: Skill[],
  states: Record<string, SkillState>,
  now: number,
  newLimit: number,
): { due: string[]; fresh: string[] } {
  const due = skills
    .filter((k) => states[k.id] && states[k.id].due <= now)
    .sort((a, b) => states[a.id].due - states[b.id].due)
    .map((k) => k.id);
  const fresh = skills
    .filter((k) => status(k, states) === 'available')
    .slice(0, Math.max(0, newLimit))
    .map((k) => k.id);
  return { due, fresh };
}

export const newIntroducedToday = (states: Record<string, SkillState>, now: number) =>
  Object.values(states).filter((s) => dayKey(s.introducedAt) === dayKey(now)).length;
