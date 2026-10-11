import { describe, expect, it } from 'vitest';
import type { Skill } from './types';
import { buildQueue, newState, review, servedLevel, status, STREAK_TO_LEVEL_UP } from './scheduler';

const DAY = 24 * 3600 * 1000;
const lvl = { name: 'l', generate: () => ({ prompt: '', solution: [], answer: { kind: 'number' as const, expected: '1' } }) };
const skill = (id: string, prereqs: string[] = [], levels = 3): Skill => ({
  id,
  subject: 'calculus',
  topic: 't',
  name: id,
  prereqs,
  levels: Array(levels).fill(lvl),
  learn: { summary: '', resources: [] },
});
const T0 = new Date(2026, 0, 5, 12).getTime();

describe('scheduler', () => {
  it('levels up after a streak on separate days and grows the interval', () => {
    const k = skill('a');
    let s = newState(T0);
    for (let d = 0; d < STREAK_TO_LEVEL_UP; d++) s = review(s, k, true, T0 + d * DAY);
    expect(s.level).toBe(1);
    expect(s.streak).toBe(0);
    s = review(s, k, true, T0 + 3 * DAY);
    s = review(s, k, true, T0 + 4 * DAY);
    expect(s.interval).toBeGreaterThan(2);
    expect(s.due).toBeGreaterThan(T0 + 6 * DAY);
  });

  it('same-day correct answers do not count toward the streak', () => {
    const k = skill('a');
    let s = newState(T0);
    s = review(s, k, true, T0);
    s = review(s, k, true, T0 + 1000);
    s = review(s, k, true, T0 + 2000);
    expect(s.streak).toBe(1);
    expect(s.level).toBe(0);
  });

  it('a miss resets the streak and brings the skill back within minutes', () => {
    const k = skill('a');
    let s = newState(T0);
    s = review(s, k, true, T0);
    s = review(s, k, false, T0 + DAY);
    expect(s.streak).toBe(0);
    expect(s.due - (T0 + DAY)).toBeLessThan(15 * 60 * 1000);
    expect(s.missStreak).toBe(1);
  });

  it('a miss right after levelling up steps down one level, then returns', () => {
    const k = skill('a');
    let s = newState(T0);
    for (let d = 0; d < STREAK_TO_LEVEL_UP; d++) s = review(s, k, true, T0 + d * DAY);
    s = review(s, k, false, T0 + 4 * DAY);
    expect(servedLevel(s)).toBe(0);
    s = review(s, k, true, T0 + 4 * DAY + 600_000);
    expect(servedLevel(s)).toBe(1);
  });

  it('mastered after the last level is reliable', () => {
    const k = skill('a', [], 1);
    let s = newState(T0);
    for (let d = 0; d < STREAK_TO_LEVEL_UP; d++) s = review(s, k, true, T0 + d * DAY);
    expect(s.mastered).toBe(true);
  });

  it('unlocks skills once prerequisites are reliable', () => {
    const a = skill('a');
    const b = skill('b', ['a']);
    let s = newState(T0);
    expect(status(b, { a: s })).toBe('locked');
    for (let d = 0; d < STREAK_TO_LEVEL_UP; d++) s = review(s, a, true, T0 + d * DAY);
    expect(status(b, { a: s })).toBe('available');
    expect(buildQueue([a, b], { a: s }, T0 + 3 * DAY, 5).fresh).toEqual(['b']);
  });
});
