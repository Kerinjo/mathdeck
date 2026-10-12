// Optional "going deeper" sections for Probability & Statistics.
import { Q } from '../core/frac';
import type { Rng, Skill } from '../core/types';
import { fact } from './helpers';
import { C, composition, dec, decStr, grinstead, num, openIntro, phi4, phiTex, qPow, range, wiki, yesNo } from './prob-helpers';

const matTex = (m: Q[][], labels: string[]) =>
  `$$\\begin{array}{c|${'c'.repeat(labels.length)}} & ${labels.map((l) => `\\text{to ${l}}`).join(' & ')} \\\\ \\hline ${m
    .map((row, i) => `\\text{from ${labels[i]}} & ${row.map((x) => x.tex()).join(' & ')}`)
    .join(' \\\\ ')} \\end{array}$$`;

export const markovChains: Skill = {
  id: 'prob.markov',
  name: 'Markov chains',
  prereqs: ['prob.bayes'],
  levels: [
    {
      name: 'two steps',
      generate(r) {
        const labels = r.pick([
          ['sunny', 'rainy'],
          ['online', 'offline'],
          ['A', 'B'],
        ]);
        let a: number, b: number;
        // a + b = 10 would make both rows equal: the start wouldn't matter.
        do [a, b] = [r.int(1, 9), r.int(1, 9)];
        while (a + b === 10);
        const P = [
          [new Q(10 - a, 10), new Q(a, 10)],
          [new Q(b, 10), new Q(10 - b, 10)],
        ];
        const i = r.int(0, 1);
        const j = r.int(0, 1);
        const v = P[i][0].mul(P[0][j]).add(P[i][1].mul(P[1][j]));
        return {
          prompt: `A two-state Markov chain has these transition probabilities: ${matTex(P, labels)} It starts in state ${labels[i]}. What is the probability it is in state ${labels[j]} after two steps?`,
          answer: num(v),
          solution: [
            'Split on the state after one step:',
            `$${P[i][0].tex()} \\cdot ${P[0][j].tex()} + ${P[i][1].tex()} \\cdot ${P[1][j].tex()} = ${v.tex()}$`,
            'This is the entry of the squared transition matrix.',
          ],
        };
      },
    },
    {
      name: 'stationary distribution',
      generate(r) {
        const labels = r.pick([
          ['sunny', 'rainy'],
          ['working', 'broken'],
          ['A', 'B'],
        ]);
        const a = r.int(1, 9);
        const b = r.int(1, 9);
        const P = [
          [new Q(10 - a, 10), new Q(a, 10)],
          [new Q(b, 10), new Q(10 - b, 10)],
        ];
        const i = r.int(0, 1);
        const pi = [new Q(b, a + b), new Q(a, a + b)];
        return {
          prompt: `A Markov chain has these transition probabilities: ${matTex(P, labels)} In the long run, what fraction of the time is it in state ${labels[i]}?`,
          answer: num(pi[i]),
          solution: [
            `In the stationary distribution, the flow out of "${labels[0]}" equals the flow in: $\\pi_1 \\cdot ${P[0][1].tex()} = \\pi_2 \\cdot ${P[1][0].tex()}$.`,
            `With $\\pi_1 + \\pi_2 = 1$: $\\pi_1 = \\frac{${b}}{${a} + ${b}} = ${pi[0].tex()}$, $\\pi_2 = ${pi[1].tex()}$.`,
          ],
          selfCheck: () => pi[0].mul(P[0][0]).add(pi[1].mul(P[1][0])).eq(pi[0]),
        };
      },
    },
    {
      name: 'three states',
      generate(r) {
        const labels = ['A', 'B', 'C'];
        const P = labels.map(() => {
          // Rows in tenths: three non-negative parts of 10.
          const parts = composition(r, 13, 3).map((x) => x - 1);
          return parts.map((x) => new Q(x, 10));
        });
        const i = r.int(0, 2);
        const j = r.int(0, 2);
        const terms = range(0, 2).map((k) => P[i][k].mul(P[k][j]));
        const v = terms.reduce((s, x) => s.add(x), new Q(0));
        return {
          prompt: `A Markov chain has these transition probabilities: ${matTex(P, labels)} It starts in ${labels[i]}. What is the probability it is in ${labels[j]} after two steps?`,
          answer: num(v),
          solution: [`Sum over the middle state: $${range(0, 2).map((k) => `${P[i][k].tex()} \\cdot ${P[k][j].tex()}`).join(' + ')} = ${v.tex()}$`],
          selfCheck: () => P.every((row) => row.reduce((s, x) => s.add(x), new Q(0)).eq(1) && row.every((x) => x.n >= 0)),
        };
      },
    },
  ],
  learn: {
    summary:
      'A Markov chain moves between states, and the next state depends only on the current one, through a transition matrix $P$ whose rows sum to 1. The $n$-step probabilities are the entries of $P^n$. Many chains settle into a stationary distribution $\\pi$ with $\\pi P = \\pi$: the long-run fraction of time in each state. For two states with switching probabilities $a$ and $b$, $\\pi = \\left(\\frac{b}{a+b}, \\frac{a}{a+b}\\right)$.',
    resources: [wiki('Markov_chain', 'Markov chain'), { kind: 'interactive', title: 'Setosa: Markov chains, explained visually', url: 'https://setosa.io/ev/markov-chains/' }, grinstead],
  },
};

const harmonic = (n: number) => range(1, n).reduce((s, k) => s.add(new Q(1, k)), new Q(0));

export const indicators: Skill = {
  id: 'prob.indicator',
  name: 'Linearity of expectation',
  prereqs: ['prob.ev'],
  levels: [
    {
      name: 'pairs and patterns',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const n = r.int(5, 30);
          const pat = r.pick(['HH', 'HT', 'HHH', 'HTH']);
          const v = new Q(n - pat.length + 1, 2 ** pat.length);
          return {
            prompt: `A fair coin is flipped ${n} times. What is the expected number of times the pattern ${pat} appears in consecutive flips (overlaps count)?`,
            answer: num(v),
            hint: 'Use one indicator per starting position.',
            solution: [
              `There are $${n - pat.length + 1}$ starting positions, and each spells ${pat} with probability $\\frac{1}{${2 ** pat.length}}$.`,
              `Linearity of expectation (overlaps don't matter): $\\frac{${n - pat.length + 1}}{${2 ** pat.length}}${v.d !== 2 ** pat.length ? ` = ${v.tex()}` : ''}$`,
            ],
          };
        }
        if (kind === 1) {
          const k = r.int(5, 30);
          const v = new Q(C(k, 2), 365);
          return {
            prompt: `${k} people are in a room, with independent and uniformly random birthdays (365 days). What is the expected number of pairs of people who share a birthday?`,
            answer: num(v),
            solution: [`One indicator per pair: $\\binom{${k}}{2} = ${C(k, 2)}$ pairs, each matching with probability $\\frac{1}{365}$.`, `$E = \\frac{${C(k, 2)}}{365}${v.d !== 365 ? ` = ${v.tex()}` : ''}$`],
          };
        }
        const n = r.int(4, 20);
        return {
          prompt: `The numbers $1, \\dots, ${n}$ are shuffled into a random order. What is the expected number of positions $i$ where the number in position $i$ is larger than the one in position $i + 1$?`,
          answer: num(new Q(n - 1, 2)),
          solution: [`Each of the $${n - 1}$ adjacent pairs is in decreasing order with probability $\\frac{1}{2}$, by symmetry.`, `$E = \\frac{${n - 1}}{2}$`],
        };
      },
    },
    {
      name: 'counting what shows up',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const n = r.int(2, 6);
          const v = new Q(6).mul(new Q(1).sub(qPow(new Q(5, 6), n)));
          return {
            prompt: `${n} fair dice are rolled. What is the expected number of different faces that appear?`,
            answer: num(v, `6\\left(1 - \\left(\\tfrac{5}{6}\\right)^{${n}}\\right) = ${v.tex()}`),
            inputHint: 'An expression is fine.',
            solution: [`One indicator per face: face $f$ appears unless all ${n} dice miss it, so with probability $1 - \\left(\\frac{5}{6}\\right)^{${n}}$.`, `$E = 6\\left(1 - \\left(\\frac{5}{6}\\right)^{${n}}\\right) = ${v.tex()}$`],
          };
        }
        if (kind === 1) {
          const n = r.int(4, 10);
          const m = r.int(3, 6);
          const v = new Q(m).mul(qPow(new Q(m - 1, m), n));
          return {
            prompt: `${n} balls are thrown independently into ${m} boxes, each box equally likely. What is the expected number of empty boxes?`,
            answer: num(v),
            inputHint: 'An expression is fine.',
            solution: [`A given box stays empty with probability $\\left(\\frac{${m - 1}}{${m}}\\right)^{${n}}$.`, `$E = ${m}\\left(\\frac{${m - 1}}{${m}}\\right)^{${n}} = ${v.tex()}$`],
          };
        }
        const n = r.int(4, 8);
        const p = r.pick([new Q(1, 2), new Q(1, 3), new Q(1, 4)]);
        const v = qPow(p, 3).mul(C(n, 3));
        return {
          prompt: `A random graph on ${n} vertices includes each possible edge independently with probability $${p.tex()}$. What is the expected number of triangles?`,
          answer: num(v),
          solution: [`Each of the $\\binom{${n}}{3} = ${C(n, 3)}$ vertex triples forms a triangle when all 3 of its edges are present: probability $\\left(${p.tex()}\\right)^3$.`, `$E = ${C(n, 3)} \\cdot ${qPow(p, 3).tex()} = ${v.tex()}$`],
        };
      },
    },
    {
      name: 'coupon collector',
      generate(r) {
        if (r.next() < 0.5) {
          const n = r.int(2, 8);
          const v = harmonic(n).mul(n);
          return {
            prompt: `A cereal box contains one of ${n} toys, each equally likely. What is the expected number of boxes you buy to collect all ${n}?`,
            answer: num(v),
            hint: 'Split the wait into stages: after you have $i$ toys, how long until a new one?',
            solution: [
              `With $i$ toys collected, a new one turns up with probability $\\frac{${n} - i}{${n}}$, so that stage takes $\\frac{${n}}{${n} - i}$ boxes on average (geometric).`,
              `$E = ${range(0, n - 1).map((i) => `\\frac{${n}}{${n - i}}`).join(' + ')} = ${n}H_{${n}} = ${v.tex()}$`,
            ],
          };
        }
        const n = r.int(6, 12);
        const k = r.int(2, Math.min(5, n - 1));
        const v = range(0, k - 1).reduce((s, i) => s.add(new Q(n, n - i)), new Q(0));
        return {
          prompt: `You draw uniformly random numbers from 1 to ${n} (with replacement). What is the expected number of draws until you have seen ${k} different numbers?`,
          answer: num(v),
          solution: [`After seeing $i$ different numbers, a new one comes with probability $\\frac{${n} - i}{${n}}$, so the wait averages $\\frac{${n}}{${n} - i}$ draws.`, `$E = ${range(0, k - 1).map((i) => `\\frac{${n}}{${n - i}}`).join(' + ')} = ${v.tex()}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      '$E[X_1 + \\dots + X_n] = E[X_1] + \\dots + E[X_n]$ always, even when the $X_i$ depend on each other. Write the count you care about as a sum of indicators ($1$ if a thing happens, $0$ otherwise); each has expectation equal to its probability. Waiting for all $n$ coupons splits into geometric stages, giving $nH_n = n(1 + \\frac12 + \\dots + \\frac1n)$.',
    resources: [wiki('Expected_value#Properties', 'Expected value: linearity'), wiki('Coupon_collector%27s_problem', "Coupon collector's problem"), grinstead],
  },
};

const pois = (lam: Q, k: number) => ({
  expr: `e^(-(${lam}))*(${lam})^${k}/${fact(k)}`,
  tex:
    k === 0
      ? `e^{-${lam.tex()}}`
      : k === 1
        ? `${lam.tex()}e^{-${lam.tex()}}`
        : `e^{-${lam.tex()}}\\frac{${lam.isInt() ? lam.tex() : `\\left(${lam.tex()}\\right)`}^{${k}}}{${k}!}`,
  v: Math.exp(-lam.value()) * lam.value() ** k / fact(k),
});

export const poisson: Skill = {
  id: 'prob.poisson',
  name: 'The Poisson distribution',
  prereqs: ['prob.binom'],
  levels: [
    {
      name: 'one value',
      generate(r) {
        const lam = new Q(r.int(1, 6));
        const k = r.int(0, 5);
        const p = pois(lam, k);
        return {
          prompt: `A shop gets on average ${lam.tex()} customers per hour, modelled as Poisson. What is the probability of exactly ${k} customer${k === 1 ? '' : 's'} in an hour?`,
          answer: { kind: 'number', expected: p.expr, display: p.tex },
          inputHint: 'Like e^(-3)*3^2/2.',
          solution: [`$P(X = k) = e^{-\\lambda}\\frac{\\lambda^k}{k!}$ with $\\lambda = ${lam.tex()}$:`, `$${p.tex} \\approx ${p.v.toFixed(4)}$`],
        };
      },
    },
    {
      name: 'at least, at most',
      generate(r) {
        const lam = new Q(r.int(1, 5));
        const m = r.int(1, 2);
        const terms = range(0, m).map((k) => pois(lam, k));
        const atMost = terms.map((t) => t.expr).join(' + ');
        const below = terms.reduce((s, t) => s + t.v, 0);
        if (r.next() < 0.5)
          return {
            prompt: `$X \\sim \\text{Poisson}(${lam.tex()})$. Find $P(X \\le ${m})$.`,
            answer: { kind: 'number', expected: atMost, display: terms.map((t) => t.tex).join(' + ') },
            inputHint: 'An expression with e^(...) is fine.',
            solution: [`$${terms.map((t) => t.tex).join(' + ')} \\approx ${below.toFixed(4)}$`],
          };
        return {
          prompt: `$X \\sim \\text{Poisson}(${lam.tex()})$. Find $P(X > ${m})$.`,
          answer: { kind: 'number', expected: `1 - (${atMost})`, display: `1 - \\left(${terms.map((t) => t.tex).join(' + ')}\\right)` },
          inputHint: 'An expression with e^(...) is fine.',
          solution: [`Complement: $1 - P(X \\le ${m}) = 1 - \\left(${terms.map((t) => t.tex).join(' + ')}\\right) \\approx ${(1 - below).toFixed(4)}$`],
        };
      },
    },
    {
      name: 'rates and rare events',
      generate(r) {
        if (r.next() < 0.5) {
          const rate = r.int(2, 12);
          const mins = r.pick([10, 15, 20, 30, 40, 45, 90]);
          const lam = new Q(rate * mins, 60);
          const p = pois(lam, 0);
          return {
            prompt: `Emails arrive as a Poisson process at ${rate} per hour. What is the probability that none arrive in ${mins} minutes?`,
            answer: { kind: 'number', expected: p.expr, display: p.tex },
            inputHint: 'Like e^(-3/2).',
            solution: [`Scale the rate to the window: $\\lambda = ${rate} \\cdot \\frac{${mins}}{60} = ${lam.tex()}$.`, `$P(X = 0) = ${p.tex} \\approx ${p.v.toFixed(4)}$`],
          };
        }
        const n = r.pick([500, 1000, 2000, 5000]);
        const lam = new Q(r.int(1, 4));
        const pBad = lam.div(n);
        const k = r.int(0, 3);
        const p = pois(lam, k);
        return {
          prompt: `A batch of ${n} chips each has a $${pBad.tex()}$ chance of being faulty, independently. Using the Poisson approximation, what is the probability of exactly ${k} faulty chip${k === 1 ? '' : 's'}?`,
          answer: { kind: 'number', expected: p.expr, display: p.tex },
          inputHint: 'Like e^(-2)*2^3/6.',
          solution: [`Many trials, tiny probability: $\\text{Bin}(${n}, ${pBad.tex()}) \\approx \\text{Poisson}(\\lambda)$ with $\\lambda = np = ${lam.tex()}$.`, `$P(X = ${k}) \\approx ${p.tex} \\approx ${p.v.toFixed(4)}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Poisson($\\lambda$) counts events that happen independently at a constant average rate: $P(X = k) = e^{-\\lambda}\\frac{\\lambda^k}{k!}$, with mean and variance both $\\lambda$. Scale $\\lambda$ to the length of the window. It also approximates $\\text{Bin}(n, p)$ when $n$ is large and $p$ small, with $\\lambda = np$.',
    resources: [wiki('Poisson_distribution', 'Poisson distribution'), grinstead],
  },
};

export const chebyshev: Skill = {
  id: 'prob.bounds',
  name: 'Markov and Chebyshev bounds',
  prereqs: ['prob.normal'],
  levels: [
    {
      name: "Markov's inequality",
      generate(r) {
        const m = r.int(2, 30);
        const a = r.int(m + 1, 5 * m);
        const ctx = r.pick([
          `The number of visitors to a site per day is never negative and averages ${m}.`,
          `A non-negative random variable $X$ has $E[X] = ${m}$.`,
        ]);
        return {
          prompt: `${ctx} What upper bound does Markov's inequality give on the probability of at least ${a}?`,
          answer: num(new Q(m, a)),
          solution: [`$P(X \\ge a) \\le \\frac{E[X]}{a} = \\frac{${m}}{${a}}${new Q(m, a).d !== a ? ` = ${new Q(m, a).tex()}` : ''}$`],
        };
      },
    },
    {
      name: "Chebyshev's inequality",
      generate(r) {
        const mu = r.int(10, 100);
        const sd = r.int(2, 10);
        const c = r.int(sd + 1, 4 * sd);
        const b = new Q(sd * sd, c * c);
        if (r.next() < 0.5)
          return {
            prompt: `$X$ has mean ${mu} and standard deviation ${sd}. Use Chebyshev's inequality to bound $P(|X - ${mu}| \\ge ${c})$ from above.`,
            answer: num(b),
            solution: [`$P(|X - \\mu| \\ge c) \\le \\frac{\\sigma^2}{c^2} = \\frac{${sd * sd}}{${c * c}}${b.d !== c * c ? ` = ${b.tex()}` : ''}$`],
          };
        const lo = new Q(1).sub(b);
        return {
          prompt: `$X$ has mean ${mu} and standard deviation ${sd}. What lower bound does Chebyshev's inequality give for $P(${mu - c} < X < ${mu + c})$?`,
          answer: num(lo),
          solution: [`The interval is $\\mu \\pm ${c}$. Outside it has probability at most $\\frac{${sd * sd}}{${c * c}}$.`, `$P \\ge 1 - \\frac{${sd * sd}}{${c * c}} = ${lo.tex()}$`],
        };
      },
    },
    {
      name: 'how many samples?',
      generate(r) {
        const sd = r.int(1, 10);
        const eps = r.pick([new Q(1, 2), new Q(1), new Q(2)]);
        const delta = r.pick([new Q(1, 10), new Q(1, 20), new Q(1, 100)]);
        // n ≥ σ² / (ε² δ)
        const bound = new Q(sd * sd).div(eps.mul(eps).mul(delta));
        const n = Math.ceil(bound.n / bound.d);
        return {
          prompt: `Samples have standard deviation ${sd}. Using Chebyshev's inequality, how many samples guarantee that the sample mean is within $${eps.tex()}$ of the true mean with probability at least $${new Q(1).sub(delta).tex()}$?`,
          answer: { kind: 'number', expected: `${n}`, integer: true },
          solution: [
            `$\\operatorname{Var}(\\bar X) = \\frac{\\sigma^2}{n}$, so Chebyshev gives $P(|\\bar X - \\mu| \\ge \\varepsilon) \\le \\frac{\\sigma^2}{n\\varepsilon^2}$.`,
            `Need $\\frac{${sd * sd}}{n \\cdot ${eps.mul(eps).tex()}} \\le ${delta.tex()}$, so $n \\ge ${bound.tex()}$: $n = ${n}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      "Markov: for $X \\ge 0$, $P(X \\ge a) \\le \\frac{E[X]}{a}$. Chebyshev: $P(|X - \\mu| \\ge c) \\le \\frac{\\sigma^2}{c^2}$. They hold for every distribution, which makes them loose but always safe. Applied to a sample mean (variance $\\sigma^2/n$), Chebyshev proves the weak law of large numbers.",
    resources: [wiki('Chebyshev%27s_inequality', "Chebyshev's inequality"), wiki('Markov%27s_inequality', "Markov's inequality"), grinstead],
  },
};

const SQUARES = [16, 25, 36, 49, 64, 100];

/** A z-test setup where z = k/10 exactly. */
function zTest(r: Rng) {
  const n = r.pick(SQUARES);
  const rt = Math.sqrt(n);
  const se = r.int(1, 4);
  const sd = se * rt;
  const mu0 = r.int(10, 60) * 5;
  const k = r.nz(-30, 30);
  const xbar = decStr(mu0 * 10 + k * se, 10);
  return { n, rt, se, sd, mu0, k, xbar };
}

export const hypothesisTests: Skill = {
  id: 'prob.hyp',
  name: 'Hypothesis tests',
  prereqs: ['prob.ci'],
  levels: [
    {
      name: 'test statistic',
      generate(r) {
        const { n, rt, se, sd, mu0, k, xbar } = zTest(r);
        return {
          prompt: `$H_0: \\mu = ${mu0}$. A sample of ${n} has mean ${xbar}, and $\\sigma = ${sd}$ is known. Compute the z statistic.`,
          answer: dec(k, 10),
          solution: [`Standard error $\\frac{${sd}}{\\sqrt{${n}}} = \\frac{${sd}}{${rt}} = ${se}$.`, `$z = \\frac{${xbar} - ${mu0}}{${se}} = ${k / 10}$`],
        };
      },
    },
    {
      name: 'reject or not?',
      generate(r) {
        const { n, sd, mu0, k, xbar } = zTest(r);
        const z = k / 10;
        const two = r.next() < 0.5;
        const reject = two ? Math.abs(z) > 1.96 : z > 1.645;
        return {
          prompt: `$H_0: \\mu = ${mu0}$ against $H_1: \\mu ${two ? '\\ne' : '>'} ${mu0}$ at the 5% level. A sample of ${n} has mean ${xbar}, and $\\sigma = ${sd}$. Reject $H_0$? (${two ? '$\\Phi(1.96) = 0.975$' : '$\\Phi(1.645) = 0.95$'})`,
          answer: yesNo(reject),
          solution: [
            `$z = \\frac{${xbar} - ${mu0}}{${sd}/\\sqrt{${n}}} = ${z}$.`,
            two
              ? `Two-sided at 5%: reject when $|z| > 1.96$. ${reject ? 'It is, so reject.' : 'It is not, so do not reject.'}`
              : `One-sided at 5%: reject when $z > 1.645$. ${reject ? 'It is, so reject.' : 'It is not, so do not reject.'}`,
          ],
        };
      },
    },
    {
      name: 'p-values',
      generate(r) {
        const { n, sd, mu0, k, xbar } = zTest(r);
        const z = Math.abs(k) / 10;
        const t = phi4(z);
        const two = r.next() < 0.5;
        const p = two ? 2 * (10000 - t) : 10000 - t;
        const dir = k > 0 ? '>' : '<';
        return {
          prompt: `$H_0: \\mu = ${mu0}$ against $H_1: \\mu ${two ? '\\ne' : dir} ${mu0}$. A sample of ${n} has mean ${xbar}, and $\\sigma = ${sd}$. Find the p-value. Use $${phiTex(z)}$.`,
          answer: dec(p, 10000),
          inputHint: 'A decimal, like 0.0456.',
          solution: [
            `$z = \\frac{${xbar} - ${mu0}}{${sd}/\\sqrt{${n}}} = ${k / 10}$.`,
            two
              ? `Two-sided: the probability of a result at least this extreme in either direction, $2(1 - \\Phi(${z})) = ${decStr(p, 10000)}$.`
              : `One-sided in the direction of $H_1$: $P(Z ${dir} ${k / 10}) = 1 - \\Phi(${z}) = ${decStr(p, 10000)}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'A test assumes $H_0$ and asks how surprising the data would be. For a mean with known $\\sigma$, the statistic $z = \\frac{\\bar x - \\mu_0}{\\sigma/\\sqrt n}$ is standard normal under $H_0$. The p-value is the probability of a result at least as extreme, in the direction(s) of $H_1$; reject at level $\\alpha$ when $p < \\alpha$ (two-sided 5%: $|z| > 1.96$). Not rejecting is not proof that $H_0$ is true.',
    resources: [openIntro, wiki('P-value', 'p-value'), wiki('Z-test', 'Z-test')],
  },
};
