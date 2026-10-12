// Linear Algebra: widened levels, conceptual sections and applications. The chapter list lives here.
import { det, dot, identity, inverse, mat, matMul, matTex, matVec, nullspace, Q, rank, transpose, vecTex, type Mat } from '../core/frac';
import { coef, signed, sum, t } from '../core/fmt';
import type { Chapter, Problem, Rng, Skill } from '../core/types';
import { mix } from './calc-helpers';
import { distinct } from './helpers';
import { ila, isZeroVec, matrixAns, num, randMat, randVec, strang, tb1b, unimodular, vecAns } from './la-helpers';
import {
  definiteness,
  detProps,
  determinant,
  diagonalization,
  eigen,
  geometry,
  independence,
  inverseSkill,
  matmul,
  orthogonal,
  rankSkill,
  rrefSkill,
  systems,
  transforms,
  vectors,
  withNiceRref,
} from './linalg';
import { changeOfBasis, cramer, lu, planes, projections, singularValues } from './linalg-deeper';

type Gen = (r: Rng) => Problem;

const cross = (u: Q[], v: Q[]) => [u[1].mul(v[2]).sub(u[2].mul(v[1])), u[2].mul(v[0]).sub(u[0].mul(v[2])), u[0].mul(v[1]).sub(u[1].mul(v[0]))];
const qv = (xs: number[]) => xs.map((x) => new Q(x));
const choice = (options: string[], correct: number): Problem['answer'] => ({ kind: 'choice', options, correct });
const yesNo = (yes: boolean) => choice(['Yes', 'No'], yes ? 0 : 1);
const direction = (v: Q[]): Problem['answer'] => ({ kind: 'direction', expected: v.map((x) => x.toString()) });
/** √x for a non-negative rational, exact when it is a perfect square. */
function sqrtAns(x: Q): Problem['answer'] {
  const [sn, sd] = [Math.sqrt(x.n), Math.sqrt(x.d)];
  if (Number.isInteger(sn) && Number.isInteger(sd)) return num(new Q(sn, sd));
  return num(`sqrt(${x})`, sqrtTex(x));
}
/** √(p/q) simplified to (k/q)√m, e.g. √24 = 2√6 and √(5/2) = √10/2. */
const sqrtTex = (x: Q) => {
  let m = x.n * x.d;
  let k = 1;
  for (let f = 2; f * f <= m; f++) while (m % (f * f) === 0) [m, k] = [m / (f * f), k * f];
  const c = new Q(k, x.d);
  if (m === 1) return c.tex();
  const root = `\\sqrt{${m}}`;
  if (c.d === 1) return `${c.n === 1 ? '' : c.n}${root}`;
  return `\\frac{${c.n === 1 ? '' : c.n}${root}}{${c.d}}`;
};
const P = (x: Q | number) => (Q.of(x).n < 0 ? `(${Q.of(x).tex()})` : Q.of(x).tex());
const listAns = (xs: Q[]): Problem['answer'] => ({ kind: 'list', expected: xs.map((x) => x.toString()) });
const VARS = ['x', 'y', 'z', 'w'];
const eqTex = (row: Q[], b: Q, vars = VARS) => `${sum(row.map((c, j) => t(c, vars[j]))).tex} &= ${b.tex()}`;
const systemTex = (a: Mat, b: Q[], vars = VARS) => `$$\\begin{aligned} ${a.map((row, i) => eqTex(row, b[i], vars)).join(' \\\\ ')} \\end{aligned}$$`;
const augTex = (a: Mat, b: Q[]) =>
  `$$\\left[\\begin{array}{${'r'.repeat(a[0].length)}|r} ${a.map((row, i) => [...row, b[i]].map((x) => x.tex()).join(' & ')).join(' \\\\ ')} \\end{array}\\right]$$`;

/** Vectors with integer length: entries then length. */
const PYTH: number[][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [1, 2, 2, 3],
  [2, 3, 6, 7],
  [1, 4, 8, 9],
  [4, 4, 7, 9],
  [2, 6, 9, 11],
  [6, 6, 7, 11],
];
function pythVec(r: Rng) {
  const p = r.pick(PYTH);
  const L = p[p.length - 1];
  const v = r.shuffle(p.slice(0, -1).map((x) => x * r.sign()));
  return { v: qv(v), L };
}

// ---------------------------------------------------------------------------
// Vectors

const solveCombo: Gen = (r) => {
  let u: Q[], v: Q[];
  do [u, v] = [randVec(r, 2, -4, 4), randVec(r, 2, -4, 4)];
  while (u[0].mul(v[1]).sub(u[1].mul(v[0])).isZero());
  const [a, b] = [r.nz(-4, 4), r.nz(-4, 4)];
  const w = u.map((x, i) => x.mul(a).add(v[i].mul(b)));
  return {
    prompt: `Find scalars $a$ and $b$ with $a${vecTex(u)} + b${vecTex(v)} = ${vecTex(w)}$. Enter $(a, b)$ as a column.`,
    answer: vecAns(qv([a, b])),
    solution: [`Entry by entry this is a system: $${u[0].tex()}a ${signed(v[0])}b = ${w[0].tex()}$ and $${u[1].tex()}a ${signed(v[1])}b = ${w[1].tex()}$.`, `Solving: $a = ${a}$, $b = ${b}$.`],
  };
};

const unitVector: Gen = (r) => {
  const { v, L } = pythVec(r);
  return {
    prompt: `Find the unit vector in the direction of $\\mathbf{v} = ${vecTex(v)}$.`,
    answer: vecAns(v.map((x) => x.div(L))),
    solution: [`$\\|\\mathbf{v}\\| = \\sqrt{${v.map((x) => `${P(x)}^2`).join(' + ')}} = ${L}$.`, `Divide by the length: $\\frac{1}{${L}}\\mathbf{v} = ${vecTex(v.map((x) => x.div(L)))}$`],
  };
};

const orthogonalK: Gen = (r) => {
  const [a, b, c, d] = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
  const e = r.nz(-4, 4);
  const k = new Q(-(a * c + b * d), e);
  return {
    prompt: `For which $k$ are $\\mathbf{u} = \\begin{bmatrix} ${a} \\\\ ${b} \\\\ k \\end{bmatrix}$ and $\\mathbf{v} = ${vecTex([c, d, e])}$ orthogonal?`,
    answer: num(k),
    solution: [`Orthogonal means $\\mathbf{u}\\cdot\\mathbf{v} = 0$: $${a}\\cdot${P(c)} + ${P(b)}\\cdot${P(d)} + ${P(e)}k = 0$.`, `$${a * c + b * d} ${signed(e)}k = 0$, so $k = ${k.tex()}$.`],
  };
};

const dotAlgebra: Gen = (r) => {
  const [p, q] = [r.int(1, 5), r.int(1, 5)];
  const s = r.int(-p * q + 1, p * q - 1);
  const [al, be, ga, de] = [r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3)];
  const val = al * ga * p * p + (al * de + be * ga) * s + be * de * q * q;
  const lin2 = (x: number, y: number) => `${coef(x)}\\mathbf{u} ${y < 0 ? '-' : '+'} ${Math.abs(y) === 1 ? '' : Math.abs(y)}\\mathbf{v}`;
  return {
    prompt: `$\\|\\mathbf{u}\\| = ${p}$, $\\|\\mathbf{v}\\| = ${q}$ and $\\mathbf{u}\\cdot\\mathbf{v} = ${s}$. Find $(${lin2(al, be)})\\cdot(${lin2(ga, de)})$.`,
    answer: num(new Q(val)),
    hint: 'Expand like a product of brackets; $\\mathbf{u}\\cdot\\mathbf{u} = \\|\\mathbf{u}\\|^2$.',
    solution: [
      `Expand: $${al * ga}\\,\\mathbf{u}\\cdot\\mathbf{u} + ${al * de + be * ga}\\,\\mathbf{u}\\cdot\\mathbf{v} + ${be * de}\\,\\mathbf{v}\\cdot\\mathbf{v}$ (the dot product is symmetric).`,
      `$= ${al * ga}\\cdot ${p * p} + ${P(al * de + be * ga)}\\cdot ${P(s)} + ${P(be * de)}\\cdot ${q * q} = ${val}$`,
    ],
  };
};

const crossArea: Gen = (r) => {
  let u: Q[], v: Q[], w: Q[];
  do {
    [u, v] = [randVec(r, 3, -4, 4), randVec(r, 3, -4, 4)];
    w = cross(u, v);
  } while (isZeroVec(w));
  const N = dot(w, w);
  const tri = r.next() < 0.4;
  return {
    prompt: `Find the area of the ${tri ? 'triangle with two sides' : 'parallelogram spanned by'} $\\mathbf{u} = ${vecTex(u)}$ and $\\mathbf{v} = ${vecTex(v)}$${tri ? ' (from a common vertex)' : ''}.`,
    answer: tri ? sqrtAns(N.div(4)) : sqrtAns(N),
    inputHint: 'sqrt(…) is fine.',
    solution: [`$\\mathbf{u}\\times\\mathbf{v} = ${vecTex(w)}$, and the parallelogram's area is its length $\\sqrt{${N.tex()}}$.`, tri ? `The triangle is half of it: $\\frac12\\sqrt{${N.tex()}} = ${sqrtTex(N.div(4))}$` : `Area $= ${sqrtTex(N)}$`],
  };
};

const crossRules: Gen = (r) => {
  const w = randVec(r, 3, -4, 4);
  const [a, b] = [r.nz(-3, 3), r.nz(-3, 3)];
  const swap = r.next() < 0.5;
  const res = w.map((x) => x.mul(a * b * (swap ? -1 : 1)));
  const lhs = swap ? `(${coef(b)}\\mathbf{v})\\times(${coef(a)}\\mathbf{u})` : `(${coef(a)}\\mathbf{u})\\times(${coef(b)}\\mathbf{v})`;
  return {
    prompt: `$\\mathbf{u}\\times\\mathbf{v} = ${vecTex(w)}$. Find $${lhs}$.`,
    answer: vecAns(res),
    solution: [`Scalars pull out of each factor${swap ? ', and swapping the factors flips the sign: $\\mathbf{v}\\times\\mathbf{u} = -\\mathbf{u}\\times\\mathbf{v}$' : ''}.`, `$${a * b * (swap ? -1 : 1)}${vecTex(w)} = ${vecTex(res)}$`],
  };
};

const vectorsDeep: Skill = {
  ...vectors,
  levels: [
    { name: 'linear combinations', generate: mix(vectors.levels[0].generate, solveCombo, unitVector) },
    { name: 'dot product', generate: mix(vectors.levels[1].generate, orthogonalK, dotAlgebra) },
    { name: 'cross product', generate: mix(vectors.levels[2].generate, crossArea, crossRules) },
  ],
};

const distancePoints: Gen = (r) => {
  const [p, q] = [randVec(r, 3, -5, 5), randVec(r, 3, -5, 5)];
  const d = p.map((x, i) => q[i].sub(x));
  const N = dot(d, d);
  return {
    prompt: `Find the distance between the points $(${p.map((x) => x.tex()).join(', ')})$ and $(${q.map((x) => x.tex()).join(', ')})$.`,
    answer: sqrtAns(N),
    inputHint: 'sqrt(…) is fine.',
    solution: [`The difference vector is $${vecTex(d)}$; its length is the distance.`, `$\\sqrt{${d.map((x) => `${P(x)}^2`).join(' + ')}} = ${sqrtTex(N)}$`],
  };
};

const lengthK: Gen = (r) => {
  const p = r.pick(PYTH.filter((x) => x.length === 4));
  const i = r.int(0, 2);
  const others = p.slice(0, 3).filter((_, j) => j !== i).map((x) => x * r.sign());
  const L = p[3];
  return {
    prompt: `For which $k > 0$ does $\\mathbf{v} = \\begin{bmatrix} ${[...others.slice(0, i), 'k', ...others.slice(i)].join(' \\\\ ')} \\end{bmatrix}$ have length ${L}?`,
    answer: num(new Q(p[i])),
    solution: [`$\\|\\mathbf{v}\\|^2 = k^2 + ${others.map((x) => x * x).join(' + ')} = ${L * L}$.`, `$k^2 = ${p[i] ** 2}$, so $k = ${p[i]}$.`],
  };
};

/** Pairs of vectors with a known angle in degrees. */
const ANGLES: { u: number[]; v: number[]; deg: number }[] = [
  { u: [1, 0, 0], v: [1, 1, 0], deg: 45 },
  { u: [1, 1, 0], v: [0, 1, 1], deg: 60 },
  { u: [1, 2, 3], v: [3, 0, -1], deg: 90 },
  { u: [1, 1, 0], v: [0, -1, -1], deg: 120 },
  { u: [1, 0, 0], v: [-1, 1, 0], deg: 135 },
  { u: [1, -1, 2], v: [-2, 2, -4], deg: 180 },
];

const angleDegrees: Gen = (r) => {
  const a = r.pick(ANGLES);
  const perm = r.shuffle([0, 1, 2]);
  const [s1, s2] = [r.int(1, 3), r.int(1, 3)];
  const u = qv(perm.map((i) => a.u[i] * s1));
  const v = qv(perm.map((i) => a.v[i] * s2));
  const cosT = dot(u, v).value() / Math.sqrt(dot(u, u).value() * dot(v, v).value());
  return {
    prompt: `Find the angle (in degrees) between $\\mathbf{u} = ${vecTex(u)}$ and $\\mathbf{v} = ${vecTex(v)}$.`,
    answer: num(new Q(a.deg)),
    solution: [`$\\cos\\theta = \\dfrac{\\mathbf{u}\\cdot\\mathbf{v}}{\\|\\mathbf{u}\\|\\|\\mathbf{v}\\|} = \\dfrac{${dot(u, v).tex()}}{\\sqrt{${dot(u, u).tex()}}\\sqrt{${dot(v, v).tex()}}} = ${cosT.toFixed(4).replace(/\.?0+$/, '')}$.`, `$\\theta = ${a.deg}^\\circ$`],
    selfCheck: () => near(Math.acos(Math.max(-1, Math.min(1, cosT))) * (180 / Math.PI), a.deg),
  };
};
const near = (x: number, y: number) => Math.abs(x - y) < 1e-6 * Math.max(1, Math.abs(y));

const angleToDot: Gen = (r) => {
  const [a, b] = [r.int(1, 6), r.int(1, 6)];
  const ang = r.pick([
    { d: 0, c: new Q(1) },
    { d: 60, c: new Q(1, 2) },
    { d: 90, c: new Q(0) },
    { d: 120, c: new Q(-1, 2) },
    { d: 180, c: new Q(-1) },
  ]);
  const ans = ang.c.mul(a * b);
  return {
    prompt: `$\\|\\mathbf{u}\\| = ${a}$, $\\|\\mathbf{v}\\| = ${b}$ and the angle between them is $${ang.d}^\\circ$. Find $\\mathbf{u}\\cdot\\mathbf{v}$.`,
    answer: num(ans),
    solution: [`$\\mathbf{u}\\cdot\\mathbf{v} = \\|\\mathbf{u}\\|\\|\\mathbf{v}\\|\\cos\\theta = ${a}\\cdot ${b}\\cdot ${ang.c.tex()} = ${ans.tex()}$`],
  };
};

const pointLineDistance: Gen = (r) => {
  let p: Q[], v: Q[];
  do [p, v] = [randVec(r, 3, -4, 4), randVec(r, 3, -3, 3)];
  while (isZeroVec(v) || isZeroVec(cross(p, v)));
  const D2 = dot(p, p).sub(dot(p, v).mul(dot(p, v)).div(dot(v, v)));
  return {
    prompt: `Find the distance from the point $(${p.map((x) => x.tex()).join(', ')})$ to the line through the origin in the direction $${vecTex(v)}$.`,
    answer: sqrtAns(D2),
    inputHint: 'sqrt(…) is fine.',
    solution: [
      `Subtract the projection: the distance is $\\left\\|\\mathbf{p} - \\frac{\\mathbf{p}\\cdot\\mathbf{v}}{\\mathbf{v}\\cdot\\mathbf{v}}\\mathbf{v}\\right\\|$, and by Pythagoras its square is $\\|\\mathbf{p}\\|^2 - \\frac{(\\mathbf{p}\\cdot\\mathbf{v})^2}{\\mathbf{v}\\cdot\\mathbf{v}}$.`,
      `$${dot(p, p).tex()} - \\frac{${dot(p, v).mul(dot(p, v)).tex()}}{${dot(v, v).tex()}} = ${D2.tex()}$, so the distance is $${sqrtTex(D2)}$.`,
    ],
  };
};

const scalarComponent: Gen = (r) => {
  const { v, L } = pythVec(r);
  const u = randVec(r, v.length, -5, 5);
  const c = dot(u, v).div(L);
  return {
    prompt: `Find the scalar component of $\\mathbf{u} = ${vecTex(u)}$ along $\\mathbf{v} = ${vecTex(v)}$ (the signed length of the projection).`,
    answer: num(c),
    solution: [`$\\text{comp}_{\\mathbf{v}}\\mathbf{u} = \\dfrac{\\mathbf{u}\\cdot\\mathbf{v}}{\\|\\mathbf{v}\\|} = \\dfrac{${dot(u, v).tex()}}{${L}} = ${c.tex()}$`],
  };
};

const geometryDeep: Skill = {
  ...geometry,
  levels: [
    { name: 'length and distance', generate: mix(geometry.levels[0].generate, distancePoints, lengthK) },
    { name: 'angles', generate: mix(geometry.levels[1].generate, angleDegrees, angleToDot) },
    { name: 'projections and distances', generate: mix(geometry.levels[2].generate, pointLineDistance, scalarComponent) },
  ],
};

// ---------------------------------------------------------------------------
// Systems

const wordProblem: Gen = (r) => {
  if (r.next() < 0.5) {
    const [pa, pc] = distinct(r, 2, 4, 15).sort((a, b) => b - a);
    const [na, nc] = [r.int(10, 60), r.int(10, 60)];
    return {
      prompt: `A theatre sold ${na + nc} tickets for €${na * pa + nc * pc}. Adult tickets cost €${pa} and child tickets €${pc}. How many of each were sold? Enter (adults, children) as a column.`,
      answer: vecAns(qv([na, nc])),
      solution: [`$a + c = ${na + nc}$ and $${pa}a + ${pc}c = ${na * pa + nc * pc}$.`, `Subtract $${pc}$ times the first: $${pa - pc}a = ${na * pa + nc * pc - pc * (na + nc)}$, so $a = ${na}$ and $c = ${nc}$.`],
    };
  }
  const [pA, pB] = distinct(r, 2, 8, 30).sort((a, b) => a - b);
  const [x, y] = [r.int(2, 20), r.int(2, 20)];
  return {
    prompt: `A shop mixes coffee costing €${pA}/kg with coffee costing €${pB}/kg to make ${x + y} kg of a blend worth €${pA * x + pB * y} in total. How many kg of each go in? Enter (cheaper, dearer) as a column.`,
    answer: vecAns(qv([x, y])),
    solution: [`$x + y = ${x + y}$ and $${pA}x + ${pB}y = ${pA * x + pB * y}$.`, `$${pB - pA}y = ${pA * x + pB * y - pA * (x + y)}$, so $y = ${y}$ and $x = ${x}$.`],
  };
};

const interpolation: Gen = (r) => {
  const [a, b, c] = [r.nz(-3, 3), r.int(-5, 5), r.int(-6, 6)];
  const xs = distinct(r, 3, -3, 3).sort((p, q) => p - q);
  const pts = xs.map((x) => [x, a * x * x + b * x + c]);
  return {
    prompt: `Find the parabola $y = ax^{2} + bx + c$ through ${pts.map(([x, y]) => `$(${x}, ${y})$`).join(', ')}. Enter $(a, b, c)$ as a column.`,
    answer: vecAns(qv([a, b, c])),
    solution: [`Each point gives a linear equation in $a, b, c$: ${pts.map(([x, y]) => `$${x * x}a ${signed(x)}b + c = ${y}$`).join(', ')}.`, `Solving the $3\\times3$ system: $a = ${a}$, $b = ${b}$, $c = ${c}$.`],
  };
};

/** Two-equation system with a parameter: singular at k = pq. */
const parameterSystem: Gen = (r) => {
  const [p, q, m] = [r.nz(-3, 3), r.nz(-3, 3), r.int(-5, 5)];
  const infinite = r.next() < 0.5;
  const n = infinite ? q * m : q * m + r.nz(-4, 4);
  return {
    prompt: `For which $k$ does the system $$\\begin{aligned} x ${signed(p)}y &= ${m} \\\\ ${coef(q)}x + ky &= ${n} \\end{aligned}$$ have ${infinite ? 'infinitely many solutions' : 'no solution'}?`,
    answer: num(new Q(p * q)),
    solution: [
      `Subtract $${q}$ times the first equation from the second: $(k ${signed(-p * q)})y = ${n - q * m}$.`,
      infinite
        ? `With $k = ${p * q}$ this reads $0 = 0$: one free variable, infinitely many solutions.`
        : `With $k = ${p * q}$ it reads $0 = ${n - q * m}$: inconsistent. Any other $k$ gives a unique solution.`,
    ],
  };
};

const systemsDeep: Skill = {
  ...systems,
  levels: [
    { name: '2 equations', generate: mix(systems.levels[0].generate, wordProblem) },
    { name: '3 equations', generate: mix(systems.levels[1].generate, interpolation) },
    { name: 'when is there no unique solution?', generate: mix(systems.levels[2].generate, parameterSystem) },
  ],
};

const SOLUTION_COUNTS = ['No solution', 'Exactly one solution', 'Infinitely many solutions'];

const solutions: Skill = {
  id: 'la.solutions',
  name: 'Solution sets',
  prereqs: ['la.rref'],
  levels: [
    {
      name: 'how many solutions?',
      generate: mix(
        (r) => {
          const kind = r.int(0, 2);
          const a = mat([
            [r.nz(-3, 3), r.int(-4, 4), r.int(-4, 4)],
            [0, kind === 1 ? r.nz(-3, 3) : r.pick([0, r.nz(-3, 3)]), r.int(-4, 4)],
            [0, 0, kind === 1 ? r.nz(-3, 3) : 0],
          ]);
          if (kind !== 1 && a[1][1].isZero() && a[1][2].isZero()) a[1][2] = new Q(r.nz(-3, 3));
          const b = qv([r.int(-5, 5), r.int(-5, 5), kind === 0 ? r.nz(-5, 5) : kind === 1 ? r.int(-5, 5) : 0]);
          const correct = kind === 0 ? 0 : kind === 1 ? 1 : 2;
          return {
            prompt: `A system has been row reduced to this augmented matrix: ${augTex(a, b)} How many solutions does it have?`,
            answer: choice(SOLUTION_COUNTS, correct),
            solution: [
              kind === 0
                ? `The last row says $0 = ${b[2].tex()}$: inconsistent.`
                : kind === 1
                  ? 'Every column of the coefficient part has a pivot and no row says $0 = $ (non-zero): exactly one solution.'
                  : 'The last row is all zeros, so the system is consistent, but only two of the three columns have pivots: one free variable, infinitely many solutions.',
            ],
          };
        },
        (r) => {
          let r1: Q[], r2: Q[];
          do [r1, r2] = [randVec(r, 3, -3, 3), randVec(r, 3, -3, 3)];
          while (isZeroVec(cross(r1, r2)));
          const [al, be] = [r.nz(-2, 2), r.nz(-2, 2)];
          const [b1, b2] = [r.int(-5, 5), r.int(-5, 5)];
          const consistent = r.next() < 0.5;
          const r3 = r1.map((x, i) => x.mul(al).add(r2[i].mul(be)));
          const b3 = al * b1 + be * b2 + (consistent ? 0 : r.nz(-3, 3));
          const rows = r.shuffle([
            [r1, b1],
            [r2, b2],
            [r3, b3],
          ] as [Q[], number][]);
          return {
            prompt: `How many solutions does this system have? ${systemTex(rows.map((x) => x[0]), rows.map((x) => new Q(x[1])))}`,
            answer: choice(SOLUTION_COUNTS, consistent ? 2 : 0),
            hint: 'Is one equation a combination of the other two?',
            solution: [
              `The left side of one equation is $${al}$ times another plus $${be}$ times the third, so the coefficient matrix has rank 2.`,
              consistent ? 'The right sides combine the same way, so that equation is redundant: one free variable, infinitely many solutions.' : 'But the right sides do not combine the same way: row reduction produces $0 = $ (non-zero). No solution.',
            ],
          };
        },
      ),
    },
    {
      name: 'parametric form',
      generate(r) {
        let g: ReturnType<typeof withNiceRref>;
        do g = withNiceRref(r, 3, 4, 2);
        while (g.pivots.includes(3));
        const A = g.a.map((row) => row.slice(0, 3));
        const b = g.a.map((row) => row[3]);
        const free = [0, 1, 2].find((c) => !g.pivots.includes(c))!;
        const part = [new Q(0), new Q(0), new Q(0)];
        g.pivots.forEach((pc, i) => (part[pc] = g.R[i][3]));
        const dir = nullspace(A)[0];
        const askDir = r.next() < 0.5;
        return {
          prompt: `The solutions of this system form a line. ${systemTex(A, b)} ${askDir ? 'Find a direction vector of that line.' : `Find the solution with $${VARS[free]} = 0$.`}`,
          answer: askDir ? direction(dir) : vecAns(part),
          inputHint: askDir ? 'Any non-zero multiple works.' : 'Enter (x, y, z) as a column.',
          solution: [
            `Row reduce the augmented matrix: ${augTex(g.R.map((row) => row.slice(0, 3)), g.R.map((row) => row[3]))}`,
            `$${VARS[free]}$ is free. Setting $${VARS[free]} = t$ gives $\\mathbf{x} = ${vecTex(part)} + t${vecTex(dir)}$ (up to scaling of the direction).`,
            askDir ? `Direction: $${vecTex(dir)}$, which spans the null space of the coefficient matrix.` : `With $t = 0$: $${vecTex(part)}$.`,
          ],
          selfCheck: () => matVec(A, part).every((x, i) => x.eq(b[i])) && matVec(A, dir).every((x) => x.isZero()),
        };
      },
    },
    {
      name: 'parameters',
      generate(r) {
        let r1: Q[], r2: Q[];
        do [r1, r2] = [randVec(r, 3, -3, 3), randVec(r, 3, -3, 3)];
        while (r1[0].mul(r2[1]).sub(r1[1].mul(r2[0])).isZero());
        const [al, be] = [r.nz(-2, 2), r.nz(-2, 2)];
        const [b1, b2] = [r.int(-4, 4), r.int(-4, 4)];
        const k0 = r1[2].mul(al).add(r2[2].mul(be));
        const m0 = al * b1 + be * b2;
        const infinite = r.next() < 0.5;
        const m = infinite ? m0 : m0 + r.nz(-3, 3);
        const r3 = [r1[0].mul(al).add(r2[0].mul(be)), r1[1].mul(al).add(r2[1].mul(be))];
        const row3 = `${sum([t(r3[0], 'x'), t(r3[1], 'y')]).tex} + kz &= ${m}`;
        return {
          prompt: `For which $k$ does this system have ${infinite ? 'infinitely many solutions' : 'no solution'}? $$\\begin{aligned} ${eqTex(r1, new Q(b1))} \\\\ ${eqTex(r2, new Q(b2))} \\\\ ${row3} \\end{aligned}$$`,
          answer: num(k0),
          solution: [
            `The first two coefficients of row 3 are $${al}$ times row 1 plus $${be}$ times row 2. Subtracting that combination leaves $(k ${signed(k0.neg())})z = ${m - m0}$.`,
            infinite ? `At $k = ${k0.tex()}$ this is $0 = 0$: infinitely many solutions.` : `At $k = ${k0.tex()}$ this is $0 = ${m - m0}$: no solution. Other $k$ give exactly one.`,
          ],
          selfCheck: () => {
            const A = [r1, r2, [...r3, k0]];
            return det(A).isZero() && rank(A) === 2;
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'Row reduce $[A\\,|\\,\\mathbf{b}]$. A row $[0\\ \\cdots\\ 0\\,|\\,c]$ with $c \\ne 0$ means no solution. Otherwise every non-pivot column is a free variable: none means exactly one solution, at least one means infinitely many. The solutions are $\\mathbf{x}_p + $ (null space of $A$): a particular solution plus every solution of $A\\mathbf{x} = \\mathbf{0}$, so with one free variable they form a line.',
    resources: [ila('parametric-form', 'Parametric Form'), ila('solution-sets', 'Solution Sets'), strang],
  },
};

// ---------------------------------------------------------------------------
// Matrices

const matVecProduct: Gen = (r) => {
  const A = randMat(r, r.int(2, 3), 3, -4, 4);
  const x = randVec(r, 3, -3, 3);
  const y = matVec(A, x);
  return {
    prompt: `Compute $A\\mathbf{x}$ for $A = ${matTex(A)}$ and $\\mathbf{x} = ${vecTex(x)}$.`,
    answer: vecAns(y),
    solution: [`$A\\mathbf{x}$ is the combination of the columns of $A$ with weights from $\\mathbf{x}$: $${x.map((c, j) => `${P(c)}${vecTex(A.map((row) => row[j]))}`).join(' + ')}$.`, `$= ${vecTex(y)}$`],
  };
};

const gramMatrix: Gen = (r) => {
  const A = randMat(r, 3, 2, -3, 3);
  const G = matMul(transpose(A), A);
  return {
    prompt: `Compute $A^{T}A$ for $A = ${matTex(A)}$.`,
    answer: matrixAns(G),
    solution: ['Entry $(i, j)$ of $A^TA$ is column $i$ of $A$ dotted with column $j$; the result is symmetric.', `$${matTex(G)}$`],
  };
};

const tripleEntry: Gen = (r) => {
  const [A, B, C] = [randMat(r, 2, 2, -3, 3), randMat(r, 2, 2, -3, 3), randMat(r, 2, 2, -3, 3)];
  const [i, j] = [r.int(0, 1), r.int(0, 1)];
  const v = matMul(matMul(A, B), C)[i][j];
  return {
    prompt: `$A = ${matTex(A)}$, $B = ${matTex(B)}$, $C = ${matTex(C)}$. Find the $(${i + 1}, ${j + 1})$ entry of $ABC$.`,
    answer: num(v),
    hint: 'You only need one row of $AB$.',
    solution: [`Row ${i + 1} of $AB$ is $(${matMul(A, B)[i].map((x) => x.tex()).join(', ')})$.`, `Dot it with column ${j + 1} of $C$: $${v.tex()}$`],
  };
};

const powerPattern: Gen = (r) => {
  const n = r.int(3, 8);
  const kind = r.int(0, 2);
  if (kind === 0) {
    const a = r.nz(-4, 4);
    return {
      prompt: `Compute $${matTex(mat([[1, a], [0, 1]]))}^{${n}}$.`,
      answer: matrixAns(mat([[1, n * a], [0, 1]])),
      solution: [`Each multiplication by this shear adds another $${a}$ to the top-right entry.`, `$${matTex(mat([[1, n * a], [0, 1]]))}$`],
    };
  }
  if (kind === 1) {
    const a = r.pick([2, -2, 3, -1]);
    const res = mat([
      [a ** n, n * a ** (n - 1)],
      [0, a ** n],
    ]);
    return {
      prompt: `Compute $${matTex(mat([[a, 1], [0, a]]))}^{${n}}$.`,
      answer: matrixAns(res),
      hint: `Write it as $${a}I + N$ with $N^2 = 0$.`,
      solution: [`$(${a}I + N)^{${n}} = ${a}^{${n}}I + ${n}\\cdot${P(a)}^{${n - 1}}N$ since $N^2 = 0$ and $I$ commutes with $N$.`, `$${matTex(res)}$`],
    };
  }
  const R = mat([
    [0, -1],
    [1, 0],
  ]);
  let M = identity(2);
  for (let i = 0; i < n; i++) M = matMul(M, R);
  return {
    prompt: `Compute $${matTex(R)}^{${n}}$.`,
    answer: matrixAns(M),
    solution: ['This is rotation by $90^\\circ$, so its powers repeat every 4.', `$${n} = 4\\cdot${Math.floor(n / 4)} + ${n % 4}$, so the answer is the ${['identity', 'matrix itself', 'rotation by $180^\\circ$', 'rotation by $270^\\circ$'][n % 4]}: $${matTex(M)}$`],
  };
};

const matmulDeep: Skill = {
  ...matmul,
  levels: [
    { name: '2×2 products and matrix–vector', generate: mix(matmul.levels[0].generate, matVecProduct) },
    { name: 'non-square shapes and AᵀA', generate: mix(matmul.levels[1].generate, gramMatrix, tripleEntry) },
    { name: '3×3 products and powers', generate: mix(matmul.levels[2].generate, powerPattern) },
  ],
};

const singularK: Gen = (r) => {
  const [r1, r2] = distinct(r, 2, -4, 4);
  // [[k, 1], [-r1 r2, k − (r1 + r2)]] has det k² − (r1 + r2)k + r1 r2
  const M = `\\begin{bmatrix} k & 1 \\\\ ${-r1 * r2} & k ${signed(-(r1 + r2))} \\end{bmatrix}`.replace('k + 0', 'k').replace('k - 0', 'k');
  return {
    prompt: `For which values of $k$ is $${M}$ not invertible?`,
    answer: listAns(qv([r1, r2])),
    inputHint: 'All values, comma-separated.',
    solution: [`Not invertible means $\\det = 0$: $k(k ${signed(-(r1 + r2))}) - (${-r1 * r2}) = k^2 ${signed(-(r1 + r2))}k ${signed(r1 * r2)}$.`, `$(k ${signed(-r1)})(k ${signed(-r2)}) = 0$, so $k = ${r1}$ or $k = ${r2}$.`],
  };
};

const inverseOfProduct: Gen = (r) => {
  const [Ai, Bi] = [unimodular(r, 2, 3, 3), unimodular(r, 2, 3, 3)];
  const ans = matMul(Bi, Ai);
  return {
    prompt: `$A^{-1} = ${matTex(Ai)}$ and $B^{-1} = ${matTex(Bi)}$. Find $(AB)^{-1}$.`,
    answer: matrixAns(ans),
    hint: 'Socks and shoes: the order reverses.',
    solution: ['$(AB)^{-1} = B^{-1}A^{-1}$ (undo the last thing done first).', `$${matTex(Bi)}${matTex(Ai)} = ${matTex(ans)}$`],
  };
};

const solveWithInverse: Gen = (r) => {
  const Ai = unimodular(r, 3, 4, 3);
  const b = randVec(r, 3, -3, 3);
  const x = matVec(Ai, b);
  return {
    prompt: `$A^{-1} = ${matTex(Ai)}$. Solve $A\\mathbf{x} = ${vecTex(b)}$.`,
    answer: vecAns(x),
    solution: ['Multiply both sides by $A^{-1}$: $\\mathbf{x} = A^{-1}\\mathbf{b}$.', `$${vecTex(x)}$`],
  };
};

const inverseDeep: Skill = {
  ...inverseSkill,
  levels: [
    { name: '2×2', generate: mix(inverseSkill.levels[0].generate, singularK) },
    { name: '3×3 and inverse rules', generate: mix(inverseSkill.levels[1].generate, inverseOfProduct, solveWithInverse) },
    inverseSkill.levels[2],
  ],
};

const fromFormula: Gen = (r) => {
  const rows = r.int(2, 3);
  const A = randMat(r, rows, 2, -4, 4);
  return {
    prompt: `Find the standard matrix of $T(x, y) = \\left(${A.map((row) => sum([t(row[0], 'x'), t(row[1], 'y')]).tex).join(',\\ ')}\\right)$.`,
    answer: matrixAns(A),
    solution: ['Column $j$ is $T(\\mathbf{e}_j)$: put $x = 1, y = 0$, then $x = 0, y = 1$.', `$${matTex(A)}$`],
  };
};

const isLinear: Gen = (r) => {
  const pool = [
    { tex: 'T(x, y) = (x + 1, y)', yes: false, why: '$T(0, 0) = (1, 0) \\ne (0, 0)$, but a linear map sends $\\mathbf{0}$ to $\\mathbf{0}$.' },
    { tex: 'T(x, y) = (2x - y, 3y)', yes: true, why: 'Each output is a linear combination of $x$ and $y$: it is a matrix times $(x, y)$.' },
    { tex: 'T(x, y) = (xy, x)', yes: false, why: '$T(2, 2) = (4, 2)$ but $2T(1, 1) = (2, 2)$: not homogeneous.' },
    { tex: 'T(x, y) = (|x|, y)', yes: false, why: '$T(-1, 0) = (1, 0) \\ne -T(1, 0)$.' },
    { tex: 'T(x, y) = (0, x)', yes: true, why: 'It is the matrix $\\begin{bmatrix} 0 & 0 \\\\ 1 & 0 \\end{bmatrix}$ times $(x, y)$.' },
    { tex: 'T(x, y) = (x^{2}, y)', yes: false, why: '$T(2, 0) = (4, 0) \\ne 2T(1, 0)$.' },
    { tex: 'T(x, y, z) = (x + y + z, z - x)', yes: true, why: 'Linear combinations of the inputs only.' },
    { tex: 'T(p) = p\' \\text{ (derivative of a polynomial)}', yes: true, why: '$(p + q)\' = p\' + q\'$ and $(cp)\' = cp\'$.' },
    { tex: 'T(A) = \\det A \\text{ on } 2\\times2 \\text{ matrices}', yes: false, why: '$\\det(2A) = 4\\det A$, not $2\\det A$.' },
    { tex: 'T(A) = A^{T} \\text{ on } 2\\times2 \\text{ matrices}', yes: true, why: '$(A + B)^T = A^T + B^T$ and $(cA)^T = cA^T$.' },
  ];
  const p = r.pick(pool);
  return { prompt: `Is $${p.tex}$ linear?`, answer: yesNo(p.yes), solution: [p.why, 'Linear means $T(\\mathbf{u} + \\mathbf{v}) = T(\\mathbf{u}) + T(\\mathbf{v})$ and $T(c\\mathbf{u}) = cT(\\mathbf{u})$.'] };
};

const kernelRange: Gen = (r) => {
  const rows = r.int(3, 4);
  const cols = r.int(3, 5);
  const rk = r.int(2, Math.min(rows, cols) - (rows === cols ? 1 : 0));
  const { a } = withNiceRref(r, rows, cols, rk);
  const ask = r.int(0, 2);
  const q = ask === 0 ? 'the dimension of the range (image)' : ask === 1 ? 'the dimension of the kernel' : '';
  if (ask === 2)
    return {
      prompt: `$T(\\mathbf{x}) = A\\mathbf{x}$ with $A = ${matTex(a)}$. Is $T$ one-to-one?`,
      answer: yesNo(rk === cols),
      solution: [`Row reduction finds rank $${rk}$.`, rk === cols ? 'Every column has a pivot, so the kernel is $\\{\\mathbf 0\\}$: one-to-one.' : `Only ${rk} of ${cols} columns have pivots, so the kernel is non-trivial: not one-to-one.`],
    };
  return {
    prompt: `$T: \\mathbb{R}^{${cols}} \\to \\mathbb{R}^{${rows}}$ is $T(\\mathbf{x}) = A\\mathbf{x}$ with $A = ${matTex(a)}$. Find ${q}.`,
    answer: num(new Q(ask === 0 ? rk : cols - rk)),
    solution: [`Row reduction finds ${rk} pivots, so $\\operatorname{rank} A = ${rk}$.`, ask === 0 ? `The range is the column space: dimension $${rk}$.` : `Rank–nullity: $\\dim\\ker T = ${cols} - ${rk} = ${cols - rk}$.`],
  };
};

const transformsDeep: Skill = {
  ...transforms,
  levels: [
    { name: 'standard matrices', generate: mix(transforms.levels[0].generate, fromFormula, isLinear) },
    transforms.levels[1],
    { name: 'from images of a basis; kernel and range', generate: mix(transforms.levels[2].generate, kernelRange) },
  ],
};

// ---------------------------------------------------------------------------
// Determinants

const detK: Gen = (r) => {
  const s = r.int(1, 5);
  const [p, q] = r.pick([
    [1, s * s],
    [s * s, 1],
    [s, s],
  ]);
  return {
    prompt: `For which $k$ is $\\det\\begin{bmatrix} k & ${p} \\\\ ${q} & k \\end{bmatrix} = 0$?`,
    answer: listAns(qv([s, -s])),
    inputHint: 'All values, comma-separated.',
    solution: [`$\\det = k^2 - ${p * q}$.`, `$k = \\pm ${s}$`],
  };
};

const triangularDet: Gen = (r) => {
  if (r.next() < 0.5) {
    const d = Array.from({ length: 4 }, () => r.nz(-3, 3));
    const A = mat(d.map((x, i) => d.map((_, j) => (i === j ? x : j > i ? r.int(-5, 5) : 0))));
    const lower = r.next() < 0.5;
    const M = lower ? transpose(A) : A;
    const v = d.reduce((a, b) => a * b, 1);
    return {
      prompt: `Compute $\\det ${matTex(M)}$.`,
      answer: num(new Q(v)),
      hint: 'Look at the zeros.',
      solution: [`The matrix is ${lower ? 'lower' : 'upper'} triangular, so the determinant is the product of the diagonal.`, `$${d.map(P).join('\\cdot')} = ${v}$`],
    };
  }
  const [A, B, C] = [randMat(r, 2, 2, -4, 4), randMat(r, 2, 2, -4, 4), randMat(r, 2, 2, -3, 3)];
  // [[A, 0], [C, B]]
  const M = [...A.map((row) => [...row, new Q(0), new Q(0)]), ...C.map((row, k) => [...row, ...B[k]])];
  const v = det(A).mul(det(B));
  return {
    prompt: `Compute $\\det ${matTex(M)}$.`,
    answer: num(v),
    hint: 'The top-right block is zero.',
    solution: ['Block lower triangular: $\\det\\begin{bmatrix} A & 0 \\\\ C & B \\end{bmatrix} = \\det A\\,\\det B$.', `$${det(A).tex()}\\cdot ${P(det(B))} = ${v.tex()}$`],
    selfCheck: () => det(M).eq(v),
  };
};
const determinantDeep: Skill = {
  ...determinant,
  levels: [
    { name: '2×2', generate: mix(determinant.levels[0].generate, detK) },
    { name: '3×3 and triangular', generate: mix(determinant.levels[1].generate, triangularDet) },
    determinant.levels[2],
  ],
};

// ---------------------------------------------------------------------------
// Spaces

const dependentK: Gen = (r) => {
  for (;;) {
    const M = randMat(r, 3, 3, -3, 3);
    const [ri, ci] = [r.int(0, 2), r.int(0, 2)];
    M[ri][ci] = new Q(0);
    const d0 = det(M);
    M[ri][ci] = new Q(1);
    const slope = det(M).sub(d0);
    if (slope.isZero() || d0.isZero()) continue;
    const k = d0.neg().div(slope);
    if (Math.abs(k.value()) > 12) continue;
    const cols = [0, 1, 2].map((j) => `\\begin{bmatrix} ${[0, 1, 2].map((i2) => (i2 === ri && j === ci ? 'k' : M[i2][j].tex())).join(' \\\\ ')} \\end{bmatrix}`);
    return {
      prompt: `For which $k$ are $${cols.join(',\\ ')}$ linearly dependent?`,
      answer: num(k),
      solution: ['Three vectors in $\\mathbb{R}^3$ are dependent exactly when the matrix with them as columns has determinant $0$.', `The determinant is linear in $k$: $${slope.tex()}k ${signed(d0)} = 0$, so $k = ${k.tex()}$.`],
    };
  }
};

const independenceDeep: Skill = {
  ...independence,
  levels: [{ name: 'independent or not?', generate: mix(independence.levels[0].generate, dependentK) }, independence.levels[1], independence.levels[2]],
};

const SUBSPACE_POOL: { tex: string; yes: boolean; why: string }[] = [
  { tex: '\\{(x, y, z) : x + 2y - z = 0\\} \\subseteq \\mathbb{R}^3', yes: true, why: 'A plane through the origin: the solution set of a homogeneous equation is always a subspace.' },
  { tex: '\\{(x, y, z) : x + 2y - z = 3\\} \\subseteq \\mathbb{R}^3', yes: false, why: 'It does not contain $\\mathbf{0}$.' },
  { tex: '\\{(t, 2t, -t) : t \\in \\mathbb{R}\\}', yes: true, why: 'A line through the origin: the span of $(1, 2, -1)$.' },
  { tex: '\\{(x, y, z) : x \\ge 0\\}', yes: false, why: 'Not closed under scalar multiplication: $(1, 0, 0)$ is in it, $-1\\cdot(1, 0, 0)$ is not.' },
  { tex: '\\{(x, y) : xy = 0\\} \\subseteq \\mathbb{R}^2', yes: false, why: 'The two axes: $(1, 0) + (0, 1) = (1, 1)$ is not in it, so it is not closed under addition.' },
  { tex: '\\{(x, y, z) : z = x^{2}\\}', yes: false, why: '$(1, 0, 1)$ is in it but $2(1, 0, 1) = (2, 0, 2)$ is not.' },
  { tex: '\\{(x, y) : x^{2} + y^{2} \\le 1\\}', yes: false, why: 'The disk is not closed under scaling: $(1, 0)$ is in it, $(2, 0)$ is not.' },
  { tex: '\\{2\\times2 \\text{ matrices with trace } 0\\}', yes: true, why: 'Trace is linear, so this is the kernel of a linear map.' },
  { tex: '\\{\\text{invertible } 2\\times2 \\text{ matrices}\\}', yes: false, why: 'It does not contain the zero matrix (and $I + (-I) = 0$ is not invertible).' },
  { tex: '\\{p \\in \\mathcal{P}_2 : p(1) = 0\\}', yes: true, why: '$(p + q)(1) = p(1) + q(1) = 0$ and $(cp)(1) = 0$: closed under both operations.' },
  { tex: '\\{p \\in \\mathcal{P}_2 : p(0) = 1\\}', yes: false, why: 'The zero polynomial has $p(0) = 0$, so it is not in the set.' },
  { tex: '\\{\\text{symmetric } 3\\times3 \\text{ matrices}\\}', yes: true, why: '$(A + B)^T = A + B$ and $(cA)^T = cA$ when $A$, $B$ are symmetric.' },
  { tex: '\\{(x, y, z) : x = y = z\\}', yes: true, why: 'The line spanned by $(1, 1, 1)$.' },
  { tex: '\\{(x, y) : y = 2x + 1\\}', yes: false, why: 'A line that misses the origin.' },
];

const subspaces: Skill = {
  id: 'la.subspaces',
  name: 'Subspaces and dimension',
  prereqs: ['la.rank'],
  levels: [
    {
      name: 'is it a subspace?',
      generate(r) {
        const p = r.pick(SUBSPACE_POOL);
        return {
          prompt: `Is $${p.tex}$ a subspace (of the obvious vector space)?`,
          answer: yesNo(p.yes),
          solution: [p.why, 'A subspace must contain $\\mathbf{0}$ and be closed under addition and scalar multiplication.'],
        };
      },
    },
    {
      name: 'pivot columns and dimension',
      generate: mix(
        (r) => {
          const cols = r.int(4, 5);
          const rk = r.int(2, 3);
          const { a, pivots } = withNiceRref(r, 3, cols, rk);
          return {
            prompt: `Which columns of $A = ${matTex(a)}$ are pivot columns? (They form a basis of the column space.)`,
            answer: { kind: 'set', expected: pivots.map((p) => `${p + 1}`) },
            inputHint: 'Column numbers, like {1, 3}.',
            solution: [`Row reduce: the pivots sit in column${rk > 1 ? 's' : ''} ${pivots.map((p) => p + 1).join(', ')}.`, 'The matching columns of the original $A$ (not of the reduced matrix) are a basis of $\\operatorname{Col} A$.'],
          };
        },
        (r) => {
          const n = r.int(3, 5);
          const rk = r.int(1, 3);
          const { a } = withNiceRref(r, n, 3, rk);
          const vs = a.map((row) => `\\begin{bmatrix} ${row.map((x) => x.tex()).join(' \\\\ ')} \\end{bmatrix}`);
          return {
            prompt: `What is the dimension of $\\operatorname{span}\\left\\{${vs.join(', ')}\\right\\}$?`,
            answer: num(new Q(rk)),
            solution: ['Put the vectors in as rows (or columns) and row reduce: the dimension of the span is the rank.', `Rank $= ${rk}$`],
          };
        },
      ),
    },
    {
      name: 'rank–nullity reasoning',
      generate(r) {
        const m = r.int(2, 6);
        const n = r.int(2, 7);
        const rk = r.int(1, Math.min(m, n));
        const kind = r.int(0, 5);
        const shape = `$A$ is ${m}×${n} with rank ${rk}.`;
        if (kind === 0) return { prompt: `${shape} What is $\\dim\\operatorname{Nul} A$?`, answer: num(new Q(n - rk)), solution: [`Rank–nullity: rank + nullity = number of columns, so $${n} - ${rk} = ${n - rk}$.`] };
        if (kind === 1) return { prompt: `${shape} What is $\\dim\\operatorname{Nul} A^{T}$?`, answer: num(new Q(m - rk)), solution: [`$A^T$ is ${n}×${m} with the same rank, so its null space has dimension $${m} - ${rk} = ${m - rk}$.`] };
        if (kind === 2) return { prompt: `${shape} What is the dimension of its row space?`, answer: num(new Q(rk)), solution: ['Row rank equals column rank: the row space has dimension $' + rk + '$.'] };
        if (kind === 3)
          return {
            prompt: `${shape} Does $A\\mathbf{x} = \\mathbf{b}$ have a solution for every $\\mathbf{b} \\in \\mathbb{R}^{${m}}$?`,
            answer: yesNo(rk === m),
            solution: [rk === m ? `The column space has dimension ${m}, so it is all of $\\mathbb{R}^{${m}}$.` : `The column space has dimension ${rk} < ${m}, so some $\\mathbf{b}$ are missed.`],
          };
        if (kind === 4) {
          const free = n - rk;
          return {
            prompt: `$A$ is ${m}×${n} and $A\\mathbf{x} = \\mathbf{0}$ has ${free} free variable${free === 1 ? '' : 's'}. What is the rank of $A$?`,
            answer: num(new Q(rk)),
            solution: [`Each column is either a pivot column or a free variable: $${n} - ${free} = ${rk}$.`],
          };
        }
        const [mm, nn] = [r.int(2, 4), r.int(2, 6)];
        return {
          prompt: `Can a ${mm}×${nn} matrix have linearly independent columns?`,
          answer: yesNo(nn <= mm),
          solution: [nn <= mm ? `Yes: ${nn} vectors in $\\mathbb{R}^{${mm}}$ can be independent (e.g. columns of the identity).` : `No: ${nn} vectors in $\\mathbb{R}^{${mm}}$ are always dependent since ${nn} > ${mm}.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'A subspace contains $\\mathbf{0}$ and is closed under addition and scaling: lines and planes through the origin, null spaces, spans. Its dimension is the size of any basis. For an $m\\times n$ matrix of rank $r$: $\\dim\\operatorname{Col} A = \\dim\\operatorname{Row} A = r$, $\\dim\\operatorname{Nul} A = n - r$ (rank–nullity) and $\\dim\\operatorname{Nul} A^T = m - r$. The pivot columns of the original $A$ form a basis of its column space.',
    resources: [ila('subspaces', 'Subspaces'), ila('dimension', 'Basis and Dimension'), ila('rank-thm', 'The Rank Theorem'), strang],
  },
};

// ---------------------------------------------------------------------------
// Eigenvalues

/** 2×2 integer matrix with integer eigenvalues l1, l2 and eigenvectors the columns of P (det ±1). */
function eigenPair(r: Rng) {
  const P = unimodular(r, 2, 2, 3);
  const [l1, l2] = distinct(r, 2, -4, 5);
  const A = matMul(matMul(P, mat([[l1, 0], [0, l2]])), inverse(P));
  return { A, P, l1, l2, v1: P.map((row) => row[0]), v2: P.map((row) => row[1]) };
}

const isEigenvector: Gen = (r) => {
  const { A, l1, l2, v1, v2 } = eigenPair(r);
  const kind = r.int(0, 2);
  let v = kind === 0 ? v1 : kind === 1 ? v2 : randVec(r, 2, -3, 3);
  if (kind === 2) while (isZeroVec(v) || matVec(A, v)[0].mul(v[1]).sub(matVec(A, v)[1].mul(v[0])).isZero()) v = randVec(r, 2, -3, 3);
  const s = r.nz(-2, 2);
  if (kind < 2) v = v.map((x) => x.mul(s));
  const Av = matVec(A, v);
  const opts = [`Yes, with $\\lambda = ${Math.min(l1, l2)}$`, `Yes, with $\\lambda = ${Math.max(l1, l2)}$`, 'No'];
  const lam = kind === 0 ? l1 : l2;
  return {
    prompt: `Is $\\mathbf{v} = ${vecTex(v)}$ an eigenvector of $A = ${matTex(A)}$?`,
    answer: choice(opts, kind === 2 ? 2 : lam === Math.min(l1, l2) ? 0 : 1),
    solution: [`$A\\mathbf{v} = ${vecTex(Av)}$.`, kind === 2 ? 'That is not a multiple of $\\mathbf{v}$, so no.' : `That is $${lam}\\mathbf{v}$, so yes, with $\\lambda = ${lam}$.`],
  };
};

const eigenDeep: Skill = { ...eigen, levels: [{ name: '2×2 eigenvalues', generate: mix(eigen.levels[0].generate, isEigenvector) }, eigen.levels[1], eigen.levels[2]] };

const eigenProps: Skill = {
  id: 'la.eigenprops',
  name: 'Eigenvalue properties',
  prereqs: ['la.eigen'],
  levels: [
    {
      name: 'trace and determinant',
      generate: mix(
        (r) => {
          const ls = Array.from({ length: 3 }, () => r.nz(-4, 4));
          const wantDet = r.next() < 0.5;
          const v = wantDet ? ls.reduce((a, b) => a * b, 1) : ls.reduce((a, b) => a + b, 0);
          return {
            prompt: `A $3\\times3$ matrix has eigenvalues $${ls.join(',\\ ')}$. Find its ${wantDet ? 'determinant' : 'trace'}.`,
            answer: num(new Q(v)),
            solution: [wantDet ? 'The determinant is the product of the eigenvalues (with multiplicity).' : 'The trace (sum of the diagonal) is the sum of the eigenvalues.', `$${v}$`],
          };
        },
        (r) => {
          const [l1, l2] = [r.int(-5, 6), r.int(-5, 6)];
          return {
            prompt: `A $2\\times2$ matrix has trace $${l1 + l2}$ and determinant $${l1 * l2}$. Find its eigenvalues.`,
            answer: listAns(qv([l1, l2])),
            inputHint: 'Comma-separated.',
            solution: [`The characteristic polynomial is $\\lambda^2 - (\\text{tr})\\lambda + \\det = \\lambda^2 ${signed(-(l1 + l2))}\\lambda ${signed(l1 * l2)}$.`, `Its roots: $${l1}$ and $${l2}$.`],
          };
        },
      ),
    },
    {
      name: 'functions of a matrix',
      generate: mix(
        (r) => {
          const ls = distinct(r, 2, -4, 4, true);
          const k = r.nz(-3, 3);
          const f = r.pick([
            { tex: 'A^{2}', g: (l: Q) => l.mul(l), why: 'Applying $A$ twice multiplies an eigenvector by $\\lambda$ twice.' },
            { tex: 'A^{-1}', g: (l: Q) => new Q(1).div(l), why: '$A\\mathbf{v} = \\lambda\\mathbf{v}$ gives $A^{-1}\\mathbf{v} = \\frac{1}{\\lambda}\\mathbf{v}$.' },
            { tex: `A ${signed(k)}I`, g: (l: Q) => l.add(k), why: `$(A ${signed(k)}I)\\mathbf{v} = (\\lambda ${signed(k)})\\mathbf{v}$: every eigenvalue shifts by $${k}$.` },
            { tex: `${k}A`, g: (l: Q) => l.mul(k), why: `Scaling the matrix scales every eigenvalue by $${k}$.` },
            { tex: 'A^{T}', g: (l: Q) => l, why: '$A$ and $A^T$ have the same characteristic polynomial, hence the same eigenvalues.' },
          ]);
          const res = ls.map((l) => f.g(new Q(l)));
          return {
            prompt: `$A$ has eigenvalues $${ls.join('$ and $')}$. What are the eigenvalues of $${f.tex}$?`,
            answer: listAns(res),
            inputHint: 'Comma-separated.',
            solution: [f.why, `$${res.map((x) => x.tex()).join(',\\ ')}$`],
          };
        },
        (r) => {
          const v = randVec(r, 3, -3, 3);
          const lam = r.pick([2, 3, -2, -3]);
          const n = r.int(2, 4);
          const res = v.map((x) => x.mul(lam ** n));
          return {
            prompt: `$A\\mathbf{v} = ${lam}\\mathbf{v}$ for $\\mathbf{v} = ${vecTex(v)}$. Find $A^{${n}}\\mathbf{v}$.`,
            answer: vecAns(res),
            solution: [`Each application of $A$ multiplies $\\mathbf{v}$ by $${lam}$: $A^{${n}}\\mathbf{v} = ${P(lam)}^{${n}}\\mathbf{v}$.`, `$${vecTex(res)}$`],
          };
        },
      ),
    },
    {
      name: 'steady states',
      generate(r) {
        const a = r.int(1, 9);
        const b = r.int(1, 9);
        const M = mat([
          [new Q(10 - a, 10), new Q(b, 10)],
          [new Q(a, 10), new Q(10 - b, 10)],
        ]);
        const sv = [new Q(b, a + b), new Q(a, a + b)];
        return {
          prompt: `Find the steady-state probability vector of the Markov matrix $${matTex(M)}$ (columns sum to 1): the eigenvector for $\\lambda = 1$ whose entries add to 1.`,
          answer: vecAns(sv),
          solution: [`Solve $(M - I)\\mathbf{x} = \\mathbf{0}$: the first row gives $-${new Q(a, 10).tex()}x_1 + ${new Q(b, 10).tex()}x_2 = 0$, so $\\mathbf{x} \\propto (${b}, ${a})$.`, `Scale to sum 1: $${vecTex(sv)}$`],
          selfCheck: () => matVec(M, sv).every((x, k) => x.eq(sv[k])),
        };
      },
    },
  ],
  learn: {
    summary:
      'The trace is the sum of the eigenvalues and the determinant their product, so for $2\\times2$ the characteristic polynomial is $\\lambda^2 - (\\operatorname{tr} A)\\lambda + \\det A$. If $A\\mathbf{v} = \\lambda\\mathbf{v}$ then $A^k\\mathbf{v} = \\lambda^k\\mathbf{v}$, $A^{-1}\\mathbf{v} = \\lambda^{-1}\\mathbf{v}$ and $(A + cI)\\mathbf{v} = (\\lambda + c)\\mathbf{v}$. A Markov matrix always has eigenvalue $1$, and its eigenvector, scaled to sum 1, is the long-run distribution.',
    resources: [ila('eigenvectors', 'Eigenvalues and Eigenvectors'), ila('stochastic-matrices', 'Stochastic Matrices'), tb1b('eigenvalues', 'Eigenvectors and eigenvalues')],
  },
};

// ---------------------------------------------------------------------------
// Orthogonal complements

const complement: Skill = {
  id: 'la.complement',
  name: 'Orthogonal complements',
  prereqs: ['la.geometry', 'la.rank'],
  levels: [
    {
      name: 'perpendicular to a plane',
      generate: mix(
        (r) => {
          let u: Q[], v: Q[];
          do [u, v] = [randVec(r, 3, -3, 3), randVec(r, 3, -3, 3)];
          while (isZeroVec(cross(u, v)));
          const n = cross(u, v);
          return {
            prompt: `$W = \\operatorname{span}\\left\\{${vecTex(u)}, ${vecTex(v)}\\right\\}$. $W^{\\perp}$ is a line; find a vector spanning it.`,
            answer: direction(n),
            inputHint: 'Any non-zero multiple works.',
            solution: ['$W^\\perp$ consists of the vectors orthogonal to both spanning vectors; in $\\mathbb{R}^3$ the cross product is one.', `$${vecTex(n)}$`],
            selfCheck: () => dot(n, u).isZero() && dot(n, v).isZero(),
          };
        },
        (r) => {
          let n: Q[];
          do n = randVec(r, 3, -4, 4);
          while (isZeroVec(n));
          return {
            prompt: `$W$ is the plane $${sum([t(n[0], 'x'), t(n[1], 'y'), t(n[2], 'z')]).tex} = 0$. Find a vector spanning $W^{\\perp}$.`,
            answer: direction(n),
            inputHint: 'Any non-zero multiple works.',
            solution: ['The equation says $\\mathbf{n}\\cdot(x, y, z) = 0$, so the coefficient vector is orthogonal to the whole plane.', `$W^\\perp = \\operatorname{span}\\left\\{${vecTex(n)}\\right\\}$`],
          };
        },
      ),
    },
    {
      name: 'dimensions and null spaces',
      generate: mix(
        (r) => {
          const n = r.int(3, 7);
          const k = r.int(1, n - 1);
          return {
            prompt: `$W$ is spanned by ${k === 1 ? 'a single non-zero vector' : `${k} linearly independent vectors`} in $\\mathbb{R}^{${n}}$. What is $\\dim W^{\\perp}$?`,
            answer: num(new Q(n - k)),
            solution: [`$\\dim W + \\dim W^\\perp = ${n}$, and $\\dim W = ${k}$.`, `$${n - k}$`],
          };
        },
        (r) => {
          let r1: Q[], r2: Q[];
          do [r1, r2] = [randVec(r, 3, -3, 3), randVec(r, 3, -3, 3)];
          while (isZeroVec(cross(r1, r2)));
          const A = [r1, r2];
          return {
            prompt: `Find a vector spanning the orthogonal complement of the row space of $${matTex(A)}$.`,
            answer: direction(nullspace(A)[0]),
            inputHint: 'Any non-zero multiple works.',
            solution: ['$(\\operatorname{Row} A)^\\perp = \\operatorname{Nul} A$: the vectors orthogonal to every row.', `Solving $A\\mathbf{x} = \\mathbf{0}$: $${vecTex(nullspace(A)[0])}$`],
          };
        },
      ),
    },
    {
      name: 'distances and decompositions',
      generate: mix(
        (r) => {
          let n: Q[], p: Q[];
          do [n, p] = [randVec(r, 3, -3, 3), randVec(r, 3, -5, 5)];
          while (isZeroVec(n) || dot(n, p).isZero());
          const D2 = dot(p, n).mul(dot(p, n)).div(dot(n, n));
          return {
            prompt: `Find the distance from $(${p.map((x) => x.tex()).join(', ')})$ to the plane $${sum([t(n[0], 'x'), t(n[1], 'y'), t(n[2], 'z')]).tex} = 0$.`,
            answer: sqrtAns(D2),
            inputHint: 'sqrt(…) is fine.',
            solution: ['The distance is the length of the component along the normal: $\\dfrac{|\\mathbf{p}\\cdot\\mathbf{n}|}{\\|\\mathbf{n}\\|}$.', `$\\dfrac{|${dot(p, n).tex()}|}{\\sqrt{${dot(n, n).tex()}}} = ${sqrtTex(D2)}$`],
          };
        },
        (r) => {
          let n: Q[], p: Q[];
          do [n, p] = [randVec(r, 3, -3, 3), randVec(r, 3, -5, 5)];
          while (isZeroVec(n) || dot(n, p).isZero());
          const c = dot(p, n).div(dot(n, n));
          const w = p.map((x, k) => x.sub(n[k].mul(c)));
          return {
            prompt: `Write $\\mathbf{p} = ${vecTex(p)}$ as $\\mathbf{w} + \\mathbf{z}$ with $\\mathbf{w}$ in the plane $W: ${sum([t(n[0], 'x'), t(n[1], 'y'), t(n[2], 'z')]).tex} = 0$ and $\\mathbf{z} \\in W^{\\perp}$. Find $\\mathbf{w}$.`,
            answer: vecAns(w),
            solution: [`$\\mathbf{z}$ is the projection onto the normal $\\mathbf{n}$: $\\frac{\\mathbf{p}\\cdot\\mathbf{n}}{\\mathbf{n}\\cdot\\mathbf{n}}\\mathbf{n} = ${c.tex()}${vecTex(n)}$.`, `$\\mathbf{w} = \\mathbf{p} - \\mathbf{z} = ${vecTex(w)}$`],
            selfCheck: () => dot(w, n).isZero(),
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      '$W^\\perp$ is everything orthogonal to every vector of $W$; it is a subspace with $\\dim W + \\dim W^\\perp = n$. Key fact: $(\\operatorname{Row} A)^\\perp = \\operatorname{Nul} A$, so finding a complement means solving a homogeneous system. A plane $\\mathbf{n}\\cdot\\mathbf{x} = 0$ has $W^\\perp = \\operatorname{span}\\{\\mathbf{n}\\}$. Every vector splits uniquely as $\\mathbf{w} + \\mathbf{z}$ with $\\mathbf{w} \\in W$, $\\mathbf{z} \\in W^\\perp$, and $\\|\\mathbf{z}\\|$ is the distance to $W$.',
    resources: [ila('orthogonal-complements', 'Orthogonal Complements'), ila('projections', 'Orthogonal Projection'), strang],
  },
};

// ---------------------------------------------------------------------------
// Going deeper: applications of linear systems

/** Parse a chemical formula like "C6H12O6" or "Fe2O3" into element counts. */
function atoms(formula: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) out[m[1]] = (out[m[1]] ?? 0) + (m[2] ? +m[2] : 1);
  return out;
}
const REACTIONS: { lhs: string[]; rhs: string[]; c: number[] }[] = [
  { lhs: ['H2', 'O2'], rhs: ['H2O'], c: [2, 1, 2] },
  { lhs: ['CH4', 'O2'], rhs: ['CO2', 'H2O'], c: [1, 2, 1, 2] },
  { lhs: ['C3H8', 'O2'], rhs: ['CO2', 'H2O'], c: [1, 5, 3, 4] },
  { lhs: ['C2H6', 'O2'], rhs: ['CO2', 'H2O'], c: [2, 7, 4, 6] },
  { lhs: ['Fe', 'O2'], rhs: ['Fe2O3'], c: [4, 3, 2] },
  { lhs: ['Al', 'O2'], rhs: ['Al2O3'], c: [4, 3, 2] },
  { lhs: ['N2', 'H2'], rhs: ['NH3'], c: [1, 3, 2] },
  { lhs: ['KClO3'], rhs: ['KCl', 'O2'], c: [2, 2, 3] },
  { lhs: ['C6H12O6', 'O2'], rhs: ['CO2', 'H2O'], c: [1, 6, 6, 6] },
  { lhs: ['C4H10', 'O2'], rhs: ['CO2', 'H2O'], c: [2, 13, 8, 10] },
  { lhs: ['NO2', 'H2O'], rhs: ['HNO3', 'NO'], c: [3, 1, 2, 1] },
];
const chem = (f: string) => f.replace(/(\d+)/g, '_{$1}');

const applications: Skill = {
  id: 'la.apps',
  name: 'Applications of linear systems',
  prereqs: ['la.solutions'],
  levels: [
    {
      name: 'balancing chemical equations',
      generate(r) {
        const re = r.pick(REACTIONS);
        const all = [...re.lhs, ...re.rhs];
        const names = all.map((_, k) => `x_{${k + 1}}`);
        return {
          prompt: `Balance $${re.lhs.map((f, k) => `${names[k]}\\,\\mathrm{${chem(f)}}`).join(' + ')} \\to ${re.rhs.map((f, k) => `${names[re.lhs.length + k]}\\,\\mathrm{${chem(f)}}`).join(' + ')}$. Enter $(${names.join(', ')})$ as a column.`,
          answer: direction(qv(re.c)),
          inputHint: 'Any positive multiple works; smallest whole numbers are customary.',
          solution: [
            'One equation per element (atoms in = atoms out) gives a homogeneous system; its null space is one-dimensional.',
            `Smallest whole-number solution: $(${re.c.join(', ')})$.`,
          ],
          selfCheck: () => {
            const els = new Set(all.flatMap((f) => Object.keys(atoms(f))));
            return [...els].every((e) => {
              const left = re.lhs.reduce((s, f, k) => s + (atoms(f)[e] ?? 0) * re.c[k], 0);
              const right = re.rhs.reduce((s, f, k) => s + (atoms(f)[e] ?? 0) * re.c[re.lhs.length + k], 0);
              return left === right;
            });
          },
        };
      },
    },
    {
      name: 'interpolation',
      generate: mix(interpolation, (r) => {
        const [a, b] = [r.int(-4, 4), r.int(-4, 4)];
        const [c, d] = [r.nz(-2, 2), r.int(-3, 3)];
        // y = c x³ + d x² + b x + a through 4 points
        const xs = distinct(r, 4, -2, 2).sort((p, q) => p - q);
        const pts = xs.map((x) => [x, c * x ** 3 + d * x * x + b * x + a]);
        return {
          prompt: `Find the cubic $y = px^{3} + qx^{2} + sx + t$ through ${pts.map(([x, y]) => `$(${x}, ${y})$`).join(', ')}. Enter $(p, q, s, t)$ as a column.`,
          answer: vecAns(qv([c, d, b, a])),
          solution: ['Four points, four unknown coefficients: a $4\\times4$ (Vandermonde) system with a unique solution.', `$(p, q, s, t) = (${c}, ${d}, ${b}, ${a})$`],
        };
      }),
    },
    {
      name: 'input–output models',
      generate(r) {
        let C: Mat;
        do C = mat([
          [new Q(r.int(1, 4), 10), new Q(r.int(1, 4), 10)],
          [new Q(r.int(1, 4), 10), new Q(r.int(1, 4), 10)],
        ]);
        while (det(identity(2).map((row, i) => row.map((x, j) => x.sub(C[i][j])))).isZero());
        const d = qv([r.int(1, 10) * 10, r.int(1, 10) * 10]);
        const IC = identity(2).map((row, i) => row.map((x, j) => x.sub(C[i][j])));
        const x = matVec(inverse(IC), d);
        return {
          prompt: `An economy has two sectors with consumption matrix $C = ${matTex(C)}$ (column $j$: input needed per unit of sector $j$'s output) and final demand $\\mathbf{d} = ${vecTex(d)}$. Find the production $\\mathbf{x}$ with $\\mathbf{x} = C\\mathbf{x} + \\mathbf{d}$.`,
          answer: vecAns(x),
          solution: [`Rearrange: $(I - C)\\mathbf{x} = \\mathbf{d}$ with $I - C = ${matTex(IC)}$.`, `$\\mathbf{x} = (I - C)^{-1}\\mathbf{d} = ${vecTex(x)}$`],
          selfCheck: () => matVec(IC, x).every((v, k) => v.eq(d[k])),
        };
      },
    },
  ],
  learn: {
    summary:
      'Linear systems model anything built from linear balance conditions. Chemical equations: one equation per element, a homogeneous system whose null space gives the coefficients. Interpolation: $n$ points determine a polynomial of degree $n - 1$ through a Vandermonde system. Leontief input–output: production must cover internal consumption plus demand, $\\mathbf{x} = C\\mathbf{x} + \\mathbf{d}$, so $\\mathbf{x} = (I - C)^{-1}\\mathbf{d}$.',
    resources: [ila('systems-of-eqns', 'Systems of Linear Equations'), { kind: 'article', title: 'Wikipedia: Input–output model', url: 'https://en.wikipedia.org/wiki/Input%E2%80%93output_model' }],
  },
};

// ---------------------------------------------------------------------------
// Going deeper: abstract vector spaces (polynomials)

/** Polynomial as coefficients [a0, a1, a2, ...]. */
const polyTex = (c: number[], v = 'x') => sum(c.map((a, k) => t(a, k === 0 ? '' : k === 1 ? v : `${v}^{${k}}`)).reverse()).tex;
const deriv = (c: number[]) => [...c.slice(1).map((a, k) => a * (k + 1)), 0];
const shift = (c: number[]) => {
  // p(x + 1)
  const out = Array(c.length).fill(0);
  c.forEach((a, k) => {
    for (let j = 0; j <= k; j++) out[j] += a * binom(k, j);
  });
  return out;
};
const binom = (n: number, k: number): number => (k === 0 || k === n ? 1 : binom(n - 1, k - 1) + binom(n - 1, k));
const MAPS = [
  { tex: "T(p) = p'", f: (c: number[]) => deriv(c) },
  { tex: "T(p) = p + p'", f: (c: number[]) => c.map((a, k) => a + deriv(c)[k]) },
  { tex: "T(p) = x\\,p'(x)", f: (c: number[]) => c.map((a, k) => a * k) },
  { tex: 'T(p) = p(x + 1)', f: (c: number[]) => shift(c) },
  { tex: "T(p) = p'' - 2p", f: (c: number[]) => c.map((a, k) => deriv(deriv(c))[k] - 2 * a) },
];

const abstractSpaces: Skill = {
  id: 'la.abstract',
  name: 'Abstract vector spaces',
  prereqs: ['la.independence'],
  levels: [
    {
      name: 'coordinates of polynomials',
      generate(r) {
        const c = [r.int(-5, 5), r.int(-5, 5), r.nz(-3, 3)];
        if (r.next() < 0.5) {
          // basis {1, x − 1, (x − 1)²}: Taylor coefficients at 1
          const coords = [c[0] + c[1] + c[2], c[1] + 2 * c[2], c[2]];
          return {
            prompt: `Find the coordinates of $p(x) = ${polyTex(c)}$ in the basis $\\{1,\\ x - 1,\\ (x - 1)^{2}\\}$ of $\\mathcal{P}_2$.`,
            answer: vecAns(qv(coords)),
            solution: ['These are the Taylor coefficients at $x = 1$: $p(1)$, $p\'(1)$, $\\frac{p\'\'(1)}{2}$.', `$(${coords.join(', ')})$`],
          };
        }
        // basis {1, 1 + x, 1 + x + x²}
        const coords = [c[0] - c[1], c[1] - c[2], c[2]];
        return {
          prompt: `Find the coordinates of $p(x) = ${polyTex(c)}$ in the basis $\\{1,\\ 1 + x,\\ 1 + x + x^{2}\\}$.`,
          answer: vecAns(qv(coords)),
          solution: ['Match the $x^2$ coefficient first (only the last basis vector has one), then $x$, then the constant.', `$p = ${coords[0]}\\cdot 1 + ${P(coords[1])}(1 + x) + ${P(coords[2])}(1 + x + x^2)$`],
          selfCheck: () => coords[0] + coords[1] + coords[2] === c[0] && coords[1] + coords[2] === c[1],
        };
      },
    },
    {
      name: 'matrices of linear maps',
      generate(r) {
        const m = r.pick(MAPS);
        const cols = [0, 1, 2].map((k) => m.f([0, 1, 2].map((j) => (j === k ? 1 : 0))));
        const M = mat([0, 1, 2].map((i2) => cols.map((col) => col[i2])));
        return {
          prompt: `Find the matrix of $${m.tex}$ on $\\mathcal{P}_2$ with respect to the basis $\\{1, x, x^{2}\\}$.`,
          answer: matrixAns(M),
          solution: ['Column $k$ holds the coordinates of $T$ applied to the $k$-th basis vector.', `$T(1) = ${polyTex(cols[0])}$, $T(x) = ${polyTex(cols[1])}$, $T(x^2) = ${polyTex(cols[2])}$, giving $${matTex(M)}$`],
        };
      },
    },
    {
      name: 'independence and dimension',
      generate: mix(
        (r) => {
          const M = randMat(r, 3, 3, -3, 3);
          const dep = r.next() < 0.5;
          if (dep) M[2] = M[0].map((x, k) => x.mul(r.nz(-2, 2)).add(M[1][k].mul(r.nz(-2, 2))));
          const ps = M.map((row) => polyTex(row.map((x) => x.n)));
          const indep = !det(M).isZero();
          return {
            prompt: `Are $${ps.join(',\\ ')}$ linearly independent in $\\mathcal{P}_2$?`,
            answer: yesNo(indep),
            solution: ['Write each polynomial as its coefficient vector and check the determinant (or row reduce).', `$\\det = ${det(M).tex()}$: ${indep ? 'independent' : 'dependent'}.`],
          };
        },
        (r) => {
          const n = r.int(2, 5);
          const pool = [
            { tex: `\\{p \\in \\mathcal{P}_{${n}} : p(1) = 0\\}`, d: n, why: `One linear condition on the ${n + 1}-dimensional $\\mathcal{P}_{${n}}$.` },
            { tex: `\\{p \\in \\mathcal{P}_{${n}} : p(0) = p'(0) = 0\\}`, d: n - 1, why: `Two independent conditions: $p$ is $x^2$ times a polynomial of degree $\\le ${n - 2}$.` },
            { tex: `\\ker\\left(\\frac{d^{2}}{dx^{2}}\\right) \\text{ on } \\mathcal{P}_{${n}}`, d: 2, why: 'Polynomials with $p\'\' = 0$ are the lines $a + bx$.' },
            { tex: `\\{${n}\\times${n} \\text{ symmetric matrices}\\}`, d: (n * (n + 1)) / 2, why: `Choose the diagonal and the entries above it: $${n} + ${(n * (n - 1)) / 2}$.` },
            { tex: `\\{${n}\\times${n} \\text{ matrices with trace } 0\\}`, d: n * n - 1, why: `All $${n * n}$ entries, minus one condition.` },
          ];
          const p = r.pick(pool);
          return { prompt: `What is the dimension of $${p.tex}$?`, answer: num(new Q(p.d)), solution: [p.why, `Dimension $${p.d}$`] };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Anything you can add and scale consistently is a vector space: polynomials $\\mathcal{P}_n$ (dimension $n + 1$), matrices, functions. Choosing a basis turns elements into coordinate vectors, and every linear map into a matrix whose $k$-th column is the image of the $k$-th basis vector. Independence and dimension questions then become ordinary matrix questions.',
    resources: [ila('subspaces', 'Subspaces'), { kind: 'article', title: 'Wikipedia: Vector space', url: 'https://en.wikipedia.org/wiki/Vector_space' }, strang],
  },
};

// ---------------------------------------------------------------------------

export const linalgChapters: Chapter[] = [
  {
    id: 'la.ch.vectors',
    title: 'Vectors',
    about: 'Vectors as arrows and as lists of numbers: adding, scaling, dot and cross products, lengths, angles, distances and projections.',
    why: 'Everything in linear algebra is built on vectors. In computing they are points, colours, feature vectors and embeddings; the dot product is how similarity is measured.',
    resources: [tb1b('vectors', 'Vectors, what even are they?'), ila('vectors', 'Vectors'), { kind: 'interactive', title: 'Immersive Linear Algebra: Vectors', url: 'http://immersivemath.com/ila/ch02_vectors/ch02.html' }],
    skills: [vectorsDeep, geometryDeep],
    deeper: [planes],
  },
  {
    id: 'la.ch.systems',
    title: 'Linear systems',
    about: 'Solving systems by row reduction, the reduced row echelon form, and what the solution set of a system looks like.',
    why: 'Row reduction is the workhorse algorithm of the subject: almost every later question (inverse, rank, null space, independence) is answered by row reducing something.',
    resources: [ila('systems-of-eqns', 'Systems of Linear Equations'), ila('row-reduction', 'Row Reduction'), strang],
    skills: [systemsDeep, rrefSkill, solutions],
    deeper: [applications],
  },
  {
    id: 'la.ch.matrices',
    title: 'Matrices and linear maps',
    about: 'Matrix multiplication, inverses, and matrices as transformations of space (rotations, reflections, shears), with their kernels and ranges.',
    why: 'Matrices are how graphics engines move objects, how neural network layers work, and how systems of equations are solved in one step.',
    resources: [tb1b('linear-transformations', 'Linear transformations and matrices'), tb1b('matrix-multiplication', 'Matrix multiplication as composition'), ila('matrix-multiplication', 'Matrix Multiplication')],
    skills: [matmulDeep, inverseDeep, transformsDeep],
    deeper: [lu],
  },
  {
    id: 'la.ch.determinants',
    title: 'Determinants',
    about: 'Computing determinants and the rules for how they behave under products, inverses and row operations.',
    why: 'The determinant tells you at a glance whether a matrix is invertible and how much it scales area or volume (which is why it appears in change of variables).',
    resources: [tb1b('determinant', 'The determinant'), ila('determinants-definitions-properties', 'Determinants: Definition')],
    skills: [determinantDeep, detProps],
    deeper: [cramer],
  },
  {
    id: 'la.ch.spaces',
    title: 'Vector spaces',
    about: 'Span, linear independence, bases and coordinates, rank and null space, subspaces and their dimensions.',
    why: 'These ideas explain when a system has a unique solution, how many degrees of freedom data really has, and what a "basis" or "dimension" means.',
    resources: [tb1b('span', 'Linear combinations, span, and basis vectors'), tb1b('inverse-matrices', 'Inverse matrices, column space and null space'), ila('linear-independence', 'Linear Independence')],
    skills: [independenceDeep, rankSkill, subspaces],
    deeper: [changeOfBasis, abstractSpaces],
  },
  {
    id: 'la.ch.eigen',
    title: 'Eigenvalues',
    about: 'Eigenvalues and eigenvectors, how they behave under powers, inverses and shifts, steady states, and definiteness of symmetric matrices.',
    why: 'Eigenvectors are the directions a transformation only stretches. They drive PageRank, PCA, stability analysis and the second-derivative test in many variables.',
    resources: [tb1b('eigenvalues', 'Eigenvectors and eigenvalues'), ila('eigenvectors', 'Eigenvalues and Eigenvectors'), strang],
    skills: [eigenDeep, eigenProps, definiteness],
    deeper: [diagonalization, singularValues],
  },
  {
    id: 'la.ch.orthogonality',
    title: 'Orthogonality',
    about: 'Orthogonal complements, projections, Gram–Schmidt, and least squares for systems with no exact solution.',
    why: 'Least squares is linear regression. Orthogonal bases make computations numerically stable and are the basis of QR decomposition.',
    resources: [ila('projections', 'Orthogonal Projection'), ila('least-squares', 'The Method of Least Squares'), strang],
    skills: [complement, orthogonal],
    deeper: [projections],
  },
];

