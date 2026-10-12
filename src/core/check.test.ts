import { describe, expect, it } from 'vitest';
import { check } from './check';
import type { Answer } from './types';

const num = (expected: string, extra: Partial<Extract<Answer, { kind: 'number' }>> = {}): Answer => ({ kind: 'number', expected, ...extra });
const expr = (expected: string, upToConstant = false): Answer => ({ kind: 'expr', expected, vars: ['x'], upToConstant });
const rejected = (a: Answer, input: string) => expect(check(a, input).ok, input).toBe(false);
const accepted = (a: Answer, input: string) => expect(check(a, input), input).toEqual({ ok: true });

describe('the answer box cannot do the work', () => {
  it('rejects %, mod, bitwise and comparison operators', () => {
    for (const s of ['(920*752-46) % 7', '(920*752-46) mod 7', '1235 & 7', '5 | 2', '17 >> 2', '5 xor 3', '3 > 2']) {
      const v = check(num('5'), s);
      expect(v.ok, s).toBe(false);
      expect(v.error, s).toBeTruthy();
    }
  });

  it('whole-number answers must be exact, however large', () => {
    accepted(num('1917674000'), '1917674000');
    accepted(num('1917674000'), '36^4 - 26^4 + 36^5 - 26^5 + 36^6 - 26^6');
    rejected(num('1917674000'), '1917674100');
    rejected(num('1917674000'), '1917673999');
  });

  it('integer-only answers accept just the number', () => {
    accepted(num('5', { integer: true }), ' 5 ');
    accepted(num('-3', { integer: true }), '-3');
    expect(check(num('5', { integer: true }), '12 - 7').error).toMatch(/whole number/);
  });

  it('limit answers cannot be computed by plugging in a nearby value', () => {
    rejected(num('1/2', { simple: true }), '(3*(10^9)^2 + 5*10^9 - 7)/(6*(10^9)^2 - 4*10^9 + 1)');
    rejected(num('3/2', { simple: true }), 'sin(3*0.000000001)/(2*0.000000001)');
    for (const s of ['1/2', '0.5', '2/4']) accepted(num('1/2', { simple: true }), s);
    accepted(num('e^(-8)', { simple: true }), 'e^-8');
    accepted(num('sqrt(2)/2', { simple: true }), '1/sqrt(2)');
  });

  it('derivatives cannot be entered as difference quotients', () => {
    rejected(expr('3*x^2'), '((x+0.000001)^3 - (x-0.000001)^3)/0.000002');
    rejected(expr('3*x^2'), '((x+1/10^6)^3 - (x-1/10^6)^3)*10^6/2');
    accepted(expr('3*x^2'), '3x^2');
    accepted(expr('-3/(x+2)^2'), '-3(x+2)^(-2)');
    accepted(expr('exp(-2*x)/(-2)', true), '-e^(-2x)/2 + C');
    accepted(expr('x^4/4 + 2/27', true), '0.25x^4');
  });
});
