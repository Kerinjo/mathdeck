// Discrete Math: widened levels, new sections and the chapter list.
import type { Chapter, Problem, Rng, Skill } from '../core/types';
import { mix } from './calc-helpers';
import { countability, divideConquer, specialNumbers } from './cs-deeper';
import {
  basicCounting,
  bigO,
  binomial,
  C,
  fmtN,
  functions,
  incExc,
  levin,
  mcs,
  num,
  permComb,
  recurrences,
  relations,
  sequences,
  sets,
  starsBars,
  wiki,
} from './discrete';
import { distinct, fact } from './helpers';

type Gen = (r: Rng) => Problem;

const choice = (options: string[], correct: number): Problem['answer'] => ({ kind: 'choice', options, correct });
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** Count strings over `alphabet` of length n avoiding `bad` (brute force, for self-checks). */
const countStrings = (alphabet: string, n: number, bad: string) => {
  let c = 0;
  const go = (s: string) => {
    if (s.includes(bad)) return;
    if (s.length === n) return void c++;
    for (const ch of alphabet) go(s + ch);
  };
  go('');
  return c;
};

// ---------------------------------------------------------------------------
// Sets and counting: wider levels

const threeSets: Gen = (r) => {
  const [a, b, c] = [r.int(10, 40), r.int(10, 40), r.int(10, 40)];
  const ab = r.int(2, Math.min(a, b) - 4);
  const ac = r.int(2, Math.min(a, c) - 4);
  const bc = r.int(2, Math.min(b, c) - 4);
  const abc = r.int(1, Math.min(ab, ac, bc) - 1);
  const u = a + b + c - ab - ac - bc + abc;
  return {
    prompt: `$|A| = ${a}$, $|B| = ${b}$, $|C| = ${c}$, $|A \\cap B| = ${ab}$, $|A \\cap C| = ${ac}$, $|B \\cap C| = ${bc}$, $|A \\cap B \\cap C| = ${abc}$. Find $|A \\cup B \\cup C|$.`,
    answer: num(u),
    solution: ['Inclusion–exclusion: add the singles, subtract the pairs, add back the triple.', `$${a} + ${b} + ${c} - ${ab} - ${ac} - ${bc} + ${abc} = ${u}$`],
  };
};

const circular: Gen = (r) => {
  const n = r.int(4, 9);
  if (r.next() < 0.5)
    return {
      prompt: `In how many ways can ${n} people sit around a round table, if only who sits next to whom matters (rotations count as the same)?`,
      answer: num(fact(n - 1)),
      solution: [`Fix one person's seat to remove the rotations; arrange the other ${n - 1} freely.`, `$${n - 1}! = ${fmtN(fact(n - 1))}$`],
    };
  return {
    prompt: `In how many ways can ${n} different beads be arranged on a necklace (rotations and flips count as the same)?`,
    answer: num(fact(n - 1) / 2),
    solution: [`Round-table count $${n - 1}!$, then divide by 2 because turning the necklace over gives the same necklace.`, `$\\frac{${n - 1}!}{2} = ${fmtN(fact(n - 1) / 2)}$`],
  };
};

const pigeonMore: Gen = (r) => {
  const k = r.int(2, 6);
  const pool: [string, number, string][] = [
    [`How many people must be in a room to be sure that at least ${k} share a birth month?`, 12 * (k - 1) + 1, `With $12(${k} - 1) = ${12 * (k - 1)}$ people each month could have only ${k - 1}; one more forces ${k}.`],
    [`A drawer has socks in ${k + 1} colours. How many must you take (in the dark) to be sure of a matching pair?`, k + 2, `${k + 1} socks could all differ; the next one must match one of them.`],
    [`How many integers must you pick to be sure two of them have the same remainder mod ${k + 5}?`, k + 6, `There are ${k + 5} possible remainders (pigeonholes), so ${k + 6} integers force a repeat.`],
  ];
  const [q, a, why] = r.pick(pool);
  return { prompt: q, answer: num(a), solution: [why, `Answer: $${a}$`] };
};

const setsDeep: Skill = { ...sets, levels: [sets.levels[0], sets.levels[1], { name: 'cardinalities', generate: mix(sets.levels[2].generate, threeSets) }] };
const permDeep: Skill = { ...permComb, levels: [{ name: 'choose, arrange or sit around a table?', generate: mix(permComb.levels[0].generate, circular) }, permComb.levels[1], permComb.levels[2]] };
const incExcDeep: Skill = { ...incExc, levels: [incExc.levels[0], incExc.levels[1], { name: 'pigeonhole', generate: mix(incExc.levels[2].generate, pigeonMore) }] };

// ---------------------------------------------------------------------------
// Partial orders and equivalence classes

const divisors = (n: number) => range(1, n).filter((d) => n % d === 0);
const BELL = [1, 1, 2, 5, 15, 52, 203];

const posets: Skill = {
  id: 'dm.posets',
  name: 'Partial orders and equivalence classes',
  prereqs: ['dm.relations'],
  levels: [
    {
      name: 'minimal and maximal elements',
      generate(r) {
        const S = distinct(r, r.int(6, 8), 2, 40).sort((a, b) => a - b);
        const wantMin = r.next() < 0.5;
        const ext = S.filter((x) => (wantMin ? !S.some((y) => y !== x && x % y === 0) : !S.some((y) => y !== x && y % x === 0)));
        return {
          prompt: `Order $S = \\{${S.join(', ')}\\}$ by divisibility ($a \\preceq b$ when $a \\mid b$). How many ${wantMin ? 'minimal' : 'maximal'} elements does it have?`,
          answer: num(ext.length),
          solution: [wantMin ? 'A minimal element has no other element of $S$ dividing it.' : 'A maximal element divides no other element of $S$.', `They are $${ext.join(', ')}$: ${ext.length} in total. (A poset can have several; a least or greatest element is unique when it exists.)`],
        };
      },
    },
    {
      name: 'chains and antichains',
      generate(r) {
        const [p, q, s] = r.pick([
          [2, 3, 5],
          [2, 3, 7],
          [2, 5, 7],
        ]);
        const [a, b, c] = [r.int(2, 3), r.int(1, 2), r.int(0, 1)];
        const n = p ** a * q ** b * s ** c;
        const ds = divisors(n);
        const rank = (d: number) => [p, q, s].reduce((acc, pr) => {
          let e = 0;
          while (d % pr === 0) ((d /= pr), e++);
          return acc + e;
        }, 0);
        const layers = range(0, a + b + c).map((k) => ds.filter((d) => rank(d) === k).length);
        const width = Math.max(...layers);
        const wantChain = r.next() < 0.5;
        return {
          prompt: `Consider the divisors of ${n} ordered by divisibility. What is the size of the largest ${wantChain ? 'chain (elements that are pairwise comparable)' : 'antichain (elements that are pairwise incomparable)'}?`,
          answer: num(wantChain ? a + b + c + 1 : width),
          solution: [
            `$${n} = ${[
              [p, a],
              [q, b],
              [s, c],
            ]
              .filter(([, e]) => e)
              .map(([pr, e]) => (e > 1 ? `${pr}^{${e}}` : `${pr}`))
              .join('\\cdot ')}$. Group the divisors by their total number of prime factors: layer sizes $${layers.join(', ')}$.`,
            wantChain
              ? `A chain multiplies in one prime at a time, from $1$ to $${n}$: $${a + b + c + 1}$ elements.`
              : `Each layer is an antichain, and for divisor lattices the largest layer is the largest antichain: $${width}$.`,
          ],
        };
      },
    },
    {
      name: 'equivalence classes',
      generate: mix(
        (r) => {
          const m = r.int(3, 9);
          const n = r.int(m + 2, 40);
          const k = r.int(1, n);
          const size = range(1, n).filter((x) => (x - k) % m === 0).length;
          const askCount = r.next() < 0.5;
          return {
            prompt: `On $\\{1, \\dots, ${n}\\}$, let $x \\sim y$ when $x \\equiv y \\pmod{${m}}$. ${askCount ? 'How many equivalence classes are there?' : `How many elements are in the class of ${k}?`}`,
            answer: num(askCount ? m : size),
            solution: askCount ? [`One class per remainder $0, 1, \\dots, ${m - 1}$, all of them occurring since $${n} \\ge ${m}$.`] : [`The class of ${k} is $\\{${range(1, n).filter((x) => (x - k) % m === 0).join(', ')}\\}$: ${size} elements.`],
          };
        },
        (r) => {
          const n = r.int(2, 6);
          return {
            prompt: `How many different equivalence relations are there on a set with ${n} elements?`,
            answer: num(BELL[n]),
            solution: ['Equivalence relations correspond exactly to partitions of the set into classes.', `Counting partitions of an ${n}-element set gives the Bell number $B_{${n}} = ${BELL[n]}$.`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'A partial order is reflexive, antisymmetric and transitive; divisibility and $\\subseteq$ are the standard examples. Minimal elements have nothing below them (there can be several). A chain is a set of pairwise comparable elements, an antichain a set of pairwise incomparable ones. An equivalence relation splits a set into disjoint classes, and conversely every partition gives an equivalence relation, so they are counted by the Bell numbers.',
    resources: [wiki('Partially_ordered_set', 'Partially ordered set'), wiki('Equivalence_class', 'Equivalence class'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Binomial identities

const identities: Skill = {
  id: 'dm.identities',
  name: 'Binomial identities',
  prereqs: ['dm.binom'],
  levels: [
    {
      name: 'Pascal’s triangle',
      generate(r) {
        const n = r.int(5, 15);
        const k = r.int(1, n - 2);
        const pool: [string, number, string][] = [
          [`\\binom{${n}}{${k}} + \\binom{${n}}{${k + 1}}`, C(n + 1, k + 1), `Pascal's rule: $\\binom{n}{k} + \\binom{n}{k+1} = \\binom{n+1}{k+1} = \\binom{${n + 1}}{${k + 1}}$.`],
          [`\\displaystyle\\sum_{k=0}^{${n}} \\binom{${n}}{k}`, 2 ** n, `Every subset of an ${n}-element set is counted once: $2^{${n}}$.`],
          [`\\displaystyle\\sum_{k=0}^{${n}} (-1)^k\\binom{${n}}{k}`, 0, 'Put $x = -1$ in $(1 + x)^n$: $(1 - 1)^n = 0$.'],
          [`\\displaystyle\\sum_{k \\text{ even}} \\binom{${n}}{k}`, 2 ** (n - 1), `Even and odd subsets are equally many (add the two previous identities): $2^{${n - 1}}$.`],
        ];
        const [tex, v, why] = r.pick(pool);
        return { prompt: `Evaluate $${tex}$.`, answer: num(v), solution: [why, `$= ${fmtN(v)}$`] };
      },
    },
    {
      name: 'hockey stick and Vandermonde',
      generate(r) {
        if (r.next() < 0.5) {
          const k = r.int(1, 4);
          const n = r.int(k + 3, 14);
          const v = C(n + 1, k + 1);
          return {
            prompt: `Evaluate $\\displaystyle\\sum_{i=${k}}^{${n}} \\binom{i}{${k}}$.`,
            answer: num(v),
            hint: 'Draw it in Pascal’s triangle: a diagonal run of entries.',
            solution: [`Hockey-stick identity: $\\sum_{i=k}^{n}\\binom{i}{k} = \\binom{n+1}{k+1}$ (choose ${k + 1} from ${n + 1}, sorted by the largest chosen element).`, `$\\binom{${n + 1}}{${k + 1}} = ${fmtN(v)}$`],
            selfCheck: () => range(k, n).reduce((s, i) => s + C(i, k), 0) === v,
          };
        }
        const [m, p] = [r.int(3, 9), r.int(3, 9)];
        const k = r.int(2, Math.min(m, p));
        const v = C(m + p, k);
        return {
          prompt: `Evaluate $\\displaystyle\\sum_{i=0}^{${k}} \\binom{${m}}{i}\\binom{${p}}{${k} - i}$.`,
          answer: num(v),
          solution: [`Vandermonde: choosing ${k} people from ${m} women and ${p} men, split by the number of women $i$.`, `$\\binom{${m + p}}{${k}} = ${fmtN(v)}$`],
          selfCheck: () => range(0, k).reduce((s, i) => s + C(m, i) * C(p, k - i), 0) === v,
        };
      },
    },
    {
      name: 'weighted sums',
      generate(r) {
        const n = r.int(4, 12);
        const pool: [string, number, string][] = [
          [`\\displaystyle\\sum_{k=0}^{${n}} k\\binom{${n}}{k}`, n * 2 ** (n - 1), `Count (committee, chair) pairs: pick the chair first ($${n}$ ways), then any subset of the rest: $${n}\\cdot 2^{${n - 1}}$. (Or differentiate $(1 + x)^n$.)`],
          [`\\displaystyle\\sum_{k=0}^{${n}} \\binom{${n}}{k}^{2}`, C(2 * n, n), `$\\binom{n}{k}^2 = \\binom{n}{k}\\binom{n}{n-k}$, then Vandermonde: $\\binom{${2 * n}}{${n}}$.`],
          [`\\displaystyle\\sum_{k=0}^{${n}} \\binom{${n}}{k}2^{k}`, 3 ** n, `Binomial theorem with $x = 2$: $(1 + 2)^{${n}} = 3^{${n}}$.`],
        ];
        const [tex, v, why] = r.pick(pool);
        return { prompt: `Evaluate $${tex}$.`, answer: num(v), inputHint: 'An expression like 5*2^4 is fine.', solution: [why, `$= ${fmtN(v)}$`] };
      },
    },
  ],
  learn: {
    summary:
      'Pascal: $\\binom{n}{k} + \\binom{n}{k+1} = \\binom{n+1}{k+1}$. Plugging numbers into $(1 + x)^n = \\sum\\binom{n}{k}x^k$ gives row sums ($x = 1$: $2^n$; $x = -1$: $0$; $x = 2$: $3^n$). Hockey stick: $\\sum_{i=k}^n\\binom{i}{k} = \\binom{n+1}{k+1}$. Vandermonde: $\\sum_i\\binom{m}{i}\\binom{p}{k-i} = \\binom{m+p}{k}$. The best proofs are double counting: count one set in two ways.',
    resources: [levin('sec_comb-proofs', 'Combinatorial Proofs'), wiki('Pascal%27s_triangle', "Pascal's triangle"), wiki('Hockey-stick_identity', 'Hockey-stick identity')],
  },
};

// ---------------------------------------------------------------------------
// Setting up recurrences

const fib = (n: number): number => (n <= 2 ? 1 : fib(n - 1) + fib(n - 2));

const modeling: Skill = {
  id: 'dm.modeling',
  name: 'Setting up recurrences',
  prereqs: ['dm.seq'],
  levels: [
    {
      name: 'Fibonacci in disguise',
      generate(r) {
        const n = r.int(5, 14);
        const pool: [string, number, string][] = [
          [`In how many ways can a $2\\times ${n}$ strip be tiled with $1\\times2$ dominoes?`, fib(n + 1), `The left end is either one vertical domino (leaving $2\\times${n - 1}$) or two stacked horizontal ones (leaving $2\\times${n - 2}$): $t_n = t_{n-1} + t_{n-2}$, $t_1 = 1$, $t_2 = 2$.`],
          [`You climb ${n} stairs taking 1 or 2 steps at a time. How many different ways are there?`, fib(n + 1), `The last move is a 1-step (from stair ${n - 1}) or a 2-step (from ${n - 2}): $s_n = s_{n-1} + s_{n-2}$, $s_1 = 1$, $s_2 = 2$.`],
          [`How many binary strings of length ${n} have no two consecutive 1s?`, fib(n + 2), `A valid string ends in 0 (any valid string of length $n - 1$ before it) or in 01 (any valid string of length $n - 2$): $a_n = a_{n-1} + a_{n-2}$, $a_1 = 2$, $a_2 = 3$.`],
        ];
        const [q, v, why] = r.pick(pool);
        return { prompt: q, answer: num(v), solution: [why, `Iterating: $${v}$ (a Fibonacci number).`], selfCheck: () => !q.includes('binary') || countStrings('01', n, '11') === v };
      },
    },
    {
      name: 'other forbidden patterns',
      generate(r) {
        const n = r.int(4, 9);
        const kind = r.int(0, 2);
        if (kind === 0) {
          const a = [1, 3];
          for (let i = 2; i <= n; i++) a.push(2 * a[i - 1] + 2 * a[i - 2]);
          return {
            prompt: `How many strings of length ${n} over $\\{a, b, c\\}$ contain no two consecutive $a$s?`,
            answer: num(a[n]),
            solution: ['Split on the last letter: $b$ or $c$ after any valid string ($2a_{n-1}$), or $a$, which must follow $b$ or $c$ ($2a_{n-2}$).', `$a_n = 2a_{n-1} + 2a_{n-2}$ with $a_0 = 1$, $a_1 = 3$: $${a.slice(0, n + 1).join(', ')}$`],
            selfCheck: () => countStrings('abc', n, 'aa') === a[n],
          };
        }
        if (kind === 1) {
          const a = [1, 2, 4];
          for (let i = 3; i <= n; i++) a.push(a[i - 1] + a[i - 2] + a[i - 3]);
          return {
            prompt: `How many binary strings of length ${n} contain no three consecutive 0s?`,
            answer: num(a[n]),
            solution: ['A valid string ends in 1, 10 or 100 after a shorter valid string.', `$a_n = a_{n-1} + a_{n-2} + a_{n-3}$ with $a_0 = 1$, $a_1 = 2$, $a_2 = 4$: $${a.slice(0, n + 1).join(', ')}$`],
            selfCheck: () => countStrings('01', n, '000') === a[n],
          };
        }
        const k = r.int(2, 3);
        const a = [1, 1];
        for (let i = 2; i <= n; i++) a.push(a[i - 1] + k * a[i - 2]);
        return {
          prompt: `A $1\\times ${n}$ strip is tiled with $1\\times1$ squares (one colour) and $1\\times2$ dominoes (${k} colours). How many tilings are there?`,
          answer: num(a[n]),
          solution: [`The last tile is a square (after a tiling of length $n - 1$) or a domino in one of ${k} colours (after length $n - 2$).`, `$t_n = t_{n-1} + ${k}t_{n-2}$, $t_0 = t_1 = 1$: $${a.slice(0, n + 1).join(', ')}$`],
        };
      },
    },
    {
      name: 'classic recurrences',
      generate(r) {
        const n = r.int(3, 12);
        const pool: [string, number, string][] = [
          [`What is the smallest number of moves to solve the Tower of Hanoi with ${n} discs?`, 2 ** n - 1, `Move $n - 1$ discs aside, the largest disc, then the $n - 1$ back on top: $h_n = 2h_{n-1} + 1$, $h_1 = 1$, so $h_n = 2^n - 1$.`],
          [`Into how many regions do ${n} lines in general position (no two parallel, no three through one point) divide the plane?`, (n * (n + 1)) / 2 + 1, `The $k$-th line crosses the previous $k - 1$ lines, cutting through $k$ regions and adding $k$: $r_n = r_{n-1} + n$, $r_0 = 1$, so $r_n = \\frac{n(n+1)}{2} + 1$.`],
          [`${n} points on a circle are joined by all chords, with no three chords meeting inside. Into how many regions is the disc divided?`, 1 + C(n, 2) + C(n, 4), 'Each chord adds a region, and so does each interior crossing (determined by 4 points): $1 + \\binom{n}{2} + \\binom{n}{4}$. (The pattern 1, 2, 4, 8, 16 breaks at $n = 6$: 31, not 32.)'],
        ];
        const [q, v, why] = r.pick(pool);
        return { prompt: q, answer: num(v), solution: [why, `$${fmtN(v)}$`] };
      },
    },
  ],
  learn: {
    summary:
      'To count objects of size $n$ recursively, split on how the object ends (or begins): each case is a smaller object of the same kind. That gives a recurrence plus initial values, which you can iterate or solve. Tilings by $1\\times1$ and $1\\times2$ pieces, staircases and strings without "11" all give Fibonacci numbers; other forbidden patterns give other linear recurrences.',
    resources: [levin('sec_recurrence', 'Solving Recurrence Relations'), wiki('Tower_of_Hanoi', 'Tower of Hanoi'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Counting loop iterations

type Loop = { code: string[]; count: (n: number) => number; why: (n: number) => string; theta: string; general: string };
const LOOPS_BASIC: Loop[] = [
  {
    code: ['\\textbf{for } i = 1 \\textbf{ to } n', '\\quad \\textbf{for } j = 1 \\textbf{ to } n', '\\quad\\quad x \\gets x + 1'],
    count: (n) => n * n,
    why: (n) => `Independent loops: $${n}\\cdot ${n}$.`,
    theta: 'n^2',
    general: '$n$ iterations of an $n$-step loop: $n^2$.',
  },
  {
    code: ['\\textbf{for } i = 1 \\textbf{ to } n', '\\quad \\textbf{for } j = i \\textbf{ to } n', '\\quad\\quad x \\gets x + 1'],
    count: (n) => (n * (n + 1)) / 2,
    why: (n) => `For each $i$ the inner loop runs $${n} - i + 1$ times: $${n} + ${n - 1} + \\dots + 1 = \\frac{${n}\\cdot ${n + 1}}{2}$.`,
    theta: 'n^2',
    general: '$n + (n - 1) + \\dots + 1 = \\frac{n(n+1)}{2}$.',
  },
  {
    code: ['\\textbf{for } i = 1 \\textbf{ to } n', '\\quad \\textbf{for } j = 1 \\textbf{ to } i - 1', '\\quad\\quad x \\gets x + 1'],
    count: (n) => (n * (n - 1)) / 2,
    why: (n) => `The inner loop runs $i - 1$ times: $0 + 1 + \\dots + ${n - 1} = \\binom{${n}}{2}$.`,
    theta: 'n^2',
    general: '$0 + 1 + \\dots + (n - 1) = \\frac{n(n-1)}{2}$.',
  },
];
const LOOPS_LOG: Loop[] = [
  {
    code: ['i \\gets 1', '\\textbf{while } i < n', '\\quad i \\gets 2i', '\\quad x \\gets x + 1'],
    count: (n) => {
      let c = 0;
      for (let i = 1; i < n; i *= 2) c++;
      return c;
    },
    why: (n) => `$i$ takes the values $1, 2, 4, \\dots$ while below ${n}: that is $\\lceil\\log_2 ${n}\\rceil$ iterations.`,
    theta: '\\log n',
    general: 'Doubling from 1 reaches $n$ after about $\\log_2 n$ steps.',
  },
  {
    code: ['m \\gets n', '\\textbf{while } m > 1', '\\quad m \\gets \\lfloor m/2 \\rfloor', '\\quad x \\gets x + 1'],
    count: (n) => {
      let c = 0;
      for (let m = n; m > 1; m = Math.floor(m / 2)) c++;
      return c;
    },
    why: (n) => `Halving ${n} until it reaches 1 takes $\\lfloor\\log_2 ${n}\\rfloor$ steps.`,
    theta: '\\log n',
    general: 'Halving $n$ down to 1 takes about $\\log_2 n$ steps.',
  },
  {
    code: ['\\textbf{for } i = 1 \\textbf{ to } n', '\\quad j \\gets 1', '\\quad \\textbf{while } j < i', '\\quad\\quad j \\gets 2j', '\\quad\\quad x \\gets x + 1'],
    count: (n) => {
      let c = 0;
      for (let i = 1; i <= n; i++) for (let j = 1; j < i; j *= 2) c++;
      return c;
    },
    why: () => 'For each $i$ the inner loop runs $\\lceil\\log_2 i\\rceil$ times; add these up for $i = 1, \\dots, n$.',
    theta: 'n\\log n',
    general: '$\\sum_{i=1}^{n}\\lceil\\log_2 i\\rceil$ is about $n\\log_2 n$.',
  },
];
const LOOPS_HARD: Loop[] = [
  {
    code: ['\\textbf{for } i = 1 \\textbf{ to } n', '\\quad \\textbf{for } j = i + 1 \\textbf{ to } n', '\\quad\\quad \\textbf{for } k = j + 1 \\textbf{ to } n', '\\quad\\quad\\quad x \\gets x + 1'],
    count: (n) => C(n, 3),
    why: (n) => `Each run corresponds to a choice $i < j < k$ from $\\{1, \\dots, ${n}\\}$: $\\binom{${n}}{3}$.`,
    theta: 'n^3',
    general: '$\\binom{n}{3} = \\frac{n(n-1)(n-2)}{6}$.',
  },
  {
    code: ['\\textbf{for } i = 1 \\textbf{ to } n', '\\quad \\textbf{for } j = 1 \\textbf{ to } n \\textbf{ step } i', '\\quad\\quad x \\gets x + 1'],
    count: (n) => range(1, n).reduce((s, i) => s + Math.floor((n - 1) / i) + 1, 0),
    why: (n) => `For each $i$ the inner loop runs $\\lfloor (${n} - 1)/i \\rfloor + 1$ times; the sum is about $n\\ln n$ (harmonic series).`,
    theta: 'n\\log n',
    general: '$\\sum_{i=1}^{n} \\frac{n}{i} = nH_n \\approx n\\ln n$.',
  },
  {
    code: ['\\textbf{for } i = 1 \\textbf{ to } n', '\\quad \\textbf{for } j = 1 \\textbf{ to } i^{2}', '\\quad\\quad x \\gets x + 1'],
    count: (n) => range(1, n).reduce((s, i) => s + i * i, 0),
    why: (n) => `$1^2 + 2^2 + \\dots + ${n}^2 = \\frac{${n}\\cdot ${n + 1}\\cdot ${2 * n + 1}}{6}$.`,
    theta: 'n^3',
    general: '$\\sum_{i=1}^{n} i^2 = \\frac{n(n+1)(2n+1)}{6}$.',
  },
];
const THETAS = ['\\log n', 'n', 'n\\log n', 'n^2', 'n^3'];
const codeTex = (lines: string[]) => `$$\\begin{array}{l} ${lines.join(' \\\\ ')} \\end{array}$$`;

const loopLevel =
  (pool: Loop[], lo: number, hi: number): Gen =>
  (r) => {
    const L = r.pick(pool);
    const askTheta = r.next() < 0.3;
    const n = r.int(lo, hi);
    if (askTheta)
      return {
        prompt: `How many times does $x \\gets x + 1$ run, as a function of $n$? ${codeTex(L.code)}`,
        answer: choice(THETAS.map((t) => `$\\Theta(${t})$`), THETAS.indexOf(L.theta)),
        solution: [L.general, `So $\\Theta(${L.theta})$.`],
      };
    return {
      prompt: `With $n = ${n}$, how many times does $x \\gets x + 1$ run? ${codeTex(L.code)}`,
      answer: num(L.count(n)),
      solution: [L.why(n), `$${fmtN(L.count(n))}$`],
    };
  };

const loops: Skill = {
  id: 'dm.loops',
  name: 'Counting loop iterations',
  prereqs: ['dm.bigo'],
  levels: [
    { name: 'nested loops', generate: loopLevel(LOOPS_BASIC, 5, 30) },
    { name: 'doubling and halving', generate: loopLevel(LOOPS_LOG, 5, 200) },
    { name: 'triangular and harmonic sums', generate: loopLevel(LOOPS_HARD, 5, 20) },
  ],
  learn: {
    summary:
      'Count iterations from the inside out: an inner loop whose length depends on the outer variable gives a sum, such as $\\sum_{i=1}^{n}(n - i + 1) = \\frac{n(n+1)}{2}$. Loops that double or halve a variable run $\\Theta(\\log n)$ times. Three strictly increasing indices $i < j < k$ give $\\binom{n}{3}$. A loop with step $i$ runs about $n/i$ times, and $\\sum n/i \\approx n\\ln n$.',
    resources: [wiki('Analysis_of_algorithms', 'Analysis of algorithms'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Going deeper: generating functions

/** Polynomial product (coefficients from x^0). */
const pmul = (a: number[], b: number[]) => {
  const out = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] += x * y)));
  return out;
};

const genFunctions: Skill = {
  id: 'dm.genfunc',
  name: 'Generating functions',
  prereqs: ['dm.stars'],
  levels: [
    {
      name: 'coefficients of 1/(1 − x)ᵐ',
      generate(r) {
        const m = r.int(2, 5);
        const k = r.int(3, 10);
        if (r.next() < 0.3) {
          const c = r.int(2, 3);
          return {
            prompt: `Find the coefficient of $${k === 1 ? 'x' : `x^{${k}}`}$ in $\\dfrac{1}{1 - ${c}x}$.`,
            answer: num(c ** k),
            solution: [`$\\frac{1}{1 - ${c}x} = \\sum (${c}x)^j$, a geometric series.`, `Coefficient: $${c}^{${k}} = ${fmtN(c ** k)}$`],
          };
        }
        return {
          prompt: `Find the coefficient of $${k === 1 ? 'x' : `x^{${k}}`}$ in $\\dfrac{1}{(1 - x)^{${m}}}$.`,
          answer: num(C(k + m - 1, m - 1)),
          solution: [`$\\frac{1}{(1-x)^{${m}}} = \\left(\\sum x^j\\right)^{${m}}$, so the coefficient counts solutions of $x_1 + \\dots + x_{${m}} = ${k}$ in non-negative integers.`, `Stars and bars: $\\binom{${k + m - 1}}{${m - 1}} = ${fmtN(C(k + m - 1, m - 1))}$`],
        };
      },
    },
    {
      name: 'products of polynomials',
      generate(r) {
        if (r.next() < 0.5) {
          const n = r.int(2, 5);
          const k = r.int(1, 2 * n - 1);
          let p = [1];
          for (let i = 0; i < n; i++) p = pmul(p, [1, 1, 1]);
          return {
            prompt: `Find the coefficient of $${k === 1 ? 'x' : `x^{${k}}`}$ in $(1 + x + x^{2})^{${n}}$.`,
            answer: num(p[k]),
            solution: [`Equivalently: the number of ways ${n} people can each give 0, 1 or 2 coins so the total is ${k}.`, `Multiplying out (or using trinomial coefficients): $${p[k]}$`],
          };
        }
        const [m, q] = [r.int(3, 8), r.int(1, 4)];
        const k = r.int(1, Math.min(m + q, 6));
        let a = [1];
        for (let i = 0; i < m; i++) a = pmul(a, [1, 1]);
        let b = [1];
        for (let i = 0; i < q; i++) b = pmul(b, [1, -1]);
        const c = pmul(a, b)[k] ?? 0;
        return {
          prompt: `Find the coefficient of $${k === 1 ? 'x' : `x^{${k}}`}$ in $(1 + x)^{${m}}(1 - x)^{${q}}$.`,
          answer: { kind: 'number', expected: `${c}` },
          solution: [`Convolve: $\\sum_i \\binom{${m}}{i}\\binom{${q}}{${k} - i}(-1)^{${k} - i}$.`, `$= ${c}$`],
        };
      },
    },
    {
      name: 'counting with generating functions',
      generate(r) {
        if (r.next() < 0.5) {
          const coins = r.pick([
            [1, 2, 5],
            [1, 5, 10],
            [2, 3, 5],
            [1, 3, 4],
          ]);
          const total = r.int(10, 30);
          const ways = Array(total + 1).fill(0);
          ways[0] = 1;
          for (const c of coins) for (let v = c; v <= total; v++) ways[v] += ways[v - c];
          return {
            prompt: `In how many ways can you make ${total} from coins worth ${coins.join(', ')} (unlimited supply, order does not matter)?`,
            answer: num(ways[total]),
            solution: [`The answer is the coefficient of $x^{${total}}$ in $${coins.map((c) => `\\frac{1}{1 - x^{${c}}}`).join('')}$.`, `Building it up one coin type at a time: $${ways[total]}$`],
          };
        }
        const d = r.int(2, 3);
        const s = r.int(d + 1, 6 * d - 1);
        let p = [0, 1, 1, 1, 1, 1, 1];
        let q = [1];
        for (let i = 0; i < d; i++) q = pmul(q, p);
        p = q;
        return {
          prompt: `In how many ways can ${d} distinguishable dice show a total of ${s}?`,
          answer: num(p[s]),
          solution: [`The coefficient of $x^{${s}}$ in $(x + x^2 + \\dots + x^6)^{${d}}$.`, `$${p[s]}$ (out of $6^{${d}} = ${6 ** d}$ outcomes)`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Encode a sequence $a_0, a_1, \\dots$ as $\\sum a_kx^k$. Multiplying generating functions convolves sequences, which counts combined choices: the coefficient of $x^n$ in $\\prod_c \\frac{1}{1 - x^c}$ counts ways to make $n$ from coins $c$. Key series: $\\frac{1}{1 - x} = \\sum x^k$ and $\\frac{1}{(1 - x)^m} = \\sum\\binom{k + m - 1}{m - 1}x^k$.',
    resources: [levin('sec_addtops-genfun', 'Generating Functions'), wiki('Generating_function', 'Generating function'), mcs],
  },
};

// ---------------------------------------------------------------------------

export const discreteChapters: Chapter[] = [
  {
    id: 'dm.ch.sets',
    title: 'Sets, functions and relations',
    about: 'Set operations and sizes, injective and surjective functions, relations, partial orders and equivalence classes.',
    why: 'This is the vocabulary of all of mathematics and of databases, type systems and data structures.',
    resources: [levin('sec_intro-sets', 'Sets'), levin('sec_intro-functions', 'Functions'), mcs],
    skills: [setsDeep, functions, relations, posets],
    deeper: [countability],
  },
  {
    id: 'dm.ch.counting',
    title: 'Counting',
    about: 'Sum and product rules, permutations and combinations, the binomial theorem and binomial identities, inclusion–exclusion, pigeonhole, and stars and bars.',
    why: 'Counting is how you size search spaces, analyse algorithms, estimate collisions and compute probabilities.',
    resources: [levin('ch_counting', 'Counting'), mcs],
    skills: [basicCounting, permDeep, binomial, identities, incExcDeep, starsBars],
    deeper: [specialNumbers, genFunctions],
  },
  {
    id: 'dm.ch.recurrences',
    title: 'Recurrences',
    about: 'Recursively defined sequences, setting up recurrences for counting problems, and closed formulas for linear recurrences.',
    why: 'Running times of recursive algorithms are recurrences, and so are many counting problems.',
    resources: [levin('sec_recurrence', 'Solving Recurrence Relations'), levin('ch_sequences', 'Sequences')],
    skills: [sequences, modeling, recurrences],
    deeper: [],
  },
  {
    id: 'dm.ch.asymptotics',
    title: 'Asymptotics',
    about: 'Big-O, Θ and the growth hierarchy, counting loop iterations, and the master theorem for divide-and-conquer recurrences.',
    why: 'The language of algorithm analysis: how running time scales with input size.',
    resources: [wiki('Big_O_notation', 'Big O notation'), wiki('Master_theorem_(analysis_of_algorithms)', 'Master theorem (analysis of algorithms)'), mcs],
    skills: [bigO, loops],
    deeper: [divideConquer],
  },
];
