import { describe, expect, it } from 'vitest';
import { SUBJECTS } from '../content';
import type { Subject } from '../core/types';
import { layout } from './SubjectMap';

const subj = (id: string, requires: string[] = []) => ({ id, requires, name: id, blurb: '', chapters: [] }) as unknown as Subject;

describe('subject map layout', () => {
  it('keeps every arrow short and pointing forward, with no overlapping cards', () => {
    const { col, row } = layout(SUBJECTS);
    for (const s of SUBJECTS) for (const r of s.requires) expect(col[s.id] - col[r], `${r} -> ${s.id}`).toBe(1);
    const spots = SUBJECTS.map((s) => [col[s.id], row[s.id]]);
    spots.forEach(([c, r], i) => spots.slice(i + 1).forEach(([c2, r2]) => expect(c !== c2 || Math.abs(r - r2) >= 1).toBe(true)));
  });

  it('pulls a prerequisite next to what needs it and centres a parent on its children', () => {
    const { col, row } = layout([subj('a'), subj('b', ['a']), subj('c', ['b']), subj('d', ['b']), subj('late'), subj('e', ['c', 'late'])]);
    expect(col.late).toBe(col.e - 1);
    expect(row.b).toBe((row.c + row.d) / 2);
  });

  it('gives stand-alone subjects their own row underneath', () => {
    const { col, row } = layout([subj('a'), subj('b', ['a']), subj('c', ['a']), subj('x'), subj('y')]);
    expect([col.x, col.y]).toEqual([0, 1]);
    expect(row.x).toBe(row.y);
    expect(row.x).toBeGreaterThan(Math.max(row.a, row.b, row.c));
  });
});
