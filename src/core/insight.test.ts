import { describe, expect, it } from 'vitest';
import { sectionHistory, weakSpots } from './insight';
import { newState, solved, type LogEntry, type Rating } from './scheduler';

const DAY = 24 * 3600 * 1000;
const T0 = new Date(2026, 0, 5, 12).getTime();

/** Log entries for one skill, one per hour, oldest first. */
const answers = (skill: string, ratings: Rating[], start = T0): LogEntry[] =>
  ratings.map((rating, i) => ({ t: start + i * 3600_000, skill, level: 0, ok: solved(rating), rating }));
const states = (...ids: string[]) => Object.fromEntries(ids.map((id) => [id, newState(T0)]));
const all = () => true;

describe('weak spots', () => {
  it('flags repeated "didn\'t know how" and says so', () => {
    const w = weakSpots(answers('a', ['good', 'again', 'again', 'again']), states('a'), all);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ skill: 'a', reason: 'again', count: 3, of: 4 });
  });

  it('lets a section recover once recent answers are good', () => {
    expect(weakSpots(answers('a', ['again', 'again', 'again', 'good', 'good', 'good', 'good', 'good']), states('a'), all)).toEqual([]);
  });

  it('weighs a slip far less than a concept gap', () => {
    const log = [...answers('slips', ['good', 'slip', 'good', 'slip']), ...answers('gaps', ['good', 'again', 'good', 'again'])];
    const w = weakSpots(log, states('slips', 'gaps'), all);
    expect(w.map((x) => x.skill)).toEqual(['gaps']);
  });

  it('names the main kind of trouble', () => {
    expect(weakSpots(answers('a', ['hinted', 'hinted', 'hinted', 'good']), states('a'), all)[0].reason).toBe('hinted');
    expect(weakSpots(answers('a', ['slip', 'slip', 'slip', 'slip']), states('a'), all)[0].reason).toBe('slip');
  });

  it('needs two answers, a started section, and an active one', () => {
    expect(weakSpots(answers('a', ['again']), states('a'), all)).toEqual([]);
    expect(weakSpots(answers('a', ['again', 'again']), {}, all)).toEqual([]);
    expect(weakSpots(answers('a', ['again', 'again']), states('a'), () => false)).toEqual([]);
  });

  it('ranks worst first', () => {
    const log = [...answers('mild', ['good', 'hinted', 'again', 'good']), ...answers('bad', ['again', 'again', 'again'])];
    expect(weakSpots(log, states('mild', 'bad'), all).map((x) => x.skill)).toEqual(['bad', 'mild']);
  });

  it('reads old entries without a rating from ok', () => {
    const log: LogEntry[] = [0, 1, 2].map((i) => ({ t: T0 + i, skill: 'a', level: 0, ok: false }));
    expect(weakSpots(log, states('a'), all)[0].reason).toBe('again');
  });
});

describe('section history', () => {
  it('counts ratings, days and recent accuracy', () => {
    const log = [...answers('a', ['again', 'good'], T0), ...answers('b', ['good']), ...answers('a', ['hinted', 'slip'], T0 + 40 * DAY)];
    const h = sectionHistory(log, 'a', T0 + 41 * DAY);
    expect(h.entries).toHaveLength(4);
    expect(h.counts).toMatchObject({ again: 1, good: 1, hinted: 1, slip: 1 });
    expect(h.days).toBe(2);
    expect(h.first).toBe(T0);
    expect(h.recentSolved).toBe(0.5);
  });

  it('is empty for an untouched section', () => {
    expect(sectionHistory([], 'a', T0)).toMatchObject({ entries: [], first: null, recentSolved: null, days: 0 });
  });
});
