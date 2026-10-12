import { describe, expect, it } from 'vitest';
import type { Skill } from './types';
import { CLEAR_RUN, EASE, newState, review, reviewQueue, servedLevel, status, STREAK_TO_LEVEL_UP, upgradeState } from './scheduler';
import { newSession, pickNext, recordAnswer } from './session';

const DAY = 24 * 3600 * 1000;
const lvl = { name: 'l', generate: () => ({ prompt: '', solution: [], answer: { kind: 'number' as const, expected: '1' } }) };
const skill = (id: string, levels = 3): Skill => ({
  id,
  name: id,
  prereqs: [],
  levels: Array(levels).fill(lvl),
  learn: { summary: '', resources: [] },
});
const T0 = new Date(2026, 0, 5, 12).getTime();
const k = skill('a');

describe('scheduler', () => {
  it('levels up after a streak on separate days and grows the interval', () => {
    let s = newState(T0);
    for (let d = 0; d < STREAK_TO_LEVEL_UP; d++) s = review(s, k, true, T0 + d * DAY);
    expect(s.level).toBe(1);
    expect(s.streak).toBe(0);
    s = review(s, k, true, T0 + 3 * DAY);
    s = review(s, k, true, T0 + 4 * DAY);
    expect(s.interval).toBeGreaterThan(2);
    expect(s.due).toBeGreaterThan(T0 + 6 * DAY);
  });

  it('same-day correct answers clear the section but do not count toward the level streak', () => {
    let s = newState(T0);
    for (let i = 0; i < CLEAR_RUN; i++) s = review(s, k, true, T0 + i * 1000);
    expect(s.cleared).toBe(true);
    expect(s.streak).toBe(1);
    expect(s.level).toBe(0);
  });

  it('a miss resets runs, lowers ease and brings the skill back within minutes', () => {
    let s = newState(T0);
    s = review(s, k, true, T0);
    s = review(s, k, false, T0 + DAY);
    expect(s.streak).toBe(0);
    expect(s.run).toBe(0);
    expect(s.ease).toBeLessThan(EASE.start);
    expect(s.due - (T0 + DAY)).toBeLessThan(15 * 60 * 1000);
  });

  it('easy skills get longer intervals than struggled ones', () => {
    let easy = newState(T0);
    let hard = newState(T0);
    for (let d = 0; d < 6; d++) {
      easy = review(easy, k, true, T0 + d * DAY);
      if (d === 1 || d === 3) hard = review(hard, k, false, T0 + d * DAY);
      hard = review(hard, k, true, T0 + d * DAY + 3600_000);
    }
    expect(easy.ease).toBeGreaterThan(hard.ease);
  });

  it('a miss right after levelling up steps down one level, then returns', () => {
    let s = newState(T0);
    for (let d = 0; d < STREAK_TO_LEVEL_UP; d++) s = review(s, k, true, T0 + d * DAY);
    s = review(s, k, false, T0 + 4 * DAY);
    expect(servedLevel(s)).toBe(0);
    s = review(s, k, true, T0 + 4 * DAY + 600_000);
    expect(servedLevel(s)).toBe(1);
  });

  it('mastered after the last level is reliable', () => {
    let s = newState(T0);
    const one = skill('b', 1);
    for (let d = 0; d < STREAK_TO_LEVEL_UP; d++) s = review(s, one, true, T0 + d * DAY);
    expect(status(s)).toBe('mastered');
  });

  it('upgrades old saved states', () => {
    const s = upgradeState({ level: 1, attempts: 5 }, T0);
    expect(s.cleared).toBe(true);
    expect(s.ease).toBe(EASE.start);
  });

  it('review queue: only due skills, weakest first, chapters interleaved', () => {
    const states = {
      a1: { ...newState(T0), due: T0 - 1, missStreak: 2 },
      a2: { ...newState(T0), due: T0 - 1 },
      b1: { ...newState(T0), due: T0 - 1 },
      b2: { ...newState(T0), due: T0 + DAY },
    };
    const ch = (id: string) => id[0];
    expect(reviewQueue(['a1', 'a2', 'b1', 'b2', 'c1'], ch, states, T0, 10)).toEqual(['a1', 'b1', 'a2']);
  });
});

describe('study session', () => {
  const scope = ['s1', 's2', 's3'];

  it('works through sections in order and remembers misses', () => {
    let st: Record<string, ReturnType<typeof newState>> = {};
    let s = pickNext(newSession('chapter:x', 10, T0), scope, st, T0, 1);
    expect(s.current).toMatchObject({ skillId: 's1', kind: 'frontier', fresh: true });

    // clear s1
    st = { s1: { ...newState(T0), run: CLEAR_RUN, cleared: true, due: T0 + DAY } };
    s = recordAnswer(s, true, true, T0);
    expect(s.cleared).toEqual(['s1']);
    s = pickNext(s, scope, st, T0, 2);
    expect(s.current!.skillId).toBe('s2');
  });

  it('alternates due reviews with new material', () => {
    const st = {
      s1: { ...newState(T0), cleared: true, due: T0 - 1 },
      s2: { ...newState(T0), cleared: true, due: T0 - 1 },
    };
    let s = pickNext(newSession('chapter:x', 10, T0), scope, st, T0, 1);
    expect(s.current).toMatchObject({ skillId: 's1', kind: 'due' });
    s = recordAnswer(s, true, false, T0);
    s = pickNext(s, scope, st, T0, 2);
    expect(s.current).toMatchObject({ skillId: 's3', kind: 'frontier' });
  });

  it('retries a missed review a few problems later', () => {
    const st = { s1: { ...newState(T0), cleared: true, due: T0 - 1 } };
    let s = pickNext(newSession('chapter:x', 10, T0), scope, st, T0, 1);
    s = recordAnswer(s, false, false, T0);
    expect(s.retries).toEqual([{ skillId: 's1', after: 4 }]);
    for (let i = 0; i < 3; i++) {
      s = pickNext(s, scope, st, T0, 10 + i);
      expect(s.current!.kind).not.toBe('retry');
      s = recordAnswer(s, true, false, T0);
    }
    s = pickNext(s, scope, st, T0, 20);
    expect(s.current).toMatchObject({ skillId: 's1', kind: 'retry' });
  });

  it('keeps practising the weakest section once everything is cleared', () => {
    const st = {
      s1: { ...newState(T0), cleared: true, due: T0 + DAY, attempts: 10, correct: 9 },
      s2: { ...newState(T0), cleared: true, due: T0 + DAY, attempts: 10, correct: 4 },
      s3: { ...newState(T0), cleared: true, due: T0 + DAY, attempts: 10, correct: 8 },
    };
    const s = pickNext(newSession('chapter:x', 10, T0), scope, st, T0, 1);
    expect(s.current).toMatchObject({ skillId: 's2', kind: 'extra' });
  });
});
