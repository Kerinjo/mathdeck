// Number Theory: widened levels, new sections and the chapter list.
import type { Chapter, Problem, Rng, Skill } from '../core/types';
import { mix } from './calc-helpers';
import { diffieHellman, orders } from './cs-deeper';
import { distinct } from './helpers';
import {
  crt,
  factor,
  factorTex,
  fermat,
  gcd,
  gcdSkill,
  inverses,
  isPrime,
  khanCrypto,
  levin,
  mcs,
  mod,
  modArith,
  num,
  powmod,
  primes,
  PRIMES,
  rsa,
  wiki,
  yesNo,
} from './numtheory';

type Gen = (r: Rng) => Problem;

const choice = (options: string[], correct: number): Problem['answer'] => ({ kind: 'choice', options, correct });
const trueFalse = (t: boolean) => choice(['True', 'False'], t ? 0 : 1);
const digits = (n: number) => String(n).split('').map(Number);
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
/** An integer answer typed as digits (for base-b numerals too). */
const digitsAns = (s: string): Problem['answer'] => ({ kind: 'number', expected: s, integer: true });

// ---------------------------------------------------------------------------
// Divisibility: wider levels

const smallestFactor: Gen = (r) => {
  let n: number;
  let p: number;
  do {
    p = r.pick(PRIMES.filter((q) => q >= 7 && q <= 31));
    const q = r.pick(PRIMES.filter((x) => x >= p && x <= 47));
    n = p * q;
  } while (n < 100);
  return {
    prompt: `What is the smallest prime factor of ${n}?`,
    answer: num(p),
    hint: `It is not 2, 3 or 5 (check!). Try 7, 11, 13, … up to $\\sqrt{${n}}$.`,
    solution: [`$${n}$ is odd, its digit sum is not a multiple of 3, and it does not end in 0 or 5.`, `Trying 7, 11, 13, …: $${n} = ${p}\\cdot ${n / p}$, so the smallest prime factor is ${p}.`],
  };
};

const legendre: Gen = (r) => {
  const p = r.pick([2, 3, 5, 7]);
  const n = r.int(10, 120);
  let k = 0;
  const terms: string[] = [];
  for (let q = p; q <= n; q *= p) {
    k += Math.floor(n / q);
    terms.push(`\\lfloor ${n}/${q} \\rfloor`);
  }
  return {
    prompt: `What is the largest $k$ such that $${p}^{k}$ divides $${n}!$?`,
    answer: num(k),
    solution: [`Legendre's formula: count multiples of ${p}, then of ${p}², ${p}³, … (each contributes one more factor of ${p}).`, `$${terms.join(' + ')} = ${k}$`],
  };
};

const primesDeep: Skill = {
  ...primes,
  levels: [
    { name: 'prime or not?', generate: mix(primes.levels[0].generate, smallestFactor) },
    primes.levels[1],
    { name: 'factorials and divisor sums', generate: mix(primes.levels[2].generate, legendre) },
  ],
};

const gcdThree: Gen = (r) => {
  if (r.next() < 0.5) {
    const g = r.int(2, 12);
    let a: number, b: number, c: number;
    do [a, b, c] = [g * r.int(2, 15), g * r.int(2, 15), g * r.int(2, 15)];
    while (gcd(gcd(a, b), c) !== g || new Set([a, b, c]).size < 3);
    return {
      prompt: `Find $\\gcd(${a}, ${b}, ${c})$.`,
      answer: num(g),
      solution: [`$\\gcd(${a}, ${b}, ${c}) = \\gcd(\\gcd(${a}, ${b}), ${c}) = \\gcd(${gcd(a, b)}, ${c})$.`, `$= ${g}$`],
    };
  }
  const ps = [2, 3, 5, 7];
  const e1 = ps.map(() => r.int(0, 4));
  const e2 = ps.map(() => r.int(0, 4));
  const wantLcm = r.next() < 0.5;
  const tex = (e: number[]) => ps.map((p, i) => (e[i] ? `${p}^{${e[i]}}` : '')).filter(Boolean).join(' \\cdot ') || '1';
  const res = ps.reduce((acc, p, i) => acc * p ** (wantLcm ? Math.max(e1[i], e2[i]) : Math.min(e1[i], e2[i])), 1);
  return {
    prompt: `$a = ${tex(e1)}$ and $b = ${tex(e2)}$. Find $${wantLcm ? '\\operatorname{lcm}' : '\\gcd'}(a, b)$.`,
    answer: num(res),
    solution: [`Take each prime to the ${wantLcm ? 'larger' : 'smaller'} of its two exponents: $${tex(ps.map((_, i) => (wantLcm ? Math.max(e1[i], e2[i]) : Math.min(e1[i], e2[i]))))}$.`, `$= ${res}$`],
  };
};

const lcmWords: Gen = (r) => {
  const [a, b] = distinct(r, 2, 6, 40);
  const h = r.int(7, 10);
  const L = lcm(a, b);
  return {
    prompt: `Bus A leaves the station every ${a} minutes and bus B every ${b} minutes. Both leave together at ${h}:00. After how many minutes do they next leave together?`,
    answer: num(L),
    solution: [`They coincide every common multiple of ${a} and ${b}; the first one is the lcm.`, `$\\operatorname{lcm}(${a}, ${b}) = \\frac{${a}\\cdot ${b}}{\\gcd(${a}, ${b})} = \\frac{${a * b}}{${gcd(a, b)}} = ${L}$`],
  };
};

const gcdDeep: Skill = {
  ...gcdSkill,
  levels: [
    { name: 'gcd', generate: mix(gcdSkill.levels[0].generate, gcdThree) },
    { name: 'lcm', generate: mix(gcdSkill.levels[1].generate, lcmWords) },
    gcdSkill.levels[2],
  ],
};

// ---------------------------------------------------------------------------
// Divisibility rules

const PROPERTIES: { s: string; t: boolean; why: string }[] = [
  { s: 'If $a \\mid bc$ and $\\gcd(a, b) = 1$, then $a \\mid c$.', t: true, why: "Euclid's lemma: write $1 = ax + by$, multiply by $c$: $c = acx + bcy$, and $a$ divides both terms." },
  { s: 'If $a \\mid bc$, then $a \\mid b$ or $a \\mid c$.', t: false, why: '$6 \\mid 4 \\cdot 3$, but $6 \\nmid 4$ and $6 \\nmid 3$. It is true when $a$ is prime.' },
  { s: 'If $a \\mid b$ and $b \\mid c$, then $a \\mid c$.', t: true, why: '$b = ak$ and $c = bm$, so $c = a(km)$.' },
  { s: 'If $a \\mid b + c$ and $a \\mid b$, then $a \\mid c$.', t: true, why: '$c = (b + c) - b$ is a difference of two multiples of $a$.' },
  { s: 'If $a \\mid b^{2}$, then $a \\mid b$.', t: false, why: '$4 \\mid 2^2$ but $4 \\nmid 2$.' },
  { s: 'If $a^{2} \\mid b^{2}$, then $a \\mid b$.', t: true, why: 'Compare prime exponents: $2e_p(a) \\le 2e_p(b)$ gives $e_p(a) \\le e_p(b)$ for every prime.' },
  { s: 'If $\\gcd(a, b) = 1$ and $\\gcd(a, c) = 1$, then $\\gcd(a, bc) = 1$.', t: true, why: 'A prime dividing $a$ and $bc$ would divide $b$ or $c$ (it is prime), contradicting the assumptions.' },
  { s: 'If $a \\mid c$ and $b \\mid c$, then $ab \\mid c$.', t: false, why: '$2 \\mid 2$ and $2 \\mid 2$, but $4 \\nmid 2$. It is true when $\\gcd(a, b) = 1$.' },
  { s: 'The product of any three consecutive integers is divisible by 6.', t: true, why: 'Among three consecutive integers one is even and one is a multiple of 3.' },
  { s: 'If $n$ is odd, then $8 \\mid n^{2} - 1$.', t: true, why: '$n^2 - 1 = (n - 1)(n + 1)$: two consecutive even numbers, one of them a multiple of 4.' },
  { s: '$n^{2} + n + 41$ is prime for every integer $n \\ge 0$.', t: false, why: 'At $n = 40$: $40^2 + 40 + 41 = 41^2$. Checking many cases proves nothing.' },
  { s: 'Every integer greater than 1 has a prime divisor.', t: true, why: 'Its smallest divisor greater than 1 cannot have a smaller divisor, so it is prime.' },
];

const rules: Skill = {
  id: 'nt.rules',
  name: 'Divisibility rules',
  prereqs: ['nt.div'],
  levels: [
    {
      name: 'digit tests',
      generate: mix(
        (r) => {
          const n = r.int(10 ** 5, 10 ** 8);
          const m = r.pick([3, 9]);
          const s = digits(n).reduce((a, b) => a + b, 0);
          return {
            prompt: `What is the remainder when ${n} is divided by ${m}?`,
            answer: num(n % m),
            hint: `$10 \\equiv 1 \\pmod{${m}}$: a number and its digit sum leave the same remainder.`,
            solution: [`Digit sum: $${digits(n).join(' + ')} = ${s}$.`, `$${s} \\bmod ${m} = ${n % m}$`],
          };
        },
        (r) => {
          const d = r.pick([4, 6, 8, 11, 12]);
          const yes = r.next() < 0.5;
          let n: number;
          do n = r.int(10 ** 4, 10 ** 7);
          while ((n % d === 0) !== yes);
          const why: Record<number, string> = {
            4: `The last two digits $${String(n).slice(-2)}$ ${n % 4 === 0 ? 'are' : 'are not'} a multiple of 4.`,
            8: `The last three digits $${String(n).slice(-3)}$ ${n % 8 === 0 ? 'are' : 'are not'} a multiple of 8.`,
            6: `Divisible by 6 means by 2 and by 3: it is ${n % 2 ? 'odd' : 'even'} and its digit sum is $${digits(n).reduce((a, b) => a + b, 0)}$.`,
            12: `Divisible by 12 means by 3 and by 4: digit sum $${digits(n).reduce((a, b) => a + b, 0)}$, last two digits $${String(n).slice(-2)}$.`,
            11: `Alternating digit sum from the right: $${digits(n).reverse().map((x, i) => (i % 2 ? `-${x}` : `+${x}`)).join(' ').replace(/^\+/, '')} = ${digits(n).reverse().reduce((a, x, i) => a + (i % 2 ? -x : x), 0)}$, ${n % 11 === 0 ? 'a' : 'not a'} multiple of 11.`,
          };
          return { prompt: `Is ${n} divisible by ${d}?`, answer: yesNo(n % d === 0), solution: [why[d]] };
        },
      ),
    },
    {
      name: 'missing digits and 11',
      generate: mix(
        (r) => {
          const m = r.pick([9, 11]);
          for (;;) {
            const ds = Array.from({ length: r.int(4, 6) }, (_, i) => (i === 0 ? r.int(1, 9) : r.int(0, 9)));
            const pos = r.int(1, ds.length - 1);
            const fits = Array.from({ length: 10 }, (_, d) => d).filter((d) => {
              const t = [...ds];
              t[pos] = d;
              return Number(t.join('')) % m === 0;
            });
            if (fits.length !== 1) continue;
            const shown = ds.map((x, i) => (i === pos ? '\\square' : x)).join('');
            return {
              prompt: `Which digit goes in the box to make $${shown}$ divisible by ${m}?`,
              answer: num(fits[0]),
              solution: [m === 9 ? 'Divisible by 9 exactly when the digit sum is.' : 'Divisible by 11 exactly when the alternating digit sum is.', `Only $${fits[0]}$ works: $${ds.map((x, i) => (i === pos ? fits[0] : x)).join('')}$.`],
            };
          }
        },
        (r) => {
          const n = r.int(10 ** 4, 10 ** 7);
          const alt = digits(n).reverse().reduce((a, x, i) => a + (i % 2 ? -x : x), 0);
          return {
            prompt: `What is the remainder when ${n} is divided by 11?`,
            answer: num(n % 11),
            hint: '$10 \\equiv -1 \\pmod{11}$: alternate signs from the last digit.',
            solution: [`Alternating sum from the right: $${alt}$.`, `$${alt} \\bmod 11 = ${mod(alt, 11)}$`],
          };
        },
      ),
    },
    {
      name: 'true or false?',
      generate(r) {
        const p = r.pick(PROPERTIES);
        return { prompt: `True or false: ${p.s}`, answer: trueFalse(p.t), solution: [p.why] };
      },
    },
  ],
  learn: {
    summary:
      'Since $10 \\equiv 1 \\pmod 9$, a number is congruent to its digit sum mod 9 (and mod 3). Since $10 \\equiv -1 \\pmod{11}$, use the alternating digit sum for 11. Since $100 \\equiv 0 \\pmod 4$ and $1000 \\equiv 0 \\pmod 8$, only the last two or three digits matter there. Euclid’s lemma: if $a \\mid bc$ and $\\gcd(a, b) = 1$ then $a \\mid c$; for $a$ prime this means $a \\mid b$ or $a \\mid c$.',
    resources: [wiki('Divisibility_rule', 'Divisibility rule'), wiki('Euclid%27s_lemma', "Euclid's lemma"), levin],
  },
};

// ---------------------------------------------------------------------------
// Linear Diophantine equations

/** Non-negative solutions of ax + by = c. */
const nonneg = (a: number, b: number, c: number) => {
  const out: [number, number][] = [];
  for (let x = 0; a * x <= c; x++) if ((c - a * x) % b === 0) out.push([x, (c - a * x) / b]);
  return out;
};

const diophantine: Skill = {
  id: 'nt.dioph',
  name: 'Linear Diophantine equations',
  prereqs: ['nt.gcd'],
  levels: [
    {
      name: 'solvable?',
      generate: mix(
        (r) => {
          const g = r.int(2, 9);
          const [a, b] = [g * r.int(2, 12), g * r.int(2, 12)];
          const yes = r.next() < 0.5;
          let c: number;
          do c = r.int(10, 200);
          while ((c % gcd(a, b) === 0) !== yes);
          return {
            prompt: `Does $${a}x + ${b}y = ${c}$ have a solution in integers?`,
            answer: yesNo(yes),
            solution: [`$ax + by$ is always a multiple of $\\gcd(a, b) = ${gcd(a, b)}$, and every multiple is reachable (Bézout).`, `${gcd(a, b)} ${yes ? 'divides' : 'does not divide'} ${c}: ${yes ? 'solvable' : 'no solutions'}.`],
          };
        },
        (r) => {
          let a: number, b: number;
          do [a, b] = [r.int(3, 15), r.int(3, 15)];
          while (gcd(a, b) !== 1 || a === b);
          const c = r.int(20, 120);
          let x = 0;
          while (mod(c - a * x, b) !== 0) x++;
          const y = (c - a * x) / b;
          return {
            prompt: `Find the integer solution of $${a}x + ${b}y = ${c}$ with the smallest non-negative $x$. Give $x$.`,
            answer: num(x),
            hint: `Solutions for $x$ repeat every $${b}$: solve $${a}x \\equiv ${c} \\pmod{${b}}$.`,
            solution: [`Reduce mod ${b}: $${a}x \\equiv ${c} \\pmod{${b}}$, so $x \\equiv ${x} \\pmod{${b}}$.`, `$x = ${x}$, $y = ${y}$; all solutions are $x = ${x} + ${b}t$, $y = ${y} - ${a}t$.`],
            selfCheck: () => a * x + b * y === c && x < b,
          };
        },
      ),
    },
    {
      name: 'counting non-negative solutions',
      generate(r) {
        let a: number, b: number, c: number, sols: [number, number][];
        do {
          [a, b] = distinct(r, 2, 2, 12);
          c = r.int(30, 150);
          sols = nonneg(a, b, c);
        } while (gcd(a, b) !== 1 || sols.length > 12);
        const coins = r.next() < 0.5;
        return {
          prompt: coins
            ? `In how many ways can you pay exactly ${c} cents using only ${a}-cent and ${b}-cent coins?`
            : `How many solutions does $${a}x + ${b}y = ${c}$ have with $x, y \\ge 0$ integers?`,
          answer: num(sols.length),
          solution: sols.length
            ? [`One solution: $(x, y) = (${sols[0].join(', ')})$. The others step by $x \\mapsto x + ${b}$, $y \\mapsto y - ${a}$ while $y \\ge 0$.`, `Solutions: ${sols.map((s) => `$(${s.join(', ')})$`).join(', ')}: ${sols.length} in total.`]
            : [`$${a}x \\equiv ${c} \\pmod{${b}}$ forces $x \\equiv ${mod((c * inv(a, b)) % b, b)} \\pmod{${b}}$, and already that $x$ makes $${a}x > ${c}$. No solutions.`],
          selfCheck: () => sols.every(([x, y]) => a * x + b * y === c && x >= 0 && y >= 0),
        };
      },
    },
    {
      name: 'the coin problem',
      generate: mix(
        (r) => {
          let a: number, b: number;
          do [a, b] = distinct(r, 2, 3, 13).sort((p, q) => p - q);
          while (gcd(a, b) !== 1);
          const F = a * b - a - b;
          return {
            prompt: `A shop sells nuggets only in boxes of ${a} and ${b}. What is the largest number of nuggets you cannot buy exactly?`,
            answer: num(F),
            solution: [`For coprime $a, b$ the largest amount not of the form $ax + by$ ($x, y \\ge 0$) is $ab - a - b$ (Frobenius/Sylvester).`, `$${a}\\cdot ${b} - ${a} - ${b} = ${F}$`],
            selfCheck: () => nonneg(a, b, F).length === 0 && [1, 2, 3, 4, 5].every((k) => nonneg(a, b, F + k).length > 0),
          };
        },
        (r) => {
          let a: number, b: number;
          do [a, b] = distinct(r, 2, 3, 11).sort((p, q) => p - q);
          while (gcd(a, b) !== 1);
          const cnt = ((a - 1) * (b - 1)) / 2;
          return {
            prompt: `With stamps worth ${a} and ${b}, how many positive amounts cannot be made exactly?`,
            answer: num(cnt),
            solution: ['Exactly half of the numbers $0, \\dots, ab - a - b$ are representable (Sylvester).', `$\\frac{(${a} - 1)(${b} - 1)}{2} = ${cnt}$`],
            selfCheck: () => Array.from({ length: a * b }, (_, n) => n + 1).filter((n) => nonneg(a, b, n).length === 0).length === cnt,
          };
        },
        (r) => {
          let a: number, b: number;
          do [a, b] = distinct(r, 2, 3, 11).sort((p, q) => p - q);
          while (gcd(a, b) !== 1);
          const c = r.int(1, a * b - a - b + 5);
          const yes = nonneg(a, b, c).length > 0;
          return {
            prompt: `Can ${c} be written as $${a}x + ${b}y$ with $x, y \\ge 0$ integers?`,
            answer: yesNo(yes),
            solution: [yes ? `Yes: $${a}\\cdot ${nonneg(a, b, c)[0][0]} + ${b}\\cdot ${nonneg(a, b, c)[0][1]} = ${c}$.` : `No: the only $x$ with $${a}x \\equiv ${c} \\pmod{${b}}$ in range already overshoots.`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      '$ax + by = c$ has integer solutions exactly when $\\gcd(a, b) \\mid c$. From one solution $(x_0, y_0)$ all others are $x = x_0 + \\frac{b}{g}t$, $y = y_0 - \\frac{a}{g}t$. Restricting to $x, y \\ge 0$ leaves finitely many. For coprime $a, b$ every amount above $ab - a - b$ can be made from $a$s and $b$s, and exactly $\\frac{(a-1)(b-1)}{2}$ positive amounts cannot.',
    resources: [wiki('Diophantine_equation', 'Diophantine equation'), wiki('Coin_problem', 'Coin problem'), mcs],
  },
};
const inv = (a: number, m: number) => {
  for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
  return 0;
};

// ---------------------------------------------------------------------------
// Number bases

const toBase = (n: number, b: number) => n.toString(b).toUpperCase();
const sub = (s: string, b: number) => `${s}_{${b}}`;

const bases: Skill = {
  id: 'nt.bases',
  name: 'Number bases',
  prereqs: [],
  levels: [
    {
      name: 'converting',
      generate: mix(
        (r) => {
          const b = r.pick([2, 3, 5, 7, 8]);
          const n = r.int(b * b, b === 2 ? 255 : 700);
          const s = toBase(n, b);
          return {
            prompt: `Convert $${sub(s, b)}$ to base 10.`,
            answer: num(n),
            solution: [`$${s
              .split('')
              .map((d, i) => `${d}\\cdot ${b}^{${s.length - 1 - i}}`)
              .join(' + ')}$`, `$= ${n}$`],
          };
        },
        (r) => {
          const b = r.pick([2, 3, 4, 5, 8]);
          const n = r.int(b * b, b === 2 ? 200 : 600);
          const s = toBase(n, b);
          const steps: string[] = [];
          for (let m = n; m > 0; m = Math.floor(m / b)) steps.push(`${m} = ${b}\\cdot ${Math.floor(m / b)} + ${m % b}`);
          return {
            prompt: `Write ${n} in base ${b}.`,
            answer: digitsAns(s),
            inputHint: 'Type the digits, e.g. 1011.',
            solution: ['Divide repeatedly by the base; the remainders, read from last to first, are the digits.', `$${steps.join(',\\ ')}$`, `$${n} = ${sub(s, b)}$`],
          };
        },
        (r) => {
          const n = r.int(30, 4095);
          const s = toBase(n, 16);
          return {
            prompt: `Convert the hexadecimal number $\\texttt{${s}}$ to base 10.`,
            answer: num(n),
            solution: ['Hex digits run $0$–$9$, then $\\texttt{A} = 10, \\dots, \\texttt{F} = 15$.', `$${s
              .split('')
              .map((d, i) => `${parseInt(d, 16)}\\cdot 16^{${s.length - 1 - i}}`)
              .join(' + ')} = ${n}$`],
          };
        },
      ),
    },
    {
      name: 'arithmetic in base b',
      generate(r) {
        const b = r.pick([2, 3, 5, 6, 7, 8]);
        const [x, y] = [r.int(b * 2, b ** 3), r.int(b * 2, b ** 3)];
        const op = r.pick(['+', '×'] as const);
        const res = op === '+' ? x + y : x * y;
        if (op === '×' && toBase(res, b).length > 7) return bases.levels[1].generate(r);
        return {
          prompt: `Compute $${sub(toBase(x, b), b)} ${op === '+' ? '+' : '\\times'} ${sub(toBase(y, b), b)}$ and give the answer in base ${b}.`,
          answer: digitsAns(toBase(res, b)),
          inputHint: `Type the base-${b} digits.`,
          solution: [`In base 10 these are ${x} and ${y}${op === '+' ? `; the sum is ${res}` : `; the product is ${res}`}. (Or work column by column, carrying at ${b}.)`, `$${res} = ${sub(toBase(res, b), b)}$`],
        };
      },
    },
    {
      name: 'reasoning about bases',
      generate: mix(
        (r) => {
          const b = r.int(4, 15);
          const [p, q, s] = [r.int(1, 3), r.int(0, 3), r.int(0, 3)];
          const n = p * b * b + q * b + s;
          return {
            prompt: `In which base $b$ does $${p}${q}${s}_{b}$ equal ${n}?`,
            answer: num(b),
            solution: [`$${p}b^2 + ${q}b + ${s} = ${n}$.`, `Try values (or solve the quadratic): $b = ${b}$.`],
            selfCheck: () => Array.from({ length: 30 }, (_, k) => k + 4).filter((bb) => p * bb * bb + q * bb + s === n).length === 1,
          };
        },
        (r) => {
          const e = r.int(5, 16);
          const n = r.int(2 ** e, 2 ** (e + 1) - 1);
          return {
            prompt: `How many digits does ${n} have in binary?`,
            answer: num(n.toString(2).length),
            solution: [`$2^{${n.toString(2).length - 1}} = ${2 ** (n.toString(2).length - 1)} \\le ${n} < ${2 ** n.toString(2).length} = 2^{${n.toString(2).length}}$.`, `So ${n.toString(2).length} binary digits: $${n.toString(2)}$.`],
          };
        },
        (r) => {
          const b = r.pick([3, 4, 5, 6, 7, 9]);
          const n = r.int(1000, 99999);
          return {
            prompt: `What is the last digit of ${n} when written in base ${b}?`,
            answer: num(n % b),
            solution: [`The last base-${b} digit is the remainder mod ${b}.`, `$${n} \\bmod ${b} = ${n % b}$`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'In base $b$ the digits $d_k \\dots d_1 d_0$ mean $d_k b^k + \\dots + d_1 b + d_0$. To convert to base $b$, divide repeatedly by $b$ and read the remainders backwards. The last digit in base $b$ is $n \\bmod b$; $n$ has $\\lfloor\\log_b n\\rfloor + 1$ digits. Hexadecimal (base 16) uses A–F for 10–15; one hex digit is four bits.',
    resources: [wiki('Positional_notation', 'Positional notation'), wiki('Hexadecimal', 'Hexadecimal'), khanCrypto],
  },
};

// ---------------------------------------------------------------------------
// Modular arithmetic: wider levels

const weekday: Gen = (r) => {
  const d0 = r.int(0, 6);
  const n = r.int(50, 5000);
  const ans = (d0 + n) % 7;
  return {
    prompt: `Today is ${DAYS[d0]}. What day of the week will it be in ${n} days?`,
    answer: choice(DAYS, ans),
    solution: [`Only $${n} \\bmod 7 = ${n % 7}$ matters.`, `${n % 7} day${n % 7 === 1 ? '' : 's'} after ${DAYS[d0]} is ${DAYS[ans]}.`],
  };
};

const negativeMod: Gen = (r) => {
  const m = r.int(3, 17);
  const a = -r.int(m + 1, 200);
  return {
    prompt: `Compute $${a} \\bmod ${m}$ (an answer from 0 to ${m - 1}).`,
    answer: num(mod(a, m)),
    solution: [`Add multiples of ${m} until you land in $0, \\dots, ${m - 1}$: $${a} + ${m}\\cdot ${(mod(a, m) - a) / m} = ${mod(a, m)}$.`, `(Not $${-(-a % m)}$: remainders are never negative.)`],
  };
};

const modDeep: Skill = { ...modArith, levels: [{ name: 'reduce as you go', generate: mix(modArith.levels[0].generate, weekday, negativeMod) }, modArith.levels[1], modArith.levels[2]] };

// ---------------------------------------------------------------------------
// Fermat chapter: Wilson's theorem and the Fermat test

const wilson: Gen = (r) => {
  const p = r.pick(PRIMES.filter((q) => q >= 7 && q <= 97));
  const k = r.int(1, 3);
  const ans = k === 1 ? p - 1 : k === 2 ? 1 : (p - 1) / 2;
  return {
    prompt: `Compute $(${p} - ${k})! \\bmod ${p}$.`,
    answer: num(ans),
    hint: `${p} is prime: Wilson's theorem says $(p - 1)! \\equiv -1 \\pmod p$.`,
    solution: [
      `Wilson: $${p - 1}! \\equiv -1 \\pmod{${p}}$.`,
      k === 1
        ? `So the answer is $${p} - 1 = ${p - 1}$.`
        : k === 2
          ? `$${p - 1}! = ${p - 1}\\cdot ${p - 2}!$ and $${p - 1} \\equiv -1$, so $${p - 2}! \\equiv 1$.`
          : `$${p - 1}! = ${p - 1}\\cdot ${p - 2}\\cdot ${p - 3}! \\equiv (-1)(-2)\\cdot ${p - 3}!$, so $2\\cdot ${p - 3}! \\equiv -1$ and $${p - 3}! \\equiv ${ans}$.`,
    ],
    selfCheck: () => {
      let f = 1;
      for (let i = 2; i <= p - k; i++) f = (f * i) % p;
      return f === ans;
    },
  };
};

const fermatTest: Gen = (r) => {
  const pool = [341, 561, 645, 1105, 91, 15, 21, 25, 35, 33, 39, 45, 49, 51, 55, 57, 63, 65, 69, 77, 85, 87, 93, 95, 97, 101, 103, 107, 109, 113];
  const n = r.pick(pool);
  const v = powmod(2, n - 1, n);
  const passes = v === 1;
  return {
    prompt: `Compute $2^{${n - 1}} \\bmod ${n}$. Does ${n} pass the Fermat test with base 2 (is the result 1)?`,
    answer: yesNo(passes),
    solution: [
      `Repeated squaring gives $2^{${n - 1}} \\equiv ${v} \\pmod{${n}}$.`,
      passes
        ? isPrime(n)
          ? `It passes, as every prime must (Fermat's little theorem).`
          : `It passes, but $${n} = ${factorTex(factor(n))}$ is composite: a pseudoprime. Passing is evidence, not proof.`
        : `It fails, which proves ${n} is composite${isPrime(n) ? '' : ` ($${n} = ${factorTex(factor(n))}$)`} without finding a factor.`,
    ],
    selfCheck: () => !isPrime(n) || passes,
  };
};

const fermatDeep: Skill = {
  ...fermat,
  levels: [fermat.levels[0], { name: 'Fermat and Wilson: prime modulus', generate: mix(fermat.levels[1].generate, wilson) }, { name: 'Euler and the Fermat test', generate: mix(fermat.levels[2].generate, fermatTest) }],
  learn: {
    ...fermat.learn,
    summary:
      "Fermat's little theorem: if $p$ is prime and $p \\nmid a$, then $a^{p-1} \\equiv 1 \\pmod p$. Euler's generalisation: if $\\gcd(a, n) = 1$, then $a^{\\varphi(n)} \\equiv 1 \\pmod n$, so exponents can be reduced mod $p - 1$ (or $\\varphi(n)$). Wilson's theorem: $(p - 1)! \\equiv -1 \\pmod p$ for prime $p$. The Fermat test checks $2^{n-1} \\equiv 1 \\pmod n$: failing proves $n$ composite; passing does not prove it prime (pseudoprimes like 341, Carmichael numbers like 561).",
  },
};

// ---------------------------------------------------------------------------
// Going deeper: arithmetic functions

const sigma = (n: number) => factor(n).reduce((acc, [p, e]) => acc * ((p ** (e + 1) - 1) / (p - 1)), 1);
const tau = (n: number) => factor(n).reduce((acc, [, e]) => acc * (e + 1), 1);
const mobius = (n: number) => (n === 1 ? 1 : factor(n).some(([, e]) => e > 1) ? 0 : (-1) ** factor(n).length);
const SMALLEST_WITH: Record<number, number> = { 4: 6, 5: 16, 6: 12, 7: 64, 8: 24, 9: 36, 10: 48, 12: 60 };

const arithmetic: Skill = {
  id: 'nt.arith',
  name: 'Arithmetic functions',
  prereqs: ['nt.div'],
  levels: [
    {
      name: 'perfect, abundant, deficient',
      generate(r) {
        const n = r.pick([6, 28, 496, 12, 18, 20, 24, 30, 36, 40, 8, 10, 14, 15, 16, 21, 25, 27, 32, 45, 50, 70, 100]);
        const s = sigma(n) - n;
        const k = s === n ? 0 : s > n ? 1 : 2;
        return {
          prompt: `The proper divisors of ${n} (all divisors except ${n} itself) sum to $s$. Is ${n} perfect ($s = ${n}$), abundant ($s > ${n}$) or deficient ($s < ${n}$)?`,
          answer: choice(['Perfect', 'Abundant', 'Deficient'], k),
          solution: [`$\\sigma(${n}) = ${sigma(n)}$, so the proper divisors sum to $${s}$.`, `${k === 0 ? 'Equal' : k === 1 ? 'Larger' : 'Smaller'}: ${['perfect', 'abundant', 'deficient'][k]}.`],
        };
      },
    },
    {
      name: 'the Möbius function',
      generate: mix(
        (r) => {
          const n = r.int(2, 300);
          const f = factor(n);
          return {
            prompt: `Compute $\\mu(${n})$.`,
            answer: { kind: 'number', expected: `${mobius(n)}`, integer: true },
            solution: [`$${n} = ${factorTex(f)}$.`, f.some(([, e]) => e > 1) ? 'A repeated prime factor makes $\\mu = 0$.' : `Square-free with ${f.length} prime factor${f.length > 1 ? 's' : ''}: $\\mu = (-1)^{${f.length}} = ${mobius(n)}$.`],
          };
        },
        (r) => {
          const n = r.int(2, 200);
          const divs = Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
          const s = divs.reduce((a, d) => a + mobius(d), 0);
          return {
            prompt: `Compute $\\displaystyle\\sum_{d \\mid ${n}} \\mu(d)$.`,
            answer: num(s),
            hint: 'There is a one-line answer for every $n > 1$.',
            solution: ['$\\sum_{d \\mid n}\\mu(d) = 0$ for every $n > 1$: the square-free divisors pair up with opposite signs.', `So the sum is $${s}$.`],
            selfCheck: () => s === 0,
          };
        },
      ),
    },
    {
      name: 'counting divisors backwards',
      generate: mix(
        (r) => {
          const k = Number(r.pick(Object.keys(SMALLEST_WITH)));
          return {
            prompt: `What is the smallest positive integer with exactly ${k} divisors?`,
            answer: num(SMALLEST_WITH[k]),
            solution: [`$\\tau(p_1^{e_1}\\cdots) = (e_1 + 1)\\cdots$: list the ways to write ${k} as such a product and use the smallest primes with the largest exponents.`, `$${SMALLEST_WITH[k]} = ${factorTex(factor(SMALLEST_WITH[k]))}$`],
            selfCheck: () => tau(SMALLEST_WITH[k]) === k && Array.from({ length: SMALLEST_WITH[k] - 2 }, (_, i) => i + 2).every((m) => tau(m) !== k),
          };
        },
        (r) => {
          const n = r.pick([2, 3, 5, 6, 10, 12, 15]);
          const e = r.int(2, 4);
          const N = n ** e;
          return {
            prompt: `How many divisors does $${n}^{${e}}$ have?`,
            answer: num(tau(N)),
            solution: [`$${n}^{${e}} = ${factorTex(factor(N))}$.`, `$\\tau = ${factor(N).map(([, x]) => `(${x} + 1)`).join('')} = ${tau(N)}$`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'For $n = p_1^{e_1}\\cdots p_k^{e_k}$: the number of divisors $\\tau(n) = \\prod(e_i + 1)$, their sum $\\sigma(n) = \\prod\\frac{p_i^{e_i+1} - 1}{p_i - 1}$, and the Möbius function $\\mu(n) = (-1)^k$ if all $e_i = 1$, else $0$. $n$ is perfect when $\\sigma(n) = 2n$ (6, 28, 496, …); every even perfect number is $2^{p-1}(2^p - 1)$ with $2^p - 1$ prime.',
    resources: [wiki('Arithmetic_function', 'Arithmetic function'), wiki('M%C3%B6bius_function', 'Möbius function'), wiki('Perfect_number', 'Perfect number')],
  },
};

// ---------------------------------------------------------------------------
// Going deeper: check digits and calendars

const checkDigits: Skill = {
  id: 'nt.checks',
  name: 'Check digits and calendars',
  prereqs: ['nt.mod'],
  levels: [
    {
      name: 'ISBN-10',
      generate(r) {
        for (;;) {
          const d = Array.from({ length: 9 }, () => r.int(0, 9));
          const s = d.reduce((a, x, i) => a + (10 - i) * x, 0);
          const c = mod(-s, 11);
          if (c === 10) continue;
          return {
            prompt: `An ISBN-10 has first nine digits ${d.join('')}. The check digit $c$ makes $10d_1 + 9d_2 + \\dots + 2d_9 + c \\equiv 0 \\pmod{11}$. Find $c$.`,
            answer: num(c),
            solution: [`$${d.map((x, i) => `${10 - i}\\cdot ${x}`).join(' + ')} = ${s}$.`, `$${s} \\equiv ${s % 11} \\pmod{11}$, so $c = ${c}$.`],
          };
        }
      },
    },
    {
      name: 'the Luhn algorithm',
      generate(r) {
        const d = Array.from({ length: r.int(6, 10) }, (_, i) => (i === 0 ? r.int(1, 9) : r.int(0, 9)));
        // Double every second digit from the right of the payload (the rightmost payload digit is doubled).
        const proc = [...d].reverse().map((x, i) => (i % 2 === 0 ? (2 * x > 9 ? 2 * x - 9 : 2 * x) : x));
        const s = proc.reduce((a, b) => a + b, 0);
        const c = mod(-s, 10);
        return {
          prompt: `Find the Luhn check digit to append to ${d.join('')} (as used for credit card numbers).`,
          answer: num(c),
          hint: 'From the right, double every second digit starting with the last digit of the number given; subtract 9 from any result above 9; the check digit makes the total a multiple of 10.',
          solution: [`Processed digits (right to left): $${proc.join(', ')}$, sum $${s}$.`, `The check digit brings the total to a multiple of 10: $${c}$.`],
        };
      },
    },
    {
      name: 'calendars',
      generate(r) {
        const y1 = r.int(1990, 2030);
        const y2 = y1 + r.int(1, 12);
        const d1 = new Date(Date.UTC(y1, 0, 1)).getUTCDay();
        const d2 = new Date(Date.UTC(y2, 0, 1)).getUTCDay();
        const toMon = (d: number) => (d + 6) % 7;
        const leap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        const years = Array.from({ length: y2 - y1 }, (_, i) => y1 + i);
        const shift = years.reduce((s, y) => s + (leap(y) ? 2 : 1), 0);
        return {
          prompt: `1 January ${y1} was a ${DAYS[toMon(d1)]}. What day of the week was 1 January ${y2}?`,
          answer: choice(DAYS, toMon(d2)),
          solution: [`A year moves the weekday by $365 \\equiv 1 \\pmod 7$, a leap year by $366 \\equiv 2$. Leap years from ${y1} to ${y2 - 1}: ${years.filter(leap).join(', ') || 'none'}.`, `Shift $${shift} \\equiv ${shift % 7} \\pmod 7$: ${DAYS[toMon(d2)]}.`],
          selfCheck: () => (toMon(d1) + shift) % 7 === toMon(d2),
        };
      },
    },
  ],
  learn: {
    summary:
      'Check digits are chosen so a weighted digit sum is $0$ modulo some $m$; a typo (or swap of neighbours) usually breaks the congruence. ISBN-10 uses weights $10, 9, \\dots, 1$ mod 11 (11 is prime, so every single error and every swap is caught). Luhn doubles every second digit mod 10. Calendars are arithmetic mod 7: a year shifts the weekday by 1, a leap year by 2.',
    resources: [wiki('Check_digit', 'Check digit'), wiki('Luhn_algorithm', 'Luhn algorithm'), wiki('Determination_of_the_day_of_the_week', 'Determination of the day of the week')],
  },
};

// ---------------------------------------------------------------------------

export const numberTheoryChapters: Chapter[] = [
  {
    id: 'nt.ch.div',
    title: 'Divisibility',
    about: 'Primes and factorisation, counting divisors, gcd and lcm with the Euclidean algorithm, divisibility rules, linear Diophantine equations, and number bases.',
    why: 'The Euclidean algorithm is one of the oldest algorithms still in daily use: it is how modular inverses (and so RSA keys) are computed. Bases are how computers store numbers.',
    resources: [levin, wiki('Euclidean_algorithm', 'Euclidean algorithm'), mcs],
    skills: [primesDeep, gcdDeep, rules, diophantine, bases],
    deeper: [arithmetic],
  },
  {
    id: 'nt.ch.mod',
    title: 'Modular arithmetic',
    about: 'Computing with remainders: fast powers, inverses, linear congruences and the Chinese remainder theorem.',
    why: 'Hashing, checksums, random number generators and all of public-key cryptography work modulo something.',
    resources: [wiki('Modular_arithmetic', 'Modular arithmetic'), khanCrypto, mcs],
    skills: [modDeep, inverses, crt],
    deeper: [checkDigits],
  },
  {
    id: 'nt.ch.crypto',
    title: 'Fermat, Euler and RSA',
    about: "Fermat's little theorem, Euler's totient and theorem, Wilson's theorem and primality testing, and the RSA cryptosystem.",
    why: 'RSA secured most of the web for decades, and the same ideas power primality tests and digital signatures.',
    resources: [wiki('RSA_(cryptosystem)', 'RSA (cryptosystem)'), khanCrypto, mcs],
    skills: [fermatDeep, rsa],
    deeper: [orders, diffieHellman],
  },
];
