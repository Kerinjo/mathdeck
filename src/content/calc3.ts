// Multivariable Calculus: partial derivatives, multiple integrals, vector calculus.
import { Q } from '../core/frac';
import { coef, signed, sum, t } from '../core/fmt';
import type { Chapter, Problem, Rng, Skill } from '../core/types';
import { choice, expr, mix, num, openstax, paul } from './calc-helpers';
import { double, partial } from './calculus';
import { lagrange } from './calculus-deeper';
import { distinct } from './helpers';
import { integrate, integrate2, near } from './verify';

type Gen = (r: Rng) => Problem;

const vec = (...xs: (number | Q)[]): Problem['answer'] => ({ kind: 'matrix', expected: xs.map((x) => [Q.of(x).toString()]) });
/** k·π (optionally times a TeX factor) as a number answer. */
const piAns = (k: Q, extraExpr = '', extraTex = ''): Problem['answer'] => ({
  kind: 'number',
  expected: `(${k})*pi${extraExpr ? `*(${extraExpr})` : ''}`,
  display: `${k.eq(1) ? '' : k.isInt() ? k.n : k.tex()}\\pi${extraTex}`,
});
const pt = (...xs: number[]) => `(${xs.join(', ')})`;
/** Polynomial term list → TeX with variables, e.g. terms([[3, 'x^{2}y'], [-1, 'z']]). */
const terms = (ts: [number, string][]) => sum(ts.map(([c, b]) => t(c, b))).tex;

// ---------------------------------------------------------------------------
// Tangent planes, chain rule, implicit partials

const mvChain: Skill = {
  id: 'calc.mvchain',
  name: 'Tangent planes and the chain rule',
  prereqs: ['calc.partial'],
  levels: [
    {
      name: 'tangent planes',
      generate(r) {
        const [a, b, c, d] = [r.nz(-3, 3), r.int(-3, 3), r.nz(-3, 3), r.int(-4, 4)];
        const [x0, y0] = [r.int(-2, 2), r.int(-2, 2)];
        // f = a x² + b xy + c y² + d
        const f0 = a * x0 * x0 + b * x0 * y0 + c * y0 * y0 + d;
        const fx = 2 * a * x0 + b * y0;
        const fy = b * x0 + 2 * c * y0;
        const k = f0 - fx * x0 - fy * y0;
        const plane = sum([t(fx, 'x'), t(fy, 'y'), t(k)]);
        return {
          prompt: `Find the tangent plane to $z = ${terms([[a, 'x^{2}'], [b, 'xy'], [c, 'y^{2}'], [d, '']])}$ at $(${x0}, ${y0})$. Enter the right-hand side of $z = \\dots$`,
          answer: expr(plane.expr, `z = ${plane.tex}`, ['x', 'y']),
          solution: [
            `$f(${x0}, ${y0}) = ${f0}$, $f_x = ${terms([[2 * a, 'x'], [b, 'y']])} = ${fx}$, $f_y = ${terms([[b, 'x'], [2 * c, 'y']])} = ${fy}$ at the point.`,
            `$z = ${f0} + ${fx}(x ${signed(-x0)}) + ${fy}(y ${signed(-y0)}) = ${plane.tex}$`,
          ],
        };
      },
    },
    {
      name: 'the chain rule',
      generate(r) {
        const [p, q, rr, s] = [r.nz(-3, 3), r.int(-3, 3), r.nz(-2, 2), r.int(-3, 3)];
        const [a, b] = [r.nz(-3, 3), r.nz(-3, 3)];
        const t0 = r.int(-2, 2);
        // z = a x²y + b y², x = p t + q, y = rr t² + s
        const x = p * t0 + q;
        const y = rr * t0 * t0 + s;
        const zx = 2 * a * x * y;
        const zy = a * x * x + 2 * b * y;
        const ans = zx * p + zy * 2 * rr * t0;
        return {
          prompt: `$z = ${terms([[a, 'x^{2}y'], [b, 'y^{2}']])}$ with $x = ${terms([[p, 't'], [q, '']])}$ and $y = ${terms([[rr, 't^{2}'], [s, '']])}$. Find $\\dfrac{dz}{dt}$ at $t = ${t0}$.`,
          answer: num(new Q(ans)),
          solution: [
            `$\\dfrac{dz}{dt} = z_x\\dfrac{dx}{dt} + z_y\\dfrac{dy}{dt}$. At $t = ${t0}$: $x = ${x}$, $y = ${y}$, $x' = ${p}$, $y' = ${2 * rr * t0}$.`,
            `$z_x = ${2 * a}xy = ${zx}$, $z_y = ${terms([[a, 'x^{2}'], [2 * b, 'y']])} = ${zy}$.`,
            `$${zx}\\cdot ${p < 0 ? `(${p})` : p} + ${zy < 0 ? `(${zy})` : zy}\\cdot ${2 * rr * t0 < 0 ? `(${2 * rr * t0})` : 2 * rr * t0} = ${ans}$`,
          ],
          selfCheck: () => {
            const z = (tt: number) => {
              const X = p * tt + q;
              const Y = rr * tt * tt + s;
              return a * X * X * Y + b * Y * Y;
            };
            return near((z(t0 + 1e-5) - z(t0 - 1e-5)) / 2e-5, ans, 1e-5);
          },
        };
      },
    },
    {
      name: 'implicit partial derivatives',
      generate: mix(
        (r) => {
          let x0: number, y0: number, z0: number;
          do [x0, y0, z0] = [r.int(-3, 3), r.int(-3, 3), r.nz(-3, 3)];
          while (x0 === 0 && y0 === 0);
          const R2 = x0 * x0 + y0 * y0 + z0 * z0;
          const wantX = r.next() < 0.5;
          const ans = new Q(-(wantX ? x0 : y0), z0);
          return {
            prompt: `$z$ is defined implicitly by $x^{2} + y^{2} + z^{2} = ${R2}$ near $${pt(x0, y0, z0)}$. Find $\\dfrac{\\partial z}{\\partial ${wantX ? 'x' : 'y'}}$ there.`,
            answer: num(ans),
            solution: [`Differentiate with respect to $${wantX ? 'x' : 'y'}$: $2${wantX ? 'x' : 'y'} + 2z\\,z_${wantX ? 'x' : 'y'} = 0$.`, `$z_${wantX ? 'x' : 'y'} = -\\frac{${wantX ? 'x' : 'y'}}{z} = ${ans.tex()}$`],
          };
        },
        (r) => {
          let x0: number, y0: number, z0: number, a: number, Fz: number;
          do {
            [x0, y0, z0, a] = [r.nz(-2, 2), r.nz(-2, 2), r.nz(-2, 2), r.nz(-3, 3)];
            Fz = x0 * y0 + 3 * z0 * z0;
          } while (Fz === 0);
          // F = xyz + z³ + a x = c
          const c = x0 * y0 * z0 + z0 ** 3 + a * x0;
          const Fx = y0 * z0 + a;
          const ans = new Q(-Fx, Fz);
          return {
            prompt: `$z$ is defined implicitly by $xyz + z^{3} ${a < 0 ? '-' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}x = ${c}$ near $${pt(x0, y0, z0)}$. Find $\\dfrac{\\partial z}{\\partial x}$ there.`,
            answer: num(ans),
            solution: [`$\\dfrac{\\partial z}{\\partial x} = -\\dfrac{F_x}{F_z}$ with $F_x = yz ${signed(a)}$, $F_z = xy + 3z^2$.`, `At the point: $-\\dfrac{${Fx}}{${Fz}} = ${ans.tex()}$`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Tangent plane to $z = f(x, y)$ at $(a, b)$: $z = f(a, b) + f_x(a, b)(x - a) + f_y(a, b)(y - b)$, the two-variable linear approximation. Chain rule: if $x$ and $y$ depend on $t$, $\\frac{dz}{dt} = f_x\\frac{dx}{dt} + f_y\\frac{dy}{dt}$. For $F(x, y, z) = 0$ defining $z$ implicitly, $\\frac{\\partial z}{\\partial x} = -\\frac{F_x}{F_z}$.',
    resources: [paul('CalcIII/TangentPlanes.aspx', 'Tangent Planes and Linear Approximations'), paul('CalcIII/ChainRule.aspx', 'Chain Rule'), openstax(3, '4-5-the-chain-rule', 'The Chain Rule')],
  },
};

// ---------------------------------------------------------------------------
// Critical points

const CLASSES = ['Local minimum', 'Local maximum', 'Saddle point', 'The test is inconclusive'];

/** f = a x² + b xy + c y² + d x + e y with critical point (x0, y0). */
function quadratic(r: Rng) {
  let a: number, b: number, c: number;
  do [a, b, c] = [r.nz(-3, 3), r.int(-4, 4), r.nz(-3, 3)];
  while (4 * a * c - b * b === 0);
  const [x0, y0] = [r.int(-3, 3), r.int(-3, 3)];
  const d = -(2 * a * x0 + b * y0);
  const e = -(b * x0 + 2 * c * y0);
  return { a, b, c, d, e, x0, y0, tex: terms([[a, 'x^{2}'], [b, 'xy'], [c, 'y^{2}'], [d, 'x'], [e, 'y']]), D: 4 * a * c - b * b };
}

const mvOpt: Skill = {
  id: 'calc.mvopt',
  name: 'Critical points and the second-derivative test',
  prereqs: ['calc.partial'],
  levels: [
    {
      name: 'find the critical point',
      generate(r) {
        const f = quadratic(r);
        return {
          prompt: `Find the critical point of $f(x, y) = ${f.tex}$.`,
          answer: vec(f.x0, f.y0),
          inputHint: 'Enter (x, y) as a column.',
          solution: [`$f_x = ${terms([[2 * f.a, 'x'], [f.b, 'y'], [f.d, '']])} = 0$ and $f_y = ${terms([[f.b, 'x'], [2 * f.c, 'y'], [f.e, '']])} = 0$.`, `Solve the linear system: $(x, y) = ${pt(f.x0, f.y0)}$`],
        };
      },
    },
    {
      name: 'classify it',
      generate(r) {
        const f = quadratic(r);
        const k = f.D < 0 ? 2 : f.a > 0 ? 0 : 1;
        return {
          prompt: `$f(x, y) = ${f.tex}$ has a critical point at $${pt(f.x0, f.y0)}$. What is it?`,
          answer: choice(CLASSES, k),
          solution: [
            `$f_{xx} = ${2 * f.a}$, $f_{yy} = ${2 * f.c}$, $f_{xy} = ${f.b}$, so $D = f_{xx}f_{yy} - f_{xy}^2 = ${f.D}$.`,
            f.D < 0 ? '$D < 0$: a saddle point.' : `$D > 0$ and $f_{xx} ${f.a > 0 ? '>' : '<'} 0$: a local ${f.a > 0 ? 'minimum' : 'maximum'}.`,
          ],
        };
      },
    },
    {
      name: 'several critical points',
      generate: mix(
        (r) => {
          const k = r.int(1, 3);
          const wantSaddle = r.next() < 0.5;
          return wantSaddle
            ? {
                prompt: `$f(x, y) = x^{3} + y^{3} - ${3 * k}xy$ has two critical points. Which is the saddle point?`,
                answer: vec(0, 0),
                inputHint: 'Enter (x, y) as a column.',
                solution: [`$f_x = 3x^2 - ${3 * k}y$, $f_y = 3y^2 - ${3 * k}x$: critical points $(0, 0)$ and $(${k}, ${k})$.`, `$D = 36xy - ${9 * k * k}$: negative at $(0, 0)$ (saddle), positive at $(${k}, ${k})$ with $f_{xx} > 0$ (minimum).`],
              }
            : {
                prompt: `$f(x, y) = x^{3} + y^{3} - ${3 * k}xy$ has two critical points. Find the local minimum value of $f$.`,
                answer: num(new Q(-(k ** 3))),
                solution: [`Critical points $(0, 0)$ and $(${k}, ${k})$; $D = 36xy - ${9 * k * k}$ is positive at $(${k}, ${k})$ and $f_{xx} = ${6 * k} > 0$, so that is the minimum.`, `$f(${k}, ${k}) = ${2 * k ** 3} - ${3 * k ** 3} = ${-(k ** 3)}$`],
              };
        },
        (r) => {
          const p = r.int(1, 3);
          const q = r.nz(-3, 3);
          // f = x³ − 3p²x + q y²: critical points (±p, 0); D = 12 x q
          const saddleX = q > 0 ? -p : p;
          return {
            prompt: `$f(x, y) = x^{3} - ${3 * p * p}x ${q < 0 ? '-' : '+'} ${Math.abs(q) === 1 ? '' : Math.abs(q)}y^{2}$ has two critical points. Which one is a saddle point?`,
            answer: vec(saddleX, 0),
            inputHint: 'Enter (x, y) as a column.',
            solution: [`$f_x = 3x^2 - ${3 * p * p}$, $f_y = ${2 * q}y$: critical points $(\\pm ${p}, 0)$.`, `$D = (6x)(${2 * q}) - 0 = ${12 * q}x$: negative at $x = ${saddleX}$, so $(${saddleX}, 0)$ is the saddle.`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Critical points of $f(x, y)$ solve $f_x = 0$ and $f_y = 0$ together. Second-derivative test: $D = f_{xx}f_{yy} - f_{xy}^2$. If $D > 0$, it is a local min when $f_{xx} > 0$ and a local max when $f_{xx} < 0$; if $D < 0$ it is a saddle point; $D = 0$ is inconclusive. ($D$ is the determinant of the Hessian.)',
    resources: [paul('CalcIII/RelativeExtrema.aspx', 'Relative Minimums and Maximums'), openstax(3, '4-7-maxima-minima-problems', 'Maxima/Minima Problems')],
  },
};

// ---------------------------------------------------------------------------
// Multiple integrals

const reverseOrder: Gen = (r) => {
  const a = r.int(1, 3);
  if (r.next() < 0.5)
    return {
      prompt: `Evaluate $\\displaystyle\\int_0^{${a}}\\int_x^{${a}} e^{y^{2}}\\,dy\\,dx$.`,
      answer: num(`(exp(${a * a}) - 1)/2`, `\\frac{e^{${a * a}} - 1}{2}`),
      hint: '$e^{y^2}$ has no elementary antiderivative: swap the order of integration.',
      solution: [`The region is $0 \\le x \\le y \\le ${a}$. In the other order: $\\displaystyle\\int_0^{${a}}\\int_0^{y} e^{y^2}\\,dx\\,dy = \\int_0^{${a}} ye^{y^2}\\,dy$.`, `$= \\left[\\frac12 e^{y^2}\\right]_0^{${a}} = \\frac{e^{${a * a}} - 1}{2}$`],
      selfCheck: () => near(integrate2('exp(y^2)', 0, a, (x) => x, () => a, 300), (Math.exp(a * a) - 1) / 2, 1e-5),
    };
  return {
    prompt: `Evaluate $\\displaystyle\\int_0^{${a}}\\int_x^{${a}} \\sin(y^{2})\\,dy\\,dx$.`,
    answer: num(`(1 - cos(${a * a}))/2`, `\\frac{1 - \\cos ${a * a}}{2}`),
    hint: 'Swap the order of integration.',
    solution: [`Region $0 \\le x \\le y \\le ${a}$; swapped: $\\displaystyle\\int_0^{${a}} y\\sin(y^2)\\,dy$.`, `$= \\left[-\\frac12\\cos(y^2)\\right]_0^{${a}} = \\frac{1 - \\cos ${a * a}}{2}$`],
    selfCheck: () => near(integrate2('sin(y^2)', 0, a, (x) => x, () => a, 300), (1 - Math.cos(a * a)) / 2, 1e-5),
  };
};

const doubleDeep: Skill = {
  ...double,
  levels: [double.levels[0], double.levels[1], { name: 'general regions and swapping the order', generate: mix(double.levels[2].generate, reverseOrder) }],
};

const polar: Skill = {
  id: 'calc.polar',
  name: 'Double integrals in polar coordinates',
  prereqs: ['calc.double'],
  levels: [
    {
      name: 'disks and rings',
      generate: mix(
        (r) => {
          const a = r.int(1, 4);
          return {
            prompt: `Evaluate $\\displaystyle\\iint_D (x^{2} + y^{2})\\,dA$ where $D$ is the disk $x^{2} + y^{2} \\le ${a * a}$.`,
            answer: piAns(new Q(a ** 4, 2)),
            inputHint: 'pi works.',
            solution: [`In polar coordinates $x^2 + y^2 = r^2$ and $dA = r\\,dr\\,d\\theta$.`, `$\\displaystyle\\int_0^{2\\pi}\\int_0^{${a}} r^3\\,dr\\,d\\theta = 2\\pi\\cdot\\frac{${a ** 4}}{4} = ${new Q(a ** 4, 2).tex()}\\pi$`],
          };
        },
        (r) => {
          const a = r.int(1, 3);
          return {
            prompt: `Evaluate $\\displaystyle\\iint_D \\sqrt{x^{2} + y^{2}}\\,dA$ where $D$ is the disk of radius ${a} about the origin.`,
            answer: piAns(new Q(2 * a ** 3, 3)),
            inputHint: 'pi works.',
            solution: ['The integrand is $r$, and $dA = r\\,dr\\,d\\theta$.', `$2\\pi\\int_0^{${a}} r^2\\,dr = ${new Q(2 * a ** 3, 3).tex()}\\pi$`],
          };
        },
        (r) => {
          const [a, b] = distinct(r, 2, 1, 5).sort((x, y) => x - y);
          return {
            prompt: `Evaluate $\\displaystyle\\iint_D \\frac{1}{x^{2} + y^{2}}\\,dA$ over the ring $${a * a} \\le x^{2} + y^{2} \\le ${b * b}$.`,
            answer: piAns(new Q(2), `log(${new Q(b, a)})`, `\\ln\\frac{${b}}{${a}}`),
            inputHint: 'pi and ln work.',
            solution: ['$\\frac{1}{r^2}\\cdot r = \\frac1r$.', `$2\\pi\\int_{${a}}^{${b}}\\frac{dr}{r} = 2\\pi\\ln\\frac{${b}}{${a}}$`],
          };
        },
      ),
    },
    {
      name: 'exponentials and the Gaussian',
      generate: mix(
        (r) => {
          const a = r.int(1, 3);
          return {
            prompt: `Evaluate $\\displaystyle\\iint_D e^{-(x^{2} + y^{2})}\\,dA$ where $D$ is the disk of radius ${a} about the origin.`,
            answer: num(`pi*(1 - exp(-${a * a}))`, `\\pi\\left(1 - e^{-${a * a}}\\right)`),
            inputHint: 'pi and e^(-4) work.',
            solution: [`$\\displaystyle\\int_0^{2\\pi}\\int_0^{${a}} e^{-r^2}r\\,dr\\,d\\theta$; substitute $u = r^2$.`, `$2\\pi\\cdot\\frac12\\left(1 - e^{-${a * a}}\\right) = \\pi\\left(1 - e^{-${a * a}}\\right)$`],
            selfCheck: () => near(2 * Math.PI * integrate('x*exp(-x^2)', 0, a), Math.PI * (1 - Math.exp(-a * a))),
          };
        },
        (r) => {
          const k = r.int(1, 4);
          return {
            prompt: `Use polar coordinates on the whole plane to evaluate $\\displaystyle\\int_{-\\infty}^{\\infty} e^{-${k === 1 ? '' : k}x^{2}}\\,dx$.`,
            answer: num(`sqrt(pi/${k})`, k === 1 ? '\\sqrt{\\pi}' : `\\sqrt{\\frac{\\pi}{${k}}}`),
            inputHint: 'sqrt(pi) style.',
            solution: [
              `Call it $I$. Then $I^2 = \\iint_{\\mathbb{R}^2} e^{-${k === 1 ? '' : k}(x^2 + y^2)}\\,dA = \\int_0^{2\\pi}\\int_0^\\infty e^{-${k === 1 ? '' : k}r^2}r\\,dr\\,d\\theta = \\frac{\\pi}{${k}}$.`,
              `$I = \\sqrt{\\frac{\\pi}{${k}}}$`,
            ],
            selfCheck: () => near(2 * integrate(`exp(-${k}*x^2)`, 0, 10, 4000), Math.sqrt(Math.PI / k)),
          };
        },
        (r) => {
          const a = r.int(1, 4);
          return {
            prompt: `Evaluate $\\displaystyle\\iint_D \\frac{1}{1 + x^{2} + y^{2}}\\,dA$ where $D$ is the disk of radius ${a} about the origin.`,
            answer: num(`pi*log(${1 + a * a})`, `\\pi\\ln ${1 + a * a}`),
            inputHint: 'pi and ln work.',
            solution: [`$\\displaystyle 2\\pi\\int_0^{${a}}\\frac{r}{1 + r^2}dr$.`, `$= \\pi\\left[\\ln(1 + r^2)\\right]_0^{${a}} = \\pi\\ln ${1 + a * a}$`],
          };
        },
      ),
    },
    {
      name: 'sectors and polar curves',
      generate: mix(
        (r) => {
          const a = r.int(1, 4);
          const wantXY = r.next() < 0.5;
          const ans = wantXY ? new Q(a ** 4, 8) : new Q(a ** 3, 3);
          return {
            prompt: `Evaluate $\\displaystyle\\iint_D ${wantXY ? 'xy' : 'x'}\\,dA$ over the quarter disk $x \\ge 0$, $y \\ge 0$, $x^{2} + y^{2} \\le ${a * a}$.`,
            answer: num(ans),
            solution: [
              wantXY ? '$xy = r^2\\cos\\theta\\sin\\theta$, times $r$ from $dA$.' : '$x = r\\cos\\theta$, times $r$ from $dA$.',
              wantXY
                ? `$\\int_0^{\\pi/2}\\cos\\theta\\sin\\theta\\,d\\theta\\int_0^{${a}} r^3\\,dr = \\frac12\\cdot\\frac{${a ** 4}}{4} = ${ans.tex()}$`
                : `$\\int_0^{\\pi/2}\\cos\\theta\\,d\\theta\\int_0^{${a}} r^2\\,dr = 1\\cdot\\frac{${a ** 3}}{3} = ${ans.tex()}$`,
            ],
          };
        },
        (r) => {
          const a = r.int(1, 3);
          return {
            prompt: `Find the area enclosed by the cardioid $r = ${a === 1 ? '1 + \\cos\\theta' : `${a}(1 + \\cos\\theta)`}$.`,
            answer: piAns(new Q(3 * a * a, 2)),
            inputHint: 'pi works.',
            solution: [`Area $= \\frac12\\int_0^{2\\pi} r^2\\,d\\theta = \\frac{${a * a}}{2}\\int_0^{2\\pi}(1 + 2\\cos\\theta + \\cos^2\\theta)\\,d\\theta$.`, `$= \\frac{${a * a}}{2}(2\\pi + 0 + \\pi) = ${new Q(3 * a * a, 2).tex()}\\pi$`],
            selfCheck: () => near(integrate(`${a * a}*(1+cos(x))^2/2`, 0, 2 * Math.PI), (3 * a * a * Math.PI) / 2),
          };
        },
        (r) => {
          const n = r.pick([2, 3]);
          const a = r.int(1, 3);
          const ans = new Q(a * a, 4 * n);
          return {
            prompt: `Find the area of one petal of the rose $r = ${a === 1 ? '' : a}\\cos(${n}\\theta)$.`,
            answer: piAns(ans),
            inputHint: 'pi works.',
            solution: [`One petal runs over $-\\frac{\\pi}{${2 * n}} \\le \\theta \\le \\frac{\\pi}{${2 * n}}$.`, `$\\frac12\\int ${a * a}\\cos^2(${n}\\theta)\\,d\\theta = \\frac{${a * a}}{2}\\cdot\\frac{\\pi}{${2 * n}} = ${ans.tex()}\\pi$`],
            selfCheck: () => near(integrate(`${a * a}*cos(${n}*x)^2/2`, -Math.PI / (2 * n), Math.PI / (2 * n)), ans.value() * Math.PI),
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'For disks, rings, sectors and anything with $x^2 + y^2$, switch to polar: $x = r\\cos\\theta$, $y = r\\sin\\theta$, $x^2 + y^2 = r^2$, and $dA = r\\,dr\\,d\\theta$ (do not forget the extra $r$). The area inside a polar curve $r = f(\\theta)$ is $\\frac12\\int f(\\theta)^2\\,d\\theta$. Squaring the Gaussian integral and going polar is how $\\int e^{-x^2}dx = \\sqrt\\pi$ is proved.',
    resources: [paul('CalcIII/DIPolarCoords.aspx', 'Double Integrals in Polar Coordinates'), openstax(3, '5-3-double-integrals-in-polar-coordinates', 'Double Integrals in Polar Coordinates')],
  },
};

const triple: Skill = {
  id: 'calc.triple',
  name: 'Triple integrals',
  prereqs: ['calc.polar'],
  levels: [
    {
      name: 'boxes',
      generate(r) {
        const [a, b, c] = [r.int(1, 3), r.int(1, 3), r.int(1, 3)];
        const [p, q, s] = [r.int(0, 2), r.int(0, 2), r.int(1, 2)];
        const k = r.int(1, 4);
        const ans = new Q(k * a ** (p + 1) * b ** (q + 1) * c ** (s + 1), (p + 1) * (q + 1) * (s + 1));
        const body = `${k === 1 ? '' : k}${p ? (p === 1 ? 'x' : `x^{${p}}`) : ''}${q ? (q === 1 ? 'y' : `y^{${q}}`) : ''}${s === 1 ? 'z' : `z^{${s}}`}`;
        return {
          prompt: `Evaluate $\\displaystyle\\iiint_B ${body}\\,dV$ over the box $[0, ${a}]\\times[0, ${b}]\\times[0, ${c}]$.`,
          answer: num(ans),
          solution: ['On a box, a product of one-variable functions splits into a product of three integrals.', `$${k}\\cdot\\frac{${a}^{${p + 1}}}{${p + 1}}\\cdot\\frac{${b}^{${q + 1}}}{${q + 1}}\\cdot\\frac{${c}^{${s + 1}}}{${s + 1}} = ${ans.tex()}$`],
        };
      },
    },
    {
      name: 'tetrahedra',
      generate: mix(
        (r) => {
          const [a, b, c] = [r.int(1, 6), r.int(1, 6), r.int(1, 6)];
          const ans = new Q(a * b * c, 6);
          return {
            prompt: `Find the volume of the tetrahedron bounded by the coordinate planes and the plane $\\frac{x}{${a}} + \\frac{y}{${b}} + \\frac{z}{${c}} = 1$.`,
            answer: num(ans),
            solution: [`$\\displaystyle\\int_0^{${a}}\\int_0^{${b}(1 - x/${a})}\\int_0^{${c}(1 - x/${a} - y/${b})} dz\\,dy\\,dx$.`, `$= \\frac{${a}\\cdot ${b}\\cdot ${c}}{6} = ${ans.tex()}$ (a sixth of the box)`],
          };
        },
        (r) => {
          const a = r.int(1, 4);
          const ans = new Q(a ** 4, 24);
          return {
            prompt: `Evaluate $\\displaystyle\\iiint_T z\\,dV$ where $T$ is the tetrahedron $x, y, z \\ge 0$, $x + y + z \\le ${a}$.`,
            answer: num(ans),
            solution: [`For fixed $z$ the cross-section is a triangle of area $\\frac{(${a} - z)^2}{2}$.`, `$\\int_0^{${a}} z\\frac{(${a} - z)^2}{2}\\,dz = \\frac{${a}^4}{24} = ${ans.tex()}$`],
            selfCheck: () => near(integrate(`x*(${a}-x)^2/2`, 0, a), ans.value()),
          };
        },
      ),
    },
    {
      name: 'cylindrical and spherical',
      generate: mix(
        (r) => {
          const h = r.int(1, 5);
          return {
            prompt: `Find the volume under the paraboloid $z = ${h} - x^{2} - y^{2}$ and above the plane $z = 0$.`,
            answer: piAns(new Q(h * h, 2)),
            inputHint: 'pi works.',
            solution: [`Cylindrical: $0 \\le z \\le ${h} - r^2$ over $r \\le \\sqrt{${h}}$.`, `$\\int_0^{2\\pi}\\int_0^{\\sqrt{${h}}} (${h} - r^2)r\\,dr\\,d\\theta = 2\\pi\\cdot\\frac{${h * h}}{4} = ${new Q(h * h, 2).tex()}\\pi$`],
          };
        },
        (r) => {
          const a = r.int(1, 3);
          return {
            prompt: `Evaluate $\\displaystyle\\iiint_B (x^{2} + y^{2} + z^{2})\\,dV$ over the ball of radius ${a} centred at the origin.`,
            answer: piAns(new Q(4 * a ** 5, 5)),
            inputHint: 'pi works.',
            solution: ['Spherical: $x^2 + y^2 + z^2 = \\rho^2$ and $dV = \\rho^2\\sin\\phi\\,d\\rho\\,d\\phi\\,d\\theta$.', `$\\int_0^{2\\pi}\\int_0^{\\pi}\\int_0^{${a}}\\rho^4\\sin\\phi = 2\\pi\\cdot 2\\cdot\\frac{${a ** 5}}{5} = ${new Q(4 * a ** 5, 5).tex()}\\pi$`],
          };
        },
        (r) => {
          const a = r.int(1, 3);
          return {
            prompt: `Evaluate $\\displaystyle\\iiint_H z\\,dV$ over the upper half-ball $x^{2} + y^{2} + z^{2} \\le ${a * a}$, $z \\ge 0$.`,
            answer: piAns(new Q(a ** 4, 4)),
            inputHint: 'pi works.',
            solution: ['Spherical: $z = \\rho\\cos\\phi$, with $0 \\le \\phi \\le \\frac{\\pi}{2}$.', `$\\int_0^{2\\pi}d\\theta\\int_0^{\\pi/2}\\cos\\phi\\sin\\phi\\,d\\phi\\int_0^{${a}}\\rho^3\\,d\\rho = 2\\pi\\cdot\\frac12\\cdot\\frac{${a ** 4}}{4} = ${new Q(a ** 4, 4).tex()}\\pi$`],
          };
        },
        (r) => {
          const [R, h] = [r.int(1, 3), r.int(1, 6)];
          return {
            prompt: `Find the volume of the solid cone $\\frac{${h}}{${R}}\\sqrt{x^{2} + y^{2}} \\le z \\le ${h}$.`,
            answer: piAns(new Q(R * R * h, 3)),
            inputHint: 'pi works.',
            solution: [`Cylindrical: $\\frac{${h}}{${R}}r \\le z \\le ${h}$ for $r \\le ${R}$.`, `$2\\pi\\int_0^{${R}}\\left(${h} - \\frac{${h}}{${R}}r\\right)r\\,dr = \\frac{\\pi\\cdot ${R * R}\\cdot ${h}}{3}$ (one third of the cylinder)`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Triple integrals add up over volumes; set limits from the inside out, each depending only on variables further out. Cylindrical $(r, \\theta, z)$: $dV = r\\,dz\\,dr\\,d\\theta$, good for circular symmetry around an axis. Spherical $(\\rho, \\phi, \\theta)$: $dV = \\rho^2\\sin\\phi\\,d\\rho\\,d\\phi\\,d\\theta$, good for balls and cones about the origin.',
    resources: [paul('CalcIII/TripleIntegrals.aspx', 'Triple Integrals'), paul('CalcIII/TISphericalCoords.aspx', 'Triple Integrals in Spherical Coordinates'), openstax(3, '5-5-triple-integrals-in-cylindrical-and-spherical-coordinates', 'Triple Integrals in Cylindrical and Spherical Coordinates')],
  },
};

const jacobian: Skill = {
  id: 'calc.jacobian',
  name: 'Change of variables',
  prereqs: ['calc.triple'],
  levels: [
    {
      name: 'Jacobians',
      generate: mix(
        (r) => {
          let a: number, b: number, c: number, d: number;
          do [a, b, c, d] = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
          while (a * d - b * c === 0);
          return {
            prompt: `$x = ${terms([[a, 'u'], [b, 'v']])}$, $y = ${terms([[c, 'u'], [d, 'v']])}$. Find the Jacobian $\\dfrac{\\partial(x, y)}{\\partial(u, v)}$.`,
            answer: num(new Q(a * d - b * c)),
            solution: [`$\\begin{vmatrix} x_u & x_v \\\\ y_u & y_v \\end{vmatrix} = \\begin{vmatrix} ${a} & ${b} \\\\ ${c} & ${d} \\end{vmatrix} = ${a * d - b * c}$`, 'Areas get multiplied by its absolute value.'],
          };
        },
        () => ({
          prompt: 'For polar coordinates $x = r\\cos\\theta$, $y = r\\sin\\theta$, find the Jacobian $\\dfrac{\\partial(x, y)}{\\partial(r, \\theta)}$ as a function of $r$.',
          answer: expr('r', 'r', ['r']),
          solution: ['$\\begin{vmatrix} \\cos\\theta & -r\\sin\\theta \\\\ \\sin\\theta & r\\cos\\theta \\end{vmatrix} = r\\cos^2\\theta + r\\sin^2\\theta = r$', 'That is where $dA = r\\,dr\\,d\\theta$ comes from.'],
        }),
      ),
    },
    {
      name: 'parallelogram regions',
      generate(r) {
        const [a, b] = [r.int(1, 4), r.int(1, 4)];
        const ans = new Q(a * a * b, 4);
        return {
          prompt: `Evaluate $\\displaystyle\\iint_R (x + y)\\,dA$ where $R$ is bounded by $x + y = 0$, $x + y = ${a}$, $x - y = 0$, $x - y = ${b}$.`,
          answer: num(ans),
          hint: 'Use $u = x + y$, $v = x - y$.',
          solution: [`With $u = x + y$, $v = x - y$ the region is the rectangle $[0, ${a}]\\times[0, ${b}]$, and $\\left|\\frac{\\partial(x, y)}{\\partial(u, v)}\\right| = \\frac12$.`, `$\\int_0^{${b}}\\int_0^{${a}} u\\cdot\\frac12\\,du\\,dv = \\frac12\\cdot\\frac{${a * a}}{2}\\cdot ${b} = ${ans.tex()}$`],
        };
      },
    },
    {
      name: 'ellipses',
      generate(r) {
        const [a, b] = [r.int(1, 5), r.int(1, 5)];
        if (r.next() < 0.5)
          return {
            prompt: `Find the area of the ellipse $\\frac{x^{2}}{${a * a}} + \\frac{y^{2}}{${b * b}} \\le 1$ using $x = ${a}u$, $y = ${b}v$.`,
            answer: piAns(new Q(a * b)),
            inputHint: 'pi works.',
            solution: [`The ellipse becomes the unit disk and the Jacobian is $${a * b}$.`, `Area $= ${a * b}\\cdot\\pi$`],
          };
        return {
          prompt: `Evaluate $\\displaystyle\\iint_E x^{2}\\,dA$ over the ellipse $\\frac{x^{2}}{${a * a}} + \\frac{y^{2}}{${b * b}} \\le 1$.`,
          answer: piAns(new Q(a ** 3 * b, 4)),
          inputHint: 'pi works.',
          solution: [`$x = ${a}u$, $y = ${b}v$: $\\iint_{\\text{disk}} ${a * a}u^2\\cdot ${a * b}\\,du\\,dv$.`, `$\\iint_{\\text{unit disk}} u^2 = \\frac{\\pi}{4}$, so the answer is $${new Q(a ** 3 * b, 4).tex()}\\pi$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Substituting $x = x(u, v)$, $y = y(u, v)$ replaces $dA$ by $\\left|\\frac{\\partial(x, y)}{\\partial(u, v)}\\right|du\\,dv$, the determinant of the matrix of partial derivatives. Choose $u$, $v$ so that the region becomes a rectangle or a disk. Polar, cylindrical and spherical coordinates are special cases.',
    resources: [paul('CalcIII/ChangeOfVariables.aspx', 'Change of Variables'), openstax(3, '5-7-change-of-variables-in-multiple-integrals', 'Change of Variables in Multiple Integrals')],
  },
};

// ---------------------------------------------------------------------------
// Vector calculus

type V = 'x' | 'y' | 'z';
type D = (x: number, y: number, z: number) => number;
/** Monomials for vector field components, with their partial derivatives. */
const MONOS: { tex: string; d: Record<V, D> }[] = [
  { tex: 'x^{2}', d: { x: (x) => 2 * x, y: () => 0, z: () => 0 } },
  { tex: 'xy', d: { x: (_, y) => y, y: (x) => x, z: () => 0 } },
  { tex: 'yz', d: { x: () => 0, y: (_, __, z) => z, z: (_, y) => y } },
  { tex: 'xz', d: { x: (_, __, z) => z, y: () => 0, z: (x) => x } },
  { tex: 'y^{2}', d: { x: () => 0, y: (_, y) => 2 * y, z: () => 0 } },
  { tex: 'z^{2}', d: { x: () => 0, y: () => 0, z: (_, __, z) => 2 * z } },
  { tex: 'x', d: { x: () => 1, y: () => 0, z: () => 0 } },
  { tex: 'y', d: { x: () => 0, y: () => 1, z: () => 0 } },
  { tex: 'z', d: { x: () => 0, y: () => 0, z: () => 1 } },
];
/** A random field component in x, y, z: c1·m1 + c2·m2. */
function component(r: Rng) {
  const [i, j] = distinct(r, 2, 0, MONOS.length - 1);
  const [c1, c2] = [r.nz(-3, 3), r.nz(-3, 3)];
  return {
    tex: terms([
      [c1, MONOS[i].tex],
      [c2, MONOS[j].tex],
    ]),
    d: (v: V, x: number, y: number, z: number) => c1 * MONOS[i].d[v](x, y, z) + c2 * MONOS[j].d[v](x, y, z),
  };
}

const fields: Skill = {
  id: 'calc.fields',
  name: 'Vector fields: divergence and curl',
  prereqs: ['calc.partial'],
  levels: [
    {
      name: 'divergence',
      generate(r) {
        const [P, Qc, R] = [component(r), component(r), component(r)];
        const [x, y, z] = [r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)];
        const div = P.d('x', x, y, z) + Qc.d('y', x, y, z) + R.d('z', x, y, z);
        return {
          prompt: `Find $\\nabla\\cdot\\mathbf F$ at $${pt(x, y, z)}$ for $\\mathbf F = \\left(${P.tex},\\ ${Qc.tex},\\ ${R.tex}\\right)$.`,
          answer: num(new Q(div)),
          solution: ['$\\nabla\\cdot\\mathbf F = P_x + Q_y + R_z$.', `At the point: $${P.d('x', x, y, z)} + ${Qc.d('y', x, y, z)} + ${R.d('z', x, y, z)} = ${div}$`].map((s) => s.replace(/\+ -/g, '- ')),
        };
      },
    },
    {
      name: 'curl',
      generate(r) {
        const [P, Qc, R] = [component(r), component(r), component(r)];
        const [x, y, z] = [r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)];
        const c = [R.d('y', x, y, z) - Qc.d('z', x, y, z), P.d('z', x, y, z) - R.d('x', x, y, z), Qc.d('x', x, y, z) - P.d('y', x, y, z)];
        return {
          prompt: `Find $\\nabla\\times\\mathbf F$ at $${pt(x, y, z)}$ for $\\mathbf F = \\left(${P.tex},\\ ${Qc.tex},\\ ${R.tex}\\right)$.`,
          answer: vec(...c),
          inputHint: 'Enter the three components as a column.',
          solution: ['$\\nabla\\times\\mathbf F = (R_y - Q_z,\\ P_z - R_x,\\ Q_x - P_y)$.', `At the point: $${pt(...c)}$`],
        };
      },
    },
    {
      name: 'conservative fields',
      generate: mix(
        (r) => {
          const [a, b, c] = [r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3)];
          const cons = r.next() < 0.5;
          const k = cons ? 2 * b : 2 * b + r.nz(-2, 2);
          // F = (2a x + b' y², k x y + c) where k = 2b' for conservative (P_y = 2b y, Q_x = k y)
          return {
            prompt: `Is $\\mathbf F = \\left(${terms([[2 * a, 'x'], [b, 'y^{2}']])},\\ ${terms([[k, 'xy'], [c, '']])}\\right)$ conservative on the plane?`,
            answer: choice(['Yes', 'No'], cons ? 0 : 1),
            solution: [`On the whole plane, $\\mathbf F = (P, Q)$ is conservative exactly when $P_y = Q_x$.`, `$P_y = ${2 * b}y$, $Q_x = ${k}y$: ${cons ? 'equal, so yes' : 'different, so no'}.`],
          };
        },
        (r) => {
          const [a, b, c] = [r.nz(-3, 3), r.nz(-3, 3), r.nz(-3, 3)];
          const [x1, y1] = [r.int(-2, 2), r.int(-2, 2)];
          // f = a x² y + b y³ + c x, F = ∇f
          const f = (x: number, y: number) => a * x * x * y + b * y ** 3 + c * x;
          return {
            prompt: `$\\mathbf F = \\left(${terms([[2 * a, 'xy'], [c, '']])},\\ ${terms([[a, 'x^{2}'], [3 * b, 'y^{2}']])}\\right)$ is conservative. Find its potential $f$ with $f(0, 0) = 0$, and give $f${pt(x1, y1)}$.`,
            answer: num(new Q(f(x1, y1))),
            solution: [`Integrate $P$ in $x$: $f = ${terms([[a, 'x^{2}y'], [c, 'x']])} + g(y)$. Then $f_y = ${terms([[a, 'x^{2}']])} + g'(y)$ must equal $Q$, so $g' = ${3 * b}y^2$, $g = ${b === 1 ? '' : b === -1 ? '-' : b}y^3$.`, `$f = ${terms([[a, 'x^{2}y'], [b, 'y^{3}'], [c, 'x']])}$, so $f${pt(x1, y1)} = ${f(x1, y1)}$`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Divergence $\\nabla\\cdot\\mathbf F = P_x + Q_y + R_z$ measures outflow per unit volume (sources and sinks). Curl $\\nabla\\times\\mathbf F = (R_y - Q_z,\\ P_z - R_x,\\ Q_x - P_y)$ measures rotation. A field is conservative ($\\mathbf F = \\nabla f$) on a simply connected region exactly when its curl is zero; in 2D that is $P_y = Q_x$. Recover $f$ by integrating one component and matching the other.',
    resources: [paul('CalcIII/CurlDivergence.aspx', 'Curl and Divergence'), paul('CalcIII/ConservativeVectorField.aspx', 'Conservative Vector Fields'), openstax(3, '6-5-divergence-and-curl', 'Divergence and Curl')],
  },
};

const lineIntegrals: Skill = {
  id: 'calc.line',
  name: 'Line integrals',
  prereqs: ['calc.fields'],
  levels: [
    {
      name: 'arc length element',
      generate: mix(
        (r) => {
          const R = r.int(1, 4);
          return {
            prompt: `Evaluate $\\displaystyle\\oint_C (x^{2} + y^{2})\\,ds$ where $C$ is the circle of radius ${R} about the origin.`,
            answer: piAns(new Q(2 * R ** 3)),
            inputHint: 'pi works.',
            solution: [`On the circle $x^2 + y^2 = ${R * R}$ everywhere, so the integral is $${R * R}$ times the length $2\\pi\\cdot ${R}$.`, `$= ${2 * R ** 3}\\pi$`],
          };
        },
        (r) => {
          const [a, b] = r.pick([
            [3, 4],
            [6, 8],
            [5, 12],
            [8, 6],
            [4, 3],
          ]);
          const L = Math.hypot(a, b);
          const ans = new Q((a + b) * L, 2);
          return {
            prompt: `Evaluate $\\displaystyle\\int_C (x + y)\\,ds$ along the segment from $(0, 0)$ to $(${a}, ${b})$.`,
            answer: num(ans),
            solution: [`$\\mathbf r(t) = (${a}t, ${b}t)$, $0 \\le t \\le 1$, $ds = |\\mathbf r'|dt = ${L}\\,dt$.`, `$\\int_0^1 ${a + b}t\\cdot ${L}\\,dt = ${ans.tex()}$`],
          };
        },
      ),
    },
    {
      name: 'work along a curve',
      generate(r) {
        const [a, b] = [r.nz(-3, 3), r.nz(-3, 3)];
        const [m, n] = [r.int(1, 2), r.int(1, 3)];
        // F = (a y^m, b x^n) along r(t) = (t, t²), 0..1: ∫ a t^{2m} + b t^n · 2t dt
        const ans = new Q(a, 2 * m + 1).add(new Q(2 * b, n + 2));
        return {
          prompt: `Find $\\displaystyle\\int_C \\mathbf F\\cdot d\\mathbf r$ for $\\mathbf F = \\left(${coef(a)}${m === 1 ? 'y' : `y^{${m}}`},\\ ${coef(b)}${n === 1 ? 'x' : `x^{${n}}`}\\right)$ along $\\mathbf r(t) = (t, t^{2})$, $0 \\le t \\le 1$.`,
          answer: num(ans),
          solution: [`$\\mathbf F(\\mathbf r(t))\\cdot\\mathbf r'(t) = (${coef(a)}t^{${2 * m}},\\ ${coef(b)}t^{${n}})\\cdot(1, 2t) = ${terms([[a, `t^{${2 * m}}`], [2 * b, `t^{${n + 1}}`]])}$.`, `$\\int_0^1 = \\frac{${a}}{${2 * m + 1}} + \\frac{${2 * b}}{${n + 2}} = ${ans.tex()}$`],
          selfCheck: () => near(integrate(`${a}*x^${2 * m} + ${2 * b}*x^${n + 1}`, 0, 1), ans.value()),
        };
      },
    },
    {
      name: 'the gradient theorem',
      generate(r) {
        const [a, b, c] = [r.nz(-3, 3), r.nz(-3, 3), r.int(-3, 3)];
        const f = (x: number, y: number) => a * x * x * y + b * x * y * y + c * y;
        const [A, B] = [
          [r.int(-2, 2), r.int(-2, 2)],
          [r.int(-2, 3), r.int(-2, 3)],
        ];
        const ans = f(B[0], B[1]) - f(A[0], A[1]);
        return {
          prompt: `$\\mathbf F = \\nabla f$ with $f(x, y) = ${terms([[a, 'x^{2}y'], [b, 'xy^{2}'], [c, 'y']])}$. Find $\\displaystyle\\int_C \\mathbf F\\cdot d\\mathbf r$ along any path from $${pt(A[0], A[1])}$ to $${pt(B[0], B[1])}$.`,
          answer: num(new Q(ans)),
          solution: ['For a gradient field the line integral depends only on the endpoints: $f(\\text{end}) - f(\\text{start})$.', `$${f(B[0], B[1])} - ${f(A[0], A[1]) < 0 ? `(${f(A[0], A[1])})` : f(A[0], A[1])} = ${ans}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Parametrise the curve as $\\mathbf r(t)$. Scalar line integral: $\\int_C f\\,ds = \\int f(\\mathbf r(t))|\\mathbf r\'(t)|\\,dt$. Work: $\\int_C \\mathbf F\\cdot d\\mathbf r = \\int \\mathbf F(\\mathbf r(t))\\cdot\\mathbf r\'(t)\\,dt$. Gradient theorem: if $\\mathbf F = \\nabla f$ the work is $f(\\text{end}) - f(\\text{start})$ for every path, and zero around closed loops.',
    resources: [paul('CalcIII/LineIntegralsIntro.aspx', 'Line Integrals (chapter intro)'), paul('CalcIII/FundThmLineIntegrals.aspx', 'Fundamental Theorem for Line Integrals'), openstax(3, '6-2-line-integrals', 'Line Integrals')],
  },
};

const greenGauss: Skill = {
  id: 'calc.green',
  name: 'Green’s and the divergence theorem',
  prereqs: ['calc.line'],
  levels: [
    {
      name: 'circulation with Green’s theorem',
      generate(r) {
        const [a, b] = [r.int(1, 3), r.int(1, 3)];
        const [p, q, s] = [r.nz(-3, 3), r.nz(-3, 3), r.int(-3, 3)];
        // F = (p y² + s x, q x²): Q_x − P_y = 2q x − 2p y
        const ans = new Q(q * a * a * b - p * a * b * b);
        return {
          prompt: `Find $\\displaystyle\\oint_C \\mathbf F\\cdot d\\mathbf r$ counterclockwise around the rectangle $[0, ${a}]\\times[0, ${b}]$, for $\\mathbf F = \\left(${terms([[p, 'y^{2}'], [s, 'x']])},\\ ${coef(q)}x^{2}\\right)$.`,
          answer: num(ans),
          hint: 'Four sides is a lot of work: use Green’s theorem.',
          solution: [`Green: $\\oint P\\,dx + Q\\,dy = \\iint (Q_x - P_y)\\,dA$, here $Q_x - P_y = ${terms([[2 * q, 'x'], [-2 * p, 'y']])}$.`, `$\\int_0^{${b}}\\int_0^{${a}} (${terms([[2 * q, 'x'], [-2 * p, 'y']])})\\,dx\\,dy = ${q * a * a * b} ${signed(-p * a * b * b)} = ${ans.tex()}$`],
          selfCheck: () => near(integrate2(`${2 * q}*x - ${2 * p}*y`, 0, a, () => 0, () => b), ans.value(), 1e-6),
        };
      },
    },
    {
      name: 'area from a boundary',
      generate: mix(
        (r) => {
          const [a, b] = [r.int(1, 5), r.int(1, 5)];
          return {
            prompt: `Use $A = \\frac12\\oint_C (x\\,dy - y\\,dx)$ to find the area inside $x = ${a}\\cos t$, $y = ${b}\\sin t$, $0 \\le t \\le 2\\pi$.`,
            answer: piAns(new Q(a * b)),
            inputHint: 'pi works.',
            solution: [`$x\\,dy - y\\,dx = (${a * b}\\cos^2 t + ${a * b}\\sin^2 t)\\,dt = ${a * b}\\,dt$.`, `$A = \\frac12\\cdot ${a * b}\\cdot 2\\pi = ${a * b === 1 ? '' : a * b}\\pi$`],
          };
        },
        (r) => {
          const P = [
            [0, 0],
            [r.int(2, 5), r.int(-1, 1)],
            [r.int(1, 4), r.int(2, 5)],
          ];
          const twice = P.reduce((s, [x, y], i) => s + x * P[(i + 1) % 3][1] - P[(i + 1) % 3][0] * y, 0);
          const ans = new Q(Math.abs(twice), 2);
          return {
            prompt: `Use Green’s theorem (the shoelace formula) to find the area of the triangle with vertices ${P.map(([x, y]) => `$${pt(x, y)}$`).join(', ')}.`,
            answer: num(ans),
            solution: ['Going around the boundary, $\\frac12\\oint(x\\,dy - y\\,dx) = \\frac12\\sum (x_iy_{i+1} - x_{i+1}y_i)$.', `$\\frac12|${twice}| = ${ans.tex()}$`],
          };
        },
      ),
    },
    {
      name: 'flux with the divergence theorem',
      generate: mix(
        (r) => {
          const a = r.int(1, 3);
          return {
            prompt: `Find the outward flux of $\\mathbf F = (x, y, z)$ through the sphere of radius ${a} about the origin.`,
            answer: piAns(new Q(4 * a ** 3)),
            inputHint: 'pi works.',
            solution: ['Divergence theorem: flux $= \\iiint \\nabla\\cdot\\mathbf F\\,dV$, and $\\nabla\\cdot\\mathbf F = 3$.', `$3\\cdot\\frac43\\pi\\cdot ${a ** 3} = ${4 * a ** 3}\\pi$`],
          };
        },
        (r) => {
          const a = r.int(1, 3);
          return {
            prompt: `Find the outward flux of $\\mathbf F = (x^{2}, y^{2}, z^{2})$ through the surface of the cube $[0, ${a}]^{3}$.`,
            answer: num(new Q(3 * a ** 4)),
            solution: ['$\\nabla\\cdot\\mathbf F = 2x + 2y + 2z$.', `$\\iiint_{[0,${a}]^3} 2(x + y + z)\\,dV = 3\\cdot 2\\cdot\\frac{${a * a}}{2}\\cdot ${a * a} = ${3 * a ** 4}$`],
          };
        },
        (r) => {
          const [p, q, s] = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
          const [a, b, c] = [r.int(1, 3), r.int(1, 3), r.int(1, 3)];
          const div = p + q + s;
          return {
            prompt: `Find the outward flux of $\\mathbf F = (${terms([[p, 'x'], [1, 'y^{2}']])},\\ ${terms([[q, 'y'], [1, 'z']])},\\ ${terms([[s, 'z'], [1, 'x^{2}']])})$ through the surface of the box $[0, ${a}]\\times[0, ${b}]\\times[0, ${c}]$.`,
            answer: num(new Q(div * a * b * c)),
            solution: [`$\\nabla\\cdot\\mathbf F = ${p} + ${q} + ${s} = ${div}$ (the other terms do not depend on the variable being differentiated).`, `Flux $= ${div}\\cdot\\text{volume} = ${div}\\cdot ${a * b * c} = ${div * a * b * c}$`].map((x) => x.replace(/\+ -/g, '- ')),
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Green’s theorem: for a region $D$ with counterclockwise boundary $C$, $\\oint_C P\\,dx + Q\\,dy = \\iint_D (Q_x - P_y)\\,dA$. With $\\mathbf F = \\frac12(-y, x)$ the right side is the area. Divergence theorem: the outward flux of $\\mathbf F$ through a closed surface equals $\\iiint \\nabla\\cdot\\mathbf F\\,dV$ over the enclosed solid. Both trade a boundary computation for an interior one, whichever is easier.',
    resources: [paul('CalcIII/GreensTheorem.aspx', "Green's Theorem"), paul('CalcIII/DivergenceTheorem.aspx', 'Divergence Theorem'), openstax(3, '6-4-greens-theorem', "Green's Theorem")],
  },
};

// ---------------------------------------------------------------------------

export const multivariableChapters: Chapter[] = [
  {
    id: 'calc.ch.multivariable',
    title: 'Partial derivatives',
    about: 'Functions of several variables: partial derivatives, gradients and Hessians, tangent planes and the chain rule, critical points, directional derivatives and constrained optimisation.',
    why: 'Machine learning lives here: a loss function has thousands of variables and the gradient tells you which way to move.',
    resources: [paul('CalcIII/PartialDerivsIntro.aspx', 'Partial Derivatives (chapter intro)'), openstax(3, '4-3-partial-derivatives', 'Partial Derivatives'), { kind: 'video', title: 'Khan Academy: Multivariable calculus', url: 'https://www.khanacademy.org/math/multivariable-calculus' }],
    skills: [partial, mvChain, mvOpt, lagrange],
    deeper: [],
  },
  {
    id: 'calc.ch.multiple',
    title: 'Multiple integrals',
    about: 'Double integrals over general regions, polar coordinates, triple integrals in cylindrical and spherical coordinates.',
    why: 'Masses, probabilities of joint events, volumes and averages over regions are all multiple integrals.',
    resources: [paul('CalcIII/MultipleIntegralsIntro.aspx', 'Multiple Integrals (chapter intro)'), openstax(3, '5-1-double-integrals-over-rectangular-regions', 'Double Integrals over Rectangular Regions')],
    skills: [doubleDeep, polar, triple],
    deeper: [jacobian],
  },
  {
    id: 'calc.ch.vector',
    title: 'Vector calculus',
    about: 'Vector fields, divergence and curl, line integrals, conservative fields, and the theorems of Green and Gauss.',
    why: 'The language of fluid flow and electromagnetism: Maxwell’s equations are statements about divergence and curl.',
    resources: [paul('CalcIII/LineIntegralsIntro.aspx', 'Line Integrals (chapter intro)'), openstax(3, '6-1-vector-fields', 'Vector Fields'), { kind: 'video', title: 'Khan Academy: Divergence and curl', url: 'https://www.khanacademy.org/math/multivariable-calculus/multivariable-derivatives/divergence-and-curl-articles/a/divergence' }],
    skills: [fields, lineIntegrals, greenGauss],
    deeper: [],
  },
];
