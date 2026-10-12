// Shared by the Calculus I, Calculus II and Multivariable Calculus content.
import { Q } from '../core/frac';
import type { Problem, Resource, Rng } from '../core/types';

export const paul = (path: string, title: string): Resource => ({
  kind: 'article',
  title: `Paul's Online Notes: ${title}`,
  url: `https://tutorial.math.lamar.edu/Classes/${path}`,
});
export const openstax = (vol: 1 | 2 | 3, slug: string, title: string): Resource => ({
  kind: 'book',
  title: `OpenStax Calculus Vol. ${vol}: ${title}`,
  url: `https://openstax.org/books/calculus-volume-${vol}/pages/${slug}`,
});
export const tb1b = (slug: string, title: string): Resource => ({
  kind: 'video',
  title: `3Blue1Brown: ${title}`,
  url: `https://www.3blue1brown.com/lessons/${slug}`,
});

export const expr = (expected: string, display?: string, vars = ['x']): Problem['answer'] => ({
  kind: 'expr',
  expected,
  vars,
  display,
});
export const anti = (expected: string, display?: string): Problem['answer'] => ({
  kind: 'expr',
  expected,
  vars: ['x'],
  upToConstant: true,
  display: display && `${display} + C`,
});
export const num = (q: Q | string, display?: string): Problem['answer'] => ({
  kind: 'number',
  expected: q.toString(),
  display: display ?? (q instanceof Q ? q.tex() : undefined),
});

/** A limit or a derivative's value: only a short simplified answer, so the function can't be pasted in. */
export const exact = (q: Q | string, display?: string): Problem['answer'] => ({ ...num(q, display), simple: true } as Problem['answer']);

export const diff = (f: string) => `Differentiate $f(x) = ${f}$.`;

export const choice = (options: string[], correct: number): Problem['answer'] => ({ kind: 'choice', options, correct });

type Gen = (r: Rng) => Problem;
/** One level drawing from several problem types, so a level is more than one template with new numbers. */
export const mix =
  (...gens: Gen[]): Gen =>
  (r) =>
    r.pick(gens)(r);

/** "\lim_{x\to a}" in display style. */
export const lim = (to: string | number, v = 'x') => `\\displaystyle\\lim_{${v}\\to ${to}}`;
