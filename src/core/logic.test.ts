import { describe, expect, it } from 'vitest';
import { check } from './check';
import { and, canonical, classify, equivalent, imp, isCNF, isDNF, nnf, not, or, parseFormula, texF, textF, truthVector, V } from './logic';

const p = V('p');
const q = V('q');
const r = V('r');

describe('logic', () => {
  it('parses every common notation with standard precedence', () => {
    for (const s of ['~p | q & r', '¬p ∨ (q ∧ r)', 'not p or q and r', '!p \\/ q /\\ r']) {
      expect(equivalent(parseFormula(s), or(not(p), and(q, r)))).toBe(true);
    }
    expect(equivalent(parseFormula('p -> q -> r'), imp(p, imp(q, r)))).toBe(true);
    expect(() => parseFormula('p &')).toThrow();
    expect(() => parseFormula('(p | q')).toThrow();
  });

  it('round-trips through text and TeX with the right parentheses', () => {
    const f = imp(imp(p, q), and(or(p, q), not(r)));
    expect(textF(f)).toBe('(p → q) → ((p ∨ q) ∧ ¬r)');
    expect(textF(imp(p, imp(q, r)))).toBe('p → (q → r)');
    expect(textF(and(and(p, q), r))).toBe('p ∧ q ∧ r');
    expect(equivalent(parseFormula(textF(f)), f)).toBe(true);
    expect(texF(not(and(p, q)))).toBe('\\lnot (p \\land q)');
  });

  it('classifies, normalises and builds canonical forms', () => {
    expect(classify(or(p, not(p)))).toBe('tautology');
    expect(classify(and(p, not(p)))).toBe('contradiction');
    const f = not(imp(p, or(q, r)));
    expect(equivalent(nnf(f), f)).toBe(true);
    const v = truthVector(f, ['p', 'q', 'r']);
    const d = canonical(v, ['p', 'q', 'r'], 'dnf');
    const c = canonical(v, ['p', 'q', 'r'], 'cnf');
    expect(isDNF(d) && isCNF(c)).toBe(true);
    expect(equivalent(d, f, ['p', 'q', 'r']) && equivalent(c, f, ['p', 'q', 'r'])).toBe(true);
  });

  it('grades formula answers, enforcing the required shape', () => {
    const a = { kind: 'formula' as const, expected: '¬p ∨ q', vars: ['p', 'q'], form: 'noimp' as const };
    expect(check(a, '~p | q')).toEqual({ ok: true });
    expect(check(a, 'q | !p')).toEqual({ ok: true });
    expect(check(a, 'p | q')).toEqual({ ok: false });
    expect(check(a, 'p -> q').error).toMatch(/no →/);
    expect(check(a, 'p | z').error).toMatch(/Unknown letter/);
  });
});
