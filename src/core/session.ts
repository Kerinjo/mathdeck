import { servedLevel, type SkillState } from './scheduler';

/**
 * A study session inside one chapter or one section. It counts as progress, is saved after
 * every answer, and resumes exactly where you left off.
 *
 * Next problem, in order of preference:
 * 1. a retry of something missed a few problems ago
 * 2. a due review from this chapter (alternating with new material, so neither starves)
 * 3. the "frontier": the first section in book order that isn't cleared yet
 * 4. extra practice on the weakest section in scope
 */

export type ItemKind = 'retry' | 'due' | 'frontier' | 'extra';

export interface SessionItem {
  skillId: string;
  level: number;
  seed: number;
  answered: boolean;
  /** First time this section is seen. */
  fresh: boolean;
  kind: ItemKind;
}

export interface SessionState {
  key: string;
  target: number;
  answered: number;
  right: number;
  current: SessionItem | null;
  retries: { skillId: string; after: number }[];
  /** Sections cleared during this session, for the summary. */
  cleared: string[];
  lastSkill: string | null;
  lastKind: ItemKind | null;
  startedAt: number;
  updatedAt: number;
}

export const RETRY_GAP = 3;

export function newSession(key: string, target: number, now: number): SessionState {
  return {
    key,
    target,
    answered: 0,
    right: 0,
    current: null,
    retries: [],
    cleared: [],
    lastSkill: null,
    lastKind: null,
    startedAt: now,
    updatedAt: now,
  };
}

export const frontierOf = (scope: string[], states: Record<string, SkillState>) =>
  scope.find((id) => !states[id]?.cleared) ?? null;

export function pickNext(
  s: SessionState,
  scope: string[],
  states: Record<string, SkillState>,
  now: number,
  seed: number,
): SessionState {
  const item = (skillId: string, kind: ItemKind): SessionItem => {
    const st = states[skillId];
    return { skillId, level: st ? servedLevel(st) : 0, seed, answered: false, fresh: !st, kind };
  };
  const done = (it: SessionItem, retries = s.retries): SessionState => ({ ...s, current: it, retries, updatedAt: now });

  const ri = s.retries.findIndex((r) => r.after <= s.answered && scope.includes(r.skillId));
  if (ri >= 0) return done(item(s.retries[ri].skillId, 'retry'), s.retries.filter((_, i) => i !== ri));

  const frontier = frontierOf(scope, states);
  const due = scope
    .filter((id) => states[id] && states[id].due <= now && id !== frontier && id !== s.lastSkill)
    .sort((a, b) => states[a].due - states[b].due);

  if (due.length && (s.lastKind !== 'due' || !frontier)) return done(item(due[0], 'due'));
  if (frontier) return done(item(frontier, 'frontier'));

  const started = scope.filter((id) => states[id]);
  const pool = started.filter((id) => id !== s.lastSkill);
  const candidates = pool.length ? pool : started.length ? started : scope;
  const acc = (id: string) => (states[id] ? states[id].correct / Math.max(1, states[id].attempts) : 0);
  const weakest = [...candidates].sort((a, b) => acc(a) - acc(b) || (states[a]?.due ?? 0) - (states[b]?.due ?? 0))[0];
  return done(item(weakest, 'extra'));
}

/** Record an answer to the current item. Misses outside the frontier get a retry a few problems later. */
export function recordAnswer(
  s: SessionState,
  ok: boolean,
  newlyCleared: boolean,
  now: number,
): SessionState {
  const cur = s.current!;
  const retries =
    !ok && cur.kind !== 'frontier' ? [...s.retries, { skillId: cur.skillId, after: s.answered + 1 + RETRY_GAP }] : s.retries;
  return {
    ...s,
    answered: s.answered + 1,
    right: s.right + (ok ? 1 : 0),
    current: { ...cur, answered: true },
    retries,
    cleared: newlyCleared && !s.cleared.includes(cur.skillId) ? [...s.cleared, cur.skillId] : s.cleared,
    lastSkill: cur.skillId,
    lastKind: cur.kind,
    updatedAt: now,
  };
}
