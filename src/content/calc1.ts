// Calculus I: limits and continuity, derivatives, applications of derivatives.
// Existing sections keep their ids (progress is stored by id); each level now mixes several problem types.
import { Q } from '../core/frac';
import { coef, mono, poly, signed, st, sum, t } from '../core/fmt';
import type { Chapter, Problem, Rng, Skill } from '../core/types';
import { choice, diff, exact, expr, lim, mix, num, openstax, paul, tb1b } from './calc-helpers';
import { chain, extrema, implicit, lhopital, limits, power, product } from './calculus';
import { epsilonDelta, inverseDerivatives, optimization } from './calculus-deeper';
import { distinct, lin } from './helpers';
import { isDerivative, near, value } from './verify';

type Gen = (r: Rng) => Problem;

/** Value just to one side of a point, for numeric self-checks of limits. */
const at = (e: string, x: number) => value(e, { x });
const limNear = (e: string, a: number, want: number, h = 1e-6, tol = 1e-4) =>
  near(at(e, a + h), want, tol) && near(at(e, a - h), want, tol);
/** "(x + 3)" style factor for prompts and solutions. */
const fx = (a: number) => (a === 0 ? 'x' : `(${lin(a)})`);
const xn = (n: number) => (n === 1 ? 'x' : `x^{${n}}`);

// ---------------------------------------------------------------------------
// Limits: more ways to reach 0/0 and ∞/∞

const cancelLeading: Gen = (r) => {
  let a: number, c: number, p: number, q: number;
  do {
    a = r.int(-4, 4);
    c = r.int(-5, 5);
    p = r.pick([2, 3, -2, -3]);
    q = r.int(-5, 5);
  } while (c === a || p * c + q === 0 || p * a + q === 0);
  // (px + q)(x − a) over (x − a)(x − c)
  const n = poly([p, q - p * a, -q * a]);
  const d = poly([1, -(a + c), a * c]);
  const ans = new Q(p * a + q, a - c);
  return {
    prompt: `Evaluate $${lim(a)} \\frac{${n.tex}}{${d.tex}}$.`,
    answer: exact(ans),
    solution: [
      `At $x = ${a}$ both top and bottom are $0$, so $x ${signed(-a)}$ is a factor of each.`,
      `$\\dfrac{(${poly([p, q]).tex})${fx(a)}}{${fx(a)}${fx(c)}} = \\dfrac{${poly([p, q]).tex}}{${lin(c)}}$ for $x \\ne ${a}$.`,
      `Substitute: $\\dfrac{${p * a + q}}{${a - c}}${new Q(p * a + q, a - c).n === p * a + q && a - c > 0 ? '' : ` = ${ans.tex()}`}$`,
    ],
    selfCheck: () => limNear(`(${n.expr})/(${d.expr})`, a, ans.value()),
  };
};

const powerDifference: Gen = (r) => {
  const n = r.pick([3, 4]);
  const a = r.nz(-3, 3);
  const top = poly([1, ...Array(n - 1).fill(0), -(a ** n)]);
  const ans = new Q(n * a ** (n - 1));
  return {
    prompt: `Evaluate $${lim(a)} \\frac{${top.tex}}{${lin(a)}}$.`,
    answer: exact(ans),
    hint: n === 3 ? 'Factor a difference (or sum) of cubes.' : 'Factor $x^4 - a^4 = (x - a)(x^3 + ax^2 + a^2x + a^3)$.',
    solution: [
      `$x^{${n}} - a^{${n}} = (x - a)(${Array.from({ length: n }, (_, i) => `${i === 0 ? '' : 'a'}${i > 1 ? `^{${i}}` : ''}${n - 1 - i > 0 ? xn(n - 1 - i) : ''}`).join(' + ')})$ with $a = ${a}$.`,
      `Cancel $x ${signed(-a)}$; the remaining $${n}$ terms each tend to $a^{${n - 1}}$, so the limit is $${n}a^{${n - 1}} = ${ans.tex()}$.`,
      'Equivalently, this is the derivative of $x^n$ at $a$.',
    ],
    selfCheck: () => limNear(`(${top.expr})/(x-(${a}))`, a, ans.value()),
  };
};

const fractionDifference: Gen = (r) => {
  let a: number, b: number;
  do [a, b] = [r.int(-3, 4), r.int(-3, 3)];
  while (a + b === 0);
  const ans = new Q(-1, (a + b) ** 2);
  const inv = b === 0 ? '\\frac{1}{x}' : `\\frac{1}{${lin(-b)}}`;
  return {
    prompt: `Evaluate $${lim(a)} \\dfrac{${inv} - \\frac{1}{${a + b}}}{${lin(a)}}$.`,
    answer: exact(ans),
    solution: [
      `Combine the top over a common denominator: $\\dfrac{${a + b} - (${lin(-b)})}{${a + b}(${lin(-b)})} = \\dfrac{-(${lin(a)})}{${a + b}(${lin(-b)})}$.`,
      `Cancel $x ${signed(-a)}$: the expression is $\\dfrac{-1}{${a + b}(${lin(-b)})} \\to \\dfrac{-1}{${(a + b) ** 2}}$.`,
    ],
    selfCheck: () => limNear(`(1/(x+${b}) - 1/${a + b})/(x-(${a}))`, a, ans.value()),
  };
};

const sqrtMinusX: Gen = (r) => {
  const b = r.nz(-8, 8);
  const c = r.int(-6, 9);
  const inside = poly([1, b, c]);
  const ans = new Q(b, 2);
  return {
    prompt: `Evaluate $${lim('\\infty')} \\left(\\sqrt{${inside.tex}} - x\\right)$.`,
    answer: exact(ans),
    hint: 'This is $\\infty - \\infty$: multiply and divide by the conjugate.',
    solution: [
      `Multiply by $\\dfrac{\\sqrt{${inside.tex}} + x}{\\sqrt{${inside.tex}} + x}$: the numerator becomes $${poly([b, c]).tex}$.`,
      `Divide top and bottom by $x$: $\\dfrac{${b} ${c ? `${signed(c)}/x` : ''}}{\\sqrt{1 ${signed(b)}/x ${c ? `${signed(c)}/x^2` : ''}} + 1} \\to ${ans.tex()}$`,
    ],
    selfCheck: () => near(at(`sqrt(${inside.expr}) - x`, 1e6), ans.value(), 1e-4),
  };
};

const sqrtOverLinear: Gen = (r) => {
  const a = r.int(1, 4);
  const b = r.int(1, 9);
  const c = r.nz(-5, 5);
  const d = r.int(-6, 6);
  const neg = r.next() < 0.5;
  const ans = new Q(neg ? -a : a, c);
  const top = poly([a * a, 0, b]);
  return {
    prompt: `Evaluate $${lim(neg ? '-\\infty' : '\\infty')} \\frac{\\sqrt{${top.tex}}}{${poly([c, d]).tex}}$.`,
    answer: exact(ans),
    hint: neg ? 'Careful: for negative $x$, $\\sqrt{x^2} = |x| = -x$.' : undefined,
    solution: [
      `Factor $x^2$ out of the root: $\\sqrt{${top.tex}} = |x|\\sqrt{${a * a} + ${b}/x^2}$, and $\\sqrt{${a * a}} = ${a}$.`,
      neg ? `As $x \\to -\\infty$, $|x| = -x$, so the ratio tends to $\\dfrac{-${a}}{${c}} = ${ans.tex()}$.` : `As $x \\to \\infty$, $|x| = x$, so the ratio tends to $\\dfrac{${a}}{${c}} = ${ans.tex()}$.`,
    ],
    selfCheck: () => near(at(`sqrt(${top.expr})/(${c}*x+${d})`, neg ? -1e7 : 1e7), ans.value(), 1e-5),
  };
};

const expRatio: Gen = (r) => {
  const [p, rr, s] = [r.nz(-5, 5), r.nz(-5, 5), r.nz(-5, 5)];
  const q = r.int(-6, 6);
  const k = r.int(1, 3);
  const toInf = r.next() < 0.5;
  const ans = toInf ? new Q(p, rr) : new Q(q, s);
  const e = `e^{${coef(k)}x}`;
  return {
    prompt: `Evaluate $${lim(toInf ? '\\infty' : '-\\infty')} \\frac{${coef(p)}${e} ${signed(q)}}{${coef(rr)}${e} ${signed(s)}}$.`,
    answer: exact(ans),
    solution: toInf
      ? [`As $x \\to \\infty$, $${e}$ dominates: divide top and bottom by it.`, `$\\dfrac{${p} + ${q}e^{-${coef(k)}x}}{${rr} + ${s}e^{-${coef(k)}x}} \\to \\dfrac{${p}}{${rr}} = ${ans.tex()}$`]
      : [`As $x \\to -\\infty$, $${e} \\to 0$.`, `So the limit is $\\dfrac{${q}}{${s}} = ${ans.tex()}$.`],
    selfCheck: () => near(at(`(${p}*exp(${k}*x)+${q})/(${rr}*exp(${k}*x)+${s})`, toInf ? 40 : -40), ans.value(), 1e-6),
  };
};

const sqrtAtSquare: Gen = (r) => {
  const m = r.int(1, 5);
  const ans = new Q(1, 2 * m);
  return {
    prompt: `Evaluate $${lim(m * m)} \\frac{\\sqrt{x} - ${m}}{x - ${m * m}}$.`,
    answer: exact(ans),
    solution: [
      `Factor the bottom as a difference of squares: $x - ${m * m} = (\\sqrt{x} - ${m})(\\sqrt{x} + ${m})$.`,
      `Cancel: $\\dfrac{1}{\\sqrt{x} + ${m}} \\to \\dfrac{1}{${2 * m}}$`,
    ],
    selfCheck: () => limNear(`(sqrt(x)-${m})/(x-${m * m})`, m * m, ans.value()),
  };
};

const sqrtLinearInside: Gen = (r) => {
  const a = r.int(1, 5);
  const k = r.nz(-6, 6);
  const ans = new Q(k, 2 * a);
  return {
    prompt: `Evaluate $${lim(0)} \\frac{\\sqrt{${a * a} ${st(k, 'x')}} - ${a}}{x}$.`,
    answer: exact(ans),
    solution: [
      `Multiply top and bottom by the conjugate $\\sqrt{${a * a} ${st(k, 'x')}} + ${a}$: the top becomes $${coef(k)}x$.`,
      `$\\dfrac{${k}}{\\sqrt{${a * a} ${st(k, 'x')}} + ${a}} \\to \\dfrac{${k}}{${2 * a}} = ${ans.tex()}$`,
    ],
    selfCheck: () => limNear(`(sqrt(${a * a}+${k}*x)-${a})/x`, 0, ans.value(), 1e-6),
  };
};

const rootInDenominator: Gen = (r) => {
  const m = r.int(1, 4);
  const a = r.int(-3, 5);
  const b = m * m - a;
  const ans = new Q(2 * m);
  return {
    prompt: `Evaluate $${lim(a)} \\frac{${lin(a)}}{\\sqrt{${lin(-b)}} - ${m}}$.`,
    answer: exact(ans),
    solution: [
      `Multiply by the conjugate $\\sqrt{${lin(-b)}} + ${m}$: the bottom becomes $(${lin(-b)}) - ${m * m} = ${lin(a)}$.`,
      `Cancel: $\\sqrt{${lin(-b)}} + ${m} \\to ${m} + ${m} = ${2 * m}$`,
    ],
    selfCheck: () => limNear(`(x-(${a}))/(sqrt(x+${b})-${m})`, a, ans.value()),
  };
};

const limitsDeep: Skill = {
  ...limits,
  levels: [
    { name: 'factor and cancel', generate: mix(limits.levels[0].generate, cancelLeading, powerDifference, fractionDifference) },
    { name: 'limits at infinity', generate: mix(limits.levels[1].generate, sqrtMinusX, sqrtOverLinear, expRatio) },
    { name: 'conjugates and roots', generate: mix(limits.levels[2].generate, sqrtAtSquare, sqrtLinearInside, rootInDenominator) },
  ],
  learn: {
    ...limits.learn,
    summary:
      'If direct substitution gives a number, that is the limit. If it gives $\\frac{0}{0}$, rewrite first: factor and cancel (including sums and differences of powers), combine fractions over a common denominator, or multiply by the conjugate when roots are involved. At infinity, divide by the dominant term: the highest power of $x$, or $e^{kx}$. Inside a root, $\\sqrt{x^2} = |x|$, which is $-x$ as $x \\to -\\infty$. For $\\infty - \\infty$ with roots, multiply by the conjugate first.',
  },
};

// ---------------------------------------------------------------------------
// Trigonometric limits and the squeeze theorem

const trigLimits: Skill = {
  id: 'calc.triglimits',
  name: 'Trigonometric limits and squeezing',
  prereqs: ['calc.limits'],
  levels: [
    {
      name: 'sin x over x',
      generate: mix(
        (r) => {
          const a = r.nz(-6, 6);
          const b = r.int(1, 6);
          const ans = new Q(a, b);
          return {
            prompt: `Evaluate $${lim(0)} \\frac{\\sin(${coef(a)}x)}{${coef(b)}x}$.`,
            answer: exact(ans),
            solution: [`Write it as $\\dfrac{${a}}{${b}}\\cdot\\dfrac{\\sin(${coef(a)}x)}{${coef(a)}x}$, and $\\dfrac{\\sin u}{u} \\to 1$ as $u \\to 0$.`, `Limit: $${ans.tex()}$`],
            selfCheck: () => limNear(`sin(${a}*x)/(${b}*x)`, 0, ans.value(), 1e-5),
          };
        },
        (r) => {
          const [a, b] = distinct(r, 2, 1, 7);
          const s = r.sign();
          const ans = new Q(s * a, b);
          return {
            prompt: `Evaluate $${lim(0)} \\frac{\\sin(${coef(s * a)}x)}{\\sin(${coef(b)}x)}$.`,
            answer: exact(ans),
            solution: [`Multiply and divide: $\\dfrac{\\sin(${coef(s * a)}x)}{${coef(s * a)}x}\\cdot\\dfrac{${coef(b)}x}{\\sin(${coef(b)}x)}\\cdot\\dfrac{${s * a}}{${b}}$.`, `The two fractions tend to $1$, so the limit is $${ans.tex()}$.`],
            selfCheck: () => limNear(`sin(${s * a}*x)/sin(${b}*x)`, 0, ans.value(), 1e-5),
          };
        },
        (r) => {
          const a = r.nz(-5, 5);
          const b = r.int(1, 6);
          const ans = new Q(a, b);
          return {
            prompt: `Evaluate $${lim(0)} \\frac{\\tan(${coef(a)}x)}{${coef(b)}x}$.`,
            answer: exact(ans),
            solution: [`$\\tan u = \\dfrac{\\sin u}{\\cos u}$, so $\\dfrac{\\tan(${coef(a)}x)}{${coef(b)}x} = \\dfrac{\\sin(${coef(a)}x)}{${coef(b)}x}\\cdot\\dfrac{1}{\\cos(${coef(a)}x)}$.`, `$\\to \\dfrac{${a}}{${b}} \\cdot 1 = ${ans.tex()}$`],
            selfCheck: () => limNear(`tan(${a}*x)/(${b}*x)`, 0, ans.value(), 1e-5),
          };
        },
        (r) => {
          const a = r.int(1, 6);
          const b = r.nz(-6, 6);
          const ans = new Q(b, a);
          return {
            prompt: `Evaluate $${lim(0)} \\frac{${coef(b)}x}{\\sin(${coef(a)}x)}$.`,
            answer: exact(ans),
            solution: [`Flip the standard limit: $\\dfrac{${coef(a)}x}{\\sin(${coef(a)}x)} \\to 1$ too.`, `So the limit is $\\dfrac{${b}}{${a}}${ans.d !== a || ans.n !== b ? ` = ${ans.tex()}` : ''}$.`],
            selfCheck: () => limNear(`${b}*x/sin(${a}*x)`, 0, ans.value(), 1e-5),
          };
        },
      ),
    },
    {
      name: 'cosine and squares',
      generate: mix(
        (r) => {
          const a = r.int(1, 5);
          const b = r.int(1, 4);
          const ans = new Q(a * a, 2 * b);
          return {
            prompt: `Evaluate $${lim(0)} \\frac{1 - \\cos(${coef(a)}x)}{${coef(b)}x^{2}}$.`,
            answer: exact(ans),
            hint: 'Multiply by $1 + \\cos$ to turn the top into $\\sin^2$.',
            solution: [
              `Multiply top and bottom by $1 + \\cos(${coef(a)}x)$: the top becomes $\\sin^2(${coef(a)}x)$.`,
              `$\\dfrac{\\sin^2(${coef(a)}x)}{${coef(b)}x^2}\\cdot\\dfrac{1}{1 + \\cos(${coef(a)}x)} \\to ${new Q(a * a, b).tex()}\\cdot\\dfrac12 = ${ans.tex()}$`,
            ],
            selfCheck: () => limNear(`(1-cos(${a}*x))/(${b}*x^2)`, 0, ans.value(), 1e-4, 1e-3),
          };
        },
        (r) => {
          const a = r.int(1, 5);
          const b = r.int(1, 6);
          const ans = new Q(a * a, b);
          return {
            prompt: `Evaluate $${lim(0)} \\frac{\\sin^{2}(${coef(a)}x)}{${coef(b)}x^{2}}$.`,
            answer: exact(ans),
            solution: [`$\\dfrac{\\sin^2(${coef(a)}x)}{x^2} = \\left(\\dfrac{\\sin(${coef(a)}x)}{x}\\right)^2 \\to ${a}^2$.`, b === 1 ? `So the limit is $${ans.tex()}$.` : `Divide by $${b}$: $${ans.tex()}$`],
            selfCheck: () => limNear(`sin(${a}*x)^2/(${b}*x^2)`, 0, ans.value(), 1e-5),
          };
        },
        (r) => {
          const a = r.int(1, 6);
          const k = r.nz(-4, 4);
          const ans = new Q(k, a);
          return {
            prompt: `Evaluate $${lim(0)} ${coef(k)}x\\cot(${coef(a)}x)$.`,
            answer: exact(ans),
            solution: [`$x\\cot(${coef(a)}x) = \\dfrac{x}{\\sin(${coef(a)}x)}\\cos(${coef(a)}x) \\to ${new Q(1, a).tex()}$.`, `Times $${k}$: $${ans.tex()}$`],
            selfCheck: () => limNear(`${k}*x*cos(${a}*x)/sin(${a}*x)`, 0, ans.value(), 1e-5),
          };
        },
        (r) => {
          const a = r.int(1, 4);
          const b = r.int(1, 4);
          const ans = new Q(a * a, 2 * b);
          return {
            prompt: `Evaluate $${lim(0)} \\frac{1 - \\cos(${coef(a)}x)}{x\\sin(${coef(b)}x)}$.`,
            answer: exact(ans),
            solution: [
              `Split: $\\dfrac{1 - \\cos(${coef(a)}x)}{x^2}\\cdot\\dfrac{x}{\\sin(${coef(b)}x)}$.`,
              `The first factor tends to $\\dfrac{${a * a}}{2}$, the second to $\\dfrac{1}{${b}}$: limit $${ans.tex()}$.`,
            ],
            selfCheck: () => limNear(`(1-cos(${a}*x))/(x*sin(${b}*x))`, 0, ans.value(), 1e-4, 1e-3),
          };
        },
      ),
    },
    {
      name: 'squeeze and infinity',
      generate: mix(
        (r) => {
          const n = r.int(1, 3);
          const fn = r.pick(['sin', 'cos']);
          return {
            prompt: `Evaluate $${lim(0)} ${xn(n)}\\${fn}\\left(\\frac{1}{x}\\right)$.`,
            answer: exact(new Q(0)),
            hint: `$\\${fn}$ of anything stays between $-1$ and $1$.`,
            solution: [
              `$\\${fn}(1/x)$ oscillates and has no limit, but it is bounded: $-|x|^{${n}} \\le ${xn(n)}\\${fn}(1/x) \\le |x|^{${n}}$.`,
              'Both bounds tend to $0$, so by the squeeze theorem the limit is $0$.',
            ],
          };
        },
        (r) => {
          const a = r.nz(-6, 6);
          const k = r.int(1, 4);
          return {
            prompt: `Evaluate $${lim('\\infty')} \\frac{\\sin(${coef(a)}x)}{${coef(k)}x}$.`,
            answer: exact(new Q(0)),
            solution: [`The top stays between $-1$ and $1$ while the bottom grows without bound.`, `$-\\frac{1}{${k}x} \\le \\frac{\\sin(${coef(a)}x)}{${coef(k)}x} \\le \\frac{1}{${k}x}$, and both bounds tend to $0$.`],
          };
        },
        (r) => {
          const a = r.nz(-6, 6);
          return {
            prompt: `Evaluate $${lim('\\infty')} x\\sin\\left(\\frac{${a}}{x}\\right)$.`,
            answer: exact(new Q(a)),
            solution: [`Substitute $u = \\frac{${a}}{x} \\to 0$: $x\\sin\\frac{${a}}{x} = ${a}\\cdot\\dfrac{\\sin u}{u}$.`, `$\\to ${a}$`],
            selfCheck: () => near(at(`x*sin(${a}/x)`, 1e5), a, 1e-6),
          };
        },
        (r) => {
          const a = r.int(1, 6);
          const ans = new Q(a * a, 2);
          return {
            prompt: `Evaluate $${lim('\\infty')} x^{2}\\left(1 - \\cos\\frac{${a}}{x}\\right)$.`,
            answer: exact(ans),
            solution: [`Substitute $u = \\frac{${a}}{x} \\to 0$: $x^2 = \\frac{${a * a}}{u^2}$, so the expression is $${a * a}\\cdot\\dfrac{1 - \\cos u}{u^2}$.`, `$\\dfrac{1 - \\cos u}{u^2} \\to \\dfrac12$, so the limit is $${ans.tex()}$.`],
            selfCheck: () => near(at(`x^2*(1-cos(${a}/x))`, 1e3), ans.value(), 1e-4),
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'The key fact is $\\lim_{u\\to 0}\\frac{\\sin u}{u} = 1$; rearrange so that each $\\sin(\\square)$ is divided by the same $\\square$. From it: $\\frac{\\tan u}{u} \\to 1$ and $\\frac{1 - \\cos u}{u^2} \\to \\frac12$ (multiply by $1 + \\cos u$). Squeeze theorem: if $g \\le f \\le h$ and $g$, $h$ have the same limit, so does $f$; it handles bounded oscillation like $x\\sin\\frac1x$. At infinity, substitute $u = \\frac{a}{x}$ to bring the limit back to $0$.',
    resources: [
      paul('CalcI/ComputingLimits.aspx', 'Computing Limits (squeeze theorem)'),
      openstax(1, '2-3-the-limit-laws', 'The Limit Laws (trigonometric limits)'),
      { kind: 'article', title: 'Wikipedia: Squeeze theorem', url: 'https://en.wikipedia.org/wiki/Squeeze_theorem' },
    ],
  },
};

// ---------------------------------------------------------------------------
// One-sided limits and continuity

const cases = (left: string, right: string, a: number, strictLeft = true) =>
  `\\begin{cases} ${left} & x ${strictLeft ? '<' : '\\le'} ${a} \\\\ ${right} & x ${strictLeft ? '\\ge' : '>'} ${a} \\end{cases}`;

const INF = ['$\\infty$', '$-\\infty$', 'Neither: the one-sided limits disagree'];
const KINDS = ['Removable', 'Jump', 'Infinite'];

const continuity: Skill = {
  id: 'calc.continuity',
  name: 'One-sided limits and continuity',
  prereqs: ['calc.limits'],
  levels: [
    {
      name: 'one-sided limits',
      generate: mix(
        (r) => {
          const a = r.nz(-4, 4);
          const right = r.next() < 0.5;
          const ans = new Q(right ? 2 * a : -2 * a);
          return {
            prompt: `Evaluate $\\displaystyle\\lim_{x\\to ${a}^${right ? '+' : '-'}} \\frac{${poly([1, 0, -a * a]).tex}}{|${lin(a)}|}$.`,
            answer: exact(ans),
            solution: [
              `Factor: $\\dfrac{${fx(a)}${fx(-a)}}{|${lin(a)}|}$. ${right ? `For $x > ${a}$, $|${lin(a)}| = ${lin(a)}$` : `For $x < ${a}$, $|${lin(a)}| = -(${lin(a)})$`}.`,
              `So the expression is $${right ? '' : '-'}(${lin(-a)}) \\to ${ans.tex()}$.`,
            ],
            selfCheck: () => near(at(`(x^2-${a * a})/abs(x-(${a}))`, a + (right ? 1e-7 : -1e-7)), ans.value(), 1e-5),
          };
        },
        (r) => {
          let a: number, p: number, q: number, c: number, d: number;
          do [a, p, q, c, d] = [r.int(-2, 3), r.nz(-4, 4), r.int(-5, 5), r.nz(-3, 3), r.int(-5, 5)];
          while (p * a + q === c * a * a + d);
          const left = r.next() < 0.5;
          const ans = new Q(left ? p * a + q : c * a * a + d);
          return {
            prompt: `$f(x) = ${cases(poly([p, q]).tex, poly([c, 0, d]).tex, a)}$. Find $\\displaystyle\\lim_{x\\to ${a}^${left ? '-' : '+'}} f(x)$.`,
            answer: num(ans),
            solution: [
              `Approaching from the ${left ? 'left' : 'right'}, only the piece for $x ${left ? '<' : '>'} ${a}$ matters: $${left ? poly([p, q]).tex : poly([c, 0, d]).tex}$.`,
              `Substitute $x = ${a}$: $${ans.tex()}$. (The other side gives $${left ? c * a * a + d : p * a + q}$, so the two-sided limit does not exist.)`,
            ],
          };
        },
        (r) => {
          const k = r.nz(-6, 6);
          const m = r.int(1, 4);
          const left = r.next() < 0.5;
          const ans = left ? new Q(k, m) : new Q(0);
          return {
            prompt: `Evaluate $\\displaystyle\\lim_{x\\to 0^${left ? '-' : '+'}} \\frac{${k}}{${m} + e^{1/x}}$.`,
            answer: exact(ans),
            solution: [
              left ? 'As $x \\to 0^-$, $\\frac1x \\to -\\infty$, so $e^{1/x} \\to 0$.' : 'As $x \\to 0^+$, $\\frac1x \\to \\infty$, so $e^{1/x} \\to \\infty$.',
              left ? `The limit is $\\dfrac{${k}}{${m}}${ans.d !== m || ans.n !== k ? ` = ${ans.tex()}` : ''}$.` : 'The denominator blows up, so the limit is $0$.',
            ],
            selfCheck: () => near(at(`${k}/(${m}+exp(1/x))`, left ? -0.01 : 0.01), ans.value(), 1e-6),
          };
        },
      ),
    },
    {
      name: 'make it continuous',
      generate: mix(
        (r) => {
          let a: number, b: number, c: number;
          do [a, b, c] = [r.pick([-2, -1, 2, 3]), r.int(-5, 5), r.nz(-3, 3)];
          while (c * a * a - b === 0);
          const k = new Q(c * a * a - b, a - 1);
          return {
            prompt: `For which $k$ is $f(x) = ${cases(`kx ${signed(b)}`, `${coef(c)}x^{2} + k`, a)}$ continuous everywhere?`,
            answer: num(k),
            solution: [
              `Each piece is continuous; only $x = ${a}$ can break. The two pieces must agree there.`,
              `$${a}k ${signed(b)} = ${c * a * a} + k \\Rightarrow ${a - 1 === 1 ? '' : a - 1 === -1 ? '-' : a - 1}k = ${c * a * a - b}$, so $k = ${k.tex()}$.`,
            ],
            selfCheck: () => k.mul(a).add(b).eq(k.add(c * a * a)),
          };
        },
        (r) => {
          let a: number, c: number;
          do [a, c] = [r.int(-4, 4), r.int(-5, 5)];
          while (a === -c);
          const n = poly([1, c - a, -a * c]);
          return {
            prompt: `$f(x) = \\dfrac{${n.tex}}{${lin(a)}}$ for $x \\ne ${a}$, and $f(${a}) = k$. Which $k$ makes $f$ continuous at $${a}$?`,
            answer: num(new Q(a + c)),
            solution: [`$f(${a})$ must equal the limit. Factor: $\\dfrac{${fx(a)}${fx(-c)}}{${lin(a)}} = ${lin(-c)}$ for $x \\ne ${a}$.`, `Limit: $${a} ${signed(c)} = ${a + c}$, so $k = ${a + c}$.`],
          };
        },
        (r) => {
          const k = r.nz(-6, 6);
          const top = r.pick([
            { tex: `\\sin(${coef(k)}x)`, why: `$\\dfrac{\\sin(${coef(k)}x)}{x} \\to ${k}$ (standard limit).` },
            { tex: `e^{${coef(k)}x} - 1`, why: `$\\dfrac{e^{${coef(k)}x} - 1}{x} \\to ${k}$: it is the derivative of $e^{${coef(k)}x}$ at $0$.` },
          ]);
          return {
            prompt: `$f(x) = \\dfrac{${top.tex}}{x}$ for $x \\ne 0$, and $f(0) = c$. Which $c$ makes $f$ continuous?`,
            answer: num(new Q(k)),
            solution: [top.why, `So $c = ${k}$.`],
          };
        },
      ),
    },
    {
      name: 'infinite limits and discontinuities',
      generate: mix(
        (r) => {
          const a = r.int(-3, 3);
          const n = r.int(1, 3);
          const c = r.nz(-5, 5);
          const side = r.pick(['+', '-', '']);
          // sign of c/(x−a)^n just to the right is sign(c); to the left sign(c)·(−1)^n.
          const rightSign = Math.sign(c);
          const leftSign = Math.sign(c) * (n % 2 ? -1 : 1);
          const s = side === '+' ? rightSign : side === '-' ? leftSign : leftSign === rightSign ? rightSign : 0;
          const correct = s > 0 ? 0 : s < 0 ? 1 : 2;
          const den = n === 1 ? lin(a) : `(${lin(a)})^{${n}}`;
          return {
            prompt: `Find $\\displaystyle\\lim_{x\\to ${a}${side ? `^${side}` : ''}} \\frac{${c}}{${den}}$.`,
            answer: choice(INF, correct),
            solution: [
              `Near $${a}$ the bottom tends to $0$ and the top to $${c}$, so the size blows up; only the sign matters.`,
              `Just right of $${a}$: $${lin(a)} > 0$, sign $${rightSign > 0 ? '+' : '-'}$. Just left: $${lin(a)} < 0$, raised to the power ${n} gives sign $${leftSign > 0 ? '+' : '-'}$.`,
              correct === 2 ? 'The sides disagree, so there is no two-sided limit (not even $\\pm\\infty$).' : `So the limit is $${correct === 0 ? '' : '-'}\\infty$.`,
            ],
          };
        },
        (r) => {
          const [a, b] = distinct(r, 2, -4, 4);
          const pool = [
            { tex: `\\dfrac{${poly([1, 0, -a * a]).tex}}{${lin(a)}}`, at: a, k: 0, why: `It equals $${lin(-a)}$ except at $${a}$: the limit exists, the function just has a hole.` },
            { tex: `\\dfrac{${lin(b)}}{${fx(a)}${fx(b)}}`, at: b, k: 0, why: `$${lin(b)}$ cancels, leaving $\\frac{1}{${lin(a)}}$, which is finite at $${b}$: a hole.` },
            { tex: `\\dfrac{${lin(b)}}{${fx(a)}${fx(b)}}`, at: a, k: 2, why: `At $${a}$ the bottom vanishes but the top does not: a vertical asymptote.` },
            { tex: `\\dfrac{|${lin(a)}|}{${lin(a)}}`, at: a, k: 1, why: 'It is $1$ on the right and $-1$ on the left: both one-sided limits exist but differ.' },
            { tex: `\\dfrac{1}{(${lin(a)})^{2}}`, at: a, k: 2, why: `It tends to $\\infty$ from both sides of $${a}$.` },
            { tex: '\\dfrac{\\sin x}{x}', at: 0, k: 0, why: '$\\frac{\\sin x}{x} \\to 1$; only the value at $0$ is missing.' },
            { tex: `\\lfloor x \\rfloor`, at: a, k: 1, why: `The floor function steps from $${a - 1}$ to $${a}$ at $x = ${a}$.` },
          ];
          const p = r.pick(pool);
          return {
            prompt: `What kind of discontinuity does $f(x) = ${p.tex}$ have at $x = ${p.at}$?`,
            answer: choice(KINDS, p.k),
            solution: [p.why, 'Removable: the limit exists. Jump: one-sided limits exist but differ. Infinite: the function blows up.'],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      '$\\lim_{x\\to a^-}$ and $\\lim_{x\\to a^+}$ approach from one side only; the two-sided limit exists exactly when both exist and agree. $f$ is continuous at $a$ when $\\lim_{x\\to a} f(x) = f(a)$. For piecewise functions, compute each side from its own piece. Discontinuities are removable (limit exists, value wrong or missing), jumps (sides disagree) or infinite (vertical asymptote: sign analysis decides $\\pm\\infty$).',
    resources: [
      paul('CalcI/OneSidedLimits.aspx', 'One-Sided Limits'),
      paul('CalcI/Continuity.aspx', 'Continuity'),
      paul('CalcI/InfiniteLimits.aspx', 'Infinite Limits'),
      openstax(1, '2-4-continuity', 'Continuity'),
    ],
  },
};

// ---------------------------------------------------------------------------
// Derivatives: wider levels

const simplifyFirst: Gen = (r) => {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const [a, b] = [r.nz(-4, 4), r.nz(-5, 5)];
    const d = sum([t(new Q(5 * a, 2), 'x^{3/2}', 'x^(3/2)'), t(new Q(b, 2), 'x^{-1/2}', 'x^(-1/2)')]);
    return {
      prompt: diff(`\\dfrac{${sum([mono(a, 3), mono(b, 1)]).tex}}{\\sqrt{x}}`),
      answer: expr(d.expr, d.tex),
      solution: [`Divide first: $f(x) = ${coef(a)}x^{5/2} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x^{1/2}$. No quotient rule needed.`, `$f'(x) = ${d.tex}$`],
      selfCheck: () => isDerivative(`(${a}*x^3+${b}*x)/sqrt(x)`, d.expr),
    };
  }
  if (kind === 1) {
    const a = r.nz(-5, 5);
    const d = `1 + ${a}/sqrt(x)`;
    return {
      prompt: diff(`(\\sqrt{x} ${signed(a)})^{2}`),
      answer: expr(d, `1 ${a < 0 ? '-' : '+'} \\dfrac{${Math.abs(a)}}{\\sqrt{x}}`),
      solution: [`Expand: $f(x) = x ${signed(2 * a)}\\sqrt{x} + ${a * a}$.`, `$f'(x) = 1 + ${P2(2 * a)}\\cdot\\frac{1}{2\\sqrt{x}} = 1 ${a < 0 ? '-' : '+'} \\dfrac{${Math.abs(a)}}{\\sqrt{x}}$`],
      selfCheck: () => isDerivative(`(sqrt(x)+${a})^2`, d),
    };
  }
  const [a, n] = [r.nz(-6, 6), r.int(2, 3)];
  const d = `${-n * a}*x^(${-n - 1})`;
  return {
    prompt: diff(`\\dfrac{${xn(n)} ${signed(a)}}{${xn(n)}}`),
    answer: expr(d, `${-n * a}x^{${-n - 1}}`),
    solution: [`Split the fraction: $f(x) = 1 ${signed(a)}x^{-${n}}$.`, `$f'(x) = ${-n * a}x^{${-n - 1}}$`],
    selfCheck: () => isDerivative(`(x^${n}+${a})/x^${n}`, d),
  };
};
const P2 = (n: number) => (n < 0 ? `(${n})` : `${n}`);

const productMore: Gen = (r) => {
  const kind = r.int(0, 3);
  if (kind === 0) {
    const n = r.int(2, 4);
    const d = `exp(x)*(${n}*x^${n - 1} + x^${n})`;
    return {
      prompt: diff(`${xn(n)}e^{x}`),
      answer: expr(d, `e^{x}(${n}${xn(n - 1)} + ${xn(n)})`),
      solution: [`$u = ${xn(n)}$, $v = e^x$: $u' = ${n}${xn(n - 1)}$, $v' = e^x$.`, `$f'(x) = ${n}${xn(n - 1)}e^{x} + ${xn(n)}e^{x} = e^{x}(${n}${xn(n - 1)} + ${xn(n)})$`],
      selfCheck: () => isDerivative(`x^${n}*exp(x)`, d),
    };
  }
  if (kind === 1) {
    const n = r.int(2, 4);
    const d = `x^${n - 1}*(${n}*log(x) + 1)`;
    return {
      prompt: diff(`${xn(n)}\\ln x`),
      answer: expr(d, `${xn(n - 1)}(${n}\\ln x + 1)`),
      solution: [`$u = ${xn(n)}$, $v = \\ln x$: $u' = ${n}${xn(n - 1)}$, $v' = \\frac{1}{x}$.`, `$f'(x) = ${n}${xn(n - 1)}\\ln x + ${xn(n - 1)} = ${xn(n - 1)}(${n}\\ln x + 1)$`],
      selfCheck: () => isDerivative(`x^${n}*log(x)`, d),
    };
  }
  if (kind === 2) {
    const fn = r.pick(['sin', 'cos']);
    const d = fn === 'sin' ? 'exp(x)*(sin(x)+cos(x))' : 'exp(x)*(cos(x)-sin(x))';
    return {
      prompt: diff(`e^{x}\\${fn} x`),
      answer: expr(d, fn === 'sin' ? 'e^{x}(\\sin x + \\cos x)' : 'e^{x}(\\cos x - \\sin x)'),
      solution: [`$u = e^x$, $v = \\${fn} x$: both derivatives are easy.`, `$f'(x) = ${fn === 'sin' ? 'e^{x}\\sin x + e^{x}\\cos x' : 'e^{x}\\cos x - e^{x}\\sin x'}$`],
      selfCheck: () => isDerivative(`exp(x)*${fn}(x)`, d),
    };
  }
  const a = r.nz(-4, 4);
  const d = `${a}*(cos(x)^2 - sin(x)^2)`;
  return {
    prompt: diff(`${coef(a)}\\sin x\\cos x`),
    answer: expr(d, `${coef(a)}(\\cos^{2} x - \\sin^{2} x)`),
    inputHint: 'Write powers of trig as cos(x)^2.',
    solution: [`$u = \\sin x$, $v = \\cos x$: $u'v + uv' = \\cos^2 x - \\sin^2 x$ (which is $\\cos 2x$).`, `$f'(x) = ${coef(a)}(\\cos^{2} x - \\sin^{2} x)$`],
    selfCheck: () => isDerivative(`${a}*sin(x)*cos(x)`, d),
  };
};

const quotientMore: Gen = (r) => {
  const kind = r.int(0, 3);
  if (kind === 0) {
    const a = r.int(1, 9);
    const d = `(${a} - x^2)/(x^2+${a})^2`;
    return {
      prompt: diff(`\\dfrac{x}{x^{2} + ${a}}`),
      answer: expr(d, `\\dfrac{${a} - x^{2}}{(x^{2} + ${a})^{2}}`),
      solution: [`$\\dfrac{1\\cdot(x^2 + ${a}) - x\\cdot 2x}{(x^2 + ${a})^2}$`, `$= \\dfrac{${a} - x^{2}}{(x^{2} + ${a})^{2}}$`],
      selfCheck: () => isDerivative(`x/(x^2+${a})`, d),
    };
  }
  if (kind === 1) {
    const d = '1/(1+cos(x))';
    return {
      prompt: diff('\\dfrac{\\sin x}{1 + \\cos x}'),
      answer: expr(d, '\\dfrac{1}{1 + \\cos x}'),
      solution: [
        '$\\dfrac{\\cos x(1 + \\cos x) - \\sin x(-\\sin x)}{(1 + \\cos x)^2} = \\dfrac{\\cos x + \\cos^2 x + \\sin^2 x}{(1 + \\cos x)^2}$',
        'Use $\\sin^2 x + \\cos^2 x = 1$: $\\dfrac{1 + \\cos x}{(1 + \\cos x)^2} = \\dfrac{1}{1 + \\cos x}$',
      ],
      selfCheck: () => isDerivative('sin(x)/(1+cos(x))', d),
    };
  }
  if (kind === 2) {
    const d = '(1 - log(x))/x^2';
    return {
      prompt: diff('\\dfrac{\\ln x}{x}'),
      answer: expr(d, '\\dfrac{1 - \\ln x}{x^{2}}'),
      solution: ['$\\dfrac{\\frac1x\\cdot x - \\ln x\\cdot 1}{x^2} = \\dfrac{1 - \\ln x}{x^{2}}$'],
      selfCheck: () => isDerivative('log(x)/x', d),
    };
  }
  const a = r.int(1, 6);
  const d = `${a}*exp(x)/(exp(x)+${a})^2`;
  return {
    prompt: diff(`\\dfrac{e^{x}}{e^{x} + ${a}}`),
    answer: expr(d, `\\dfrac{${a}e^{x}}{(e^{x} + ${a})^{2}}`),
    solution: [`$\\dfrac{e^x(e^x + ${a}) - e^x\\cdot e^x}{(e^x + ${a})^2} = \\dfrac{${a}e^{x}}{(e^{x} + ${a})^{2}}$`],
    selfCheck: () => isDerivative(`exp(x)/(exp(x)+${a})`, d),
  };
};

const quotientLog: Gen = (r) => {
  if (r.next() < 0.5) {
    const n = r.int(2, 4);
    const d = `(1 - ${n}*log(x))/x^${n + 1}`;
    return {
      prompt: diff(`\\dfrac{\\ln x}{${xn(n)}}`),
      answer: expr(d, `\\dfrac{1 - ${n}\\ln x}{x^{${n + 1}}}`),
      solution: [`$\\dfrac{\\frac1x\\cdot ${xn(n)} - \\ln x\\cdot ${n}${xn(n - 1)}}{x^{${2 * n}}}$`, `Divide top and bottom by $${xn(n - 1)}$: $\\dfrac{1 - ${n}\\ln x}{x^{${n + 1}}}$`],
      selfCheck: () => isDerivative(`log(x)/x^${n}`, d),
    };
  }
  const n = r.int(2, 3);
  const d = `x^${n - 1}*(${n}*log(x) - 1)/log(x)^2`;
  return {
    prompt: diff(`\\dfrac{${xn(n)}}{\\ln x}`),
    answer: expr(d, `\\dfrac{${xn(n - 1)}(${n}\\ln x - 1)}{(\\ln x)^{2}}`),
    solution: [`$\\dfrac{${n}${xn(n - 1)}\\ln x - ${xn(n)}\\cdot\\frac1x}{(\\ln x)^2}$`, `$= \\dfrac{${xn(n - 1)}(${n}\\ln x - 1)}{(\\ln x)^{2}}$`],
    selfCheck: () => isDerivative(`x^${n}/log(x)`, d),
  };
};

const nestedChain: Gen = (r) => {
  const k = r.nz(-3, 3);
  const kxT = `${coef(k)}x`;
  const pool = [
    { f: `\\ln(1 + \\cos^{2}(${kxT}))`, fe: `log(1+cos(${k}*x)^2)`, d: `${-2 * k}*cos(${k}*x)*sin(${k}*x)/(1+cos(${k}*x)^2)`, dt: `\\dfrac{${-2 * k}\\cos(${kxT})\\sin(${kxT})}{1 + \\cos^{2}(${kxT})}`, why: `$\\frac{1}{1 + \\cos^2(${kxT})}\\cdot 2\\cos(${kxT})\\cdot(-\\sin(${kxT}))\\cdot ${P2(k)}$` },
    { f: `\\tan^{3}(${kxT})`, fe: `tan(${k}*x)^3`, d: `${3 * k}*tan(${k}*x)^2*sec(${k}*x)^2`, dt: `${3 * k}\\tan^{2}(${kxT})\\sec^{2}(${kxT})`, why: `$3\\tan^2(${kxT})\\cdot\\sec^2(${kxT})\\cdot ${P2(k)}$` },
    { f: `e^{\\sin(x^{2})}`, fe: 'exp(sin(x^2))', d: '2*x*cos(x^2)*exp(sin(x^2))', dt: '2x\\cos(x^{2})\\,e^{\\sin(x^{2})}', why: '$e^{\\sin(x^2)}\\cdot\\cos(x^2)\\cdot 2x$' },
    { f: `\\sin(\\sqrt{x})`, fe: 'sin(sqrt(x))', d: 'cos(sqrt(x))/(2*sqrt(x))', dt: '\\dfrac{\\cos\\sqrt{x}}{2\\sqrt{x}}', why: '$\\cos(\\sqrt x)\\cdot\\frac{1}{2\\sqrt x}$' },
    { f: `\\sqrt{1 + \\sin^{2} x}`, fe: 'sqrt(1+sin(x)^2)', d: 'sin(x)*cos(x)/sqrt(1+sin(x)^2)', dt: '\\dfrac{\\sin x\\cos x}{\\sqrt{1 + \\sin^{2} x}}', why: '$\\frac{1}{2\\sqrt{1 + \\sin^2 x}}\\cdot 2\\sin x\\cdot\\cos x$' },
    { f: `(1 + e^{${kxT}})^{4}`, fe: `(1+exp(${k}*x))^4`, d: `${4 * k}*exp(${k}*x)*(1+exp(${k}*x))^3`, dt: `${4 * k}e^{${kxT}}(1 + e^{${kxT}})^{3}`, why: `$4(1 + e^{${kxT}})^3\\cdot e^{${kxT}}\\cdot ${P2(k)}$` },
    { f: `\\cos^{2}(e^{x})`, fe: 'cos(exp(x))^2', d: '-2*exp(x)*cos(exp(x))*sin(exp(x))', dt: '-2e^{x}\\cos(e^{x})\\sin(e^{x})', why: '$2\\cos(e^x)\\cdot(-\\sin(e^x))\\cdot e^x$' },
  ];
  const p = r.pick(pool);
  return {
    prompt: diff(p.f),
    answer: expr(p.d, p.dt),
    inputHint: 'Powers of trig as tan(x)^2; sec(x) is fine.',
    solution: ['Peel the layers from the outside in and multiply the derivatives.', `$f'(x) = ${p.why.slice(1, -1)}$`, `$= ${p.dt}$`],
    selfCheck: () => isDerivative(p.fe, p.d),
  };
};

const ellipticCurve: Gen = (r) => {
  let a: number, x0: number, y0: number, b: number;
  do {
    a = r.int(-4, 4);
    x0 = r.int(-2, 3);
    y0 = r.nz(-4, 4);
    b = y0 * y0 - x0 ** 3 - a * x0;
  } while (Math.abs(b) > 30);
  const ans = new Q(3 * x0 * x0 + a, 2 * y0);
  const curve = sum([mono(1, 3), mono(a, 1), t(b)]).tex;
  return {
    prompt: `Find $\\dfrac{dy}{dx}$ at $(${x0}, ${y0})$ on the curve $y^{2} = ${curve}$.`,
    answer: exact(ans),
    solution: [`Differentiate: $2yy' = 3x^2 ${signed(a)}$.`, `$y' = \\dfrac{3x^2 ${signed(a)}}{2y}$; at $(${x0}, ${y0})$: $\\dfrac{${3 * x0 * x0 + a}}{${2 * y0}} = ${ans.tex()}$`],
    selfCheck: () => y0 * y0 === x0 ** 3 + a * x0 + b,
  };
};

const expCurve: Gen = (r) => {
  const x0 = r.int(1, 6);
  const ans = new Q(-1, x0 + 1);
  return {
    prompt: `Find $\\dfrac{dy}{dx}$ at $(${x0}, 0)$ on the curve $xe^{y} + y = ${x0}$.`,
    answer: exact(ans),
    solution: [`Differentiate; $xe^y$ needs the product rule and the chain rule: $e^{y} + xe^{y}y' + y' = 0$.`, `$y' = -\\dfrac{e^{y}}{xe^{y} + 1}$; at $(${x0}, 0)$: $-\\dfrac{1}{${x0} + 1} = ${ans.tex()}$`],
  };
};

const powerDeep: Skill = { ...power, levels: [power.levels[0], power.levels[1], { name: 'fractional powers and simplifying first', generate: mix(power.levels[2].generate, simplifyFirst) }] };
const productDeep: Skill = {
  ...product,
  levels: [
    { name: 'product rule', generate: mix(product.levels[0].generate, productMore, productMore) },
    { name: 'quotient rule', generate: mix(product.levels[1].generate, quotientMore, quotientMore) },
    { name: 'quotients with exp and logs', generate: mix(product.levels[2].generate, quotientLog) },
  ],
};
const chainDeep: Skill = {
  ...chain,
  levels: [chain.levels[0], chain.levels[1], { name: 'nested chains and products', generate: mix(chain.levels[2].generate, nestedChain, nestedChain) }],
};
const implicitDeep: Skill = {
  ...implicit,
  levels: [
    implicit.levels[0],
    { name: 'mixed terms', generate: mix(implicit.levels[1].generate, ellipticCurve) },
    { name: 'cubic and exponential curves', generate: mix(implicit.levels[2].generate, expCurve) },
  ],
};

// ---------------------------------------------------------------------------
// Tangent lines and higher derivatives

/** y = m x + b as an answer. */
const lineAns = (m: Q, b: Q) => {
  const l = sum([mono(m, 1), t(b)]);
  return expr(l.expr, `y = ${l.tex}`);
};

const tangent: Skill = {
  id: 'calc.tangent',
  name: 'Tangent lines and higher derivatives',
  prereqs: ['calc.product', 'calc.chain'],
  levels: [
    {
      name: 'tangent lines',
      generate: mix(
        (r) => {
          const c = [r.nz(-3, 3), r.int(-5, 5), r.int(-6, 6)];
          const a = r.int(-3, 3);
          const f = poly(c);
          const fa = c[0] * a * a + c[1] * a + c[2];
          const m = 2 * c[0] * a + c[1];
          const b = fa - m * a;
          return {
            prompt: `Find the tangent line to $y = ${f.tex}$ at $x = ${a}$. Enter the right-hand side of $y = \\dots$`,
            answer: lineAns(new Q(m), new Q(b)),
            solution: [`$f(${a}) = ${fa}$ and $f'(x) = ${poly([2 * c[0], c[1]]).tex}$, so the slope is $f'(${a}) = ${m}$.`, `$y = ${fa} + ${P2(m)}(x ${signed(-a)})$, i.e. $y = ${sum([mono(m, 1), t(b)]).tex}$`],
          };
        },
        (r) => {
          const k = r.nz(-4, 4);
          const c = r.nz(-3, 3);
          return {
            prompt: `Find the tangent line to $y = ${coef(c)}e^{${coef(k)}x}$ at $x = 0$. Enter the right-hand side of $y = \\dots$`,
            answer: lineAns(new Q(c * k), new Q(c)),
            solution: [`$f(0) = ${c}$, $f'(x) = ${c * k}e^{${coef(k)}x}$, so $f'(0) = ${c * k}$.`, `$y = ${sum([mono(c * k, 1), t(c)]).tex}$`],
          };
        },
        (r) => {
          if (r.next() < 0.5) {
            const k = r.int(1, 4);
            return {
              prompt: `Find the tangent line to $y = ${coef(k)}\\ln x$ at $x = 1$. Enter the right-hand side of $y = \\dots$`,
              answer: lineAns(new Q(k), new Q(-k)),
              solution: [`$f(1) = 0$ and $f'(x) = \\frac{${k}}{x}$, so the slope is $${k}$.`, `$y = ${k}(x - 1) = ${sum([mono(k, 1), t(-k)]).tex}$`],
            };
          }
          const m = r.int(1, 5);
          const slope = new Q(1, 2 * m);
          const b = new Q(m).sub(slope.mul(m * m));
          return {
            prompt: `Find the tangent line to $y = \\sqrt{x}$ at $x = ${m * m}$. Enter the right-hand side of $y = \\dots$`,
            answer: lineAns(slope, b),
            solution: [`$f(${m * m}) = ${m}$ and $f'(x) = \\frac{1}{2\\sqrt x}$, so the slope is $${slope.tex()}$.`, `$y = ${m} + ${slope.tex()}(x - ${m * m}) = ${sum([mono(slope, 1), t(b)]).tex}$`],
          };
        },
      ),
    },
    {
      name: 'higher derivatives',
      generate: mix(
        (r) => {
          const c = [r.nz(-3, 3), r.int(-4, 4), r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
          const f = poly(c);
          const d2 = poly([12 * c[0], 6 * c[1], 2 * c[2]]);
          return {
            prompt: `Find $f''(x)$ for $f(x) = ${f.tex}$.`,
            answer: expr(d2.expr, d2.tex),
            solution: [`$f'(x) = ${poly([4 * c[0], 3 * c[1], 2 * c[2], c[3]]).tex}$`, `$f''(x) = ${d2.tex}$`],
            selfCheck: () => isDerivative(poly([4 * c[0], 3 * c[1], 2 * c[2], c[3]]).expr, d2.expr),
          };
        },
        (r) => {
          const k = r.nz(-3, 3);
          return {
            prompt: `Find $f''(0)$ for $f(x) = xe^{${coef(k)}x}$.`,
            answer: exact(new Q(2 * k)),
            solution: [`$f'(x) = e^{${coef(k)}x}(1 ${st(k, 'x')})$`, `$f''(x) = e^{${coef(k)}x}(${2 * k} ${st(k * k, 'x')})$, so $f''(0) = ${2 * k}$.`],
            selfCheck: () => isDerivative(`exp(${k}*x)*(1+${k}*x)`, `exp(${k}*x)*(${2 * k}+${k * k}*x)`),
          };
        },
        (r) => {
          const k = r.nz(-3, 3);
          const n = r.int(3, 6);
          const fn = r.pick(['exp', 'sin', 'cos'] as const);
          // derivatives of sin(kx) at 0 cycle 0, k, 0, -k^3 ... ; cos(kx): 1, 0, -k^2, 0 ...
          const v =
            fn === 'exp' ? k ** n : fn === 'sin' ? (n % 2 ? (-1) ** ((n - 1) / 2) * k ** n : 0) : n % 2 ? 0 : (-1) ** (n / 2) * k ** n;
          const tex = fn === 'exp' ? `e^{${coef(k)}x}` : `\\${fn}(${coef(k)}x)`;
          return {
            prompt: `Find $f^{(${n})}(0)$ for $f(x) = ${tex}$.`,
            answer: exact(new Q(v)),
            solution: [
              fn === 'exp'
                ? `Each derivative brings down a factor $${k}$: $f^{(n)}(x) = ${P2(k)}^n e^{${coef(k)}x}$.`
                : `Derivatives of $\\${fn}$ cycle with period 4 ($\\sin \\to \\cos \\to -\\sin \\to -\\cos$), each bringing a factor $${k}$.`,
              `$f^{(${n})}(0) = ${v}$`,
            ],
          };
        },
        (r) => {
          const a = r.int(1, 4);
          const d2 = `(2*${a} - 2*x^2)/(x^2+${a})^2`;
          return {
            prompt: `Find $f''(x)$ for $f(x) = \\ln(x^{2} + ${a})$.`,
            answer: expr(d2, `\\dfrac{${2 * a} - 2x^{2}}{(x^{2} + ${a})^{2}}`),
            solution: [`$f'(x) = \\dfrac{2x}{x^2 + ${a}}$`, `Quotient rule: $f''(x) = \\dfrac{2(x^2 + ${a}) - 2x\\cdot 2x}{(x^2 + ${a})^2} = \\dfrac{${2 * a} - 2x^{2}}{(x^{2} + ${a})^{2}}$`],
            selfCheck: () => isDerivative(`2*x/(x^2+${a})`, d2),
          };
        },
      ),
    },
    {
      name: 'tangents with a condition',
      generate: mix(
        (r) => {
          const k = r.int(1, 4);
          const b = r.int(-6, 6);
          const m = 3 * k * k + b;
          return {
            prompt: `At which $x$ is the tangent to $y = x^{3}${b ? ` ${st(b, 'x')}` : ''}$ parallel to the line $y = ${m === 1 ? '' : m === -1 ? '-' : m}x ${signed(r.int(-5, 5))}$?`,
            answer: { kind: 'list', expected: [`${k}`, `${-k}`] },
            inputHint: 'All x-values, comma-separated.',
            solution: [`Parallel means equal slopes: $3x^2${b ? ` ${signed(b)}` : ''} = ${m}$.`, `$x^2 = ${k * k}$, so $x = \\pm ${k}$.`],
          };
        },
        (r) => {
          const c = [r.nz(-2, 2), r.int(-4, 4), r.int(-5, 5)];
          let a: number;
          do a = r.int(-3, 3);
          while (2 * c[0] * a + c[1] === 0);
          const fa = c[0] * a * a + c[1] * a + c[2];
          const m = new Q(-1, 2 * c[0] * a + c[1]);
          const b = new Q(fa).sub(m.mul(a));
          return {
            prompt: `Find the normal line (perpendicular to the tangent) to $y = ${poly(c).tex}$ at $x = ${a}$. Enter the right-hand side of $y = \\dots$`,
            answer: lineAns(m, b),
            solution: [`Tangent slope: $f'(${a}) = ${2 * c[0] * a + c[1]}$, so the normal slope is $${m.tex()}$ (negative reciprocal).`, `Through $(${a}, ${fa})$: $y = ${sum([mono(m, 1), t(b)]).tex}$`],
          };
        },
        (r) => {
          if (r.next() < 0.5) {
            const k = r.int(1, 4);
            const ans = new Q(1, k);
            return {
              prompt: `The tangent to $y = e^{${coef(k)}x}$ at some point passes through the origin. Find that point's $x$-coordinate.`,
              answer: num(ans),
              solution: [`Tangent at $x = a$: $y = e^{${coef(k)}a} + ${k}e^{${coef(k)}a}(x - a)$.`, `Through $(0, 0)$: $0 = e^{${coef(k)}a}(1 - ${coef(k)}a)$, so $a = ${ans.tex()}$.`],
            };
          }
          const c = r.int(1, 4) ** 2;
          const s = Math.sqrt(c);
          return {
            prompt: `Which tangent lines to $y = x^{2} + ${c}$ pass through the origin? Give the $x$-coordinates of the points of tangency.`,
            answer: { kind: 'list', expected: [`${s}`, `${-s}`] },
            inputHint: 'All x-values, comma-separated.',
            solution: [`Tangent at $x = a$: $y = a^2 + ${c} + 2a(x - a)$.`, `Through $(0, 0)$: $0 = a^2 + ${c} - 2a^2$, so $a^2 = ${c}$ and $a = \\pm ${s}$.`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'The tangent line at $x = a$ is $y = f(a) + f\'(a)(x - a)$; the normal line has slope $-\\frac{1}{f\'(a)}$. "Parallel to a line" means equal slopes; "passes through a point" means substitute the point into the tangent line\'s equation and solve for $a$. Higher derivatives: differentiate repeatedly; for $e^{kx}$, $\\sin$ and $\\cos$ look for the pattern instead of grinding.',
    resources: [
      paul('CalcI/HigherOrderDerivatives.aspx', 'Higher Order Derivatives'),
      openstax(1, '3-2-the-derivative-as-a-function', 'The Derivative as a Function'),
      tb1b('derivatives', 'The paradox of the derivative'),
    ],
  },
};

// ---------------------------------------------------------------------------
// Applications: wider extrema and L'Hôpital, concavity, approximation

const extremaExp: Gen = (r) => {
  const kind = r.int(0, 3);
  if (kind === 0) {
    const a = r.int(1, 5);
    return {
      prompt: `At which $x$ does $f(x) = xe^{-x/${a}}$ have a local maximum?`,
      answer: num(new Q(a)),
      solution: [`$f'(x) = e^{-x/${a}}\\left(1 - \\frac{x}{${a}}\\right)$, zero at $x = ${a}$.`, `$f'$ changes from positive to negative there: a maximum.`],
      selfCheck: () => near(at(`exp(-x/${a})*(1-x/${a})`, a), 0),
    };
  }
  if (kind === 1) {
    const max = r.next() < 0.5;
    return {
      prompt: `At which $x$ does $f(x) = x^{2}e^{-x}$ have a local ${max ? 'maximum' : 'minimum'}?`,
      answer: num(new Q(max ? 2 : 0)),
      solution: ['$f\'(x) = e^{-x}(2x - x^2) = xe^{-x}(2 - x)$: critical points $0$ and $2$.', `Sign of $f'$: $-$, then $+$ on $(0, 2)$, then $-$. So $0$ is a minimum and $2$ a maximum.`],
    };
  }
  if (kind === 2) {
    const a = r.int(1, 8);
    return {
      prompt: `At which $x > 0$ does $f(x) = x - ${a}\\ln x$ have a local minimum?`,
      answer: num(new Q(a)),
      solution: [`$f'(x) = 1 - \\frac{${a}}{x}$, zero at $x = ${a}$.`, `$f''(x) = \\frac{${a}}{x^2} > 0$: a minimum.`],
    };
  }
  return {
    prompt: 'At which $x$ does $f(x) = \\dfrac{\\ln x}{x}$ have a local maximum?',
    answer: num('e', 'e'),
    inputHint: 'Exact value; e is fine.',
    solution: ['$f\'(x) = \\dfrac{1 - \\ln x}{x^2}$, zero when $\\ln x = 1$.', '$x = e$, where $f\'$ goes from positive to negative.'],
  };
};

const extremaRational: Gen = (r) => {
  const a = r.int(2, 4);
  const b = a + r.int(1, 4);
  const wantMin = r.next() < 0.5;
  const f = (x: number) => new Q(x).add(new Q(a * a, x));
  const ans = wantMin ? new Q(2 * a) : [f(1), f(b)].reduce((m, v) => (v.value() > m.value() ? v : m));
  return {
    prompt: `Find the absolute ${wantMin ? 'minimum' : 'maximum'} value of $f(x) = x + \\dfrac{${a * a}}{x}$ on $[1, ${b}]$.`,
    answer: num(ans),
    inputHint: 'The value of f, not the x.',
    solution: [
      `$f'(x) = 1 - \\dfrac{${a * a}}{x^2}$, zero at $x = ${a}$ (inside the interval).`,
      `Compare: $f(1) = ${f(1).tex()}$, $f(${a}) = ${2 * a}$, $f(${b}) = ${f(b).tex()}$.`,
      `The ${wantMin ? 'smallest' : 'largest'} is $${ans.tex()}$.`,
    ],
  };
};

const lhopitalThrice: Gen = (r) => {
  const a = r.int(1, 3);
  const pool = [
    { tex: `\\frac{${coef(a)}x - \\sin(${coef(a)}x)}{x^{3}}`, e: `(${a}*x - sin(${a}*x))/x^3`, v: new Q(a ** 3, 6), why: `three rounds give $\\dfrac{${a ** 3}\\cos(${coef(a)}x)}{6} \\to \\dfrac{${a ** 3}}{6}$` },
    { tex: `\\frac{\\tan(${coef(a)}x) - ${coef(a)}x}{x^{3}}`, e: `(tan(${a}*x) - ${a}*x)/x^3`, v: new Q(a ** 3, 3), why: `equivalently $\\tan u = u + \\frac{u^3}{3} + \\dots$, giving $\\dfrac{${a ** 3}}{3}$` },
    { tex: `\\frac{e^{${coef(a)}x} - 1 - ${coef(a)}x - \\frac{${a * a}x^{2}}{2}}{x^{3}}`, e: `(exp(${a}*x) - 1 - ${a}*x - ${a * a}*x^2/2)/x^3`, v: new Q(a ** 3, 6), why: `three rounds give $\\dfrac{${a ** 3}e^{${coef(a)}x}}{6} \\to \\dfrac{${a ** 3}}{6}$` },
  ];
  const p = r.pick(pool);
  return {
    prompt: `Evaluate $${lim(0)} ${p.tex}$.`,
    answer: exact(p.v),
    solution: ['It is $\\frac{0}{0}$, and stays $\\frac{0}{0}$ after one and two applications of L’Hôpital.', `Differentiating top and bottom three times: ${p.why}.`],
    selfCheck: () => limNear(p.e, 0, p.v.value(), 1e-2, 2e-2),
  };
};

const otherForms: Gen = (r) => {
  const k = r.int(1, 4);
  const pool: { tex: string; ans: string; disp?: string; why: string[]; check?: () => boolean }[] = [
    { tex: `\\displaystyle\\lim_{x\\to 0^+} x^{${k}}\\ln x`, ans: '0', why: [`$0\\cdot(-\\infty)$: rewrite as $\\dfrac{\\ln x}{x^{-${k}}}$, an $\\frac{\\infty}{\\infty}$ form.`, `L'Hôpital: $\\dfrac{1/x}{-${k}x^{-${k + 1}}} = -\\dfrac{x^{${k}}}{${k}} \\to 0$`] },
    { tex: `${lim(0)} \\left(\\frac{1}{x} - \\frac{${k === 1 ? 1 : k}}{e^{${coef(k)}x} - 1}\\right)`, ans: `${new Q(k, 2)}`, disp: new Q(k, 2).tex(), why: [`$\\infty - \\infty$: combine into $\\dfrac{e^{${coef(k)}x} - 1 - ${coef(k)}x}{x(e^{${coef(k)}x} - 1)}$, which is $\\frac00$.`, `Two rounds of L'Hôpital (or expand $e^{${coef(k)}x}$) give $${new Q(k, 2).tex()}$.`], check: () => near(at(`1/x - ${k}/(exp(${k}*x)-1)`, 1e-4), k / 2, 1e-3) },
    { tex: `${lim(0)} \\left(\\frac{1}{x} - \\frac{1}{\\sin x}\\right)`, ans: '0', why: ['Combine: $\\dfrac{\\sin x - x}{x\\sin x}$, a $\\frac00$ form.', "L'Hôpital twice: $\\dfrac{-\\sin x}{2\\cos x - x\\sin x} \\to 0$"] },
    { tex: `\\displaystyle\\lim_{x\\to 0^+} x^{${k === 1 ? '' : k}x}`, ans: '1', why: [`$0^0$: take logs, $\\ln L = \\lim ${k}x\\ln x = 0$.`, '$L = e^0 = 1$'] },
    { tex: `${lim('\\infty')} x^{1/x}`, ans: '1', why: ['$\\infty^0$: $\\ln L = \\lim \\dfrac{\\ln x}{x} = 0$ by L’Hôpital.', '$L = 1$'] },
    { tex: `${lim(0)} \\left(\\cos(${coef(k)}x)\\right)^{1/x^{2}}`, ans: `e^(${new Q(-k * k, 2)})`, disp: `e^{${new Q(-k * k, 2).tex()}}`, why: [`$1^\\infty$: $\\ln L = \\lim \\dfrac{\\ln\\cos(${coef(k)}x)}{x^2}$, a $\\frac00$ form.`, `Two rounds of L'Hôpital give $-\\dfrac{${k * k}}{2}$, so $L = e^{${new Q(-k * k, 2).tex()}}$.`], check: () => near(at(`cos(${k}*x)^(1/x^2)`, 1e-3), Math.exp(-k * k / 2), 1e-4) },
    { tex: `${lim('\\infty')} \\frac{x^{${k + 1}}}{e^{x}}`, ans: '0', why: [`$\\frac{\\infty}{\\infty}$; apply L'Hôpital $${k + 1}$ times: the top becomes the constant $${k + 1}!$, the bottom stays $e^x$.`, 'Exponentials beat every power: the limit is $0$.'] },
  ];
  const p = r.pick(pool);
  return {
    prompt: `Evaluate $${p.tex}$.`,
    answer: exact(p.ans, p.disp),
    inputHint: 'e^3 or exp(3) for powers of e.',
    solution: p.why,
    selfCheck: p.check,
  };
};

const extremaDeep: Skill = {
  ...extrema,
  levels: [extrema.levels[0], { name: 'classify critical points', generate: mix(extrema.levels[1].generate, extremaExp) }, { name: 'absolute extrema on an interval', generate: mix(extrema.levels[2].generate, extremaRational) }],
};
const lhopitalDeep: Skill = {
  ...lhopital,
  levels: [
    lhopital.levels[0],
    { name: 'apply it more than once', generate: mix(lhopital.levels[1].generate, lhopitalThrice) },
    { name: 'other indeterminate forms', generate: mix(lhopital.levels[2].generate, otherForms, otherForms) },
  ],
  learn: {
    ...lhopital.learn,
    summary:
      'If $\\lim \\frac{f}{g}$ is $\\frac{0}{0}$ or $\\frac{\\infty}{\\infty}$, then $\\lim \\frac{f}{g} = \\lim \\frac{f\'}{g\'}$ (differentiate top and bottom separately, not the quotient rule). Repeat while the form stays indeterminate. Rewrite the other forms first: $0\\cdot\\infty$ as a fraction ($x\\ln x = \\frac{\\ln x}{1/x}$), $\\infty - \\infty$ over a common denominator, and $1^\\infty$, $0^0$, $\\infty^0$ by taking $\\ln$ and exponentiating at the end.',
  },
};

const intervals = (p: number, q: number) => {
  const m = new Q(p + q, 2);
  return [`$(-\\infty, ${p})$`, `$(${p}, ${q})$`, `$(${q}, \\infty)$`, `$(${m.tex()}, \\infty)$`];
};

const shape: Skill = {
  id: 'calc.shape',
  name: 'Concavity and inflection points',
  prereqs: ['calc.extrema'],
  levels: [
    {
      name: 'inflection points',
      generate: mix(
        (r) => {
          const c = [r.nz(-3, 3), r.int(-6, 6), r.int(-6, 6), r.int(-5, 5)];
          const ans = new Q(-c[1], 3 * c[0]);
          return {
            prompt: `Find the inflection point of $f(x) = ${poly(c).tex}$ (its $x$-coordinate).`,
            answer: num(ans),
            solution: [`$f''(x) = ${poly([6 * c[0], 2 * c[1]]).tex}$, which changes sign at its root.`, `$x = ${ans.tex()}$`],
          };
        },
        (r) => {
          const p = r.int(1, 3);
          const c = r.int(-5, 5);
          return {
            prompt: `Find the inflection points of $f(x) = ${sum([mono(1, 4), mono(-6 * p * p, 2), t(c)]).tex}$ ($x$-coordinates).`,
            answer: { kind: 'list', expected: [`${p}`, `${-p}`] },
            inputHint: 'All x-values, comma-separated.',
            solution: [`$f''(x) = 12x^2 - ${12 * p * p} = 12(x^2 - ${p * p})$.`, `It changes sign at $x = \\pm ${p}$.`],
          };
        },
        (r) => {
          const a = r.nz(-4, 4);
          return {
            prompt: `Find the inflection points of $f(x) = x^{4} ${st(2 * a, 'x^{3}')}$ ($x$-coordinates).`,
            answer: { kind: 'list', expected: ['0', `${-a}`] },
            inputHint: 'All x-values, comma-separated.',
            solution: [`$f''(x) = 12x^2 ${st(12 * a, 'x')} = 12x(x ${signed(a)})$.`, `Sign changes at $x = 0$ and $x = ${-a}$.`],
          };
        },
      ),
    },
    {
      name: 'where it rises, falls and bends',
      generate(r) {
        const [p, q] = distinct(r, 2, -4, 4).sort((a, b) => a - b);
        const f = poly([2, -3 * (p + q), 6 * p * q, 0]);
        const ask = r.pick([
          { q: 'decreasing', k: 1, why: `$f' < 0$ between the critical points.` },
          { q: 'increasing and concave down', k: 0, why: `Left of $${p}$, $f' > 0$ and $f'' < 0$.` },
          { q: 'increasing and concave up', k: 2, why: `Right of $${q}$, $f' > 0$ and $f'' > 0$.` },
          { q: 'concave up', k: 3, why: `$f'' > 0$ right of the inflection point $${new Q(p + q, 2).tex()}$.` },
        ]);
        return {
          prompt: `$f(x) = ${f.tex}$. On which interval is $f$ ${ask.q}?`,
          answer: choice(intervals(p, q), ask.k),
          solution: [
            `$f'(x) = 6(${lin(p)})(${lin(q)})$: positive outside $[${p}, ${q}]$, negative inside.`,
            `$f''(x) = ${poly([12, -6 * (p + q)]).tex}$: negative left of $${new Q(p + q, 2).tex()}$, positive right of it.`,
            ask.why,
          ],
        };
      },
    },
    {
      name: 'beyond polynomials',
      generate: mix(
        (r) => {
          const k = r.int(1, 4);
          return {
            prompt: `Find the inflection point of $f(x) = xe^{-${coef(k)}x}$.`,
            answer: num(new Q(2, k)),
            solution: [`$f'(x) = e^{-${coef(k)}x}(1 - ${coef(k)}x)$, $f''(x) = e^{-${coef(k)}x}(${k * k}x - ${2 * k})$.`, `$f''$ changes sign at $x = ${new Q(2, k).tex()}$.`],
            selfCheck: () => isDerivative(`exp(-${k}*x)*(1-${k}*x)`, `exp(-${k}*x)*(${k * k}*x-${2 * k})`),
          };
        },
        (r) => {
          const c = r.int(1, 4);
          return {
            prompt: `Find the inflection points of $f(x) = e^{-x^{2}/${2 * c * c}}$ ($x$-coordinates).`,
            answer: { kind: 'list', expected: [`${c}`, `${-c}`] },
            inputHint: 'All x-values, comma-separated.',
            solution: [`$f'(x) = -\\frac{x}{${c * c}}f(x)$, $f''(x) = \\left(\\frac{x^2}{${c ** 4}} - \\frac{1}{${c * c}}\\right)f(x)$.`, `Sign changes where $x^2 = ${c * c}$: $x = \\pm ${c}$ (one standard deviation, for the bell curve).`],
          };
        },
        (r) => {
          const a = r.int(1, 3);
          return {
            prompt: `Find the inflection points of $f(x) = \\dfrac{x}{x^{2} + ${a * a}}$ ($x$-coordinates).`,
            answer: { kind: 'list', expected: ['0', `${a}*sqrt(3)`, `${-a}*sqrt(3)`], display: `0,\\ \\pm ${a === 1 ? '' : a}\\sqrt{3}` },
            inputHint: 'All x-values, comma-separated; sqrt(3) is fine.',
            solution: [`$f''(x) = \\dfrac{2x(x^2 - ${3 * a * a})}{(x^2 + ${a * a})^3}$ (quotient rule twice).`, `Sign changes at $x = 0$ and $x = \\pm ${a === 1 ? '' : a}\\sqrt3$.`],
            selfCheck: () => isDerivative(`(${a * a}-x^2)/(x^2+${a * a})^2`, `2*x*(x^2-${3 * a * a})/(x^2+${a * a})^3`),
          };
        },
        (r) => {
          const a = r.int(1, 5);
          return {
            prompt: `Find the inflection points of $f(x) = \\ln(x^{2} + ${a * a})$ ($x$-coordinates).`,
            answer: { kind: 'list', expected: [`${a}`, `${-a}`] },
            inputHint: 'All x-values, comma-separated.',
            solution: [`$f''(x) = \\dfrac{2(${a * a} - x^2)}{(x^2 + ${a * a})^2}$.`, `Sign changes at $x = \\pm ${a}$.`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      '$f\' > 0$: increasing; $f\' < 0$: decreasing. $f\'\' > 0$: concave up (holds water); $f\'\' < 0$: concave down. An inflection point is where the concavity changes, so $f\'\'$ changes sign there (being zero is not enough: $x^4$ has $f\'\'(0) = 0$ but no inflection). Make a sign chart of $f\'$ and $f\'\'$ between their zeros to read off the whole shape of the graph.',
    resources: [paul('CalcI/ShapeofGraphPtII.aspx', 'The Shape of a Graph, Part II'), openstax(1, '4-5-derivatives-and-the-shape-of-a-graph', 'Derivatives and the Shape of a Graph')],
  },
};

const approx: Skill = {
  id: 'calc.approx',
  name: 'Linear approximation, the MVT and Newton’s method',
  prereqs: ['calc.tangent'],
  levels: [
    {
      name: 'linear approximation',
      generate: mix(
        (r) => {
          const a = r.int(2, 10);
          const d = r.nz(-3, 3);
          const ans = new Q(a).add(new Q(d, 2 * a));
          return {
            prompt: `Use the linear approximation of $\\sqrt{x}$ at $x = ${a * a}$ to estimate $\\sqrt{${a * a + d}}$.`,
            answer: num(ans),
            solution: [`$L(x) = ${a} + \\frac{1}{${2 * a}}(x - ${a * a})$, the tangent line at $${a * a}$.`, `$L(${a * a + d}) = ${a} ${d < 0 ? '-' : '+'} \\frac{${Math.abs(d)}}{${2 * a}} = ${ans.tex()}$ (true value $\\approx ${Math.sqrt(a * a + d).toFixed(4)}$)`],
          };
        },
        (r) => {
          const a = r.int(2, 5);
          const d = r.nz(-4, 4);
          const ans = new Q(a).add(new Q(d, 3 * a * a));
          return {
            prompt: `Use the linear approximation of $\\sqrt[3]{x}$ at $x = ${a ** 3}$ to estimate $\\sqrt[3]{${a ** 3 + d}}$.`,
            answer: num(ans),
            solution: [`$\\frac{d}{dx}x^{1/3} = \\frac{1}{3x^{2/3}}$, which is $\\frac{1}{${3 * a * a}}$ at $${a ** 3}$.`, `$${a} ${d < 0 ? '-' : '+'} \\frac{${Math.abs(d)}}{${3 * a * a}} = ${ans.tex()}$`],
          };
        },
        (r) => {
          const h = r.nz(-5, 5);
          const n = r.int(3, 12);
          const ans = new Q(1).add(new Q(n * h, 100));
          return {
            prompt: `Use a linear approximation to estimate $(${decimal(100 + h)})^{${n}}$.`,
            answer: num(ans, decimal(100 + n * h)),
            solution: [`For $f(x) = x^{${n}}$ at $x = 1$: $L(x) = 1 + ${n}(x - 1)$.`, `$L(${decimal(100 + h)}) = 1 + ${n}\\cdot(${decimal(h)}) = ${decimal(100 + n * h)}$`],
          };
        },
      ),
    },
    {
      name: 'mean value theorem',
      generate: mix(
        (r) => {
          const c = [r.nz(-3, 3), r.int(-5, 5), r.int(-5, 5)];
          const a = r.int(-3, 2);
          const b = a + r.int(1, 5);
          const ans = new Q(a + b, 2);
          return {
            prompt: `Find the $c$ in $(${a}, ${b})$ promised by the mean value theorem for $f(x) = ${poly(c).tex}$ on $[${a}, ${b}]$.`,
            answer: num(ans),
            solution: [`The average slope is $\\dfrac{f(${b}) - f(${a})}{${b - a}} = ${c[0] * (a + b) + c[1]}$.`, `Solve $f'(c) = ${2 * c[0]}c ${signed(c[1])} = ${c[0] * (a + b) + c[1]}$: $c = ${ans.tex()}$ (for a parabola it is always the midpoint).`],
          };
        },
        (r) => {
          const b = r.int(1, 5);
          return {
            prompt: `Find the $c$ in $(0, ${b})$ promised by the mean value theorem for $f(x) = x^{3}$ on $[0, ${b}]$.`,
            answer: num(`${b}/sqrt(3)`, `\\frac{${b}}{\\sqrt{3}}`),
            inputHint: 'sqrt(3) is fine.',
            solution: [`Average slope: $\\dfrac{${b ** 3} - 0}{${b}} = ${b * b}$.`, `$3c^2 = ${b * b}$, so $c = \\dfrac{${b}}{\\sqrt3}$ (the positive root).`],
          };
        },
        (r) => {
          const [a, b] = r.pick([
            [1, 4],
            [1, 9],
            [2, 8],
            [4, 9],
            [1, 16],
            [3, 12],
            [4, 16],
            [2, 18],
          ]);
          const c = Math.sqrt(a * b);
          return {
            prompt: `Find the $c$ in $(${a}, ${b})$ promised by the mean value theorem for $f(x) = \\dfrac{1}{x}$ on $[${a}, ${b}]$.`,
            answer: num(new Q(c)),
            solution: [`Average slope: $\\dfrac{\\frac{1}{${b}} - \\frac{1}{${a}}}{${b - a}} = -\\dfrac{1}{${a * b}}$.`, `$-\\dfrac{1}{c^2} = -\\dfrac{1}{${a * b}}$, so $c = \\sqrt{${a * b}} = ${c}$.`],
          };
        },
      ),
    },
    {
      name: 'Newton’s method',
      generate: mix(
        (r) => {
          const N = r.pick([2, 3, 5, 6, 7, 8, 10, 11, 13]);
          const x0 = Math.max(1, Math.round(Math.sqrt(N)));
          const steps = r.int(1, 2);
          let x = new Q(x0);
          const xs = [x];
          for (let i = 0; i < steps; i++) xs.push((x = x.add(new Q(N).div(x)).div(2)));
          return {
            prompt: `Apply Newton’s method to $f(x) = x^{2} - ${N}$ starting from $x_0 = ${x0}$. Find $x_{${steps}}$.`,
            answer: num(x),
            solution: [`$x_{n+1} = x_n - \\dfrac{x_n^2 - ${N}}{2x_n} = \\dfrac12\\left(x_n + \\dfrac{${N}}{x_n}\\right)$.`, xs.map((v, i) => `$x_{${i}} = ${v.tex()}$`).join(', ') + ` (and $\\sqrt{${N}} \\approx ${Math.sqrt(N).toFixed(5)}$).`],
          };
        },
        (r) => {
          const N = r.pick([2, 3, 5, 7, 9, 10, 20, 30]);
          const x0 = Math.max(1, Math.round(Math.cbrt(N)));
          const x1 = new Q(x0).sub(new Q(x0 ** 3 - N, 3 * x0 * x0));
          return {
            prompt: `Apply one step of Newton’s method to $f(x) = x^{3} - ${N}$ from $x_0 = ${x0}$. Find $x_1$.`,
            answer: num(x1),
            solution: [`$x_1 = x_0 - \\dfrac{f(x_0)}{f'(x_0)} = ${x0} - \\dfrac{${x0 ** 3 - N}}{${3 * x0 * x0}}$`, `$= ${x1.tex()}$ (and $\\sqrt[3]{${N}} \\approx ${Math.cbrt(N).toFixed(5)}$)`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Linear approximation: near $a$, $f(x) \\approx f(a) + f\'(a)(x - a)$ (the tangent line); great for quick estimates like $\\sqrt{26} \\approx 5.1$. Mean value theorem: a function continuous on $[a, b]$ and differentiable inside has some $c$ with $f\'(c) = \\frac{f(b) - f(a)}{b - a}$. Newton’s method follows tangent lines to a root: $x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}$, roughly doubling the correct digits each step.',
    resources: [
      paul('CalcI/LinearApproximations.aspx', 'Linear Approximations'),
      paul('CalcI/MeanValueTheorem.aspx', 'The Mean Value Theorem'),
      paul('CalcI/NewtonsMethod.aspx', "Newton's Method"),
      openstax(1, '4-9-newtons-method', "Newton's Method"),
    ],
  },
};

/** 1.03 style decimal from hundredths: decimal(103) = "1.03", decimal(-2) = "-0.02". */
function decimal(hundredths: number) {
  return Number((hundredths / 100).toFixed(2)).toString();
}

// ---------------------------------------------------------------------------

export const calculus1Chapters: Chapter[] = [
  {
    id: 'calc.ch.limits',
    title: 'Limits and continuity',
    about: 'What value a function approaches as $x$ approaches a point or infinity, how to compute it when plugging in fails, one-sided limits, and what it means for a function to be continuous.',
    why: 'Derivatives, integrals and series are all defined as limits. Limits at infinity are also how you compare growth rates, which is exactly Big-O reasoning.',
    resources: [tb1b('limits', 'Limits, L’Hôpital’s rule, and epsilon delta definitions'), paul('CalcI/LimitsIntro.aspx', 'Limits (chapter intro)'), openstax(1, '2-2-the-limit-of-a-function', 'The Limit of a Function')],
    skills: [limitsDeep, trigLimits, continuity],
    deeper: [epsilonDelta],
  },
  {
    id: 'calc.ch.derivatives',
    title: 'Derivatives',
    about: 'The derivative as instantaneous rate of change, the rules that differentiate anything built from elementary functions, tangent lines and higher derivatives.',
    why: 'Optimisation, physics, and machine learning (gradient descent and backpropagation are the chain rule applied at scale).',
    resources: [tb1b('derivatives', 'The paradox of the derivative'), tb1b('chain-rule-and-product-rule', 'Visualizing the chain rule and product rule'), openstax(1, '3-1-defining-the-derivative', 'Defining the Derivative')],
    skills: [powerDeep, productDeep, chainDeep, implicitDeep, tangent],
    deeper: [inverseDerivatives],
  },
  {
    id: 'calc.ch.applications',
    title: 'Applications of derivatives',
    about: 'Maxima and minima, the shape of a graph, L’Hôpital’s rule, linear approximation and Newton’s method, related rates and optimisation problems.',
    why: 'Finding the best value of something is the most common use of calculus in practice, and Newton’s method is how calculators and solvers find roots.',
    resources: [paul('CalcI/DerivAppsIntro.aspx', 'Applications of Derivatives (chapter intro)'), openstax(1, '4-3-maxima-and-minima', 'Maxima and Minima')],
    skills: [extremaDeep, shape, lhopitalDeep, approx, optimization],
    deeper: [],
  },
];
