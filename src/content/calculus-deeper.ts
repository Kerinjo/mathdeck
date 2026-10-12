// Optional "going deeper" sections for Calculus.
import { Q } from '../core/frac';
import { coef, poly, sum, t } from '../core/fmt';
import type { Problem, Resource, Skill } from '../core/types';
import { int } from './helpers';
import { isDerivative, near, value } from './verify';

const paul = (path: string, title: string): Resource => ({
  kind: 'article',
  title: `Paul's Online Notes: ${title}`,
  url: `https://tutorial.math.lamar.edu/Classes/${path}`,
});
const openstax = (vol: 1 | 2 | 3, slug: string, title: string): Resource => ({
  kind: 'book',
  title: `OpenStax Calculus Vol. ${vol}: ${title}`,
  url: `https://openstax.org/books/calculus-volume-${vol}/pages/${slug}`,
});
const num = (q: Q | string, display?: string): Problem['answer'] => ({
  kind: 'number',
  expected: q.toString(),
  display: display ?? (q instanceof Q ? q.tex() : undefined),
});
const expr = (expected: string, display?: string): Problem['answer'] => ({ kind: 'expr', expected, vars: ['x'], display });
const anti = (expected: string, display: string): Problem['answer'] => ({
  kind: 'expr',
  expected,
  vars: ['x'],
  upToConstant: true,
  display: `${display} + C`,
});
const dec = (x: number) => `${+x.toFixed(6)}`;

// ---------------------------------------------------------------------------

export const epsilonDelta: Skill = {
  id: 'calc.epsdelta',
  name: 'ε–δ: the largest δ',
  prereqs: ['calc.limits'],
  levels: [
    {
      name: 'linear functions',
      generate(r) {
        const m = r.nz(-6, 6);
        const b = r.int(-5, 5);
        const a = r.int(-3, 4);
        const eps = r.pick([0.1, 0.06, 0.03, 0.02, 0.012]);
        const L = m * a + b;
        const d = eps / Math.abs(m);
        return {
          prompt: `$\\displaystyle\\lim_{x\\to ${a}} (${poly([m, b]).tex}) = ${L}$. For $\\varepsilon = ${eps}$, what is the largest $\\delta$ such that $0 < |x - ${a < 0 ? `(${a})` : a}| < \\delta$ guarantees $|(${poly([m, b]).tex}) - ${L < 0 ? `(${L})` : L}| < \\varepsilon$?`,
          answer: num(dec(d)),
          inputHint: 'A decimal or fraction.',
          solution: [`$|(${poly([m, b]).tex}) - ${L < 0 ? `(${L})` : L}| = ${Math.abs(m)}\\,|x - ${a < 0 ? `(${a})` : a}|$, which is $< \\varepsilon$ exactly when $|x - ${a < 0 ? `(${a})` : a}| < \\varepsilon / ${Math.abs(m)}$.`, `So $\\delta = ${eps}/${Math.abs(m)} = ${dec(d)}$.`],
        };
      },
    },
    {
      name: 'square roots',
      generate(r) {
        const a = r.int(2, 6);
        const eps = r.pick([0.1, 0.2, 0.05]);
        const d = 2 * a * eps - eps * eps;
        return {
          prompt: `$\\displaystyle\\lim_{x\\to ${a * a}} \\sqrt{x} = ${a}$. For $\\varepsilon = ${eps}$, what is the largest $\\delta$ such that $|x - ${a * a}| < \\delta$ guarantees $|\\sqrt{x} - ${a}| < \\varepsilon$?`,
          answer: num(dec(d)),
          solution: [
            `$|\\sqrt x - ${a}| < ${eps}$ means $${a - eps} < \\sqrt x < ${a + eps}$, i.e. $${dec((a - eps) ** 2)} < x < ${dec((a + eps) ** 2)}$.`,
            `That interval reaches $${dec(a * a - (a - eps) ** 2)}$ below ${a * a} and $${dec((a + eps) ** 2 - a * a)}$ above. A symmetric interval must use the smaller: $\\delta = ${dec(d)}$.`,
          ],
          selfCheck: () => near(Math.sqrt(a * a + d) - a, eps, 1e-6) || near(a - Math.sqrt(a * a - d), eps, 1e-6),
        };
      },
    },
    {
      name: 'squares',
      generate(r) {
        const a = r.int(1, 5);
        const eps = r.pick([0.5, 0.3, 0.1]);
        const d = Math.sqrt(a * a + eps) - a;
        return {
          prompt: `$\\displaystyle\\lim_{x\\to ${a}} x^2 = ${a * a}$. For $\\varepsilon = ${eps}$, what is the largest $\\delta$ such that $|x - ${a}| < \\delta$ guarantees $|x^2 - ${a * a}| < \\varepsilon$?`,
          answer: num(`sqrt(${a * a + eps}) - ${a}`, `\\sqrt{${a * a + eps}} - ${a}`),
          inputHint: 'Exact form, e.g. sqrt(4.5) - 2.',
          solution: [
            `$|x^2 - ${a * a}| < ${eps}$ near $x = ${a}$ means $\\sqrt{${dec(a * a - eps)}} < x < \\sqrt{${dec(a * a + eps)}}$.`,
            `The right end is closer to ${a} (the parabola is steeper there), so $\\delta = \\sqrt{${dec(a * a + eps)}} - ${a} \\approx ${dec(d)}$.`,
          ],
          selfCheck: () => d < a - Math.sqrt(a * a - eps),
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\lim_{x\\to a} f(x) = L$ means: for every $\\varepsilon > 0$ there is a $\\delta > 0$ such that $0 < |x - a| < \\delta$ forces $|f(x) - L| < \\varepsilon$. To find the largest $\\delta$, solve $|f(x) - L| < \\varepsilon$ for $x$ and take the distance from $a$ to the nearer end of that interval.',
    resources: [paul('CalcI/DefnOfLimit.aspx', 'The Definition of the Limit'), openstax(1, '2-5-the-precise-definition-of-a-limit', 'The Precise Definition of a Limit')],
  },
};

// ---------------------------------------------------------------------------

export const inverseDerivatives: Skill = {
  id: 'calc.invderiv',
  name: 'Inverse functions and logarithmic differentiation',
  prereqs: ['calc.chain'],
  levels: [
    {
      name: 'inverse trig',
      generate(r) {
        if (r.next() < 0.5) {
          const k = r.int(2, 6);
          const ans = `${k}/(1 + ${k * k}*x^2)`;
          return {
            prompt: `Differentiate $f(x) = \\arctan(${k}x)$.`,
            answer: expr(ans, `\\dfrac{${k}}{1 + ${k * k}x^{2}}`),
            solution: [`$\\frac{d}{dx}\\arctan u = \\frac{u'}{1 + u^2}$ with $u = ${k}x$.`, `$f'(x) = \\dfrac{${k}}{1 + ${k * k}x^{2}}$`],
            selfCheck: () => isDerivative(`atan(${k}*x)`, ans),
          };
        }
        const k = r.int(3, 6);
        const ans = `1/sqrt(${k * k} - x^2)`;
        return {
          prompt: `Differentiate $f(x) = \\arcsin\\left(\\frac{x}{${k}}\\right)$.`,
          answer: expr(ans, `\\dfrac{1}{\\sqrt{${k * k} - x^{2}}}`),
          solution: [`$\\frac{d}{dx}\\arcsin u = \\frac{u'}{\\sqrt{1 - u^2}}$ with $u = \\frac{x}{${k}}$.`, `$\\frac{1/${k}}{\\sqrt{1 - x^2/${k * k}}} = \\dfrac{1}{\\sqrt{${k * k} - x^{2}}}$`],
          selfCheck: () => isDerivative(`asin(x/${k})`, ans),
        };
      },
    },
    {
      name: 'derivative of an inverse',
      generate(r) {
        const a = r.int(1, 6);
        const b = r.int(-5, 5);
        const c = r.int(-2, 3);
        const fc = c ** 3 + a * c + b;
        const dfc = 3 * c * c + a;
        const ans = new Q(1, dfc);
        return {
          prompt: `$f(x) = ${poly([1, 0, a, b]).tex}$ is invertible. Find $(f^{-1})'(${fc})$.`,
          answer: num(ans),
          solution: [
            `First find which $x$ maps to ${fc}: $f(${c}) = ${fc}$, so $f^{-1}(${fc}) = ${c}$.`,
            `$(f^{-1})'(y) = \\dfrac{1}{f'(f^{-1}(y))}$, and $f'(x) = 3x^2 + ${a}$, so $f'(${c}) = ${dfc}$.`,
            `$(f^{-1})'(${fc}) = ${ans.tex()}$`,
          ],
        };
      },
    },
    {
      name: 'logarithmic differentiation',
      generate(r) {
        if (r.next() < 0.5) {
          const k = r.int(1, 4);
          const ans = `x^(${k}*x) * (${k}*log(x) + ${k})`;
          return {
            prompt: `Differentiate $f(x) = x^{${k === 1 ? '' : k}x}$ for $x > 0$.`,
            answer: expr(ans, `x^{${k === 1 ? '' : k}x}\\left(${coef(k)}\\ln x + ${k}\\right)`),
            solution: [
              `Take logs: $\\ln f = ${coef(k)}x\\ln x$. Differentiate: $\\frac{f'}{f} = ${coef(k)}\\ln x + ${k}$.`,
              `$f'(x) = x^{${k === 1 ? '' : k}x}\\left(${coef(k)}\\ln x + ${k}\\right)$`,
            ],
            selfCheck: () => isDerivative(`x^(${k}*x)`, ans),
          };
        }
        const a = r.int(1, 5);
        const ans = `(x^2 + ${a})^x * (log(x^2 + ${a}) + 2*x^2/(x^2 + ${a}))`;
        return {
          prompt: `Differentiate $f(x) = (x^{2} + ${a})^{x}$.`,
          answer: expr(ans, `(x^{2} + ${a})^{x}\\left(\\ln(x^{2} + ${a}) + \\dfrac{2x^{2}}{x^{2} + ${a}}\\right)`),
          solution: [
            `$\\ln f = x\\ln(x^2 + ${a})$, so $\\frac{f'}{f} = \\ln(x^2 + ${a}) + x\\cdot\\frac{2x}{x^2 + ${a}}$.`,
            `Multiply back by $f$.`,
          ],
          selfCheck: () => isDerivative(`(x^2 + ${a})^x`, ans),
        };
      },
    },
  ],
  learn: {
    summary:
      'Inverse trig: $(\\arctan x)\' = \\frac{1}{1+x^2}$, $(\\arcsin x)\' = \\frac{1}{\\sqrt{1-x^2}}$. For any invertible $f$: $(f^{-1})\'(b) = 1/f\'(a)$ where $f(a) = b$. When the variable is in both base and exponent ($x^x$), take $\\ln$ of both sides, differentiate implicitly, and multiply by $f$.',
    resources: [paul('CalcI/DiffInvTrigFcns.aspx', 'Derivatives of Inverse Trig Functions'), paul('CalcI/LogDiff.aspx', 'Logarithmic Differentiation'), openstax(1, '3-7-derivatives-of-inverse-functions', 'Derivatives of Inverse Functions')],
  },
};

// ---------------------------------------------------------------------------

export const optimization: Skill = {
  id: 'calc.optim',
  name: 'Related rates and optimisation',
  prereqs: ['calc.extrema', 'calc.implicit'],
  levels: [
    {
      name: 'related rates',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const rr = r.int(2, 12);
          const v = r.int(1, 5);
          return {
            prompt: `The radius of a circle grows at ${v} cm/s. How fast is the area growing when the radius is ${rr} cm? (in cm²/s)`,
            answer: num(`${2 * rr * v}*pi`, `${2 * rr * v}\\pi`),
            inputHint: 'Exact, e.g. 24*pi.',
            solution: [`$A = \\pi r^2$, so $\\frac{dA}{dt} = 2\\pi r\\frac{dr}{dt} = 2\\pi\\cdot ${rr}\\cdot ${v} = ${2 * rr * v}\\pi$.`],
          };
        }
        if (kind === 1) {
          const rr = r.int(2, 9);
          const v = r.int(1, 4);
          return {
            prompt: `A spherical balloon's radius grows at ${v} cm/s. How fast is its volume growing when the radius is ${rr} cm? (in cm³/s)`,
            answer: num(`${4 * rr * rr * v}*pi`, `${4 * rr * rr * v}\\pi`),
            inputHint: 'Exact, e.g. 100*pi.',
            solution: [`$V = \\frac43\\pi r^3$, so $\\frac{dV}{dt} = 4\\pi r^2\\frac{dr}{dt} = 4\\pi\\cdot ${rr * rr}\\cdot ${v} = ${4 * rr * rr * v}\\pi$.`],
          };
        }
        const k = r.int(1, 3);
        const [x, y, len] = r.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]]).map((z) => z * k);
        const v = r.int(1, 4);
        const ans = new Q(-x * v, y);
        return {
          prompt: `A ${len} m ladder leans against a wall. Its foot slides away from the wall at ${v} m/s. How fast is the top moving (negative = down) when the foot is ${x} m from the wall?`,
          answer: num(ans),
          solution: [
            `$x^2 + y^2 = ${len * len}$. Differentiate: $2x\\dot x + 2y\\dot y = 0$, so $\\dot y = -\\frac{x}{y}\\dot x$.`,
            `When $x = ${x}$, $y = ${y}$: $\\dot y = -\\frac{${x}}{${y}}\\cdot ${v} = ${ans.tex()}$ m/s.`,
          ],
        };
      },
    },
    {
      name: 'optimisation',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const p = 4 * r.int(5, 50);
          return {
            prompt: `A farmer has ${p} m of fence to enclose a rectangle along a straight river (no fence needed on the river side). What is the largest area possible (in m²)?`,
            answer: num(new Q(p * p, 8)),
            solution: [`Sides $x, x$ perpendicular to the river and $${p} - 2x$ along it: $A = x(${p} - 2x)$.`, `$A'(x) = ${p} - 4x = 0$ at $x = ${p / 4}$, giving $A = ${p / 4}\\cdot ${p / 2} = ${(p * p) / 8}$.`],
          };
        }
        if (kind === 1) {
          const s = 6 * r.int(1, 8);
          const x = s / 6;
          const v = x * (s - 2 * x) ** 2;
          return {
            prompt: `An open box is made from a ${s} cm square sheet by cutting equal squares from the corners and folding up the sides. What is the largest possible volume (in cm³)?`,
            answer: num(new Q(v)),
            solution: [
              `Cutting squares of side $x$: $V = x(${s} - 2x)^2$ for $0 < x < ${s / 2}$.`,
              `$V'(x) = (${s} - 2x)(${s} - 6x) = 0$ gives $x = ${x}$ (the other root gives zero volume).`,
              `$V(${x}) = ${x}\\cdot ${s - 2 * x}^2 = ${v}$`,
            ],
          };
        }
        const k = r.int(2, 30);
        return {
          prompt: `Find the minimum value of $f(x) = x + \\dfrac{${k}}{x}$ for $x > 0$.`,
          answer: num(`2*sqrt(${k})`, `2\\sqrt{${k}}`),
          solution: [`$f'(x) = 1 - \\frac{${k}}{x^2} = 0$ at $x = \\sqrt{${k}}$, and $f'' > 0$ there.`, `$f(\\sqrt{${k}}) = 2\\sqrt{${k}}$`],
        };
      },
    },
    {
      name: 'conical tanks',
      generate(r) {
        const R = r.int(1, 4);
        const H = R * r.int(2, 3);
        const h = r.int(1, H - 1);
        const q = r.int(1, 5);
        const ratio = new Q(q * H * H, R * R * h * h);
        const ansTex = `\\dfrac{${ratio.n}}{${ratio.d === 1 ? '' : ratio.d}\\pi}`;
        return {
          prompt: `Water flows at ${q} m³/min into a cone-shaped tank (point down) of height ${H} m and top radius ${R} m. How fast is the water level rising when the water is ${h} m deep? (in m/min)`,
          answer: num(`${q * H * H}/(${R * R * h * h}*pi)`, ansTex),
          inputHint: 'Exact, e.g. 9/(4*pi).',
          solution: [
            `By similar triangles the water surface has radius $r = \\frac{${R}}{${H}}h$, so $V = \\frac13\\pi r^2 h = \\frac{${R * R}\\pi}{${3 * H * H}}h^3$.`,
            `$\\frac{dV}{dt} = \\frac{${R * R}\\pi}{${H * H}}h^2\\frac{dh}{dt}$. With $\\frac{dV}{dt} = ${q}$ and $h = ${h}$: $\\frac{dh}{dt} = ${ansTex}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Related rates: write an equation linking the quantities, differentiate it with respect to time (chain rule), then plug in the values at the moment asked about. Optimisation: express the quantity in one variable using the constraint, find critical points, and check the endpoints or the second derivative.',
    resources: [paul('CalcI/RelatedRates.aspx', 'Related Rates'), paul('CalcI/Optimization.aspx', 'Optimization'), openstax(1, '4-7-applied-optimization-problems', 'Applied Optimization Problems')],
  },
};

// ---------------------------------------------------------------------------

export const trigIntegrals: Skill = {
  id: 'calc.trigint',
  name: 'Trigonometric integrals',
  prereqs: ['calc.usub'],
  levels: [
    {
      name: 'odd powers',
      generate(r) {
        const pool = [
          { q: '\\sin^{3} x', F: '-cos(x) + cos(x)^3/3', d: '-\\cos x + \\frac{\\cos^{3} x}{3}', f: 'sin(x)^3', how: 'Write $\\sin^3 x = (1 - \\cos^2 x)\\sin x$ and substitute $u = \\cos x$.' },
          { q: '\\cos^{3} x', F: 'sin(x) - sin(x)^3/3', d: '\\sin x - \\frac{\\sin^{3} x}{3}', f: 'cos(x)^3', how: 'Write $\\cos^3 x = (1 - \\sin^2 x)\\cos x$ and substitute $u = \\sin x$.' },
          { q: '\\sin x\\cos^{2} x', F: '-cos(x)^3/3', d: '-\\frac{\\cos^{3} x}{3}', f: 'sin(x)*cos(x)^2', how: 'Substitute $u = \\cos x$, $du = -\\sin x\\,dx$.' },
          { q: '\\sin^{3} x\\cos^{2} x', F: '-cos(x)^3/3 + cos(x)^5/5', d: '-\\frac{\\cos^{3} x}{3} + \\frac{\\cos^{5} x}{5}', f: 'sin(x)^3*cos(x)^2', how: 'Write $\\sin^3 x = (1 - \\cos^2 x)\\sin x$, then $u = \\cos x$ gives $-\\int (u^2 - u^4)\\,du$.' },
        ];
        const p = r.pick(pool);
        return {
          prompt: `Find $${int(p.q)}$.`,
          answer: anti(p.F, p.d),
          inputHint: 'Write powers as sin(x)^3.',
          solution: [p.how, `$${p.d} + C$`],
          selfCheck: () => isDerivative(p.F, p.f),
        };
      },
    },
    {
      name: 'even powers',
      generate(r) {
        const k = r.int(1, 4);
        const sin = r.next() < 0.5;
        const F = sin ? `x/2 - sin(${2 * k}*x)/${4 * k}` : `x/2 + sin(${2 * k}*x)/${4 * k}`;
        const d = `\\frac{x}{2} ${sin ? '-' : '+'} \\frac{\\sin(${2 * k}x)}{${4 * k}}`;
        return {
          prompt: `Find $${int(`\\${sin ? 'sin' : 'cos'}^{2}(${coef(k)}x)`)}$.`,
          answer: anti(F, d),
          solution: [`Use $\\${sin ? 'sin' : 'cos'}^2\\theta = \\frac{1 ${sin ? '-' : '+'} \\cos 2\\theta}{2}$ with $\\theta = ${coef(k)}x$.`, `$${d} + C$`],
          selfCheck: () => isDerivative(F, `${sin ? 'sin' : 'cos'}(${k}*x)^2`),
        };
      },
    },
    {
      name: 'products and arcsine',
      generate(r) {
        if (r.next() < 0.5) {
          const a = r.int(2, 6);
          const b = r.int(1, a - 1);
          const F = `-cos(${a + b}*x)/${2 * (a + b)} - cos(${a - b}*x)/${2 * (a - b)}`;
          const d = sum([t(new Q(-1, 2 * (a + b)), `\\cos(${a + b}x)`), t(new Q(-1, 2 * (a - b)), `\\cos(${coef(a - b)}x)`)]).tex;
          return {
            prompt: `Find $${int(`\\sin(${a}x)\\cos(${coef(b)}x)`)}$.`,
            answer: anti(F, d),
            solution: [`Product to sum: $\\sin A\\cos B = \\frac12[\\sin(A + B) + \\sin(A - B)]$.`, `$\\frac12\\int[\\sin(${a + b}x) + \\sin(${coef(a - b)}x)]\\,dx = ${d} + C$`],
            selfCheck: () => isDerivative(F, `sin(${a}*x)*cos(${b}*x)`),
          };
        }
        const k = r.int(3, 6);
        return {
          prompt: `Find $${int(`\\frac{1}{\\sqrt{${k * k} - x^{2}}}`)}$.`,
          answer: anti(`asin(x/${k})`, `\\arcsin\\frac{x}{${k}}`),
          solution: [`Substitute $x = ${k}\\sin\\theta$: $dx = ${k}\\cos\\theta\\,d\\theta$ and $\\sqrt{${k * k} - x^2} = ${k}\\cos\\theta$, so the integral is $\\int d\\theta = \\theta$.`, `$\\theta = \\arcsin\\frac{x}{${k}}$.`],
          selfCheck: () => isDerivative(`asin(x/${k})`, `1/sqrt(${k * k} - x^2)`),
        };
      },
    },
  ],
  learn: {
    summary:
      'Odd power of $\\sin$ or $\\cos$: peel one factor off, convert the rest with $\\sin^2 + \\cos^2 = 1$, and substitute. Even powers: use $\\sin^2\\theta = \\frac{1 - \\cos 2\\theta}{2}$, $\\cos^2\\theta = \\frac{1 + \\cos 2\\theta}{2}$. Products like $\\sin A\\cos B$: product-to-sum formulas. $\\sqrt{a^2 - x^2}$: substitute $x = a\\sin\\theta$.',
    resources: [paul('CalcII/IntegralsWithTrig.aspx', 'Integrals Involving Trig Functions'), paul('CalcII/TrigSubstitutions.aspx', 'Trig Substitutions'), openstax(2, '3-2-trigonometric-integrals', 'Trigonometric Integrals')],
  },
};

// ---------------------------------------------------------------------------

export const powerSums: Skill = {
  id: 'calc.powersum',
  name: 'Summing power series',
  prereqs: ['calc.taylor'],
  levels: [
    {
      name: 'recognise the series',
      generate(r) {
        if (r.next() < 0.5) {
          const k = r.nz(-3, 3);
          return {
            prompt: `Find $\\displaystyle\\sum_{n=0}^{\\infty} \\frac{${k < 0 ? `(${k})` : k}^n}{n!}$.`,
            answer: num(`e^(${k})`, `e^{${k}}`),
            solution: [`This is the series $e^x = \\sum \\frac{x^n}{n!}$ at $x = ${k}$.`],
          };
        }
        const q = r.int(2, 7);
        const p = r.nz(-(q - 1), q - 1);
        const x = new Q(p, q);
        const ans = new Q(1).div(new Q(1).sub(x));
        return {
          prompt: `Find $\\displaystyle\\sum_{n=0}^{\\infty} \\left(${x.tex()}\\right)^n$.`,
          answer: num(ans),
          solution: [`Geometric series $\\frac{1}{1 - x}$ at $x = ${x.tex()}$: $${ans.tex()}$.`],
        };
      },
    },
    {
      name: 'differentiate a known series',
      generate(r) {
        const q = r.int(2, 6);
        const x = new Q(1, q);
        const sq = r.next() < 0.5;
        const ans = sq ? x.mul(x.add(1)).div(new Q(1).sub(x).mul(new Q(1).sub(x)).mul(new Q(1).sub(x))) : x.div(new Q(1).sub(x).mul(new Q(1).sub(x)));
        return {
          prompt: `Find $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{n${sq ? '^2' : ''}}{${q}^n}$.`,
          answer: num(ans),
          solution: [
            'Start from $\\sum x^n = \\frac{1}{1 - x}$, differentiate and multiply by $x$: $\\sum n x^n = \\frac{x}{(1 - x)^2}$.',
            sq ? 'Once more: $\\sum n^2 x^n = \\frac{x(1 + x)}{(1 - x)^3}$.' : '',
            `At $x = \\frac{1}{${q}}$: $${ans.tex()}$.`,
          ].filter(Boolean),
          selfCheck: () => {
            let s = 0;
            for (let n = 1; n < 400; n++) s += (sq ? n * n : n) / q ** n;
            return near(s, ans.value(), 1e-9);
          },
        };
      },
    },
    {
      name: 'integrate a known series',
      generate(r) {
        if (r.next() < 0.6) {
          const q = r.int(2, 6);
          return {
            prompt: `Find $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n\\cdot ${q}^n}$.`,
            answer: num(`log(${q}/${q - 1})`, `\\ln\\frac{${q}}{${q - 1}}`),
            inputHint: 'Exact, e.g. ln(3/2).',
            solution: [`Integrate $\\sum x^{n-1} = \\frac{1}{1 - x}$: $\\sum \\frac{x^n}{n} = -\\ln(1 - x)$.`, `At $x = \\frac{1}{${q}}$: $-\\ln\\frac{${q - 1}}{${q}} = \\ln\\frac{${q}}{${q - 1}}$.`],
            selfCheck: () => {
              let s = 0;
              for (let n = 1; n < 200; n++) s += 1 / (n * q ** n);
              return near(s, value(`log(${q}/${q - 1})`), 1e-9);
            },
          };
        }
        return {
          prompt: '$\\displaystyle\\sum_{n=0}^{\\infty} \\frac{(-1)^n}{(2n+1)\\,3^{n}}$ equals $\\sqrt{3}$ times a famous number. Find the sum.',
          answer: num('pi*sqrt(3)/6', '\\frac{\\pi\\sqrt{3}}{6}'),
          inputHint: 'Exact, e.g. pi*sqrt(3)/6.',
          solution: [
            '$\\arctan x = \\sum_{n\\ge0} \\frac{(-1)^n x^{2n+1}}{2n+1}$. At $x = \\frac{1}{\\sqrt3}$ the terms are $\\frac{1}{\\sqrt 3}\\cdot\\frac{(-1)^n}{(2n+1)3^n}$.',
            'So the sum is $\\sqrt3\\arctan\\frac{1}{\\sqrt 3} = \\sqrt 3\\cdot\\frac{\\pi}{6}$.',
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Many series are known functions in disguise: $\\sum x^n = \\frac{1}{1-x}$, $\\sum \\frac{x^n}{n!} = e^x$. Differentiating or integrating term by term (inside the radius of convergence) gives more: $\\sum n x^n = \\frac{x}{(1-x)^2}$, $\\sum \\frac{x^n}{n} = -\\ln(1-x)$, $\\sum \\frac{(-1)^n x^{2n+1}}{2n+1} = \\arctan x$.',
    resources: [paul('CalcII/PowerSeriesandFunctions.aspx', 'Power Series and Functions'), openstax(2, '6-2-properties-of-power-series', 'Properties of Power Series')],
  },
};

// ---------------------------------------------------------------------------

export const lagrange: Skill = {
  id: 'calc.lagrange',
  name: 'Directional derivatives and Lagrange multipliers',
  prereqs: ['calc.partial'],
  levels: [
    {
      name: 'directional derivatives',
      generate(r) {
        const [a, b, c] = [r.nz(-3, 3), r.nz(-3, 3), r.int(-4, 4)];
        const [x0, y0] = [r.int(-2, 2), r.int(-2, 2)];
        const [u1, u2] = r.pick([[3, 4], [4, 3], [-3, 4], [5, 12], [12, -5], [0, 1], [1, 0]]);
        const len = Math.hypot(u1, u2);
        const fx = 2 * a * x0 + b * y0;
        const fy = b * x0 + 2 * c * y0;
        const ans = new Q(fx * u1 + fy * u2, len);
        return {
          prompt: `Find the directional derivative of $f(x, y) = ${sum([t(a, 'x^{2}'), t(b, 'xy'), t(c, 'y^{2}')]).tex}$ at $(${x0}, ${y0})$ in the direction of $(${u1}, ${u2})$.`,
          answer: num(ans),
          solution: [
            `$\\nabla f = (${sum([t(2 * a, 'x'), t(b, 'y')]).tex},\\ ${sum([t(b, 'x'), t(2 * c, 'y')]).tex}) = (${fx}, ${fy})$ at the point.`,
            `Unit direction: $\\frac{1}{${len}}(${u1}, ${u2})$. $D_u f = \\nabla f\\cdot u = \\frac{${fx}\\cdot${u1 < 0 ? `(${u1})` : u1} + ${fy}\\cdot${u2 < 0 ? `(${u2})` : u2}}{${len}} = ${ans.tex()}$`,
          ],
        };
      },
    },
    {
      name: 'one constraint',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const k = 2 * r.int(2, 15);
          return {
            prompt: `Find the maximum of $f(x, y) = xy$ subject to $x + y = ${k}$.`,
            answer: num(new Q((k * k) / 4)),
            solution: ['$\\nabla f = \\lambda\\nabla g$: $(y, x) = \\lambda(1, 1)$, so $x = y$.', `With $x + y = ${k}$: $x = y = ${k / 2}$, $f = ${(k * k) / 4}$.`],
          };
        }
        if (kind === 1) {
          const R = r.int(1, 9);
          return {
            prompt: `Find the maximum of $f(x, y) = x + y$ on the circle $x^2 + y^2 = ${R * R}$.`,
            answer: num(`${R}*sqrt(2)`, `${R === 1 ? '' : R}\\sqrt{2}`),
            solution: ['$(1, 1) = \\lambda(2x, 2y)$, so $x = y$.', `Then $2x^2 = ${R * R}$, $x = y = \\frac{${R}}{\\sqrt2}$ for the maximum: $f = ${R === 1 ? '' : R}\\sqrt{2}$.`],
          };
        }
        const [a, b] = [r.nz(-4, 4), r.nz(-4, 4)];
        const c = r.nz(-10, 10);
        const ans = new Q(c * c, a * a + b * b);
        return {
          prompt: `Find the minimum of $x^2 + y^2$ subject to $${sum([t(a, 'x'), t(b, 'y')]).tex} = ${c}$.`,
          answer: num(ans),
          solution: [
            `$(2x, 2y) = \\lambda(${a}, ${b})$: the point is a multiple of $(${a}, ${b})$, say $(${a}s, ${b}s)$.`,
            `Plug in: $${a * a + b * b}s = ${c}$. Then $x^2 + y^2 = ${a * a + b * b}s^2 = \\frac{${c * c}}{${a * a + b * b}} = ${ans.tex()}$ (the squared distance from the origin to the line).`,
          ],
        };
      },
    },
    {
      name: 'products under a sum constraint',
      generate(r) {
        if (r.next() < 0.5) {
          const tt = r.int(1, 6);
          return {
            prompt: `Find the maximum of $xyz$ for positive $x, y, z$ with $x + y + z = ${3 * tt}$.`,
            answer: num(new Q(tt ** 3)),
            solution: ['$(yz, xz, xy) = \\lambda(1, 1, 1)$ forces $x = y = z$.', `So $x = y = z = ${tt}$ and the maximum is $${tt ** 3}$.`],
          };
        }
        const a = r.int(1, 3);
        const b = r.int(1, 3);
        const tt = r.int(1, 3);
        const k = (a + b) * tt;
        const ans = (a * tt) ** a * (b * tt) ** b;
        return {
          prompt: `Find the maximum of $x${a === 1 ? '' : `^{${a}}`}y${b === 1 ? '' : `^{${b}}`}$ for positive $x, y$ with $x + y = ${k}$.`,
          answer: num(new Q(ans)),
          solution: [
            `Maximise $\\ln f = ${a}\\ln x + ${b}\\ln y$ instead: $\\left(\\frac{${a}}{x}, \\frac{${b}}{y}\\right) = \\lambda(1, 1)$, so $x : y = ${a} : ${b}$.`,
            `$x = ${a * tt}$, $y = ${b * tt}$, and $f = ${a * tt}^{${a}}\\cdot ${b * tt}^{${b}} = ${ans}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Directional derivative: $D_{\\mathbf u}f = \\nabla f\\cdot\\mathbf u$ with $\\mathbf u$ a unit vector; it is largest in the direction of $\\nabla f$. Lagrange multipliers: at a constrained extremum of $f$ subject to $g = c$, the gradients are parallel, $\\nabla f = \\lambda\\nabla g$. Solve these equations together with the constraint, then compare $f$ at the candidates.',
    resources: [paul('CalcIII/DirectionalDeriv.aspx', 'Directional Derivatives'), paul('CalcIII/LagrangeMultipliers.aspx', 'Lagrange Multipliers'), openstax(3, '4-8-lagrange-multipliers', 'Lagrange Multipliers')],
  },
};

