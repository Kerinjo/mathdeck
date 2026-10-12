import { Q } from '../core/frac';
import { coef, mono, poly, signed, st, sum, t } from '../core/fmt';
import type { Chapter, Problem, Resource, Rng, Skill } from '../core/types';
import { distinct, fact } from './helpers';

// Every card here is self-rated: prove it on paper, reveal the model proof, then rate how it went.
// Statements come in families with varying numbers, and the model proofs are written out for each.

const levin = (page: string, title: string): Resource => ({
  kind: 'book',
  title: `Levin, Discrete Mathematics: An Open Introduction: ${title}`,
  url: `https://discrete.openmathbooks.org/dmoi3/${page}.html`,
});
const bookOfProof: Resource = {
  kind: 'book',
  title: 'Hammack, Book of Proof (free textbook)',
  url: 'https://richardhammack.github.io/BookOfProof/',
};
const mcs: Resource = {
  kind: 'book',
  title: 'MIT 6.042, Mathematics for Computer Science (free PDF), ch. 1 and 5',
  url: 'https://courses.csail.mit.edu/6.042/spring18/mcs.pdf',
};
const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});

const prove = (statement: string, proof: string[], selfCheck?: () => boolean): Problem => ({
  prompt: `Prove: ${statement}`,
  answer: { kind: 'self' },
  solution: proof,
  selfCheck,
});

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const mod = (a: number, m: number) => ((a % m) + m) % m;
const parity = (x: number) => (mod(x, 2) === 0 ? 'even' : 'odd');
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

// ---------------------------------------------------------------------------
// Chapter 1: direct proof

const direct: Skill = {
  id: 'proofs.direct',
  name: 'Direct proof',
  prereqs: [],
  levels: [
    {
      name: 'parity',
      generate(r) {
        const odd = r.next() < 0.5;
        const a = r.int(-5, 5);
        const b = r.int(-6, 6);
        const f = poly([1, a, b], 'n');
        // n = 2k+1: n² + an + b = 4k² + (4+2a)k + (1+a+b);  n = 2k: 4k² + 2ak + b
        const [ck, c0] = odd ? [4 + 2 * a, 1 + a + b] : [2 * a, b];
        const q = Math.floor(c0 / 2);
        const rem = c0 - 2 * q;
        const expanded = sum([mono(4, 2, 'k'), mono(ck, 1, 'k'), t(c0)]).tex;
        const inner = sum([mono(2, 2, 'k'), mono(ck / 2, 1, 'k'), t(q)]).tex;
        const result = rem === 0 ? 'even' : 'odd';
        return prove(
          `if $n$ is an ${odd ? 'odd' : 'even'} integer, then $${f.tex}$ is ${result}.`,
          [
            `Let $n$ be ${odd ? 'odd' : 'even'}. Then $n = ${odd ? '2k + 1' : '2k'}$ for some integer $k$.`,
            `Substituting: $$${f.tex.replace(/n/g, odd ? '(2k+1)' : '(2k)')} = ${expanded}.$$`,
            rem === 0
              ? `This equals $2\\left(${inner}\\right)$, and the bracket is an integer, so the expression is even. $\\blacksquare$`
              : `This equals $2\\left(${inner}\\right) + 1$, and the bracket is an integer, so the expression is odd. $\\blacksquare$`,
          ],
          () => range(-20, 20).filter((n) => mod(n, 2) === (odd ? 1 : 0)).every((n) => parity(n * n + a * n + b) === result),
        );
      },
    },
    {
      name: 'divisibility and remainders',
      generate(r) {
        if (r.next() < 0.5) {
          const x = r.nz(-5, 5);
          const y = r.nz(-5, 5);
          return prove(`for all integers $d, m, n$: if $d \\mid m$ and $d \\mid n$, then $d \\mid ${coef(x)}m ${st(y, 'n')}$.`, [
            'Assume $d \\mid m$ and $d \\mid n$. By definition there are integers $s, t$ with $m = ds$ and $n = dt$.',
            `Then $${coef(x)}m ${st(y, 'n')} = ${coef(x)}ds ${st(y, 'dt')} = d(${coef(x)}s ${st(y, 't')})$.`,
            `The bracket is an integer, so $d$ divides it. $\\blacksquare$`,
          ]);
        }
        const m = r.int(3, 9);
        const rr = r.int(1, m - 1);
        const s = mod(rr * rr, m);
        const tq = (rr * rr - s) / m;
        return prove(`if the integer $n$ leaves remainder $${rr}$ when divided by $${m}$, then $n^2$ leaves remainder $${s}$.`, [
          `Write $n = ${m}k + ${rr}$ for some integer $k$.`,
          `Then $n^2 = ${m * m}k^2 + ${2 * m * rr}k + ${rr * rr} = ${m}(${m}k^2 + ${2 * rr}k${tq ? ` + ${tq}` : ''}) + ${s}$.`,
          `The bracket is an integer and $0 \\le ${s} < ${m}$, so the remainder is $${s}$. $\\blacksquare$`,
        ], () => range(0, 60).filter((n) => n % m === rr).every((n) => (n * n) % m === s));
      },
    },
    {
      name: 'sums and inequalities',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0) {
          const m = r.pick([3, 5, 7, 9]);
          const h = (m - 1) / 2;
          return prove(`the sum of any ${m} consecutive integers is divisible by ${m}.`, [
            `Let the integers be $n, n+1, \\dots, n+${m - 1}$ for some integer $n$.`,
            `Their sum is $${m}n + (0 + 1 + \\dots + ${m - 1}) = ${m}n + \\frac{${m - 1}\\cdot ${m}}{2} = ${m}n + ${m * h} = ${m}(n + ${h})$.`,
            `Since $n + ${h}$ is an integer, the sum is divisible by ${m}. $\\blacksquare$`,
          ]);
        }
        if (kind === 1) {
          const c = r.int(1, 9);
          return prove(`for every real number $x$, $x^2 + ${c * c} \\ge ${2 * c}x$.`, [
            `Squares are never negative, so $(x - ${c})^2 \\ge 0$.`,
            `Expanding: $x^2 - ${2 * c}x + ${c * c} \\ge 0$, i.e. $x^2 + ${c * c} \\ge ${2 * c}x$. $\\blacksquare$`,
            `(Equality holds exactly when $x = ${c}$.)`,
          ]);
        }
        return prove('for every integer $n$, $n^3 - n$ is divisible by $6$.', [
          'Factor: $n^3 - n = (n-1)n(n+1)$, a product of three consecutive integers.',
          'Among any two consecutive integers one is even, so the product is divisible by $2$.',
          'Among any three consecutive integers one is a multiple of $3$, so the product is divisible by $3$.',
          'Since $2$ and $3$ are coprime, the product is divisible by $6$. $\\blacksquare$',
        ]);
      },
    },
  ],
  learn: {
    summary:
      'To prove "if $P$ then $Q$" directly: assume $P$, unpack the definitions (even means $n = 2k$, $d \\mid n$ means $n = dk$), compute, and repack the result into the form $Q$ asks for. Name every new variable and say that it is an integer.',
    resources: [bookOfProof, levin('sec_logic-proofs', 'Proofs'), wiki('Direct_proof', 'Direct proof')],
  },
};

// ---------------------------------------------------------------------------
// Chapter 2: indirect proof

const contrapositive: Skill = {
  id: 'proofs.contra',
  name: 'Proof by contrapositive',
  prereqs: ['proofs.direct'],
  levels: [
    {
      name: 'parity',
      generate(r) {
        if (r.next() < 0.5) {
          const c = r.nz(-9, 9);
          const concl = parity(c);
          const other = concl === 'odd' ? 'even' : 'odd';
          return prove(`for an integer $n$, if $n^2 ${signed(c)}$ is even, then $n$ is ${concl}.`, [
            `Prove the contrapositive: if $n$ is ${other}, then $n^2 ${signed(c)}$ is odd.`,
            other === 'odd'
              ? `Let $n = 2k + 1$. Then $n^2 = 4k^2 + 4k + 1$ is odd, and $${c}$ is even, so the sum is odd.`
              : `Let $n = 2k$. Then $n^2 = 4k^2$ is even, and $${c}$ is odd, so the sum is odd.`,
            `Since the contrapositive holds, so does the original statement. $\\blacksquare$`,
          ], () => range(-20, 20).filter((n) => parity(n * n + c) === 'even').every((n) => parity(n) === concl));
        }
        const a = r.pick([1, 3, 5, 7]);
        const b = r.nz(-8, 8);
        const concl = parity(b + 1); // an + b odd  <=>  n + b odd  <=>  n has the parity of b + 1
        const other = concl === 'odd' ? 'even' : 'odd';
        return prove(`for an integer $n$, if $${coef(a)}n ${signed(b)}$ is odd, then $n$ is ${concl}.`, [
          `Contrapositive: if $n$ is ${other}, then $${coef(a)}n ${signed(b)}$ is even.`,
          `If $n$ is ${other}, then $${coef(a)}n$ is ${other} (an odd number times $n$ has the parity of $n$), and $${b}$ is ${parity(b)}.`,
          `${cap(other)} + ${parity(b)} is even, which proves the contrapositive and hence the statement. $\\blacksquare$`,
        ], () => range(-20, 20).filter((n) => parity(a * n + b) === 'odd').every((n) => parity(n) === concl));
      },
    },
    {
      name: 'inequalities',
      generate(r) {
        const kind = r.int(0, 2);
        const c = r.int(1, 9);
        if (kind === 0)
          return prove(`for real numbers $a, b$: if $a + b \\ge ${2 * c}$, then $a \\ge ${c}$ or $b \\ge ${c}$.`, [
            `Contrapositive: if $a < ${c}$ and $b < ${c}$, then $a + b < ${2 * c}$.`,
            `Adding the two inequalities gives $a + b < ${c} + ${c} = ${2 * c}$. $\\blacksquare$`,
          ]);
        if (kind === 1)
          return prove(`for positive real numbers $x, y$: if $xy > ${c * c}$, then $x > ${c}$ or $y > ${c}$.`, [
            `Contrapositive: if $0 < x \\le ${c}$ and $0 < y \\le ${c}$, then $xy \\le ${c * c}$.`,
            `Multiplying the inequalities of positive numbers: $xy \\le ${c} \\cdot ${c} = ${c * c}$. $\\blacksquare$`,
          ]);
        return prove(`for a real number $x$: if $x^3 + ${c}x > 0$, then $x > 0$.`, [
          `Contrapositive: if $x \\le 0$, then $x^3 + ${c}x \\le 0$.`,
          `If $x \\le 0$ then $x^3 \\le 0$ and $${c}x \\le 0$, so their sum is $\\le 0$. $\\blacksquare$`,
        ]);
      },
    },
    {
      name: 'divisibility',
      generate(r) {
        const kind = r.int(0, 2);
        const d = r.int(2, 9);
        if (kind === 0)
          return prove(`for integers $a, b$: if $${d} \\nmid ab$, then $${d} \\nmid a$.`, [
            `Contrapositive: if $${d} \\mid a$, then $${d} \\mid ab$.`,
            `If $a = ${d}k$, then $ab = ${d}(kb)$, which is divisible by $${d}$. $\\blacksquare$`,
          ]);
        if (kind === 1) {
          const k = r.int(2, 9);
          return prove(`for integers $m, n$: if $m + n \\ge ${2 * k + 1}$, then $m > ${k}$ or $n > ${k}$.`, [
            `Contrapositive: if $m \\le ${k}$ and $n \\le ${k}$, then $m + n \\le ${2 * k}$.`,
            `Adding: $m + n \\le ${2 * k} < ${2 * k + 1}$. $\\blacksquare$`,
            `(Note this really uses that $m, n$ are integers only to phrase it neatly; it holds for reals too.)`,
          ]);
        }
        const p = r.pick([2, 3, 5, 7]);
        return prove(`for an integer $n$: if $${p} \\nmid n^2$, then $${p} \\nmid n$.`, [
          `Contrapositive: if $${p} \\mid n$, then $${p} \\mid n^2$.`,
          `If $n = ${p}k$, then $n^2 = ${p}(${p}k^2)$. $\\blacksquare$`,
        ]);
      },
    },
  ],
  learn: {
    summary:
      '"If $P$ then $Q$" is equivalent to its contrapositive "if not $Q$ then not $P$". When the conclusion is a negative statement ("$n$ is not divisible by…", "$x \\ne \\dots$") or the hypothesis is awkward to use, assume $\\lnot Q$ and prove $\\lnot P$ directly instead.',
    resources: [bookOfProof, wiki('Contraposition', 'Contraposition'), mcs],
  },
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const contradiction: Skill = {
  id: 'proofs.contradiction',
  name: 'Proof by contradiction',
  prereqs: ['proofs.direct'],
  levels: [
    {
      name: 'irrational square roots',
      generate(r) {
        const p = r.pick([2, 3, 5, 7, 11, 13]);
        return prove(`$\\sqrt{${p}}$ is irrational.`, [
          `Suppose, for contradiction, that $\\sqrt{${p}} = a/b$ with integers $a, b$, $b \\ne 0$, and the fraction in lowest terms.`,
          `Squaring: $a^2 = ${p}b^2$, so $${p} \\mid a^2$. Since $${p}$ is prime, $${p} \\mid a$; write $a = ${p}c$.`,
          `Then $${p * p}c^2 = ${p}b^2$, so $b^2 = ${p}c^2$ and likewise $${p} \\mid b$.`,
          `Now $${p}$ divides both $a$ and $b$, contradicting lowest terms. So $\\sqrt{${p}}$ is irrational. $\\blacksquare$`,
        ]);
      },
    },
    {
      name: 'classic statements',
      generate(r) {
        const k = r.int(1, 9);
        const pool: [string, string[]][] = [
          [
            'there are infinitely many primes.',
            [
              'Suppose there are only finitely many primes $p_1, \\dots, p_m$.',
              'Let $N = p_1 p_2 \\cdots p_m + 1$. Then $N > 1$, so it has some prime factor $p$, which must be one of the $p_i$.',
              'But $p_i$ divides $p_1 \\cdots p_m$ and $N$, so it divides their difference $1$, which is impossible. $\\blacksquare$',
            ],
          ],
          [
            'there is no smallest positive rational number.',
            [
              'Suppose $q$ is the smallest positive rational.',
              'Then $q/2$ is rational, positive, and $q/2 < q$, contradicting minimality. $\\blacksquare$',
            ],
          ],
          [
            'no integer is both even and odd.',
            [
              'Suppose $n = 2a$ and $n = 2b + 1$ for integers $a, b$.',
              'Then $2a = 2b + 1$, so $2(a - b) = 1$ and $a - b = \\tfrac12$, which is not an integer. Contradiction. $\\blacksquare$',
            ],
          ],
          [
            `$\\sqrt{2} + ${k}$ is irrational (you may use that $\\sqrt 2$ is irrational).`,
            [
              `Suppose $\\sqrt{2} + ${k} = q$ is rational.`,
              `Then $\\sqrt 2 = q - ${k}$ is a difference of rationals, hence rational. Contradiction. $\\blacksquare$`,
            ],
          ],
          [
            'if $a$ is rational and $b$ is irrational, then $a + b$ is irrational.',
            [
              'Suppose $a + b = q$ is rational.',
              'Then $b = q - a$ is a difference of two rationals, so rational, contradicting that $b$ is irrational. $\\blacksquare$',
            ],
          ],
          [
            'there is no largest even integer.',
            ['Suppose $n$ is the largest even integer.', 'Then $n + 2$ is even and larger than $n$. Contradiction. $\\blacksquare$'],
          ],
        ];
        const [s, proof] = r.pick(pool);
        return prove(s, proof);
      },
    },
    {
      name: 'number theory',
      generate(r) {
        if (r.next() < 0.5) {
          let a, b, c, g;
          do {
            g = r.int(2, 6);
            a = g * r.nz(-5, 5);
            b = g * r.nz(-5, 5);
            c = r.int(1, 30);
          } while (c % g === 0 || gcd(a, b) !== g);
          return prove(`there are no integers $x, y$ with $${coef(a)}x ${st(b, 'y')} = ${c}$.`, [
            `Suppose integers $x, y$ satisfy $${a}x + ${b < 0 ? `(${b})` : b}y = ${c}$.`,
            `Both $${a}$ and $${b}$ are multiples of $${g}$, so the left side is $${g}(${a / g}x + ${b / g < 0 ? `(${b / g})` : b / g}y)$, a multiple of $${g}$.`,
            `But $${c}$ is not a multiple of $${g}$. Contradiction. $\\blacksquare$`,
          ]);
        }
        const k = r.pick([3, 5, 7, 9, 11]);
        return prove(`$\\log_2 ${k}$ is irrational.`, [
          `Suppose $\\log_2 ${k} = m/n$ with positive integers $m, n$ (it is positive since $${k} > 1$).`,
          `Then $2^{m/n} = ${k}$, so $2^m = ${k}^n$.`,
          `The left side is even and the right side is odd. Contradiction. $\\blacksquare$`,
        ]);
      },
    },
  ],
  learn: {
    summary:
      'Assume the statement is false and derive something impossible (a number both even and odd, $1 = 0$, a fraction in lowest terms that isn\'t). Then the assumption must be wrong. Write "Suppose, for contradiction, that…" at the start and say clearly where the contradiction is.',
    resources: [bookOfProof, wiki('Proof_by_contradiction', 'Proof by contradiction'), levin('sec_logic-proofs', 'Proofs')],
  },
};

// ---------------------------------------------------------------------------
// Chapter 3: induction

/** Sum formulas: the statement, its base case and inductive step, plus a numeric check. */
function sumFamily(r: Rng): { from: number; lhs: string; rhs: string; proof: string[]; check: () => boolean } {
  const kind = r.int(0, 4);
  if (kind === 0) {
    const a = r.int(1, 6);
    const b = r.int(-3, 5);
    const term = poly([a, b], 'i').tex;
    const f = (n: number) => (a * n * n + (a + 2 * b) * n) / 2;
    const rhs = `\\frac{n(${poly([a, a + 2 * b], 'n').tex})}{2}`;
    return {
      from: 1,
      lhs: `\\sum_{i=1}^{n} (${term})`,
      rhs,
      proof: [
        `Base case $n = 1$: the left side is $${a + b}$, and the right side is $\\frac{${2 * a + 2 * b}}{2} = ${a + b}$.`,
        `Inductive step: assume the formula for $n$. Adding the next term $${poly([a, a + b], 'n').tex}$: $$${rhs} + ${poly([a, a + b], 'n').tex} = \\frac{n(${poly([a, a + 2 * b], 'n').tex}) + 2(${poly([a, a + b], 'n').tex})}{2} = \\frac{${poly([a, 3 * a + 2 * b, 2 * a + 2 * b], 'n').tex}}{2} = \\frac{(n+1)(${poly([a, 2 * a + 2 * b], 'n').tex})}{2},$$`,
        `which is the formula with $n + 1$ in place of $n$. $\\blacksquare$`,
      ],
      check: () => range(1, 15).every((n) => range(1, n).reduce((s, i) => s + a * i + b, 0) === f(n)),
    };
  }
  if (kind === 1)
    return {
      from: 1,
      lhs: '\\sum_{i=1}^{n} i(i+1)',
      rhs: '\\frac{n(n+1)(n+2)}{3}',
      proof: [
        'Base case $n = 1$: $1 \\cdot 2 = 2 = \\frac{1 \\cdot 2 \\cdot 3}{3}$.',
        'Inductive step: assume it for $n$. Adding the next term, $\\frac{n(n+1)(n+2)}{3} + (n+1)(n+2) = (n+1)(n+2)\\left(\\frac{n}{3} + 1\\right) = \\frac{(n+1)(n+2)(n+3)}{3}$. $\\blacksquare$',
      ],
      check: () => range(1, 15).every((n) => range(1, n).reduce((s, i) => s + i * (i + 1), 0) === (n * (n + 1) * (n + 2)) / 3),
    };
  if (kind === 2)
    return {
      from: 1,
      lhs: '\\sum_{i=1}^{n} i^2',
      rhs: '\\frac{n(n+1)(2n+1)}{6}',
      proof: [
        'Base case $n = 1$: $1 = \\frac{1 \\cdot 2 \\cdot 3}{6}$.',
        'Inductive step: $\\frac{n(n+1)(2n+1)}{6} + (n+1)^2 = \\frac{(n+1)\\left(n(2n+1) + 6(n+1)\\right)}{6} = \\frac{(n+1)(2n^2 + 7n + 6)}{6} = \\frac{(n+1)(n+2)(2n+3)}{6}$, the formula for $n+1$. $\\blacksquare$',
      ],
      check: () => range(1, 15).every((n) => range(1, n).reduce((s, i) => s + i * i, 0) === (n * (n + 1) * (2 * n + 1)) / 6),
    };
  if (kind === 3) {
    const q = r.int(2, 5);
    return {
      from: 0,
      lhs: `\\sum_{i=0}^{n} ${q}^i`,
      rhs: `\\frac{${q}^{n+1} - 1}{${q - 1}}`,
      proof: [
        `Base case $n = 0$: $1 = \\frac{${q} - 1}{${q - 1}}$.`,
        `Inductive step: $\\frac{${q}^{n+1} - 1}{${q - 1}} + ${q}^{n+1} = \\frac{${q}^{n+1} - 1 + ${q - 1}\\cdot ${q}^{n+1}}{${q - 1}} = \\frac{${q}\\cdot ${q}^{n+1} - 1}{${q - 1}} = \\frac{${q}^{n+2} - 1}{${q - 1}}$. $\\blacksquare$`,
      ],
      check: () => range(0, 10).every((n) => range(0, n).reduce((s, i) => s + q ** i, 0) === (q ** (n + 1) - 1) / (q - 1)),
    };
  }
  return {
    from: 1,
    lhs: '\\sum_{i=1}^{n} \\frac{1}{i(i+1)}',
    rhs: '\\frac{n}{n+1}',
    proof: [
      'Base case $n = 1$: $\\frac{1}{2} = \\frac{1}{1+1}$.',
      'Inductive step: $\\frac{n}{n+1} + \\frac{1}{(n+1)(n+2)} = \\frac{n(n+2) + 1}{(n+1)(n+2)} = \\frac{(n+1)^2}{(n+1)(n+2)} = \\frac{n+1}{n+2}$. $\\blacksquare$',
    ],
    check: () => range(1, 15).every((n) => Math.abs(range(1, n).reduce((s, i) => s + 1 / (i * (i + 1)), 0) - n / (n + 1)) < 1e-12),
  };
}

const induction: Skill = {
  id: 'proofs.induction',
  name: 'Mathematical induction',
  prereqs: ['proofs.direct'],
  levels: [
    {
      name: 'sum formulas',
      generate(r) {
        const s = sumFamily(r);
        return prove(`for every integer $n \\ge ${s.from}$, $\\displaystyle ${s.lhs} = ${s.rhs}$.`, s.proof, s.check);
      },
    },
    {
      name: 'divisibility',
      generate(r) {
        if (r.next() < 0.3)
          return prove('for every integer $n \\ge 0$, $3 \\mid n^3 + 2n$.', [
            'Base case $n = 0$: $0$ is divisible by $3$.',
            'Inductive step: assume $3 \\mid n^3 + 2n$. Then $(n+1)^3 + 2(n+1) = (n^3 + 2n) + 3n^2 + 3n + 3 = (n^3 + 2n) + 3(n^2 + n + 1)$.',
            'Both parts are multiples of $3$, so the sum is too. $\\blacksquare$',
          ], () => range(0, 30).every((n) => (n ** 3 + 2 * n) % 3 === 0));
        let a, b;
        do [a, b] = distinct(r, 2, 1, 9).sort((x, y) => y - x);
        while (a - b < 2);
        const d = a - b;
        return prove(`for every integer $n \\ge 0$, $${d} \\mid ${a}^n - ${b === 1 ? '1' : `${b}^n`}$.`, [
          `Base case $n = 0$: $${a}^0 - ${b === 1 ? '1' : `${b}^0`} = 0$, divisible by $${d}$.`,
          `Inductive step: assume $${a}^n - ${b === 1 ? '1' : `${b}^n`} = ${d}m$. Then $${a}^{n+1} - ${b === 1 ? '1' : `${b}^{n+1}`} = ${a}\\cdot ${a}^n - ${b === 1 ? '1' : `${b}\\cdot ${b}^n`}$.`,
          `Write $${a} = ${d} + ${b}$: this is $${d}\\cdot ${a}^n + ${b}\\left(${a}^n - ${b === 1 ? '1' : `${b}^n`}\\right) = ${d}\\cdot ${a}^n + ${b}\\cdot ${d}m = ${d}\\left(${a}^n + ${b}m\\right)$. $\\blacksquare$`,
        ], () => range(0, 12).every((n) => (a ** n - b ** n) % d === 0));
      },
    },
    {
      name: 'inequalities',
      generate(r) {
        const kind = r.int(0, 2);
        if (kind === 0)
          return prove('$2^n > n^2$ for every integer $n \\ge 5$.', [
            'Base case $n = 5$: $32 > 25$.',
            'Inductive step: assume $2^n > n^2$ with $n \\ge 5$. Then $2^{n+1} = 2\\cdot 2^n > 2n^2$.',
            'And $2n^2 \\ge (n+1)^2$ because $n^2 - 2n - 1 = (n-1)^2 - 2 > 0$ for $n \\ge 5$. So $2^{n+1} > (n+1)^2$. $\\blacksquare$',
          ]);
        if (kind === 1)
          return prove('$n! > 2^n$ for every integer $n \\ge 4$.', [
            'Base case $n = 4$: $24 > 16$.',
            'Inductive step: assume $n! > 2^n$ with $n \\ge 4$. Then $(n+1)! = (n+1)\\,n! > (n+1)2^n \\ge 2\\cdot 2^n = 2^{n+1}$, since $n + 1 \\ge 2$. $\\blacksquare$',
          ], () => range(4, 15).every((n) => fact(n) > 2 ** n));
        const k = r.int(2, 6);
        return prove(`$${k}^n \\ge 1 + ${k - 1}n$ for every integer $n \\ge 0$.`, [
          `Base case $n = 0$: $1 \\ge 1$.`,
          `Inductive step: assume $${k}^n \\ge 1 + ${k - 1}n$. Then $${k}^{n+1} = ${k}\\cdot ${k}^n \\ge ${k}(1 + ${k - 1}n) = ${k} + ${k * (k - 1)}n$.`,
          `And $${k} + ${k * (k - 1)}n \\ge 1 + ${k - 1}(n + 1) = ${k} + ${k - 1}n$ because $${k * (k - 1)}n \\ge ${k - 1}n$ for $n \\ge 0$. $\\blacksquare$`,
        ], () => range(0, 12).every((n) => k ** n >= 1 + (k - 1) * n));
      },
    },
  ],
  learn: {
    summary:
      'To prove $P(n)$ for all $n \\ge n_0$: (1) base case, check $P(n_0)$; (2) inductive step, assume $P(n)$ (the inductive hypothesis) and prove $P(n+1)$. Write out what $P(n+1)$ says before you start, and point to the exact place where you use the hypothesis.',
    resources: [levin('sec_seq-induction', 'Proof by Induction'), wiki('Mathematical_induction', 'Mathematical induction'), mcs],
  },
};

const FIB = (() => {
  const f = [0, 1, 1];
  for (let i = 3; i < 40; i++) f.push(f[i - 1] + f[i - 2]);
  return f;
})();

const strong: Skill = {
  id: 'proofs.strong',
  name: 'Strong induction',
  prereqs: ['proofs.induction'],
  levels: [
    {
      name: 'factorisation',
      generate(r) {
        return r.next() < 0.5
          ? prove('every integer $n \\ge 2$ is a product of primes.', [
              'Strong induction on $n$. Base case: $2$ is prime, a product of one prime.',
              'Inductive step: assume every $k$ with $2 \\le k < n$ is a product of primes. If $n$ is prime, done.',
              'Otherwise $n = ab$ with $2 \\le a, b < n$. By the hypothesis both $a$ and $b$ are products of primes, so $n$ is too. $\\blacksquare$',
            ])
          : prove('every positive integer is a sum of distinct powers of $2$.', [
              'Strong induction. Base case: $1 = 2^0$.',
              'Inductive step: let $n > 1$ and assume the claim for all smaller positive integers. Let $2^k$ be the largest power of $2$ with $2^k \\le n$.',
              'If $n = 2^k$, done. Otherwise $m = n - 2^k$ satisfies $0 < m < 2^k$ (else $2^{k+1} \\le n$), so $m$ is a sum of distinct powers of $2$, all less than $2^k$.',
              'Adding $2^k$ gives $n$ as a sum of distinct powers of $2$. $\\blacksquare$',
            ]);
      },
    },
    {
      name: 'stamps and coins',
      generate(r) {
        const [a, b] = r.pick([
          [3, 5],
          [3, 7],
          [4, 5],
          [3, 8],
          [5, 6],
          [4, 7],
        ]);
        const N = (a - 1) * (b - 1);
        const rep = (n: number) => {
          for (let y = 0; y * b <= n; y++) if ((n - y * b) % a === 0) return [(n - y * b) / a, y];
          return null;
        };
        const bases = range(N, N + a - 1).map((n) => {
          const [x, y] = rep(n)!;
          return `$${n} = ${[x ? `${x}\\cdot ${a}` : '', y ? `${y}\\cdot ${b}` : ''].filter(Boolean).join(' + ')}$`;
        });
        return prove(`every integer $n \\ge ${N}$ can be written as $${a}x + ${b}y$ with non-negative integers $x, y$.`, [
          `Strong induction. Base cases: the ${a} values $n = ${N}, \\dots, ${N + a - 1}$: ${bases.join(', ')}.`,
          `Inductive step: let $n \\ge ${N + a}$ and assume the claim for all $k$ with $${N} \\le k < n$.`,
          `Then $${N} \\le n - ${a} < n$, so $n - ${a} = ${a}x + ${b}y$. Hence $n = ${a}(x + 1) + ${b}y$. $\\blacksquare$`,
        ], () => range(N, N + 60).every((n) => rep(n) !== null) && rep(N - 1) === null);
      },
    },
    {
      name: 'Fibonacci numbers',
      generate(r) {
        const pool: [string, string[], () => boolean][] = [
          [
            '$F_n < 2^n$ for all $n \\ge 1$, where $F_1 = F_2 = 1$ and $F_{n} = F_{n-1} + F_{n-2}$.',
            [
              'Strong induction. Base cases: $F_1 = 1 < 2$ and $F_2 = 1 < 4$.',
              'Inductive step: for $n \\ge 3$ assume it for $n-1$ and $n-2$. Then $F_n = F_{n-1} + F_{n-2} < 2^{n-1} + 2^{n-2} < 2^{n-1} + 2^{n-1} = 2^n$. $\\blacksquare$',
            ],
            () => range(1, 35).every((n) => FIB[n] < 2 ** n),
          ],
          [
            '$F_n \\ge \\left(\\tfrac32\\right)^{n-2}$ for all $n \\ge 1$, where $F_1 = F_2 = 1$ and $F_{n} = F_{n-1} + F_{n-2}$.',
            [
              'Base cases: $F_1 = 1 \\ge \\tfrac23$ and $F_2 = 1 \\ge 1$.',
              'Inductive step: for $n \\ge 3$, $F_n = F_{n-1} + F_{n-2} \\ge \\left(\\tfrac32\\right)^{n-3} + \\left(\\tfrac32\\right)^{n-4} = \\left(\\tfrac32\\right)^{n-4}\\cdot\\tfrac52$.',
              'Since $\\tfrac52 \\ge \\tfrac94 = \\left(\\tfrac32\\right)^2$, this is at least $\\left(\\tfrac32\\right)^{n-2}$. $\\blacksquare$',
            ],
            () => range(1, 35).every((n) => FIB[n] >= 1.5 ** (n - 2) - 1e-9),
          ],
          [
            '$F_1 + F_2 + \\dots + F_n = F_{n+2} - 1$ for all $n \\ge 1$.',
            [
              'Base case $n = 1$: $F_1 = 1 = F_3 - 1 = 2 - 1$.',
              'Inductive step: $(F_1 + \\dots + F_n) + F_{n+1} = F_{n+2} - 1 + F_{n+1} = F_{n+3} - 1$. $\\blacksquare$',
            ],
            () => range(1, 30).every((n) => range(1, n).reduce((s, i) => s + FIB[i], 0) === FIB[n + 2] - 1),
          ],
          [
            'consecutive Fibonacci numbers are coprime: $\\gcd(F_n, F_{n+1}) = 1$ for all $n \\ge 1$.',
            [
              'Base case: $\\gcd(1, 1) = 1$.',
              'Inductive step: any $d$ dividing $F_{n+1}$ and $F_{n+2} = F_{n+1} + F_n$ also divides $F_{n+2} - F_{n+1} = F_n$.',
              'So $d$ divides $\\gcd(F_n, F_{n+1}) = 1$ by the hypothesis, hence $\\gcd(F_{n+1}, F_{n+2}) = 1$. $\\blacksquare$',
            ],
            () => range(1, 35).every((n) => gcd(FIB[n], FIB[n + 1]) === 1),
          ],
        ];
        const [s, proof, check] = r.pick(pool);
        return prove(s, proof, check);
      },
    },
  ],
  learn: {
    summary:
      'Strong induction lets the inductive step assume $P(k)$ for every $k$ below $n$, not just $n - 1$. Use it when $n$ breaks into smaller pieces that are not $n - 1$ (factors, $n - a$ for a fixed step $a$, two earlier Fibonacci terms). You need as many base cases as the step reaches back.',
    resources: [levin('sec_seq-induction', 'Proof by Induction'), wiki('Mathematical_induction', 'Mathematical induction'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Chapter 4: sets and functions

const setProofs: Skill = {
  id: 'proofs.sets',
  name: 'Proofs about sets',
  prereqs: ['proofs.direct'],
  levels: [
    {
      name: 'subsets',
      generate(r) {
        const [A, B, C] = r.shuffle(['A', 'B', 'C']);
        const pool: [string, string[]][] = [
          [
            `if $${A} \\subseteq ${B}$, then $${A} \\cap ${C} \\subseteq ${B} \\cap ${C}$.`,
            [
              `Let $x \\in ${A} \\cap ${C}$. Then $x \\in ${A}$ and $x \\in ${C}$.`,
              `Since $${A} \\subseteq ${B}$, $x \\in ${B}$. So $x \\in ${B} \\cap ${C}$. $\\blacksquare$`,
            ],
          ],
          [
            `if $${A} \\subseteq ${B}$ and $${B} \\subseteq ${C}$, then $${A} \\subseteq ${C}$.`,
            [`Let $x \\in ${A}$. Then $x \\in ${B}$ because $${A} \\subseteq ${B}$, and then $x \\in ${C}$ because $${B} \\subseteq ${C}$. $\\blacksquare$`],
          ],
          [
            `$${A} \\cap ${B} \\subseteq ${A} \\cup ${B}$.`,
            [`Let $x \\in ${A} \\cap ${B}$. Then in particular $x \\in ${A}$, so $x \\in ${A} \\cup ${B}$. $\\blacksquare$`],
          ],
          [
            `if $${A} \\subseteq ${B}$, then $${B}^c \\subseteq ${A}^c$.`,
            [`Let $x \\in ${B}^c$, so $x \\notin ${B}$. If $x$ were in $${A}$ it would be in $${B}$; so $x \\notin ${A}$, i.e. $x \\in ${A}^c$. $\\blacksquare$`],
          ],
        ];
        const [s, proof] = r.pick(pool);
        return prove(s, proof);
      },
    },
    {
      name: 'set equalities',
      generate(r) {
        const [A, B, C] = r.shuffle(['A', 'B', 'C']);
        const pool: [string, string[]][] = [
          [
            `$${A} \\cap (${B} \\cup ${C}) = (${A} \\cap ${B}) \\cup (${A} \\cap ${C})$.`,
            [
              'Show each side is a subset of the other.',
              `($\\subseteq$) Let $x \\in ${A} \\cap (${B} \\cup ${C})$. Then $x \\in ${A}$, and $x \\in ${B}$ or $x \\in ${C}$. In the first case $x \\in ${A} \\cap ${B}$, in the second $x \\in ${A} \\cap ${C}$; either way $x$ is in the right side.`,
              `($\\supseteq$) If $x \\in ${A} \\cap ${B}$ then $x \\in ${A}$ and $x \\in ${B} \\cup ${C}$; similarly if $x \\in ${A} \\cap ${C}$. So $x$ is in the left side. $\\blacksquare$`,
            ],
          ],
          [
            `$(${A} \\cup ${B})^c = ${A}^c \\cap ${B}^c$.`,
            [
              `$x \\in (${A} \\cup ${B})^c$ $\\iff$ $x \\notin ${A} \\cup ${B}$ $\\iff$ it is not the case that ($x \\in ${A}$ or $x \\in ${B}$).`,
              `By De Morgan this is $x \\notin ${A}$ and $x \\notin ${B}$ $\\iff$ $x \\in ${A}^c \\cap ${B}^c$. $\\blacksquare$`,
            ],
          ],
          [
            `$${A} \\setminus (${B} \\cup ${C}) = (${A} \\setminus ${B}) \\cap (${A} \\setminus ${C})$.`,
            [
              `$x \\in ${A} \\setminus (${B} \\cup ${C})$ $\\iff$ $x \\in ${A}$ and $x \\notin ${B}$ and $x \\notin ${C}$.`,
              `$\\iff$ ($x \\in ${A}$ and $x \\notin ${B}$) and ($x \\in ${A}$ and $x \\notin ${C}$) $\\iff$ $x \\in (${A} \\setminus ${B}) \\cap (${A} \\setminus ${C})$. $\\blacksquare$`,
            ],
          ],
          [
            `$${A} \\cup (${A} \\cap ${B}) = ${A}$.`,
            [
              `($\\subseteq$) If $x$ is in the left side, either $x \\in ${A}$ or $x \\in ${A} \\cap ${B} \\subseteq ${A}$; either way $x \\in ${A}$.`,
              `($\\supseteq$) If $x \\in ${A}$, then $x \\in ${A} \\cup (\\dots)$. $\\blacksquare$`,
            ],
          ],
        ];
        const [s, proof] = r.pick(pool);
        return prove(s, proof);
      },
    },
    {
      name: 'products and power sets',
      generate(r) {
        const [A, B, C] = r.shuffle(['A', 'B', 'C']);
        const pool: [string, string[]][] = [
          [
            `$${A} \\times (${B} \\cap ${C}) = (${A} \\times ${B}) \\cap (${A} \\times ${C})$.`,
            [
              `$(x, y) \\in ${A} \\times (${B} \\cap ${C})$ $\\iff$ $x \\in ${A}$ and $y \\in ${B}$ and $y \\in ${C}$.`,
              `$\\iff$ $(x, y) \\in ${A} \\times ${B}$ and $(x, y) \\in ${A} \\times ${C}$ $\\iff$ $(x, y) \\in (${A} \\times ${B}) \\cap (${A} \\times ${C})$. $\\blacksquare$`,
            ],
          ],
          [
            `$${A} \\subseteq ${B}$ if and only if $\\mathcal{P}(${A}) \\subseteq \\mathcal{P}(${B})$.`,
            [
              `($\\Rightarrow$) Assume $${A} \\subseteq ${B}$ and let $X \\in \\mathcal{P}(${A})$, i.e. $X \\subseteq ${A}$. Then $X \\subseteq ${B}$, so $X \\in \\mathcal{P}(${B})$.`,
              `($\\Leftarrow$) Assume $\\mathcal{P}(${A}) \\subseteq \\mathcal{P}(${B})$. Since $${A} \\in \\mathcal{P}(${A})$, we get $${A} \\in \\mathcal{P}(${B})$, i.e. $${A} \\subseteq ${B}$. $\\blacksquare$`,
            ],
          ],
          [
            `$\\mathcal{P}(${A}) \\cup \\mathcal{P}(${B}) \\subseteq \\mathcal{P}(${A} \\cup ${B})$.`,
            [
              `Let $X$ be in the left side, say $X \\in \\mathcal{P}(${A})$ (the other case is the same). Then $X \\subseteq ${A} \\subseteq ${A} \\cup ${B}$, so $X \\in \\mathcal{P}(${A} \\cup ${B})$. $\\blacksquare$`,
              `(Equality fails in general: with $${A} = \\{1\\}$, $${B} = \\{2\\}$, the set $\\{1, 2\\}$ is only on the right.)`,
            ],
          ],
        ];
        const [s, proof] = r.pick(pool);
        return prove(s, proof);
      },
    },
  ],
  learn: {
    summary:
      'To show $X \\subseteq Y$: "let $x \\in X$", unpack what that means, and conclude $x \\in Y$. To show $X = Y$: prove both $X \\subseteq Y$ and $Y \\subseteq X$, or chain "$x \\in X \\iff \\dots \\iff x \\in Y$" when every step is reversible. Set laws mirror logic laws: $\\cap$ is "and", $\\cup$ is "or", complement is "not".',
    resources: [levin('sec_intro-sets', 'Sets'), bookOfProof, mcs],
  },
};

const functions: Skill = {
  id: 'proofs.functions',
  name: 'Injective, surjective, bijective',
  prereqs: ['proofs.direct'],
  levels: [
    {
      name: 'linear functions',
      generate(r) {
        const a = r.nz(-7, 7);
        const b = r.int(-9, 9);
        const f = poly([a, b]).tex;
        const inv = `\\frac{${poly([1, -b], 'y').tex}}{${a}}`;
        return prove(`$f: \\mathbb{R} \\to \\mathbb{R}$, $f(x) = ${f}$, is a bijection.`, [
          `Injective: if $f(x_1) = f(x_2)$ then $${poly([a, b], 'x_1').tex} = ${poly([a, b], 'x_2').tex}$, so $${coef(a)}x_1 = ${coef(a)}x_2$ and, dividing by $${a} \\ne 0$, $x_1 = x_2$.`,
          `Surjective: given $y \\in \\mathbb{R}$, let $x = ${inv}$. Then $f(x) = y$.`,
          `So $f$ is a bijection, with inverse $f^{-1}(y) = ${inv}$. $\\blacksquare$`,
        ]);
      },
    },
    {
      name: 'compositions',
      generate(r) {
        const pool: [string, string[]][] = [
          [
            'if $f: A \\to B$ and $g: B \\to C$ are injective, then $g \\circ f$ is injective.',
            ['Suppose $g(f(x_1)) = g(f(x_2))$. Since $g$ is injective, $f(x_1) = f(x_2)$; since $f$ is injective, $x_1 = x_2$. $\\blacksquare$'],
          ],
          [
            'if $f: A \\to B$ and $g: B \\to C$ are surjective, then $g \\circ f$ is surjective.',
            ['Let $c \\in C$. Since $g$ is surjective, $c = g(b)$ for some $b \\in B$; since $f$ is surjective, $b = f(a)$ for some $a \\in A$. Then $(g \\circ f)(a) = c$. $\\blacksquare$'],
          ],
          [
            'if $g \\circ f$ is injective, then $f$ is injective.',
            ['Suppose $f(x_1) = f(x_2)$. Applying $g$: $g(f(x_1)) = g(f(x_2))$, and since $g \\circ f$ is injective, $x_1 = x_2$. $\\blacksquare$'],
          ],
          [
            'if $g \\circ f$ is surjective, then $g$ is surjective.',
            ['Let $c \\in C$. There is $a \\in A$ with $g(f(a)) = c$. Then $b = f(a)$ satisfies $g(b) = c$. $\\blacksquare$'],
          ],
        ];
        const [s, proof] = r.pick(pool);
        return prove(s, proof);
      },
    },
    {
      name: 'rational functions',
      generate(r) {
        let a, b, c, d;
        do {
          a = r.int(-5, 5);
          b = r.int(-6, 6);
          c = r.nz(-4, 4);
          d = r.int(-6, 6);
        } while (a * d - b * c === 0);
        const D = new Q(-d, c);
        const R = new Q(a, c);
        const k = a * d - b * c;
        return prove(
          `$f(x) = \\dfrac{${poly([a, b]).tex}}{${poly([c, d]).tex}}$ is a bijection from $\\mathbb{R} \\setminus \\{${D.tex()}\\}$ to $\\mathbb{R} \\setminus \\{${R.tex()}\\}$.`,
          [
            `Well defined: if $f(x) = ${R.tex()}$ then cross-multiplying gives $${c}(${poly([a, b]).tex}) = ${a}(${poly([c, d]).tex})$, i.e. $${c * b} = ${a * d}$, false since $ad - bc = ${k} \\ne 0$. So $f$ never takes the value $${R.tex()}$.`,
            `Injective: $f(x_1) = f(x_2)$ cross-multiplies to $(ax_1 + b)(cx_2 + d) = (ax_2 + b)(cx_1 + d)$, which simplifies to $(ad - bc)(x_1 - x_2) = 0$, so $x_1 = x_2$.`,
            `Surjective: given $y \\ne ${R.tex()}$, solving $y = f(x)$ gives $x = \\dfrac{${poly([d, -b], 'y').tex}}{${poly([-c, a], 'y').tex}}$, defined since $y \\ne ${R.tex()}$; and $x \\ne ${D.tex()}$, because that would force $ad - bc = 0$. $\\blacksquare$`,
          ],
        );
      },
    },
  ],
  learn: {
    summary:
      'Injective: $f(x_1) = f(x_2) \\Rightarrow x_1 = x_2$ (start from equal outputs and derive equal inputs). Surjective: for every $y$ in the codomain find an $x$ with $f(x) = y$ (usually by solving for $x$, then checking it lies in the domain). Bijective: both, equivalently $f$ has an inverse.',
    resources: [levin('sec_intro-functions', 'Functions'), wiki('Bijection,_injection_and_surjection', 'Bijection, injection and surjection'), bookOfProof],
  },
};

// ---------------------------------------------------------------------------

export const proofsChapters: Chapter[] = [
  {
    id: 'proofs.ch.direct',
    title: 'Direct proof',
    about: 'Proving "if $P$ then $Q$" by assuming $P$ and computing: parity, divisibility, sums and simple inequalities.',
    why: 'Most proofs you will ever write are direct. Getting fluent with definitions (even, divides, remainder) is most of the work.',
    resources: [bookOfProof, levin('sec_logic-proofs', 'Proofs'), mcs],
    skills: [direct],
    deeper: [],
  },
  {
    id: 'proofs.ch.indirect',
    title: 'Contrapositive and contradiction',
    about: 'Proving a statement through its contrapositive, or by assuming it fails and deriving something impossible.',
    why: 'Irrationality, infinitude of primes, impossibility results and lower bounds in computer science are all proofs by contradiction.',
    resources: [bookOfProof, wiki('Proof_by_contradiction', 'Proof by contradiction'), wiki('Contraposition', 'Contraposition')],
    skills: [contrapositive, contradiction],
    deeper: [],
  },
  {
    id: 'proofs.ch.induction',
    title: 'Induction',
    about: 'Ordinary induction for sums, divisibility and inequalities; strong induction for factorisations, coins and Fibonacci numbers.',
    why: 'Induction is how you prove loops and recursive algorithms correct and analyse their running time.',
    resources: [levin('sec_seq-induction', 'Proof by Induction'), wiki('Mathematical_induction', 'Mathematical induction'), mcs],
    skills: [induction, strong],
    deeper: [],
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

