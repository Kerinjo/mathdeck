import {
  det,
  dot,
  identity,
  inverse,
  isIdentity,
  mat,
  matMul,
  matStrings,
  matTex,
  matVec,
  nullspace,
  Q,
  rank,
  rref,
  scaleToInts,
  transpose,
  vecStrings,
  vecTex,
  type Mat,
} from '../core/frac';
import { coef, signed, sum, t } from '../core/fmt';
import type { Chapter, Problem, Resource, Rng, Skill } from '../core/types';
import { distinct } from './helpers';

const ila = (page: string, title: string): Resource => ({
  kind: 'book',
  title: `Interactive Linear Algebra (Margalit & Rabinoff): ${title}`,
  url: `https://textbooks.math.gatech.edu/ila/${page}.html`,
});
const tb1b = (slug: string, title: string): Resource => ({
  kind: 'video',
  title: `3Blue1Brown, Essence of Linear Algebra: ${title}`,
  url: `https://www.3blue1brown.com/lessons/${slug}`,
});
const strang: Resource = {
  kind: 'video',
  title: 'MIT 18.06 (Gilbert Strang): full lecture course',
  url: 'https://ocw.mit.edu/courses/18-06sc-linear-algebra-fall-2011/',
};

const matrixAns = (m: Mat): Problem['answer'] => ({ kind: 'matrix', expected: matStrings(m) });
const vecAns = (v: Q[]): Problem['answer'] => ({ kind: 'matrix', expected: v.map((x) => [x.toString()]) });
const num = (q: Q | string, display?: string): Problem['answer'] => ({
  kind: 'number',
  expected: q.toString(),
  display: display ?? (q instanceof Q ? q.tex() : undefined),
});

const randVec = (r: Rng, n: number, lo = -5, hi = 5) => Array.from({ length: n }, () => new Q(r.int(lo, hi)));
const randMat = (r: Rng, rows: number, cols: number, lo = -4, hi = 4) =>
  Array.from({ length: rows }, () => randVec(r, cols, lo, hi));
const maxAbs = (m: Mat) => Math.max(...m.flat().map((x) => Math.abs(x.value())));
const isZeroVec = (v: Q[]) => v.every((x) => x.isZero());

/** Integer matrix with determinant 1, built from random row additions. */
function unimodular(r: Rng, n: number, steps = 2 * n, bound = 4): Mat {
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

/** A random matrix whose RREF has small integer entries: pick the RREF, then scramble rows. */
function withNiceRref(r: Rng, rows: number, cols: number, rk: number): { a: Mat; R: Mat; pivots: number[] } {
  for (;;) {
    // Pivot in column 1 always: a leading zero column makes for a dull problem.
    const pivots = [0, ...distinct(r, rk - 1, 1, cols - 1)].sort((x, y) => x - y);
    const R: Mat = Array.from({ length: rows }, () => Array.from({ length: cols }, () => new Q(0)));
    pivots.forEach((pc, i) => {
      R[i][pc] = new Q(1);
      for (let c = pc + 1; c < cols; c++) if (!pivots.includes(c)) R[i][c] = new Q(r.int(-3, 3));
    });
    const a = matMul(unimodular(r, rows, 2 * rows, 3), R);
    if (maxAbs(a) <= 12 && a.every((row) => !isZeroVec(row))) return { a, R, pivots };
  }
}

// ---------------------------------------------------------------------------

const vectors: Skill = {
  id: 'la.vectors',
  name: 'Vector arithmetic',
  prereqs: [],
  levels: [
    {
      name: 'linear combinations',
      generate(r) {
        const u = randVec(r, 3);
        const v = randVec(r, 3);
        const a = r.nz(-4, 4);
        const b = r.nz(-4, 4);
        const w = u.map((x, i) => x.mul(a).add(v[i].mul(b)));
        return {
          prompt: `Let $\\mathbf{u} = ${vecTex(u)}$ and $\\mathbf{v} = ${vecTex(v)}$. Compute $${coef(a)}\\mathbf{u} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}\\mathbf{v}$.`,
          answer: vecAns(w),
          solution: [`Scale each vector, then add entry by entry.`, `$${a}${vecTex(u)} ${signed(b)}${vecTex(v)} = ${vecTex(w)}$`],
        };
      },
    },
    {
      name: 'dot product',
      generate(r) {
        const n = r.int(3, 4);
        const u = randVec(r, n);
        const v = randVec(r, n);
        const d = dot(u, v);
        return {
          prompt: `Compute $\\mathbf{u} \\cdot \\mathbf{v}$ for $\\mathbf{u} = ${vecTex(u)}$, $\\mathbf{v} = ${vecTex(v)}$.`,
          answer: num(d),
          solution: [`Multiply matching entries and add: $${u.map((x, i) => `${x.tex()}\\cdot${v[i].n < 0 ? `(${v[i].tex()})` : v[i].tex()}`).join(' + ')} = ${d.tex()}$`],
        };
      },
    },
    {
      name: 'cross product',
      generate(r) {
        const u = randVec(r, 3, -4, 4);
        const v = randVec(r, 3, -4, 4);
        const w = [
          u[1].mul(v[2]).sub(u[2].mul(v[1])),
          u[2].mul(v[0]).sub(u[0].mul(v[2])),
          u[0].mul(v[1]).sub(u[1].mul(v[0])),
        ];
        return {
          prompt: `Compute $\\mathbf{u} \\times \\mathbf{v}$ for $\\mathbf{u} = ${vecTex(u)}$, $\\mathbf{v} = ${vecTex(v)}$.`,
          answer: vecAns(w),
          solution: [
            `$\\mathbf{u}\\times\\mathbf{v} = (u_2v_3 - u_3v_2,\\ u_3v_1 - u_1v_3,\\ u_1v_2 - u_2v_1)$`,
            `$= ${vecTex(w)}$. Check: it is orthogonal to both, $\\mathbf{u}\\cdot(\\mathbf{u}\\times\\mathbf{v}) = 0$.`,
          ],
          selfCheck: () => dot(u, w).isZero() && dot(v, w).isZero(),
        };
      },
    },
  ],
  learn: {
    summary:
      'Vectors add and scale entry by entry. The dot product $\\mathbf{u}\\cdot\\mathbf{v} = \\sum u_iv_i$ is a number (zero means perpendicular). The cross product in $\\mathbb{R}^3$ is a vector perpendicular to both, $\\mathbf{u}\\times\\mathbf{v} = (u_2v_3 - u_3v_2,\\ u_3v_1 - u_1v_3,\\ u_1v_2 - u_2v_1)$, with length equal to the area of the parallelogram they span.',
    resources: [
      tb1b('vectors', 'Vectors, what even are they?'),
      tb1b('dot-products', 'Dot products and duality'),
      tb1b('cross-products', 'Cross products'),
      ila('vectors', 'Vectors'),
    ],
  },
};

// ---------------------------------------------------------------------------

const geometry: Skill = {
  id: 'la.geometry',
  name: 'Length, angle and projection',
  prereqs: ['la.vectors'],
  levels: [
    {
      name: 'length',
      generate(r) {
        const v = randVec(r, r.int(2, 4), -6, 6);
        const N = dot(v, v).value();
        const root = Math.sqrt(N);
        const exact = Number.isInteger(root);
        return {
          prompt: `Find $\\|\\mathbf{v}\\|$ for $\\mathbf{v} = ${vecTex(v)}$.`,
          answer: num(exact ? `${root}` : `sqrt(${N})`, exact ? `${root}` : `\\sqrt{${N}}`),
          inputHint: 'sqrt(29) is fine.',
          solution: [`$\\|\\mathbf{v}\\| = \\sqrt{${v.map((x) => `${x.n < 0 ? `(${x.n})` : x.n}^2`).join(' + ')}} = \\sqrt{${N}}${exact ? ` = ${root}` : ''}$`],
        };
      },
    },
    {
      name: 'angle between vectors',
      generate(r) {
        let u, v;
        do {
          u = randVec(r, 3, -4, 4);
          v = randVec(r, 3, -4, 4);
        } while (isZeroVec(u) || isZeroVec(v));
        const d = dot(u, v).value();
        const N1 = dot(u, u).value();
        const N2 = dot(v, v).value();
        return {
          prompt: `Find $\\cos\\theta$, where $\\theta$ is the angle between $\\mathbf{u} = ${vecTex(u)}$ and $\\mathbf{v} = ${vecTex(v)}$.`,
          answer: num(`${d}/sqrt(${N1 * N2})`, `\\dfrac{${d}}{\\sqrt{${N1}}\\sqrt{${N2}}}`),
          inputHint: 'Exact form, e.g. 3/sqrt(14*6).',
          solution: [
            `$\\cos\\theta = \\dfrac{\\mathbf{u}\\cdot\\mathbf{v}}{\\|\\mathbf{u}\\|\\|\\mathbf{v}\\|}$`,
            `$\\mathbf{u}\\cdot\\mathbf{v} = ${d}$, $\\|\\mathbf{u}\\| = \\sqrt{${N1}}$, $\\|\\mathbf{v}\\| = \\sqrt{${N2}}$.`,
            `$\\cos\\theta = \\dfrac{${d}}{\\sqrt{${N1}}\\sqrt{${N2}}}$`,
          ],
        };
      },
    },
    {
      name: 'projection onto a vector',
      generate(r) {
        let u, v;
        do {
          u = randVec(r, 3, -5, 5);
          v = randVec(r, 3, -3, 3);
        } while (isZeroVec(v) || dot(u, v).isZero());
        const c = dot(u, v).div(dot(v, v));
        const p = v.map((x) => x.mul(c));
        return {
          prompt: `Find the projection of $\\mathbf{u} = ${vecTex(u)}$ onto $\\mathbf{v} = ${vecTex(v)}$.`,
          answer: vecAns(p),
          inputHint: 'Fractions like 3/7 are fine in cells.',
          solution: [
            `$\\text{proj}_{\\mathbf{v}}\\mathbf{u} = \\dfrac{\\mathbf{u}\\cdot\\mathbf{v}}{\\mathbf{v}\\cdot\\mathbf{v}}\\mathbf{v}$`,
            `$\\mathbf{u}\\cdot\\mathbf{v} = ${dot(u, v).tex()}$, $\\mathbf{v}\\cdot\\mathbf{v} = ${dot(v, v).tex()}$, so the scale factor is $${c.tex()}$.`,
            `$${c.tex()}${vecTex(v)} = ${vecTex(p)}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\|\\mathbf{v}\\| = \\sqrt{\\mathbf{v}\\cdot\\mathbf{v}}$. The angle satisfies $\\cos\\theta = \\frac{\\mathbf{u}\\cdot\\mathbf{v}}{\\|\\mathbf{u}\\|\\|\\mathbf{v}\\|}$. The projection of $\\mathbf{u}$ onto $\\mathbf{v}$ is the "shadow" $\\frac{\\mathbf{u}\\cdot\\mathbf{v}}{\\mathbf{v}\\cdot\\mathbf{v}}\\mathbf{v}$, and $\\mathbf{u} - \\text{proj}$ is perpendicular to $\\mathbf{v}$.',
    resources: [
      tb1b('dot-products', 'Dot products and duality'),
      ila('dot-product', 'Dot Products and Orthogonality'),
      { kind: 'interactive', title: 'Immersive Linear Algebra: The Dot Product', url: 'http://immersivemath.com/ila/ch03_dotproduct/ch03.html' },
    ],
  },
};

// ---------------------------------------------------------------------------

const matmul: Skill = {
  id: 'la.matmul',
  name: 'Matrix multiplication',
  prereqs: ['la.vectors'],
  levels: [
    { name: '2×2 times 2×2', generate: (r) => product(r, 2, 2, 2) },
    { name: 'non-square shapes', generate: (r) => (r.next() < 0.5 ? product(r, 2, 3, 2) : product(r, 3, 2, 3)) },
    { name: '3×3 times 3×3', generate: (r) => product(r, 3, 3, 3, -3, 3) },
  ],
  learn: {
    summary:
      'Entry $(i, j)$ of $AB$ is row $i$ of $A$ dotted with column $j$ of $B$. $A$ ($m\\times n$) times $B$ ($n\\times p$) gives $m\\times p$; the inner sizes must match. Geometrically $AB$ is "apply $B$, then $A$", which is why $AB \\neq BA$ in general.',
    resources: [
      tb1b('matrix-multiplication', 'Matrix multiplication as composition'),
      ila('matrix-multiplication', 'Matrix Multiplication'),
      strang,
    ],
  },
};

function product(r: Rng, m: number, n: number, p: number, lo = -4, hi = 4): Problem {
  const a = randMat(r, m, n, lo, hi);
  const b = randMat(r, n, p, lo, hi);
  const c = matMul(a, b);
  return {
    prompt: `Compute $AB$ for $A = ${matTex(a)}$ and $B = ${matTex(b)}$.`,
    answer: matrixAns(c),
    solution: [
      `$AB$ is ${m}×${p}. Entry $(i, j)$ is row $i$ of $A$ dotted with column $j$ of $B$.`,
      `E.g. $(AB)_{11} = ${a[0].map((x, k) => `${x.tex()}\\cdot${b[k][0].n < 0 ? `(${b[k][0].tex()})` : b[k][0].tex()}`).join(' + ')} = ${c[0][0].tex()}$.`,
      `$AB = ${matTex(c)}$`,
    ],
  };
}

// ---------------------------------------------------------------------------

const systems: Skill = {
  id: 'la.systems',
  name: 'Solving linear systems',
  prereqs: ['la.vectors'],
  levels: [
    { name: '2 equations', generate: (r) => solveSystem(r, 2) },
    { name: '3 equations', generate: (r) => solveSystem(r, 3) },
    {
      name: 'when is there no unique solution?',
      generate(r) {
        for (;;) {
          const m = randMat(r, 3, 3, -3, 3);
          const i = r.int(0, 2);
          const j = r.int(0, 2);
          m[i][j] = new Q(0);
          const d0 = det(m);
          m[i][j] = new Q(1);
          const slope = det(m).sub(d0);
          if (slope.isZero() || d0.isZero()) continue;
          const k = d0.neg().div(slope);
          if (Math.abs(k.value()) > 20) continue;
          const tex = `\\begin{bmatrix} ${m.map((row, a) => row.map((x, b) => (a === i && b === j ? 'k' : x.tex())).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
          return {
            prompt: `For which value of $k$ does the system $A\\mathbf{x} = \\mathbf{b}$ with $A = ${tex}$ fail to have a unique solution (for some $\\mathbf{b}$)?`,
            answer: num(k),
            solution: [
              `A unique solution exists for every $\\mathbf{b}$ exactly when $\\det A \\neq 0$.`,
              `Expanding, $\\det A$ is linear in $k$: $\\det A = ${slope.tex()}k ${signed(d0)}$.`,
              `Setting it to zero: $k = ${k.tex()}$`,
            ],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'Write the augmented matrix $[A\\,|\\,\\mathbf{b}]$ and row reduce (swap rows, scale a row, add a multiple of one row to another) to echelon form, then back-substitute. A square system has a unique solution for every $\\mathbf{b}$ exactly when $\\det A \\neq 0$, i.e. $A$ is invertible.',
    resources: [
      ila('systems-of-eqns', 'Systems of Linear Equations'),
      ila('row-reduction', 'Row Reduction'),
      { kind: 'interactive', title: 'Immersive Linear Algebra: Gaussian Elimination', url: 'http://immersivemath.com/ila/ch05_gausselim/ch05.html' },
    ],
  },
};

function solveSystem(r: Rng, n: number): Problem {
  let a: Mat;
  do a = randMat(r, n, n, -4, 4);
  while (det(a).isZero());
  const x = randVec(r, n, -4, 4);
  const b = matVec(a, x);
  const vars = ['x', 'y', 'z'].slice(0, n);
  const eqs = a.map((row, i) => `${sum(row.map((c, j) => t(c, vars[j]))).tex} &= ${b[i].tex()}`).join(' \\\\ ');
  return {
    prompt: `Solve the system $$\\begin{aligned} ${eqs} \\end{aligned}$$ Enter $(${vars.join(', ')})$ as a column.`,
    answer: vecAns(x),
    solution: [
      `Form the augmented matrix and row reduce: $\\left[\\begin{array}{${'r'.repeat(n)}|r} ${a.map((row, i) => [...row, b[i]].map((v) => v.tex()).join(' & ')).join(' \\\\ ')} \\end{array}\\right]$`,
      `Eliminate below each pivot, then back-substitute.`,
      `$${vars.map((v, i) => `${v} = ${x[i].tex()}`).join(',\\ ')}$. Check by plugging into each equation.`,
    ],
  };
}

// ---------------------------------------------------------------------------

const rrefSkill: Skill = {
  id: 'la.rref',
  name: 'Reduced row echelon form',
  prereqs: ['la.systems'],
  levels: [
    { name: '2×3', generate: (r) => rrefProblem(r, 2, 3, 2) },
    { name: '3×4 with a dependent row', generate: (r) => rrefProblem(r, 3, 4, 2) },
    { name: '4×5', generate: (r) => rrefProblem(r, 4, 5, 3) },
  ],
  learn: {
    summary:
      'RREF: every leading entry is $1$, it is the only non-zero entry in its column, and leading entries move right as you go down; zero rows sit at the bottom. Work column by column: get a pivot $1$, clear everything above and below it, move on. RREF is unique, so it is a reliable check of your arithmetic.',
    resources: [ila('row-reduction', 'Row Reduction'), ila('parametric-form', 'Parametric Form'), strang],
  },
};

function rrefProblem(r: Rng, rows: number, cols: number, rk: number): Problem {
  const { a, R, pivots } = withNiceRref(r, rows, cols, rk);
  return {
    prompt: `Find the reduced row echelon form of $${matTex(a)}$.`,
    answer: matrixAns(R),
    solution: [
      `Row reduce column by column: make each pivot $1$, then clear the rest of its column.`,
      `Pivots end up in column${pivots.length > 1 ? 's' : ''} ${pivots.map((p) => p + 1).join(', ')}${rk < rows ? `; ${rows - rk} row${rows - rk > 1 ? 's become' : ' becomes'} zero` : ''}.`,
      `$${matTex(R)}$`,
    ],
    selfCheck: () => matStrings(rref(a).r).join() === matStrings(R).join(),
  };
}

// ---------------------------------------------------------------------------

const determinant: Skill = {
  id: 'la.det',
  name: 'Computing determinants',
  prereqs: ['la.matmul'],
  levels: [
    { name: '2×2', generate: (r) => detProblem(r, 2, -9, 9) },
    { name: '3×3', generate: (r) => detProblem(r, 3, -4, 4) },
    {
      name: '4×4 with zeros',
      generate(r) {
        const p = detProblem(r, 4, -3, 3, 6);
        return p;
      },
    },
  ],
  learn: {
    summary:
      '$2\\times2$: $ad - bc$. $3\\times3$: cofactor expansion along a row or column (signs alternate $+ - +$), or the rule of Sarrus. Bigger: expand along the row/column with the most zeros, or row reduce to triangular form (det = product of the diagonal; a swap flips the sign, scaling a row scales det, adding a multiple of a row changes nothing).',
    resources: [
      tb1b('determinant', 'The determinant'),
      ila('determinants-definitions-properties', 'Determinants: Definition'),
      ila('determinants-cofactors', 'Cofactor Expansions'),
    ],
  },
};

function detProblem(r: Rng, n: number, lo: number, hi: number, zeros = 0): Problem {
  const a = randMat(r, n, n, lo, hi);
  for (let z = 0; z < zeros; z++) a[r.int(0, n - 1)][r.int(0, n - 1)] = new Q(0);
  const d = det(a);
  const steps =
    n === 2
      ? [`$ad - bc = ${a[0][0].tex()}\\cdot${a[1][1].n < 0 ? `(${a[1][1].tex()})` : a[1][1].tex()} - ${a[0][1].n < 0 ? `(${a[0][1].tex()})` : a[0][1].tex()}\\cdot${a[1][0].n < 0 ? `(${a[1][0].tex()})` : a[1][0].tex()} = ${d.tex()}$`]
      : [
          `Expand along the row or column with the most zeros, or row reduce to triangular form while tracking swaps.`,
          `$\\det A = ${d.tex()}$`,
        ];
  return {
    prompt: `Compute $\\det ${matTex(a, 'bmatrix')}$.`,
    answer: num(d),
    solution: steps,
  };
}

// ---------------------------------------------------------------------------

const detProps: Skill = {
  id: 'la.detprops',
  name: 'Determinant properties',
  prereqs: ['la.det'],
  levels: [
    {
      name: 'scaling a matrix',
      generate(r) {
        const n = r.int(2, 5);
        const d = r.nz(-6, 6);
        const k = r.pick([-2, -1, 2, 3, 4]);
        const ans = new Q(k ** n * d);
        return {
          prompt: `$A$ is a $${n}\\times${n}$ matrix with $\\det A = ${d}$. Find $\\det(${k}A)$.`,
          answer: num(ans),
          solution: [`Scaling the matrix scales each of the ${n} rows, so $\\det(kA) = k^{${n}}\\det A$.`, `$${P(k)}^{${n}}\\cdot ${P(d)} = ${ans.tex()}$`],
        };
      },
    },
    {
      name: 'products, inverses, transposes',
      generate(r) {
        const n = r.int(2, 4);
        const a = r.nz(-4, 4);
        const b = r.nz(-4, 4);
        const pool: { tex: string; val: Q; why: string }[] = [
          { tex: 'AB^{-1}', val: new Q(a, b), why: `$\\det A \\cdot \\frac{1}{\\det B}$` },
          { tex: 'A^{T}B^{2}', val: new Q(a * b * b), why: `$\\det A \\cdot (\\det B)^2$` },
          { tex: `2A^{-1}`, val: new Q(2 ** n, a), why: `$2^{${n}}\\cdot\\frac{1}{\\det A}$` },
          { tex: 'A^{3}B^{T}', val: new Q(a ** 3 * b), why: `$(\\det A)^3\\det B$` },
          { tex: 'B^{-1}A^{2}B', val: new Q(a * a), why: `$\\frac{1}{\\det B}(\\det A)^2\\det B = (\\det A)^2$` },
        ];
        const p = r.pick(pool);
        return {
          prompt: `$A$ and $B$ are $${n}\\times${n}$ with $\\det A = ${a}$ and $\\det B = ${b}$. Find $\\det(${p.tex})$.`,
          answer: num(p.val),
          solution: [
            `Use $\\det(XY) = \\det X\\det Y$, $\\det X^T = \\det X$, $\\det X^{-1} = 1/\\det X$, $\\det(cX) = c^n\\det X$.`,
            `$\\det(${p.tex}) = ${p.why.slice(1, -1)} = ${p.val.tex()}$`,
          ],
        };
      },
    },
    {
      name: 'effect of row operations',
      generate(r) {
        const d = r.nz(-5, 5);
        const c = r.pick([-3, -2, 2, 3, 5]);
        const m = r.nz(-4, 4);
        const [i, j] = distinct(r, 2, 1, 3);
        const swap = r.next() < 0.6;
        const ans = new Q((swap ? -1 : 1) * c * d);
        const ops = [
          ...(swap ? [`swap rows ${i} and ${j}`] : []),
          `multiply row ${i} by $${c}$`,
          `add $${m}$ times row ${j} to row ${6 - i - j}`,
        ];
        return {
          prompt: `$A$ is $3\\times3$ with $\\det A = ${d}$. $B$ is obtained from $A$ by these row operations: ${ops.join(', then ')}. Find $\\det B$.`,
          answer: num(ans),
          solution: [
            `A swap flips the sign, scaling a row by $c$ multiplies det by $c$, adding a multiple of another row changes nothing.`,
            `$\\det B = ${swap ? '(-1)\\cdot' : ''}${P(c)}\\cdot${P(d)} = ${ans.tex()}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\det(AB) = \\det A\\det B$, $\\det A^T = \\det A$, $\\det A^{-1} = \\frac{1}{\\det A}$, $\\det(cA) = c^n\\det A$ for $n\\times n$. Row operations: a swap negates, scaling a row by $c$ multiplies by $c$, adding a multiple of one row to another leaves it unchanged. Geometrically det is the signed volume scale factor of the transformation.',
    resources: [tb1b('determinant', 'The determinant'), ila('determinants-definitions-properties', 'Determinants: Definition and Properties')],
  },
};

const P = (n: number | Q) => (Q.of(n).n < 0 ? `(${Q.of(n).tex()})` : Q.of(n).tex());

// ---------------------------------------------------------------------------

const inverseSkill: Skill = {
  id: 'la.inverse',
  name: 'Matrix inverse',
  prereqs: ['la.matmul', 'la.rref'],
  levels: [
    {
      name: '2×2',
      generate(r) {
        let a: Mat;
        do a = randMat(r, 2, 2, -5, 5);
        while (det(a).isZero() || Math.abs(det(a).value()) > 6);
        const d = det(a);
        const inv = inverse(a);
        return {
          prompt: `Find $A^{-1}$ for $A = ${matTex(a)}$.`,
          answer: matrixAns(inv),
          inputHint: 'Fractions like -3/2 are fine in cells.',
          solution: [
            `$\\begin{bmatrix} a & b \\\\ c & d\\end{bmatrix}^{-1} = \\dfrac{1}{ad - bc}\\begin{bmatrix} d & -b \\\\ -c & a\\end{bmatrix}$, and $ad - bc = ${d.tex()}$.`,
            `$A^{-1} = \\dfrac{1}{${d.tex()}}${matTex([[a[1][1], a[0][1].neg()], [a[1][0].neg(), a[0][0]]])} = ${matTex(inv)}$`,
          ],
          selfCheck: () => isIdentity(matMul(a, inv)),
        };
      },
    },
    {
      name: '3×3 (integer inverse)',
      generate(r) {
        const a = unimodular(r, 3, 4, 3);
        const inv = inverse(a);
        return {
          prompt: `Find $A^{-1}$ for $A = ${matTex(a)}$.`,
          answer: matrixAns(inv),
          solution: [
            `Row reduce $[A\\,|\\,I]$ until the left block is $I$; the right block is then $A^{-1}$.`,
            `$A^{-1} = ${matTex(inv)}$. Check: $AA^{-1} = I$.`,
          ],
          selfCheck: () => isIdentity(matMul(a, inv)),
        };
      },
    },
    {
      name: '3×3 with fractions',
      generate(r) {
        let a: Mat;
        do a = matMul(matMul(unimodular(r, 3, 3, 3), mat([[1, 0, 0], [0, r.pick([2, -2, 3]), 0], [0, 0, 1]])), unimodular(r, 3, 3, 3));
        while (maxAbs(a) > 9);
        const inv = inverse(a);
        return {
          prompt: `Find $A^{-1}$ for $A = ${matTex(a)}$.`,
          answer: matrixAns(inv),
          inputHint: 'Fractions like 1/2 are fine in cells.',
          solution: [
            `Row reduce $[A\\,|\\,I]$, or use $A^{-1} = \\frac{1}{\\det A}\\operatorname{adj}(A)$ with $\\det A = ${det(a).tex()}$.`,
            `$A^{-1} = ${matTex(inv)}$`,
          ],
          selfCheck: () => isIdentity(matMul(a, inv)),
        };
      },
    },
  ],
  learn: {
    summary:
      '$A^{-1}$ exists iff $\\det A \\neq 0$. For $2\\times2$: swap the diagonal, negate the off-diagonal, divide by the determinant. In general row reduce $[A\\,|\\,I] \\to [I\\,|\\,A^{-1}]$. Always check with $AA^{-1} = I$.',
    resources: [tb1b('inverse-matrices', 'Inverse matrices, column space and null space'), ila('matrix-inverses', 'Matrix Inverses')],
  },
};

// ---------------------------------------------------------------------------

const independence: Skill = {
  id: 'la.independence',
  name: 'Span, independence and coordinates',
  prereqs: ['la.rref'],
  levels: [
    {
      name: 'independent or not?',
      generate(r) {
        const u = randVec(r, 3, -4, 4);
        const v = randVec(r, 3, -4, 4);
        const dependent = r.next() < 0.5;
        let w: Q[];
        const a = r.nz(-2, 2);
        const b = r.nz(-2, 2);
        if (dependent) w = u.map((x, i) => x.mul(a).add(v[i].mul(b)));
        else do w = randVec(r, 3, -4, 4);
          while (det(transpose([u, v, w])).isZero());
        const d = det(transpose([u, v, w]));
        if (!dependent && d.isZero()) return this.generate(r);
        if (dependent && rank([u, v]) < 2) return this.generate(r);
        return {
          prompt: `Are the vectors $${vecTex(u)}$, $${vecTex(v)}$, $${vecTex(w)}$ linearly independent?`,
          answer: { kind: 'choice', options: ['Linearly independent', 'Linearly dependent'], correct: dependent ? 1 : 0 },
          solution: [
            `Three vectors in $\\mathbb{R}^3$ are independent iff the matrix with them as columns has non-zero determinant.`,
            `$\\det = ${d.tex()}$${dependent ? `; indeed the third is $${a}\\mathbf{v}_1 ${signed(b)}\\mathbf{v}_2$.` : '.'}`,
          ],
        };
      },
    },
    {
      name: 'is it in the span?',
      generate(r) {
        let u, v;
        do {
          u = randVec(r, 3, -3, 3);
          v = randVec(r, 3, -3, 3);
        } while (rank([u, v]) < 2);
        const a = r.nz(-3, 3);
        const b = r.nz(-3, 3);
        const inSpan = r.next() < 0.5;
        const w = u.map((x, i) => x.mul(a).add(v[i].mul(b)));
        if (!inSpan) w[r.int(0, 2)] = w[r.int(0, 2)].add(r.nz(-2, 2));
        const yes = rank([u, v, w]) === 2;
        return {
          prompt: `Is $\\mathbf{w} = ${vecTex(w)}$ in $\\operatorname{span}\\left\\{${vecTex(u)}, ${vecTex(v)}\\right\\}$?`,
          answer: { kind: 'choice', options: ['Yes', 'No'], correct: yes ? 0 : 1 },
          solution: [
            `Solve $c_1\\mathbf{v}_1 + c_2\\mathbf{v}_2 = \\mathbf{w}$: row reduce $[\\mathbf{v}_1\\ \\mathbf{v}_2\\,|\\,\\mathbf{w}]$.`,
            yes ? `It is consistent: $\\mathbf{w} = ${a}\\mathbf{v}_1 ${signed(b)}\\mathbf{v}_2$.` : `A row $[0\\ 0\\,|\\,\\text{nonzero}]$ appears, so there is no solution.`,
          ],
        };
      },
    },
    {
      name: 'coordinates in a basis',
      generate(r) {
        const B = unimodular(r, 3, 4, 3);
        const c = randVec(r, 3, -3, 3);
        const w = matVec(B, c);
        const cols = transpose(B);
        return {
          prompt: `Find the coordinates of $\\mathbf{w} = ${vecTex(w)}$ in the basis $\\left\\{${cols.map((v) => vecTex(v)).join(', ')}\\right\\}$.`,
          answer: vecAns(c),
          solution: [
            `Solve $c_1\\mathbf{b}_1 + c_2\\mathbf{b}_2 + c_3\\mathbf{b}_3 = \\mathbf{w}$, i.e. $B\\mathbf{c} = \\mathbf{w}$ with the basis vectors as columns of $B$.`,
            `$\\mathbf{c} = ${vecTex(c)}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\mathbf{w}$ is in the span of some vectors iff $[\\mathbf{v}_1 \\cdots \\mathbf{v}_k\\,|\\,\\mathbf{w}]$ is consistent. Vectors are independent iff the only solution of $c_1\\mathbf{v}_1 + \\dots + c_k\\mathbf{v}_k = \\mathbf{0}$ is all $c_i = 0$, equivalently every column of the matrix gets a pivot ($n$ vectors in $\\mathbb{R}^n$: $\\det \\neq 0$). Coordinates in a basis $B$: solve $B\\mathbf{c} = \\mathbf{w}$.',
    resources: [
      tb1b('span', 'Linear combinations, span, and basis vectors'),
      ila('spans', 'Spans'),
      ila('linear-independence', 'Linear Independence'),
      tb1b('change-of-basis', 'Change of basis'),
    ],
  },
};

// ---------------------------------------------------------------------------

const rankSkill: Skill = {
  id: 'la.rank',
  name: 'Rank and null space',
  prereqs: ['la.rref'],
  levels: [
    {
      name: 'rank',
      generate(r) {
        const rk = r.int(1, 3);
        const { a, R } = withNiceRref(r, 3, 4, rk);
        return {
          prompt: `What is the rank of $${matTex(a)}$?`,
          answer: num(new Q(rk)),
          solution: [`Row reduce and count pivots: $${matTex(R)}$ has ${rk} pivot${rk > 1 ? 's' : ''}.`, `$\\operatorname{rank} = ${rk}$`],
          selfCheck: () => rank(a) === rk,
        };
      },
    },
    {
      name: 'nullity',
      generate(r) {
        const rk = r.int(2, 4);
        const { a, R } = withNiceRref(r, 4, 5, rk);
        return {
          prompt: `What is the dimension of the null space of $${matTex(a)}$?`,
          answer: num(new Q(5 - rk)),
          solution: [
            `Rank–nullity: $\\dim\\operatorname{Nul}A = (\\text{columns}) - \\operatorname{rank}A$.`,
            `RREF $${matTex(R)}$ has rank ${rk}, so nullity $= 5 - ${rk} = ${5 - rk}$.`,
          ],
          selfCheck: () => rank(a) === rk,
        };
      },
    },
    {
      name: 'null space basis',
      generate(r) {
        let a: Mat, R: Mat, v: Q[];
        do {
          ({ a, R } = withNiceRref(r, 3, 4, 3));
          [v] = nullspace(a);
        } while (v.filter((x) => !x.isZero()).length < 2);
        return {
          prompt: `The null space of $A = ${matTex(a)}$ is one-dimensional. Find a vector spanning it.`,
          answer: { kind: 'direction', expected: vecStrings(v) },
          inputHint: 'Any non-zero multiple is accepted.',
          solution: [
            `Row reduce: $${matTex(R)}$.`,
            `The free variable is the column without a pivot; set it to $1$ and solve the pivot variables from each row.`,
            `$\\operatorname{Nul}A = \\operatorname{span}\\left\\{${vecTex(v)}\\right\\}$`,
          ],
          selfCheck: () => matVec(a, v).every((x) => x.isZero()) && !isZeroVec(v),
        };
      },
    },
  ],
  learn: {
    summary:
      'Rank = number of pivots in the echelon form = dimension of the column space. Rank–nullity: $\\operatorname{rank}A + \\dim\\operatorname{Nul}A = $ number of columns. To find a null space basis, row reduce, give each free variable the value $1$ in turn (others $0$), and solve for the pivot variables.',
    resources: [
      tb1b('inverse-matrices', 'Inverse matrices, column space and null space'),
      ila('rank-thm', 'The Rank Theorem'),
      ila('parametric-form', 'Parametric Form'),
    ],
  },
};

// ---------------------------------------------------------------------------

const NAMED: { name: string; m: number[][] }[] = [
  { name: 'rotation by $90^\\circ$ counterclockwise', m: [[0, -1], [1, 0]] },
  { name: 'rotation by $180^\\circ$', m: [[-1, 0], [0, -1]] },
  { name: 'rotation by $90^\\circ$ clockwise', m: [[0, 1], [-1, 0]] },
  { name: 'reflection across the $x$-axis', m: [[1, 0], [0, -1]] },
  { name: 'reflection across the $y$-axis', m: [[-1, 0], [0, 1]] },
  { name: 'reflection across the line $y = x$', m: [[0, 1], [1, 0]] },
  { name: 'reflection across the line $y = -x$', m: [[0, -1], [-1, 0]] },
  { name: 'projection onto the $x$-axis', m: [[1, 0], [0, 0]] },
];

function namedTransform(r: Rng): { name: string; m: Mat } {
  const roll = r.int(0, NAMED.length + 1);
  if (roll < NAMED.length) return { name: NAMED[roll].name, m: mat(NAMED[roll].m) };
  if (roll === NAMED.length) {
    const k = r.nz(-3, 3);
    return { name: `horizontal shear $(x, y) \\mapsto (x ${signed(k)}y, y)$`.replace(/([+-]) 1y/, '$1 y'), m: mat([[1, k], [0, 1]]) };
  }
  const a = r.pick([2, 3, -1]);
  const b = r.pick([2, 3, 1, -2]);
  return { name: `scaling by $${a}$ in $x$ and $${b}$ in $y$`, m: mat([[a, 0], [0, b]]) };
}

const transforms: Skill = {
  id: 'la.transform',
  name: 'Matrices of linear transformations',
  prereqs: ['la.matmul'],
  levels: [
    {
      name: 'standard transformations',
      generate(r) {
        const T = namedTransform(r);
        const cols = transpose(T.m);
        return {
          prompt: `Find the standard matrix of the ${T.name} in $\\mathbb{R}^2$.`,
          answer: matrixAns(T.m),
          solution: [
            `The columns are the images of $\\mathbf{e}_1 = (1, 0)$ and $\\mathbf{e}_2 = (0, 1)$.`,
            `$T(\\mathbf{e}_1) = ${vecTex(cols[0])}$, $T(\\mathbf{e}_2) = ${vecTex(cols[1])}$, so $A = ${matTex(T.m)}$.`,
          ],
        };
      },
    },
    {
      name: 'compositions',
      generate(r) {
        const S = namedTransform(r);
        let T = namedTransform(r);
        while (T.name === S.name) T = namedTransform(r);
        const m = matMul(T.m, S.m);
        return {
          prompt: `Find the standard matrix of the transformation that first applies the ${S.name}, then the ${T.name}.`,
          answer: matrixAns(m),
          solution: [
            `First $S = ${matTex(S.m)}$, then $T = ${matTex(T.m)}$. The composition is $TS$ (the first map goes on the right).`,
            `$TS = ${matTex(m)}$`,
          ],
        };
      },
    },
    {
      name: 'from images of a basis',
      generate(r) {
        let V: Mat, W: Mat, A: Mat;
        do {
          V = unimodular(r, 2, 3, 3);
          W = randMat(r, 2, 2, -5, 5);
          A = matMul(W, inverse(V));
        } while (maxAbs(A) > 12 || transpose(W).some(isZeroVec));
        const vc = transpose(V);
        const wc = transpose(W);
        return {
          prompt: `A linear map $T: \\mathbb{R}^2 \\to \\mathbb{R}^2$ satisfies $T${vecTex(vc[0])} = ${vecTex(wc[0])}$ and $T${vecTex(vc[1])} = ${vecTex(wc[1])}$. Find its standard matrix.`,
          answer: matrixAns(A),
          solution: [
            `With $V = [\\mathbf{v}_1\\ \\mathbf{v}_2]$ and $W = [T\\mathbf{v}_1\\ T\\mathbf{v}_2]$ we have $AV = W$, so $A = WV^{-1}$.`,
            `$V^{-1} = ${matTex(inverse(V))}$, $A = ${matTex(W)}${matTex(inverse(V))} = ${matTex(A)}$`,
          ],
          selfCheck: () => matStrings(matMul(A, V)).join() === matStrings(W).join(),
        };
      },
    },
  ],
  learn: {
    summary:
      'A linear map is determined by where it sends the basis vectors: the columns of its standard matrix are $T(\\mathbf{e}_1), T(\\mathbf{e}_2), \\dots$. "First $S$, then $T$" is the product $TS$ (right to left). If you know the images of some other basis $V$, then $AV = W$ so $A = WV^{-1}$.',
    resources: [
      tb1b('linear-transformations', 'Linear transformations and matrices'),
      tb1b('matrix-multiplication', 'Matrix multiplication as composition'),
      ila('matrix-transformations', 'Matrix Transformations'),
    ],
  },
};

// ---------------------------------------------------------------------------

/** A = P D P⁻¹ with integer P (det 1) and distinct integer eigenvalues. */
function diagonalizable(r: Rng, n: number, bound: number) {
  for (;;) {
    const P = unimodular(r, n, n + 1, 2);
    const ev = distinct(r, n, -4, 5);
    const D = mat(Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? ev[i] : 0))));
    const A = matMul(matMul(P, D), inverse(P));
    if (maxAbs(A) <= bound && !isIdentity(P)) return { A, P, ev };
  }
}

const charPoly2 = (A: Mat) =>
  sum([t(1, '\\lambda^2'), t(A[0][0].add(A[1][1]).neg(), '\\lambda'), t(det(A))]).tex;

const eigen: Skill = {
  id: 'la.eigen',
  name: 'Eigenvalues and eigenvectors',
  prereqs: ['la.det'],
  levels: [
    {
      name: '2×2 eigenvalues',
      generate(r) {
        const { A, ev } = diagonalizable(r, 2, 12);
        return {
          prompt: `Find the eigenvalues of $${matTex(A)}$.`,
          answer: { kind: 'list', expected: ev.map(String) },
          inputHint: 'Comma-separated, any order.',
          solution: [
            `Solve $\\det(A - \\lambda I) = 0$: $${charPoly2(A)} = 0$.`,
            `Shortcut: $\\lambda_1 + \\lambda_2 = \\operatorname{tr}A = ${A[0][0].add(A[1][1]).tex()}$, $\\lambda_1\\lambda_2 = \\det A = ${det(A).tex()}$.`,
            `$\\lambda = ${ev.join(',\\ ')}$`,
          ],
        };
      },
    },
    {
      name: '3×3 eigenvalues',
      generate(r) {
        const { A, ev } = diagonalizable(r, 3, 14);
        return {
          prompt: `Find the eigenvalues of $${matTex(A)}$.`,
          answer: { kind: 'list', expected: ev.map(String) },
          inputHint: 'Comma-separated, any order. They are integers.',
          solution: [
            `Expand $\\det(A - \\lambda I)$ to a cubic and look for integer roots among the divisors of $\\det A = ${det(A).tex()}$.`,
            `Check: the eigenvalues must sum to $\\operatorname{tr}A = ${A.reduce((s, row, i) => s.add(row[i]), new Q(0)).tex()}$.`,
            `$\\lambda = ${ev.join(',\\ ')}$`,
          ],
        };
      },
    },
    {
      name: 'eigenvectors',
      generate(r) {
        const n = r.int(2, 3);
        let A: Mat, basis: Mat, ev: number[], i: number, v: Q[];
        do {
          ({ A, P: basis, ev } = diagonalizable(r, n, 12));
          i = r.int(0, n - 1);
          v = scaleToInts(transpose(basis)[i]);
        } while (v.filter((x) => !x.isZero()).length < 2);
        const shifted = A.map((row, a) => row.map((x, b) => (a === b ? x.sub(ev[i]) : x)));
        return {
          prompt: `$\\lambda = ${ev[i]}$ is an eigenvalue of $A = ${matTex(A)}$. Find a corresponding eigenvector.`,
          answer: { kind: 'direction', expected: vecStrings(v) },
          inputHint: 'Any non-zero multiple is accepted.',
          solution: [
            `Find the null space of $A - ${P(ev[i])}I = ${matTex(shifted)}$.`,
            `Row reduce: $${matTex(rref(shifted).r)}$.`,
            `$\\mathbf{v} = ${vecTex(v)}$ (any non-zero multiple). Check $A\\mathbf{v} = ${ev[i]}\\mathbf{v}$.`,
          ],
          selfCheck: () => matVec(A, v).every((x, k) => x.eq(v[k].mul(ev[i]))),
        };
      },
    },
  ],
  learn: {
    summary:
      '$A\\mathbf{v} = \\lambda\\mathbf{v}$ with $\\mathbf{v} \\neq \\mathbf{0}$. Eigenvalues are the roots of $\\det(A - \\lambda I) = 0$; for $2\\times2$ that is $\\lambda^2 - (\\operatorname{tr}A)\\lambda + \\det A = 0$. Eigenvectors for $\\lambda$ form the null space of $A - \\lambda I$. Sanity checks: the eigenvalues sum to the trace and multiply to the determinant.',
    resources: [
      tb1b('eigenvalues', 'Eigenvectors and eigenvalues'),
      ila('eigenvectors', 'Eigenvalues and Eigenvectors'),
      ila('characteristic-polynomial', 'The Characteristic Polynomial'),
      strang,
    ],
  },
};

// ---------------------------------------------------------------------------

const orthogonal: Skill = {
  id: 'la.orthogonal',
  name: 'Gram–Schmidt and least squares',
  prereqs: ['la.geometry', 'la.systems'],
  levels: [
    {
      name: 'Gram–Schmidt step',
      generate(r) {
        let u1, u2;
        do {
          u1 = randVec(r, 3, -3, 3);
          u2 = randVec(r, 3, -4, 4);
        } while (rank([u1, u2]) < 2 || dot(u1, u2).isZero());
        const c = dot(u2, u1).div(dot(u1, u1));
        const w = u2.map((x, i) => x.sub(u1[i].mul(c)));
        return {
          prompt: `Apply Gram–Schmidt to $\\mathbf{v}_1 = ${vecTex(u1)}$, $\\mathbf{v}_2 = ${vecTex(u2)}$. Find the second orthogonal vector $\\mathbf{u}_2$ (no need to normalise).`,
          answer: { kind: 'direction', expected: vecStrings(scaleToInts(w)) },
          inputHint: 'Any non-zero multiple is accepted.',
          solution: [
            `$\\mathbf{u}_2 = \\mathbf{v}_2 - \\dfrac{\\mathbf{v}_2\\cdot\\mathbf{v}_1}{\\mathbf{v}_1\\cdot\\mathbf{v}_1}\\mathbf{v}_1 = ${vecTex(u2)} - ${c.tex()}${vecTex(u1)}$`,
            `$= ${vecTex(w)}$, or scaled: $${vecTex(scaleToInts(w))}$. Check $\\mathbf{u}_2\\cdot\\mathbf{v}_1 = 0$.`,
          ],
          selfCheck: () => dot(w, u1).isZero(),
        };
      },
    },
    {
      name: 'projection onto a plane',
      generate(r) {
        let u1: Q[], u2: Q[];
        do {
          u1 = randVec(r, 3, -2, 2);
          const v = randVec(r, 3, -3, 3);
          const c = isZeroVec(u1) ? new Q(0) : dot(v, u1).div(dot(u1, u1));
          u2 = scaleToInts(v.map((x, i) => x.sub(u1[i].mul(c))));
        } while (isZeroVec(u1) || u2.some((x) => Number.isNaN(x.value())) || isZeroVec(u2) || maxAbs([u2]) > 6);
        const y = randVec(r, 3, -5, 5);
        const c1 = dot(y, u1).div(dot(u1, u1));
        const c2 = dot(y, u2).div(dot(u2, u2));
        const p = u1.map((x, i) => x.mul(c1).add(u2[i].mul(c2)));
        return {
          prompt: `$\\mathbf{u}_1 = ${vecTex(u1)}$ and $\\mathbf{u}_2 = ${vecTex(u2)}$ are orthogonal. Find the orthogonal projection of $\\mathbf{y} = ${vecTex(y)}$ onto $W = \\operatorname{span}\\{\\mathbf{u}_1, \\mathbf{u}_2\\}$.`,
          answer: vecAns(p),
          inputHint: 'Fractions are fine in cells.',
          solution: [
            `With an orthogonal basis, project onto each vector and add: $\\hat{\\mathbf{y}} = \\frac{\\mathbf{y}\\cdot\\mathbf{u}_1}{\\mathbf{u}_1\\cdot\\mathbf{u}_1}\\mathbf{u}_1 + \\frac{\\mathbf{y}\\cdot\\mathbf{u}_2}{\\mathbf{u}_2\\cdot\\mathbf{u}_2}\\mathbf{u}_2$.`,
            `Coefficients: $${c1.tex()}$ and $${c2.tex()}$.`,
            `$\\hat{\\mathbf{y}} = ${vecTex(p)}$`,
          ],
          selfCheck: () => dot(u1, u2).isZero(),
        };
      },
    },
    {
      name: 'least-squares line',
      generate(r) {
        const xs = distinct(r, 4, -3, 4).sort((a, b) => a - b);
        const ys = xs.map(() => r.int(-5, 6));
        const X = mat(xs.map((x) => [1, x]));
        const XtX = matMul(transpose(X), X);
        const Xty = matVec(transpose(X), ys.map((y) => new Q(y)));
        const beta = matVec(inverse(XtX), Xty);
        return {
          prompt: `Find the least-squares line $y = c_0 + c_1x$ through the points ${xs.map((x, i) => `$(${x}, ${ys[i]})$`).join(', ')}. Enter $(c_0, c_1)$ as a column.`,
          answer: vecAns(beta),
          inputHint: 'Fractions are fine in cells.',
          solution: [
            `Normal equations $X^TX\\boldsymbol{\\beta} = X^T\\mathbf{y}$ where $X$ has rows $(1, x_i)$.`,
            `$X^TX = ${matTex(XtX)}$, $X^T\\mathbf{y} = ${vecTex(Xty)}$.`,
            `Solve: $c_0 = ${beta[0].tex()}$, $c_1 = ${beta[1].tex()}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Gram–Schmidt turns a basis into an orthogonal one by subtracting from each vector its projections onto the previous ones. With an orthogonal basis, projecting onto a subspace is just the sum of the projections onto each basis vector. Least squares: if $X\\boldsymbol{\\beta} = \\mathbf{y}$ has no solution, solve the normal equations $X^TX\\boldsymbol{\\beta} = X^T\\mathbf{y}$ instead.',
    resources: [
      ila('projections', 'Orthogonal Projection'),
      ila('orthogonal-sets', 'Orthogonal Sets (Gram–Schmidt)'),
      ila('least-squares', 'The Method of Least Squares'),
      strang,
    ],
  },
};

// ---------------------------------------------------------------------------

const DEF_OPTIONS = [
  'Positive definite',
  'Positive semidefinite (not definite)',
  'Negative definite',
  'Negative semidefinite (not definite)',
  'Indefinite',
];

/** Symmetric A = L D Lᵀ; by Sylvester's law of inertia the signs of D decide definiteness. */
function symmetricWithClass(r: Rng, n: number) {
  const cls = r.int(0, 4);
  const signs: number[] =
    cls === 0 ? Array(n).fill(1)
    : cls === 1 ? [...Array(n - 1).fill(1), 0]
    : cls === 2 ? Array(n).fill(-1)
    : cls === 3 ? [...Array(n - 1).fill(-1), 0]
    : r.shuffle([1, -1, ...Array(n - 2).fill(r.sign())]);
  const D = signs.map((s) => s * r.int(1, 3));
  const L = identity(n);
  for (let i = 1; i < n; i++) for (let j = 0; j < i; j++) L[i][j] = new Q(r.int(-2, 2));
  const Dm = mat(D.map((d, i) => D.map((_, j) => (i === j ? d : 0))));
  const A = matMul(matMul(L, Dm), transpose(L));
  return { A, cls, D };
}

const definiteness: Skill = {
  id: 'la.definite',
  name: 'Quadratic forms and definiteness',
  prereqs: ['la.eigen'],
  levels: [
    {
      name: 'matrix of a quadratic form',
      generate(r) {
        const a = r.int(-5, 5);
        const b = r.nz(-6, 6);
        const c = r.int(-5, 5);
        const q = sum([t(a, 'x^{2}'), t(b, 'xy'), t(c, 'y^{2}')]);
        const A = mat([[a, new Q(b, 2)], [new Q(b, 2), c]]);
        return {
          prompt: `Find the symmetric matrix $A$ with $q(x, y) = ${q.tex} = \\begin{bmatrix} x & y \\end{bmatrix}A\\begin{bmatrix} x \\\\ y \\end{bmatrix}$.`,
          answer: matrixAns(A),
          solution: [
            `Squared terms go on the diagonal; the cross term $${b}xy$ is split evenly between the two off-diagonal entries.`,
            `$A = ${matTex(A)}$`,
          ],
        };
      },
    },
    {
      name: 'classify 2×2',
      generate(r) {
        const { A, cls } = symmetricWithClass(r, 2);
        const d = det(A);
        return {
          prompt: `Classify the symmetric matrix $${matTex(A)}$.`,
          answer: { kind: 'choice', options: DEF_OPTIONS, correct: cls },
          solution: [
            `For $2\\times2$ symmetric: $\\det A = ${d.tex()}$, $a_{11} = ${A[0][0].tex()}$, $\\operatorname{tr}A = ${A[0][0].add(A[1][1]).tex()}$.`,
            `$\\det > 0$: definite, with the sign of $a_{11}$. $\\det < 0$: indefinite (eigenvalues of opposite sign). $\\det = 0$: semidefinite, with the sign of the trace.`,
            `So: ${DEF_OPTIONS[cls].toLowerCase()}.`,
          ],
        };
      },
    },
    {
      name: 'classify 3×3',
      generate(r) {
        let g;
        do g = symmetricWithClass(r, 3);
        while (maxAbs(g.A) > 15);
        const { A, cls, D } = g;
        const minors = [1, 2, 3].map((k) => det(A.slice(0, k).map((row) => row.slice(0, k))));
        return {
          prompt: `Classify the symmetric matrix $${matTex(A)}$.`,
          answer: { kind: 'choice', options: DEF_OPTIONS, correct: cls },
          solution: [
            `Leading principal minors: $${minors.map((m) => m.tex()).join(',\\ ')}$. All positive ⇒ positive definite; alternating $-, +, -$ ⇒ negative definite (Sylvester's criterion).`,
            `In general, symmetric elimination gives $A = LDL^T$ with $D = \\operatorname{diag}(${D.join(', ')})$, and the signs of $D$ match the signs of the eigenvalues.`,
            `So: ${DEF_OPTIONS[cls].toLowerCase()}.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'A symmetric matrix is positive definite if $\\mathbf{x}^TA\\mathbf{x} > 0$ for all $\\mathbf{x} \\neq \\mathbf{0}$, equivalently all eigenvalues are $> 0$ (semidefinite: $\\ge 0$; indefinite: mixed signs). Sylvester: positive definite iff all leading principal minors are positive. This is the second-derivative test in many variables: a positive-definite Hessian means a local minimum.',
    resources: [
      { kind: 'article', title: 'Wikipedia: Definite matrix', url: 'https://en.wikipedia.org/wiki/Definite_matrix' },
      { kind: 'article', title: "Wikipedia: Sylvester's criterion", url: 'https://en.wikipedia.org/wiki/Sylvester%27s_criterion' },
      strang,
    ],
  },
};

// ---------------------------------------------------------------------------
// Going deeper

const matPow = (a: Mat, k: number): Mat => (k === 0 ? identity(a.length) : matMul(a, matPow(a, k - 1)));
const diagMat = (d: number[]) => mat(d.map((x, i) => d.map((_, j) => (i === j ? x : 0))));

const diagonalization: Skill = {
  id: 'la.diagpow',
  name: 'Diagonalization and matrix powers',
  prereqs: ['la.eigen'],
  levels: [
    {
      name: 'powers from PDP⁻¹',
      generate(r) {
        for (;;) {
          const P = unimodular(r, 2, 3, 2);
          const d = distinct(r, 2, -2, 3);
          const k = r.int(3, 5);
          const A = matMul(matMul(P, diagMat(d)), inverse(P));
          const Ak = matMul(matMul(P, diagMat(d.map((x) => x ** k))), inverse(P));
          if (maxAbs(Ak) > 400 || isIdentity(P)) continue;
          return {
            prompt: `$A = PDP^{-1}$ with $P = ${matTex(P)}$, $D = ${matTex(diagMat(d))}$ and $P^{-1} = ${matTex(inverse(P))}$. Compute $A^{${k}}$.`,
            answer: matrixAns(Ak),
            solution: [
              `$A^{${k}} = PD^{${k}}P^{-1}$: the inner $P^{-1}P$ pairs cancel.`,
              `$D^{${k}} = ${matTex(diagMat(d.map((x) => x ** k)))}$ (just power the diagonal).`,
              `$A^{${k}} = ${matTex(Ak)}$`,
            ],
            selfCheck: () => matStrings(matPow(A, k)).join() === matStrings(Ak).join(),
          };
        }
      },
    },
    {
      name: 'diagonalizable or not?',
      generate(r) {
        const want = r.next() < 0.5;
        for (;;) {
          const [a, e] = distinct(r, 2, -3, 4);
          const A = mat([
            [a, r.int(-2, 2), r.int(-2, 2)],
            [0, a, r.int(-2, 2)],
            [0, 0, e],
          ]);
          const geo = (l: number) => 3 - rank(A.map((row, i) => row.map((x, j) => (i === j ? x.sub(l) : x))));
          const ga = geo(a);
          const diag = ga === 2;
          if (diag !== want) continue;
          return {
            prompt: `Is $A = ${matTex(A)}$ diagonalizable?`,
            answer: { kind: 'choice', options: ['Yes', 'No'], correct: diag ? 0 : 1 },
            solution: [
              `Triangular, so the eigenvalues are the diagonal: $${a}$ (twice) and $${e}$.`,
              `Diagonalizable iff each eigenvalue has as many independent eigenvectors as its multiplicity. For $\\lambda = ${a}$: $\\dim\\operatorname{Nul}(A - ${P(a)}I) = 3 - \\operatorname{rank} = ${ga}$.`,
              diag ? `$${ga} = 2$, so yes.` : `$${ga} < 2$: not enough eigenvectors, so no.`,
            ],
          };
        }
      },
    },
    {
      name: 'compute a power from scratch',
      generate(r) {
        for (;;) {
          const P = unimodular(r, 2, 3, 2);
          const d = distinct(r, 2, -1, 2);
          const k = r.int(4, 6);
          const A = matMul(matMul(P, diagMat(d)), inverse(P));
          const Ak = matPow(A, k);
          if (maxAbs(Ak) > 500 || maxAbs(A) > 8 || isIdentity(P)) continue;
          const v = transpose(P);
          return {
            prompt: `Compute $${matTex(A)}^{${k}}$.`,
            answer: matrixAns(Ak),
            inputHint: 'Hint: diagonalize first.',
            solution: [
              `Eigenvalues: $${d.join(',\\ ')}$ (trace $${d[0] + d[1]}$, det $${d[0] * d[1]}$).`,
              `Eigenvectors: $${vecTex(v[0])}$ for $${d[0]}$, $${vecTex(v[1])}$ for $${d[1]}$, so $P = ${matTex(P)}$, $P^{-1} = ${matTex(inverse(P))}$.`,
              `$A^{${k}} = P\\,${matTex(diagMat(d.map((x) => x ** k)))}\\,P^{-1} = ${matTex(Ak)}$`,
            ],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'If $A$ has $n$ independent eigenvectors, put them in the columns of $P$ and the eigenvalues on the diagonal of $D$: then $A = PDP^{-1}$ and $A^k = PD^kP^{-1}$, where $D^k$ just powers the diagonal. A repeated eigenvalue with too few eigenvectors (a "defective" matrix) cannot be diagonalized. This is how linear recurrences such as Fibonacci get closed forms.',
    resources: [
      ila('diagonalization', 'Diagonalization'),
      tb1b('eigenvalues', 'Eigenvectors and eigenvalues'),
      strang,
    ],
  },
};

// ---------------------------------------------------------------------------

export const linalgChapters: Chapter[] = [
  {
    id: 'la.ch.vectors',
    title: 'Vectors',
    about: 'Vectors as arrows and as lists of numbers: adding, scaling, dot and cross products, lengths, angles and projections.',
    why: 'Everything in linear algebra is built on vectors. In computing they are points, colours, feature vectors and embeddings; the dot product is how similarity is measured.',
    resources: [tb1b('vectors', 'Vectors, what even are they?'), ila('vectors', 'Vectors'), { kind: 'interactive', title: 'Immersive Linear Algebra: Vectors', url: 'http://immersivemath.com/ila/ch02_vectors/ch02.html' }],
    skills: [vectors, geometry],
    deeper: [],
  },
  {
    id: 'la.ch.systems',
    title: 'Linear systems',
    about: 'Solving systems of linear equations by row reduction, and the reduced row echelon form that summarises them.',
    why: 'Row reduction is the workhorse algorithm of the subject: almost every later question (inverse, rank, null space, independence) is answered by row reducing something.',
    resources: [ila('systems-of-eqns', 'Systems of Linear Equations'), ila('row-reduction', 'Row Reduction'), strang],
    skills: [systems, rrefSkill],
    deeper: [],
  },
  {
    id: 'la.ch.matrices',
    title: 'Matrices and linear maps',
    about: 'Matrix multiplication, inverses, and matrices as transformations of space (rotations, reflections, shears).',
    why: 'Matrices are how graphics engines move objects, how neural network layers work, and how systems of equations are solved in one step.',
    resources: [tb1b('linear-transformations', 'Linear transformations and matrices'), tb1b('matrix-multiplication', 'Matrix multiplication as composition'), ila('matrix-multiplication', 'Matrix Multiplication')],
    skills: [matmul, inverseSkill, transforms],
    deeper: [],
  },
  {
    id: 'la.ch.determinants',
    title: 'Determinants',
    about: 'Computing determinants and the rules for how they behave under products, inverses and row operations.',
    why: 'The determinant tells you at a glance whether a matrix is invertible and how much it scales area or volume (which is why it appears in change of variables).',
    resources: [tb1b('determinant', 'The determinant'), ila('determinants-definitions-properties', 'Determinants: Definition')],
    skills: [determinant, detProps],
    deeper: [],
  },
  {
    id: 'la.ch.spaces',
    title: 'Vector spaces',
    about: 'Span, linear independence, bases and coordinates, rank and null space.',
    why: 'These ideas explain when a system has a unique solution, how many degrees of freedom data really has, and what a "basis" or "dimension" means.',
    resources: [tb1b('span', 'Linear combinations, span, and basis vectors'), tb1b('inverse-matrices', 'Inverse matrices, column space and null space'), ila('linear-independence', 'Linear Independence')],
    skills: [independence, rankSkill],
    deeper: [],
  },
  {
    id: 'la.ch.eigen',
    title: 'Eigenvalues',
    about: 'Eigenvalues and eigenvectors, and what they say about a matrix, including when a symmetric matrix is positive definite.',
    why: 'Eigenvectors are the directions a transformation only stretches. They drive PageRank, PCA, stability analysis and the second-derivative test in many variables.',
    resources: [tb1b('eigenvalues', 'Eigenvectors and eigenvalues'), ila('eigenvectors', 'Eigenvalues and Eigenvectors'), strang],
    skills: [eigen, definiteness],
    deeper: [diagonalization],
  },
  {
    id: 'la.ch.orthogonality',
    title: 'Orthogonality',
    about: 'Orthogonal projections, Gram–Schmidt, and least squares for systems with no exact solution.',
    why: 'Least squares is linear regression. Orthogonal bases make computations numerically stable and are the basis of QR decomposition.',
    resources: [ila('projections', 'Orthogonal Projection'), ila('least-squares', 'The Method of Least Squares'), strang],
    skills: [orthogonal],
    deeper: [],
  },
];
