import type { Chapter, Problem, Resource, Rng, Skill } from '../core/types';
import { distinct } from './helpers';

const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});
const levin: Resource = {
  kind: 'book',
  title: 'Levin, Discrete Mathematics: An Open Introduction: Number Theory',
  url: 'https://discrete.openmathbooks.org/dmoi3/sec_addtops-numbth.html',
};
const mcs: Resource = {
  kind: 'book',
  title: 'MIT 6.042, Mathematics for Computer Science (free PDF), ch. 9: Number Theory',
  url: 'https://courses.csail.mit.edu/6.042/spring18/mcs.pdf',
};
const khanCrypto: Resource = {
  kind: 'video',
  title: 'Khan Academy: Journey into cryptography',
  url: 'https://www.khanacademy.org/computing/computer-science/cryptography',
};

const num = (v: number): Problem['answer'] => ({ kind: 'number', expected: `${v}` });
const yesNo = (yes: boolean): Problem['answer'] => ({ kind: 'choice', options: ['Yes', 'No'], correct: yes ? 0 : 1 });

const mod = (a: number, m: number) => ((a % m) + m) % m;
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const PRIMES = Array.from({ length: 200 }, (_, i) => i).filter(isPrime);

function factor(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 2; p * p <= n; p++) {
    let e = 0;
    while (n % p === 0) ((n /= p), e++);
    if (e) out.push([p, e]);
  }
  if (n > 1) out.push([n, 1]);
  return out;
}
const factorTex = (f: [number, number][]) => f.map(([p, e]) => (e > 1 ? `${p}^{${e}}` : `${p}`)).join(' \\cdot ');

function powmod(a: number, k: number, m: number) {
  let r = 1 % m;
  let b = mod(a, m);
  for (let e = k; e > 0; e = Math.floor(e / 2)) {
    if (e % 2) r = (r * b) % m;
    b = (b * b) % m;
  }
  return r;
}

/** Extended Euclid: [g, x, y] with ax + by = g. */
function egcd(a: number, b: number): [number, number, number] {
  if (b === 0) return [a, 1, 0];
  const [g, x, y] = egcd(b, a % b);
  return [g, y, x - Math.floor(a / b) * y];
}

const inverse = (a: number, m: number) => mod(egcd(mod(a, m), m)[1], m);

/** The division steps of the Euclidean algorithm, for worked solutions. */
function euclidSteps(a: number, b: number): string[] {
  const steps: string[] = [];
  while (b) {
    steps.push(`$${a} = ${Math.floor(a / b)} \\cdot ${b} + ${a % b}$`);
    [a, b] = [b, a % b];
  }
  return steps;
}

const phi = (n: number) => factor(n).reduce((acc, [p, e]) => acc * (p - 1) * p ** (e - 1), 1);

/** Repeated squaring, shown as the table of a^(2^i) mod m used. */
function squaringSteps(a: number, k: number, m: number): string {
  const bits = k.toString(2).length;
  const sq: string[] = [];
  let b = mod(a, m);
  for (let i = 0; i < bits; i++) {
    sq.push(`${a}^{${2 ** i}} \\equiv ${b}`);
    b = (b * b) % m;
  }
  const used = [...k.toString(2)].reverse().map((c, i) => (c === '1' ? 2 ** i : 0)).filter(Boolean);
  return `Repeated squaring mod ${m}: $${sq.join(',\\ ')}$. Since $${k} = ${used.join(' + ')}$, multiply those powers together.`;
}

// ---------------------------------------------------------------------------
// Chapter 1: divisibility

const primes: Skill = {
  id: 'nt.div',
  name: 'Primes and divisors',
  prereqs: [],
  levels: [
    {
      name: 'prime or not?',
      generate(r) {
        const want = r.next() < 0.5;
        let n: number;
        do n = r.int(51, 400);
        while (isPrime(n) !== want || (!want && (n % 2 === 0 || n % 5 === 0 || n % 3 === 0) && r.next() < 0.8));
        const f = factor(n);
        return {
          prompt: `Is ${n} prime?`,
          answer: yesNo(want),
          solution: want
            ? [`Check divisibility by every prime up to $\\sqrt{${n}} \\approx ${Math.sqrt(n).toFixed(1)}$: ${PRIMES.filter((p) => p * p <= n).join(', ')}. None divides it, so it is prime.`]
            : [`$${n} = ${factorTex(f)}$, so it is not prime. (It is enough to try primes up to $\\sqrt{${n}}$.)`],
        };
      },
    },
    {
      name: 'counting divisors',
      generate(r) {
        const ps = distinct(r, r.int(2, 3), 0, 5).map((i) => [2, 3, 5, 7, 11, 13][i]).sort((a, b) => a - b);
        const f: [number, number][] = ps.map((p) => [p, r.int(1, p < 5 ? 4 : 2)]);
        const n = f.reduce((acc, [p, e]) => acc * p ** e, 1);
        const tau = f.reduce((acc, [, e]) => acc * (e + 1), 1);
        return {
          prompt: `How many positive divisors does ${n} have?`,
          answer: num(tau),
          solution: [`$${n} = ${factorTex(f)}$. A divisor picks each exponent independently from $0$ up to its maximum: $${f.map(([, e]) => `(${e} + 1)`).join('')} = ${tau}$.`],
        };
      },
    },
    {
      name: 'factorials and divisor sums',
      generate(r) {
        if (r.next() < 0.5) {
          const n = r.int(20, 150);
          let z = 0;
          const terms: string[] = [];
          for (let p = 5; p <= n; p *= 5) {
            z += Math.floor(n / p);
            terms.push(`\\lfloor ${n}/${p} \\rfloor`);
          }
          return {
            prompt: `How many zeros does $${n}!$ end with?`,
            answer: num(z),
            solution: ['Each trailing zero is a factor $10 = 2 \\cdot 5$, and factors of 2 are plentiful, so count the factors of 5.', `$${terms.join(' + ')} = ${z}$`],
          };
        }
        const ps = distinct(r, 2, 0, 4).map((i) => [2, 3, 5, 7, 11][i]).sort((a, b) => a - b);
        const f: [number, number][] = ps.map((p) => [p, r.int(1, 3)]);
        const n = f.reduce((acc, [p, e]) => acc * p ** e, 1);
        const sigma = f.reduce((acc, [p, e]) => acc * ((p ** (e + 1) - 1) / (p - 1)), 1);
        return {
          prompt: `What is the sum of all positive divisors of ${n}?`,
          answer: num(sigma),
          solution: [
            `$${n} = ${factorTex(f)}$. The divisor sum is multiplicative: $\\sigma(n) = ${f.map(([p, e]) => `(${Array.from({ length: e + 1 }, (_, i) => (i === 0 ? '1' : i === 1 ? `${p}` : `${p}^{${i}}`)).join(' + ')})`).join('')}$.`,
            `$= ${f.map(([p, e]) => (p ** (e + 1) - 1) / (p - 1)).join(' \\cdot ')} = ${sigma}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Every integer $n > 1$ factors uniquely into primes. To test primality, try primes up to $\\sqrt n$. If $n = p_1^{e_1}\\cdots p_k^{e_k}$, it has $(e_1 + 1)\\cdots(e_k + 1)$ divisors. The number of trailing zeros of $n!$ is the number of factors of 5: $\\lfloor n/5 \\rfloor + \\lfloor n/25 \\rfloor + \\dots$',
    resources: [levin, wiki('Divisor_function', 'Divisor function'), mcs],
  },
};

const gcdSkill: Skill = {
  id: 'nt.gcd',
  name: 'GCD and the Euclidean algorithm',
  prereqs: ['nt.div'],
  levels: [
    {
      name: 'gcd',
      generate(r) {
        const g = r.int(2, 30);
        let a: number, b: number;
        do [a, b] = [g * r.int(3, 40), g * r.int(3, 40)].sort((x, y) => y - x);
        while (a === b || gcd(a, b) !== g);
        return {
          prompt: `Find $\\gcd(${a}, ${b})$.`,
          answer: num(g),
          solution: ['Euclidean algorithm: replace the larger number by its remainder mod the smaller.', euclidSteps(a, b).join(', '), `The last non-zero remainder is ${g}.`],
        };
      },
    },
    {
      name: 'lcm',
      generate(r) {
        const [a, b] = distinct(r, 2, 6, 90);
        const g = gcd(a, b);
        return {
          prompt: `Find $\\operatorname{lcm}(${a}, ${b})$.`,
          answer: num((a * b) / g),
          solution: [`$\\gcd(${a}, ${b}) = ${g}$, and $\\operatorname{lcm}(a, b) = \\frac{ab}{\\gcd(a,b)} = \\frac{${a}\\cdot${b}}{${g}} = ${(a * b) / g}$.`],
        };
      },
    },
    {
      name: "Bézout's identity",
      generate(r) {
        let a: number, b: number, g: number;
        do {
          [a, b] = distinct(r, 2, 10, 120).sort((x, y) => y - x);
          g = gcd(a, b);
        } while (b / g < 3);
        const x = mod(egcd(a, b)[1], b / g);
        const y = (g - a * x) / b;
        return {
          prompt: `$\\gcd(${a}, ${b}) = ${g}$. Find the integer $x$ with $0 \\le x < ${b / g}$ such that $${a}x + ${b}y = ${g}$ for some integer $y$.`,
          answer: num(x),
          solution: [
            'Run the Euclidean algorithm, then substitute the remainders back (extended Euclid):',
            euclidSteps(a, b).join(', '),
            `This gives $${a}\\cdot ${x} + ${b}\\cdot(${y}) = ${g}$. Solutions for $x$ repeat every $${b / g}$, so $x = ${x}$.`,
          ],
          selfCheck: () => a * x + b * y === g && x >= 0 && x < b / g,
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\gcd(a, b) = \\gcd(b, a \\bmod b)$, which gives the Euclidean algorithm: keep taking remainders until you reach 0; the last non-zero remainder is the gcd. Running it backwards (extended Euclid) writes the gcd as $ax + by$ (Bézout). $\\operatorname{lcm}(a,b) = ab/\\gcd(a,b)$.',
    resources: [wiki('Euclidean_algorithm', 'Euclidean algorithm'), wiki('B%C3%A9zout%27s_identity', "Bézout's identity"), mcs],
  },
};

// ---------------------------------------------------------------------------
// Chapter 2: modular arithmetic

const modArith: Skill = {
  id: 'nt.mod',
  name: 'Modular arithmetic',
  prereqs: ['nt.div'],
  levels: [
    {
      name: 'reduce as you go',
      generate(r) {
        const m = r.int(5, 23);
        const [a, b, c] = [r.int(20, 999), r.int(20, 999), r.int(-50, 99)];
        const v = mod(a * b + c, m);
        return {
          prompt: `Compute $(${a} \\cdot ${b} ${c < 0 ? '-' : '+'} ${Math.abs(c)}) \\bmod ${m}$.`,
          answer: num(v),
          solution: [
            `Reduce each number first: $${a} \\equiv ${a % m}$, $${b} \\equiv ${b % m}$, $${c} \\equiv ${mod(c, m)} \\pmod{${m}}$.`,
            `$${a % m}\\cdot ${b % m} + ${mod(c, m)} = ${(a % m) * (b % m) + mod(c, m)} \\equiv ${v} \\pmod{${m}}$`,
          ],
        };
      },
    },
    {
      name: 'powers',
      generate(r) {
        const m = r.int(7, 41);
        const a = r.int(2, 30);
        const k = r.int(20, 200);
        const v = powmod(a, k, m);
        return {
          prompt: `Compute $${a}^{${k}} \\bmod ${m}$.`,
          answer: num(v),
          solution: [squaringSteps(a, k, m), `Result: $${v}$.`],
        };
      },
    },
    {
      name: 'last digits',
      generate(r) {
        const two = r.next() < 0.5;
        const m = two ? 100 : 10;
        const a = r.int(2, 99);
        const k = r.int(50, 2000);
        const v = powmod(a, k, m);
        return {
          prompt: `What are the last ${two ? 'two digits' : 'digit'} of $${a}^{${k}}$? ${two ? '(Give a number from 0 to 99.)' : ''}`,
          answer: num(v),
          solution: [
            `This is $${a}^{${k}} \\bmod ${m}$.`,
            gcd(a, m) === 1
              ? `Since $\\gcd(${a}, ${m}) = 1$, powers repeat with period dividing $\\varphi(${m}) = ${phi(m)}$: reduce $${k} \\bmod ${phi(m)} = ${k % phi(m)}$, then compute $${a}^{${k % phi(m)}} \\bmod ${m}$.`
              : 'Compute successive powers mod ' + m + ' until they start repeating, then use the cycle.',
            `Result: $${v}$${two ? ` (i.e. …${String(v).padStart(2, '0')})` : ''}.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      '$a \\equiv b \\pmod m$ means $m \\mid a - b$. Congruences can be added and multiplied, so reduce numbers early to keep them small. For big powers use repeated squaring: compute $a^1, a^2, a^4, a^8, \\dots \\pmod m$ and multiply the ones matching the binary digits of the exponent.',
    resources: [wiki('Modular_arithmetic', 'Modular arithmetic'), wiki('Modular_exponentiation', 'Modular exponentiation'), khanCrypto],
  },
};

const inverses: Skill = {
  id: 'nt.inverse',
  name: 'Inverses and linear congruences',
  prereqs: ['nt.mod', 'nt.gcd'],
  levels: [
    {
      name: 'modular inverse',
      generate(r) {
        const m = r.pick([7, 11, 13, 17, 19, 23, 26, 29, 31, 35, 40]);
        let a: number;
        do a = r.int(2, m - 1);
        while (gcd(a, m) !== 1);
        const inv = inverse(a, m);
        return {
          prompt: `Find the inverse of ${a} modulo ${m} (a number from 0 to ${m - 1}).`,
          answer: num(inv),
          solution: [`Extended Euclid on ${m} and ${a} gives $${a}\\cdot ${inv} = ${a * inv} = ${Math.floor((a * inv) / m)}\\cdot ${m} + 1$.`, `So $${a}^{-1} \\equiv ${inv} \\pmod{${m}}$.`],
          selfCheck: () => (a * inv) % m === 1,
        };
      },
    },
    {
      name: 'solve ax ≡ b',
      generate(r) {
        const m = r.pick([7, 11, 13, 17, 19, 23, 25, 27, 31]);
        let a: number;
        do a = r.int(2, m - 1);
        while (gcd(a, m) !== 1);
        const b = r.int(1, m - 1);
        const x = (inverse(a, m) * b) % m;
        return {
          prompt: `Solve $${a}x \\equiv ${b} \\pmod{${m}}$ (give $x$ from 0 to ${m - 1}).`,
          answer: num(x),
          solution: [`$${a}^{-1} \\equiv ${inverse(a, m)} \\pmod{${m}}$. Multiply both sides by it: $x \\equiv ${inverse(a, m)}\\cdot ${b} \\equiv ${x}$.`],
          selfCheck: () => (a * x) % m === b,
        };
      },
    },
    {
      name: 'when the gcd is not 1',
      generate(r) {
        const d = r.int(2, 4);
        const m = d * r.int(3, 7);
        let a: number;
        do a = d * r.int(1, m / d - 1);
        while (gcd(a, m) !== d);
        const solvable = r.next() < 0.6;
        let b: number;
        do b = r.int(1, m - 1);
        while ((b % d === 0) !== solvable);
        const sols = Array.from({ length: m }, (_, x) => x).filter((x) => (a * x) % m === b);
        return {
          prompt: `Find all solutions of $${a}x \\equiv ${b} \\pmod{${m}}$ with $0 \\le x < ${m}$.`,
          answer: { kind: 'set', expected: sols.map(String) },
          inputHint: 'Like {2, 9}; use {} if there are none.',
          solution: solvable
            ? [
                `$\\gcd(${a}, ${m}) = ${d}$ divides ${b}, so there are exactly ${d} solutions.`,
                `Divide through by ${d}: $${a / d}x \\equiv ${b / d} \\pmod{${m / d}}$ gives $x \\equiv ${sols[0]} \\pmod{${m / d}}$.`,
                `Solutions: $\\{${sols.join(', ')}\\}$`,
              ]
            : [`$\\gcd(${a}, ${m}) = ${d}$ does not divide ${b}, so there are no solutions: the left side is always a multiple of ${d} mod ${m}.`],
          selfCheck: () => sols.length === (solvable ? d : 0),
        };
      },
    },
  ],
  learn: {
    summary:
      '$a$ has an inverse mod $m$ iff $\\gcd(a, m) = 1$; extended Euclid finds it. Then $ax \\equiv b$ has the unique solution $x \\equiv a^{-1}b$. If $d = \\gcd(a, m) > 1$: there are no solutions unless $d \\mid b$, and then exactly $d$ solutions mod $m$, found by dividing everything by $d$.',
    resources: [wiki('Modular_multiplicative_inverse', 'Modular multiplicative inverse'), levin, mcs],
  },
};

const crt: Skill = {
  id: 'nt.crt',
  name: 'Chinese remainder theorem',
  prereqs: ['nt.inverse'],
  levels: [
    { name: 'two congruences', generate: (r) => crtProblem(r, 2) },
    { name: 'three congruences', generate: (r) => crtProblem(r, 3) },
    {
      name: 'word problems',
      generate(r) {
        const [m1, m2, m3] = r.pick([
          [3, 4, 5],
          [3, 5, 7],
          [4, 5, 7],
          [2, 5, 9],
        ]);
        const x = r.int(10, m1 * m2 * m3 - 1);
        const [a1, a2, a3] = [x % m1, x % m2, x % m3];
        return {
          prompt: `A box holds fewer than ${m1 * m2 * m3} sweets. Sharing them equally among ${m1} children leaves ${a1} over, among ${m2} children leaves ${a2} over, and among ${m3} children leaves ${a3} over. How many sweets are there?`,
          answer: num(x),
          solution: [
            `This is $x \\equiv ${a1} \\pmod{${m1}}$, $x \\equiv ${a2} \\pmod{${m2}}$, $x \\equiv ${a3} \\pmod{${m3}}$ with coprime moduli, so there is exactly one solution below $${m1 * m2 * m3}$.`,
            `Sieve: list numbers $\\equiv ${a3} \\pmod{${m3}}$ and check the other two conditions. $x = ${x}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'If the moduli are pairwise coprime, a system $x \\equiv a_i \\pmod{m_i}$ has exactly one solution mod $M = m_1 \\cdots m_k$. Construct it as $x = \\sum a_i M_i y_i$ with $M_i = M/m_i$ and $y_i = M_i^{-1} \\bmod m_i$, or by sieving: step through numbers that satisfy the largest modulus and check the others.',
    resources: [wiki('Chinese_remainder_theorem', 'Chinese remainder theorem'), mcs],
  },
};

function crtProblem(r: Rng, k: number): Problem {
  const pool = k === 2 ? [3, 4, 5, 7, 8, 9, 11, 13] : [3, 4, 5, 7, 11];
  let ms: number[];
  do ms = r.shuffle([...pool]).slice(0, k).sort((a, b) => a - b);
  while (ms.some((a, i) => ms.some((b, j) => i < j && gcd(a, b) !== 1)));
  const M = ms.reduce((a, b) => a * b, 1);
  const x = r.int(1, M - 1);
  const as = ms.map((m) => x % m);
  const terms = ms.map((m, i) => {
    const Mi = M / m;
    return { m, a: as[i], Mi, y: inverse(Mi, m) };
  });
  return {
    prompt: `Find the smallest positive $x$ with ${ms.map((m, i) => `$x \\equiv ${as[i]} \\pmod{${m}}$`).join(', ')}.`,
    answer: num(x || M),
    solution: [
      `The moduli are pairwise coprime, so there is a unique solution mod $${M}$.`,
      `With $M_i = ${M}/m_i$ and $y_i = M_i^{-1} \\bmod m_i$: ${terms.map((t) => `$M = ${t.Mi}, y = ${t.y}$`).join('; ')}.`,
      `$x \\equiv ${terms.map((t) => `${t.a}\\cdot ${t.Mi}\\cdot ${t.y}`).join(' + ')} \\equiv ${x} \\pmod{${M}}$`,
    ],
    selfCheck: () => terms.reduce((s, t) => s + t.a * t.Mi * t.y, 0) % M === x,
  };
}

// ---------------------------------------------------------------------------
// Chapter 3: Fermat, Euler, RSA

const fermat: Skill = {
  id: 'nt.fermat',
  name: "Fermat's and Euler's theorems",
  prereqs: ['nt.mod'],
  levels: [
    {
      name: "Euler's φ",
      generate(r) {
        const n = r.int(12, 300);
        const f = factor(n);
        const v = phi(n);
        return {
          prompt: `Compute $\\varphi(${n})$, the number of integers in $1, \\dots, ${n}$ coprime to ${n}.`,
          answer: num(v),
          solution: [`$${n} = ${factorTex(f)}$, and $\\varphi(n) = n\\prod_{p \\mid n}\\left(1 - \\frac1p\\right)$.`, `$\\varphi(${n}) = ${f.map(([p, e]) => `${p}^{${e - 1}}(${p} - 1)`).join(' \\cdot ')} = ${v}$`],
        };
      },
    },
    {
      name: 'Fermat: prime modulus',
      generate(r) {
        const p = r.pick(PRIMES.filter((q) => q > 5 && q < 60));
        let a: number;
        do a = r.int(2, 99);
        while (a % p === 0);
        const k = r.int(1000, 99999);
        const v = powmod(a, k, p);
        return {
          prompt: `Compute $${a}^{${k}} \\bmod ${p}$.`,
          answer: num(v),
          solution: [
            `${p} is prime and does not divide ${a}, so Fermat gives $${a}^{${p - 1}} \\equiv 1 \\pmod{${p}}$.`,
            `$${k} = ${Math.floor(k / (p - 1))}\\cdot ${p - 1} + ${k % (p - 1)}$, so $${a}^{${k}} \\equiv ${a}^{${k % (p - 1)}} \\equiv ${v} \\pmod{${p}}$.`,
          ],
        };
      },
    },
    {
      name: 'Euler: composite modulus',
      generate(r) {
        const n = r.pick([10, 12, 14, 15, 20, 21, 24, 26, 33, 35, 36, 40, 45]);
        let a: number;
        do a = r.int(2, 99);
        while (gcd(a, n) !== 1);
        const k = r.int(1000, 99999);
        const ph = phi(n);
        const v = powmod(a, k, n);
        return {
          prompt: `Compute $${a}^{${k}} \\bmod ${n}$.`,
          answer: num(v),
          solution: [
            `$\\gcd(${a}, ${n}) = 1$ and $\\varphi(${n}) = ${ph}$, so Euler gives $${a}^{${ph}} \\equiv 1 \\pmod{${n}}$.`,
            `$${k} \\bmod ${ph} = ${k % ph}$, so $${a}^{${k}} \\equiv ${a % n}^{${k % ph}} \\equiv ${v} \\pmod{${n}}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      "Fermat's little theorem: if $p$ is prime and $p \\nmid a$, then $a^{p-1} \\equiv 1 \\pmod p$. Euler's generalisation: if $\\gcd(a, n) = 1$, then $a^{\\varphi(n)} \\equiv 1 \\pmod n$. So exponents can be reduced mod $p - 1$ (or mod $\\varphi(n)$). $\\varphi$ is computed from the prime factorisation.",
    resources: [wiki('Fermat%27s_little_theorem', "Fermat's little theorem"), wiki('Euler%27s_totient_function', "Euler's totient function"), mcs],
  },
};

const rsa: Skill = {
  id: 'nt.rsa',
  name: 'RSA',
  prereqs: ['nt.fermat', 'nt.inverse'],
  levels: [
    {
      name: 'the private key',
      generate(r) {
        const { p, q, e, ph } = rsaKey(r);
        const d = inverse(e, ph);
        return {
          prompt: `RSA with $p = ${p}$, $q = ${q}$ and public exponent $e = ${e}$. Find the private exponent $d$ (with $0 < d < \\varphi(n)$).`,
          answer: num(d),
          solution: [`$n = ${p * q}$, $\\varphi(n) = (${p} - 1)(${q} - 1) = ${ph}$.`, `$d = e^{-1} \\bmod \\varphi(n)$: extended Euclid gives $d = ${d}$ (check: $${e}\\cdot ${d} = ${e * d} \\equiv 1 \\pmod{${ph}}$).`],
          selfCheck: () => (e * d) % ph === 1,
        };
      },
    },
    {
      name: 'encrypt',
      generate(r) {
        const { p, q, e } = rsaKey(r);
        const n = p * q;
        const m = r.int(2, n - 1);
        const c = powmod(m, e, n);
        return {
          prompt: `Public key $(n, e) = (${n}, ${e})$. Encrypt the message $m = ${m}$.`,
          answer: num(c),
          solution: [`$c = m^e \\bmod n = ${m}^{${e}} \\bmod ${n}$.`, squaringSteps(m, e, n), `$c = ${c}$`],
        };
      },
    },
    {
      name: 'decrypt',
      generate(r) {
        const { p, q, e, ph } = rsaKey(r);
        const n = p * q;
        const d = inverse(e, ph);
        const m = r.int(2, n - 1);
        const c = powmod(m, e, n);
        return {
          prompt: `RSA with $p = ${p}$, $q = ${q}$, $e = ${e}$. Decrypt the ciphertext $c = ${c}$.`,
          answer: num(m),
          solution: [`$\\varphi(n) = ${ph}$, $d = e^{-1} \\bmod ${ph} = ${d}$.`, `$m = c^d \\bmod n = ${c}^{${d}} \\bmod ${n} = ${m}$.`],
          selfCheck: () => powmod(c, d, n) === m,
        };
      },
    },
  ],
  learn: {
    summary:
      'RSA: pick primes $p, q$, let $n = pq$ and $\\varphi(n) = (p-1)(q-1)$. Choose $e$ coprime to $\\varphi(n)$ and compute $d = e^{-1} \\bmod \\varphi(n)$. Encrypt $c = m^e \\bmod n$, decrypt $m = c^d \\bmod n$; it works because $m^{ed} \\equiv m$ by Euler\'s theorem. Security rests on factoring $n$ being hard.',
    resources: [wiki('RSA_(cryptosystem)', 'RSA (cryptosystem)'), khanCrypto, mcs],
  },
};

function rsaKey(r: Rng) {
  const small = PRIMES.filter((x) => x >= 5 && x <= 23);
  let p: number, q: number, e: number, ph: number;
  do {
    [p, q] = distinct(r, 2, 0, small.length - 1).map((i) => small[i]);
    ph = (p - 1) * (q - 1);
    e = r.pick([3, 5, 7, 11, 13, 17]);
  } while (gcd(e, ph) !== 1 || e >= ph);
  return { p, q, e, ph };
}

// ---------------------------------------------------------------------------

export const numberTheoryChapters: Chapter[] = [
  {
    id: 'nt.ch.div',
    title: 'Divisibility',
    about: 'Primes and factorisation, counting divisors, the gcd and lcm, and the Euclidean algorithm with Bézout’s identity.',
    why: 'The Euclidean algorithm is one of the oldest algorithms still in daily use: it is how modular inverses (and so RSA keys) are computed.',
    resources: [levin, wiki('Euclidean_algorithm', 'Euclidean algorithm'), mcs],
    skills: [primes, gcdSkill],
    deeper: [],
  },
  {
    id: 'nt.ch.mod',
    title: 'Modular arithmetic',
    about: 'Computing with remainders: fast powers, inverses, linear congruences and the Chinese remainder theorem.',
    why: 'Hashing, checksums, random number generators and all of public-key cryptography work modulo something.',
    resources: [wiki('Modular_arithmetic', 'Modular arithmetic'), khanCrypto, mcs],
    skills: [modArith, inverses, crt],
    deeper: [],
  },
  {
    id: 'nt.ch.crypto',
    title: 'Fermat, Euler and RSA',
    about: "Fermat's little theorem, Euler's totient and theorem, and the RSA cryptosystem built on them.",
    why: 'RSA secured most of the web for decades, and the same ideas power primality tests and digital signatures.',
    resources: [wiki('RSA_(cryptosystem)', 'RSA (cryptosystem)'), khanCrypto, mcs],
    skills: [fermat, rsa],
    deeper: [],
  },
];
