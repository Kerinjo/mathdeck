// Optional "going deeper" sections for Linear Algebra.
import { det, dot, identity, inverse, isIdentity, mat, matMul, matTex, matVec, Q, scaleToInts, transpose, vecStrings, vecTex, type Mat } from '../core/frac';
import { sum, t } from '../core/fmt';
import type { Problem, Resource, Skill } from '../core/types';
import { ila, isZeroVec, matrixAns, maxAbs, num, P, randMat, randVec, strang, tb1b, unimodular, vecAns } from './la-helpers';

const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});
const paul = (path: string, title: string): Resource => ({
  kind: 'article',
  title: `Paul's Online Notes: ${title}`,
  url: `https://tutorial.math.lamar.edu/Classes/${path}`,
});

const cross = (u: Q[], v: Q[]) => [
  u[1].mul(v[2]).sub(u[2].mul(v[1])),
  u[2].mul(v[0]).sub(u[0].mul(v[2])),
  u[0].mul(v[1]).sub(u[1].mul(v[0])),
];
const sub = (u: Q[], v: Q[]) => u.map((x, i) => x.sub(v[i]));
const ptTex = (v: Q[]) => `(${v.map((x) => x.tex()).join(', ')})`;
const sqrtTex = (n: number) => {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? `${r}` : `\\sqrt{${n}}`;
};
const sqrtExpr = (n: number) => {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? `${r}` : `sqrt(${n})`;
};

// ---------------------------------------------------------------------------

export const planes: Skill = {
  id: 'la.planes',
  name: 'Lines and planes',
  prereqs: ['la.geometry'],
  levels: [
    {
      name: 'normal vector of a plane',
      generate(r) {
        for (;;) {
          const [a, b, c] = [randVec(r, 3, -4, 4), randVec(r, 3, -4, 4), randVec(r, 3, -4, 4)];
          const n = cross(sub(b, a), sub(c, a));
          if (isZeroVec(n)) continue;
          return {
            prompt: `Find a normal vector to the plane through $${ptTex(a)}$, $${ptTex(b)}$ and $${ptTex(c)}$.`,
            answer: { kind: 'direction', expected: vecStrings(scaleToInts(n)) },
            inputHint: 'Any non-zero multiple is accepted.',
            solution: [
              `Two directions in the plane: $${vecTex(sub(b, a))}$ and $${vecTex(sub(c, a))}$.`,
              `Their cross product is perpendicular to both: $${vecTex(n)}$.`,
            ],
          };
        }
      },
    },
    {
      name: 'distance to a plane',
      generate(r) {
        for (;;) {
          const n = randVec(r, 3, -4, 4);
          if (isZeroVec(n)) continue;
          const d = r.int(-10, 10);
          const p = randVec(r, 3, -5, 5);
          const k = Math.abs(dot(n, p).value() - d);
          const N = dot(n, n).value();
          if (k === 0) continue;
          const plane = sum([t(n[0], 'x'), t(n[1], 'y'), t(n[2], 'z')]).tex;
          return {
            prompt: `Find the distance from the point $${ptTex(p)}$ to the plane $${plane} = ${d}$.`,
            answer: num(`${k}/${sqrtExpr(N)}`, `\\dfrac{${k}}{${sqrtTex(N)}}`),
            inputHint: 'Exact, e.g. 7/sqrt(14).',
            solution: [
              'Distance $= \\dfrac{|\\mathbf n\\cdot\\mathbf p - d|}{\\|\\mathbf n\\|}$ where $\\mathbf n$ is the normal vector.',
              `$\\mathbf n\\cdot\\mathbf p = ${dot(n, p).tex()}$, so the distance is $\\dfrac{|${dot(n, p).tex()} - ${P(d)}|}{\\sqrt{${N}}} = \\dfrac{${k}}{${sqrtTex(N)}}$.`,
            ],
          };
        }
      },
    },
    {
      name: 'where a line meets a plane',
      generate(r) {
        for (;;) {
          const n = randVec(r, 3, -3, 3);
          const v = randVec(r, 3, -3, 3);
          const p = randVec(r, 3, -4, 4);
          if (dot(n, v).isZero()) continue;
          const t0 = r.nz(-3, 3);
          const x = p.map((pi, i) => pi.add(v[i].mul(t0)));
          const d = dot(n, x);
          const plane = sum([t(n[0], 'x'), t(n[1], 'y'), t(n[2], 'z')]).tex;
          return {
            prompt: `Where does the line $\\mathbf{x} = ${vecTex(p)} + t${vecTex(v)}$ meet the plane $${plane} = ${d.tex()}$?`,
            answer: vecAns(x),
            solution: [
              `Plug the line into the plane: $\\mathbf n\\cdot\\mathbf p + t\\,(\\mathbf n\\cdot\\mathbf v) = ${d.tex()}$, i.e. $${dot(n, p).tex()} + ${P(dot(n, v))}t = ${d.tex()}$.`,
              `So $t = ${t0}$ and the point is $${vecTex(x)}$.`,
            ],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'A plane is $\\mathbf n\\cdot\\mathbf x = d$ with normal $\\mathbf n$; through three points, take $\\mathbf n$ as the cross product of two edge vectors. Distance from $\\mathbf p$ to the plane: $|\\mathbf n\\cdot\\mathbf p - d|/\\|\\mathbf n\\|$. A line $\\mathbf p + t\\mathbf v$ meets the plane where $\\mathbf n\\cdot(\\mathbf p + t\\mathbf v) = d$.',
    resources: [paul('CalcIII/EqnsOfPlanes.aspx', 'Equations of Planes'), paul('CalcIII/EqnsOfLines.aspx', 'Equations of Lines')],
  },
};

// ---------------------------------------------------------------------------

function luPair(r: { int(a: number, b: number): number; nz(a: number, b: number): number }, n: number) {
  for (;;) {
    const L = identity(n);
    const U: Mat = Array.from({ length: n }, () => Array.from({ length: n }, () => new Q(0)));
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (i > j) L[i][j] = new Q(r.int(-3, 3));
        if (i <= j) U[i][j] = new Q(i === j ? r.nz(-4, 4) : r.int(-4, 4));
      }
    const A = matMul(L, U);
    if (maxAbs(A) <= 20) return { L, U, A };
  }
}

export const lu: Skill = {
  id: 'la.lu',
  name: 'LU decomposition',
  prereqs: ['la.matmul', 'la.rref'],
  levels: [
    { name: '2×2: find L', generate: (r) => luProblem(luPair(r, 2), 'L') },
    { name: '3×3: find U', generate: (r) => luProblem(luPair(r, 3), 'U') },
    { name: '3×3: find L', generate: (r) => luProblem(luPair(r, 3), 'L') },
  ],
  learn: {
    summary:
      '$A = LU$ with $L$ lower triangular with 1s on the diagonal and $U$ upper triangular. Gaussian elimination without row swaps produces $U$; the multiplier used to clear entry $(i, j)$ (row $i$ minus $\\ell_{ij}$ times row $j$) is exactly $L_{ij}$. Solving $A\\mathbf x = \\mathbf b$ then means two triangular solves.',
    resources: [wiki('LU_decomposition', 'LU decomposition'), strang],
  },
};

function luProblem({ L, U, A }: { L: Mat; U: Mat; A: Mat }, want: 'L' | 'U'): Problem {
  const n = A.length;
  const mults: string[] = [];
  for (let j = 0; j < n; j++) for (let i = j + 1; i < n; i++) mults.push(`$\\ell_{${i + 1}${j + 1}} = ${L[i][j].tex()}$`);
  return {
    prompt: `Write $A = ${matTex(A)}$ as $A = LU$ with $L$ unit lower triangular and $U$ upper triangular. Find $${want}$.`,
    answer: matrixAns(want === 'L' ? L : U),
    solution: [
      'Eliminate below each pivot without swapping rows. The rows you end with form $U$; the multipliers fill $L$.',
      `Multipliers: ${mults.join(', ')}.`,
      `$L = ${matTex(L)}$, $U = ${matTex(U)}$.`,
    ],
    selfCheck: () => matMul(L, U).every((row, i) => row.every((x, j) => x.eq(A[i][j]))),
  };
}

// ---------------------------------------------------------------------------

export const cramer: Skill = {
  id: 'la.cramer',
  name: "Areas, volumes and Cramer's rule",
  prereqs: ['la.det'],
  levels: [
    {
      name: 'area of a triangle',
      generate(r) {
        for (;;) {
          const pts = [randVec(r, 2, -5, 5), randVec(r, 2, -5, 5), randVec(r, 2, -5, 5)];
          const u = sub(pts[1], pts[0]);
          const v = sub(pts[2], pts[0]);
          const d = det([u, v]);
          if (d.isZero()) continue;
          const area = new Q(Math.abs(d.n), 2 * d.d);
          return {
            prompt: `Find the area of the triangle with vertices $${pts.map(ptTex).join('$, $')}$.`,
            answer: num(area),
            solution: [
              `Edge vectors from the first vertex: $${ptTex(u)}$ and $${ptTex(v)}$.`,
              `Area $= \\frac12\\left|\\det${matTex([u, v])}\\right| = \\frac12|${d.tex()}| = ${area.tex()}$.`,
            ],
          };
        }
      },
    },
    {
      name: "Cramer's rule, 2×2",
      generate(r) {
        for (;;) {
          const A = randMat(r, 2, 2, -6, 6);
          const b = randVec(r, 2, -9, 9);
          const d = det(A);
          if (d.isZero()) continue;
          const Ax = A.map((row, i) => [b[i], row[1]]);
          const x = det(Ax).div(d);
          return {
            prompt: `Use Cramer's rule to find $x$: $$\\begin{aligned} ${sum([t(A[0][0], 'x'), t(A[0][1], 'y')]).tex} &= ${b[0].tex()} \\\\ ${sum([t(A[1][0], 'x'), t(A[1][1], 'y')]).tex} &= ${b[1].tex()} \\end{aligned}$$`,
            answer: num(x),
            solution: [`$x = \\dfrac{\\det A_x}{\\det A}$, where $A_x$ has the right-hand side in the first column.`, `$\\det A = ${d.tex()}$, $\\det A_x = \\det${matTex(Ax)} = ${det(Ax).tex()}$, so $x = ${x.tex()}$.`],
          };
        }
      },
    },
    {
      name: 'volumes and 3×3 systems',
      generate(r) {
        if (r.next() < 0.5) {
          for (;;) {
            const vs = [randVec(r, 3, -3, 3), randVec(r, 3, -3, 3), randVec(r, 3, -3, 3)];
            const d = det(vs);
            if (d.isZero()) continue;
            return {
              prompt: `Find the volume of the parallelepiped spanned by $${vs.map(vecTex).join('$, $')}$.`,
              answer: num(new Q(Math.abs(d.value()))),
              solution: [`Volume $= |\\det[\\mathbf u\\ \\mathbf v\\ \\mathbf w]| = |${d.tex()}| = ${Math.abs(d.value())}$.`],
            };
          }
        }
        for (;;) {
          const A = randMat(r, 3, 3, -3, 3);
          const b = randVec(r, 3, -6, 6);
          const d = det(A);
          if (d.isZero()) continue;
          const Ay = A.map((row, i) => [row[0], b[i], row[2]]);
          const y = det(Ay).div(d);
          const rows = A.map((row, i) => `${sum([t(row[0], 'x'), t(row[1], 'y'), t(row[2], 'z')]).tex} &= ${b[i].tex()}`).join(' \\\\ ');
          return {
            prompt: `Use Cramer's rule to find $y$: $$\\begin{aligned} ${rows} \\end{aligned}$$`,
            answer: num(y),
            solution: [`$y = \\dfrac{\\det A_y}{\\det A}$ with the right-hand side replacing the second column.`, `$\\det A = ${d.tex()}$, $\\det A_y = ${det(Ay).tex()}$, so $y = ${y.tex()}$.`],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      '$|\\det|$ of the matrix of edge vectors is the area (2D) or volume (3D) they span; a triangle is half a parallelogram. Cramer\'s rule: if $\\det A \\ne 0$, the $i$-th unknown of $A\\mathbf x = \\mathbf b$ is $\\det A_i / \\det A$, where $A_i$ is $A$ with column $i$ replaced by $\\mathbf b$.',
    resources: [tb1b('cramers-rule', "Cramer's rule, explained geometrically"), wiki('Cramer%27s_rule', "Cramer's rule"), ila('determinants-volumes', 'Determinants and Volumes')],
  },
};

// ---------------------------------------------------------------------------

export const changeOfBasis: Skill = {
  id: 'la.basis',
  name: 'Change of basis',
  prereqs: ['la.independence'],
  levels: [
    {
      name: 'from coordinates to vector',
      generate(r) {
        for (;;) {
          const B = randMat(r, 2, 2, -4, 4);
          if (det(B).isZero()) continue;
          const c = randVec(r, 2, -4, 4);
          const v = matVec(B, c);
          const cols = transpose(B);
          return {
            prompt: `$\\mathcal B = \\left\\{${vecTex(cols[0])}, ${vecTex(cols[1])}\\right\\}$ and $[\\mathbf v]_{\\mathcal B} = ${vecTex(c)}$. Find $\\mathbf v$ in standard coordinates.`,
            answer: vecAns(v),
            solution: [`$\\mathbf v = ${c[0].tex()}\\mathbf b_1 ${c[1].n < 0 ? '-' : '+'} ${c[1].n < 0 ? c[1].neg().tex() : c[1].tex()}\\mathbf b_2 = ${vecTex(v)}$`],
          };
        }
      },
    },
    {
      name: 'from vector to coordinates',
      generate(r) {
        for (;;) {
          const B = randMat(r, 2, 2, -4, 4);
          if (det(B).isZero() || Math.abs(det(B).value()) > 8) continue;
          const v = randVec(r, 2, -6, 6);
          const c = matVec(inverse(B), v);
          const cols = transpose(B);
          return {
            prompt: `Find $[\\mathbf v]_{\\mathcal B}$ for $\\mathbf v = ${vecTex(v)}$ and $\\mathcal B = \\left\\{${vecTex(cols[0])}, ${vecTex(cols[1])}\\right\\}$.`,
            answer: vecAns(c),
            inputHint: 'Fractions are fine in cells.',
            solution: [`Solve $B\\mathbf c = \\mathbf v$: $\\mathbf c = B^{-1}\\mathbf v = ${matTex(inverse(B))}${vecTex(v)} = ${vecTex(c)}$.`],
          };
        }
      },
    },
    {
      name: 'change-of-basis matrix',
      generate(r) {
        for (;;) {
          const B = randMat(r, 2, 2, -3, 3);
          const C = unimodular(r, 2, 3, 3);
          if (det(B).isZero()) continue;
          const Pm = matMul(inverse(C), B);
          if (maxAbs(Pm) > 15) continue;
          const bc = transpose(B);
          const cc = transpose(C);
          return {
            prompt: `$\\mathcal B = \\left\\{${vecTex(bc[0])}, ${vecTex(bc[1])}\\right\\}$, $\\mathcal C = \\left\\{${vecTex(cc[0])}, ${vecTex(cc[1])}\\right\\}$. Find the matrix $P_{\\mathcal C \\leftarrow \\mathcal B}$ that converts $\\mathcal B$-coordinates into $\\mathcal C$-coordinates.`,
            answer: matrixAns(Pm),
            solution: [
              'Its columns are the $\\mathcal C$-coordinates of $\\mathbf b_1, \\mathbf b_2$, i.e. $P = C^{-1}B$ with the basis vectors as columns.',
              `$C^{-1} = ${matTex(inverse(C))}$, so $P = ${matTex(inverse(C))}${matTex(B)} = ${matTex(Pm)}$.`,
            ],
            selfCheck: () => isIdentity(matMul(inverse(B), matMul(C, Pm))),
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'If the basis vectors are the columns of $B$, then $\\mathbf v = B[\\mathbf v]_{\\mathcal B}$ and $[\\mathbf v]_{\\mathcal B} = B^{-1}\\mathbf v$. To convert from $\\mathcal B$- to $\\mathcal C$-coordinates multiply by $P_{\\mathcal C\\leftarrow\\mathcal B} = C^{-1}B$, whose columns are the $\\mathcal C$-coordinates of the $\\mathcal B$ basis vectors.',
    resources: [tb1b('change-of-basis', 'Change of basis'), ila('bases-as-coord-systems', 'Bases as Coordinate Systems'), wiki('Change_of_basis', 'Change of basis')],
  },
};

// ---------------------------------------------------------------------------

const ORTHO_PAIRS: [number[], number[]][] = [
  [[1, 1], [1, -1]],
  [[1, 2], [-2, 1]],
  [[3, 4], [-4, 3]],
  [[1, 0], [0, 1]],
  [[2, 1], [1, -2]],
];

export const singularValues: Skill = {
  id: 'la.svd',
  name: 'Singular values',
  prereqs: ['la.eigen'],
  levels: [
    {
      name: 'orthogonal columns',
      generate(r) {
        const [u, v] = r.pick(ORTHO_PAIRS);
        const [s1, s2] = [r.int(1, 4), r.int(1, 4)];
        const A = mat([[s1 * u[0], s2 * v[0]], [s1 * u[1], s2 * v[1]]]);
        const n1 = s1 * s1 * (u[0] ** 2 + u[1] ** 2);
        const n2 = s2 * s2 * (v[0] ** 2 + v[1] ** 2);
        return {
          prompt: `Find the singular values of $${matTex(A)}$.`,
          answer: { kind: 'list', expected: [sqrtExpr(n1), sqrtExpr(n2)] },
          inputHint: 'Comma-separated, any order. sqrt(5) is fine.',
          solution: [
            `The columns are orthogonal, so $A^TA = \\operatorname{diag}(${n1}, ${n2})$.`,
            `Singular values are the square roots of the eigenvalues of $A^TA$: $${sqrtTex(n1)}$ and $${sqrtTex(n2)}$ (the column lengths).`,
          ],
        };
      },
    },
    {
      name: 'symmetric matrices',
      generate(r) {
        const a = r.int(-5, 6);
        const b = r.nz(-5, 5);
        const A = mat([[a, b], [b, a]]);
        const vals = [Math.abs(a + b), Math.abs(a - b)];
        return {
          prompt: `Find the singular values of $${matTex(A)}$.`,
          answer: { kind: 'list', expected: vals.map(String) },
          inputHint: 'Comma-separated, any order.',
          solution: [
            `$A$ is symmetric with eigenvalues $${a} \\pm ${P(b)}$, i.e. $${a + b}$ and $${a - b}$ (eigenvectors $(1, 1)$ and $(1, -1)$).`,
            `For a symmetric matrix the singular values are the absolute values of the eigenvalues: $${vals.join(',\\ ')}$.`,
          ],
        };
      },
    },
    {
      name: 'rank-one matrices',
      generate(r) {
        for (;;) {
          const u = randVec(r, 2, -3, 3);
          const v = randVec(r, r.int(2, 3), -3, 3);
          if (isZeroVec(u) || isZeroVec(v)) continue;
          const A = u.map((x) => v.map((y) => x.mul(y)));
          const N = dot(u, u).value() * dot(v, v).value();
          return {
            prompt: `Find the singular values of $${matTex(A)}$.`,
            answer: { kind: 'list', expected: [sqrtExpr(N), '0'] },
            inputHint: 'Comma-separated, any order.',
            solution: [
              `Every row is a multiple of $${ptTex(v)}$: $A = \\mathbf u\\mathbf v^T$ with $\\mathbf u = ${ptTex(u)}$. Rank one, so one singular value is $0$.`,
              `The other is $\\|\\mathbf u\\|\\|\\mathbf v\\| = \\sqrt{${dot(u, u).value()}}\\sqrt{${dot(v, v).value()}} = ${sqrtTex(N)}$.`,
            ],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'Every matrix factors as $A = U\\Sigma V^T$ with orthogonal $U, V$ and non-negative diagonal $\\Sigma$. The singular values on the diagonal are the square roots of the eigenvalues of $A^TA$. Special cases: orthogonal columns give the column lengths; a symmetric matrix gives $|\\lambda|$; a rank-one $\\mathbf u\\mathbf v^T$ gives $\\|\\mathbf u\\|\\|\\mathbf v\\|$ and zeros. SVD underlies PCA, compression and least squares.',
    resources: [wiki('Singular_value_decomposition', 'Singular value decomposition'), strang],
  },
};

// ---------------------------------------------------------------------------

const ROT: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
];

export const projections: Skill = {
  id: 'la.projmat',
  name: 'Projection and orthogonal matrices',
  prereqs: ['la.orthogonal'],
  levels: [
    {
      name: 'orthogonal or not?',
      generate(r) {
        const [a, b, c] = r.pick(ROT);
        const want = r.next() < 0.5;
        const s = r.sign();
        const good: Mat[] = [
          mat([[new Q(a, c), new Q(-b, c)], [new Q(b, c), new Q(a, c)]]),
          mat([[new Q(a, c), new Q(b, c)], [new Q(b, c), new Q(-a, c)]]),
          mat([[0, s, 0], [0, 0, 1], [-s, 0, 0]]),
        ];
        const bad: Mat[] = [
          mat([[new Q(a, c), new Q(b, c)], [new Q(b, c), new Q(a, c)]]),
          mat([[a, -b], [b, a]]),
          mat([[1, 1, 0], [0, 1, 0], [0, 0, 1]]),
        ];
        const Qm = r.pick(want ? good : bad);
        const QtQ = matMul(transpose(Qm), Qm);
        return {
          prompt: `Is $${matTex(Qm)}$ an orthogonal matrix?`,
          answer: { kind: 'choice', options: ['Yes', 'No'], correct: isIdentity(QtQ) ? 0 : 1 },
          solution: [`Check $Q^TQ = I$ (orthonormal columns): $Q^TQ = ${matTex(QtQ)}$.`, isIdentity(QtQ) ? 'It is the identity, so yes.' : 'It is not the identity, so no.'],
        };
      },
    },
    {
      name: 'projection onto a line',
      generate(r) {
        for (;;) {
          const a = randVec(r, r.int(2, 3), -3, 3);
          if (isZeroVec(a)) continue;
          const aa = dot(a, a);
          const Pm = a.map((x) => a.map((y) => x.mul(y).div(aa)));
          return {
            prompt: `Find the matrix of orthogonal projection onto the line spanned by $${vecTex(a)}$.`,
            answer: matrixAns(Pm),
            inputHint: 'Fractions are fine in cells.',
            solution: [`$P = \\dfrac{\\mathbf a\\mathbf a^T}{\\mathbf a^T\\mathbf a}$ with $\\mathbf a^T\\mathbf a = ${aa.tex()}$.`, `$P = ${matTex(Pm)}$`],
            selfCheck: () => matMul(Pm, Pm).every((row, i) => row.every((x, j) => x.eq(Pm[i][j]))),
          };
        }
      },
    },
    {
      name: 'projection onto a plane',
      generate(r) {
        for (;;) {
          const A = randMat(r, 3, 2, -2, 2);
          const AtA = matMul(transpose(A), A);
          if (det(AtA).isZero()) continue;
          const Pm = matMul(matMul(A, inverse(AtA)), transpose(A));
          return {
            prompt: `Find the matrix of orthogonal projection onto the column space of $A = ${matTex(A)}$.`,
            answer: matrixAns(Pm),
            inputHint: 'Fractions are fine in cells.',
            solution: [`$P = A(A^TA)^{-1}A^T$. Here $A^TA = ${matTex(AtA)}$ and $(A^TA)^{-1} = ${matTex(inverse(AtA))}$.`, `$P = ${matTex(Pm)}$`],
            selfCheck: () => matMul(Pm, Pm).every((row, i) => row.every((x, j) => x.eq(Pm[i][j]))),
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'An orthogonal matrix has orthonormal columns: $Q^TQ = I$, so $Q^{-1} = Q^T$ and lengths and angles are preserved (rotations and reflections). Orthogonal projection onto the line through $\\mathbf a$ is $P = \\frac{\\mathbf a\\mathbf a^T}{\\mathbf a^T\\mathbf a}$; onto the column space of $A$ it is $P = A(A^TA)^{-1}A^T$. Projections satisfy $P^2 = P$.',
    resources: [ila('projections', 'Orthogonal Projection'), wiki('Orthogonal_matrix', 'Orthogonal matrix'), strang],
  },
};
