import { Q } from './frac';

/** One term of a sum: coefficient times a body. Empty body means a constant. */
export interface Term {
  c: number | Q;
  /** TeX body, e.g. "x^{2}" or "e^{3x}". */
  tex: string;
  /** mathjs body, e.g. "x^2" or "e^(3*x)". */
  expr: string;
}

export const t = (c: number | Q, tex = '', expr = tex): Term => ({ c, tex, expr });

/** Power of a variable as a term body: x^0 -> '', x^1 -> 'x'. */
export function pw(n: number, v = 'x'): { tex: string; expr: string } {
  if (n === 0) return { tex: '', expr: '' };
  if (n === 1) return { tex: v, expr: v };
  return { tex: `${v}^{${n}}`, expr: `${v}^(${n})` };
}

export const mono = (c: number | Q, n: number, v = 'x'): Term => {
  const p = pw(n, v);
  return t(c, p.tex, p.expr);
};

/** Combine terms into TeX and mathjs strings, dropping zero terms. */
export function sum(terms: Term[]): { tex: string; expr: string } {
  const nz = terms.filter((x) => !Q.of(x.c).isZero());
  if (nz.length === 0) return { tex: '0', expr: '0' };
  let tex = '';
  let expr = '';
  nz.forEach((x, i) => {
    const c = Q.of(x.c);
    const neg = c.n < 0;
    const a = neg ? c.neg() : c;
    let body: string;
    if (!x.tex) body = a.tex();
    else if (a.eq(1)) body = x.tex;
    else body = `${a.tex()}${x.tex}`;
    tex += i === 0 ? (neg ? '-' : '') + body : (neg ? ' - ' : ' + ') + body;
    const ce = c.toString();
    const e = !x.expr ? `(${ce})` : c.eq(1) ? `(${x.expr})` : `(${ce})*(${x.expr})`;
    expr += (i === 0 ? '' : ' + ') + e;
  });
  return { tex, expr };
}

/** Polynomial from coefficients, highest degree first. */
export function poly(coeffs: (number | Q)[], v = 'x') {
  const deg = coeffs.length - 1;
  return sum(coeffs.map((c, i) => mono(c, deg - i, v)));
}

/** Coefficient in front of a body in TeX: 1 -> '', -1 -> '-'. */
export function coef(c: number | Q): string {
  const q = Q.of(c);
  if (q.eq(1)) return '';
  if (q.eq(-1)) return '-';
  return q.tex();
}

/** "+ 3" / "- 3" for appending a constant in TeX. */
export const signed = (c: number | Q) => {
  const q = Q.of(c);
  return q.n < 0 ? `- ${q.neg().tex()}` : `+ ${q.tex()}`;
};

/** kx in TeX/expr with k=1 and k=-1 handled. */
export const kx = (k: number, v = 'x') => ({ tex: `${coef(k)}${v}`, expr: `${k}*${v}` });

export const frac = (n: number, d: number) => new Q(n, d);

/** Signed term for appending in TeX: st(-1, 'x') -> "- x", st(3, 'x') -> "+ 3x". */
export const st = (c: number, body: string) =>
  `${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 && body ? '' : Math.abs(c)}${body}`;
