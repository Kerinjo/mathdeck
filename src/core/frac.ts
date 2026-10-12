// Exact rational arithmetic and small matrix routines for linear-algebra generators.

const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

export class Q {
  readonly n: number;
  readonly d: number;
  constructor(n: number, d = 1) {
    if (d === 0) throw new Error('division by zero');
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d) || 1;
    this.n = n / g;
    this.d = d / g;
  }
  static of(x: number | Q): Q {
    return x instanceof Q ? x : new Q(x);
  }
  add(o: number | Q) {
    const b = Q.of(o);
    return new Q(this.n * b.d + b.n * this.d, this.d * b.d);
  }
  sub(o: number | Q) {
    return this.add(Q.of(o).neg());
  }
  mul(o: number | Q) {
    const b = Q.of(o);
    return new Q(this.n * b.n, this.d * b.d);
  }
  div(o: number | Q) {
    const b = Q.of(o);
    return new Q(this.n * b.d, this.d * b.n);
  }
  neg() {
    return new Q(-this.n, this.d);
  }
  isZero() {
    return this.n === 0;
  }
  isInt() {
    return this.d === 1;
  }
  eq(o: number | Q) {
    const b = Q.of(o);
    return this.n === b.n && this.d === b.d;
  }
  value() {
    return this.n / this.d;
  }
  /** mathjs-parsable string. */
  toString() {
    return this.d === 1 ? `${this.n}` : `${this.n}/${this.d}`;
  }
  tex() {
    if (this.d === 1) return `${this.n}`;
    return `${this.n < 0 ? '-' : ''}\\frac{${Math.abs(this.n)}}{${this.d}}`;
  }
}

export type Mat = Q[][];

export const mat = (rows: (number | Q)[][]): Mat => rows.map((r) => r.map(Q.of));

export const matMul = (a: Mat, b: Mat): Mat =>
  a.map((row) =>
    b[0].map((_, j) => row.reduce((s, x, k) => s.add(x.mul(b[k][j])), new Q(0))),
  );

export const matVec = (a: Mat, v: Q[]): Q[] => matMul(a, v.map((x) => [x])).map((r) => r[0]);

export const transpose = (a: Mat): Mat => a[0].map((_, j) => a.map((r) => r[j]));

export const identity = (n: number): Mat =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => new Q(i === j ? 1 : 0)));

/** Reduced row echelon form, plus pivot column indices. */
export function rref(a: Mat): { r: Mat; pivots: number[] } {
  const m = a.map((row) => [...row]);
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < m[0].length && row < m.length; col++) {
    const p = m.findIndex((r, i) => i >= row && !r[col].isZero());
    if (p < 0) continue;
    [m[row], m[p]] = [m[p], m[row]];
    const pv = m[row][col];
    m[row] = m[row].map((x) => x.div(pv));
    for (let i = 0; i < m.length; i++) {
      if (i === row || m[i][col].isZero()) continue;
      const f = m[i][col];
      m[i] = m[i].map((x, j) => x.sub(f.mul(m[row][j])));
    }
    pivots.push(col);
    row++;
  }
  return { r: m, pivots };
}

export const rank = (a: Mat) => rref(a).pivots.length;

export function det(a: Mat): Q {
  const m = a.map((row) => [...row]);
  const n = m.length;
  let d = new Q(1);
  for (let c = 0; c < n; c++) {
    const p = m.findIndex((r, i) => i >= c && !r[c].isZero());
    if (p < 0) return new Q(0);
    if (p !== c) {
      [m[c], m[p]] = [m[p], m[c]];
      d = d.neg();
    }
    d = d.mul(m[c][c]);
    for (let i = c + 1; i < n; i++) {
      const f = m[i][c].div(m[c][c]);
      m[i] = m[i].map((x, j) => x.sub(f.mul(m[c][j])));
    }
  }
  return d;
}

export function inverse(a: Mat): Mat {
  const n = a.length;
  const aug = a.map((row, i) => [...row, ...identity(n)[i]]);
  const { r, pivots } = rref(aug);
  if (pivots.length < n || pivots[n - 1] !== n - 1) throw new Error('singular');
  return r.map((row) => row.slice(n));
}

/** Basis of the null space, one vector per free column, scaled to integers. */
export function nullspace(a: Mat): Q[][] {
  const { r, pivots } = rref(a);
  const n = a[0].length;
  const free = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  return free.map((f) => {
    const v = Array.from({ length: n }, () => new Q(0));
    v[f] = new Q(1);
    pivots.forEach((pc, i) => (v[pc] = r[i][f].neg()));
    return scaleToInts(v);
  });
}

export function scaleToInts(v: Q[]): Q[] {
  const l = v.reduce((acc, x) => (acc * x.d) / gcd(acc, x.d), 1);
  const ints = v.map((x) => x.mul(l).n);
  const g = ints.reduce((acc, x) => gcd(acc, x), 0) || 1;
  return ints.map((x) => new Q(x / g));
}

export const dot = (u: Q[], v: Q[]) => u.reduce((s, x, i) => s.add(x.mul(v[i])), new Q(0));

export const isIdentity = (a: Mat) => a.every((r, i) => r.every((x, j) => x.eq(i === j ? 1 : 0)));

export const matStrings = (a: Mat) => a.map((r) => r.map((x) => x.toString()));
export const vecStrings = (v: Q[]) => v.map((x) => x.toString());

export function matTex(a: Mat | (number | Q)[][], env = 'bmatrix') {
  const rows = a.map((r) => r.map((x) => Q.of(x).tex()).join(' & ')).join(' \\\\ ');
  return `\\begin{${env}} ${rows} \\end{${env}}`;
}

export const vecTex = (v: (number | Q)[]) => matTex(v.map((x) => [x]));
