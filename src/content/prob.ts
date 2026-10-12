import { Q } from '../core/frac';
import type { Chapter, Rng, Skill } from '../core/types';
import { distinct } from './helpers';
import { chebyshev, hypothesisTests, indicators, markovChains, poisson } from './prob-deeper';
import {
  C, Pn, composition, dec, decStr, grinstead, hund, khanStats, num, openIntro, pct, phi4, phiTex, qPow, range, rowTable,
  seeingTheory, tenth, wiki, yesNo,
} from './prob-helpers';

const DIE = range(1, 6);
const PAIRS = DIE.flatMap((a) => DIE.map((b) => [a, b] as const));

// ---------------------------------------------------------------------------
// Chapter 1: probability basics

const equally: Skill = {
  id: 'prob.equally',
  name: 'Equally likely outcomes',
  prereqs: ['dm.perm'],
  levels: [
    {
      name: 'dice and coins',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const s = r.int(3, 11);
          const ways = PAIRS.filter(([a, b]) => a + b === s);
          return {
            prompt: `Two fair dice are rolled. What is the probability that the sum is ${s}?`,
            answer: num(new Q(ways.length, 36)),
            solution: [`There are $36$ equally likely ordered outcomes. Sum ${s}: ${ways.map(([a, b]) => `(${a},${b})`).join(', ')}, that is ${ways.length}.`, `$P = \\frac{${ways.length}}{36} = ${new Q(ways.length, 36).tex()}$`],
            selfCheck: () => ways.length === 6 - Math.abs(s - 7),
          };
        }
        if (kind === 1) {
          const s = r.int(8, 11);
          const ways = PAIRS.filter(([a, b]) => a + b >= s);
          return {
            prompt: `Two fair dice are rolled. What is the probability that the sum is at least ${s}?`,
            answer: num(new Q(ways.length, 36)),
            solution: [
              `Count the outcomes by sum: ${range(s, 12).map((t) => `sum ${t}: ${6 - Math.abs(t - 7)}`).join(', ')}.`,
              `$P = \\frac{${ways.length}}{36} = ${new Q(ways.length, 36).tex()}$`,
            ],
          };
        }
        const n = r.int(3, 6);
        const k = r.int(1, n - 1);
        return {
          prompt: `A fair coin is flipped ${n} times. What is the probability of exactly ${k} head${k === 1 ? '' : 's'}?`,
          answer: num(new Q(C(n, k), 2 ** n)),
          solution: [`All $2^{${n}} = ${2 ** n}$ sequences are equally likely, and $\\binom{${n}}{${k}} = ${C(n, k)}$ of them have ${k} heads (choose where the heads go).`, `$P = \\frac{${C(n, k)}}{${2 ** n}} = ${new Q(C(n, k), 2 ** n).tex()}$`],
        };
      },
    },
    {
      name: 'drawing balls',
      generate(r) {
        const red = r.int(3, 7);
        const blue = r.int(3, 7);
        const n = red + blue;
        const k = r.int(2, 4);
        const j = r.int(Math.max(0, k - blue), Math.min(red, k));
        const p = new Q(C(red, j) * C(blue, k - j), C(n, k));
        return {
          prompt: `A bag holds ${red} red and ${blue} blue balls. ${k} balls are drawn at random without replacement. What is the probability that exactly ${j} of them are red?`,
          answer: num(p),
          solution: [
            `Every set of ${k} balls is equally likely: $\\binom{${n}}{${k}} = ${C(n, k)}$ of them.`,
            `Favourable: choose ${j} of the red and ${k - j} of the blue, $\\binom{${red}}{${j}}\\binom{${blue}}{${k - j}} = ${C(red, j)} \\cdot ${C(blue, k - j)} = ${C(red, j) * C(blue, k - j)}$.`,
            `$P = \\frac{${C(red, j) * C(blue, k - j)}}{${C(n, k)}}${p.d !== C(n, k) ? ` = ${p.tex()}` : ''}$`,
          ],
        };
      },
    },
    {
      name: 'cards, birthdays, lines',
      generate(r) {
        const kind = r.int(0, 3);
        if (kind === 0) {
          const k = r.int(2, 4);
          const p = new Q(C(13, k), C(52, k));
          return {
            prompt: `${k} cards are dealt from a shuffled standard deck of 52. What is the probability that they are all hearts?`,
            answer: num(p),
            solution: [`$\\binom{13}{${k}}$ all-heart hands out of $\\binom{52}{${k}}$: $\\frac{${C(13, k)}}{${C(52, k)}} = ${p.tex()}$.`],
          };
        }
        if (kind === 1) {
          const k = r.int(2, 4);
          const p = new Q(C(48, k), C(52, k));
          return {
            prompt: `${k} cards are dealt from a shuffled standard deck of 52. What is the probability that none of them is an ace?`,
            answer: num(p),
            solution: [`All ${k} cards come from the 48 non-aces: $\\frac{\\binom{48}{${k}}}{\\binom{52}{${k}}} = \\frac{${C(48, k)}}{${C(52, k)}} = ${p.tex()}$.`],
          };
        }
        if (kind === 2) {
          const d = r.int(6, 12);
          const k = r.int(3, 5);
          const p = new Q(Pn(d, k), d ** k);
          return {
            prompt: `${k} people each pick a whole number from 1 to ${d} at random, independently. What is the probability that all ${k} numbers are different?`,
            answer: num(p),
            solution: [`$${d}^{${k}}$ equally likely choices. All different: $${range(d - k + 1, d).reverse().join(' \\cdot ')} = ${Pn(d, k)}$ (each person avoids the numbers already taken).`, `$P = \\frac{${Pn(d, k)}}{${d ** k}} = ${p.tex()}$`],
          };
        }
        const n = r.int(5, 9);
        return {
          prompt: `${n} people line up in a random order. What is the probability that Alex and Sam end up next to each other?`,
          answer: num(new Q(2, n)),
          solution: [`$${n}!$ orders. Glue Alex and Sam into a block: $${n - 1}!$ orders of the blocks, times 2 inside the block.`, `$P = \\frac{2 \\cdot ${n - 1}!}{${n}!} = \\frac{2}{${n}}${new Q(2, n).d !== n ? ` = ${new Q(2, n).tex()}` : ''}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'When all outcomes are equally likely, $P(A) = \\frac{|A|}{|\\Omega|}$: count the favourable outcomes and divide by all outcomes. Make sure both counts are of the same kind (ordered pairs for two dice, unordered sets for a hand of cards). Counting tools from Discrete Math do the work: $\\binom{n}{k}$ for selections, $n!/(n-k)!$ for arrangements.',
    resources: [grinstead, wiki('Probability_space', 'Probability space'), khanStats, seeingTheory],
  },
};

const rules: Skill = {
  id: 'prob.rules',
  name: 'Complements, unions, independence',
  prereqs: ['prob.equally'],
  levels: [
    {
      name: 'unions and complements',
      generate(r) {
        let a: number, b: number, ab: number;
        do {
          a = 5 * r.int(4, 14);
          b = 5 * r.int(4, 14);
          ab = 5 * r.int(1, Math.min(a, b) / 5 - 1);
        } while (a + b - ab > 95);
        const u = a + b - ab;
        const given = `$P(A) = ${hund(a)}$, $P(B) = ${hund(b)}$`;
        const kind = r.int(0, 3);
        if (kind === 0)
          return {
            prompt: `${given}, $P(A \\cap B) = ${hund(ab)}$. Find $P(A \\cup B)$.`,
            answer: dec(u, 100),
            solution: [`Inclusion–exclusion: $P(A \\cup B) = P(A) + P(B) - P(A \\cap B) = ${hund(a)} + ${hund(b)} - ${hund(ab)} = ${hund(u)}$.`],
          };
        if (kind === 1)
          return {
            prompt: `${given}, $P(A \\cap B) = ${hund(ab)}$. What is the probability that neither $A$ nor $B$ happens?`,
            answer: dec(100 - u, 100),
            solution: [`$P(A \\cup B) = ${hund(a)} + ${hund(b)} - ${hund(ab)} = ${hund(u)}$.`, `Neither is the complement: $1 - ${hund(u)} = ${hund(100 - u)}$.`],
          };
        if (kind === 2)
          return {
            prompt: `${given}, $P(A \\cap B) = ${hund(ab)}$. What is the probability that $A$ happens but $B$ does not?`,
            answer: dec(a - ab, 100),
            solution: [`$A$ splits into the part inside $B$ and the part outside: $P(A \\cap B^c) = P(A) - P(A \\cap B) = ${hund(a)} - ${hund(ab)} = ${hund(a - ab)}$.`],
          };
        return {
          prompt: `${given}, $P(A \\cup B) = ${hund(u)}$. Find $P(A \\cap B)$.`,
          answer: dec(ab, 100),
          solution: [`Rearrange inclusion–exclusion: $P(A \\cap B) = P(A) + P(B) - P(A \\cup B) = ${hund(a)} + ${hund(b)} - ${hund(u)} = ${hund(ab)}$.`],
        };
      },
    },
    {
      name: 'independent events',
      generate(r) {
        const a = r.int(1, 9);
        const b = r.int(1, 9);
        const kind = r.int(0, 3);
        const given = `$A$ and $B$ are independent with $P(A) = ${tenth(a)}$ and $P(B) = ${tenth(b)}$.`;
        if (kind === 0)
          return {
            prompt: `${given} Find $P(A \\cup B)$.`,
            answer: dec(10 * a + 10 * b - a * b, 100),
            solution: [`Independence: $P(A \\cap B) = P(A)P(B) = ${hund(a * b)}$.`, `$P(A \\cup B) = ${tenth(a)} + ${tenth(b)} - ${hund(a * b)} = ${hund(10 * a + 10 * b - a * b)}$`],
          };
        if (kind === 1) {
          const v = a * (10 - b) + b * (10 - a);
          return {
            prompt: `${given} What is the probability that exactly one of them happens?`,
            answer: dec(v, 100),
            solution: [`Exactly one: $A$ without $B$, or $B$ without $A$ (disjoint cases).`, `$${tenth(a)} \\cdot ${tenth(10 - b)} + ${tenth(b)} \\cdot ${tenth(10 - a)} = ${hund(v)}$`],
          };
        }
        if (kind === 2)
          return {
            prompt: `${given} What is the probability that neither happens?`,
            answer: dec((10 - a) * (10 - b), 100),
            solution: [`Complements of independent events are independent: $P(A^c \\cap B^c) = (1 - ${tenth(a)})(1 - ${tenth(b)}) = ${hund((10 - a) * (10 - b))}$.`],
          };
        const ind = r.next() < 0.5;
        const ab = ind ? a * b : a * b + r.pick([-1, 1]) * r.int(1, Math.min(a, b, 10 - a, 10 - b, a * b));
        const sure = Math.max(0, Math.min(ab, 10 * Math.min(a, b)));
        return {
          prompt: `$P(A) = ${tenth(a)}$, $P(B) = ${tenth(b)}$ and $P(A \\cap B) = ${hund(sure)}$. Are $A$ and $B$ independent?`,
          answer: yesNo(sure === a * b),
          solution: [`Independent means $P(A \\cap B) = P(A)P(B)$. Here $P(A)P(B) = ${hund(a * b)}$, ${sure === a * b ? 'which matches: independent' : `but $P(A \\cap B) = ${hund(sure)}$: not independent`}.`],
        };
      },
    },
    {
      name: 'at least one',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const n = r.int(3, 6);
          const p = new Q(1).sub(qPow(new Q(5, 6), n));
          return {
            prompt: `A fair die is rolled ${n} times. What is the probability of at least one six?`,
            answer: num(p, `1 - \\left(\\tfrac{5}{6}\\right)^{${n}} = ${p.tex()}`),
            inputHint: 'An expression like 1 - (5/6)^3 is fine.',
            solution: [`"At least one six" is the complement of "no sixes", and the rolls are independent.`, `$1 - \\left(\\frac{5}{6}\\right)^{${n}} = 1 - \\frac{${5 ** n}}{${6 ** n}} = ${p.tex()}$`],
          };
        }
        if (kind === 1) {
          const n = r.int(2, 4);
          const pw = r.int(5, 9);
          const parallel = r.next() < 0.5;
          const p = parallel ? new Q(1).sub(qPow(new Q(10 - pw, 10), n)) : qPow(new Q(pw, 10), n);
          return {
            prompt: `A machine has ${n} independent parts, each working with probability ${tenth(pw)}. ${parallel ? 'The machine works as long as at least one part works (parallel).' : 'The machine works only if every part works (series).'} What is the probability that the machine works?`,
            answer: num(p, decStr(p.n * (10 ** n / p.d), 10 ** n)),
            solution: parallel
              ? [`It fails only if all parts fail: $${tenth(10 - pw)}^{${n}}$.`, `$P = 1 - ${tenth(10 - pw)}^{${n}} = ${decStr(p.n * (10 ** n / p.d), 10 ** n)}$`]
              : [`All parts must work: $${tenth(pw)}^{${n}} = ${decStr(p.n * (10 ** n / p.d), 10 ** n)}$.`],
          };
        }
        const k = r.int(3, 5);
        const p = new Q(1).sub(new Q(Pn(12, k), 12 ** k));
        return {
          prompt: `${k} people are picked at random. Assuming every birth month is equally likely and independent, what is the probability that at least two of them share a birth month?`,
          answer: num(p),
          solution: [`Complement: all months different, $\\frac{${range(13 - k, 12).reverse().join(' \\cdot ')}}{12^{${k}}} = \\frac{${Pn(12, k)}}{${12 ** k}}$.`, `$P = 1 - \\frac{${Pn(12, k)}}{${12 ** k}} = ${p.tex()}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Complement: $P(A^c) = 1 - P(A)$, which is the fastest route to any "at least one" question. Union: $P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$. $A$ and $B$ are independent when $P(A \\cap B) = P(A)P(B)$; then their complements are independent too, and probabilities of repeated independent trials multiply.',
    resources: [grinstead, wiki('Independence_(probability_theory)', 'Independence (probability theory)'), khanStats],
  },
};

// ---------------------------------------------------------------------------
// Chapter 2: conditional probability

const conditional: Skill = {
  id: 'prob.cond',
  name: 'Conditional probability',
  prereqs: ['prob.rules'],
  levels: [
    {
      name: 'from a table',
      generate(r) {
        const ctx = r.pick([
          { rows: ['First-year', 'Second-year'], cols: ['Passed', 'Failed'], who: 'student', they: 'they are' },
          { rows: ['Morning', 'Evening'], cols: ['On time', 'Late'], who: 'train', they: 'it is' },
          { rows: ['Coffee', 'Tea'], cols: ['Likes it sweet', 'Likes it plain'], who: 'person surveyed', they: 'they are' },
        ]);
        const t = [
          [r.int(5, 40), r.int(5, 40)],
          [r.int(5, 40), r.int(5, 40)],
        ];
        const total = t.flat().reduce((a, b) => a + b, 0);
        const i = r.int(0, 1);
        const j = r.int(0, 1);
        const row = t[i][0] + t[i][1];
        const col = t[0][j] + t[1][j];
        const table = `$$\\begin{array}{l|cc} & \\text{${ctx.cols[0]}} & \\text{${ctx.cols[1]}} \\\\ \\hline \\text{${ctx.rows[0]}} & ${t[0].join(' & ')} \\\\ \\text{${ctx.rows[1]}} & ${t[1].join(' & ')} \\end{array}$$`;
        const R = ctx.rows[i].toLowerCase();
        const Cl = ctx.cols[j].toLowerCase();
        const kind = r.int(0, 2);
        const intro = `A random ${ctx.who} is picked from this table of counts: ${table}`;
        if (kind === 0)
          return {
            prompt: `${intro} Given that ${ctx.they} in the "${R}" row, what is the probability ${ctx.they} in the "${Cl}" column?`,
            answer: num(new Q(t[i][j], row)),
            solution: [`Restrict to the row: it has $${t[i][0]} + ${t[i][1]} = ${row}$ entries, and $${t[i][j]}$ of them are "${Cl}".`, `$P = \\frac{${t[i][j]}}{${row}}${new Q(t[i][j], row).d !== row ? ` = ${new Q(t[i][j], row).tex()}` : ''}$`],
          };
        if (kind === 1)
          return {
            prompt: `${intro} Given that ${ctx.they} in the "${Cl}" column, what is the probability ${ctx.they} in the "${R}" row?`,
            answer: num(new Q(t[i][j], col)),
            solution: [`Restrict to the column: $${t[0][j]} + ${t[1][j]} = ${col}$ entries, of which $${t[i][j]}$ are "${R}".`, `$P = \\frac{${t[i][j]}}{${col}}${new Q(t[i][j], col).d !== col ? ` = ${new Q(t[i][j], col).tex()}` : ''}$`],
          };
        return {
          prompt: `${intro} What is the probability ${ctx.they} "${R}" and "${Cl}"?`,
          answer: num(new Q(t[i][j], total)),
          solution: [`No condition here: divide by the grand total $${total}$.`, `$P = \\frac{${t[i][j]}}{${total}}${new Q(t[i][j], total).d !== total ? ` = ${new Q(t[i][j], total).tex()}` : ''}$`],
        };
      },
    },
    {
      name: 'drawing in sequence',
      generate(r) {
        const red = r.int(3, 8);
        const blue = r.int(3, 8);
        const n = red + blue;
        const intro = `A bag has ${red} red and ${blue} blue balls. Two are drawn one after the other, without replacement.`;
        const kind = r.int(0, 3);
        if (kind === 0) {
          const p = new Q(red * (red - 1), n * (n - 1));
          return {
            prompt: `${intro} What is the probability that both are red?`,
            answer: num(p),
            solution: [`Multiplication rule: $P(R_1 \\cap R_2) = P(R_1)\\,P(R_2 \\mid R_1) = \\frac{${red}}{${n}} \\cdot \\frac{${red - 1}}{${n - 1}} = ${p.tex()}$.`],
          };
        }
        if (kind === 1)
          return {
            prompt: `${intro} Given that the first is blue, what is the probability that the second is red?`,
            answer: num(new Q(red, n - 1)),
            solution: [`After a blue is removed, ${n - 1} balls remain and all ${red} red ones are still there: $\\frac{${red}}{${n - 1}}$.`],
          };
        if (kind === 2) {
          const p = new Q(red, n);
          return {
            prompt: `${intro} What is the probability that the second ball is red?`,
            answer: num(p),
            solution: [
              `Split on the first ball: $P(R_2) = \\frac{${red}}{${n}} \\cdot \\frac{${red - 1}}{${n - 1}} + \\frac{${blue}}{${n}} \\cdot \\frac{${red}}{${n - 1}} = \\frac{${red * (red - 1) + blue * red}}{${n * (n - 1)}} = ${p.tex()}$.`,
              'By symmetry this had to equal $P(R_1)$: without looking at the first ball, the second is just as random.',
            ],
            selfCheck: () => new Q(red * (red - 1) + blue * red, n * (n - 1)).eq(p),
          };
        }
        const p = new Q(red - 1, n - 1);
        return {
          prompt: `${intro} Given that the second is red, what is the probability that the first was red too?`,
          answer: num(p),
          solution: [
            `$P(R_1 \\mid R_2) = \\frac{P(R_1 \\cap R_2)}{P(R_2)} = \\frac{${red}\\cdot${red - 1}/(${n}\\cdot${n - 1})}{${red}/${n}} = \\frac{${red - 1}}{${n - 1}}${p.d !== n - 1 ? ` = ${p.tex()}` : ''}$.`,
            'Symmetric to "given the first is red, the second is red".',
          ],
        };
      },
    },
    {
      name: 'given partial information',
      generate(r) {
        type Ev = { t: string; f: (a: number, b: number) => boolean };
        const s1 = r.int(7, 10);
        const conds: Ev[] = [
          { t: 'at least one die shows a 6', f: (a, b) => a === 6 || b === 6 },
          { t: `the sum is at least ${s1}`, f: (a, b) => a + b >= s1 },
          { t: 'the first die is even', f: (a) => a % 2 === 0 },
          { t: 'the dice show different numbers', f: (a, b) => a !== b },
          { t: 'at least one die is odd', f: (a, b) => a % 2 === 1 || b % 2 === 1 },
        ];
        const s2 = r.int(5, 11);
        const t2 = r.int(8, 11);
        const events: Ev[] = [
          { t: `the sum is ${s2}`, f: (a, b) => a + b === s2 },
          { t: 'both dice are even', f: (a, b) => a % 2 === 0 && b % 2 === 0 },
          { t: 'it is a double', f: (a, b) => a === b },
          { t: `the sum is at least ${t2}`, f: (a, b) => a + b >= t2 },
          { t: 'the larger number is 5', f: (a, b) => Math.max(a, b) === 5 },
        ];
        let B: Ev, A: Ev, nB: number, AB: (readonly [number, number])[];
        do {
          B = r.pick(conds);
          A = r.pick(events);
          nB = PAIRS.filter(([a, b]) => B.f(a, b)).length;
          AB = PAIRS.filter(([a, b]) => A.f(a, b) && B.f(a, b));
        } while (AB.length === 0 || AB.length === nB);
        const p = new Q(AB.length, nB);
        return {
          prompt: `Two fair dice are rolled. Given that ${B.t}, what is the probability that ${A.t}?`,
          answer: num(p),
          solution: [
            `The condition leaves ${nB} of the 36 equally likely outcomes.`,
            `Of those, ${AB.length} also satisfy "${A.t}"${AB.length <= 12 ? `: ${AB.map(([a, b]) => `(${a},${b})`).join(', ')}` : ''}.`,
            `$P = \\frac{${AB.length}}{${nB}}${p.d !== nB ? ` = ${p.tex()}` : ''}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      '$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}$: once you know $B$ happened, $B$ becomes the whole sample space. With equally likely outcomes this is just counting inside $B$. Turned around, it is the multiplication rule $P(A \\cap B) = P(B)\\,P(A \\mid B)$, which is how sequential draws are computed.',
    resources: [grinstead, wiki('Conditional_probability', 'Conditional probability'), khanStats, seeingTheory],
  },
};

const bayes: Skill = {
  id: 'prob.bayes',
  name: 'Total probability and Bayes',
  prereqs: ['prob.cond'],
  levels: [
    {
      name: 'law of total probability',
      generate(r) {
        const k = r.int(2, 3);
        const shares = composition(r, 20, k).map((x) => 5 * x);
        const rates = distinct(r, k, 1, 8);
        const names = ['A', 'B', 'C'].slice(0, k);
        const p = shares.reduce((s, sh, i) => s.add(pct(sh).mul(pct(rates[i]))), new Q(0));
        return {
          prompt: `A factory has ${k} machines. ${names.map((m, i) => `Machine ${m} makes ${shares[i]}% of the items, and ${rates[i]}% of its items are defective.`).join(' ')} What is the probability that a random item is defective?`,
          answer: num(p, `${p.tex()} = ${decStr(p.n * (10000 / p.d), 10000)}`),
          solution: [
            'Law of total probability: split on which machine made the item.',
            `$P(D) = ${names.map((_, i) => `${hund(shares[i])} \\cdot ${hund(rates[i])}`).join(' + ')} = ${decStr(p.n * (10000 / p.d), 10000)}$`,
          ],
        };
      },
    },
    {
      name: 'Bayes with a test',
      generate(r) {
        const prev = r.pick([1, 2, 4, 5, 10, 20]);
        const sens = r.pick([80, 90, 95, 98, 99]);
        const fp = r.pick([2, 3, 5, 10, 15]);
        const intro = `A disease affects ${prev}% of people. A test detects it in ${sens}% of people who have it, but also comes back positive for ${fp}% of people who don't.`;
        if (r.next() < 0.7) {
          const tp = prev * sens;
          const fpos = (100 - prev) * fp;
          const p = new Q(tp, tp + fpos);
          return {
            prompt: `${intro} Someone tests positive. What is the probability that they have the disease?`,
            answer: num(p),
            hint: 'Find $P(+)$ by splitting on sick / healthy, then use $P(\\text{sick} \\mid +) = P(\\text{sick} \\cap +) / P(+)$.',
            solution: [
              `$P(\\text{sick} \\cap +) = ${hund(prev)} \\cdot ${hund(sens)} = ${decStr(tp, 10000)}$, $\\;P(\\text{healthy} \\cap +) = ${hund(100 - prev)} \\cdot ${hund(fp)} = ${decStr(fpos, 10000)}$.`,
              `$P(\\text{sick} \\mid +) = \\frac{${decStr(tp, 10000)}}{${decStr(tp, 10000)} + ${decStr(fpos, 10000)}} = ${p.tex()} \\approx ${p.value().toFixed(3)}$`,
              p.value() < 0.5 ? 'Most positives are false positives: the healthy group is so much bigger that its small error rate dominates.' : 'The test is accurate enough, relative to how common the disease is, that most positives are real.',
            ],
            selfCheck: () => Math.abs(p.value() - (prev * sens) / (prev * sens + (100 - prev) * fp)) < 1e-12,
          };
        }
        const fn = prev * (100 - sens);
        const tn = (100 - prev) * (100 - fp);
        const p = new Q(fn, fn + tn);
        return {
          prompt: `${intro} Someone tests negative. What is the probability that they have the disease anyway?`,
          answer: num(p),
          solution: [
            `$P(\\text{sick} \\cap -) = ${hund(prev)} \\cdot ${hund(100 - sens)} = ${decStr(fn, 10000)}$, $\\;P(\\text{healthy} \\cap -) = ${hund(100 - prev)} \\cdot ${hund(100 - fp)} = ${decStr(tn, 10000)}$.`,
            `$P(\\text{sick} \\mid -) = \\frac{${decStr(fn, 10000)}}{${decStr(fn, 10000)} + ${decStr(tn, 10000)}} = ${p.tex()} \\approx ${p.value().toFixed(4)}$`,
          ],
        };
      },
    },
    {
      name: 'which cause?',
      generate(r) {
        if (r.next() < 0.5) {
          const shares = composition(r, 20, 3).map((x) => 5 * x);
          const rates = distinct(r, 3, 1, 6);
          const names = ['A', 'B', 'C'];
          const i = r.int(0, 2);
          const joint = shares.map((s, j) => s * rates[j]);
          const total = joint.reduce((a, b) => a + b, 0);
          const p = new Q(joint[i], total);
          return {
            prompt: `Machines A, B, C make ${shares.join('%, ')}% of a factory's items, with defect rates ${rates.join('%, ')}% respectively. A random item is defective. What is the probability it came from machine ${names[i]}?`,
            answer: num(p),
            solution: [
              `Joint probabilities (in units of $1/10000$): ${names.map((m, j) => `${m}: $${shares[j]} \\cdot ${rates[j]} = ${joint[j]}$`).join(', ')}; total ${total}.`,
              `Bayes: $P(${names[i]} \\mid D) = \\frac{${joint[i]}}{${total}} = ${p.tex()}$`,
            ],
          };
        }
        const [r1, b1, r2, b2] = [r.int(1, 6), r.int(1, 6), r.int(1, 6), r.int(1, 6)];
        const how = r.pick([
          { t: 'A fair coin decides which: heads for urn 1, tails for urn 2.', p: new Q(1, 2) },
          { t: 'A die decides which: urn 1 on a 6, urn 2 otherwise.', p: new Q(1, 6) },
          { t: 'A die decides which: urn 1 on 1 or 2, urn 2 otherwise.', p: new Q(1, 3) },
        ]);
        const j1 = how.p.mul(new Q(r1, r1 + b1));
        const j2 = new Q(1).sub(how.p).mul(new Q(r2, r2 + b2));
        const p = j1.div(j1.add(j2));
        return {
          prompt: `Urn 1 has ${r1} red and ${b1} blue balls; urn 2 has ${r2} red and ${b2} blue. ${how.t} One ball is drawn from the chosen urn, and it is red. What is the probability that it came from urn 1?`,
          answer: num(p),
          solution: [
            `$P(U_1 \\cap R) = ${how.p.tex()} \\cdot \\frac{${r1}}{${r1 + b1}} = ${j1.tex()}$, $\\;P(U_2 \\cap R) = ${new Q(1).sub(how.p).tex()} \\cdot \\frac{${r2}}{${r2 + b2}} = ${j2.tex()}$.`,
            `$P(U_1 \\mid R) = \\frac{${j1.tex()}}{${j1.tex()} + ${j2.tex()}} = ${p.tex()}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Law of total probability: if $B_1, \\dots, B_n$ split the sample space, $P(A) = \\sum_i P(A \\mid B_i)P(B_i)$. Bayes\' theorem turns the condition around: $P(B_i \\mid A) = \\frac{P(A \\mid B_i)P(B_i)}{P(A)}$. Rule of thumb: write down every joint probability $P(A \\cap B_i)$, then the answer is your share of their total. Rare conditions plus imperfect tests give mostly false positives.',
    resources: [
      { kind: 'video', title: "3Blue1Brown: Bayes' theorem, the geometry of changing beliefs", url: 'https://www.youtube.com/watch?v=HZGCoVF3YvM' },
      wiki('Bayes%27_theorem', "Bayes' theorem"),
      grinstead,
    ],
  },
};

// ---------------------------------------------------------------------------
// Chapter 3: random variables

/** A random PMF: 3–4 distinct values with probabilities in tenths or twelfths. */
function pmf(r: Rng) {
  const k = r.int(3, 4);
  const xs = distinct(r, k, -2, 8).sort((a, b) => a - b);
  const den = r.pick([10, 12]);
  const ps = composition(r, den, k).map((c) => new Q(c, den));
  return { xs, ps, table: rowTable('x', xs, 'P(X = x)', ps.map((p) => p.tex())) };
}

const expectation: Skill = {
  id: 'prob.ev',
  name: 'Expected value and variance',
  prereqs: ['prob.rules'],
  levels: [
    {
      name: 'expected value',
      generate(r) {
        if (r.next() < 0.6) {
          const { xs, ps, table } = pmf(r);
          const e = xs.reduce((s, x, i) => s.add(ps[i].mul(x)), new Q(0));
          return {
            prompt: `$X$ has this distribution: ${table} Find $E[X]$.`,
            answer: num(e),
            solution: [`$E[X] = \\sum x\\,P(X = x) = ${xs.map((x, i) => `${x < 0 ? `(${x})` : x} \\cdot ${ps[i].tex()}`).join(' + ')} = ${e.tex()}$`],
          };
        }
        const cost = r.int(2, 6);
        const w6 = r.int(5, 20);
        const w5 = r.int(1, w6 - 1);
        const e = new Q(w6 + w5, 6).sub(cost);
        return {
          prompt: `A game costs ${cost} coins to play. You roll a fair die and win ${w6} coins on a 6, ${w5} on a 5, nothing otherwise. What is your expected net gain per game?`,
          answer: num(e),
          solution: [`$E[\\text{winnings}] = \\frac{${w6}}{6} + \\frac{${w5}}{6} = ${new Q(w6 + w5, 6).tex()}$`, `Net: $${new Q(w6 + w5, 6).tex()} - ${cost} = ${e.tex()}$${e.n < 0 ? ' (you lose on average)' : ''}`],
        };
      },
    },
    {
      name: 'variance',
      generate(r) {
        const { xs, ps, table } = pmf(r);
        const e = xs.reduce((s, x, i) => s.add(ps[i].mul(x)), new Q(0));
        const e2 = xs.reduce((s, x, i) => s.add(ps[i].mul(x * x)), new Q(0));
        const v = e2.sub(e.mul(e));
        return {
          prompt: `$X$ has this distribution: ${table} Find $\\operatorname{Var}(X)$.`,
          answer: num(v),
          solution: [
            `$E[X] = ${e.tex()}$`,
            `$E[X^2] = ${xs.map((x, i) => `${x * x} \\cdot ${ps[i].tex()}`).join(' + ')} = ${e2.tex()}$`,
            `$\\operatorname{Var}(X) = E[X^2] - E[X]^2 = ${e2.tex()} - \\left(${e.tex()}\\right)^2 = ${v.tex()}$`,
          ],
          selfCheck: () => xs.reduce((s, x, i) => s.add(ps[i].mul(new Q(x).sub(e).mul(new Q(x).sub(e)))), new Q(0)).eq(v),
        };
      },
    },
    {
      name: 'linearity',
      generate(r) {
        const mx = r.int(-5, 10);
        const vx = r.int(1, 9);
        const my = r.int(-5, 10);
        const vy = r.int(1, 9);
        const a = r.nz(-4, 4);
        const b = r.nz(-4, 4);
        const c = r.int(-9, 9);
        const given = `$E[X] = ${mx}$, $\\operatorname{Var}(X) = ${vx}$, $E[Y] = ${my}$, $\\operatorname{Var}(Y) = ${vy}$, and $X$, $Y$ are independent.`;
        const co = (p: number) => (p === 1 ? '' : p === -1 ? '-' : `${p}`);
        const lin = (p: number, q: number, k = 0) => `${co(p)}X ${q < 0 ? '-' : '+'} ${co(Math.abs(q))}Y${k ? ` ${k < 0 ? '-' : '+'} ${Math.abs(k)}` : ''}`;
        const kind = r.int(0, 3);
        if (kind === 0)
          return {
            prompt: `${given} Find $E[${lin(a, b, c)}]$.`,
            answer: num(a * mx + b * my + c),
            solution: [`Expectation is linear (independence not even needed): $${a}\\cdot${mx} + (${b})\\cdot${my} + (${c}) = ${a * mx + b * my + c}$.`],
          };
        if (kind === 1)
          return {
            prompt: `${given} Find $\\operatorname{Var}(${co(a)}X ${c < 0 ? '-' : '+'} ${Math.abs(c)})$.`,
            answer: num(a * a * vx),
            solution: [`Shifting doesn't change spread; scaling by $a$ multiplies variance by $a^2$: $(${a})^2 \\cdot ${vx} = ${a * a * vx}$.`],
          };
        if (kind === 2)
          return {
            prompt: `${given} Find $\\operatorname{Var}(${lin(a, b)})$.`,
            answer: num(a * a * vx + b * b * vy),
            solution: [`For independent variables variances add, with squared coefficients (a minus sign still adds variance): $(${a})^2 \\cdot ${vx} + (${b})^2 \\cdot ${vy} = ${a * a * vx + b * b * vy}$.`],
          };
        return {
          prompt: `${given} Find $E[X^2]$.`,
          answer: num(vx + mx * mx),
          solution: [`$\\operatorname{Var}(X) = E[X^2] - E[X]^2$, so $E[X^2] = ${vx} + (${mx})^2 = ${vx + mx * mx}$.`],
        };
      },
    },
  ],
  learn: {
    summary:
      '$E[X] = \\sum_x x\\,P(X = x)$, the long-run average. $\\operatorname{Var}(X) = E[(X - \\mu)^2] = E[X^2] - E[X]^2$ measures spread; the standard deviation is its square root. Expectation is always linear: $E[aX + bY + c] = aE[X] + bE[Y] + c$. Variance: $\\operatorname{Var}(aX + b) = a^2\\operatorname{Var}(X)$, and for independent $X, Y$, $\\operatorname{Var}(X \\pm Y) = \\operatorname{Var}(X) + \\operatorname{Var}(Y)$.',
    resources: [grinstead, wiki('Expected_value', 'Expected value'), wiki('Variance', 'Variance'), khanStats],
  },
};

const P_CHOICES = [new Q(1, 2), new Q(1, 3), new Q(2, 3), new Q(1, 4), new Q(3, 4), new Q(1, 5), new Q(2, 5), new Q(3, 5), new Q(1, 6)];
const binPmf = (n: number, p: Q, k: number) => qPow(p, k).mul(qPow(new Q(1).sub(p), n - k)).mul(C(n, k));
const binTex = (n: number, p: Q, k: number) =>
  `\\binom{${n}}{${k}}\\left(${p.tex()}\\right)^{${k}}\\left(${new Q(1).sub(p).tex()}\\right)^{${n - k}}`;

const binomialDist: Skill = {
  id: 'prob.binom',
  name: 'Binomial and geometric distributions',
  prereqs: ['prob.ev', 'dm.binom'],
  levels: [
    {
      name: 'binomial probability',
      generate(r) {
        const n = r.int(4, 8);
        const p = r.pick(P_CHOICES);
        const k = r.int(1, n - 1);
        const v = binPmf(n, p, k);
        const ctx = r.pick([
          `A player makes each free throw with probability $${p.tex()}$, independently. In ${n} attempts, what is the probability of exactly ${k} hits?`,
          `Each of ${n} independent trials succeeds with probability $${p.tex()}$. What is $P(X = ${k})$ for the number of successes $X$?`,
        ]);
        return {
          prompt: ctx,
          answer: num(v, `${binTex(n, p, k)} = ${v.tex()}`),
          inputHint: 'An expression like 10*(1/3)^2*(2/3)^3 is fine.',
          solution: [`$X \\sim \\text{Bin}(${n}, ${p.tex()})$: choose which ${k} trials succeed, then multiply the probabilities.`, `$P(X = ${k}) = ${binTex(n, p, k)} = ${v.tex()}$`],
        };
      },
    },
    {
      name: 'at least, at most',
      generate(r) {
        const n = r.int(4, 7);
        const p = r.pick(P_CHOICES);
        const kind = r.int(0, 2);
        const intro = `$X \\sim \\text{Bin}(${n}, ${p.tex()})$.`;
        if (kind === 0) {
          const v = new Q(1).sub(binPmf(n, p, 0));
          return {
            prompt: `${intro} Find $P(X \\ge 1)$.`,
            answer: num(v),
            inputHint: 'An expression is fine.',
            solution: [`Complement: $1 - P(X = 0) = 1 - \\left(${new Q(1).sub(p).tex()}\\right)^{${n}} = ${v.tex()}$`],
          };
        }
        if (kind === 1) {
          const v = binPmf(n, p, 0).add(binPmf(n, p, 1));
          return {
            prompt: `${intro} Find $P(X \\le 1)$.`,
            answer: num(v),
            inputHint: 'An expression is fine.',
            solution: [`$P(X = 0) + P(X = 1) = \\left(${new Q(1).sub(p).tex()}\\right)^{${n}} + ${n}\\left(${p.tex()}\\right)\\left(${new Q(1).sub(p).tex()}\\right)^{${n - 1}} = ${v.tex()}$`],
          };
        }
        const v = binPmf(n, p, n).add(binPmf(n, p, n - 1));
        return {
          prompt: `${intro} Find $P(X \\ge ${n - 1})$.`,
          answer: num(v),
          inputHint: 'An expression is fine.',
          solution: [`$P(X = ${n - 1}) + P(X = ${n}) = ${n}\\left(${p.tex()}\\right)^{${n - 1}}\\left(${new Q(1).sub(p).tex()}\\right) + \\left(${p.tex()}\\right)^{${n}} = ${v.tex()}$`],
          selfCheck: () => range(0, n).reduce((s, k) => s.add(binPmf(n, p, k)), new Q(0)).eq(1),
        };
      },
    },
    {
      name: 'mean, variance, geometric',
      generate(r) {
        const p = r.pick(P_CHOICES);
        const q = new Q(1).sub(p);
        const kind = r.int(0, 3);
        if (kind === 0) {
          const n = r.int(5, 60);
          const v = p.mul(q).mul(n);
          return {
            prompt: `$X \\sim \\text{Bin}(${n}, ${p.tex()})$. Find $\\operatorname{Var}(X)$.`,
            answer: num(v),
            solution: [`A binomial is a sum of $n$ independent Bernoulli trials, each with variance $p(1-p)$.`, `$\\operatorname{Var}(X) = np(1-p) = ${n} \\cdot ${p.tex()} \\cdot ${q.tex()} = ${v.tex()}$`],
          };
        }
        if (kind === 1) {
          const k = r.int(2, 5);
          const v = qPow(q, k - 1).mul(p);
          return {
            prompt: `Independent trials each succeed with probability $${p.tex()}$. What is the probability that the first success happens on trial ${k}?`,
            answer: num(v),
            solution: [`${k - 1} failures, then a success: $\\left(${q.tex()}\\right)^{${k - 1}} \\cdot ${p.tex()} = ${v.tex()}$`],
          };
        }
        if (kind === 2) {
          const k = r.int(2, 5);
          return {
            prompt: `Independent trials each succeed with probability $${p.tex()}$. What is the probability that the first ${k} trials all fail (so the first success comes later)?`,
            answer: num(qPow(q, k)),
            solution: [`$\\left(${q.tex()}\\right)^{${k}} = ${qPow(q, k).tex()}$`],
          };
        }
        const faces = r.pick([1, 2, 3]);
        const pp = new Q(faces, 6);
        return {
          prompt: `A fair die is rolled until it shows ${faces === 1 ? 'a 6' : faces === 2 ? 'a 5 or a 6' : 'an even number'}. What is the expected number of rolls, including the last one?`,
          answer: num(new Q(1).div(pp)),
          solution: [`The number of rolls is geometric with $p = ${pp.tex()}$, and $E = \\frac{1}{p} = ${new Q(1).div(pp).tex()}$.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Binomial $\\text{Bin}(n, p)$: the number of successes in $n$ independent trials, $P(X = k) = \\binom{n}{k}p^k(1-p)^{n-k}$, with $E = np$ and $\\operatorname{Var} = np(1-p)$. Geometric: the trial of the first success, $P(X = k) = (1-p)^{k-1}p$ and $E = 1/p$. For "at least one" use the complement $1 - (1-p)^n$.',
    resources: [wiki('Binomial_distribution', 'Binomial distribution'), wiki('Geometric_distribution', 'Geometric distribution'), grinstead, khanStats],
  },
};

// ---------------------------------------------------------------------------
// Chapter 4: continuous distributions

const xPow = (k: number) => (k === 1 ? 'x' : `x^{${k}}`);

const density: Skill = {
  id: 'prob.density',
  name: 'Probability densities',
  prereqs: ['prob.ev', 'calc.definite'],
  levels: [
    {
      name: 'normalising constant',
      generate(r) {
        const a = r.int(1, 4);
        const kind = r.int(0, 2);
        if (kind === 0) {
          const k = r.int(1, 3);
          const c = new Q(k + 1, a ** (k + 1));
          return {
            prompt: `$f(x) = c\\,${xPow(k)}$ for $0 \\le x \\le ${a}$ (and $0$ elsewhere) is a probability density. Find $c$.`,
            answer: num(c),
            solution: [`The total area must be 1: $\\int_0^{${a}} c\\,${xPow(k)}\\,dx = c\\,\\frac{${a}^{${k + 1}}}{${k + 1}} = 1$.`, `$c = \\frac{${k + 1}}{${a ** (k + 1)}}${c.d !== a ** (k + 1) ? ` = ${c.tex()}` : ''}$`],
          };
        }
        if (kind === 1) {
          const c = new Q(2, a * a);
          return {
            prompt: `$f(x) = c\\,(${a} - x)$ for $0 \\le x \\le ${a}$ (and $0$ elsewhere) is a probability density. Find $c$.`,
            answer: num(c),
            solution: [`The graph is a triangle with base ${a} and height $${a}c$, so its area is $\\frac{${a * a}c}{2} = 1$.`, `$c = ${c.tex()}$`],
          };
        }
        const c = new Q(6, a ** 3);
        return {
          prompt: `$f(x) = c\\,x(${a} - x)$ for $0 \\le x \\le ${a}$ (and $0$ elsewhere) is a probability density. Find $c$.`,
          answer: num(c),
          solution: [`$\\int_0^{${a}} (${a}x - x^2)\\,dx = \\frac{${a}^3}{2} - \\frac{${a}^3}{3} = \\frac{${a ** 3}}{6}$`, `$c = \\frac{6}{${a ** 3}}${c.d !== a ** 3 ? ` = ${c.tex()}` : ''}$`],
        };
      },
    },
    {
      name: 'probabilities',
      generate(r) {
        if (r.next() < 0.5) {
          const lo = r.int(0, 5);
          const hi = lo + r.int(4, 10);
          let s: number, t: number;
          do {
            s = r.int(lo - 2, hi - 1);
            t = r.int(s + 1, hi + 3);
          } while (Math.max(s, lo) >= Math.min(t, hi) || (s <= lo && t >= hi));
          const overlap = Math.min(t, hi) - Math.max(s, lo);
          const p = new Q(overlap, hi - lo);
          return {
            prompt: `$X$ is uniform on $[${lo}, ${hi}]$. Find $P(${s} < X < ${t})$.`,
            answer: num(p),
            solution: [
              `The density is $\\frac{1}{${hi - lo}}$ on $[${lo}, ${hi}]$ and $0$ outside, so only the overlap $[${Math.max(s, lo)}, ${Math.min(t, hi)}]$ counts.`,
              `$P = \\frac{${overlap}}{${hi - lo}}${p.d !== hi - lo ? ` = ${p.tex()}` : ''}$`,
            ],
          };
        }
        const k = r.int(1, 3);
        const a = r.int(2, 4);
        const b = r.int(1, a - 1);
        const below = qPow(new Q(b, a), k + 1);
        const above = r.next() < 0.5;
        const p = above ? new Q(1).sub(below) : below;
        return {
          prompt: `$X$ has density $f(x) = \\frac{${k + 1}${xPow(k)}}{${a ** (k + 1)}}$ for $0 \\le x \\le ${a}$. Find $P(X ${above ? '>' : '\\le'} ${b})$.`,
          answer: num(p),
          solution: [
            `$P(X \\le ${b}) = \\int_0^{${b}} \\frac{${k + 1}${xPow(k)}}{${a ** (k + 1)}}\\,dx = \\frac{${b}^{${k + 1}}}{${a ** (k + 1)}} = ${below.tex()}$`,
            ...(above ? [`$P(X > ${b}) = 1 - ${below.tex()} = ${p.tex()}$`] : []),
          ],
        };
      },
    },
    {
      name: 'mean, variance, exponential',
      generate(r) {
        const kind = r.int(0, 3);
        if (kind <= 1) {
          const k = r.int(1, 3);
          const a = r.int(1, 4);
          const e = new Q((k + 1) * a, k + 2);
          const e2 = new Q((k + 1) * a * a, k + 3);
          const dens = `$X$ has density $f(x) = \\frac{${k + 1}${xPow(k)}}{${a ** (k + 1)}}$ for $0 \\le x \\le ${a}$.`;
          if (kind === 0)
            return {
              prompt: `${dens} Find $E[X]$.`,
              answer: num(e),
              solution: [`$E[X] = \\int_0^{${a}} x f(x)\\,dx = \\frac{${k + 1}}{${a ** (k + 1)}} \\cdot \\frac{${a}^{${k + 2}}}{${k + 2}} = ${e.tex()}$`],
            };
          const v = e2.sub(e.mul(e));
          return {
            prompt: `${dens} Find $\\operatorname{Var}(X)$.`,
            answer: num(v),
            solution: [
              `$E[X] = \\int_0^{${a}} x f(x)\\,dx = ${e.tex()}$, $\\;E[X^2] = \\int_0^{${a}} x^2 f(x)\\,dx = \\frac{${k + 1}}{${a ** (k + 1)}} \\cdot \\frac{${a}^{${k + 3}}}{${k + 3}} = ${e2.tex()}$`,
              `$\\operatorname{Var}(X) = ${e2.tex()} - \\left(${e.tex()}\\right)^2 = ${v.tex()}$`,
            ],
          };
        }
        const m = r.int(2, 10);
        const what = r.pick(['bulb', 'call', 'wait']);
        const intro =
          what === 'bulb'
            ? `A bulb's lifetime (in years) is exponential with mean ${m}.`
            : what === 'call'
              ? `The time until the next call (in minutes) is exponential with mean ${m}.`
              : `A waiting time (in minutes) is exponential with mean ${m}.`;
        if (kind === 2) {
          const t = r.int(1, 2 * m);
          const ex = new Q(t, m);
          return {
            prompt: `${intro} What is the probability that it exceeds ${t}?`,
            answer: { kind: 'number', expected: `e^(-${ex})`, display: `e^{-${ex.tex()}}` },
            inputHint: 'Like e^(-2/3).',
            solution: [`Rate $\\lambda = \\frac{1}{${m}}$, and for an exponential $P(X > t) = e^{-\\lambda t}$.`, `$P(X > ${t}) = e^{-${t}/${m}} = e^{-${ex.tex()}}$`],
          };
        }
        return {
          prompt: `${intro} Find its median.`,
          answer: { kind: 'number', expected: `${m}*log(2)`, display: `${m}\\ln 2` },
          inputHint: 'Like 3 ln(2).',
          solution: [`Solve $P(X > t) = e^{-t/${m}} = \\frac{1}{2}$: $t = ${m}\\ln 2 \\approx ${(m * Math.LN2).toFixed(3)}$ (below the mean: the distribution has a long right tail).`],
        };
      },
    },
  ],
  learn: {
    summary:
      'A continuous variable has a density $f \\ge 0$ with $\\int f = 1$, and $P(a < X < b) = \\int_a^b f(x)\\,dx$ (single points have probability 0). $E[X] = \\int x f(x)\\,dx$, $E[X^2] = \\int x^2 f(x)\\,dx$. Uniform on $[a, b]$: $f = \\frac{1}{b-a}$. Exponential with rate $\\lambda$ (mean $1/\\lambda$): $P(X > t) = e^{-\\lambda t}$.',
    resources: [wiki('Probability_density_function', 'Probability density function'), wiki('Exponential_distribution', 'Exponential distribution'), grinstead, khanStats],
  },
};

/** Mean and SD for a normal model, and a z = k/10 that lands on a whole-number x. */
function normalSetup(r: Rng) {
  const ctx = r.pick([
    { t: 'Exam scores', mu: [60, 65, 70, 75], sd: [5, 8, 10, 12, 15] },
    { t: 'Adult heights (cm)', mu: [165, 170, 175], sd: [5, 6, 8, 10] },
    { t: 'IQ scores', mu: [100], sd: [15] },
    { t: 'Package weights (g)', mu: [500, 250], sd: [4, 5, 10, 20] },
  ]);
  return { ctx: ctx.t, mu: r.pick(ctx.mu), sd: r.pick(ctx.sd) };
}
function zFor(r: Rng, sd: number, lo: number, hi: number) {
  let k: number;
  do k = r.nz(lo, hi);
  while ((k * sd) % 10 !== 0);
  return k;
}

const normal: Skill = {
  id: 'prob.normal',
  name: 'The normal distribution',
  prereqs: ['prob.density'],
  levels: [
    {
      name: 'one tail',
      generate(r) {
        const { ctx, mu, sd } = normalSetup(r);
        const k = zFor(r, sd, -25, 25);
        const z = Math.abs(k) / 10;
        const x = mu + (k * sd) / 10;
        const upper = r.next() < 0.5;
        const t = phi4(z);
        // P(X < x) = Φ(k/10); Φ(-z) = 1 - Φ(z).
        const below = k > 0 ? t : 10000 - t;
        const v = upper ? 10000 - below : below;
        return {
          prompt: `${ctx} are normally distributed with mean ${mu} and standard deviation ${sd}. What fraction is ${upper ? 'above' : 'below'} ${x}? Use $${phiTex(z)}$.`,
          answer: dec(v, 10000),
          inputHint: 'A decimal, like 0.1234.',
          solution: [
            `Standardise: $z = \\frac{${x} - ${mu}}{${sd}} = ${k / 10}$.`,
            k > 0 ? `$P(Z < ${z}) = ${decStr(t, 10000)}$` : `By symmetry $P(Z < -${z}) = 1 - \\Phi(${z}) = ${decStr(10000 - t, 10000)}$`,
            ...(upper ? [`Above: $1 - ${decStr(below, 10000)} = ${decStr(v, 10000)}$`] : []),
          ],
        };
      },
    },
    {
      name: 'between two values',
      generate(r) {
        const { ctx, mu, sd } = normalSetup(r);
        let k1: number, k2: number;
        do [k1, k2] = [zFor(r, sd, -20, 20), zFor(r, sd, -20, 20)].sort((a, b) => a - b);
        while (k1 === k2);
        const cdf = (k: number) => (k > 0 ? phi4(k / 10) : 10000 - phi4(-k / 10));
        const v = cdf(k2) - cdf(k1);
        const zs = [...new Set([Math.abs(k1), Math.abs(k2)])].map((k) => phiTex(k / 10));
        const [x1, x2] = [mu + (k1 * sd) / 10, mu + (k2 * sd) / 10];
        const line = (k: number) => (k > 0 ? `\\Phi(${k / 10}) = ${decStr(cdf(k), 10000)}` : `\\Phi(${k / 10}) = 1 - \\Phi(${-k / 10}) = ${decStr(cdf(k), 10000)}`);
        return {
          prompt: `${ctx} are normally distributed with mean ${mu} and standard deviation ${sd}. What fraction lies between ${x1} and ${x2}? Use $${zs.join('$ and $')}$.`,
          answer: dec(v, 10000),
          inputHint: 'A decimal, like 0.1234.',
          solution: [`Standardise both ends: $z_1 = ${k1 / 10}$, $z_2 = ${k2 / 10}$.`, `$${line(k2)}$, $\\;${line(k1)}$`, `$P = ${decStr(cdf(k2), 10000)} - ${decStr(cdf(k1), 10000)} = ${decStr(v, 10000)}$`],
        };
      },
    },
    {
      name: 'cutoffs',
      generate(r) {
        const { ctx, mu, sd } = normalSetup(r);
        const Z = [
          { p: 90, z: 1282 },
          { p: 95, z: 1645 },
          { p: 975, z: 1960 },
          { p: 99, z: 2326 },
        ];
        const kind = r.int(0, 2);
        if (kind < 2) {
          const { p, z } = r.pick([Z[0], Z[1], Z[3]]);
          const tail = 100 - p;
          const top = kind === 0;
          const x = mu * 1000 + (top ? 1 : -1) * z * sd; // thousandths
          return {
            prompt: `${ctx} are normally distributed with mean ${mu} and standard deviation ${sd}. Find the cutoff for the ${top ? 'top' : 'bottom'} ${tail}%. Use $\\Phi(${z / 1000}) = ${p / 100}$.`,
            answer: dec(x, 1000),
            solution: [
              top ? `The top ${tail}% starts where $\\Phi(z) = ${p / 100}$: $z = ${z / 1000}$.` : `By symmetry the bottom ${tail}% ends at $z = -${z / 1000}$.`,
              `$x = \\mu + z\\sigma = ${mu} ${top ? '+' : '-'} ${z / 1000} \\cdot ${sd} = ${decStr(x, 1000)}$`,
            ],
          };
        }
        const lo = mu * 1000 - 1960 * sd; // thousandths
        const hi = mu * 1000 + 1960 * sd;
        return {
          prompt: `${ctx} are normally distributed with mean ${mu} and standard deviation ${sd}. Find the interval, symmetric about the mean, that holds the middle 95%. Use $\\Phi(1.96) = 0.975$.`,
          answer: { kind: 'list', expected: [decStr(lo, 1000), decStr(hi, 1000)] },
          inputHint: 'Two numbers: lower, upper.',
          solution: [`2.5% in each tail, and $\\Phi(1.96) = 0.975$, so $z = \\pm 1.96$.`, `$${mu} \\pm 1.96 \\cdot ${sd}$: from $${decStr(lo, 1000)}$ to $${decStr(hi, 1000)}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'If $X \\sim N(\\mu, \\sigma^2)$ then $Z = \\frac{X - \\mu}{\\sigma}$ is standard normal, so every normal probability comes from one table of $\\Phi(z) = P(Z \\le z)$. Symmetry gives $\\Phi(-z) = 1 - \\Phi(z)$. Landmarks: about 68% within $1\\sigma$, 95% within $1.96\\sigma$, 99.7% within $3\\sigma$. Cutoffs go the other way: $x = \\mu + z\\sigma$.',
    resources: [wiki('Normal_distribution', 'Normal distribution'), wiki('Standard_normal_table', 'Standard normal table'), openIntro, khanStats],
  },
};

// ---------------------------------------------------------------------------
// Chapter 5: statistics

const descriptive: Skill = {
  id: 'prob.desc',
  name: 'Describing data',
  prereqs: ['prob.ev'],
  levels: [
    {
      name: 'mean and median',
      generate(r) {
        const n = r.int(6, 10);
        const xs = Array.from({ length: n }, () => r.int(1, 30));
        const sorted = [...xs].sort((a, b) => a - b);
        if (r.next() < 0.5) {
          const m = new Q(xs.reduce((a, b) => a + b, 0), n);
          return {
            prompt: `Find the mean of: $${xs.join(',\\ ')}$.`,
            answer: num(m),
            solution: [`Sum $= ${xs.reduce((a, b) => a + b, 0)}$, count $= ${n}$, mean $= ${m.tex()}$${m.isInt() ? '' : ` $\\approx ${m.value().toFixed(2)}$`}.`],
          };
        }
        const med = n % 2 ? new Q(sorted[(n - 1) / 2]) : new Q(sorted[n / 2 - 1] + sorted[n / 2], 2);
        return {
          prompt: `Find the median of: $${xs.join(',\\ ')}$.`,
          answer: num(med),
          solution: [`Sort: $${sorted.join(',\\ ')}$.`, n % 2 ? `The middle (${(n + 1) / 2}th) value is $${med.tex()}$.` : `Even count: average the ${n / 2}th and ${n / 2 + 1}th values, $\\frac{${sorted[n / 2 - 1]} + ${sorted[n / 2]}}{2} = ${med.tex()}$.`],
        };
      },
    },
    {
      name: 'variance and standard deviation',
      generate(r) {
        const n = r.int(4, 6);
        let xs: number[];
        do xs = Array.from({ length: n }, () => r.int(1, 15));
        while (xs.reduce((a, b) => a + b, 0) % n !== 0 || new Set(xs).size < 3);
        const m = xs.reduce((a, b) => a + b, 0) / n;
        const ss = xs.reduce((a, x) => a + (x - m) ** 2, 0);
        const sample = r.next() < 0.6;
        const v = new Q(ss, sample ? n - 1 : n);
        return {
          prompt: sample
            ? `Find the sample variance $s^2$ (dividing by $n - 1$) of: $${xs.join(',\\ ')}$.`
            : `These are all ${n} values of a population: $${xs.join(',\\ ')}$. Find the population variance $\\sigma^2$ (dividing by $n$).`,
          answer: num(v),
          solution: [
            `Mean $= ${m}$. Squared deviations: $${xs.map((x) => (x - m) ** 2).join(' + ')} = ${ss}$.`,
            `$${sample ? 's' : '\\sigma'}^2 = \\frac{${ss}}{${sample ? n - 1 : n}} = ${v.tex()}$`,
          ],
        };
      },
    },
    {
      name: 'frequency tables and z-scores',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const k = r.int(4, 5);
          const xs = range(0, k - 1);
          const fs = xs.map(() => r.int(1, 9));
          const total = fs.reduce((a, b) => a + b, 0);
          const s = xs.reduce((a, x, i) => a + x * fs[i], 0);
          return {
            prompt: `Households were asked how many children they have: ${rowTable('\\text{children}', xs, '\\text{households}', fs.map(String))} Find the mean number of children.`,
            answer: num(new Q(s, total)),
            solution: [`Weight each value by its count: $\\frac{${xs.map((x, i) => `${x} \\cdot ${fs[i]}`).join(' + ')}}{${fs.join(' + ')}} = \\frac{${s}}{${total}} = ${new Q(s, total).tex()}$`],
          };
        }
        const mu = r.int(12, 18) * 5;
        const sd = r.pick([4, 5, 8, 10]);
        const k = r.nz(-12, 12);
        const z = new Q(k, 4);
        const x = new Q(mu).add(z.mul(sd));
        if (kind === 1 && x.isInt())
          return {
            prompt: `A test has mean ${mu} and standard deviation ${sd}. What is the z-score of a result of ${x.tex()}?`,
            answer: num(z, decStr(k * 25, 100)),
            solution: [`$z = \\frac{x - \\mu}{\\sigma} = \\frac{${x.tex()} - ${mu}}{${sd}} = ${decStr(k * 25, 100)}$: the result is $${Math.abs(k / 4)}$ standard deviations ${k > 0 ? 'above' : 'below'} the mean.`],
          };
        return {
          prompt: `A test has mean ${mu} and standard deviation ${sd}. Which score has z-score $${decStr(k * 25, 100)}$?`,
          answer: num(x, decStr(Math.round(x.value() * 100), 100)),
          solution: [`$x = \\mu + z\\sigma = ${mu} + (${decStr(k * 25, 100)}) \\cdot ${sd} = ${decStr(Math.round(x.value() * 100), 100)}$`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Mean: the sum over the count. Median: the middle value after sorting (average the two middle ones for an even count); it ignores outliers. Variance: the average squared deviation from the mean; for a sample, divide by $n - 1$ instead of $n$ so it does not underestimate the population variance. A z-score $z = \\frac{x - \\mu}{\\sigma}$ says how many standard deviations a value is from the mean.',
    resources: [openIntro, wiki('Bessel%27s_correction', "Bessel's correction"), khanStats],
  },
};

const SQUARES = [4, 9, 16, 25, 36, 49, 64, 100];

const sampling: Skill = {
  id: 'prob.ci',
  name: 'Sampling and confidence intervals',
  prereqs: ['prob.normal', 'prob.desc'],
  levels: [
    {
      name: 'the sample mean',
      generate(r) {
        const n = r.pick(SQUARES);
        const rt = Math.sqrt(n);
        const kind = r.int(0, 2);
        if (kind === 0) {
          const sd = r.int(2, 40);
          const se = new Q(sd, rt);
          return {
            prompt: `A population has standard deviation ${sd}. What is the standard deviation of the mean of a random sample of ${n}?`,
            answer: num(se),
            solution: [`The standard error is $\\frac{\\sigma}{\\sqrt n} = \\frac{${sd}}{\\sqrt{${n}}} = \\frac{${sd}}{${rt}} = ${se.tex()}$.`],
          };
        }
        if (kind === 1) {
          const sd = r.int(2, 12);
          const m = r.int(1, 9) * 50;
          return {
            prompt: `Items weigh on average ${m} g with standard deviation ${sd} g, independently. What is the standard deviation of the total weight of ${n} items?`,
            answer: num(sd * rt),
            solution: [`Variances add: $\\operatorname{Var}(\\text{total}) = ${n} \\cdot ${sd}^2$, so the SD is $${sd}\\sqrt{${n}} = ${sd * rt}$. (The total grows like $n$ but its spread only like $\\sqrt n$.)`],
          };
        }
        const k = r.int(2, 10);
        const v = new Q(35, 12 * k);
        return {
          prompt: `A fair die has variance $\\frac{35}{12}$. ${k} dice are rolled. What is the variance of the average roll?`,
          answer: num(v),
          solution: [`$\\operatorname{Var}(\\bar X) = \\frac{\\sigma^2}{n} = \\frac{35/12}{${k}} = ${v.tex()}$`],
        };
      },
    },
    {
      name: 'central limit theorem',
      generate(r) {
        const n = r.pick(SQUARES.filter((x) => x >= 25));
        const rt = Math.sqrt(n);
        const se = r.int(1, 5);
        const sd = se * rt;
        const mu = r.int(10, 60) * 5;
        const k = r.nz(-25, 25);
        const z = Math.abs(k) / 10;
        const t = phi4(z);
        const below = k > 0 ? t : 10000 - t;
        const above = r.next() < 0.5;
        const v = above ? 10000 - below : below;
        if (r.next() < 0.5) {
          const c = decStr(mu * 10 + k * se, 10);
          return {
            prompt: `A population has mean ${mu} and standard deviation ${sd}. For a random sample of ${n}, find the approximate probability that the sample mean is ${above ? 'above' : 'below'} ${c}. Use $${phiTex(z)}$.`,
            answer: dec(v, 10000),
            inputHint: 'A decimal, like 0.1234.',
            solution: [
              `By the CLT, $\\bar X \\approx N\\!\\left(${mu}, \\left(\\frac{${sd}}{\\sqrt{${n}}}\\right)^2\\right)$, with standard error $${se}$.`,
              `$z = \\frac{${c} - ${mu}}{${se}} = ${k / 10}$`,
              `$P = ${decStr(v, 10000)}$`,
            ],
          };
        }
        const sdi = r.int(2, 6);
        const mi = r.int(2, 9) * 10;
        const tot = mi * n * 10 + k * sdi * rt;
        return {
          prompt: `Each of ${n} independent items has mean ${mi} and standard deviation ${sdi}. Find the approximate probability that their total is ${above ? 'above' : 'below'} ${decStr(tot, 10)}. Use $${phiTex(z)}$.`,
          answer: dec(v, 10000),
          inputHint: 'A decimal, like 0.1234.',
          solution: [
            `The total has mean $${n} \\cdot ${mi} = ${n * mi}$ and SD $${sdi}\\sqrt{${n}} = ${sdi * rt}$, and is approximately normal by the CLT.`,
            `$z = \\frac{${decStr(tot, 10)} - ${n * mi}}{${sdi * rt}} = ${k / 10}$`,
            `$P = ${decStr(v, 10000)}$`,
          ],
        };
      },
    },
    {
      name: 'confidence intervals',
      generate(r) {
        const lvl = r.pick([
          { c: 90, z: 1645 },
          { c: 95, z: 1960 },
          { c: 99, z: 2576 },
        ]);
        const sd = r.int(2, 30);
        if (r.next() < 0.6) {
          const n = r.pick(SQUARES);
          const rt = Math.sqrt(n);
          const xbar = r.int(20, 200);
          const m = lvl.z * sd; // margin in thousandths, times sqrt(n)
          const lo = new Q(xbar * 1000 * rt - m, 1000 * rt);
          const hi = new Q(xbar * 1000 * rt + m, 1000 * rt);
          const show = (q: Q) => Number(q.value().toFixed(4)).toString();
          return {
            prompt: `A sample of ${n} has mean ${xbar}. The population standard deviation is known to be ${sd}. Find a ${lvl.c}% confidence interval for the population mean. Use $z = ${lvl.z / 1000}$.`,
            answer: { kind: 'list', expected: [lo.toString(), hi.toString()], display: `${show(lo)},\\ ${show(hi)}` },
            inputHint: 'Two numbers: lower, upper. Expressions like 50 - 1.96*3/4 are fine.',
            solution: [`$\\bar x \\pm z\\frac{\\sigma}{\\sqrt n} = ${xbar} \\pm ${lvl.z / 1000} \\cdot \\frac{${sd}}{${rt}}$, margin $${show(new Q(m, 1000 * rt))}$.`, `From $${show(lo)}$ to $${show(hi)}$`],
          };
        }
        const E = r.pick([1, 2, 3, 5]);
        // Smallest n with z·σ/√n ≤ E, i.e. n ≥ (zσ/E)², in exact integer arithmetic.
        const num2 = (lvl.z * sd) ** 2;
        const den2 = (1000 * E) ** 2;
        const n = Math.ceil(num2 / den2 - 1e-12);
        return {
          prompt: `The population standard deviation is ${sd}. How large a sample is needed for a ${lvl.c}% confidence interval for the mean to have margin of error at most ${E}? Use $z = ${lvl.z / 1000}$.`,
          answer: { kind: 'number', expected: `${n}`, integer: true },
          solution: [`Need $z\\frac{\\sigma}{\\sqrt n} \\le ${E}$, so $n \\ge \\left(\\frac{${lvl.z / 1000} \\cdot ${sd}}{${E}}\\right)^2 = ${(num2 / den2).toFixed(2)}$.`, `Round up: $n = ${n}$.`],
          selfCheck: () => (lvl.z * sd) ** 2 <= n * den2 && (lvl.z * sd) ** 2 > (n - 1) * den2,
        };
      },
    },
  ],
  learn: {
    summary:
      'The mean of $n$ independent samples has mean $\\mu$ and standard deviation $\\sigma/\\sqrt n$ (the standard error). The central limit theorem says it is approximately normal for large $n$, whatever the population looks like; the same goes for sums, with mean $n\\mu$ and SD $\\sigma\\sqrt n$. A confidence interval for $\\mu$ is $\\bar x \\pm z\\frac{\\sigma}{\\sqrt n}$, with $z = 1.645, 1.96, 2.576$ for 90%, 95%, 99%.',
    resources: [
      { kind: 'video', title: '3Blue1Brown: But what is the Central Limit Theorem?', url: 'https://www.youtube.com/watch?v=zeJD6dqJ5lo' },
      wiki('Confidence_interval', 'Confidence interval'),
      openIntro,
      seeingTheory,
    ],
  },
};

// ---------------------------------------------------------------------------

export const probabilityChapters: Chapter[] = [
  {
    id: 'prob.ch.basics',
    title: 'Probability basics',
    about: 'Equally likely outcomes and counting, complements, the union rule, and independence. The counting uses combinations and arrangements; Discrete Math’s “Permutations and combinations” section covers them if they are new.',
    why: 'Every later topic, from Bayes to machine learning, is built on these few rules.',
    resources: [grinstead, khanStats, seeingTheory],
    skills: [equally, rules],
    deeper: [],
  },
  {
    id: 'prob.ch.cond',
    title: 'Conditional probability',
    about: 'Updating on information: conditional probability, the multiplication rule, total probability and Bayes’ theorem.',
    why: 'Medical tests, spam filters and any reasoning from evidence run on Bayes’ theorem; intuition gets it wrong surprisingly often.',
    resources: [grinstead, wiki('Bayes%27_theorem', "Bayes' theorem"), seeingTheory],
    skills: [conditional, bayes],
    deeper: [markovChains],
  },
  {
    id: 'prob.ch.rv',
    title: 'Random variables',
    about: 'Expected value and variance, their rules, and the binomial and geometric distributions (which use binomial coefficients).',
    why: 'Expected value is how risks, games, algorithms and insurance are priced; variance is how sure you can be.',
    resources: [grinstead, wiki('Random_variable', 'Random variable'), khanStats],
    skills: [expectation, binomialDist],
    deeper: [indicators, poisson],
  },
  {
    id: 'prob.ch.cont',
    title: 'Continuous distributions',
    about: 'Densities and how to integrate them, the uniform and exponential distributions, and the normal distribution. The density section uses simple definite integrals (Calculus, “Definite integrals”); the normal distribution needs only a table.',
    why: 'Measurements, waiting times and errors are continuous, and the normal distribution shows up wherever many small effects add up.',
    resources: [wiki('Normal_distribution', 'Normal distribution'), grinstead, khanStats],
    skills: [density, normal],
    deeper: [chebyshev],
  },
  {
    id: 'prob.ch.stats',
    title: 'Statistics',
    about: 'Summarising data, the behaviour of sample means, the central limit theorem and confidence intervals.',
    why: 'Going from a sample to a claim about everyone, with an honest error bar, is what statistics is for.',
    resources: [openIntro, khanStats, seeingTheory],
    skills: [descriptive, sampling],
    deeper: [hypothesisTests],
  },
];
