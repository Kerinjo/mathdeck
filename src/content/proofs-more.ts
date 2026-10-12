// Proofs: proof by cases, counterexamples, more induction families, and the chapter list.
import type { Chapter, Problem, Rng, Skill } from '../core/types';
import { mix } from './calc-helpers';
import { pigeonhole, structural } from './logic-deeper';
import { bookOfProof, contradiction, contrapositive, direct, functions, induction, levin, mcs, mod, prove, range, setProofs, strong, wiki } from './proofs';

type Gen = (r: Rng) => Problem;

const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const num = (v: number): Problem['answer'] => ({ kind: 'number', expected: `${v}`, integer: true });
const setTex = (xs: number[]) => `\\{${xs.join(', ')}\\}`;
/** "0, 1, 2" for short ranges, "0, 1, …, 7" for longer ones. */
const upTo = (a: number, b: number) => (b - a <= 3 ? range(a, b).join(', ') : `${a}, ${a + 1}, \\dots, ${b}`);

// ---------------------------------------------------------------------------
// Proof by cases

/** Residues of n^k mod m, for n = 0..m−1. */
const powerResidues = (k: number, m: number) => range(0, m - 1).map((n) => mod(n ** k, m));
const CASE_FAMILIES: [number, number][] = [
  [2, 3],
  [2, 4],
  [2, 5],
  [2, 8],
  [3, 7],
  [3, 9],
  [4, 5],
  [4, 16],
];

const cases: Skill = {
  id: 'proofs.cases',
  name: 'Proof by cases',
  prereqs: ['proofs.direct'],
  levels: [
    {
      name: 'powers modulo m',
      generate(r) {
        const [k, m] = r.pick(CASE_FAMILIES);
        const res = powerResidues(k, m);
        const S = [...new Set(res)].sort((a, b) => a - b);
        const pw = k === 2 ? 'n^2' : `n^${k}`;
        return prove(
          `for every integer $n$, the remainder of $${pw}$ divided by $${m}$ is one of $${S.join(', ')}$.`,
          [
            `Every integer has exactly one remainder $${upTo(0, m - 1)}$ mod ${m}; take the cases one at a time. If $n \\equiv r \\pmod{${m}}$ then $${pw} \\equiv r^{${k}} \\pmod{${m}}$.`,
            `$$${range(0, m - 1)
              .map((rr) => `${rr}^{${k}} \\equiv ${res[rr]}`)
              .join(',\\quad ')} \\pmod{${m}}$$`,
            `In every case the remainder lies in $${setTex(S)}$. $\\blacksquare$`,
            m >= 8 ? `(Shortcut: $r$ and $${m} - r$ give the same ${k % 2 ? 'answer up to sign' : 'answer'}, so half the cases suffice.)` : '',
          ].filter(Boolean),
          () => range(-50, 50).every((n) => S.includes(mod(n ** k, m))),
        );
      },
    },
    {
      name: 'what squares cannot be',
      generate: mix(
        (r) => {
          const [m, bad] = r.pick([
            [4, 3],
            [8, 3],
            [8, 6],
            [8, 7],
          ] as [number, number][]);
          const sq = [...new Set(powerResidues(2, m))].sort((a, b) => a - b);
          const sums = [...new Set(sq.flatMap((a) => sq.map((b) => (a + b) % m)))].sort((a, b) => a - b);
          return prove(
            `no integer that leaves remainder $${bad}$ when divided by $${m}$ is a sum of two squares.`,
            [
              `Squares mod ${m} can only be $${sq.join(', ')}$ (check the cases $n \\equiv 0, \\dots, ${m - 1}$).`,
              `So $x^2 + y^2 \\bmod ${m}$ is a sum of two of these: one of $${sums.join(', ')}$.`,
              `$${bad}$ is not among them, so no $x^2 + y^2$ leaves remainder $${bad}$. $\\blacksquare$`,
            ],
            () => !sums.includes(bad) && range(0, 30).every((x) => range(0, 30).every((y) => (x * x + y * y) % m !== bad)),
          );
        },
        () =>
          prove('no integer of the form $8k + 7$ is a sum of three squares.', [
            'Squares mod 8 are $0, 1$ or $4$ (cases $n \\equiv 0, \\dots, 7$: $0, 1, 4, 1, 0, 1, 4, 1$).',
            'A sum of three of these is at most $4 + 4 + 4 = 12$; checking all combinations, the possible remainders are $0, 1, 2, 3, 4, 5, 6$, never $7$.',
            'So $x^2 + y^2 + z^2 \\not\\equiv 7 \\pmod 8$. $\\blacksquare$',
          ], () => range(0, 12).every((x) => range(0, 12).every((y) => range(0, 12).every((z) => (x * x + y * y + z * z) % 8 !== 7)))),
        (r) => {
          const p = r.pick([3, 5, 7]);
          return prove(`if $${p} \\nmid n$, then $${p} \\mid n^{${p - 1}} - 1$.`, [
            `Cases: $n \\equiv ${upTo(1, p - 1)} \\pmod{${p}}$ (the case $0$ is excluded).`,
            `$$${range(1, p - 1)
              .map((a) => `${a}^{${p - 1}} = ${a ** (p - 1)} \\equiv ${mod(a ** (p - 1), p)}`)
              .join(',\\quad ')} \\pmod{${p}}$$`,
            `So $n^{${p - 1}} \\equiv 1$ in every case, i.e. $${p} \\mid n^{${p - 1}} - 1$. $\\blacksquare$ (This is Fermat's little theorem for $p = ${p}$.)`,
          ], () => range(1, 60).filter((n) => n % p).every((n) => (n ** (p - 1) - 1) % p === 0));
        },
      ),
    },
    {
      name: 'signs, absolute values, max and min',
      generate(r) {
        const pool: (() => Problem)[] = [
          () =>
            prove('for all real $x, y$: $|x + y| \\le |x| + |y|$.', [
              'Case 1: $x + y \\ge 0$. Then $|x + y| = x + y \\le |x| + |y|$, since $x \\le |x|$ and $y \\le |y|$.',
              'Case 2: $x + y < 0$. Then $|x + y| = -x - y \\le |x| + |y|$, since $-x \\le |x|$ and $-y \\le |y|$.',
              'Both cases give the inequality. $\\blacksquare$',
            ]),
          () =>
            prove('for all real $a, b$: $\\max(a, b) = \\dfrac{a + b + |a - b|}{2}$.', [
              'Case $a \\ge b$: $|a - b| = a - b$, so the right side is $\\frac{a + b + a - b}{2} = a = \\max(a, b)$.',
              'Case $a < b$: $|a - b| = b - a$, so the right side is $\\frac{a + b + b - a}{2} = b = \\max(a, b)$. $\\blacksquare$',
            ]),
          () =>
            prove('for all real $x, y$: $|xy| = |x|\\,|y|$.', [
              'Split on the signs. If $x, y \\ge 0$: $xy \\ge 0$, so $|xy| = xy = |x||y|$.',
              'If $x \\ge 0 > y$: $xy \\le 0$, so $|xy| = -xy = x(-y) = |x||y|$. The case $y \\ge 0 > x$ is symmetric.',
              'If $x, y < 0$: $xy > 0$, so $|xy| = xy = (-x)(-y) = |x||y|$. $\\blacksquare$',
            ]),
          () => {
            const c = r.int(1, 9);
            return prove(`for every real $x$: $|x - ${c}| + |x + ${c}| \\ge ${2 * c}$.`, [
              `Case $x \\ge ${c}$: the sum is $(x - ${c}) + (x + ${c}) = 2x \\ge ${2 * c}$.`,
              `Case $-${c} \\le x < ${c}$: the sum is $(${c} - x) + (x + ${c}) = ${2 * c}$.`,
              `Case $x < -${c}$: the sum is $(${c} - x) + (-x - ${c}) = -2x > ${2 * c}$. $\\blacksquare$`,
            ], () => range(-40, 40).every((x) => Math.abs(x - c) + Math.abs(x + c) >= 2 * c));
          },
          () =>
            prove('the product of any two consecutive integers is even.', [
              'Let the integers be $n$ and $n + 1$.',
              'Case $n$ even: $n = 2k$, so $n(n+1) = 2k(n+1)$ is even.',
              'Case $n$ odd: then $n + 1$ is even, $n + 1 = 2k$, so $n(n+1) = 2kn$ is even. $\\blacksquare$',
            ]),
        ];
        return r.pick(pool)();
      },
    },
  ],
  learn: {
    summary:
      'When a statement is easy once you know a little more (the remainder of $n$, the sign of $x$, which of $a, b$ is larger), split into cases that cover every possibility and prove each one. Remainders mod $m$ give exactly $m$ cases; signs give two or three. Say explicitly why the cases are exhaustive. Remainder arguments are also the standard way to show something is impossible, e.g. that $4k + 3$ is never a sum of two squares.',
    resources: [bookOfProof, levin('sec_logic-proofs', 'Proofs'), wiki('Proof_by_exhaustion', 'Proof by exhaustion')],
  },
};

// ---------------------------------------------------------------------------
// Counterexamples (gradable: find the smallest one)

const smallest = (from: number, ok: (n: number) => boolean) => {
  let n = from;
  while (ok(n)) n++;
  return n;
};
const primorialPlusOne = (k: number) => {
  const ps: number[] = [];
  for (let n = 2; ps.length < k; n++) if (isPrime(n)) ps.push(n);
  return ps.reduce((a, b) => a * b, 1) + 1;
};
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const C = (n: number, k: number) => Math.round(fact(n) / (fact(k) * fact(n - k)));

const CLAIMS: { claim: string; from: number; holds: (n: number) => boolean; show: (n: number) => string }[] = [
  { claim: '$n^2 + n + 41$ is prime for every integer $n \\ge 0$', from: 0, holds: (n) => isPrime(n * n + n + 41), show: (n) => `$${n}^2 + ${n} + 41 = ${n * n + n + 41} = 41\\cdot ${(n * n + n + 41) / 41}$` },
  { claim: '$2^n - 1$ is prime for every prime $n$', from: 2, holds: (n) => !isPrime(n) || isPrime(2 ** n - 1), show: (n) => `$2^{${n}} - 1 = ${2 ** n - 1} = 23\\cdot 89$` },
  { claim: 'every odd integer $n > 1$ is prime', from: 2, holds: (n) => n % 2 === 0 || isPrime(n), show: (n) => `$${n} = 3\\cdot 3$` },
  { claim: '$2^n + 1$ is prime for every integer $n \\ge 1$', from: 1, holds: (n) => isPrime(2 ** n + 1), show: (n) => `$2^{${n}} + 1 = ${2 ** n + 1}$, which is $3\\cdot 3$` },
  { claim: '$n! + 1$ is prime for every integer $n \\ge 1$', from: 1, holds: (n) => isPrime(fact(n) + 1), show: (n) => `$${n}! + 1 = ${fact(n) + 1} = 5\\cdot 5$` },
  { claim: '$n^2 + 1$ is prime for every integer $n \\ge 1$', from: 1, holds: (n) => isPrime(n * n + 1), show: (n) => `$${n}^2 + 1 = ${n * n + 1}$` },
  { claim: 'joining $n$ points on a circle by all chords (no three meeting inside) always makes $2^{n-1}$ regions', from: 1, holds: (n) => 1 + C(n, 2) + C(n, 4) === 2 ** (n - 1), show: (n) => `$n = ${n}$ gives $1 + \\binom{${n}}{2} + \\binom{${n}}{4} = ${1 + C(n, 2) + C(n, 4)}$ regions, not $${2 ** (n - 1)}$` },
  { claim: '$2^n > n^2$ for every integer $n \\ge 1$', from: 1, holds: (n) => 2 ** n > n * n, show: (n) => `$2^{${n}} = ${2 ** n}$ is not greater than $${n}^2 = ${n * n}$` },
  { claim: '$p_1p_2\\cdots p_k + 1$ (one more than the product of the first $k$ primes) is always prime', from: 1, holds: (k) => isPrime(primorialPlusOne(k)), show: (k) => `$k = ${k}$: $2\\cdot3\\cdot5\\cdot7\\cdot11\\cdot13 + 1 = ${primorialPlusOne(k)} = 59\\cdot 509$` },
];

const counterexamples: Skill = {
  id: 'proofs.counter',
  name: 'Counterexamples',
  prereqs: ['proofs.direct'],
  levels: [
    {
      name: 'famous false patterns',
      generate(r) {
        const c = r.pick(CLAIMS);
        const n = smallest(c.from, c.holds);
        return {
          prompt: `Claim: ${c.claim}. It is false. What is the smallest ${c.claim.includes('first $k$') ? '$k$' : '$n$'} for which it fails?`,
          answer: num(n),
          solution: ['Check the cases in order until one fails: one counterexample is enough to disprove a "for every" statement.', `${c.show(n)}.`, 'However many cases work, a pattern is not a proof.'],
          selfCheck: () => !c.holds(n) && range(c.from, n - 1).every(c.holds),
        };
      },
    },
    {
      name: 'search for it',
      generate(r) {
        for (;;) {
          const a = r.int(-3, 5);
          const b = r.pick([11, 17, 23, 29, 41, 43, 47]);
          const f = (n: number) => n * n + a * n + b;
          const n = smallest(0, (k) => isPrime(f(k)));
          if (n < 2) continue;
          const lhs = `n^2 ${a ? `${a < 0 ? '-' : '+'} ${Math.abs(a) === 1 ? '' : Math.abs(a)}n ` : ''}+ ${b}`;
          return {
            prompt: `Claim: $${lhs}$ is prime for every integer $n \\ge 0$. Find the smallest $n \\ge 0$ for which it fails.`,
            answer: num(n),
            hint: `Try $n = ${b}$ first: then every term is a multiple of ${b}. But a smaller $n$ may already fail.`,
            solution: [`Values: ${range(0, n).map((k) => `$${f(k)}$`).join(', ')}.`, `${f(n) < 2 ? `$${f(n)}$ is not prime` : `$${f(n)} = ${smallestFactor(f(n))}\\cdot ${f(n) / smallestFactor(f(n))}$`}, so $n = ${n}$ is the first counterexample.`],
            selfCheck: () => !isPrime(f(n)) && range(0, n - 1).every((k) => isPrime(f(k))),
          };
        }
      },
    },
    {
      name: 'which claim is false?',
      generate(r) {
        const TRUE = [
          'For every integer $n$, $n^2 - n$ is even.',
          'For every integer $n$, $n^3 - n$ is divisible by 3.',
          'The sum of two odd integers is even.',
          'If $n^2$ is even, then $n$ is even.',
          'Every integer $n > 1$ has a prime divisor.',
          'For every real $x$, $x^2 - 2x + 1 \\ge 0$.',
          'If $a \\mid b$ and $b \\mid c$, then $a \\mid c$.',
        ];
        const FALSE = [
          { s: 'If $a \\mid bc$, then $a \\mid b$ or $a \\mid c$.', why: '$a = 6$, $b = 4$, $c = 3$: $6 \\mid 12$ but $6 \\nmid 4$ and $6 \\nmid 3$.' },
          { s: 'For every real $x$, $x^2 > x$.', why: '$x = \\frac12$: $\\frac14 < \\frac12$ (and $x = 0$ or $1$ give equality).' },
          { s: 'The sum of two irrational numbers is irrational.', why: '$\\sqrt2 + (-\\sqrt2) = 0$.' },
          { s: 'If $n^2 > 4$, then $n > 2$.', why: '$n = -3$: $9 > 4$ but $-3 < 2$.' },
          { s: 'Every prime number is odd.', why: '$2$ is prime and even.' },
          { s: 'If $\\gcd(a, b) = 1$ and $\\gcd(b, c) = 1$, then $\\gcd(a, c) = 1$.', why: '$a = c = 2$, $b = 3$.' },
        ];
        const f = r.pick(FALSE);
        const ts = r.shuffle([...TRUE]).slice(0, 3);
        const options = r.shuffle([...ts, f.s]);
        return {
          prompt: 'Exactly one of these claims is false. Which one?',
          answer: { kind: 'choice', options, correct: options.indexOf(f.s) },
          solution: [`Counterexample: ${f.why}`, 'The other three are true and can each be proved directly.'],
        };
      },
    },
  ],
  learn: {
    summary:
      'A single counterexample disproves a "for every" statement; no number of confirming examples proves one. $n^2 + n + 41$ is prime for $n = 0, \\dots, 39$ and fails at 40; $2^p - 1$ is prime for $p = 2, 3, 5, 7$ and fails at 11. When hunting, try the boundary cases first ($0$, $1$, negatives, equal values) and values that make terms share a factor.',
    resources: [wiki('Counterexample', 'Counterexample'), bookOfProof, mcs],
  },
};
const smallestFactor = (n: number) => {
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return d;
  return n;
};

// ---------------------------------------------------------------------------
// More induction families

const inductionDivisibility: Gen = (r) => {
  const pool: (() => Problem)[] = [
    () =>
      prove('for every integer $n \\ge 0$, $9 \\mid 4^n + 15n - 1$.', [
        'Base case $n = 0$: $1 + 0 - 1 = 0$, divisible by $9$.',
        'Inductive step: assume $4^n + 15n - 1 = 9m$. Then $4^{n+1} + 15(n+1) - 1 = 4\\cdot 4^n + 15n + 14$.',
        'Substitute $4^n = 9m - 15n + 1$: $4(9m - 15n + 1) + 15n + 14 = 36m - 45n + 18 = 9(4m - 5n + 2)$. $\\blacksquare$',
      ], () => range(0, 15).every((n) => (4 ** n + 15 * n - 1) % 9 === 0)),
    () =>
      prove('for every integer $n \\ge 0$, $6 \\mid n^3 + 5n$.', [
        'Base case $n = 0$: $0$ is divisible by $6$.',
        'Inductive step: $(n+1)^3 + 5(n+1) = (n^3 + 5n) + 3n^2 + 3n + 6 = (n^3 + 5n) + 3n(n+1) + 6$.',
        '$n^3 + 5n$ is a multiple of $6$ by hypothesis, $n(n+1)$ is even so $3n(n+1)$ is a multiple of $6$, and so is $6$. $\\blacksquare$',
      ], () => range(0, 30).every((n) => (n ** 3 + 5 * n) % 6 === 0)),
    () => {
      const [a, b] = r.pick([
        [11, 6],
        [7, 2],
        [13, 4],
        [9, 4],
      ]);
      const d = a - b;
      return prove(`for every integer $n \\ge 1$, $${d} \\mid ${a}^n - ${b}^n$.`, [
        `Base case $n = 1$: $${a} - ${b} = ${d}$.`,
        `Inductive step: $${a}^{n+1} - ${b}^{n+1} = ${a}\\cdot ${a}^n - ${b}\\cdot ${b}^n = ${a}\\left(${a}^n - ${b}^n\\right) + (${a} - ${b})${b}^n$.`,
        `The first term is a multiple of $${d}$ by hypothesis and the second is $${d}\\cdot ${b}^n$. $\\blacksquare$`,
      ], () => range(1, 10).every((n) => (a ** n - b ** n) % d === 0));
    },
  ];
  return r.pick(pool)();
};

const inductionInequality: Gen = (r) => {
  if (r.next() < 0.5)
    return prove('(Bernoulli) for every real $x > -1$ and every integer $n \\ge 0$: $(1 + x)^n \\ge 1 + nx$.', [
      'Base case $n = 0$: $1 \\ge 1$.',
      'Inductive step: assume $(1 + x)^n \\ge 1 + nx$. Since $1 + x > 0$, multiplying preserves the inequality: $(1 + x)^{n+1} \\ge (1 + nx)(1 + x) = 1 + (n+1)x + nx^2$.',
      'And $nx^2 \\ge 0$, so $(1 + x)^{n+1} \\ge 1 + (n+1)x$. $\\blacksquare$ (Note where $x > -1$ was needed.)',
    ]);
  return prove('for every integer $n \\ge 1$: $\\dfrac{1}{1^2} + \\dfrac{1}{2^2} + \\dots + \\dfrac{1}{n^2} \\le 2 - \\dfrac{1}{n}$.', [
    'Base case $n = 1$: $1 \\le 2 - 1$.',
    'Inductive step: assume the bound for $n$. Then the sum up to $n + 1$ is at most $2 - \\frac1n + \\frac{1}{(n+1)^2}$.',
    'This is at most $2 - \\frac{1}{n+1}$ because $\\frac1n - \\frac{1}{n+1} = \\frac{1}{n(n+1)} \\ge \\frac{1}{(n+1)^2}$. $\\blacksquare$ (Strengthening the claim to $2 - \\frac1n$ is what makes the induction work.)',
  ], () => range(1, 50).every((n) => range(1, n).reduce((s, k) => s + 1 / (k * k), 0) <= 2 - 1 / n + 1e-12));
};

const inductionDeep: Skill = {
  ...induction,
  levels: [
    induction.levels[0],
    { name: 'divisibility', generate: mix(induction.levels[1].generate, inductionDivisibility) },
    { name: 'inequalities', generate: mix(induction.levels[2].generate, inductionInequality) },
  ],
};

// ---------------------------------------------------------------------------

export const proofsChapters: Chapter[] = [
  {
    id: 'proofs.ch.direct',
    title: 'Direct proof',
    about: 'Proving "if $P$ then $Q$" by assuming $P$ and computing: parity, divisibility, sums and inequalities; proof by cases; disproving with counterexamples.',
    why: 'Most proofs you will ever write are direct. Getting fluent with definitions (even, divides, remainder) is most of the work.',
    resources: [bookOfProof, levin('sec_logic-proofs', 'Proofs'), mcs],
    skills: [direct, cases, counterexamples],
    deeper: [],
  },
  {
    id: 'proofs.ch.indirect',
    title: 'Contrapositive and contradiction',
    about: 'Proving a statement through its contrapositive, or by assuming it fails and deriving something impossible.',
    why: 'Irrationality, infinitude of primes, impossibility results and lower bounds in computer science are all proofs by contradiction.',
    resources: [bookOfProof, wiki('Proof_by_contradiction', 'Proof by contradiction'), wiki('Contraposition', 'Contraposition')],
    skills: [contrapositive, contradiction],
    deeper: [pigeonhole],
  },
  {
    id: 'proofs.ch.induction',
    title: 'Induction',
    about: 'Ordinary induction for sums, divisibility and inequalities; strong induction for factorisations, coins and Fibonacci numbers.',
    why: 'Induction is how you prove loops and recursive algorithms correct and analyse their running time.',
    resources: [levin('sec_seq-induction', 'Proof by Induction'), wiki('Mathematical_induction', 'Mathematical induction'), mcs],
    skills: [inductionDeep, strong],
    deeper: [structural],
  },
  {
    id: 'proofs.ch.sets',
    title: 'Sets and functions',
    about: 'Element-chasing proofs of subset and equality statements, and proofs that functions are injective, surjective or bijective.',
    why: 'Counting arguments (bijections) and almost every definition in discrete maths and algebra rely on these proof patterns.',
    resources: [levin('sec_intro-sets', 'Sets'), levin('sec_intro-functions', 'Functions'), bookOfProof],
    skills: [setProofs, functions],
    deeper: [],
  },
];
