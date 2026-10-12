import { Q } from '../core/frac';
import { coef, mono, poly, signed, st, sum, t } from '../core/fmt';
import type { Chapter, Problem, Resource, Skill } from '../core/types';
import { epsilonDelta, inverseDerivatives, lagrange, optimization, powerSums, trigIntegrals } from './calculus-deeper';
import { distinct, fact, int, lin, P } from './helpers';
import { integrate, integrate2, isDerivative, near, value } from './verify';

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
const tb1b = (slug: string, title: string): Resource => ({
  kind: 'video',
  title: `3Blue1Brown: ${title}`,
  url: `https://www.3blue1brown.com/lessons/${slug}`,
});

const expr = (expected: string, display?: string, vars = ['x']): Problem['answer'] => ({
  kind: 'expr',
  expected,
  vars,
  display,
});
const anti = (expected: string, display?: string): Problem['answer'] => ({
  kind: 'expr',
  expected,
  vars: ['x'],
  upToConstant: true,
  display: display && `${display} + C`,
});
const num = (q: Q | string, display?: string): Problem['answer'] => ({
  kind: 'number',
  expected: q.toString(),
  display: display ?? (q instanceof Q ? q.tex() : undefined),
});

/** A limit or a derivative's value: only a short simplified answer, so the function can't be pasted in. */
const exact = (q: Q | string, display?: string): Problem['answer'] => ({ ...num(q, display), simple: true } as Problem['answer']);

const diff = (f: string) => `Differentiate $f(x) = ${f}$.`;

// ---------------------------------------------------------------------------

const limits: Skill = {
  id: 'calc.limits',
  name: 'Evaluating limits',
  prereqs: [],
  levels: [
    {
      name: 'factor and cancel',
      generate(r) {
        const [a, b, c] = distinct(r, 3, -5, 5);
        const n = poly([1, -(a + b), a * b]);
        const d = poly([1, -(a + c), a * c]);
        const ans = new Q(a - b, a - c);
        return {
          prompt: `Evaluate $\\displaystyle\\lim_{x\\to ${a}} \\frac{${n.tex}}{${d.tex}}$.`,
          answer: exact(ans),
          solution: [
            `Substituting $x = ${a}$ gives $\\frac{0}{0}$, so factor out the common root.`,
            `$\\dfrac{(${lin(a)})(${lin(b)})}{(${lin(a)})(${lin(c)})} = \\dfrac{${lin(b)}}{${lin(c)}}$ for $x \\neq ${a}$.`,
            `Now substitute: $\\dfrac{${a} ${signed(-b)}}{${a} ${signed(-c)}} = ${ans.tex()}$.`,
          ],
          selfCheck: () => near(value(`(${n.expr})/(${d.expr})`, { x: a + 1e-7 }), ans.value(), 1e-5),
        };
      },
    },
    {
      name: 'limits at infinity',
      generate(r) {
        const deg = r.int(2, 3);
        const p = r.nz(-6, 6);
        const q = r.nz(-6, 6);
        const lower = r.next() < 0.3;
        const numC = [p, ...Array.from({ length: deg }, () => r.int(-7, 7))];
        const denC = lower
          ? [q, ...Array.from({ length: deg + 1 }, () => r.int(-7, 7))]
          : [q, ...Array.from({ length: deg }, () => r.int(-7, 7))];
        const n = poly(numC);
        const d = poly(denC);
        const ans = lower ? new Q(0) : new Q(p, q);
        return {
          prompt: `Evaluate $\\displaystyle\\lim_{x\\to\\infty} \\frac{${n.tex}}{${d.tex}}$.`,
          answer: exact(ans),
          solution: lower
            ? [
                `The denominator has higher degree (${deg + 1}) than the numerator (${deg}).`,
                `Divide top and bottom by $x^{${deg + 1}}$: the numerator tends to $0$, the denominator to $${q}$.`,
                `The limit is $0$.`,
              ]
            : [
                `Both have degree ${deg}; divide top and bottom by $x^{${deg}}$.`,
                `Every lower-order term tends to $0$, leaving the ratio of leading coefficients.`,
                `$\\dfrac{${p}}{${q}} = ${ans.tex()}$`,
              ],
        };
      },
    },
    {
      name: 'rationalise with the conjugate',
      generate(r) {
        const a = r.int(1, 5);
        const k = r.int(1, 4);
        const ans = new Q(1, 2 * a * k);
        return {
          prompt: `Evaluate $\\displaystyle\\lim_{x\\to 0} \\frac{\\sqrt{x + ${a * a}} - ${a}}{${coef(k)}x}$.`,
          answer: exact(ans),
          solution: [
            `Multiply by the conjugate $\\sqrt{x + ${a * a}} + ${a}$ on top and bottom.`,
            `Numerator becomes $(x + ${a * a}) - ${a * a} = x$, so the expression is $\\dfrac{1}{${k === 1 ? '' : k}(\\sqrt{x + ${a * a}} + ${a})}$.`,
            `At $x = 0$: $\\dfrac{1}{${k === 1 ? '' : `${k}\\cdot `}${2 * a}} = ${ans.tex()}$.`,
          ],
          selfCheck: () => near(value(`(sqrt(x+${a * a})-${a})/(${k}*x)`, { x: 1e-8 }), ans.value(), 1e-4),
        };
      },
    },
  ],
  learn: {
    summary:
      'If direct substitution gives a number, that is the limit. If it gives $\\frac{0}{0}$, rewrite first: factor and cancel, or multiply by the conjugate when roots are involved. At infinity, divide everything by the highest power of $x$ in the denominator: equal degrees give the ratio of leading coefficients, a bigger denominator gives $0$.',
    resources: [
      tb1b('limits', 'Limits, L’Hôpital’s rule, and epsilon delta definitions'),
      paul('CalcI/ComputingLimits.aspx', 'Computing Limits'),
      paul('CalcI/LimitsAtInfinityI.aspx', 'Limits at Infinity'),
      openstax(1, '2-3-the-limit-laws', 'The Limit Laws'),
    ],
  },
};

// ---------------------------------------------------------------------------

const power: Skill = {
  id: 'calc.power',
  name: 'Power rule',
  prereqs: [],
  levels: [
    {
      name: 'polynomials',
      generate(r) {
        const deg = r.int(3, 5);
        const c = [r.nz(-6, 6), ...Array.from({ length: deg }, () => r.int(-9, 9))];
        const f = poly(c);
        const d = poly(c.slice(0, -1).map((x, i) => x * (deg - i)));
        return {
          prompt: diff(f.tex),
          answer: expr(d.expr, d.tex),
          solution: [
            `Differentiate term by term with $\\frac{d}{dx}x^n = nx^{n-1}$; the constant vanishes.`,
            `$f'(x) = ${d.tex}$`,
          ],
          selfCheck: () => isDerivative(f.expr, d.expr),
        };
      },
    },
    {
      name: 'negative powers and roots',
      generate(r) {
        const a = r.nz(-5, 5);
        const n = r.int(2, 4);
        const b = r.nz(-6, 6);
        const m = r.int(1, 3);
        const c = r.nz(-8, 8);
        const f = `${coef(a)}x^{${n}} ${b < 0 ? '-' : '+'} \\frac{${Math.abs(b)}}{${m === 1 ? 'x' : `x^{${m}}`}} ${st(c, '\\sqrt{x}')}`;
        const d = sum([mono(a * n, n - 1), t(-b * m, `x^{${-m - 1}}`, `x^(${-m - 1})`), t(new Q(c, 2), `x^{-1/2}`, `x^(-1/2)`)]);
        return {
          prompt: diff(f),
          answer: expr(d.expr, d.tex),
          inputHint: 'x^(-3) and sqrt(x) are both fine.',
          solution: [
            `Rewrite as powers: $\\frac{1}{x^{${m}}} = x^{-${m}}$ and $\\sqrt{x} = x^{1/2}$.`,
            `Apply $\\frac{d}{dx}x^n = nx^{n-1}$ to each: exponents become $${n - 1}$, $${-m - 1}$ and $-\\tfrac12$.`,
            `$f'(x) = ${d.tex}$`,
          ],
          selfCheck: () => isDerivative(`${a}*x^${n} + ${b}/x^${m} + ${c}*sqrt(x)`, d.expr),
        };
      },
    },
    {
      name: 'fractional powers',
      generate(r) {
        const a = r.nz(-6, 6);
        const b = r.nz(-6, 6);
        const fx = `${a}*x*sqrt(x) + ${b}/cbrt(x)`;
        const d = sum([t(new Q(3 * a, 2), 'x^{1/2}', 'x^(1/2)'), t(new Q(-b, 3), 'x^{-4/3}', 'x^(-4/3)')]);
        return {
          prompt: diff(`${coef(a)}x\\sqrt{x} ${b < 0 ? '-' : '+'} \\dfrac{${Math.abs(b)}}{\\sqrt[3]{x}}`),
          answer: expr(d.expr, d.tex),
          solution: [
            `Rewrite: $x\\sqrt{x} = x^{3/2}$ and $\\frac{1}{\\sqrt[3]{x}} = x^{-1/3}$.`,
            `$\\frac{d}{dx}x^{3/2} = \\tfrac32 x^{1/2}$, $\\frac{d}{dx}x^{-1/3} = -\\tfrac13 x^{-4/3}$.`,
            `$f'(x) = ${d.tex}$`,
          ],
          selfCheck: () => isDerivative(fx, d.expr),
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\frac{d}{dx}x^n = nx^{n-1}$ for any real $n$, and derivatives are linear: differentiate each term separately and keep the constants. First rewrite roots and fractions as powers: $\\sqrt[q]{x^p} = x^{p/q}$ and $\\frac{1}{x^n} = x^{-n}$.',
    resources: [
      tb1b('derivatives-power-rule', 'Derivative formulas through geometry'),
      paul('CalcI/DiffFormulas.aspx', 'Differentiation Formulas'),
      openstax(1, '3-3-differentiation-rules', 'Differentiation Rules'),
    ],
  },
};

// ---------------------------------------------------------------------------

const product: Skill = {
  id: 'calc.product',
  name: 'Product and quotient rules',
  prereqs: ['calc.power'],
  levels: [
    {
      name: 'product rule',
      generate(r) {
        const a = r.nz(-5, 5);
        const b = r.nz(-6, 6);
        const g = r.pick([
          { tex: 'e^{x}', expr: 'exp(x)', d: 'exp(x)', dtex: 'e^{x}' },
          { tex: '\\sin x', expr: 'sin(x)', d: 'cos(x)', dtex: '\\cos x' },
          { tex: '\\cos x', expr: 'cos(x)', d: '-sin(x)', dtex: '(-\\sin x)' },
          { tex: '\\ln x', expr: 'log(x)', d: '1/x', dtex: '\\frac{1}{x}' },
        ]);
        const u = poly([a, b]);
        const ans = `${a}*${g.expr} + (${u.expr})*(${g.d})`;
        return {
          prompt: diff(`(${u.tex})${g.tex}`),
          answer: expr(ans, `${a === 1 ? '' : a === -1 ? '-' : a}${g.tex} + (${u.tex})${g.dtex}`),
          solution: [
            `Product rule: $(uv)' = u'v + uv'$ with $u = ${u.tex}$, $v = ${g.tex}$.`,
            `$u' = ${a}$, $v' = ${g.dtex}$.`,
            `$f'(x) = ${a}${g.tex} + (${u.tex})${g.dtex}$`,
          ],
          selfCheck: () => isDerivative(`(${u.expr})*${g.expr}`, ans),
        };
      },
    },
    {
      name: 'quotient rule',
      generate(r) {
        let a, b, c, d;
        do {
          a = r.nz(-5, 5);
          b = r.int(-6, 6);
          c = r.int(1, 4);
          d = r.int(1, 6);
        } while (a * d - b * c === 0);
        const n = poly([a, b]);
        const den = poly([c, d]);
        const k = a * d - b * c;
        const ans = `${k}/(${den.expr})^2`;
        return {
          prompt: diff(`\\dfrac{${n.tex}}{${den.tex}}`),
          answer: expr(ans, `\\dfrac{${k}}{(${den.tex})^{2}}`),
          solution: [
            `Quotient rule: $\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}$ with $u = ${n.tex}$, $v = ${den.tex}$.`,
            `Numerator: $${a}(${den.tex}) - ${c}(${n.tex}) = ${k}$ (the $x$ terms cancel).`,
            `$f'(x) = \\dfrac{${k}}{(${den.tex})^{2}}$`,
          ],
          selfCheck: () => isDerivative(`(${n.expr})/(${den.expr})`, ans),
        };
      },
    },
    {
      name: 'quotient with exponentials',
      generate(r) {
        const k = r.nz(-3, 3);
        const a = r.int(1, 5);
        const ans = `exp(${k}*x)*(${k}*(x^2+${a}) - 2*x)/(x^2+${a})^2`;
        const top = sum([mono(k, 2), mono(-2, 1), t(k * a)]);
        return {
          prompt: diff(`\\dfrac{e^{${coef(k)}x}}{x^{2} + ${a}}`),
          answer: expr(ans, `\\dfrac{e^{${coef(k)}x}(${top.tex})}{(x^{2} + ${a})^{2}}`),
          solution: [
            `Quotient rule with $u = e^{${coef(k)}x}$, $u' = ${k}e^{${coef(k)}x}$ (chain rule), $v = x^2 + ${a}$, $v' = 2x$.`,
            `$f'(x) = \\dfrac{${k}e^{${coef(k)}x}(x^2 + ${a}) - 2xe^{${coef(k)}x}}{(x^2 + ${a})^2}$`,
            `Factor out $e^{${coef(k)}x}$: $\\dfrac{e^{${coef(k)}x}(${top.tex})}{(x^{2} + ${a})^{2}}$`,
          ],
          selfCheck: () => isDerivative(`exp(${k}*x)/(x^2+${a})`, ans),
        };
      },
    },
  ],
  learn: {
    summary:
      'Product rule: $(uv)\' = u\'v + uv\'$. Quotient rule: $\\left(\\frac{u}{v}\\right)\' = \\frac{u\'v - uv\'}{v^2}$ ("low d-high minus high d-low, over low squared"). Name $u$ and $v$ explicitly, write down $u\'$ and $v\'$, then assemble.',
    resources: [
      tb1b('chain-rule-and-product-rule', 'Visualizing the chain rule and product rule'),
      paul('CalcI/ProductQuotientRule.aspx', 'Product and Quotient Rule'),
      openstax(1, '3-3-differentiation-rules', 'Differentiation Rules'),
    ],
  },
};

// ---------------------------------------------------------------------------

const chain: Skill = {
  id: 'calc.chain',
  name: 'Chain rule',
  prereqs: ['calc.power'],
  levels: [
    {
      name: 'one composition',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const a = r.nz(-4, 4);
          const b = r.nz(-6, 6);
          const n = r.int(3, 7);
          const u = poly([a, b]);
          const ans = `${n * a}*(${u.expr})^${n - 1}`;
          return {
            prompt: diff(`(${u.tex})^{${n}}`),
            answer: expr(ans, `${n * a}(${u.tex})^{${n - 1}}`),
            solution: [
              `Outer: $u^{${n}}$, inner: $u = ${u.tex}$, $u' = ${a}$.`,
              `$f'(x) = ${n}(${u.tex})^{${n - 1}} \\cdot ${P(a)} = ${n * a}(${u.tex})^{${n - 1}}$`,
            ],
            selfCheck: () => isDerivative(`(${u.expr})^${n}`, ans),
          };
        }
        if (kind === 1) {
          const k = r.nz(-3, 3);
          const ans = `${2 * k}*x*exp(${k}*x^2)`;
          return {
            prompt: diff(`e^{${coef(k)}x^{2}}`),
            answer: expr(ans, `${2 * k}xe^{${coef(k)}x^{2}}`),
            solution: [
              `Outer: $e^u$, inner: $u = ${coef(k)}x^2$, $u' = ${2 * k}x$.`,
              `$f'(x) = e^{${coef(k)}x^{2}} \\cdot ${2 * k}x$`,
            ],
            selfCheck: () => isDerivative(`exp(${k}*x^2)`, ans),
          };
        }
        const k = r.nz(-5, 5);
        const b = r.int(-4, 4);
        const fn = r.pick(['sin', 'cos'] as const);
        const u = poly([k, b]);
        const ans = fn === 'sin' ? `${k}*cos(${u.expr})` : `${-k}*sin(${u.expr})`;
        return {
          prompt: diff(`\\${fn}(${u.tex})`),
          answer: expr(ans, fn === 'sin' ? `${k}\\cos(${u.tex})` : `${-k}\\sin(${u.tex})`),
          solution: [
            `Outer: $\\${fn} u$, inner: $u = ${u.tex}$, $u' = ${k}$.`,
            fn === 'sin'
              ? `$f'(x) = \\cos(${u.tex}) \\cdot ${P(k)}$`
              : `$f'(x) = -\\sin(${u.tex}) \\cdot ${P(k)}$`,
          ],
          selfCheck: () => isDerivative(`${fn}(${u.expr})`, ans),
        };
      },
    },
    {
      name: 'logs, roots and powers of trig',
      generate(r) {
        const kind = r.int(0, 3);
        if (kind === 0) {
          const a = r.int(1, 9);
          const ans = `2*x/(x^2+${a})`;
          return {
            prompt: diff(`\\ln(x^{2} + ${a})`),
            answer: expr(ans, `\\dfrac{2x}{x^{2} + ${a}}`),
            solution: [`$\\frac{d}{dx}\\ln u = \\frac{u'}{u}$ with $u = x^2 + ${a}$, $u' = 2x$.`, `$f'(x) = \\dfrac{2x}{x^{2} + ${a}}$`],
            selfCheck: () => isDerivative(`log(x^2+${a})`, ans),
          };
        }
        if (kind === 1) {
          const a = r.int(1, 5);
          const b = r.int(1, 9);
          const u = poly([a, 0, b]);
          const ans = `${a}*x/sqrt(${u.expr})`;
          return {
            prompt: diff(`\\sqrt{${u.tex}}`),
            answer: expr(ans, `\\dfrac{${coef(a)}x}{\\sqrt{${u.tex}}}`),
            solution: [
              `$\\frac{d}{dx}\\sqrt{u} = \\frac{u'}{2\\sqrt{u}}$ with $u = ${u.tex}$, $u' = ${2 * a}x$.`,
              `$f'(x) = \\dfrac{${2 * a}x}{2\\sqrt{${u.tex}}} = \\dfrac{${coef(a)}x}{\\sqrt{${u.tex}}}$`,
            ],
            selfCheck: () => isDerivative(`sqrt(${u.expr})`, ans),
          };
        }
        if (kind === 2) {
          const k = r.nz(-3, 3);
          const ans = `${k}*cos(${k}*x)*exp(sin(${k}*x))`;
          return {
            prompt: diff(`e^{\\sin(${coef(k)}x)}`),
            answer: expr(ans, `${k}\\cos(${coef(k)}x)\\,e^{\\sin(${coef(k)}x)}`),
            solution: [
              `Two layers: $e^{u}$ with $u = \\sin(${coef(k)}x)$, and $u' = ${k}\\cos(${coef(k)}x)$.`,
              `$f'(x) = e^{\\sin(${coef(k)}x)} \\cdot ${k}\\cos(${coef(k)}x)$`,
            ],
            selfCheck: () => isDerivative(`exp(sin(${k}*x))`, ans),
          };
        }
        const n = r.int(2, 5);
        const k = r.int(1, 4);
        const ans = `${n * k}*sin(${k}*x)^${n - 1}*cos(${k}*x)`;
        return {
          prompt: diff(`\\sin^{${n}}(${coef(k)}x)`),
          answer: expr(ans, `${n * k}\\sin^{${n - 1}}(${coef(k)}x)\\cos(${coef(k)}x)`),
          inputHint: 'Write powers of trig as sin(3x)^2.',
          solution: [
            `$\\sin^{${n}}(${coef(k)}x) = (\\sin(${coef(k)}x))^{${n}}$: power, then sine, then linear.`,
            `$f'(x) = ${n}\\sin^{${n - 1}}(${coef(k)}x) \\cdot \\cos(${coef(k)}x) \\cdot ${k}$`,
          ],
          selfCheck: () => isDerivative(`sin(${k}*x)^${n}`, ans),
        };
      },
    },
    {
      name: 'chain inside a product',
      generate(r) {
        if (r.next() < 0.5) {
          const m = r.int(1, 3);
          const k = r.nz(-2, 2);
          const ans = `exp(${k}*x^2)*(${m}*x^${m - 1} + ${2 * k}*x^${m + 1})`;
          const inner = sum([mono(m, m - 1), mono(2 * k, m + 1)]);
          return {
            prompt: diff(`x^{${m}}e^{${coef(k)}x^{2}}`),
            answer: expr(ans, `e^{${coef(k)}x^{2}}(${inner.tex})`),
            solution: [
              `Product rule, with the chain rule for $e^{${coef(k)}x^2}$: its derivative is $${2 * k}xe^{${coef(k)}x^2}$.`,
              `$f'(x) = ${m === 1 ? '' : m}x^{${m - 1}}e^{${coef(k)}x^{2}} + x^{${m}} \\cdot ${2 * k}xe^{${coef(k)}x^{2}}$`,
              `$= e^{${coef(k)}x^{2}}(${inner.tex})$`,
            ],
            selfCheck: () => isDerivative(`x^${m}*exp(${k}*x^2)`, ans),
          };
        }
        const a = r.int(1, 9);
        const ans = `(2*x^2+${a})/sqrt(x^2+${a})`;
        return {
          prompt: diff(`x\\sqrt{x^{2} + ${a}}`),
          answer: expr(ans, `\\dfrac{2x^{2} + ${a}}{\\sqrt{x^{2} + ${a}}}`),
          solution: [
            `Product rule: $\\sqrt{x^2 + ${a}} + x \\cdot \\dfrac{x}{\\sqrt{x^2 + ${a}}}$.`,
            `Common denominator: $\\dfrac{(x^2 + ${a}) + x^2}{\\sqrt{x^2 + ${a}}} = \\dfrac{2x^{2} + ${a}}{\\sqrt{x^{2} + ${a}}}$`,
          ],
          selfCheck: () => isDerivative(`x*sqrt(x^2+${a})`, ans),
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\frac{d}{dx}f(g(x)) = f\'(g(x))\\,g\'(x)$: differentiate the outer function leaving the inside alone, then multiply by the derivative of the inside. With several layers, peel them from the outside in and multiply all the factors.',
    resources: [
      tb1b('chain-rule-and-product-rule', 'Visualizing the chain rule and product rule'),
      paul('CalcI/ChainRule.aspx', 'Chain Rule'),
      openstax(1, '3-6-the-chain-rule', 'The Chain Rule'),
    ],
  },
};

// ---------------------------------------------------------------------------

const implicit: Skill = {
  id: 'calc.implicit',
  name: 'Implicit differentiation',
  prereqs: ['calc.chain'],
  levels: [
    {
      name: 'ellipses',
      generate(r) {
        const a = r.int(1, 4);
        const b = r.int(1, 4);
        const x0 = r.nz(-3, 3);
        const y0 = r.nz(-3, 3);
        const c = a * x0 * x0 + b * y0 * y0;
        const ans = new Q(-a * x0, b * y0);
        return {
          prompt: `Find $\\dfrac{dy}{dx}$ at the point $(${x0}, ${y0})$ on the curve $${coef(a)}x^{2} + ${coef(b)}y^{2} = ${c}$.`,
          answer: exact(ans),
          solution: [
            `Differentiate both sides, treating $y$ as a function of $x$: $${2 * a}x + ${2 * b}y\\,y' = 0$.`,
            `$y' = -\\dfrac{${a}x}{${b}y}$`,
            `At $(${x0}, ${y0})$: $y' = ${ans.tex()}$`,
          ],
        };
      },
    },
    {
      name: 'mixed xy term',
      generate(r) {
        let k, x0, y0;
        do {
          k = r.nz(-3, 3);
          x0 = r.nz(-3, 3);
          y0 = r.nz(-3, 3);
        } while (k * x0 + 2 * y0 === 0);
        const c = x0 * x0 + k * x0 * y0 + y0 * y0;
        const ans = new Q(-(2 * x0 + k * y0), k * x0 + 2 * y0);
        return {
          prompt: `Find $\\dfrac{dy}{dx}$ at $(${x0}, ${y0})$ on the curve $x^{2} ${k < 0 ? '-' : '+'} ${Math.abs(k) === 1 ? '' : Math.abs(k)}xy + y^{2} = ${c}$.`,
          answer: exact(ans),
          solution: [
            `Differentiate; $xy$ needs the product rule: $2x ${signed(k)}(y + xy') + 2yy' = 0$.`,
            `Collect $y'$: $y'(${k}x + 2y) = -(2x ${signed(k)}y)$.`,
            `At $(${x0}, ${y0})$: $y' = -\\dfrac{${2 * x0 + k * y0}}{${k * x0 + 2 * y0}} = ${ans.tex()}$`,
          ],
        };
      },
    },
    {
      name: 'cubic curves',
      generate(r) {
        let k, x0, y0;
        do {
          k = r.nz(-4, 4);
          x0 = r.nz(-2, 2);
          y0 = r.nz(-2, 2);
        } while (3 * y0 * y0 + k * x0 === 0);
        const c = x0 ** 3 + y0 ** 3 + k * x0 * y0;
        const ans = new Q(-(3 * x0 * x0 + k * y0), 3 * y0 * y0 + k * x0);
        return {
          prompt: `Find $\\dfrac{dy}{dx}$ at $(${x0}, ${y0})$ on the curve $x^{3} + y^{3} ${k < 0 ? '-' : '+'} ${Math.abs(k) === 1 ? '' : Math.abs(k)}xy = ${c}$.`,
          answer: exact(ans),
          solution: [
            `Differentiate: $3x^2 + 3y^2y' ${signed(k)}(y + xy') = 0$.`,
            `$y' = -\\dfrac{3x^2 ${signed(k)}y}{3y^2 ${signed(k)}x}$`,
            `At $(${x0}, ${y0})$: $y' = -\\dfrac{${3 * x0 * x0 + k * y0}}{${3 * y0 * y0 + k * x0}} = ${ans.tex()}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Differentiate both sides of the equation with respect to $x$, treating $y$ as a function of $x$: every time you differentiate something containing $y$, the chain rule adds a factor $y\'$ (e.g. $\\frac{d}{dx}y^2 = 2yy\'$, and $xy$ needs the product rule). Then solve the resulting linear equation for $y\'$.',
    resources: [
      tb1b('implicit-differentiation', 'Implicit differentiation, what’s going on here?'),
      paul('CalcI/ImplicitDIff.aspx', 'Implicit Differentiation'),
      openstax(1, '3-8-implicit-differentiation', 'Implicit Differentiation'),
    ],
  },
};

// ---------------------------------------------------------------------------

/** f(x) = s(2x³ − 3(p+q)x² + 6pqx), so f'(x) = 6s(x−p)(x−q). */
const cubicWithRoots = (p: number, q: number, s: 1 | -1) => [2 * s, -3 * (p + q) * s, 6 * p * q * s, 0];

const extrema: Skill = {
  id: 'calc.extrema',
  name: 'Critical points and extrema',
  prereqs: ['calc.power'],
  levels: [
    {
      name: 'find critical points',
      generate(r) {
        const [p, q] = distinct(r, 2, -4, 4);
        const c = cubicWithRoots(p, q, 1);
        const f = poly(c);
        const d = poly([6, -6 * (p + q), 6 * p * q]);
        return {
          prompt: `Find all critical points of $f(x) = ${f.tex}$.`,
          answer: { kind: 'list', expected: [`${p}`, `${q}`] },
          inputHint: 'Comma-separated x-values, any order.',
          solution: [
            `$f'(x) = ${d.tex} = 6(${poly([1, -(p + q), p * q]).tex})$`,
            `$= 6(${lin(p)})(${lin(q)})$, which is zero at $x = ${p}$ and $x = ${q}$.`,
          ],
        };
      },
    },
    {
      name: 'classify with the second derivative',
      generate(r) {
        const [p, q] = distinct(r, 2, -4, 4).sort((a, b) => a - b);
        const s = r.sign();
        const f = poly(cubicWithRoots(p, q, s));
        const wantMax = r.next() < 0.5;
        // f'' = s(12x − 6(p+q)) is negative at p when s=1 -> p is the max.
        const maxAt = s === 1 ? p : q;
        const minAt = s === 1 ? q : p;
        const ans = wantMax ? maxAt : minAt;
        return {
          prompt: `$f(x) = ${f.tex}$ has two critical points. At which $x$ does it have a local ${wantMax ? 'maximum' : 'minimum'}?`,
          answer: num(new Q(ans)),
          solution: [
            `$f'(x) = ${6 * s}(${lin(p)})(${lin(q)})$, critical points $x = ${p}$ and $x = ${q}$.`,
            `$f''(x) = ${poly([12 * s, -6 * (p + q) * s]).tex}$: $f''(${p}) = ${6 * s * (p - q)}$, $f''(${q}) = ${6 * s * (q - p)}$.`,
            `Negative $f''$ means a maximum, positive a minimum, so the local ${wantMax ? 'maximum' : 'minimum'} is at $x = ${ans}$.`,
          ],
        };
      },
    },
    {
      name: 'absolute extrema on an interval',
      generate(r) {
        const [p, q] = distinct(r, 2, -3, 3).sort((a, b) => a - b);
        const c = cubicWithRoots(p, q, 1);
        const F = (x: number) => c[0] * x ** 3 + c[1] * x ** 2 + c[2] * x;
        const lo = p - r.int(1, 2);
        const hi = q + r.int(0, 2);
        const wantMax = r.next() < 0.5;
        const cands = [lo, p, q, hi];
        const vals = cands.map(F);
        const best = wantMax ? Math.max(...vals) : Math.min(...vals);
        return {
          prompt: `Find the absolute ${wantMax ? 'maximum' : 'minimum'} value of $f(x) = ${poly(c).tex}$ on $[${lo}, ${hi}]$.`,
          answer: num(new Q(best)),
          inputHint: 'The value of f, not the x.',
          solution: [
            `$f'(x) = 6(${lin(p)})(${lin(q)})$: critical points $${p}$ and $${q}$, both in the interval.`,
            `Evaluate at critical points and endpoints: ${cands.map((x, i) => `$f(${x}) = ${vals[i]}$`).join(', ')}.`,
            `The ${wantMax ? 'largest' : 'smallest'} is $${best}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Critical points are where $f\'(x) = 0$ (or $f\'$ is undefined). Classify with the second derivative: $f\'\' < 0$ is a local max, $f\'\' > 0$ a local min. For the absolute max/min on a closed interval $[a, b]$, evaluate $f$ at every critical point inside the interval and at both endpoints, then pick the largest/smallest value.',
    resources: [
      paul('CalcI/CriticalPoints.aspx', 'Critical Points'),
      paul('CalcI/AbsExtrema.aspx', 'Finding Absolute Extrema'),
      openstax(1, '4-3-maxima-and-minima', 'Maxima and Minima'),
    ],
  },
};

// ---------------------------------------------------------------------------

const lhopital: Skill = {
  id: 'calc.lhopital',
  name: "L'Hôpital's rule",
  prereqs: ['calc.limits', 'calc.chain'],
  levels: [
    {
      name: 'one application',
      generate(r) {
        const a = r.nz(-6, 6);
        const b = r.nz(-6, 6);
        const top = r.pick([
          { tex: `\\sin(${coef(a)}x)`, expr: `sin(${a}*x)`, d: `${a}\\cos(${coef(a)}x)` },
          { tex: `e^{${coef(a)}x} - 1`, expr: `exp(${a}*x)-1`, d: `${a}e^{${coef(a)}x}` },
          { tex: `\\tan(${coef(a)}x)`, expr: `tan(${a}*x)`, d: `${a}\\sec^2(${coef(a)}x)` },
        ]);
        const ans = new Q(a, b);
        return {
          prompt: `Evaluate $\\displaystyle\\lim_{x\\to 0} \\frac{${top.tex}}{${coef(b)}x}$.`,
          answer: exact(ans),
          solution: [
            `At $x = 0$ this is $\\frac{0}{0}$, so differentiate top and bottom.`,
            `$\\displaystyle\\lim_{x\\to 0} \\frac{${top.d}}{${b}} = \\frac{${a}}{${b}} = ${ans.tex()}$`,
          ],
          selfCheck: () => near(value(`(${top.expr})/(${b}*x)`, { x: 1e-7 }), ans.value(), 1e-4),
        };
      },
    },
    {
      name: 'apply it twice',
      generate(r) {
        const a = r.nz(-4, 4);
        if (r.next() < 0.5) {
          const b = r.int(1, 4);
          const ans = new Q(a * a, 2 * b);
          return {
            prompt: `Evaluate $\\displaystyle\\lim_{x\\to 0} \\frac{1 - \\cos(${coef(a)}x)}{${coef(b)}x^{2}}$.`,
            answer: exact(ans),
            solution: [
              `$\\frac{0}{0}$: differentiate → $\\dfrac{${a}\\sin(${coef(a)}x)}{${2 * b}x}$, still $\\frac{0}{0}$.`,
              `Again → $\\dfrac{${a * a}\\cos(${coef(a)}x)}{${2 * b}} \\to \\dfrac{${a * a}}{${2 * b}} = ${ans.tex()}$`,
            ],
            selfCheck: () => near(value(`(1-cos(${a}*x))/(${b}*x^2)`, { x: 1e-4 }), ans.value(), 1e-4),
          };
        }
        const ans = new Q(a * a, 2);
        return {
          prompt: `Evaluate $\\displaystyle\\lim_{x\\to 0} \\frac{e^{${coef(a)}x} - 1 ${st(-a, 'x')}}{x^{2}}$.`,
          answer: exact(ans),
          solution: [
            `$\\frac{0}{0}$: differentiate → $\\dfrac{${a}e^{${coef(a)}x} ${signed(-a)}}{2x}$, still $\\frac{0}{0}$.`,
            `Again → $\\dfrac{${a * a}e^{${coef(a)}x}}{2} \\to ${ans.tex()}$`,
          ],
          selfCheck: () => near(value(`(exp(${a}*x)-1-${a}*x)/x^2`, { x: 1e-4 }), ans.value(), 1e-3),
        };
      },
    },
    {
      name: '1^∞ forms',
      generate(r) {
        const a = r.nz(-4, 4);
        const b = r.int(1, 4);
        const toZero = r.next() < 0.5;
        const ab = a * b;
        const prompt = toZero
          ? `Evaluate $\\displaystyle\\lim_{x\\to 0^+} (1 ${st(a, 'x')})^{${b}/x}$.`
          : `Evaluate $\\displaystyle\\lim_{x\\to \\infty} \\left(1 ${a < 0 ? '-' : '+'} \\frac{${Math.abs(a)}}{x}\\right)^{${b === 1 ? '' : b}x}$.`;
        return {
          prompt,
          answer: exact(`e^(${ab})`, `e^{${ab}}`),
          inputHint: 'e^3 or exp(3).',
          solution: [
            `This is a $1^\\infty$ form. Let $L$ be the limit and take logs: $\\ln L = \\lim ${toZero ? `\\frac{${b}\\ln(1 ${st(a, 'x')})}{x}` : `${b}x\\ln\\left(1 ${signed(a)}\\cdot\\frac{1}{x}\\right)`}$.`,
            `That is a $\\frac{0}{0}$ form; L'Hôpital gives $\\ln L = ${ab}$.`,
            `$L = e^{${ab}}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'If $\\lim \\frac{f}{g}$ is $\\frac{0}{0}$ or $\\frac{\\infty}{\\infty}$, then $\\lim \\frac{f}{g} = \\lim \\frac{f\'}{g\'}$ (differentiate top and bottom separately, not the quotient rule). Repeat while the form stays indeterminate. For $1^\\infty$, $0^0$, $\\infty^0$: take $\\ln$, find that limit, then exponentiate.',
    resources: [
      tb1b('limits', 'Limits, L’Hôpital’s rule, and epsilon delta definitions'),
      paul('CalcI/LHospitalsRule.aspx', "L'Hospital's Rule and Indeterminate Forms"),
      openstax(1, '4-8-lhopitals-rule', "L'Hôpital's Rule"),
    ],
  },
};

// ---------------------------------------------------------------------------

const antideriv: Skill = {
  id: 'calc.antideriv',
  name: 'Basic antiderivatives',
  prereqs: ['calc.power'],
  levels: [
    {
      name: 'polynomials',
      generate(r) {
        const deg = r.int(2, 3);
        const c = [r.nz(-6, 6), ...Array.from({ length: deg }, () => r.int(-8, 8))];
        const f = poly(c);
        const F = sum(c.map((x, i) => mono(new Q(x, deg - i + 1), deg - i + 1)));
        return {
          prompt: `Find $${int(`(${f.tex})`)}$.`,
          answer: anti(F.expr, F.tex),
          inputHint: '+ C is optional.',
          solution: [`Integrate term by term: $\\int x^n\\,dx = \\frac{x^{n+1}}{n+1}$.`, `$${F.tex} + C$`],
          selfCheck: () => isDerivative(F.expr, f.expr),
        };
      },
    },
    {
      name: 'exp, trig and 1/x',
      generate(r) {
        const a = r.nz(-6, 6);
        const k = r.nz(-4, 4);
        const b = r.nz(-6, 6);
        const m = r.int(1, 4);
        const c = r.nz(-5, 5);
        const fx = `${a}*exp(${k}*x) + ${b}*cos(${m}*x) + ${c}/x`;
        const F = sum([
          t(new Q(a, k), `e^{${coef(k)}x}`, `exp(${k}*x)`),
          t(new Q(b, m), `\\sin(${coef(m)}x)`, `sin(${m}*x)`),
          t(c, '\\ln|x|', 'log(x)'),
        ]);
        return {
          prompt: `Find $${int(`\\left(${coef(a)}e^{${coef(k)}x} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}\\cos(${coef(m)}x) ${c < 0 ? '-' : '+'} \\frac{${Math.abs(c)}}{x}\\right)`)}$.`,
          answer: anti(F.expr, F.tex),
          inputHint: 'ln(x) or ln|x|, + C optional.',
          solution: [
            `$\\int e^{kx}dx = \\frac{1}{k}e^{kx}$, $\\int \\cos(mx)dx = \\frac{1}{m}\\sin(mx)$, $\\int \\frac{1}{x}dx = \\ln|x|$.`,
            `$${F.tex} + C$`,
          ],
          selfCheck: () => isDerivative(F.expr, fx),
        };
      },
    },
    {
      name: 'arctan and roots',
      generate(r) {
        const a = r.nz(-6, 6);
        const k = r.int(1, 4);
        const b = r.nz(-6, 6);
        const fx = `${a}/(x^2+${k * k}) + ${b}*sqrt(x)`;
        const F = sum([
          t(new Q(a, k), k === 1 ? '\\arctan x' : `\\arctan\\left(\\frac{x}{${k}}\\right)`, `atan(x/${k})`),
          t(new Q(2 * b, 3), 'x^{3/2}', 'x^(3/2)'),
        ]);
        return {
          prompt: `Find $${int(`\\left(\\frac{${a}}{x^{2} + ${k * k}} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}\\sqrt{x}\\right)`)}$.`,
          answer: anti(F.expr, F.tex),
          inputHint: 'arctan(x) or atan(x).',
          solution: [
            `$\\int \\frac{dx}{x^2 + k^2} = \\frac{1}{k}\\arctan\\frac{x}{k}$ with $k = ${k}$.`,
            `$\\int \\sqrt{x}\\,dx = \\int x^{1/2}dx = \\tfrac23 x^{3/2}$.`,
            `$${F.tex} + C$`,
          ],
          selfCheck: () => isDerivative(F.expr, fx),
        };
      },
    },
  ],
  learn: {
    summary:
      'Antiderivatives reverse differentiation; check any answer by differentiating it. Core table: $\\int x^n dx = \\frac{x^{n+1}}{n+1}$ ($n \\neq -1$), $\\int \\frac{dx}{x} = \\ln|x|$, $\\int e^{kx}dx = \\frac{e^{kx}}{k}$, $\\int \\cos(kx)dx = \\frac{\\sin(kx)}{k}$, $\\int \\sin(kx)dx = -\\frac{\\cos(kx)}{k}$, $\\int \\frac{dx}{x^2+k^2} = \\frac1k\\arctan\\frac{x}{k}$. Add $+C$.',
    resources: [
      tb1b('integration', 'Integration and the fundamental theorem of calculus'),
      paul('CalcI/ComputingIndefiniteIntegrals.aspx', 'Computing Indefinite Integrals'),
      openstax(1, '4-10-antiderivatives', 'Antiderivatives'),
    ],
  },
};

// ---------------------------------------------------------------------------

const definite: Skill = {
  id: 'calc.definite',
  name: 'Definite integrals and area',
  prereqs: ['calc.antideriv'],
  levels: [
    {
      name: 'polynomials',
      generate(r) {
        const a = r.int(-2, 1);
        const b = a + r.int(1, 3);
        const c = [r.nz(-4, 4), r.int(-5, 5), r.int(-5, 5)];
        const f = poly(c);
        const F = (x: number) => new Q(c[0] * x ** 3, 3).add(new Q(c[1] * x * x, 2)).add(c[2] * x);
        const ans = F(b).sub(F(a));
        const Ft = sum([mono(new Q(c[0], 3), 3), mono(new Q(c[1], 2), 2), mono(c[2], 1)]);
        return {
          prompt: `Evaluate $${int(`(${f.tex})`, a, b)}$.`,
          answer: num(ans),
          inputHint: 'Exact value, e.g. 14/3.',
          solution: [
            `Antiderivative: $F(x) = ${Ft.tex}$.`,
            `$F(${b}) - F(${a}) = ${F(b).tex()} - ${P(F(a).tex())} = ${ans.tex()}$`,
          ],
          selfCheck: () => near(integrate(f.expr, a, b), ans.value(), 1e-6),
        };
      },
    },
    {
      name: 'exp, trig and 1/x',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const k = r.nz(-3, 3);
          return {
            prompt: `Evaluate $${int(`e^{${coef(k)}x}`, 0, 1)}$.`,
            answer: num(`(e^(${k}) - 1)/(${k})`, `\\dfrac{e^{${k}} - 1}{${k}}`),
            inputHint: 'Exact form, e.g. (e^2-1)/2.',
            solution: [`$\\left[\\frac{1}{${k}}e^{${coef(k)}x}\\right]_0^1 = \\dfrac{e^{${k}} - 1}{${k}}$`],
            selfCheck: () => near(integrate(`exp(${k}*x)`, 0, 1), value(`(e^(${k})-1)/(${k})`)),
          };
        }
        if (kind === 1) {
          const m = r.int(1, 4);
          const ans = new Q(1, m);
          return {
            prompt: `Evaluate $${int(`\\cos(${coef(m)}x)`, 0, `\\frac{\\pi}{${2 * m}}`)}$.`,
            answer: num(ans),
            solution: [`$\\left[\\frac{1}{${m}}\\sin(${coef(m)}x)\\right]_0^{\\pi/${2 * m}} = \\frac{1}{${m}}\\left(\\sin\\frac{\\pi}{2} - 0\\right) = ${ans.tex()}$`],
            selfCheck: () => near(integrate(`cos(${m}*x)`, 0, Math.PI / (2 * m)), ans.value()),
          };
        }
        const k = r.int(1, 4);
        const c = r.int(1, 5);
        return {
          prompt: `Evaluate $${int(`\\frac{${c}}{x}`, 1, `e^{${k}}`)}$.`,
          answer: num(new Q(c * k)),
          solution: [`$\\left[${coef(c)}\\ln x\\right]_1^{e^{${k}}} = ${c}(${k} - 0) = ${c * k}$`],
          selfCheck: () => near(integrate(`${c}/x`, 1, Math.E ** k), c * k),
        };
      },
    },
    {
      name: 'area between curves',
      generate(r) {
        if (r.next() < 0.5) {
          const m = r.int(1, 6);
          const ans = new Q(m ** 3, 6);
          return {
            prompt: `Find the area of the region enclosed by $y = x^{2}$ and $y = ${coef(m)}x$.`,
            answer: num(ans),
            solution: [
              `Intersections: $x^2 = ${m}x \\Rightarrow x = 0, ${m}$. On $[0, ${m}]$ the line is on top.`,
              `$${int(`(${m === 1 ? '' : m}x - x^2)`, 0, m)} = \\left[\\frac{${m}x^2}{2} - \\frac{x^3}{3}\\right]_0^{${m}} = ${ans.tex()}$`,
            ],
            selfCheck: () => near(integrate(`${m}*x - x^2`, 0, m), ans.value()),
          };
        }
        const a = r.int(1, 3);
        const c = r.int(1, 3);
        const b = a * c * c;
        const ans = new Q(4 * a * c ** 3, 3);
        return {
          prompt: `Find the area of the region enclosed by $y = ${coef(a)}x^{2}$ and $y = ${b}$.`,
          answer: num(ans),
          solution: [
            `Intersections: $${coef(a)}x^2 = ${b} \\Rightarrow x = \\pm ${c}$.`,
            `$${int(`(${b} - ${coef(a)}x^2)`, -c, c)} = \\left[${b}x - \\frac{${a}x^3}{3}\\right]_{-${c}}^{${c}} = ${ans.tex()}$`,
          ],
          selfCheck: () => near(integrate(`${b} - ${a}*x^2`, -c, c), ans.value()),
        };
      },
    },
  ],
  learn: {
    summary:
      'Fundamental theorem: $\\int_a^b f(x)\\,dx = F(b) - F(a)$ for any antiderivative $F$. Area between curves: find the intersection points, work out which curve is on top, and integrate (top − bottom) between them.',
    resources: [
      tb1b('integration', 'Integration and the fundamental theorem of calculus'),
      paul('CalcI/ComputingDefiniteIntegrals.aspx', 'Computing Definite Integrals'),
      paul('CalcI/AreaBetweenCurves.aspx', 'Area Between Curves'),
      openstax(1, '6-1-areas-between-curves', 'Areas between Curves'),
    ],
  },
};

// ---------------------------------------------------------------------------

const usub: Skill = {
  id: 'calc.usub',
  name: 'Substitution',
  prereqs: ['calc.antideriv', 'calc.chain'],
  levels: [
    {
      name: 'spot the inner derivative',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const a = r.int(1, 6);
          const n = r.int(2, 6);
          const F = `(x^2+${a})^${n + 1}/${2 * (n + 1)}`;
          return {
            prompt: `Find $${int(`x(x^{2} + ${a})^{${n}}`)}$.`,
            answer: anti(F, `\\dfrac{(x^{2} + ${a})^{${n + 1}}}{${2 * (n + 1)}}`),
            solution: [
              `Let $u = x^2 + ${a}$, $du = 2x\\,dx$, so $x\\,dx = \\tfrac12 du$.`,
              `$\\tfrac12\\int u^{${n}}du = \\dfrac{u^{${n + 1}}}{${2 * (n + 1)}}$`,
            ],
            selfCheck: () => isDerivative(F, `x*(x^2+${a})^${n}`),
          };
        }
        if (kind === 1) {
          const k = r.nz(-3, 3);
          const F = `exp(${k}*x^2)/(${2 * k})`;
          return {
            prompt: `Find $${int(`xe^{${coef(k)}x^{2}}`)}$.`,
            answer: anti(F, `${new Q(1, 2 * k).tex()}e^{${coef(k)}x^{2}}`),
            solution: [`Let $u = ${coef(k)}x^2$, $du = ${2 * k}x\\,dx$.`, `$\\frac{1}{${2 * k}}\\int e^u du = ${new Q(1, 2 * k).tex()}e^{${coef(k)}x^{2}}$`],
            selfCheck: () => isDerivative(F, `x*exp(${k}*x^2)`),
          };
        }
        const n = r.int(2, 6);
        const F = `sin(x)^${n + 1}/${n + 1}`;
        return {
          prompt: `Find $${int(`\\cos x\\,\\sin^{${n}} x`)}$.`,
          answer: anti(F, `\\dfrac{\\sin^{${n + 1}} x}{${n + 1}}`),
          inputHint: 'Write powers of trig as sin(x)^3.',
          solution: [`Let $u = \\sin x$, $du = \\cos x\\,dx$.`, `$\\int u^{${n}}du = \\dfrac{\\sin^{${n + 1}} x}{${n + 1}}$`],
          selfCheck: () => isDerivative(F, `cos(x)*sin(x)^${n}`),
        };
      },
    },
    {
      name: 'logarithmic results',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const b = r.int(1, 6);
          const c = r.int(1, 9);
          const F = `log(x^2+${b}*x+${c})`;
          return {
            prompt: `Find $${int(`\\frac{2x + ${b}}{x^{2} + ${b === 1 ? '' : b}x + ${c}}`)}$.`,
            answer: anti(F, `\\ln|x^{2} + ${b === 1 ? '' : b}x + ${c}|`),
            solution: [`The numerator is the derivative of the denominator: $u = x^2 + ${b}x + ${c}$.`, `$\\int \\frac{du}{u} = \\ln|u|$`],
            selfCheck: () => isDerivative(F, `(2*x+${b})/(x^2+${b}*x+${c})`),
          };
        }
        if (kind === 1) {
          const n = r.int(1, 4);
          const F = `log(x)^${n + 1}/${n + 1}`;
          return {
            prompt: `Find $${int(`\\frac{(\\ln x)^{${n}}}{x}`)}$.`,
            answer: anti(F, `\\dfrac{(\\ln x)^{${n + 1}}}{${n + 1}}`),
            solution: [`Let $u = \\ln x$, $du = \\frac{dx}{x}$.`, `$\\int u^{${n}}du = \\dfrac{(\\ln x)^{${n + 1}}}{${n + 1}}$`],
            selfCheck: () => isDerivative(F, `log(x)^${n}/x`),
          };
        }
        const a = r.int(1, 6);
        const F = `log(exp(x)+${a})`;
        return {
          prompt: `Find $${int(`\\frac{e^{x}}{e^{x} + ${a}}`)}$.`,
          answer: anti(F, `\\ln(e^{x} + ${a})`),
          solution: [`Let $u = e^x + ${a}$, $du = e^x dx$.`, `$\\int \\frac{du}{u} = \\ln(e^{x} + ${a})$`],
          selfCheck: () => isDerivative(F, `exp(x)/(exp(x)+${a})`),
        };
      },
    },
    {
      name: 'roots and constant factors',
      generate(r) {
        const a = r.int(1, 8);
        if (r.next() < 0.5) {
          const F = `2/9*(x^3+${a})^(3/2)`;
          return {
            prompt: `Find $${int(`x^{2}\\sqrt{x^{3} + ${a}}`)}$.`,
            answer: anti(F, `\\tfrac{2}{9}(x^{3} + ${a})^{3/2}`),
            solution: [
              `Let $u = x^3 + ${a}$, $du = 3x^2dx$, so $x^2dx = \\tfrac13 du$.`,
              `$\\tfrac13\\int u^{1/2}du = \\tfrac13\\cdot\\tfrac23u^{3/2} = \\tfrac29(x^3 + ${a})^{3/2}$`,
            ],
            selfCheck: () => isDerivative(F, `x^2*sqrt(x^3+${a})`),
          };
        }
        const k = r.int(2, 6);
        const F = `${k}*sqrt(x^2+${a})`;
        return {
          prompt: `Find $${int(`\\frac{${k}x}{\\sqrt{x^{2} + ${a}}}`)}$.`,
          answer: anti(F, `${k}\\sqrt{x^{2} + ${a}}`),
          solution: [`Let $u = x^2 + ${a}$, $du = 2x\\,dx$.`, `$\\frac{${k}}{2}\\int u^{-1/2}du = ${k}\\sqrt{u}$`],
          selfCheck: () => isDerivative(F, `${k}*x/sqrt(x^2+${a})`),
        };
      },
    },
  ],
  learn: {
    summary:
      'Substitution is the chain rule in reverse. Look for a function $u = g(x)$ whose derivative $g\'(x)$ also appears (up to a constant factor). Replace $g(x)$ with $u$ and $g\'(x)dx$ with $du$, integrate in $u$, then substitute back.',
    resources: [
      paul('CalcI/SubstitutionRuleIndefinite.aspx', 'Substitution Rule for Indefinite Integrals'),
      openstax(1, '5-5-substitution', 'Substitution'),
      { kind: 'video', title: 'Khan Academy: u-substitution', url: 'https://www.khanacademy.org/math/ap-calculus-ab/ab-integration-new/ab-6-9/v/u-substitution' },
    ],
  },
};

// ---------------------------------------------------------------------------

const parts: Skill = {
  id: 'calc.parts',
  name: 'Integration by parts',
  prereqs: ['calc.antideriv', 'calc.product'],
  levels: [
    {
      name: 'single application',
      generate(r) {
        const kind = r.int(0, 3);
        const k = r.nz(-3, 3);
        if (kind === 0) {
          const a = r.int(-4, 4);
          const F = `exp(${k}*x)*((x+${P(a)})/${P(k)} - 1/${P(k * k)})`;
          const inner = sum([mono(new Q(1, k), 1), t(new Q(a, k).sub(new Q(1, k * k)))]);
          return {
            prompt: `Find $${int(`(${lin(-a)})e^{${coef(k)}x}`)}$.`,
            answer: anti(F, `e^{${coef(k)}x}\\left(${inner.tex}\\right)`),
            solution: [
              `$u = ${lin(-a)}$, $dv = e^{${coef(k)}x}dx$ → $du = dx$, $v = \\frac{1}{${k}}e^{${coef(k)}x}$.`,
              `$uv - \\int v\\,du = \\frac{${lin(-a)}}{${k}}e^{${coef(k)}x} - \\frac{1}{${k * k}}e^{${coef(k)}x}$`,
            ],
            selfCheck: () => isDerivative(F, `(x+${P(a)})*exp(${k}*x)`),
          };
        }
        if (kind === 3) {
          const n = r.int(1, 3);
          const F = `x^${n + 1}*log(x)/${n + 1} - x^${n + 1}/${(n + 1) ** 2}`;
          return {
            prompt: `Find $${int(`x^{${n}}\\ln x`)}$.`,
            answer: anti(F, `\\dfrac{x^{${n + 1}}\\ln x}{${n + 1}} - \\dfrac{x^{${n + 1}}}{${(n + 1) ** 2}}`),
            solution: [
              `Pick $u = \\ln x$ (it simplifies when differentiated), $dv = x^{${n}}dx$ → $du = \\frac{dx}{x}$, $v = \\frac{x^{${n + 1}}}{${n + 1}}$.`,
              `$\\frac{x^{${n + 1}}\\ln x}{${n + 1}} - \\int \\frac{x^{${n}}}{${n + 1}}dx = \\dfrac{x^{${n + 1}}\\ln x}{${n + 1}} - \\dfrac{x^{${n + 1}}}{${(n + 1) ** 2}}$`,
            ],
            selfCheck: () => isDerivative(F, `x^${n}*log(x)`),
          };
        }
        const m = Math.abs(k);
        const isSin = kind === 1;
        const F = isSin
          ? `-x*cos(${m}*x)/${m} + sin(${m}*x)/${m * m}`
          : `x*sin(${m}*x)/${m} + cos(${m}*x)/${m * m}`;
        const fn = isSin ? 'sin' : 'cos';
        const mx = `${coef(m)}x`;
        return {
          prompt: `Find $${int(`x\\${fn}(${mx})`)}$.`,
          answer: anti(
            F,
            isSin
              ? `-\\frac{x\\cos(${mx})}{${m}} + \\frac{\\sin(${mx})}{${m * m}}`
              : `\\frac{x\\sin(${mx})}{${m}} + \\frac{\\cos(${mx})}{${m * m}}`,
          ),
          solution: [
            `$u = x$, $dv = \\${fn}(${mx})dx$ → $du = dx$, $v = ${isSin ? `-\\frac{1}{${m}}\\cos(${mx})` : `\\frac{1}{${m}}\\sin(${mx})`}$.`,
            isSin
              ? `$-\\frac{x\\cos(${mx})}{${m}} + \\frac{1}{${m}}\\int\\cos(${mx})dx = -\\frac{x\\cos(${mx})}{${m}} + \\frac{\\sin(${mx})}{${m * m}}$`
              : `$\\frac{x\\sin(${mx})}{${m}} - \\frac{1}{${m}}\\int\\sin(${mx})dx = \\frac{x\\sin(${mx})}{${m}} + \\frac{\\cos(${mx})}{${m * m}}$`,
          ],
          selfCheck: () => isDerivative(F, `x*${fn}(${m}*x)`),
        };
      },
    },
    {
      name: 'repeated parts',
      generate(r) {
        const k = r.nz(-3, 3);
        if (r.next() < 0.6) {
          const F = `exp(${k}*x)*(x^2/${P(k)} - 2*x/${P(k * k)} + 2/${P(k ** 3)})`;
          const inner = sum([mono(new Q(1, k), 2), mono(new Q(-2, k * k), 1), t(new Q(2, k ** 3))]);
          return {
            prompt: `Find $${int(`x^{2}e^{${coef(k)}x}`)}$.`,
            answer: anti(F, `e^{${coef(k)}x}\\left(${inner.tex}\\right)`),
            solution: [
              `$u = x^2$, $dv = e^{${coef(k)}x}dx$: $\\frac{x^2}{${k}}e^{${coef(k)}x} - \\frac{2}{${k}}\\int xe^{${coef(k)}x}dx$.`,
              `Parts again on $\\int xe^{${coef(k)}x}dx = \\frac{x}{${k}}e^{${coef(k)}x} - \\frac{1}{${k * k}}e^{${coef(k)}x}$.`,
              `Combine: $e^{${coef(k)}x}\\left(${inner.tex}\\right) + C$`,
            ],
            selfCheck: () => isDerivative(F, `x^2*exp(${k}*x)`),
          };
        }
        const m = Math.abs(k);
        const mx = `${coef(m)}x`;
        const F = `-x^2*cos(${m}*x)/${m} + 2*x*sin(${m}*x)/${m * m} + 2*cos(${m}*x)/${m ** 3}`;
        return {
          prompt: `Find $${int(`x^{2}\\sin(${mx})`)}$.`,
          answer: anti(F, `-\\frac{x^{2}\\cos(${mx})}{${m}} + \\frac{2x\\sin(${mx})}{${m * m}} + \\frac{2\\cos(${mx})}{${m ** 3}}`),
          solution: [
            `$u = x^2$, $dv = \\sin(${mx})dx$: $-\\frac{x^2\\cos(${mx})}{${m}} + \\frac{2}{${m}}\\int x\\cos(${mx})dx$.`,
            `Parts again: $\\int x\\cos(${mx})dx = \\frac{x\\sin(${mx})}{${m}} + \\frac{\\cos(${mx})}{${m * m}}$.`,
            `Combine: $-\\frac{x^{2}\\cos(${mx})}{${m}} + \\frac{2x\\sin(${mx})}{${m * m}} + \\frac{2\\cos(${mx})}{${m ** 3}} + C$`,
          ],
          selfCheck: () => isDerivative(F, `x^2*sin(${m}*x)`),
        };
      },
    },
    {
      name: 'the loop trick',
      generate(r) {
        const a = r.nz(-3, 3);
        const b = r.int(1, 3);
        const isSin = r.next() < 0.5;
        const den = a * a + b * b;
        const F = isSin
          ? `exp(${a}*x)*(${a}*sin(${b}*x) - ${b}*cos(${b}*x))/${den}`
          : `exp(${a}*x)*(${a}*cos(${b}*x) + ${b}*sin(${b}*x))/${den}`;
        const bx = `${coef(b)}x`;
        const ax = `${coef(a)}x`;
        const inner = isSin
          ? sum([t(a, `\\sin(${bx})`), t(-b, `\\cos(${bx})`)])
          : sum([t(a, `\\cos(${bx})`), t(b, `\\sin(${bx})`)]);
        return {
          prompt: `Find $${int(`e^{${ax}}\\${isSin ? 'sin' : 'cos'}(${bx})`)}$.`,
          answer: anti(F, `\\dfrac{e^{${ax}}(${inner.tex})}{${den}}`),
          solution: [
            `Call the integral $I$. Integrate by parts twice (same choice of $u$ type both times).`,
            `You get $I = (\\text{stuff}) - \\frac{${b * b}}{${a * a}}I$, i.e. the original integral reappears.`,
            `Solve for $I$: $I = \\dfrac{e^{${ax}}(${inner.tex})}{${a * a} + ${b * b}} + C$`,
          ],
          selfCheck: () => isDerivative(F, `exp(${a}*x)*${isSin ? 'sin' : 'cos'}(${b}*x)`),
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\int u\\,dv = uv - \\int v\\,du$. Choose $u$ as the factor that gets simpler when differentiated (LIATE: Logs, Inverse trig, Algebraic, Trig, Exponential) and $dv$ as something you can integrate. Polynomial × exp/trig: repeat until the polynomial is gone. exp × trig: after two rounds the original integral reappears, so solve for it algebraically.',
    resources: [
      paul('CalcII/IntegrationByParts.aspx', 'Integration by Parts'),
      openstax(2, '3-1-integration-by-parts', 'Integration by Parts'),
      { kind: 'video', title: 'Khan Academy: Integration by parts intro', url: 'https://www.khanacademy.org/math/ap-calculus-bc/bc-integration-new/bc-6-11/v/deriving-integration-by-parts-formula' },
    ],
  },
};

// ---------------------------------------------------------------------------

const pfrac: Skill = {
  id: 'calc.pfrac',
  name: 'Partial fractions',
  prereqs: ['calc.usub'],
  levels: [
    {
      name: 'two linear factors',
      generate(r) {
        const [a, b] = distinct(r, 2, 1, 6);
        const den = poly([1, a + b, a * b]);
        const c = new Q(1, b - a);
        const F = `(${c})*(log(x+${a}) - log(x+${b}))`;
        return {
          prompt: `Find $${int(`\\frac{1}{${den.tex}}`)}$.`,
          answer: anti(F, `${coef(c)}\\ln\\left|\\dfrac{x + ${a}}{x + ${b}}\\right|`),
          inputHint: 'ln|x+1| or ln(x+1) both work.',
          solution: [
            `Factor: $${den.tex} = (x + ${a})(x + ${b})$.`,
            `$\\dfrac{1}{(x + ${a})(x + ${b})} = \\dfrac{A}{x + ${a}} + \\dfrac{B}{x + ${b}}$. Cover-up: $A = \\frac{1}{${b - a}}$, $B = \\frac{1}{${a - b}}$.`,
            `$${coef(c)}\\left(\\ln|x + ${a}| - \\ln|x + ${b}|\\right) + C$`,
          ],
          selfCheck: () => isDerivative(F, `1/((x+${a})*(x+${b}))`),
        };
      },
    },
    {
      name: 'linear numerator',
      generate(r) {
        const [a, b] = distinct(r, 2, 1, 6);
        const A = r.nz(-4, 4);
        const B = r.nz(-4, 4);
        const n = poly([A + B, A * b + B * a]);
        const den = poly([1, a + b, a * b]);
        const F = sum([t(A, `\\ln|x + ${a}|`, `log(x+${a})`), t(B, `\\ln|x + ${b}|`, `log(x+${b})`)]);
        return {
          prompt: `Find $${int(`\\frac{${n.tex}}{${den.tex}}`)}$.`,
          answer: anti(F.expr, F.tex),
          solution: [
            `$\\dfrac{${n.tex}}{(x + ${a})(x + ${b})} = \\dfrac{A}{x + ${a}} + \\dfrac{B}{x + ${b}}$`,
            `Cover-up at $x = ${-a}$: $A = \\frac{${(A + B) * -a + A * b + B * a}}{${b - a}} = ${A}$. At $x = ${-b}$: $B = ${B}$.`,
            `$${F.tex} + C$`,
          ],
          selfCheck: () => isDerivative(F.expr, `(${n.expr})/(${den.expr})`),
        };
      },
    },
    {
      name: 'repeated factor',
      generate(r) {
        const a = r.int(1, 5);
        const A = r.nz(-4, 4);
        const B = r.nz(-5, 5);
        const n = poly([A, A * a + B]);
        const F = `${A}*log(x+${a}) - ${P(B)}/(x+${a})`;
        return {
          prompt: `Find $${int(`\\frac{${n.tex}}{(x + ${a})^{2}}`)}$.`,
          answer: anti(F, `${coef(A)}\\ln|x + ${a}| ${B > 0 ? '-' : '+'} \\dfrac{${Math.abs(B)}}{x + ${a}}`),
          solution: [
            `$\\dfrac{${n.tex}}{(x + ${a})^2} = \\dfrac{A}{x + ${a}} + \\dfrac{B}{(x + ${a})^2}$, so $${n.tex} = A(x + ${a}) + B$.`,
            `Match coefficients: $A = ${A}$, $B = ${B}$.`,
            `$\\int \\frac{${A}}{x + ${a}}dx + \\int \\frac{${B}}{(x + ${a})^2}dx = ${coef(A)}\\ln|x + ${a}| ${B > 0 ? '-' : '+'} \\dfrac{${Math.abs(B)}}{x + ${a}} + C$`,
          ],
          selfCheck: () => isDerivative(F, `(${n.expr})/(x+${a})^2`),
        };
      },
    },
  ],
  learn: {
    summary:
      'For a rational function with a factorable denominator, split it into simple pieces: $\\frac{px+q}{(x-a)(x-b)} = \\frac{A}{x-a} + \\frac{B}{x-b}$; a repeated factor $(x-a)^2$ needs both $\\frac{A}{x-a}$ and $\\frac{B}{(x-a)^2}$. Find the constants by plugging in roots (cover-up) or matching coefficients, then each piece integrates to a log or a power.',
    resources: [
      paul('CalcII/PartialFractions.aspx', 'Partial Fractions'),
      openstax(2, '3-4-partial-fractions', 'Partial Fractions'),
    ],
  },
};

// ---------------------------------------------------------------------------

const series: Skill = {
  id: 'calc.series',
  name: 'Infinite series',
  prereqs: ['calc.limits'],
  levels: [
    {
      name: 'geometric series',
      generate(r) {
        let p, q;
        do {
          q = r.int(2, 7);
          p = r.nz(-q + 1, q - 1);
        } while (new Q(p, q).d !== q);
        const ratio = new Q(p, q);
        const a = r.nz(-5, 5);
        const fromOne = r.next() < 0.5;
        const first = fromOne ? ratio.mul(a) : new Q(a);
        const ans = first.div(new Q(1).sub(ratio));
        return {
          prompt: `Find $\\displaystyle\\sum_{n=${fromOne ? 1 : 0}}^{\\infty} ${a === 1 ? '' : a === -1 ? '-' : a}\\left(${ratio.tex()}\\right)^{n}$.`,
          answer: num(ans),
          solution: [
            `Geometric with ratio $r = ${ratio.tex()}$, $|r| < 1$, so it converges to $\\frac{\\text{first term}}{1 - r}$.`,
            `First term ($n = ${fromOne ? 1 : 0}$): $${first.tex()}$.`,
            `$\\dfrac{${first.tex()}}{1 - ${P(ratio.tex())}} = ${ans.tex()}$`,
          ],
        };
      },
    },
    {
      name: 'convergence tests',
      generate(r) {
        const ABS = 0, COND = 1, DIV = 2;
        const pp = r.pick([new Q(1, 2), new Q(1), new Q(3, 2), new Q(2), new Q(3)]);
        const k = r.int(2, 5);
        const pool: { tex: string; ans: number; why: string }[] = [
          { tex: `\\frac{1}{n^{${pp.tex()}}}`, ans: pp.value() > 1 ? ABS : DIV, why: `$p$-series with $p = ${pp.tex()}$: converges iff $p > 1$.` },
          {
            tex: `\\frac{(-1)^n}{n^{${pp.tex()}}}`,
            ans: pp.value() > 1 ? ABS : COND,
            why: pp.value() > 1 ? `$\\sum \\frac{1}{n^{${pp.tex()}}}$ converges ($p > 1$), so absolutely convergent.` : `Alternating series test gives convergence, but $\\sum \\frac{1}{n^{${pp.tex()}}}$ diverges ($p \\le 1$): conditional.`,
          },
          { tex: `\\frac{n}{n^{2} + ${k}}`, ans: DIV, why: 'Limit comparison with $\\frac{1}{n}$ (harmonic), which diverges.' },
          { tex: `\\frac{1}{n^{2} + ${k}}`, ans: ABS, why: 'Compare with $\\frac{1}{n^2}$, which converges.' },
          { tex: `\\frac{${k}^n}{n!}`, ans: ABS, why: `Ratio test: $\\frac{a_{n+1}}{a_n} = \\frac{${k}}{n+1} \\to 0 < 1$.` },
          { tex: `\\frac{n!}{${k}^n}`, ans: DIV, why: 'Ratio test: $\\frac{n+1}{' + k + '} \\to \\infty$; terms do not go to 0.' },
          { tex: `\\frac{(-1)^n n}{n + ${k}}`, ans: DIV, why: 'Terms do not tend to 0 (their size tends to 1), so the divergence test applies.' },
          { tex: `\\frac{(-1)^n}{\\ln(n + 1)}`, ans: COND, why: 'Alternating series test converges, but $\\frac{1}{\\ln(n+1)} > \\frac{1}{n}$ so not absolutely.' },
          { tex: `\\frac{n^{2}}{${k}^n}`, ans: ABS, why: `Ratio test: $\\to \\frac{1}{${k}} < 1$.` },
        ];
        const pick = r.pick(pool);
        return {
          prompt: `Does $\\displaystyle\\sum_{n=1}^{\\infty} ${pick.tex}$ converge absolutely, converge conditionally, or diverge?`,
          answer: { kind: 'choice', options: ['Converges absolutely', 'Converges conditionally', 'Diverges'], correct: pick.ans },
          solution: [pick.why],
        };
      },
    },
    {
      name: 'telescoping sums',
      generate(r) {
        const k = r.int(1, 4);
        let H = new Q(0);
        for (let i = 1; i <= k; i++) H = H.add(new Q(1, i));
        const ans = H.div(k);
        return {
          prompt: `Find $\\displaystyle\\sum_{n=1}^{\\infty} \\frac{1}{n(n + ${k})}$.`,
          answer: num(ans),
          solution: [
            `Partial fractions: $\\frac{1}{n(n + ${k})} = \\frac{1}{${k}}\\left(\\frac{1}{n} - \\frac{1}{n + ${k}}\\right)$.`,
            `The sum telescopes; only the first ${k} terms of $\\frac1n$ survive: $\\frac{1}{${k}}\\left(${Array.from({ length: k }, (_, i) => `\\frac{1}{${i + 1}}`).join(' + ')}\\right)$.`,
            `$= ${ans.tex()}$`,
          ],
          selfCheck: () => {
            let s = 0;
            for (let n = 1; n < 2e6; n++) s += 1 / (n * (n + k));
            return near(s, ans.value(), 1e-5);
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'Geometric: $\\sum ar^n$ converges iff $|r| < 1$, to $\\frac{\\text{first term}}{1 - r}$. Divergence test: if $a_n \\not\\to 0$ it diverges. $p$-series $\\sum \\frac{1}{n^p}$ converges iff $p > 1$. Compare with a known series for rational-looking terms; use the ratio test for factorials and exponentials. Alternating series with decreasing terms going to 0 converge, and convergence is absolute only if $\\sum |a_n|$ also converges.',
    resources: [
      paul('CalcII/ConvergenceOfSeries.aspx', 'Convergence/Divergence of Series'),
      paul('CalcII/SeriesStrategy.aspx', 'Strategy for Series'),
      openstax(2, '5-2-infinite-series', 'Infinite Series'),
    ],
  },
};

// ---------------------------------------------------------------------------

const taylor: Skill = {
  id: 'calc.taylor',
  name: 'Taylor and power series',
  prereqs: ['calc.chain', 'calc.series'],
  levels: [
    {
      name: 'Maclaurin coefficients',
      generate(r) {
        const k = r.nz(-3, 3);
        const kind = r.int(0, 3);
        const n = kind === 1 ? r.pick([1, 3, 5]) : kind === 2 ? r.pick([2, 4]) : r.int(2, 5);
        const fns = [
          { tex: `e^{${coef(k)}x}`, c: new Q(k ** n, fact(n)), why: `$e^u = \\sum \\frac{u^n}{n!}$ with $u = ${coef(k)}x$: coefficient $\\frac{${P(k)}^{${n}}}{${n}!}$.` },
          {
            tex: `\\sin(${coef(k)}x)`,
            c: new Q((-1) ** ((n - 1) / 2) * k ** n, fact(n)),
            why: `$\\sin u = u - \\frac{u^3}{3!} + \\frac{u^5}{5!} - \\dots$ with $u = ${coef(k)}x$.`,
          },
          {
            tex: `\\cos(${coef(k)}x)`,
            c: new Q((-1) ** (n / 2) * k ** n, fact(n)),
            why: `$\\cos u = 1 - \\frac{u^2}{2!} + \\frac{u^4}{4!} - \\dots$ with $u = ${coef(k)}x$.`,
          },
          { tex: `\\dfrac{1}{1 ${st(-k, 'x')}}`, c: new Q(k ** n), why: `$\\frac{1}{1-u} = \\sum u^n$ with $u = ${coef(k)}x$.` },
        ];
        const f = fns[kind];
        return {
          prompt: `What is the coefficient of $x^{${n}}$ in the Maclaurin series of $${f.tex}$?`,
          answer: num(f.c),
          solution: [f.why, `Coefficient of $x^{${n}}$: $${f.c.tex()}$`],
        };
      },
    },
    {
      name: 'second-order Taylor polynomial',
      generate(r) {
        const a = r.nz(-3, 3);
        const kind = r.int(0, 3);
        const b = r.nz(-3, 3);
        const ax = `${coef(a)}x`;
        const opts = [
          { tex: `\\dfrac{1}{1 ${st(-a, 'x')}}`, fn: `1/(1-${a}*x)`, c: [new Q(a * a), new Q(a), new Q(1)] },
          { tex: `\\ln(1 ${st(a, 'x')})`, fn: `log(1+${a}*x)`, c: [new Q(-a * a, 2), new Q(a), new Q(0)] },
          { tex: `\\sqrt{1 ${st(a, 'x')}}`, fn: `sqrt(1+${a}*x)`, c: [new Q(-a * a, 8), new Q(a, 2), new Q(1)] },
          { tex: `e^{${ax}}(1 ${st(b, 'x')})`, fn: `exp(${a}*x)*(1+${b}*x)`, c: [new Q(a * a, 2).add(a * b), new Q(a + b), new Q(1)] },
        ];
        const o = opts[kind];
        const p = poly(o.c);
        return {
          prompt: `Find the degree-2 Taylor polynomial of $f(x) = ${o.tex}$ about $x = 0$.`,
          answer: expr(p.expr, p.tex),
          solution: [
            `$T_2(x) = f(0) + f'(0)x + \\frac{f''(0)}{2}x^2$, or expand a known series and keep terms up to $x^2$.`,
            `$T_2(x) = ${p.tex}$`,
          ],
          selfCheck: () => {
            const h = 1e-3;
            const fv = (x: number) => value(o.fn, { x });
            const d1 = (fv(h) - fv(-h)) / (2 * h);
            const d2 = (fv(h) - 2 * fv(0) + fv(-h)) / (h * h);
            return near(fv(0), o.c[2].value(), 1e-6) && near(d1, o.c[1].value(), 1e-4) && near(d2 / 2, o.c[0].value(), 1e-3);
          },
        };
      },
    },
    {
      name: 'radius of convergence',
      generate(r) {
        const k = r.int(2, 6);
        const c = r.int(-3, 3);
        const xc = c === 0 ? 'x' : `(${lin(c)})`;
        const pool = [
          { tex: `\\frac{${xc}^n}{${k}^n}`, ans: `${k}`, why: `Root/ratio test: $\\left|\\frac{x - c}{${k}}\\right| < 1$.` },
          { tex: `\\frac{n\\,${xc}^n}{${k}^n}`, ans: `${k}`, why: `Ratio: $\\frac{n+1}{n}\\cdot\\frac{|x - c|}{${k}} \\to \\frac{|x - c|}{${k}}$.` },
          { tex: `\\frac{${xc}^n}{n\\cdot ${k}^n}`, ans: `${k}`, why: `Ratio: $\\frac{n}{n+1}\\cdot\\frac{|x - c|}{${k}} \\to \\frac{|x - c|}{${k}}$.` },
          { tex: `\\frac{${xc}^n}{n!}`, ans: 'Infinity', why: 'Ratio: $\\frac{|x - c|}{n+1} \\to 0$ for every $x$.' },
          { tex: `n!\\,${xc}^n`, ans: '0', why: 'Ratio: $(n+1)|x - c| \\to \\infty$ unless $x = c$.' },
          { tex: `${k}^n${xc}^{n}`, ans: `1/${k}`, why: `Ratio: $${k}|x - c| < 1$.` },
        ];
        const p = r.pick(pool);
        return {
          prompt: `Find the radius of convergence of $\\displaystyle\\sum_{n=1}^{\\infty} ${p.tex}$.`,
          answer: num(p.ans, p.ans === 'Infinity' ? '\\infty' : undefined),
          inputHint: 'Type inf for ∞.',
          solution: [p.why, `$R = ${p.ans === 'Infinity' ? '\\infty' : p.ans.replace(/^1\/(\d+)$/, '\\frac{1}{$1}')}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Taylor series about $0$: $f(x) = \\sum \\frac{f^{(n)}(0)}{n!}x^n$. Memorise $e^x$, $\\sin x$, $\\cos x$, $\\frac{1}{1-x}$, $\\ln(1+x)$ and build others by substituting ($x \\to kx$), multiplying, differentiating or integrating. Radius of convergence: apply the ratio test to $|a_{n+1}/a_n|$ and solve "limit < 1" for $|x - c|$.',
    resources: [
      tb1b('taylor-series', 'Taylor series'),
      paul('CalcII/TaylorSeries.aspx', 'Taylor Series'),
      paul('CalcII/PowerSeries.aspx', 'Power Series'),
      openstax(2, '6-3-taylor-and-maclaurin-series', 'Taylor and Maclaurin Series'),
    ],
  },
};

// ---------------------------------------------------------------------------

const partial: Skill = {
  id: 'calc.partial',
  name: 'Partial derivatives and gradients',
  prereqs: ['calc.chain'],
  levels: [
    {
      name: 'partial derivatives',
      generate(r) {
        const a = r.nz(-5, 5);
        const m = r.int(1, 3);
        const n = r.int(1, 3);
        const b = r.nz(-4, 4);
        const k = r.nz(-2, 2);
        const c = r.nz(-6, 6);
        const q = r.int(2, 4);
        const wrtX = r.next() < 0.5;
        const f = `${a}*x^${m}*y^${n} + ${b}*exp(${k}*x*y) + ${c}*y^${q}`;
        const fTex = `${coef(a)}x^{${m}}y^{${n}} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}e^{${coef(k)}xy} ${signed(c)}y^{${q}}`;
        const d = wrtX
          ? sum([t(a * m, `x^{${m - 1}}y^{${n}}`, `x^${m - 1}*y^${n}`), t(b * k, `ye^{${coef(k)}xy}`, `y*exp(${k}*x*y)`)])
          : sum([t(a * n, `x^{${m}}y^{${n - 1}}`, `x^${m}*y^${n - 1}`), t(b * k, `xe^{${coef(k)}xy}`, `x*exp(${k}*x*y)`), t(c * q, `y^{${q - 1}}`, `y^${q - 1}`)]);
        const v = wrtX ? 'x' : 'y';
        return {
          prompt: `For $f(x, y) = ${fTex}$, find $\\dfrac{\\partial f}{\\partial ${v}}$.`,
          answer: expr(d.expr, d.tex.replace(/x\^\{0\}|y\^\{0\}/g, '').replace(/\^\{1\}/g, ''), ['x', 'y']),
          solution: [
            `Treat ${wrtX ? '$y$' : '$x$'} as a constant and differentiate with respect to $${v}$.`,
            `$e^{${coef(k)}xy}$ gives a factor $${k}${wrtX ? 'y' : 'x'}$ by the chain rule${wrtX ? `; the $y^{${q}}$ term is constant` : ''}.`,
            `$\\dfrac{\\partial f}{\\partial ${v}} = ${d.tex.replace(/x\^\{0\}|y\^\{0\}/g, '').replace(/\^\{1\}/g, '')}$`,
          ],
          selfCheck: () => isDerivative(f, d.expr, v, wrtX ? { y: 1.3 } : { x: 0.8 }),
        };
      },
    },
    {
      name: 'gradient at a point',
      generate(r) {
        const [a, b, c, d] = [r.nz(-3, 3), r.nz(-3, 3), r.int(-5, 5), r.int(-5, 5)];
        const [x0, y0] = [r.int(-2, 2), r.int(-2, 2)];
        const fTex = sum([t(a, 'x^{2}y'), t(b, 'xy^{2}'), t(c, 'x'), t(d, 'y^{3}')]).tex;
        const fx = 2 * a * x0 * y0 + b * y0 * y0 + c;
        const fy = a * x0 * x0 + 2 * b * x0 * y0 + 3 * d * y0 * y0;
        return {
          prompt: `Find $\\nabla f(${x0}, ${y0})$ for $f(x, y) = ${fTex}$.`,
          answer: { kind: 'matrix', expected: [[`${fx}`], [`${fy}`]] },
          solution: [
            `$f_x = ${sum([t(2 * a, 'xy'), t(b, 'y^{2}'), t(c)]).tex}$, $f_y = ${sum([t(a, 'x^{2}'), t(2 * b, 'xy'), t(3 * d, 'y^{2}')]).tex}$.`,
            `At $(${x0}, ${y0})$: $\\nabla f = (${fx}, ${fy})$.`,
          ],
        };
      },
    },
    {
      name: 'Hessian at a point',
      generate(r) {
        const [a, b, c, d, e] = [r.int(-2, 2), r.nz(-3, 3), r.nz(-3, 3), r.int(-2, 2), r.int(-4, 4)];
        const [x0, y0] = [r.int(-2, 2), r.int(-2, 2)];
        const fTex = sum([t(a, 'x^{3}'), t(b, 'x^{2}y'), t(c, 'xy^{2}'), t(d, 'y^{3}'), t(e, 'xy')]).tex;
        const fxx = 6 * a * x0 + 2 * b * y0;
        const fxy = 2 * b * x0 + 2 * c * y0 + e;
        const fyy = 2 * c * x0 + 6 * d * y0;
        return {
          prompt: `Find the Hessian matrix of $f(x, y) = ${fTex}$ at $(${x0}, ${y0})$.`,
          answer: { kind: 'matrix', expected: [[`${fxx}`, `${fxy}`], [`${fxy}`, `${fyy}`]] },
          solution: [
            `$H = \\begin{bmatrix} f_{xx} & f_{xy} \\\\ f_{yx} & f_{yy} \\end{bmatrix}$, and $f_{xy} = f_{yx}$.`,
            `$f_{xx} = ${sum([t(6 * a, 'x'), t(2 * b, 'y')]).tex}$, $f_{xy} = ${sum([t(2 * b, 'x'), t(2 * c, 'y'), t(e)]).tex}$, $f_{yy} = ${sum([t(2 * c, 'x'), t(6 * d, 'y')]).tex}$.`,
            `At $(${x0}, ${y0})$: $\\begin{bmatrix} ${fxx} & ${fxy} \\\\ ${fxy} & ${fyy} \\end{bmatrix}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\frac{\\partial f}{\\partial x}$: differentiate with respect to $x$ while treating every other variable as a constant. The gradient $\\nabla f = (f_x, f_y)$ points in the direction of steepest ascent. The Hessian collects the second partials $\\begin{bmatrix} f_{xx} & f_{xy} \\\\ f_{yx} & f_{yy}\\end{bmatrix}$ and is symmetric for smooth $f$.',
    resources: [
      paul('CalcIII/PartialDerivatives.aspx', 'Partial Derivatives'),
      paul('CalcIII/DirectionalDeriv.aspx', 'Directional Derivatives (gradient)'),
      openstax(3, '4-3-partial-derivatives', 'Partial Derivatives'),
      { kind: 'video', title: 'Khan Academy: Gradient', url: 'https://www.khanacademy.org/math/multivariable-calculus/multivariable-derivatives/partial-derivative-and-gradient-articles/a/the-gradient' },
    ],
  },
};

// ---------------------------------------------------------------------------

const double: Skill = {
  id: 'calc.double',
  name: 'Double integrals',
  prereqs: ['calc.definite', 'calc.partial'],
  levels: [
    {
      name: 'rectangles',
      generate(r) {
        const k = r.int(1, 6);
        const m = r.int(0, 2);
        const n = r.int(1, 2);
        const a = r.int(1, 3);
        const b = r.int(1, 3);
        const ans = new Q(k * a ** (m + 1) * b ** (n + 1), (m + 1) * (n + 1));
        const body = `${k === 1 ? '' : k}${m === 0 ? '' : m === 1 ? 'x' : `x^{${m}}`}${n === 1 ? 'y' : `y^{${n}}`}`;
        return {
          prompt: `Evaluate $\\displaystyle\\int_0^{${a}}\\int_0^{${b}} ${body}\\,dy\\,dx$.`,
          answer: num(ans),
          solution: [
            `Inner (in $y$): $${k === 1 ? '' : k}${m === 0 ? '' : m === 1 ? 'x' : `x^{${m}}`}\\left[\\frac{y^{${n + 1}}}{${n + 1}}\\right]_0^{${b}} = ${new Q(k * b ** (n + 1), n + 1).tex()}${m === 0 ? '' : m === 1 ? 'x' : `x^{${m}}`}$`,
            `Outer (in $x$) over $[0, ${a}]$: $${ans.tex()}$`,
          ],
          selfCheck: () => near(integrate2(`${k}*x^${m}*y^${n}`, 0, a, () => 0, () => b), ans.value(), 1e-6),
        };
      },
    },
    {
      name: 'triangular regions',
      generate(r) {
        const p = r.int(0, 4);
        const q = r.int(1, 4);
        const a = r.int(1, 3);
        const ans = new Q(2 * p + q, 6).mul(a ** 3);
        const f = sum([t(p, 'x'), t(q, 'y')]);
        return {
          prompt: `Evaluate $\\displaystyle\\iint_R (${f.tex})\\,dA$ where $R$ is the triangle $0 \\le y \\le x \\le ${a}$.`,
          answer: num(ans),
          solution: [
            `Write it as $\\displaystyle\\int_0^{${a}}\\int_0^{x} (${f.tex})\\,dy\\,dx$.`,
            `Inner: $${p === 0 ? '' : `${coef(p)}x\\cdot x + `}\\frac{${q}x^2}{2} = ${new Q(2 * p + q, 2).tex()}x^2$.`,
            `Outer: $${new Q(2 * p + q, 2).tex()}\\cdot\\frac{${a}^3}{3} = ${ans.tex()}$`,
          ],
          selfCheck: () => near(integrate2(`${p}*x + ${q}*y`, 0, a, () => 0, (x) => x), ans.value(), 1e-6),
        };
      },
    },
    {
      name: 'regions between curves',
      generate(r) {
        const c = r.int(1, 3);
        const p = r.int(1, 4);
        const q = r.int(1, 4);
        const ans = new Q(p * c ** 4, 12).add(new Q(q * c ** 3, 6));
        const f = sum([t(p, 'x'), t(q)]);
        return {
          prompt: `Evaluate $\\displaystyle\\iint_R (${f.tex})\\,dA$ where $R$ is the region between $y = x^{2}$ and $y = ${coef(c)}x$.`,
          answer: num(ans),
          solution: [
            `Curves meet at $x = 0$ and $x = ${c}$; on that interval $x^2 \\le y \\le ${c === 1 ? '' : c}x$.`,
            `$\\displaystyle\\int_0^{${c}}\\int_{x^2}^{${c === 1 ? '' : c}x} (${f.tex})\\,dy\\,dx = \\int_0^{${c}} (${f.tex})(${c === 1 ? '' : c}x - x^2)\\,dx$`,
            `$= ${ans.tex()}$`,
          ],
          selfCheck: () => near(integrate2(`${p}*x + ${q}`, 0, c, (x) => x * x, (x) => c * x), ans.value(), 1e-6),
        };
      },
    },
  ],
  learn: {
    summary:
      'Do the inner integral first, treating the outer variable as a constant, then integrate the result. For non-rectangular regions, sketch the region, find where the boundary curves meet, and express the inner limits as functions of the outer variable (e.g. $x^2 \\le y \\le x$).',
    resources: [
      paul('CalcIII/IteratedIntegrals.aspx', 'Iterated Integrals'),
      paul('CalcIII/DIGeneralRegion.aspx', 'Double Integrals over General Regions'),
      openstax(3, '5-2-double-integrals-over-general-regions', 'Double Integrals over General Regions'),
    ],
  },
};

// ---------------------------------------------------------------------------
// Going deeper

const improper: Skill = {
  id: 'calc.improper',
  name: 'Improper integrals',
  prereqs: ['calc.definite', 'calc.limits'],
  levels: [
    {
      name: 'p-integrals to infinity',
      generate(r) {
        const p = r.int(2, 4);
        const a = r.int(1, 3);
        const k = r.int(1, 6);
        const ans = new Q(k, (p - 1) * a ** (p - 1));
        return {
          prompt: `Evaluate $${int(`\\frac{${k}}{x^{${p}}}`, a, '\\infty')}$.`,
          answer: num(ans),
          solution: [
            `Replace $\\infty$ by $b$ and take the limit: $\\displaystyle\\lim_{b\\to\\infty}\\left[-\\frac{${k}}{${p - 1}x^{${p - 1}}}\\right]_{${a}}^{b}$.`,
            `The term at $b$ goes to $0$, leaving $\\dfrac{${k}}{${p - 1}\\cdot ${a}^{${p - 1}}} = ${ans.tex()}$.`,
          ],
          // Finite part up to B plus the exact tail k/((p-1)B^(p-1)).
          selfCheck: () => near(integrate(`${k}/x^${p}`, a, 50, 20000) + k / ((p - 1) * 50 ** (p - 1)), ans.value(), 1e-6),
        };
      },
    },
    {
      name: 'exponential tails',
      generate(r) {
        const k = r.int(1, 4);
        if (r.next() < 0.5) {
          const c = r.int(1, 6);
          const ans = new Q(c, k);
          return {
            prompt: `Evaluate $${int(`${c === 1 ? '' : c}e^{-${k === 1 ? '' : k}x}`, 0, '\\infty')}$.`,
            answer: num(ans),
            solution: [`$\\displaystyle\\lim_{b\\to\\infty}\\left[-\\frac{${c}}{${k}}e^{-${k === 1 ? '' : k}x}\\right]_0^{b} = 0 + \\frac{${c}}{${k}} = ${ans.tex()}$`],
            selfCheck: () => near(integrate(`${c}*exp(-${k}*x)`, 0, 60, 20000), ans.value(), 1e-6),
          };
        }
        const ans = new Q(1, k * k);
        return {
          prompt: `Evaluate $${int(`xe^{-${k === 1 ? '' : k}x}`, 0, '\\infty')}$.`,
          answer: num(ans),
          solution: [
            `By parts: $\\int xe^{-${k}x}dx = -\\frac{x}{${k}}e^{-${k}x} - \\frac{1}{${k * k}}e^{-${k}x}$.`,
            `At $\\infty$ both terms vanish (exponential beats polynomial); at $0$ the value is $-\\frac{1}{${k * k}}$.`,
            `Result: $${ans.tex()}$`,
          ],
          selfCheck: () => near(integrate(`x*exp(-${k}*x)`, 0, 80, 20000), ans.value(), 1e-6),
        };
      },
    },
    {
      name: 'converges or diverges?',
      generate(r) {
        const k = r.int(1, 5);
        const p = r.pick([new Q(1, 2), new Q(1), new Q(3, 2), new Q(2), new Q(1, 3)]);
        const pool: { tex: string; conv: boolean; why: string }[] = [
          { tex: int(`\\frac{1}{${p.eq(1) ? 'x' : `x^{${p.tex()}}`}}`, 1, '\\infty'), conv: p.value() > 1, why: `Tail $p$-integral: converges iff $p > 1$; here $p = ${p.tex()}$.` },
          { tex: int(`\\frac{1}{${p.eq(1) ? 'x' : `x^{${p.tex()}}`}}`, 0, 1), conv: p.value() < 1, why: `Singular at $0$: converges iff $p < 1$; here $p = ${p.tex()}$.` },
          { tex: int(`\\frac{1}{x^{2} + ${k}}`, 0, '\\infty'), conv: true, why: `Behaves like $\\frac{1}{x^2}$ at infinity, which is integrable (the value is $\\frac{\\pi}{2\\sqrt{${k}}}$).` },
          { tex: int(`\\frac{1}{\\sqrt{x^{2} + ${k}}}`, 1, '\\infty'), conv: false, why: 'Behaves like $\\frac{1}{x}$ at infinity, which is not integrable.' },
          { tex: int('\\frac{1}{x\\ln x}', 2, '\\infty'), conv: false, why: 'Substitute $u = \\ln x$: $\\int \\frac{du}{u} = \\ln u \\to \\infty$.' },
          { tex: int('\\frac{\\ln x}{x^{2}}', 1, '\\infty'), conv: true, why: '$\\ln x$ grows slower than any power, so compare with $\\frac{1}{x^{3/2}}$, which converges.' },
          { tex: int(`e^{-${k === 1 ? '' : k}x}`, 0, '\\infty'), conv: true, why: `Exponential decay: the value is $\\frac{1}{${k}}$.` },
        ];
        const c = r.pick(pool);
        return {
          prompt: `Does $${c.tex}$ converge or diverge?`,
          answer: { kind: 'choice', options: ['Converges', 'Diverges'], correct: c.conv ? 0 : 1 },
          solution: [c.why],
        };
      },
    },
  ],
  learn: {
    summary:
      'An integral with an infinite limit or a blow-up inside is defined as a limit: $\\int_a^\\infty f = \\lim_{b\\to\\infty}\\int_a^b f$. Benchmarks: $\\int_1^\\infty \\frac{dx}{x^p}$ converges iff $p > 1$, $\\int_0^1 \\frac{dx}{x^p}$ converges iff $p < 1$, and $e^{-kx}$ always decays fast enough. Compare unfamiliar integrands to these.',
    resources: [
      paul('CalcII/ImproperIntegrals.aspx', 'Improper Integrals'),
      paul('CalcII/ImproperIntegralsCompTest.aspx', 'Comparison Test for Improper Integrals'),
      openstax(2, '3-7-improper-integrals', 'Improper Integrals'),
    ],
  },
};

// ---------------------------------------------------------------------------

export const calculusChapters: Chapter[] = [
  {
    id: 'calc.ch.limits',
    title: 'Limits',
    about: 'What value a function approaches as $x$ approaches a point or infinity, and how to compute it when plugging in fails.',
    why: 'Derivatives, integrals and series are all defined as limits. Limits at infinity are also how you compare growth rates, which is exactly Big-O reasoning.',
    resources: [tb1b('limits', 'Limits, L’Hôpital’s rule, and epsilon delta definitions'), paul('CalcI/LimitsIntro.aspx', 'Limits (chapter intro)'), openstax(1, '2-2-the-limit-of-a-function', 'The Limit of a Function')],
    skills: [limits],
    deeper: [epsilonDelta],
  },
  {
    id: 'calc.ch.derivatives',
    title: 'Derivatives',
    about: 'The derivative as instantaneous rate of change, and the rules that let you differentiate anything built from elementary functions.',
    why: 'Optimisation, physics, and machine learning (gradient descent and backpropagation are the chain rule applied at scale).',
    resources: [tb1b('derivatives', 'The paradox of the derivative'), tb1b('chain-rule-and-product-rule', 'Visualizing the chain rule and product rule'), openstax(1, '3-1-defining-the-derivative', 'Defining the Derivative')],
    skills: [power, product, chain, implicit],
    deeper: [inverseDerivatives],
  },
  {
    id: 'calc.ch.applications',
    title: 'Applications of derivatives',
    about: 'Using derivatives to find maxima and minima, and to evaluate tricky limits with L’Hôpital’s rule.',
    why: 'Finding the best value of something is the most common use of calculus in practice.',
    resources: [paul('CalcI/DerivAppsIntro.aspx', 'Applications of Derivatives (chapter intro)'), openstax(1, '4-3-maxima-and-minima', 'Maxima and Minima')],
    skills: [extrema, lhopital],
    deeper: [optimization],
  },
  {
    id: 'calc.ch.integrals',
    title: 'Integrals',
    about: 'Antiderivatives, the fundamental theorem of calculus, and the main techniques: substitution, integration by parts, partial fractions.',
    why: 'Areas, totals and averages; in probability, every expected value and every density is an integral.',
    resources: [tb1b('integration', 'Integration and the fundamental theorem of calculus'), openstax(1, '5-3-the-fundamental-theorem-of-calculus', 'The Fundamental Theorem of Calculus'), paul('CalcII/IntTechIntro.aspx', 'Integration Techniques (chapter intro)')],
    skills: [antideriv, definite, usub, parts, pfrac],
    deeper: [improper, trigIntegrals],
  },
  {
    id: 'calc.ch.series',
    title: 'Series',
    about: 'Infinite sums: when they converge, how to sum them, and how to write functions as power series.',
    why: 'Taylor series are how computers evaluate $\\sin$, $e^x$ and friends, and they underpin most approximation arguments. Geometric series show up in algorithm analysis.',
    resources: [tb1b('taylor-series', 'Taylor series'), paul('CalcII/SeriesIntro.aspx', 'Series and Sequences (chapter intro)'), openstax(2, '5-2-infinite-series', 'Infinite Series')],
    skills: [series, taylor],
    deeper: [powerSums],
  },
  {
    id: 'calc.ch.multivariable',
    title: 'Multivariable calculus',
    about: 'Functions of several variables: partial derivatives, gradients, Hessians and double integrals.',
    why: 'Machine learning lives here: a loss function has thousands of variables and the gradient tells you which way to move.',
    resources: [paul('CalcIII/PartialDerivsIntro.aspx', 'Partial Derivatives (chapter intro)'), openstax(3, '4-3-partial-derivatives', 'Partial Derivatives'), { kind: 'video', title: 'Khan Academy: Multivariable calculus', url: 'https://www.khanacademy.org/math/multivariable-calculus' }],
    skills: [partial, double],
    deeper: [lagrange],
  },
];
