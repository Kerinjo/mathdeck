// Calculus II: integrals, techniques, applications of integration, sequences and series, differential equations.
import { Q } from '../core/frac';
import { coef, mono, poly, signed, st, sum, t } from '../core/fmt';
import type { Chapter, Problem, Rng, Skill } from '../core/types';
import { anti, choice, expr, mix, num, openstax, paul, tb1b } from './calc-helpers';
import { antideriv, definite, improper, parts, pfrac, series, taylor, usub } from './calculus';
import { powerSums, trigIntegrals } from './calculus-deeper';
import { distinct, int, lin, P } from './helpers';
import { integrate, isDerivative, near, value } from './verify';

type Gen = (r: Rng) => Problem;

const xn = (n: number, v = 'x') => (n === 0 ? '' : n === 1 ? v : `${v}^{${n}}`);
/** k·π as a number answer, shown as a multiple of π. */
const piTimes = (k: Q, display?: string): Problem['answer'] => ({
  kind: 'number',
  expected: `(${k})*pi`,
  display: display ?? (k.eq(1) ? '\\pi' : k.isInt() ? `${k.n}\\pi` : `\\frac{${k.n < 0 ? '-' : ''}${Math.abs(k.n) === 1 ? '' : Math.abs(k.n)}\\pi}{${k.d}}`.replace('\\frac{-', '-\\frac{')),
});
const pis = (k: Q) => (k.eq(1) ? '\\pi' : k.isInt() ? `${k.n}\\pi` : `\\frac{${Math.abs(k.n) === 1 ? '' : Math.abs(k.n)}\\pi}{${k.d}}`);
/** Exact integral of a polynomial (coefficients highest first) over [a, b]. */
const polyInt = (c: number[], a: number | Q, b: number | Q) => {
  const deg = c.length - 1;
  const F = (x: Q) => c.reduce((s, ci, i) => s.add(new Q(ci, deg - i + 1).mul(pow(x, deg - i + 1))), new Q(0));
  return F(Q.of(b)).sub(F(Q.of(a)));
};
const pow = (x: Q, n: number) => Array.from({ length: n }, () => x).reduce((p, y) => p.mul(y), new Q(1));
const polyAt = (c: number[], x: Q) => c.reduce((s, ci) => s.mul(x).add(ci), new Q(0));
/** e^{kx} in TeX. */
const ekx = (k: number) => (k === 0 ? '' : `e^{${coef(k)}x}`);

// ---------------------------------------------------------------------------
// Integrals: wider antiderivatives and definite integrals, plus the FTC

const simplifyIntegrand: Gen = (r) => {
  const kind = r.int(0, 3);
  if (kind === 0) {
    const a = r.nz(-6, 6);
    const F = `x^2/2 + ${a}*log(x)`;
    return {
      prompt: `Find $${int(`\\frac{x^{2} ${signed(a)}}{x}`)}$.`,
      answer: anti(F, `\\frac{x^{2}}{2} ${a < 0 ? '-' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}\\ln|x|`),
      solution: [`Divide first: $x ${a < 0 ? '-' : '+'} \\frac{${Math.abs(a)}}{x}$.`, `Integrate term by term: $\\frac{x^{2}}{2} ${a < 0 ? '-' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}\\ln|x| + C$`],
      selfCheck: () => isDerivative(F, `(x^2+${a})/x`),
    };
  }
  if (kind === 1) {
    const a = r.nz(-4, 4);
    const F = `x^2/2 + ${4 * a}/3*x^(3/2) + ${a * a}*x`;
    const Ft = sum([t(new Q(1, 2), 'x^{2}', 'x^2'), t(new Q(4 * a, 3), 'x^{3/2}', 'x^(3/2)'), t(a * a, 'x')]);
    return {
      prompt: `Find $${int(`(\\sqrt{x} ${signed(a)})^{2}`)}$.`,
      answer: anti(F, Ft.tex),
      solution: [`Expand: $x ${signed(2 * a)}\\sqrt{x} + ${a * a}$.`, `$${Ft.tex} + C$`],
      selfCheck: () => isDerivative(F, `(sqrt(x)+${a})^2`),
    };
  }
  if (kind === 2) {
    const a = r.nz(-5, 5);
    const F = `${a}*tan(x) + x`;
    return {
      prompt: `Find $${int(`(${coef(a)}\\sec^{2} x + 1)`)}$.`,
      answer: anti(F, `${coef(a)}\\tan x + x`),
      inputHint: 'tan(x) works.',
      solution: ['$\\frac{d}{dx}\\tan x = \\sec^2 x$, so $\\int \\sec^2 x\\,dx = \\tan x$.', `$${coef(a)}\\tan x + x + C$`],
      selfCheck: () => isDerivative(F, `${a}/cos(x)^2 + 1`),
    };
  }
  const k = r.int(1, 3);
  const F = `(exp(${k}*x) + exp(-${k}*x))/${k}`;
  return {
    prompt: `Find $${int(`\\frac{e^{${2 * k}x} - 1}{e^{${coef(k)}x}}`)}$.`,
    answer: anti(F, k === 1 ? 'e^{x} + e^{-x}' : `\\frac{e^{${coef(k)}x} + e^{-${coef(k)}x}}{${k}}`),
    solution: [`Split: $e^{${coef(k)}x} - e^{-${coef(k)}x}$.`, `$\\frac{1}{${k}}(e^{${coef(k)}x} + e^{-${coef(k)}x}) + C$`],
    selfCheck: () => isDerivative(F, `(exp(${2 * k}*x)-1)/exp(${k}*x)`),
  };
};

const absAndSymmetry: Gen = (r) => {
  if (r.next() < 0.5) {
    const c = r.int(-2, 3);
    const a = c - r.int(1, 4);
    const b = c + r.int(1, 4);
    const ans = new Q((c - a) ** 2 + (b - c) ** 2, 2);
    return {
      prompt: `Evaluate $${int(`|${lin(c)}|`, a, b)}$.`,
      answer: num(ans),
      solution: [`Split where the inside changes sign, at $x = ${c}$: two triangles.`, `$\\frac{${c - a}^2}{2} + \\frac{${b - c}^2}{2} = ${ans.tex()}$`],
      selfCheck: () => near(integrate(`abs(x-(${c}))`, a, b, 4000), ans.value(), 1e-6),
    };
  }
  const a = r.int(1, 3);
  const [p, q, s] = [r.nz(-4, 4), r.nz(-4, 4), r.int(-5, 5)];
  // odd part p x^3 + q sin x integrates to 0; even part s gives 2as.
  const ans = new Q(2 * a * s);
  return {
    prompt: `Evaluate $${int(`(${coef(p)}x^{3} ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}\\sin x ${signed(s)})`, -a, a)}$.`,
    answer: num(ans),
    hint: 'Which terms are odd functions?',
    solution: [`$${coef(p)}x^3$ and $\\sin x$ are odd, so over the symmetric interval $[-${a}, ${a}]$ they integrate to $0$.`, `Only the constant is left: $${s} \\cdot ${2 * a} = ${2 * a * s}$`],
    selfCheck: () => near(integrate(`${p}*x^3 + ${q}*sin(x) + ${s}`, -a, a), ans.value()),
  };
};

const areaMore: Gen = (r) => {
  if (r.next() < 0.5) {
    const c = r.int(1, 4);
    // y = x^2 and y = 2c^2 − x^2 meet at ±c.
    const ans = new Q(8 * c ** 3, 3);
    return {
      prompt: `Find the area enclosed by $y = x^{2}$ and $y = ${2 * c * c} - x^{2}$.`,
      answer: num(ans),
      solution: [`They meet where $x^2 = ${2 * c * c} - x^2$, so $x = \\pm ${c}$.`, `$${int(`(${2 * c * c} - 2x^{2})`, -c, c)} = ${ans.tex()}$`],
      selfCheck: () => near(integrate(`${2 * c * c} - 2*x^2`, -c, c), ans.value()),
    };
  }
  const c = r.int(1, 3);
  const ans = new Q(c ** 4, 2);
  return {
    prompt: `Find the total area enclosed between $y = x^{3}$ and $y = ${c * c === 1 ? '' : c * c}x$.`,
    answer: num(ans),
    hint: 'There are two separate regions; area is never negative.',
    solution: [`They meet at $x = 0, \\pm ${c}$. By symmetry the two regions have equal area.`, `$2${int(`(${c * c === 1 ? '' : c * c}x - x^{3})`, 0, c)} = 2\\left(\\frac{${c ** 4}}{2} - \\frac{${c ** 4}}{4}\\right) = ${ans.tex()}$`],
    selfCheck: () => near(2 * integrate(`${c * c}*x - x^3`, 0, c), ans.value()),
  };
};

const antiderivDeep: Skill = {
  ...antideriv,
  levels: [antideriv.levels[0], antideriv.levels[1], { name: 'arctan, roots and simplifying first', generate: mix(antideriv.levels[2].generate, simplifyIntegrand) }],
};
const definiteDeep: Skill = {
  ...definite,
  levels: [
    definite.levels[0],
    { name: 'exp, trig, absolute values, symmetry', generate: mix(definite.levels[1].generate, absAndSymmetry) },
    { name: 'area between curves', generate: mix(definite.levels[2].generate, areaMore) },
  ],
};

/** Integrands f(t); `et(p)` shows f(x^p) with the powers multiplied out. */
const FT = [
  { tex: 'e^{t^{2}}', e: (u: string) => `exp((${u})^2)`, et: (p: number) => `e^{x^{${2 * p}}}` },
  { tex: '\\sin(t^{2})', e: (u: string) => `sin((${u})^2)`, et: (p: number) => `\\sin(x^{${2 * p}})` },
  { tex: '\\sqrt{1 + t^{3}}', e: (u: string) => `sqrt(1+(${u})^3)`, et: (p: number) => `\\sqrt{1 + x^{${3 * p}}}` },
  { tex: '\\frac{1}{1 + t^{4}}', e: (u: string) => `1/(1+(${u})^4)`, et: (p: number) => `\\frac{1}{1 + x^{${4 * p}}}` },
];

const ftc: Skill = {
  id: 'calc.ftc',
  name: 'Riemann sums and the fundamental theorem',
  prereqs: ['calc.antideriv'],
  levels: [
    {
      name: 'Riemann sums',
      generate(r) {
        const kind = r.pick(['left', 'right', 'midpoint'] as const);
        const c = [r.nz(-2, 2), r.int(-3, 3), r.int(-2, 4)];
        const b = r.int(2, 4);
        const n = 4;
        const dx = new Q(b, n);
        const pts = Array.from({ length: n }, (_, i) => dx.mul(i).add(kind === 'left' ? new Q(0) : kind === 'right' ? dx : dx.div(2)));
        const ans = pts.reduce((s, x) => s.add(polyAt(c, x)), new Q(0)).mul(dx);
        return {
          prompt: `Approximate $${int(`(${poly(c).tex})`, 0, b)}$ with a ${kind} Riemann sum using $n = 4$ equal subintervals.`,
          answer: num(ans),
          solution: [
            `$\\Delta x = \\frac{${b}}{4} = ${dx.tex()}$; ${kind} sample points: $${pts.map((x) => x.tex()).join(',\\ ')}$.`,
            `Sum $= \\Delta x \\cdot (${pts.map((x) => polyAt(c, x).tex()).join(' + ')}) = ${ans.tex()}$`,
            `(The exact integral is $${polyInt(c, 0, b).tex()}$.)`,
          ],
        };
      },
    },
    {
      name: 'derivatives of integrals',
      generate(r) {
        const f = r.pick(FT);
        const kind = r.int(0, 2);
        if (kind === 0) {
          const a = r.int(-2, 2);
          return {
            prompt: `Find $\\dfrac{d}{dx}${int(f.tex, a, 'x', 'dt')}$.`,
            answer: expr(f.e('x'), f.et(1)),
            solution: ['Fundamental theorem, part 1: the derivative of $\\int_a^x f(t)\\,dt$ is $f(x)$.', `$${f.et(1)}$`],
          };
        }
        if (kind === 1) {
          const n = r.int(2, 3);
          const d = `${n}*x^${n - 1}*${f.e(`x^${n}`)}`;
          return {
            prompt: `Find $\\dfrac{d}{dx}${int(f.tex, 0, xn(n), 'dt')}$.`,
            answer: expr(d, `${n}${xn(n - 1)}\\,${f.et(n)}`),
            solution: [`Chain rule with $u = ${xn(n)}$: $\\frac{d}{dx}\\int_0^{u} f(t)\\,dt = f(u)\\,u'$.`, `$= ${f.et(n)}\\cdot ${n}${xn(n - 1)}$`],
            selfCheck: () => {
              const G = (x: number) => integrate(f.e('x'), 0, x ** n, 400);
              const h = 1e-4;
              return near((G(1.3 + h) - G(1.3 - h)) / (2 * h), value(d, { x: 1.3 }), 1e-4);
            },
          };
        }
        const d = `2*x*${f.e('x^2')} - ${f.e('x')}`;
        return {
          prompt: `Find $\\dfrac{d}{dx}${int(f.tex, 'x', 'x^{2}', 'dt')}$.`,
          answer: expr(d, `2x\\,${f.et(2)} - ${f.et(1)}`),
          solution: ['Split at $0$: $\\int_0^{x^2} - \\int_0^{x}$, and differentiate each.', `$${f.et(2)}\\cdot 2x - ${f.et(1)}$`],
          selfCheck: () => {
            const G = (x: number) => integrate(f.e('x'), x, x * x, 400);
            const h = 1e-4;
            return near((G(1.3 + h) - G(1.3 - h)) / (2 * h), value(d, { x: 1.3 }), 1e-4);
          },
        };
      },
    },
    {
      name: 'properties and average value',
      generate: mix(
        (r) => {
          const c = [r.nz(-3, 3), r.int(-4, 4), r.int(-4, 4)];
          const a = r.int(-1, 1);
          const b = a + r.int(1, 3);
          const ans = polyInt(c, a, b).div(b - a);
          return {
            prompt: `Find the average value of $f(x) = ${poly(c).tex}$ on $[${a}, ${b}]$.`,
            answer: num(ans),
            solution: [`Average value $= \\dfrac{1}{b - a}\\int_a^b f(x)\\,dx$.`, `$\\dfrac{1}{${b - a}}\\cdot ${polyInt(c, a, b).tex()} = ${ans.tex()}$`],
            selfCheck: () => near(integrate(poly(c).expr, a, b) / (b - a), ans.value()),
          };
        },
        (r) => {
          const k = r.int(1, 3);
          return {
            prompt: `Find the average value of $f(x) = \\sin(${coef(k)}x)$ on $\\left[0, ${k === 1 ? '\\pi' : `\\frac{\\pi}{${k}}`}\\right]$.`,
            answer: num('2/pi', '\\frac{2}{\\pi}'),
            inputHint: 'pi works.',
            solution: [`$\\int_0^{\\pi/${k}}\\sin(${coef(k)}x)\\,dx = \\frac{2}{${k}}$, and the interval has length $\\frac{\\pi}{${k}}$.`, '$\\dfrac{2/' + k + '}{\\pi/' + k + '} = \\dfrac{2}{\\pi}$'],
          };
        },
        (r) => {
          const [A, B] = [r.int(-6, 9), r.int(-6, 9)];
          const [a, b, c] = distinct(r, 3, 0, 8).sort((x, y) => x - y);
          const ask = r.int(0, 1);
          const ans = ask === 0 ? new Q(B - A) : new Q(A - B);
          return {
            prompt: `$\\int_{${a}}^{${b}} f(x)\\,dx = ${A}$ and $\\int_{${a}}^{${c}} f(x)\\,dx = ${B}$. Find $\\int_{${ask === 0 ? b : c}}^{${ask === 0 ? c : b}} f(x)\\,dx$.`,
            answer: num(ans),
            solution: [`$\\int_{${a}}^{${c}} = \\int_{${a}}^{${b}} + \\int_{${b}}^{${c}}$, so $\\int_{${b}}^{${c}} f = ${B} - ${P(A)} = ${B - A}$.`, ask === 0 ? `So the answer is $${B - A}$.` : `Swapping the limits flips the sign: $${A - B}$.`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'A Riemann sum $\\sum f(x_i)\\Delta x$ adds up thin rectangles; the definite integral is its limit as they get thinner. Fundamental theorem: (1) $\\frac{d}{dx}\\int_a^x f(t)\\,dt = f(x)$, and with a variable upper limit $u(x)$ multiply by $u\'(x)$ (chain rule); (2) $\\int_a^b f = F(b) - F(a)$. Properties: $\\int_a^b + \\int_b^c = \\int_a^c$, swapping limits flips the sign. Average value: $\\frac{1}{b-a}\\int_a^b f$.',
    resources: [
      tb1b('integration', 'Integration and the fundamental theorem of calculus'),
      paul('CalcI/DefnOfDefiniteIntegral.aspx', 'Definition of the Definite Integral (and the fundamental theorem)'),
      openstax(1, '5-1-approximating-areas', 'Approximating Areas'),
      openstax(1, '5-3-the-fundamental-theorem-of-calculus', 'The Fundamental Theorem of Calculus'),
    ],
  },
};

// ---------------------------------------------------------------------------
// Techniques: wider substitution, parts, partial fractions, improper; new trig substitution

const usubMore: Gen = (r) => {
  const kind = r.int(0, 2);
  if (kind === 0) {
    const n = r.int(1, 4);
    const F = `tan(x)^${n + 1}/${n + 1}`;
    return {
      prompt: `Find $${int(`\\sec^{2} x\\,\\tan^{${n}} x`)}$.`,
      answer: anti(F, `\\dfrac{\\tan^{${n + 1}} x}{${n + 1}}`),
      inputHint: 'Write powers of trig as tan(x)^3.',
      solution: ['Let $u = \\tan x$, $du = \\sec^2 x\\,dx$.', `$\\int u^{${n}}du = \\dfrac{\\tan^{${n + 1}} x}{${n + 1}}$`],
      selfCheck: () => isDerivative(F, `tan(x)^${n}/cos(x)^2`),
    };
  }
  if (kind === 1) {
    const [a, b] = [r.int(1, 5), r.int(-4, 4)];
    const F = `sin(${a}*x+${b})/${a}`;
    return {
      prompt: `Find $${int(`\\cos(${poly([a, b]).tex})`)}$.`,
      answer: anti(F, `${a === 1 ? '' : `\\frac{1}{${a}}`}\\sin(${poly([a, b]).tex})`),
      solution: [`Let $u = ${poly([a, b]).tex}$, $du = ${a}\\,dx$.`, `$\\frac{1}{${a}}\\int\\cos u\\,du = ${a === 1 ? '' : `\\frac{1}{${a}}`}\\sin(${poly([a, b]).tex})$`],
      selfCheck: () => isDerivative(F, `cos(${a}*x+${b})`),
    };
  }
  const [a, n] = [r.int(1, 5), r.int(2, 4)];
  const F = `(x^4+${a})^${n + 1}/${4 * (n + 1)}`;
  return {
    prompt: `Find $${int(`x^{3}(x^{4} + ${a})^{${n}}`)}$.`,
    answer: anti(F, `\\dfrac{(x^{4} + ${a})^{${n + 1}}}{${4 * (n + 1)}}`),
    solution: [`Let $u = x^4 + ${a}$, $du = 4x^3dx$.`, `$\\frac14\\int u^{${n}}du = \\dfrac{u^{${n + 1}}}{${4 * (n + 1)}}$`],
    selfCheck: () => isDerivative(F, `x^3*(x^4+${a})^${n}`),
  };
};

const usubLog: Gen = (r) => {
  const a = r.int(2, 6);
  const F = `-log(${a}+cos(x))`;
  return {
    prompt: `Find $${int(`\\frac{\\sin x}{${a} + \\cos x}`)}$.`,
    answer: anti(F, `-\\ln(${a} + \\cos x)`),
    solution: [`Let $u = ${a} + \\cos x$, $du = -\\sin x\\,dx$.`, `$-\\int\\frac{du}{u} = -\\ln(${a} + \\cos x)$`],
    selfCheck: () => isDerivative(F, `sin(x)/(${a}+cos(x))`),
  };
};

const usubHard: Gen = (r) => {
  const kind = r.int(0, 4);
  if (kind === 0) {
    const m = r.int(1, 4);
    return {
      prompt: `Evaluate $${int(`\\frac{2x}{x^{2} + 1}`, 0, m)}$.`,
      answer: num(`log(${m * m + 1})`, `\\ln ${m * m + 1}`),
      inputHint: 'ln(5) style.',
      solution: [`$u = x^2 + 1$ runs from $1$ to $${m * m + 1}$ as $x$ runs from $0$ to $${m}$.`, `$\\int_1^{${m * m + 1}} \\frac{du}{u} = \\ln ${m * m + 1}$`],
      selfCheck: () => near(integrate('2*x/(x^2+1)', 0, m), Math.log(m * m + 1)),
    };
  }
  if (kind === 1) {
    const n = r.int(1, 5);
    const ans = new Q(1, n + 1);
    return {
      prompt: `Evaluate $${int(`\\sin x\\cos^{${n}} x`, 0, '\\frac{\\pi}{2}')}$.`,
      answer: num(ans),
      solution: ['$u = \\cos x$, $du = -\\sin x\\,dx$; the limits become $u = 1$ to $u = 0$.', `$\\int_0^1 u^{${n}}du = ${ans.tex()}$`],
      selfCheck: () => near(integrate(`sin(x)*cos(x)^${n}`, 0, Math.PI / 2), ans.value()),
    };
  }
  if (kind === 2) {
    const n = r.int(1, 4);
    const ans = new Q(1, n + 1);
    return {
      prompt: `Evaluate $${int(n === 1 ? '\\frac{\\ln x}{x}' : `\\frac{(\\ln x)^{${n}}}{x}`, 1, 'e')}$.`,
      answer: num(ans),
      solution: ['$u = \\ln x$ runs from $0$ to $1$.', `$\\int_0^1 u^{${n}}du = ${ans.tex()}$`],
      selfCheck: () => near(integrate(`log(x)^${n}/x`, 1, Math.E), ans.value()),
    };
  }
  if (kind === 3) {
    const a = r.int(1, 6);
    const F = `2/3*(x+${a})^(3/2) - ${2 * a}*sqrt(x+${a})`;
    return {
      prompt: `Find $${int(`\\frac{x}{\\sqrt{x + ${a}}}`)}$.`,
      answer: anti(F, `\\tfrac{2}{3}(x + ${a})^{3/2} - ${2 * a}\\sqrt{x + ${a}}`),
      hint: `Let $u = x + ${a}$ and write the leftover $x$ as $u - ${a}$.`,
      solution: [`$u = x + ${a}$, $x = u - ${a}$, $dx = du$: $\\int \\frac{u - ${a}}{\\sqrt u}du = \\int (u^{1/2} - ${a}u^{-1/2})du$.`, `$\\tfrac23u^{3/2} - ${2 * a}u^{1/2}$, with $u = x + ${a}$.`],
      selfCheck: () => isDerivative(F, `x/sqrt(x+${a})`),
    };
  }
  const F = 'atan(exp(x))';
  return {
    prompt: `Find $${int('\\frac{e^{x}}{1 + e^{2x}}')}$.`,
    answer: anti(F, '\\arctan(e^{x})'),
    solution: ['$u = e^x$, $du = e^x dx$, and $e^{2x} = u^2$.', '$\\int\\frac{du}{1 + u^2} = \\arctan u = \\arctan(e^{x})$'],
    selfCheck: () => isDerivative(F, 'exp(x)/(1+exp(2*x))'),
  };
};

const partsMore: Gen = (r) => {
  if (r.next() < 0.5) {
    const k = r.int(1, 4);
    const F = `x*log(${k}*x) - x`;
    return {
      prompt: `Find $${int(`\\ln(${coef(k)}x)`)}$.`,
      answer: anti(F, `x\\ln(${coef(k)}x) - x`),
      hint: 'Take $u = \\ln(\\dots)$ and $dv = dx$.',
      solution: [`$u = \\ln(${coef(k)}x)$, $dv = dx$: $du = \\frac{dx}{x}$, $v = x$.`, `$x\\ln(${coef(k)}x) - \\int x\\cdot\\frac1x dx = x\\ln(${coef(k)}x) - x + C$`],
      selfCheck: () => isDerivative(F, `log(${k}*x)`),
    };
  }
  const F = 'x*atan(x) - log(1+x^2)/2';
  return {
    prompt: `Find $${int('\\arctan x')}$.`,
    answer: anti(F, 'x\\arctan x - \\tfrac12\\ln(1 + x^{2})'),
    hint: 'Take $u = \\arctan x$ and $dv = dx$.',
    solution: ['$u = \\arctan x$, $dv = dx$: $du = \\frac{dx}{1 + x^2}$, $v = x$.', '$x\\arctan x - \\int \\frac{x}{1 + x^2}dx = x\\arctan x - \\tfrac12\\ln(1 + x^{2}) + C$'],
    selfCheck: () => isDerivative(F, 'atan(x)'),
  };
};

const partsTabular: Gen = (r) => {
  const k = r.pick([1, -1, 2]);
  // ∫x³e^{kx} = e^{kx}(x³/k − 3x²/k² + 6x/k³ − 6/k⁴)
  const c = [new Q(1, k), new Q(-3, k * k), new Q(6, k ** 3), new Q(-6, k ** 4)];
  const inner = poly(c);
  const F = `exp(${k}*x)*(${inner.expr})`;
  return {
    prompt: `Find $${int(`x^{3}e^{${coef(k)}x}`)}$.`,
    answer: anti(F, `e^{${coef(k)}x}\\left(${inner.tex}\\right)`),
    hint: 'Three rounds of parts; a table of derivatives of $x^3$ and integrals of the exponential keeps it tidy.',
    solution: [
      `Tabular method: differentiate $x^3 \\to 3x^2 \\to 6x \\to 6 \\to 0$, integrate $e^{${coef(k)}x}$ four times, multiply diagonally with alternating signs.`,
      `$e^{${coef(k)}x}\\left(${inner.tex}\\right) + C$`,
    ],
    selfCheck: () => isDerivative(F, `x^3*exp(${k}*x)`),
  };
};

const partsDefinite: Gen = (r) => {
  const pool = [
    { tex: int('xe^{x}', 0, 1), ans: '1', disp: '1', why: ['$\\int xe^x dx = e^x(x - 1)$.', '$[e^x(x - 1)]_0^1 = 0 - (-1) = 1$'], chk: () => near(integrate('x*exp(x)', 0, 1), 1) },
    { tex: int('\\ln x', 1, 'e'), ans: '1', disp: '1', why: ['$\\int\\ln x\\,dx = x\\ln x - x$.', '$[x\\ln x - x]_1^e = (e - e) - (0 - 1) = 1$'], chk: () => near(integrate('log(x)', 1, Math.E), 1) },
    { tex: int('x\\sin x', 0, '\\pi'), ans: 'pi', disp: '\\pi', why: ['$\\int x\\sin x\\,dx = -x\\cos x + \\sin x$.', '$[-x\\cos x + \\sin x]_0^\\pi = \\pi$'], chk: () => near(integrate('x*sin(x)', 0, Math.PI), Math.PI) },
    { tex: int('x\\cos x', 0, '\\frac{\\pi}{2}'), ans: 'pi/2 - 1', disp: '\\frac{\\pi}{2} - 1', why: ['$\\int x\\cos x\\,dx = x\\sin x + \\cos x$.', '$\\left[x\\sin x + \\cos x\\right]_0^{\\pi/2} = \\frac{\\pi}{2} - 1$'], chk: () => near(integrate('x*cos(x)', 0, Math.PI / 2), Math.PI / 2 - 1) },
    { tex: int('x\\ln x', 1, 'e'), ans: '(e^2+1)/4', disp: '\\frac{e^{2} + 1}{4}', why: ['$\\int x\\ln x\\,dx = \\frac{x^2}{2}\\ln x - \\frac{x^2}{4}$.', '$\\left(\\frac{e^2}{2} - \\frac{e^2}{4}\\right) - \\left(0 - \\frac14\\right) = \\frac{e^{2} + 1}{4}$'], chk: () => near(integrate('x*log(x)', 1, Math.E), (Math.E ** 2 + 1) / 4) },
  ];
  const p = r.pick(pool);
  return { prompt: `Evaluate $${p.tex}$.`, answer: num(p.ans, p.disp), solution: p.why, selfCheck: p.chk };
};

const pfracThree: Gen = (r) => {
  const [a, b] = distinct(r, 2, 1, 5);
  // 1/(x(x+a)(x+b)) = A/x + B/(x+a) + C/(x+b)
  const A = new Q(1, a * b);
  const B = new Q(1, -a * (b - a));
  const C = new Q(1, -b * (a - b));
  const F = sum([t(A, '\\ln|x|', 'log(x)'), t(B, `\\ln|x + ${a}|`, `log(x+${a})`), t(C, `\\ln|x + ${b}|`, `log(x+${b})`)]);
  return {
    prompt: `Find $${int(`\\frac{1}{x(x + ${a})(x + ${b})}`)}$.`,
    answer: anti(F.expr, F.tex),
    solution: [
      `$\\dfrac{1}{x(x + ${a})(x + ${b})} = \\dfrac{A}{x} + \\dfrac{B}{x + ${a}} + \\dfrac{C}{x + ${b}}$; cover-up at $0$, $${-a}$, $${-b}$.`,
      `$A = ${A.tex()}$, $B = ${B.tex()}$, $C = ${C.tex()}$.`,
      `$${F.tex} + C$`,
    ],
    selfCheck: () => isDerivative(F.expr, `1/(x*(x+${a})*(x+${b}))`),
  };
};

const pfracQuadratic: Gen = (r) => {
  if (r.next() < 0.5) {
    const a = r.int(1, 4);
    const b = r.int(1, 3);
    const [A, B, C] = [r.nz(-3, 3), r.nz(-3, 3), r.int(-4, 4)];
    const n = poly([A + B, a * B + C, A * b * b + a * C]);
    const F = sum([t(A, `\\ln|x + ${a}|`, `log(x+${a})`), t(new Q(B, 2), `\\ln(x^{2} + ${b * b})`, `log(x^2+${b * b})`), t(new Q(C, b), b === 1 ? '\\arctan x' : `\\arctan\\frac{x}{${b}}`, `atan(x/${b})`)]);
    return {
      prompt: `Find $${int(`\\frac{${n.tex}}{(x + ${a})(x^{2} + ${b * b})}`)}$.`,
      answer: anti(F.expr, F.tex),
      hint: 'An irreducible quadratic factor gets a linear numerator: $\\frac{Bx + C}{x^2 + b^2}$.',
      solution: [
        `$\\dfrac{${n.tex}}{(x + ${a})(x^{2} + ${b * b})} = \\dfrac{A}{x + ${a}} + \\dfrac{Bx + C}{x^{2} + ${b * b}}$. Cover-up at $x = ${-a}$ gives $A = ${A}$; matching coefficients gives $B = ${B}$, $C = ${C}$.`,
        `$\\int\\frac{Bx}{x^2 + ${b * b}} = \\frac{B}{2}\\ln(x^2 + ${b * b})$ and $\\int\\frac{C}{x^2 + ${b * b}} = \\frac{C}{${b}}\\arctan\\frac{x}{${b}}$.`,
        `$${F.tex} + C$`,
      ],
      selfCheck: () => isDerivative(F.expr, `(${n.expr})/((x+${a})*(x^2+${b * b}))`),
    };
  }
  const a = r.int(1, 4);
  const [p, q] = [r.int(-3, 5), r.int(-4, 6)];
  // (x² + px + q)/(x + a) = x + (p − a) + R/(x + a), R = q − a(p − a)
  const R = q - a * (p - a);
  const F = sum([t(new Q(1, 2), 'x^{2}', 'x^2'), t(p - a, 'x'), t(R, `\\ln|x + ${a}|`, `log(x+${a})`)]);
  return {
    prompt: `Find $${int(`\\frac{${poly([1, p, q]).tex}}{x + ${a}}`)}$.`,
    answer: anti(F.expr, F.tex),
    hint: 'The top has higher degree: divide first.',
    solution: [`Polynomial division: $\\dfrac{${poly([1, p, q]).tex}}{x + ${a}} = ${poly([1, p - a]).tex} ${R === 0 ? '' : `${R < 0 ? '-' : '+'} \\dfrac{${Math.abs(R)}}{x + ${a}}`}$.`, `$${F.tex} + C$`],
    selfCheck: () => isDerivative(F.expr, `(${poly([1, p, q]).expr})/(x+${a})`),
  };
};

const improperMore: Gen = (r) => {
  if (r.next() < 0.5) {
    const a = r.int(1, 5);
    return {
      prompt: `Evaluate $${int(`\\frac{1}{x^{2} + ${a * a}}`, '-\\infty', '\\infty')}$.`,
      answer: num(`pi/${a}`, `\\frac{\\pi}{${a}}`),
      inputHint: 'pi works.',
      solution: [`$\\int\\frac{dx}{x^2 + ${a * a}} = \\frac{1}{${a}}\\arctan\\frac{x}{${a}}$, and $\\arctan \\to \\pm\\frac{\\pi}{2}$ at $\\pm\\infty$.`, `$\\frac{1}{${a}}\\left(\\frac{\\pi}{2} + \\frac{\\pi}{2}\\right) = \\frac{\\pi}{${a}}$`],
    };
  }
  const k = r.int(1, 3);
  return {
    prompt: `Evaluate $${int(`${k === 1 ? '' : k}\\ln x`, 0, 1)}$.`,
    answer: num(new Q(-k)),
    solution: ['The integrand blows up at $0$: $\\lim_{a\\to 0^+}\\int_a^1 \\ln x\\,dx = \\lim [x\\ln x - x]_a^1$.', `$x\\ln x \\to 0$ as $x \\to 0^+$, so $\\int_0^1 \\ln x\\,dx = -1$, times $${k}$: $${-k}$.`],
  };
};

const usubDeep: Skill = {
  ...usub,
  levels: [
    { name: 'spot the inner derivative', generate: mix(usub.levels[0].generate, usubMore) },
    { name: 'logarithmic results', generate: mix(usub.levels[1].generate, usubLog) },
    { name: 'definite and less obvious', generate: mix(usub.levels[2].generate, usubHard, usubHard) },
  ],
  learn: {
    ...usub.learn,
    summary:
      'Substitution is the chain rule in reverse. Look for a function $u = g(x)$ whose derivative also appears (up to a constant factor). Replace $g(x)$ with $u$ and $g\'(x)dx$ with $du$, integrate, and substitute back. For definite integrals change the limits to $u$-values instead of substituting back. If an extra $x$ is left over, express it in terms of $u$ (e.g. $x = u - a$).',
  },
};
const partsDeep: Skill = {
  ...parts,
  levels: [
    { name: 'single application', generate: mix(parts.levels[0].generate, partsMore) },
    { name: 'repeated parts', generate: mix(parts.levels[1].generate, partsTabular) },
    { name: 'the loop trick and definite integrals', generate: mix(parts.levels[2].generate, partsDefinite) },
  ],
};
const pfracDeep: Skill = {
  ...pfrac,
  levels: [
    { name: 'linear factors', generate: mix(pfrac.levels[0].generate, pfracThree) },
    pfrac.levels[1],
    { name: 'repeated, quadratic and improper', generate: mix(pfrac.levels[2].generate, pfracQuadratic, pfracQuadratic) },
  ],
  learn: {
    ...pfrac.learn,
    summary:
      'Split a rational function into simple pieces. Each linear factor $(x - a)$ gets $\\frac{A}{x - a}$; a repeated factor $(x - a)^2$ gets both $\\frac{A}{x - a}$ and $\\frac{B}{(x - a)^2}$; an irreducible quadratic $x^2 + b^2$ gets $\\frac{Bx + C}{x^2 + b^2}$, which integrates to a log plus an arctangent. If the top has degree at least the bottom\'s, do polynomial division first.',
  },
};
const improperDeep: Skill = {
  ...improper,
  levels: [improper.levels[0], { name: 'exponential tails and singularities', generate: mix(improper.levels[1].generate, improperMore) }, improper.levels[2]],
};

const trigSub: Skill = {
  id: 'calc.trigsub',
  name: 'Trigonometric substitution',
  prereqs: ['calc.trigint'],
  levels: [
    {
      name: 'arcsine and arctangent forms',
      generate: mix(
        (r) => {
          const b = r.int(1, 2);
          const a = b * r.int(3, 4);
          const c = r.nz(-4, 4);
          const F = `${c}/${b}*asin(${b}*x/${a})`;
          const k = new Q(c, b);
          return {
            prompt: `Find $${int(`\\frac{${c}}{\\sqrt{${a * a} - ${b * b === 1 ? '' : b * b}x^{2}}}`)}$.`,
            answer: anti(F, `${coef(k)}\\arcsin\\left(\\frac{x}{${a / b}}\\right)`),
            inputHint: 'arcsin(x) or asin(x).',
            solution: [`Substitute $${b === 1 ? '' : b}x = ${a}\\sin\\theta$: the root becomes $${a}\\cos\\theta$ and $dx = \\frac{${a}}{${b}}\\cos\\theta\\,d\\theta$.`, `$\\frac{${c}}{${b}}\\int d\\theta = ${coef(k)}\\theta = ${coef(k)}\\arcsin\\left(\\frac{x}{${a / b}}\\right) + C$`],
            selfCheck: () => isDerivative(F, `${c}/sqrt(${a * a}-${b * b}*x^2)`),
          };
        },
        (r) => {
          const [a, b] = [r.int(1, 5), r.int(1, 3)];
          const c = r.nz(-6, 6);
          const k = new Q(c, a * b);
          const F = `${c}/${a * b}*atan(${b}*x/${a})`;
          return {
            prompt: `Find $${int(`\\frac{${c}}{${a * a} + ${b * b === 1 ? '' : b * b}x^{2}}`)}$.`,
            answer: anti(F, `${coef(k)}\\arctan\\left(\\frac{${b === 1 ? '' : b}x}{${a}}\\right)`),
            inputHint: 'arctan(x) or atan(x).',
            solution: [`Substitute $${b === 1 ? '' : b}x = ${a}\\tan\\theta$: $${a * a} + ${b * b === 1 ? '' : b * b}x^2 = ${a * a}\\sec^2\\theta$, $dx = \\frac{${a}}{${b}}\\sec^2\\theta\\,d\\theta$.`, `$\\frac{${c}}{${a * b}}\\int d\\theta = ${coef(k)}\\arctan\\left(\\frac{${b === 1 ? '' : b}x}{${a}}\\right) + C$`],
            selfCheck: () => isDerivative(F, `${c}/(${a * a}+${b * b}*x^2)`),
          };
        },
      ),
    },
    {
      name: 'circles and definite integrals',
      generate: mix(
        (r) => {
          const a = r.int(1, 6);
          const half = r.next() < 0.5;
          const k = new Q(a * a, half ? 2 : 4);
          return {
            prompt: `Evaluate $${int(`\\sqrt{${a * a} - x^{2}}`, half ? -a : 0, a)}$.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            hint: 'What shape is the graph of $y = \\sqrt{a^2 - x^2}$?',
            solution: [
              `With $x = ${a}\\sin\\theta$ the integrand becomes $${a * a}\\cos^2\\theta$; or notice the graph is a semicircle of radius $${a}$.`,
              `${half ? 'Half' : 'A quarter'} of the disk's area $${a * a}\\pi$: $${pis(k)}$`,
            ],
            selfCheck: () => near(integrate(`sqrt(${a * a}-x^2)`, half ? -a : 0, a, 20000), k.value() * Math.PI, 1e-4),
          };
        },
        (r) => {
          const a = r.int(1, 4);
          // ∫_0^{a/2} √(a² − x²) dx = a²(π/12 + √3/8)
          return {
            prompt: `Evaluate $${int(`\\sqrt{${a * a} - x^{2}}`, 0, new Q(a, 2).tex())}$.`,
            answer: num(`${a * a}*(pi/12 + sqrt(3)/8)`, `${a * a === 1 ? '' : a * a}\\left(\\frac{\\pi}{12} + \\frac{\\sqrt3}{8}\\right)`),
            inputHint: 'pi and sqrt(3) work.',
            solution: [
              `$x = ${a}\\sin\\theta$; the limits become $\\theta = 0$ to $\\frac{\\pi}{6}$, and the integral is $${a * a}\\int_0^{\\pi/6}\\cos^2\\theta\\,d\\theta$.`,
              `$\\cos^2\\theta = \\frac{1 + \\cos 2\\theta}{2}$: $${a * a}\\left[\\frac{\\theta}{2} + \\frac{\\sin 2\\theta}{4}\\right]_0^{\\pi/6} = ${a * a === 1 ? '' : a * a}\\left(\\frac{\\pi}{12} + \\frac{\\sqrt3}{8}\\right)$`,
            ],
            selfCheck: () => near(integrate(`sqrt(${a * a}-x^2)`, 0, a / 2), a * a * (Math.PI / 12 + Math.sqrt(3) / 8), 1e-6),
          };
        },
        (r) => {
          const a = r.int(1, 4);
          const k = new Q(a * a, 4);
          return {
            prompt: `Evaluate $${int(`\\frac{x^{2}}{\\sqrt{${a * a} - x^{2}}}`, 0, a)}$.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`$x = ${a}\\sin\\theta$: $\\frac{${a * a}\\sin^2\\theta}{${a}\\cos\\theta}\\cdot ${a}\\cos\\theta\\,d\\theta = ${a * a}\\sin^2\\theta\\,d\\theta$, for $\\theta$ from $0$ to $\\frac{\\pi}{2}$.`, `$${a * a}\\cdot\\frac{\\pi}{4} = ${pis(k)}$`],
          };
        },
      ),
    },
    {
      name: 'secant and tangent substitutions',
      generate: mix(
        (r) => {
          const a = r.int(1, 4);
          const F = `x/(${a * a}*sqrt(x^2+${a * a}))`;
          return {
            prompt: `Find $${int(`\\frac{1}{(x^{2} + ${a * a})^{3/2}}`)}$.`,
            answer: anti(F, `\\dfrac{x}{${a * a === 1 ? '' : a * a}\\sqrt{x^{2} + ${a * a}}}`),
            solution: [`$x = ${a}\\tan\\theta$: $(x^2 + ${a * a})^{3/2} = ${a ** 3}\\sec^3\\theta$, $dx = ${a}\\sec^2\\theta\\,d\\theta$, leaving $\\frac{1}{${a * a}}\\int\\cos\\theta\\,d\\theta = \\frac{\\sin\\theta}{${a * a}}$.`, `From the triangle, $\\sin\\theta = \\frac{x}{\\sqrt{x^2 + ${a * a}}}$: $\\dfrac{x}{${a * a === 1 ? '' : a * a}\\sqrt{x^{2} + ${a * a}}} + C$`],
            selfCheck: () => isDerivative(F, `1/(x^2+${a * a})^(3/2)`),
          };
        },
        (r) => {
          const a = r.int(1, 4);
          const F = `log(x + sqrt(x^2+${a * a}))`;
          return {
            prompt: `Find $${int(`\\frac{1}{\\sqrt{x^{2} + ${a * a}}}`)}$.`,
            answer: anti(F, `\\ln\\left(x + \\sqrt{x^{2} + ${a * a}}\\right)`),
            solution: [`$x = ${a}\\tan\\theta$ reduces it to $\\int\\sec\\theta\\,d\\theta = \\ln|\\sec\\theta + \\tan\\theta|$.`, `Back in $x$ (constants absorbed into $C$): $\\ln\\left(x + \\sqrt{x^{2} + ${a * a}}\\right) + C$`],
            selfCheck: () => isDerivative(F, `1/sqrt(x^2+${a * a})`),
          };
        },
        (r) => {
          const a = r.int(1, 4);
          const F = `-sqrt(x^2+${a * a})/(${a * a}*x)`;
          return {
            prompt: `Find $${int(`\\frac{1}{x^{2}\\sqrt{x^{2} + ${a * a}}}`)}$.`,
            answer: anti(F, `-\\dfrac{\\sqrt{x^{2} + ${a * a}}}{${a * a === 1 ? '' : a * a}x}`),
            solution: [`$x = ${a}\\tan\\theta$ gives $\\frac{1}{${a * a}}\\int\\frac{\\cos\\theta}{\\sin^2\\theta}d\\theta = -\\frac{1}{${a * a}\\sin\\theta}$.`, `$\\sin\\theta = \\frac{x}{\\sqrt{x^2 + ${a * a}}}$: $-\\dfrac{\\sqrt{x^{2} + ${a * a}}}{${a * a === 1 ? '' : a * a}x} + C$`],
            selfCheck: () => isDerivative(F, `1/(x^2*sqrt(x^2+${a * a}))`),
          };
        },
        (r) => {
          const a = r.int(3, 5);
          const F = `x/(${a * a}*sqrt(${a * a}-x^2))`;
          return {
            prompt: `Find $${int(`\\frac{1}{(${a * a} - x^{2})^{3/2}}`)}$.`,
            answer: anti(F, `\\dfrac{x}{${a * a}\\sqrt{${a * a} - x^{2}}}`),
            solution: [`$x = ${a}\\sin\\theta$ gives $\\frac{1}{${a * a}}\\int\\sec^2\\theta\\,d\\theta = \\frac{\\tan\\theta}{${a * a}}$.`, `$\\tan\\theta = \\frac{x}{\\sqrt{${a * a} - x^2}}$: $\\dfrac{x}{${a * a}\\sqrt{${a * a} - x^{2}}} + C$`],
            selfCheck: () => isDerivative(F, `1/(${a * a}-x^2)^(3/2)`),
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Roots of quadratics turn into trig: $\\sqrt{a^2 - x^2}$ with $x = a\\sin\\theta$ (becomes $a\\cos\\theta$), $\\sqrt{a^2 + x^2}$ with $x = a\\tan\\theta$ (becomes $a\\sec\\theta$), $\\sqrt{x^2 - a^2}$ with $x = a\\sec\\theta$ (becomes $a\\tan\\theta$). Integrate in $\\theta$, then draw the right triangle to convert back to $x$. For definite integrals just change the limits to $\\theta$. Recognising a semicircle saves the work entirely.',
    resources: [paul('CalcII/TrigSubstitutions.aspx', 'Trig Substitutions'), openstax(2, '3-3-trigonometric-substitution', 'Trigonometric Substitution')],
  },
};

const numericalIntegration: Skill = {
  id: 'calc.numint',
  name: 'Numerical integration',
  prereqs: ['calc.ftc'],
  levels: [
    {
      name: 'trapezoid rule',
      generate(r) {
        const c = [r.nz(-2, 2), r.int(-3, 3), r.int(0, 4)];
        const b = r.int(2, 4);
        const n = r.pick([2, 4]);
        const dx = new Q(b, n);
        const ys = Array.from({ length: n + 1 }, (_, i) => polyAt(c, dx.mul(i)));
        const ans = ys.reduce((s, y, i) => s.add(y.mul(i === 0 || i === n ? 1 : 2)), new Q(0)).mul(dx).div(2);
        return {
          prompt: `Approximate $${int(`(${poly(c).tex})`, 0, b)}$ with the trapezoid rule, $n = ${n}$.`,
          answer: num(ans),
          solution: [`$\\Delta x = ${dx.tex()}$: $T = \\frac{\\Delta x}{2}(y_0 + 2y_1 + \\dots + 2y_{${n - 1}} + y_{${n}})$ with $y_i = ${ys.map((y) => y.tex()).join(',\\ ')}$.`, `$T = ${ans.tex()}$ (exact: $${polyInt(c, 0, b).tex()}$)`],
        };
      },
    },
    {
      name: 'Simpson’s rule',
      generate(r) {
        const c = [r.nz(-2, 2), r.int(-3, 3), r.int(-3, 3), r.int(0, 4)];
        const b = r.int(1, 3) * 2;
        const n = r.pick([2, 4]);
        const dx = new Q(b, n);
        const ys = Array.from({ length: n + 1 }, (_, i) => polyAt(c, dx.mul(i)));
        const w = (i: number) => (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
        const ans = ys.reduce((s, y, i) => s.add(y.mul(w(i))), new Q(0)).mul(dx).div(3);
        return {
          prompt: `Approximate $${int(`(${poly(c).tex})`, 0, b)}$ with Simpson’s rule, $n = ${n}$.`,
          answer: num(ans),
          solution: [`$\\Delta x = ${dx.tex()}$, weights $1, 4, 2, \\dots, 4, 1$: $S = \\frac{\\Delta x}{3}(${ys.map((y, i) => `${w(i) === 1 ? '' : `${w(i)}\\cdot`}${P(y.tex())}`).join(' + ')})$.`, `$S = ${ans.tex()}$: exactly the true value, since Simpson’s rule is exact for cubics.`],
          selfCheck: () => ans.eq(polyInt(c, 0, b)),
        };
      },
    },
    {
      name: 'midpoint rule',
      generate(r) {
        const k = r.int(1, 3);
        const n = 4;
        const b = r.int(1, 2) * 2;
        const dx = new Q(b, n);
        const mids = Array.from({ length: n }, (_, i) => dx.mul(i).add(dx.div(2)));
        const ans = mids.reduce((s, x) => s.add(x.mul(x).mul(k)), new Q(0)).mul(dx);
        return {
          prompt: `Approximate $${int(`${k === 1 ? '' : k}x^{2}`, 0, b)}$ with the midpoint rule, $n = 4$.`,
          answer: num(ans),
          solution: [`Midpoints $${mids.map((m) => m.tex()).join(',\\ ')}$, $\\Delta x = ${dx.tex()}$.`, `$M = ${ans.tex()}$ (exact: $${new Q(k * b ** 3, 3).tex()}$; the midpoint error is about half the trapezoid error, with opposite sign).`],
        };
      },
    },
  ],
  learn: {
    summary:
      'When no antiderivative is available, approximate. With $\\Delta x = \\frac{b-a}{n}$: midpoint $M = \\Delta x\\sum f(m_i)$; trapezoid $T = \\frac{\\Delta x}{2}(y_0 + 2y_1 + \\dots + 2y_{n-1} + y_n)$; Simpson ($n$ even) $S = \\frac{\\Delta x}{3}(y_0 + 4y_1 + 2y_2 + \\dots + 4y_{n-1} + y_n)$. Errors shrink like $\\Delta x^2$ for the first two and $\\Delta x^4$ for Simpson, which is exact for cubics.',
    resources: [paul('CalcII/ApproximatingDefIntegrals.aspx', 'Approximating Definite Integrals'), openstax(2, '3-6-numerical-integration', 'Numerical Integration')],
  },
};

// ---------------------------------------------------------------------------
// Applications of integration

const volumes: Skill = {
  id: 'calc.volume',
  name: 'Volumes of revolution',
  prereqs: ['calc.definite'],
  levels: [
    {
      name: 'disks',
      generate: mix(
        (r) => {
          const n = r.int(1, 3);
          const b = r.int(1, 3);
          const k = new Q(b ** (2 * n + 1), 2 * n + 1);
          return {
            prompt: `The region under $y = ${xn(n)}$ for $0 \\le x \\le ${b}$ is rotated about the $x$-axis. Find the volume.`,
            answer: piTimes(k),
            inputHint: 'pi works, e.g. 32*pi/5.',
            solution: [`Disks of radius $${xn(n)}$: $V = \\pi${int(`x^{${2 * n}}`, 0, b)}$.`, `$= \\pi\\cdot\\frac{${b}^{${2 * n + 1}}}{${2 * n + 1}} = ${pis(k)}$`],
          };
        },
        (r) => {
          const b = r.int(1, 6);
          const k = new Q(b * b, 2);
          return {
            prompt: `The region under $y = \\sqrt{x}$ for $0 \\le x \\le ${b}$ is rotated about the $x$-axis. Find the volume.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`$V = \\pi${int('(\\sqrt{x})^{2}', 0, b)} = \\pi${int('x', 0, b)}$.`, `$= ${pis(k)}$ (a paraboloid)`],
          };
        },
        (r) => {
          const rr = r.int(1, 5);
          const k = new Q(4 * rr ** 3, 3);
          return {
            prompt: `Rotate the half-disk under $y = \\sqrt{${rr * rr} - x^{2}}$ about the $x$-axis. Find the volume of the resulting solid.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`$V = \\pi${int(`(${rr * rr} - x^{2})`, -rr, rr)} = \\pi\\left[${rr * rr}x - \\frac{x^3}{3}\\right]_{-${rr}}^{${rr}}$.`, `$= ${pis(k)}$: the volume of a ball, $\\frac43\\pi r^3$.`],
          };
        },
      ),
    },
    {
      name: 'washers',
      generate: mix(
        (r) => {
          const c = r.int(1, 3);
          const k = new Q(2 * c ** 5, 15);
          return {
            prompt: `The region between $y = ${c === 1 ? '' : c}x$ and $y = x^{2}$ is rotated about the $x$-axis. Find the volume.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`The curves meet at $x = 0$ and $x = ${c}$; the line is the outer radius.`, `$V = \\pi${int(`(${c * c === 1 ? '' : c * c}x^{2} - x^{4})`, 0, c)} = \\pi\\left(\\frac{${c ** 5}}{3} - \\frac{${c ** 5}}{5}\\right) = ${pis(k)}$`],
          };
        },
        () => ({
          prompt: 'The region between $y = \\sqrt{x}$ and $y = x^{2}$ is rotated about the $x$-axis. Find the volume.',
          answer: piTimes(new Q(3, 10)),
          inputHint: 'pi works.',
          solution: ['They meet at $x = 0$ and $x = 1$; $\\sqrt x$ is the outer radius.', `$V = \\pi${int('(x - x^{4})', 0, 1)} = \\pi\\left(\\frac12 - \\frac15\\right) = \\frac{3\\pi}{10}$`],
        }),
        (r) => {
          const h = r.int(1, 3);
          // region under y = x² on [0,1] about y = −h: π∫((x²+h)² − h²) = π(1/5 + 2h/3)
          const k = new Q(1, 5).add(new Q(2 * h, 3));
          return {
            prompt: `The region under $y = x^{2}$ for $0 \\le x \\le 1$ is rotated about the line $y = -${h}$. Find the volume.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`Washers: outer radius $x^2 + ${h}$, inner radius $${h}$ (distance from the axis to the $x$-axis).`, `$V = \\pi${int(`\\left((x^{2} + ${h})^{2} - ${h * h}\\right)`, 0, 1)} = \\pi\\left(\\frac15 + \\frac{${2 * h}}{3}\\right) = ${pis(k)}$`],
          };
        },
      ),
    },
    {
      name: 'shells',
      generate: mix(
        (r) => {
          const b = r.int(1, 3);
          const k = new Q(b ** 4, 2);
          return {
            prompt: `The region under $y = x^{2}$ for $0 \\le x \\le ${b}$ is rotated about the $y$-axis. Find the volume.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`Shells: radius $x$, height $x^2$: $V = 2\\pi${int('x\\cdot x^{2}', 0, b)}$.`, `$= 2\\pi\\cdot\\frac{${b ** 4}}{4} = ${pis(k)}$`],
          };
        },
        (r) => {
          const c = r.int(1, 4);
          const k = new Q(c ** 4, 6);
          return {
            prompt: `The region between $y = ${c === 1 ? '' : c}x - x^{2}$ and the $x$-axis is rotated about the $y$-axis. Find the volume.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`The parabola crosses the axis at $0$ and $${c}$. Shells: $V = 2\\pi${int(`x(${c === 1 ? '' : c}x - x^{2})`, 0, c)}$.`, `$= 2\\pi\\left(\\frac{${c ** 4}}{3} - \\frac{${c ** 4}}{4}\\right) = ${pis(k)}$`],
          };
        },
        () => ({
          prompt: 'The region under $y = e^{-x^{2}}$ for $x \\ge 0$ is rotated about the $y$-axis. Find the volume.',
          answer: piTimes(new Q(1)),
          inputHint: 'pi works.',
          solution: [`Shells: $V = 2\\pi${int('xe^{-x^{2}}', 0, '\\infty')}$.`, 'Substitute $u = x^2$: $\\pi\\int_0^\\infty e^{-u}du = \\pi$'],
          selfCheck: () => near(2 * Math.PI * integrate('x*exp(-x^2)', 0, 12, 4000), Math.PI),
        }),
      ),
    },
  ],
  learn: {
    summary:
      'Rotating about the $x$-axis, slice perpendicular to it: a disk of radius $R(x)$ has area $\\pi R^2$, so $V = \\pi\\int R^2\\,dx$; a washer (hole of radius $r$) gives $\\pi\\int (R^2 - r^2)\\,dx$. Radii are distances to the axis, so for the line $y = -h$ add $h$. Shells, for rotating about the $y$-axis: a cylinder of radius $x$ and height $f(x)$ gives $V = 2\\pi\\int x f(x)\\,dx$.',
    resources: [paul('CalcI/VolumeWithRings.aspx', 'Volumes of Solids of Revolution: Method of Rings'), paul('CalcI/VolumeWithCylinder.aspx', 'Method of Cylinders'), openstax(1, '6-2-determining-volumes-by-slicing', 'Determining Volumes by Slicing')],
  },
};

const arcLength: Skill = {
  id: 'calc.arclength',
  name: 'Arc length and surface area',
  prereqs: ['calc.usub'],
  levels: [
    {
      name: 'arc length',
      generate: mix(
        (r) => {
          const m = r.int(2, 4);
          const b = m * m - 1;
          const ans = new Q(2 * (m ** 3 - 1), 3);
          return {
            prompt: `Find the length of the curve $y = \\tfrac23 x^{3/2}$ from $x = 0$ to $x = ${b}$.`,
            answer: num(ans),
            solution: [`$y' = x^{1/2}$, so $L = ${int('\\sqrt{1 + x}', 0, b)}$.`, `$= \\left[\\tfrac23(1 + x)^{3/2}\\right]_0^{${b}} = \\tfrac23(${m ** 3} - 1) = ${ans.tex()}$`],
            selfCheck: () => near(integrate('sqrt(1+x)', 0, b), ans.value()),
          };
        },
        (r) => {
          const b = r.int(2, 4);
          const F = (x: number) => new Q(x ** 3, 6).sub(new Q(1, 2 * x));
          const ans = F(b).sub(F(1));
          return {
            prompt: `Find the length of the curve $y = \\dfrac{x^{3}}{6} + \\dfrac{1}{2x}$ from $x = 1$ to $x = ${b}$.`,
            answer: num(ans),
            hint: 'Expand $1 + (y\')^2$: it is a perfect square.',
            solution: [`$y' = \\frac{x^2}{2} - \\frac{1}{2x^2}$, and $1 + (y')^2 = \\left(\\frac{x^2}{2} + \\frac{1}{2x^2}\\right)^2$.`, `$L = ${int('\\left(\\frac{x^{2}}{2} + \\frac{1}{2x^{2}}\\right)', 1, b)} = \\left[\\frac{x^3}{6} - \\frac{1}{2x}\\right]_1^{${b}} = ${ans.tex()}$`],
            selfCheck: () => near(integrate('sqrt(1 + (x^2/2 - 1/(2*x^2))^2)', 1, b), ans.value()),
          };
        },
        (r) => {
          const m = r.int(2, 5);
          const ans = new Q(m * m - 1, 2 * m);
          return {
            prompt: `Find the length of the curve $y = \\cosh x = \\dfrac{e^{x} + e^{-x}}{2}$ from $x = 0$ to $x = \\ln ${m}$.`,
            answer: num(ans),
            solution: [`$1 + \\sinh^2 x = \\cosh^2 x$, so $L = \\int_0^{\\ln ${m}}\\cosh x\\,dx = \\sinh(\\ln ${m})$.`, `$= \\dfrac{${m} - \\frac{1}{${m}}}{2} = ${ans.tex()}$`],
            selfCheck: () => near(integrate('cosh(x)', 0, Math.log(m)), ans.value()),
          };
        },
      ),
    },
    {
      name: 'parametric curves',
      generate: mix(
        (r) => {
          const R = r.int(1, 6);
          const turns = r.pick([new Q(1, 2), new Q(1), new Q(1, 4)]);
          return {
            prompt: `Find the length of $x = ${R}\\cos t$, $y = ${R}\\sin t$ for $0 \\le t \\le ${turns.eq(1) ? '2\\pi' : turns.eq(new Q(1, 2)) ? '\\pi' : '\\frac{\\pi}{2}'}$.`,
            answer: piTimes(turns.mul(2 * R)),
            inputHint: 'pi works.',
            solution: [`$\\sqrt{(x')^2 + (y')^2} = \\sqrt{${R * R}\\sin^2 t + ${R * R}\\cos^2 t} = ${R}$.`, `Length $= ${R}\\cdot$ (length of the $t$-interval) $= ${pis(turns.mul(2 * R))}$`],
          };
        },
        (r) => {
          const a = r.int(1, 3);
          const T = r.int(1, 3);
          // x = 3a t², y = 2a t³ has speed 6a t √(1 + t²).
          const L = `2*${a}*((1+${T * T})^(3/2) - 1)`;
          return {
            prompt: `Find the length of $x = ${3 * a}t^{2}$, $y = ${2 * a}t^{3}$ for $0 \\le t \\le ${T}$.`,
            answer: num(L, `${2 * a}\\left(${1 + T * T}^{3/2} - 1\\right)`),
            inputHint: 'An exact form like 2*(2^(3/2) - 1) is fine.',
            solution: [`$x' = ${6 * a}t$, $y' = ${6 * a}t^2$: speed $${6 * a}t\\sqrt{1 + t^2}$.`, `$\\int_0^{${T}} ${6 * a}t\\sqrt{1 + t^2}\\,dt = ${2 * a}\\left[(1 + t^2)^{3/2}\\right]_0^{${T}}$`],
            selfCheck: () => near(integrate(`${6 * a}*x*sqrt(1+x^2)`, 0, T), value(L)),
          };
        },
      ),
    },
    {
      name: 'surface area',
      generate: mix(
        (r) => {
          const R = r.int(1, 5);
          const a = r.int(-R, R - 1);
          const top = a + r.int(1, R - a);
          const k = new Q(2 * R * (top - a));
          return {
            prompt: `The arc $y = \\sqrt{${R * R} - x^{2}}$ for $${a} \\le x \\le ${top}$ is rotated about the $x$-axis. Find the area of the surface.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`$S = 2\\pi\\int y\\sqrt{1 + (y')^2}\\,dx$, and here $y\\sqrt{1 + (y')^2} = ${R}$ (constant!).`, `$S = 2\\pi\\cdot ${R}\\cdot ${top - a} = ${pis(k)}$: a band of a sphere has area proportional to its width.`],
          };
        },
        (r) => {
          const kk = r.pick([3, 5, 7]);
          const b = (kk * kk - 1) / 4;
          const k = new Q(kk ** 3 - 1, 6);
          return {
            prompt: `The curve $y = \\sqrt{x}$ for $0 \\le x \\le ${b}$ is rotated about the $x$-axis. Find the surface area.`,
            answer: piTimes(k),
            inputHint: 'pi works.',
            solution: [`$y\\sqrt{1 + (y')^2} = \\sqrt{x}\\sqrt{1 + \\frac{1}{4x}} = \\sqrt{x + \\frac14}$.`, `$S = 2\\pi${int('\\sqrt{x + \\tfrac14}', 0, b)} = \\frac{4\\pi}{3}\\left[\\left(x + \\tfrac14\\right)^{3/2}\\right]_0^{${b}} = ${pis(k)}$`],
            selfCheck: () => near(2 * Math.PI * integrate('sqrt(x+1/4)', 0, b), k.value() * Math.PI),
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Arc length: $L = \\int_a^b\\sqrt{1 + (y\')^2}\\,dx$, or for a parametric curve $\\int\\sqrt{(x\')^2 + (y\')^2}\\,dt$. Most nice examples are designed so that $1 + (y\')^2$ is a perfect square. Surface of revolution about the $x$-axis: $S = 2\\pi\\int y\\sqrt{1 + (y\')^2}\\,dx$ (circumference times arc length element).',
    resources: [paul('CalcII/ArcLength.aspx', 'Arc Length'), paul('CalcII/SurfaceArea.aspx', 'Surface Area'), openstax(2, '2-4-arc-length-of-a-curve-and-surface-area', 'Arc Length of a Curve and Surface Area')],
  },
};

const physics: Skill = {
  id: 'calc.intapps',
  name: 'Work and centroids',
  prereqs: ['calc.definite'],
  levels: [
    {
      name: 'springs',
      generate(r) {
        const F = r.int(2, 12) * 5;
        const d = r.pick([new Q(1, 10), new Q(1, 5), new Q(1, 2)]);
        const k = new Q(F).div(d);
        const a = r.pick([new Q(0), new Q(1, 10)]);
        const b = a.add(r.pick([new Q(1, 5), new Q(3, 10), new Q(1, 2)]));
        const W = k.mul(b.mul(b).sub(a.mul(a))).div(2);
        return {
          prompt: `A force of ${F} N holds a spring stretched ${d.value()} m beyond its natural length. How much work (in J) does it take to stretch it from ${a.value()} m to ${b.value()} m beyond natural length?`,
          answer: num(W),
          solution: [`Hooke's law $F = kx$: $k = \\frac{${F}}{${d.value()}} = ${k.tex()}$ N/m.`, `$W = \\int_{${a.value()}}^{${b.value()}} ${k.tex()}x\\,dx = \\frac{${k.tex()}}{2}(${b.value()}^2 - ${a.value()}^2) = ${W.tex()}$ J`],
        };
      },
    },
    {
      name: 'lifting and pumping',
      generate: mix(
        (r) => {
          const L = r.int(5, 30);
          const w = r.int(1, 6);
          const W = new Q(w * L * L, 2);
          return {
            prompt: `A rope ${L} m long weighing ${w} N/m hangs from the top of a building. How much work (in J) does it take to pull the whole rope up to the top?`,
            answer: num(W),
            solution: ['A piece at depth $y$ weighs $' + w + '\\,dy$ N and must be lifted $y$ metres.', `$W = \\int_0^{${L}} ${w}y\\,dy = \\frac{${w}\\cdot ${L}^2}{2} = ${W.tex()}$ J`],
          };
        },
        (r) => {
          const R = r.int(1, 3);
          const H = r.int(2, 5);
          const k = new Q(9800 * R * R * H * H, 2);
          return {
            prompt: `A cylindrical tank of radius ${R} m and height ${H} m is full of water (weight density $9800$ N/m³). How much work does it take to pump all the water out over the top? (in J)`,
            answer: piTimes(k, `${k.n}\\pi`),
            inputHint: 'pi works.',
            solution: [`A slice at height $y$ has volume $\\pi\\cdot${R * R}\\,dy$, weight $9800\\pi\\cdot ${R * R}\\,dy$, and is lifted $${H} - y$.`, `$W = 9800\\pi\\cdot ${R * R}\\int_0^{${H}} (${H} - y)\\,dy = ${k.n}\\pi$ J`],
          };
        },
      ),
    },
    {
      name: 'centroids',
      generate(r) {
        const n = r.int(1, 3);
        const b = r.int(1, 4);
        const wantX = r.next() < 0.5;
        const ans = wantX ? new Q((n + 1) * b, n + 2) : new Q((n + 1) * b ** n, 2 * (2 * n + 1));
        const A = new Q(b ** (n + 1), n + 1);
        return {
          prompt: `Find the ${wantX ? '$x$' : '$y$'}-coordinate of the centroid of the region under $y = ${xn(n)}$ for $0 \\le x \\le ${b}$.`,
          answer: num(ans),
          solution: [
            `Area $A = ${int(xn(n), 0, b)} = ${A.tex()}$.`,
            wantX
              ? `$\\bar x = \\frac{1}{A}${int(`x\\cdot ${xn(n)}`, 0, b)} = \\frac{1}{A}\\cdot\\frac{${b}^{${n + 2}}}{${n + 2}} = ${ans.tex()}$`
              : `$\\bar y = \\frac{1}{A}${int(`\\tfrac12 (${xn(n)})^{2}`, 0, b)} = \\frac{1}{A}\\cdot\\frac{${b}^{${2 * n + 1}}}{${2 * (2 * n + 1)}} = ${ans.tex()}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Work is force times distance; when either varies, slice and integrate: $W = \\int F(x)\\,dx$. Springs follow Hooke\'s law $F = kx$ ($x$ measured from natural length). For lifting or pumping, each slice has its own weight and its own lifting distance. The centroid of the region under $f$ on $[a, b]$: $\\bar x = \\frac{1}{A}\\int x f(x)\\,dx$ and $\\bar y = \\frac{1}{A}\\int \\tfrac12 f(x)^2\\,dx$.',
    resources: [paul('CalcI/Work.aspx', 'Work'), paul('CalcII/CenterOfMass.aspx', 'Center of Mass'), openstax(1, '6-5-physical-applications', 'Physical Applications')],
  },
};

// ---------------------------------------------------------------------------
// Sequences and series

const sequences: Skill = {
  id: 'calc.sequences',
  name: 'Sequences',
  prereqs: ['calc.lhopital'],
  levels: [
    {
      name: 'limits of sequences',
      generate: mix(
        (r) => {
          const [a, c] = [r.nz(-6, 6), r.nz(-6, 6)];
          const [b, d] = [r.int(-5, 5), r.int(-5, 5)];
          return {
            prompt: `Find $\\displaystyle\\lim_{n\\to\\infty} \\frac{${sum([mono(a, 2, 'n'), t(b)]).tex}}{${sum([mono(c, 2, 'n'), mono(d, 1, 'n')]).tex}}$.`,
            answer: num(new Q(a, c)),
            solution: ['Divide top and bottom by $n^2$.', `$\\to \\frac{${a}}{${c}} = ${new Q(a, c).tex()}$`],
          };
        },
        (r) => {
          const a = r.nz(-6, 6);
          return {
            prompt: `Find $\\displaystyle\\lim_{n\\to\\infty} \\left(\\sqrt{n^{2} ${st(a, 'n')}} - n\\right)$.`,
            answer: num(new Q(a, 2)),
            solution: [`Conjugate: $\\dfrac{${coef(a)}n}{\\sqrt{n^2 ${st(a, 'n')}} + n}$.`, `Divide by $n$: $\\to \\frac{${a}}{2}$`],
          };
        },
        (r) => {
          const k = r.int(1, 3);
          return {
            prompt: `Does $a_n = \\dfrac{(-1)^{n}n}{n ${signed(k)}}$ converge?`,
            answer: choice(['Yes, to 0', 'Yes, to 1', 'No'], 2),
            solution: ['$\\frac{n}{n + ' + k + '} \\to 1$, so the terms alternate near $1$ and $-1$.', 'Two different limit points: the sequence diverges.'],
          };
        },
        (r) => {
          const k = r.int(1, 3);
          return {
            prompt: `Does $a_n = \\dfrac{(-1)^{n}}{n^{${k}}}$ converge? If so, to what?`,
            answer: choice(['Yes, to 0', 'Yes, to 1', 'No'], 0),
            solution: [`$|a_n| = \\frac{1}{n^{${k}}} \\to 0$, and if $|a_n| \\to 0$ then $a_n \\to 0$.`],
          };
        },
      ),
    },
    {
      name: 'standard limits',
      generate(r) {
        const a = r.nz(-4, 4);
        const b = r.int(1, 3);
        const c = r.int(2, 9);
        const pool: { tex: string; ans: string; disp?: string; why: string }[] = [
          { tex: `\\left(1 ${a < 0 ? '-' : '+'} \\frac{${Math.abs(a)}}{n}\\right)^{${b === 1 ? '' : b}n}`, ans: `e^(${a * b})`, disp: `e^{${a * b}}`, why: `$(1 + \\frac{x}{n})^n \\to e^x$; raise to the power $${b}$: $e^{${a * b}}$.` },
          { tex: `\\sqrt[n]{${c}n}`, ans: '1', why: `$\\sqrt[n]{${c}} \\to 1$ and $\\sqrt[n]{n} = e^{\\ln n/n} \\to e^0 = 1$.` },
          { tex: `\\frac{\\ln n}{n^{${b === 1 ? '' : `1/${b}`}}}`.replace('n^{}', 'n'), ans: '0', why: 'Logarithms grow slower than any power (L’Hôpital).' },
          { tex: `\\frac{${c}^{n}}{n!}`, ans: '0', why: `Factorials beat exponentials: after $n > ${2 * c}$ each new factor $\\frac{${c}}{n}$ is below $\\frac12$.` },
          { tex: `\\frac{n!}{n^{n}}`, ans: '0', why: '$\\frac{n!}{n^n} = \\frac{1}{n}\\cdot\\frac{2}{n}\\cdots\\frac{n}{n} \\le \\frac1n \\to 0$.' },
          { tex: `n\\sin\\frac{${a}}{n}`, ans: `${a}`, why: `$n\\sin\\frac{${a}}{n} = ${a}\\cdot\\frac{\\sin u}{u}$ with $u = \\frac{${a}}{n} \\to 0$.` },
        ];
        const p = r.pick(pool);
        return {
          prompt: `Find $\\displaystyle\\lim_{n\\to\\infty} ${p.tex}$.`,
          answer: num(p.ans, p.disp),
          inputHint: 'e^3 style for powers of e.',
          solution: [p.why],
        };
      },
    },
    {
      name: 'recursive sequences',
      generate: mix(
        (r) => {
          const k = r.int(2, 5);
          const c = k * (k - 1);
          return {
            prompt: `$a_1 = 1$ and $a_{n+1} = \\sqrt{${c} + a_n}$. The sequence converges; find its limit.`,
            answer: num(new Q(k)),
            solution: [`If $a_n \\to L$, then $L = \\sqrt{${c} + L}$, so $L^2 - L - ${c} = 0$: $(L - ${k})(L + ${k - 1}) = 0$.`, `The terms are positive, so $L = ${k}$.`],
          };
        },
        (r) => {
          const c = r.pick([2, 3, 5, 7, 10]);
          return {
            prompt: `$a_1 = 1$ and $a_{n+1} = \\dfrac12\\left(a_n + \\dfrac{${c}}{a_n}\\right)$. Find the limit.`,
            answer: num(`sqrt(${c})`, `\\sqrt{${c}}`),
            inputHint: 'sqrt(2) style.',
            solution: [`$L = \\frac12(L + \\frac{${c}}{L})$ gives $L^2 = ${c}$; the terms are positive.`, `$L = \\sqrt{${c}}$ (this is Newton’s method for $x^2 - ${c}$).`],
          };
        },
        (r) => {
          const q = r.int(2, 5);
          const p = r.nz(-q + 1, q - 1);
          const rr = new Q(p, q);
          const b = r.nz(-6, 6);
          const L = new Q(b).div(new Q(1).sub(rr));
          return {
            prompt: `$a_0 = 0$ and $a_{n+1} = ${rr.tex()}a_n ${signed(b)}$. Find $\\displaystyle\\lim_{n\\to\\infty} a_n$.`,
            answer: num(L),
            solution: [`Since $|${rr.tex()}| < 1$ the iteration contracts to the fixed point: $L = ${rr.tex()}L ${signed(b)}$.`, `$L = \\dfrac{${b}}{1 - ${P(rr.tex())}} = ${L.tex()}$`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'A sequence converges if its terms approach one number. Treat $a_n$ like a function of $x$ and use limit tools (dominant terms, conjugates, L’Hôpital). Growth order: $\\ln n \\ll n^p \\ll c^n \\ll n! \\ll n^n$. Key limits: $(1 + \\frac{x}{n})^n \\to e^x$, $\\sqrt[n]{n} \\to 1$. For a convergent recursive sequence $a_{n+1} = f(a_n)$, the limit solves $L = f(L)$; pick the root consistent with the terms.',
    resources: [paul('CalcII/Sequences.aspx', 'Sequences'), paul('CalcII/MoreSequences.aspx', 'More on Sequences'), openstax(2, '5-1-sequences', 'Sequences')],
  },
};

const seriesMore: Gen = (r) => {
  const [a, b] = distinct(r, 2, 1, 4);
  const c = r.int(Math.max(a, b) + 1, 7);
  // Σ_{n≥0} (a^n + b^n)/c^n = c/(c−a) + c/(c−b)
  const ans = new Q(c, c - a).add(new Q(c, c - b));
  return {
    prompt: `Find $\\displaystyle\\sum_{n=0}^{\\infty} \\frac{${a}^{n} + ${b}^{n}}{${c}^{n}}$.`,
    answer: num(ans),
    solution: [`Split into two geometric series with ratios $\\frac{${a}}{${c}}$ and $\\frac{${b}}{${c}}$.`, `$\\frac{1}{1 - ${a}/${c}} + \\frac{1}{1 - ${b}/${c}} = ${new Q(c, c - a).tex()} + ${new Q(c, c - b).tex()} = ${ans.tex()}$`],
  };
};

const telescopeMore: Gen = (r) => {
  if (r.next() < 0.5) {
    const k = r.int(1, 4);
    const ans = new Q(1, 2 * k);
    // Σ 1/((2n−1+?)...) use Σ_{n≥1} 1/((kn−k+1)... keep classic: Σ 1/((2n−1)(2n+1)) scaled
    return {
      prompt: `Find $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{${k === 1 ? 1 : 1}}{${k === 1 ? '' : k}(2n - 1)(2n + 1)}$.`,
      answer: num(ans),
      solution: [`$\\frac{1}{(2n-1)(2n+1)} = \\frac12\\left(\\frac{1}{2n-1} - \\frac{1}{2n+1}\\right)$: the sum telescopes to $\\frac12$.`, `Divide by $${k}$: $${ans.tex()}$`],
      selfCheck: () => {
        let s = 0;
        for (let n = 1; n < 1e6; n++) s += 1 / (k * (2 * n - 1) * (2 * n + 1));
        return near(s, ans.value(), 1e-5);
      },
    };
  }
  const m = r.int(1, 4) ** 2;
  return {
    prompt: `Find $\\displaystyle\\sum_{n=${m}}^{\\infty} \\left(\\frac{1}{\\sqrt{n}} - \\frac{1}{\\sqrt{n + 1}}\\right)$.`,
    answer: num(new Q(1, Math.sqrt(m))),
    solution: ['Partial sums telescope: $S_N = \\frac{1}{\\sqrt{' + m + '}} - \\frac{1}{\\sqrt{N + 1}}$.', `As $N \\to \\infty$: $\\frac{1}{${Math.sqrt(m)}}$`],
  };
};

const taylorAboutA: Gen = (r) => {
  const kind = r.int(0, 2);
  if (kind === 0) {
    return {
      prompt: 'Find the degree-2 Taylor polynomial of $f(x) = \\ln x$ about $x = 1$.',
      answer: expr('(x-1) - (x-1)^2/2', '(x - 1) - \\frac{(x - 1)^{2}}{2}'),
      solution: ['$f(1) = 0$, $f\'(1) = 1$, $f\'\'(1) = -1$.', '$T_2(x) = (x - 1) - \\frac{(x - 1)^{2}}{2}$'],
    };
  }
  if (kind === 1) {
    const m = r.int(1, 4);
    const a = m * m;
    const T = `${m} + (x-${a})/${2 * m} - (x-${a})^2/${8 * m ** 3}`;
    return {
      prompt: `Find the degree-2 Taylor polynomial of $f(x) = \\sqrt{x}$ about $x = ${a}$.`,
      answer: expr(T, `${m} + \\frac{x - ${a}}{${2 * m}} - \\frac{(x - ${a})^{2}}{${8 * m ** 3}}`),
      solution: [`$f(${a}) = ${m}$, $f'(${a}) = \\frac{1}{2\\sqrt{${a}}} = \\frac{1}{${2 * m}}$, $f''(${a}) = -\\frac{1}{4\\cdot ${a}^{3/2}} = -\\frac{1}{${4 * m ** 3}}$.`, `Divide $f''$ by $2!$: $T_2 = ${m} + \\frac{x - ${a}}{${2 * m}} - \\frac{(x - ${a})^{2}}{${8 * m ** 3}}$`],
    };
  }
  const a = r.nz(-2, 2);
  const T = `exp(${a})*(1 + (x-${P(a)}) + (x-${P(a)})^2/2)`;
  return {
    prompt: `Find the degree-2 Taylor polynomial of $f(x) = e^{x}$ about $x = ${a}$.`,
    answer: expr(T, `e^{${a}}\\left(1 + (x ${signed(-a)}) + \\frac{(x ${signed(-a)})^{2}}{2}\\right)`),
    inputHint: 'e^(-2) style constants are fine.',
    solution: [`Every derivative of $e^x$ at $${a}$ equals $e^{${a}}$.`, `$T_2 = e^{${a}}\\left(1 + (x ${signed(-a)}) + \\frac{(x ${signed(-a)})^{2}}{2}\\right)$`],
  };
};

const seriesApprox: Gen = (r) => {
  const pool = [
    { tex: int('e^{-x^{2}}', 0, 1), ans: new Q(23, 30), terms: '1 - \\frac13 + \\frac1{10}', why: '$e^{-x^2} = 1 - x^2 + \\frac{x^4}{2} - \\dots$; integrate term by term.' },
    { tex: int('\\frac{\\sin x}{x}', 0, 1), ans: new Q(1, 1).sub(new Q(1, 18)).add(new Q(1, 600)), terms: '1 - \\frac{1}{18} + \\frac{1}{600}', why: '$\\frac{\\sin x}{x} = 1 - \\frac{x^2}{6} + \\frac{x^4}{120} - \\dots$; integrate term by term.' },
    { tex: int('\\cos(x^{2})', 0, 1), ans: new Q(1).sub(new Q(1, 10)).add(new Q(1, 216)), terms: '1 - \\frac1{10} + \\frac1{216}', why: '$\\cos(x^2) = 1 - \\frac{x^4}{2} + \\frac{x^8}{24} - \\dots$; integrate term by term.' },
  ];
  const p = r.pick(pool);
  return {
    prompt: `Approximate $${p.tex}$ using the first three nonzero terms of its Maclaurin series.`,
    answer: num(p.ans),
    solution: [p.why, `$${p.terms} = ${p.ans.tex()}$ (an alternating series, so the error is below the next term).`],
  };
};

const seriesDeep: Skill = {
  ...series,
  levels: [
    { name: 'geometric series', generate: mix(series.levels[0].generate, seriesMore) },
    series.levels[1],
    { name: 'telescoping sums', generate: mix(series.levels[2].generate, telescopeMore) },
  ],
};
const taylorDeep: Skill = {
  ...taylor,
  levels: [
    taylor.levels[0],
    { name: 'Taylor polynomials', generate: mix(taylor.levels[1].generate, taylorAboutA) },
    { name: 'radius of convergence and approximation', generate: mix(taylor.levels[2].generate, seriesApprox) },
  ],
};

// ---------------------------------------------------------------------------
// Differential equations

const separable: Skill = {
  id: 'calc.sepode',
  name: 'Separable differential equations',
  prereqs: ['calc.usub'],
  levels: [
    {
      name: 'growth and decay',
      generate: mix(
        (r) => {
          const k = r.nz(-3, 3);
          const y0 = r.nz(-5, 5);
          return {
            prompt: `Solve $y' = ${coef(k)}y$ with $y(0) = ${y0}$. Enter $y(x)$.`,
            answer: expr(`${y0}*exp(${k}*x)`, `${coef(y0)}e^{${coef(k)}x}`),
            solution: [`Separate: $\\frac{dy}{y} = ${k}\\,dx$, so $\\ln|y| = ${coef(k)}x + C$ and $y = Ae^{${coef(k)}x}$.`, `$y(0) = A = ${y0}$`],
          };
        },
        (r) => {
          const T = r.int(2, 10);
          const m = r.pick([3, 5, 10]);
          return {
            prompt: `A population grows exponentially and doubles every ${T} hours. How long (in hours) does it take to become ${m} times as large?`,
            answer: num(`${T}*log(${m})/log(2)`, `\\frac{${T}\\ln ${m}}{\\ln 2}`),
            inputHint: 'An exact form like 3*ln(5)/ln(2) is fine.',
            solution: [`$P = P_0 2^{t/${T}}$. Solve $2^{t/${T}} = ${m}$: $\\frac{t}{${T}}\\ln 2 = \\ln ${m}$.`, `$t = \\frac{${T}\\ln ${m}}{\\ln 2} \\approx ${((T * Math.log(m)) / Math.log(2)).toFixed(2)}$ hours`],
          };
        },
        (r) => {
          const h = r.int(2, 30);
          const n = r.int(2, 4);
          const m0 = r.int(1, 8) * 2 ** n * 10;
          return {
            prompt: `A substance has a half-life of ${h} years. How much of a ${m0} g sample is left after ${n * h} years?`,
            answer: num(new Q(m0, 2 ** n)),
            solution: [`${n * h} years is ${n} half-lives.`, `$${m0}\\cdot\\left(\\frac12\\right)^{${n}} = ${new Q(m0, 2 ** n).tex()}$ g`],
          };
        },
      ),
    },
    {
      name: 'separate and integrate',
      generate: mix(
        (r) => {
          const c = r.nz(-4, 4);
          return {
            prompt: `Solve $y' = xy$ with $y(0) = ${c}$. Enter $y(x)$.`,
            answer: expr(`${c}*exp(x^2/2)`, `${coef(c)}e^{x^{2}/2}`),
            solution: ['$\\frac{dy}{y} = x\\,dx$, so $\\ln|y| = \\frac{x^2}{2} + C$ and $y = Ae^{x^2/2}$.', `$A = y(0) = ${c}$`],
          };
        },
        (r) => {
          const a = r.int(1, 5);
          return {
            prompt: `Solve $y' = \\dfrac{x}{y}$ with $y(0) = ${a}$. Enter $y(x)$.`,
            answer: expr(`sqrt(x^2+${a * a})`, `\\sqrt{x^{2} + ${a * a}}`),
            solution: [`$y\\,dy = x\\,dx$, so $y^2 = x^2 + C$.`, `$y(0) = ${a}$ gives $C = ${a * a}$, and $y > 0$: $y = \\sqrt{x^{2} + ${a * a}}$`],
          };
        },
        (r) => {
          const c = r.int(1, 5);
          return {
            prompt: `Solve $y' = -y^{2}$ with $y(0) = ${c === 1 ? '1' : `\\frac{1}{${c}}`}$. Enter $y(x)$.`,
            answer: expr(`1/(x+${c})`, `\\dfrac{1}{x + ${c}}`),
            solution: ['$-\\frac{dy}{y^2} = dx$, so $\\frac1y = x + C$.', `$y(0) = \\frac{1}{${c}}$ gives $C = ${c}$: $y = \\dfrac{1}{x + ${c}}$`],
          };
        },
        (r) => {
          const m = r.int(1, 4);
          return {
            prompt: `Solve $y' = e^{x - y}$ with $y(0) = \\ln ${m + 1}$. Enter $y(x)$.`,
            answer: expr(`log(exp(x)+${m})`, `\\ln(e^{x} + ${m})`),
            solution: ['$e^{y}dy = e^{x}dx$, so $e^y = e^x + C$.', `$y(0)$: $${m + 1} = 1 + C$, $C = ${m}$. So $y = \\ln(e^{x} + ${m})$`],
            selfCheck: () => isDerivative(`log(exp(x)+${m})`, `exp(x - log(exp(x)+${m}))`),
          };
        },
      ),
    },
    {
      name: 'Newton’s law of cooling',
      generate(r) {
        const A = r.pick([15, 20, 25]);
        const T0 = A + r.pick([40, 60, 80]);
        const t1 = r.int(5, 20);
        const T1 = A + (T0 - A) / 2 + r.pick([0, 5, 10]);
        const ratio = new Q(T1 - A, T0 - A);
        if (r.next() < 0.5) {
          const T2 = ratio.mul(ratio).mul(T0 - A).add(A);
          return {
            prompt: `Coffee at $${T0}^\\circ$C cools in a $${A}^\\circ$C room following Newton’s law of cooling. After ${t1} minutes it is at $${T1}^\\circ$C. What is its temperature after ${2 * t1} minutes?`,
            answer: num(T2),
            solution: [`$T - ${A} = ${T0 - A}e^{-kt}$: the excess temperature shrinks by the factor $${ratio.tex()}$ every ${t1} minutes.`, `After ${2 * t1} minutes: $${A} + ${T0 - A}\\cdot\\left(${ratio.tex()}\\right)^2 = ${T2.tex()}$`],
          };
        }
        const target = A + (T1 - A) / 2;
        return {
          prompt: `Coffee at $${T0}^\\circ$C cools in a $${A}^\\circ$C room following Newton’s law of cooling. After ${t1} minutes it is at $${T1}^\\circ$C. When (in minutes) does it reach $${target}^\\circ$C?`,
          answer: num(`${t1}*log(${new Q(target - A, T0 - A)})/log(${ratio})`, `${t1}\\cdot\\frac{\\ln(${new Q(target - A, T0 - A).tex()})}{\\ln(${ratio.tex()})}`),
          inputHint: 'An exact log form is fine.',
          solution: [`$T - ${A} = ${T0 - A}\\left(${ratio.tex()}\\right)^{t/${t1}}$.`, `Set $T = ${target}$: $\\left(${ratio.tex()}\\right)^{t/${t1}} = ${new Q(target - A, T0 - A).tex()}$, so $t = ${t1}\\frac{\\ln(${new Q(target - A, T0 - A).tex()})}{\\ln(${ratio.tex()})} \\approx ${((t1 * Math.log((target - A) / (T0 - A))) / Math.log(ratio.value())).toFixed(2)}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'A differential equation $y\' = f(x)g(y)$ is separable: move all $y$ to one side, $\\frac{dy}{g(y)} = f(x)\\,dx$, integrate both sides, then use the initial condition to fix the constant. $y\' = ky$ gives exponential growth or decay $y = y_0e^{kt}$; doubling time and half-life are $\\frac{\\ln 2}{|k|}$. Newton’s law of cooling $T\' = -k(T - A)$ makes the excess $T - A$ decay exponentially.',
    resources: [paul('DE/Separable.aspx', 'Separable Equations'), openstax(2, '4-3-separable-equations', 'Separable Equations'), tb1b('differential-equations', 'Differential equations, a tourist’s guide')],
  },
};

const linearOde: Skill = {
  id: 'calc.linode',
  name: 'First-order linear equations',
  prereqs: ['calc.sepode', 'calc.parts'],
  levels: [
    {
      name: 'constant coefficients',
      generate(r) {
        const k = r.nz(-3, 3);
        const c = r.nz(-6, 6);
        const y0 = r.int(-5, 5);
        const eq = new Q(c, k);
        const A = new Q(y0).sub(eq);
        return {
          prompt: `Solve $y' ${st(k, 'y')} = ${c}$ with $y(0) = ${y0}$. Enter $y(x)$.`,
          answer: expr(`${eq} + (${A})*exp(${-k}*x)`, sum([t(eq), t(A, `e^{${coef(-k)}x}`)]).tex),
          solution: [`Equilibrium: $y = \\frac{${c}}{${k}} = ${eq.tex()}$. The difference from it solves $u' = ${-k}u$.`, `$y = ${eq.tex()} + Ae^{${coef(-k)}x}$ with $A = ${y0} - ${P(eq.tex())} = ${A.tex()}$`],
          selfCheck: () => near(-k * value(`${eq} + (${A})*exp(${-k}*x)`, { x: 0.7 }) + c, value(`${-k}*(${A})*exp(${-k}*x)`, { x: 0.7 })),
        };
      },
    },
    {
      name: 'integrating factors',
      generate(r) {
        const n = r.int(1, 3);
        const m = r.int(0, 2);
        const y1 = r.int(-3, 4);
        const c = new Q(1, m + n + 1);
        const C = new Q(y1).sub(c);
        const sol = `x^${m + 1}/${m + n + 1} + (${C})*x^(-${n})`;
        return {
          prompt: `Solve $y' + \\dfrac{${n}}{x}y = ${m === 0 ? '1' : xn(m)}$ for $x > 0$ with $y(1) = ${y1}$. Enter $y(x)$.`,
          answer: expr(sol, sum([t(c, xn(m + 1)), t(C, `x^{-${n}}`)]).tex),
          solution: [`Integrating factor $e^{\\int ${n}/x\\,dx} = x^{${n}}$: $(x^{${n}}y)' = x^{${m + n}}$.`, `$x^{${n}}y = \\frac{x^{${m + n + 1}}}{${m + n + 1}} + C$, and $y(1) = ${y1}$ gives $C = ${C.tex()}$.`],
          selfCheck: () => {
            const x = 1.4;
            const h = 1e-6;
            const y = (u: number) => value(sol, { x: u });
            return near((y(x + h) - y(x - h)) / (2 * h) + (n / x) * y(x), x ** m, 1e-5) && near(y(1), y1);
          },
        };
      },
    },
    {
      name: 'exponential forcing',
      generate(r) {
        let a: number, b: number;
        do [a, b] = [r.nz(-2, 2), r.nz(-2, 2)];
        while (a === b);
        const y0 = r.int(-3, 3);
        const p = new Q(1, b - a);
        const A = new Q(y0).sub(p);
        const sol = `(${p})*exp(${b}*x) + (${A})*exp(${a}*x)`;
        return {
          prompt: `Solve $y' ${st(-a, 'y')} = e^{${coef(b)}x}$ with $y(0) = ${y0}$. Enter $y(x)$.`,
          answer: expr(sol, sum([t(p, ekx(b)), t(A, ekx(a))]).tex),
          solution: [`Integrating factor $e^{${coef(-a)}x}$: $(e^{${coef(-a)}x}y)' = e^{${coef(b - a)}x}$.`, `$y = ${p.tex()}e^{${coef(b)}x} + Ae^{${coef(a)}x}$, and $y(0) = ${y0}$ gives $A = ${A.tex()}$.`],
          selfCheck: () => {
            const x = 0.6;
            const h = 1e-6;
            const y = (u: number) => value(sol, { x: u });
            return near((y(x + h) - y(x - h)) / (2 * h) - a * y(x), Math.exp(b * x), 1e-5) && near(y(0), y0);
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'A first-order linear equation $y\' + p(x)y = q(x)$ is solved by the integrating factor $\\mu = e^{\\int p\\,dx}$: multiplying through turns the left side into $(\\mu y)\'$, so $\\mu y = \\int \\mu q\\,dx + C$. With constant coefficients, the solution is the equilibrium (or particular solution) plus a decaying or growing exponential fixed by the initial condition.',
    resources: [paul('DE/Linear.aspx', 'Linear Differential Equations'), openstax(2, '4-5-first-order-linear-equations', 'First-order Linear Equations')],
  },
};

const secondOrder: Skill = {
  id: 'calc.ode2',
  name: 'Second-order linear equations',
  prereqs: ['calc.linode'],
  levels: [
    {
      name: 'distinct real roots',
      generate(r) {
        const [p, q] = distinct(r, 2, -3, 3);
        const y0 = r.int(-3, 3);
        const d0 = r.int(-4, 4);
        // y = A e^{px} + B e^{qx}: A + B = y0, pA + qB = d0
        const B = new Q(d0 - p * y0, q - p);
        const A = new Q(y0).sub(B);
        const sol = `(${A})*exp(${p}*x) + (${B})*exp(${q}*x)`;
        return {
          prompt: `Solve $y'' ${st(-(p + q), "y'")} ${st(p * q, 'y')} = 0$ with $y(0) = ${y0}$, $y'(0) = ${d0}$. Enter $y(x)$.`.replace(/ \+ 0y'| - 0y'/, '').replace(/ \+ 0y | - 0y /, ' '),
          answer: expr(sol, sum([t(A, ekx(p)), t(B, ekx(q))]).tex),
          solution: [`Characteristic equation $r^2 ${st(-(p + q), 'r')} ${signed(p * q)} = 0$ has roots $${p}$ and $${q}$.`, `$y = Ae^{${coef(p)}x} + Be^{${coef(q)}x}$; the initial conditions give $A = ${A.tex()}$, $B = ${B.tex()}$.`],
          selfCheck: () => A.add(B).eq(y0) && A.mul(p).add(B.mul(q)).eq(d0),
        };
      },
    },
    {
      name: 'repeated root',
      generate(r) {
        const p = r.nz(-3, 3);
        const y0 = r.int(-3, 3);
        const d0 = r.int(-4, 4);
        const B = d0 - p * y0;
        const sol = `(${y0} + ${B}*x)*exp(${p}*x)`;
        const inner = sum([t(y0), t(B, 'x')]);
        return {
          prompt: `Solve $y'' ${st(-2 * p, "y'")} ${st(p * p, 'y')} = 0$ with $y(0) = ${y0}$, $y'(0) = ${d0}$. Enter $y(x)$.`,
          answer: expr(sol, B === 0 || y0 === 0 ? sum([t(y0, ekx(p)), t(B, `x${ekx(p)}`)]).tex : `(${inner.tex})${ekx(p)}`),
          solution: [`The characteristic equation $(r ${signed(-p)})^2 = 0$ has the double root $${p}$, so $y = (A + Bx)e^{${coef(p)}x}$.`, `$A = ${y0}$, and $y'(0) = ${p}A + B = ${d0}$ gives $B = ${B}$.`],
        };
      },
    },
    {
      name: 'oscillation',
      generate(r) {
        const a = r.int(0, 2);
        const w = r.int(1, 3);
        const y0 = r.int(-3, 3);
        const d0 = r.int(-3, 3);
        // y = e^{-ax}(A cos wx + B sin wx), A = y0, −aA + wB = d0
        const A = y0;
        const B = new Q(d0 + a * y0, w);
        const sol = `exp(${-a}*x)*(${A}*cos(${w}*x) + (${B})*sin(${w}*x))`;
        return {
          prompt: `Solve $y'' ${st(2 * a, "y'")} ${st(a * a + w * w, 'y')} = 0$ with $y(0) = ${y0}$, $y'(0) = ${d0}$. Enter $y(x)$.`.replace(/ \+ 0y'/, ''),
          answer: expr(sol, (() => {
            const trig = sum([t(A, `\\cos(${coef(w)}x)`), t(B, `\\sin(${coef(w)}x)`)]).tex;
            return a === 0 ? trig : trig === '0' ? '0' : `e^{${coef(-a)}x}\\left(${trig}\\right)`;
          })()),
          solution: [
            `Characteristic roots $${-a} \\pm ${w}i$, so $y = ${a ? `e^{${coef(-a)}x}` : ''}(A\\cos ${coef(w)}x + B\\sin ${coef(w)}x)$.`,
            `$A = ${A}$; $y'(0) = ${-a}A + ${w}B = ${d0}$ gives $B = ${B.tex()}$.`,
          ],
          selfCheck: () => {
            const h = 1e-4;
            const y = (u: number) => value(sol, { x: u });
            const x = 0.5;
            const d2 = (y(x + h) - 2 * y(x) + y(x - h)) / (h * h);
            const d1 = (y(x + h) - y(x - h)) / (2 * h);
            return near(d2 + 2 * a * d1 + (a * a + w * w) * y(x), 0, 1e-3);
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'For $ay\'\' + by\' + cy = 0$ try $y = e^{rx}$: the characteristic equation $ar^2 + br + c = 0$. Distinct real roots give $Ae^{r_1x} + Be^{r_2x}$; a double root gives $(A + Bx)e^{rx}$; complex roots $\\alpha \\pm \\beta i$ give $e^{\\alpha x}(A\\cos\\beta x + B\\sin\\beta x)$, an oscillation. Two initial conditions fix $A$ and $B$.',
    resources: [paul('DE/SecondOrderConcepts.aspx', 'Second Order Differential Equations'), openstax(3, '7-1-second-order-linear-equations', 'Second-Order Linear Equations')],
  },
};

// ---------------------------------------------------------------------------

export const calculus2Chapters: Chapter[] = [
  {
    id: 'calc.ch.integrals',
    title: 'Integrals',
    about: 'Antiderivatives, Riemann sums, the fundamental theorem of calculus, definite integrals and areas.',
    why: 'Areas, totals and averages; in probability, every expected value and every density is an integral.',
    resources: [tb1b('integration', 'Integration and the fundamental theorem of calculus'), openstax(1, '5-3-the-fundamental-theorem-of-calculus', 'The Fundamental Theorem of Calculus')],
    skills: [antiderivDeep, ftc, definiteDeep],
    deeper: [],
  },
  {
    id: 'calc.ch.techniques',
    title: 'Integration techniques',
    about: 'Substitution, integration by parts, trigonometric integrals and substitutions, partial fractions, and improper integrals.',
    why: 'Most integrals that come up in practice yield to one of these techniques, and recognising which one is a skill in itself.',
    resources: [paul('CalcII/IntTechIntro.aspx', 'Integration Techniques (chapter intro)'), openstax(2, '3-1-integration-by-parts', 'Integration by Parts')],
    skills: [usubDeep, partsDeep, trigIntegrals, trigSub, pfracDeep, improperDeep],
    deeper: [numericalIntegration],
  },
  {
    id: 'calc.ch.integral-apps',
    title: 'Applications of integration',
    about: 'Volumes of solids of revolution, arc length and surface area, work, and centroids.',
    why: 'Slicing a quantity into pieces and adding them up is how integrals turn geometry and physics into numbers.',
    resources: [paul('CalcI/IntAppsIntro.aspx', 'Applications of Integrals (chapter intro)'), openstax(1, '6-2-determining-volumes-by-slicing', 'Determining Volumes by Slicing')],
    skills: [volumes, arcLength, physics],
    deeper: [],
  },
  {
    id: 'calc.ch.series',
    title: 'Sequences and series',
    about: 'Limits of sequences, infinite sums and when they converge, and power and Taylor series.',
    why: 'Taylor series are how computers evaluate $\\sin$, $e^x$ and friends, and they underpin most approximation arguments. Geometric series show up in algorithm analysis.',
    resources: [tb1b('taylor-series', 'Taylor series'), paul('CalcII/SeriesIntro.aspx', 'Series and Sequences (chapter intro)'), openstax(2, '5-2-infinite-series', 'Infinite Series')],
    skills: [sequences, seriesDeep, taylorDeep],
    deeper: [powerSums],
  },
  {
    id: 'calc.ch.ode',
    title: 'Differential equations',
    about: 'Equations for an unknown function in terms of its derivatives: separable and first-order linear equations, with growth, decay and cooling models.',
    why: 'Almost every model of change, from populations to circuits to epidemics, is a differential equation.',
    resources: [tb1b('differential-equations', 'Differential equations, a tourist’s guide'), paul('DE/IntroBasic.aspx', 'Differential Equations: Basic Concepts'), openstax(2, '4-1-basics-of-differential-equations', 'Basics of Differential Equations')],
    skills: [separable, linearOde],
    deeper: [secondOrder],
  },
];

