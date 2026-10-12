// Independent numeric checks used by generator self-tests (never by grading).
import { all, create } from 'mathjs';

const math = create(all, {});
const xs = [0.4, 0.7, 1.1, 1.6, 2.3];

const f = (expr: string) => {
  const c = math.compile(expr);
  return (scope: Record<string, number>) => c.evaluate(scope) as number;
};
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

/** d/dv of `fn` equals `deriv` (central differences). */
export function isDerivative(fn: string, deriv: string, v = 'x', others: Record<string, number> = {}) {
  const F = f(fn);
  const D = f(deriv);
  const h = 1e-5;
  return xs.every((x) => {
    const s = (val: number) => ({ ...others, [v]: val });
    const num = (F(s(x + h)) - F(s(x - h))) / (2 * h);
    return near(num, D(s(x)), 1e-4);
  });
}

/** Simpson's rule for a definite integral. */
export function integrate(fn: string, a: number, b: number, n = 2000) {
  const F = f(fn);
  const h = (b - a) / n;
  let s = F({ x: a }) + F({ x: b });
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * F({ x: a + i * h });
  return (s * h) / 3;
}

export const value = (expr: string, scope: Record<string, number> = {}) => f(expr)(scope);
export { near };

/** Iterated integral ∫_a^b ∫_{lo(x)}^{hi(x)} fn(x, y) dy dx with Simpson's rule in both directions. */
export function integrate2(fn: string, a: number, b: number, lo: (x: number) => number, hi: (x: number) => number, n = 200) {
  const F = f(fn);
  const simpson = (g: (t: number) => number, p: number, q: number) => {
    const h = (q - p) / n;
    let s = g(p) + g(q);
    for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(p + i * h);
    return (s * h) / 3;
  };
  return simpson((x) => simpson((y) => F({ x, y }), lo(x), hi(x)), a, b);
}
