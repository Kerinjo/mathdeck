import { Q } from '../core/frac';
import { signed } from '../core/fmt';
import type { Rng } from '../core/types';

/** Parenthesised number for building mathjs strings. */
export const P = (n: number | Q | string) => `(${n.toString()})`;

/** "x - a" in TeX, with a = 0 -> "x" and a < 0 -> "x + |a|". */
export const lin = (a: number | Q, v = 'x') => (Q.of(a).isZero() ? v : `${v} ${signed(Q.of(a).neg())}`);

/** k distinct integers from [lo, hi], optionally excluding zero. */
export function distinct(r: Rng, k: number, lo: number, hi: number, nonzero = false): number[] {
  const out: number[] = [];
  while (out.length < k) {
    const v = r.int(lo, hi);
    if ((nonzero && v === 0) || out.includes(v)) continue;
    out.push(v);
  }
  return out;
}

export const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

export const int = (body: string, lo?: string | number, hi?: string | number, dv = 'dx') =>
  lo === undefined
    ? `\\displaystyle\\int ${body} \\, ${dv}`
    : `\\displaystyle\\int_{${lo}}^{${hi}} ${body} \\, ${dv}`;
