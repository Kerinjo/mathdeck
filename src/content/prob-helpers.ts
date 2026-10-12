import { Q } from '../core/frac';
import type { Problem, Resource, Rng } from '../core/types';
import { distinct, fact } from './helpers';

export const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});
export const grinstead: Resource = {
  kind: 'book',
  title: 'Grinstead & Snell, Introduction to Probability (free PDF)',
  url: 'https://math.dartmouth.edu/~prob/prob/prob.pdf',
};
export const openIntro: Resource = {
  kind: 'book',
  title: 'OpenIntro Statistics (free PDF)',
  url: 'https://www.openintro.org/book/os/',
};
export const khanStats: Resource = {
  kind: 'video',
  title: 'Khan Academy: Statistics and probability',
  url: 'https://www.khanacademy.org/math/statistics-probability',
};
export const seeingTheory: Resource = {
  kind: 'interactive',
  title: 'Seeing Theory: a visual introduction to probability and statistics',
  url: 'https://seeing-theory.brown.edu/',
};

export const C = (n: number, k: number): number => (k < 0 || k > n ? 0 : Math.round(fact(n) / (fact(k) * fact(n - k))));
export const Pn = (n: number, k: number): number => (k > n ? 0 : Math.round(fact(n) / fact(n - k)));

/** An exact probability (or other rational value), shown as a fraction. */
export const num = (q: Q | number, display?: string): Problem['answer'] => ({
  kind: 'number',
  expected: Q.of(q).toString(),
  display: display ?? Q.of(q).tex(),
});
/** A terminating decimal given as an integer count of 1/scale, e.g. dec(5764, 10000) = 0.5764. */
export const decStr = (units: number, scale: number) => {
  const digits = Math.round(Math.log10(scale));
  return Number((units / scale).toFixed(digits)).toString();
};
export const dec = (units: number, scale: number): Problem['answer'] => ({ kind: 'number', expected: decStr(units, scale) });
export const yesNo = (yes: boolean): Problem['answer'] => ({ kind: 'choice', options: ['Yes', 'No'], correct: yes ? 0 : 1 });
export const qPow = (q: Q, k: number) => Array.from({ length: k }, () => q).reduce((a, b) => a.mul(b), new Q(1));
export const pct = (n: number) => new Q(n, 100);
/** Tenths as a decimal string for prompts: 3 -> "0.3". */
export const tenth = (n: number) => decStr(n, 10);
export const hund = (n: number) => decStr(n, 100);
export const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Split `total` into k positive integer parts. */
export function composition(r: Rng, total: number, k: number): number[] {
  const cuts = distinct(r, k - 1, 1, total - 1).sort((a, b) => a - b);
  return [...cuts, total].map((c, i) => c - (i ? cuts[i - 1] : 0));
}

/** A two-row table, e.g. a probability mass function. */
export const rowTable = (head: string, xs: (string | number)[], label: string, ps: string[]) =>
  `$$\\begin{array}{c|${'c'.repeat(xs.length)}} ${head} & ${xs.join(' & ')} \\\\ \\hline ${label} & ${ps.join(' & ')} \\end{array}$$`;

// Standard normal CDF, for building the table values quoted in prompts.
function erf(x: number) {
  // Abramowitz & Stegun 7.1.26, error < 1.5e-7: plenty for four decimals.
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
/** Φ(z) in ten-thousandths, as a table would print it. */
export const phi4 = (z: number) => Math.round(((1 + erf(z / Math.SQRT2)) / 2) * 10000);
export const phiTex = (z: number) => `\\Phi(${z}) = ${decStr(phi4(z), 10000)}`;
