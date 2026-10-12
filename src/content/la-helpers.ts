// Shared helpers for the Linear Algebra content.
import { identity, mat, matStrings, Q, type Mat } from '../core/frac';
import type { Problem, Resource, Rng } from '../core/types';

export const ila = (page: string, title: string): Resource => ({
  kind: 'book',
  title: `Interactive Linear Algebra (Margalit & Rabinoff): ${title}`,
  url: `https://textbooks.math.gatech.edu/ila/${page}.html`,
});
export const tb1b = (slug: string, title: string): Resource => ({
  kind: 'video',
  title: `3Blue1Brown, Essence of Linear Algebra: ${title}`,
  url: `https://www.3blue1brown.com/lessons/${slug}`,
});
export const strang: Resource = {
  kind: 'video',
  title: 'MIT 18.06 (Gilbert Strang): full lecture course',
  url: 'https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/',
};

export const matrixAns = (m: Mat): Problem['answer'] => ({ kind: 'matrix', expected: matStrings(m) });
export const vecAns = (v: Q[]): Problem['answer'] => ({ kind: 'matrix', expected: v.map((x) => [x.toString()]) });
export const num = (q: Q | string, display?: string): Problem['answer'] => ({
  kind: 'number',
  expected: q.toString(),
  display: display ?? (q instanceof Q ? q.tex() : undefined),
});

export const randVec = (r: Rng, n: number, lo = -5, hi = 5) => Array.from({ length: n }, () => new Q(r.int(lo, hi)));
export const randMat = (r: Rng, rows: number, cols: number, lo = -4, hi = 4) =>
  Array.from({ length: rows }, () => randVec(r, cols, lo, hi));
export const maxAbs = (m: Mat) => Math.max(...m.flat().map((x) => Math.abs(x.value())));
export const isZeroVec = (v: Q[]) => v.every((x) => x.isZero());

/** Integer matrix with determinant 1, built from random row additions. */
export function unimodular(r: Rng, n: number, steps = 2 * n, bound = 4): Mat {
  const m = identity(n).map((row) => row.map((x) => x.value()));
  let done = 0;
  for (let tries = 0; done < steps && tries < 200; tries++) {
    const i = r.int(0, n - 1);
    const j = r.int(0, n - 1);
    if (i === j) continue;
    const k = r.nz(-2, 2);
    const row = m[i].map((x, c) => x + k * m[j][c]);
    if (row.some((x) => Math.abs(x) > bound)) continue;
    m[i] = row;
    done++;
  }
  return mat(m);
}


/** Parenthesise negatives for inline products. */
export const P = (n: number | Q) => (Q.of(n).n < 0 ? `(${Q.of(n).tex()})` : Q.of(n).tex());
