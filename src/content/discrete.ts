import { coef, poly, st, sum, t } from '../core/fmt';
import type { Problem, Resource, Rng, Skill } from '../core/types';
import { distinct, fact } from './helpers';

export const levin = (page: string, title: string): Resource => ({
  kind: 'book',
  title: `Levin, Discrete Mathematics: An Open Introduction: ${title}`,
  url: `https://discrete.openmathbooks.org/dmoi3/${page}.html`,
});
export const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});
export const mcs: Resource = {
  kind: 'book',
  title: 'MIT 6.042, Mathematics for Computer Science (free PDF)',
  url: 'https://courses.csail.mit.edu/6.042/spring18/mcs.pdf',
};

export const fmtN = (n: number) => n.toLocaleString('en-US').replace(/,/g, '{,}');
export const C = (n: number, k: number): number => (k < 0 || k > n ? 0 : Math.round(fact(n) / (fact(k) * fact(n - k))));
export const P = (n: number, k: number): number => (k > n ? 0 : Math.round(fact(n) / fact(n - k)));
export const num = (v: number | string, display?: string): Problem['answer'] => ({
  kind: 'number',
  expected: `${v}`,
  display: display ?? (typeof v === 'number' ? fmtN(v) : undefined),
});
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;
const setTex = (xs: number[]) => (xs.length ? `\\{${[...xs].sort((a, b) => a - b).join(', ')}\\}` : '\\varnothing');
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

function randSubset(r: Rng, U: number[], lo: number, hi: number) {
  return r.shuffle([...U]).slice(0, r.int(lo, hi)).sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Chapter 1: sets, functions, relations

const U10 = range(1, 10);

export const sets: Skill = {
  id: 'dm.sets',
  name: 'Set operations',
  prereqs: [],
  levels: [
    {
      name: 'one operation',
      generate(r) {
        const A = randSubset(r, U10, 3, 6);
        const B = randSubset(r, U10, 3, 6);
        const ops = [
          { tex: 'A \\cup B', v: U10.filter((x) => A.includes(x) || B.includes(x)), why: 'everything in $A$ or $B$' },
          { tex: 'A \\cap B', v: U10.filter((x) => A.includes(x) && B.includes(x)), why: 'elements in both' },
          { tex: 'A \\setminus B', v: A.filter((x) => !B.includes(x)), why: 'elements of $A$ not in $B$' },
          { tex: 'B \\setminus A', v: B.filter((x) => !A.includes(x)), why: 'elements of $B$ not in $A$' },
          { tex: 'A \\,\\triangle\\, B', v: U10.filter((x) => A.includes(x) !== B.includes(x)), why: 'elements in exactly one of them' },
          { tex: 'A^c', v: U10.filter((x) => !A.includes(x)), why: 'elements of the universe not in $A$' },
        ];
        const op = r.pick(ops);
        return {
          prompt: `Universe $U = \\{1, \\dots, 10\\}$, $A = ${setTex(A)}$, $B = ${setTex(B)}$. Find $${op.tex}$.`,
          answer: { kind: 'set', expected: op.v.map(String) },
          inputHint: 'Like {1, 4, 7}; use {} for the empty set.',
          solution: [`$${op.tex}$ is ${op.why}: $${setTex(op.v)}$.`],
        };
      },
    },
    {
      name: 'combined operations',
      generate(r) {
        const A = randSubset(r, U10, 3, 6);
        const B = randSubset(r, U10, 3, 6);
        const Cs = randSubset(r, U10, 3, 6);
        const has = (S: number[]) => (x: number) => S.includes(x);
        const [a, b, c] = [has(A), has(B), has(Cs)];
        const exprs = [
          { tex: '(A \\cup B) \\cap C', f: (x: number) => (a(x) || b(x)) && c(x) },
          { tex: 'A \\setminus (B \\cup C)', f: (x: number) => a(x) && !b(x) && !c(x) },
          { tex: '(A \\cap B) \\cup C^c', f: (x: number) => (a(x) && b(x)) || !c(x) },
          { tex: '(A \\setminus B) \\cup (C \\setminus A)', f: (x: number) => (a(x) && !b(x)) || (c(x) && !a(x)) },
          { tex: 'A \\cap (B \\,\\triangle\\, C)', f: (x: number) => a(x) && b(x) !== c(x) },
        ];
        const e = r.pick(exprs);
        const v = U10.filter(e.f);
        return {
          prompt: `$U = \\{1, \\dots, 10\\}$, $A = ${setTex(A)}$, $B = ${setTex(B)}$, $C = ${setTex(Cs)}$. Find $${e.tex}$.`,
          answer: { kind: 'set', expected: v.map(String) },
          inputHint: 'Like {1, 4, 7}; use {} for the empty set.',
          solution: ['Work from the innermost brackets out, or test each element of $U$ against the condition.', `$${e.tex} = ${setTex(v)}$`],
        };
      },
    },
    {
      name: 'cardinalities',
      generate(r) {
        const kind = r.int(0, 3);
        if (kind === 0) {
          const n = r.int(2, 8);
          return {
            prompt: `$|A| = ${n}$. How many elements does the power set $\\mathcal{P}(A)$ have?`,
            answer: num(2 ** n),
            solution: [`Each element is either in a subset or not: $2^{${n}} = ${2 ** n}$.`],
          };
        }
        if (kind === 1) {
          const [m, n] = [r.int(2, 6), r.int(2, 6)];
          return {
            prompt: `$|A| = ${m}$, $|B| = ${n}$. Find $|\\mathcal{P}(A \\times B)|$.`,
            answer: num(2 ** (m * n), `2^{${m * n}}`),
            inputHint: 'An expression like 2^10 is fine.',
            solution: [`$|A \\times B| = ${m}\\cdot ${n} = ${m * n}$, so the power set has $2^{${m * n}}$ elements.`],
          };
        }
        if (kind === 2) {
          const i = r.int(1, 8);
          const [a, b] = [i + r.int(1, 12), i + r.int(1, 12)];
          return {
            prompt: `$|A| = ${a}$, $|B| = ${b}$ and $|A \\cap B| = ${i}$. Find $|A \\cup B|$.`,
            answer: num(a + b - i),
            solution: [`Inclusion–exclusion: $|A \\cup B| = |A| + |B| - |A \\cap B| = ${a} + ${b} - ${i} = ${a + b - i}$.`],
          };
        }
        const abc = r.int(1, 4);
        const [ab, ac, bc] = [abc + r.int(0, 4), abc + r.int(0, 4), abc + r.int(0, 4)];
        const [A, B, Cn] = [ab + ac + r.int(1, 8), ab + bc + r.int(1, 8), ac + bc + r.int(1, 8)];
        const ans = A + B + Cn - ab - ac - bc + abc;
        return {
          prompt: `$|A| = ${A}$, $|B| = ${B}$, $|C| = ${Cn}$, $|A \\cap B| = ${ab}$, $|A \\cap C| = ${ac}$, $|B \\cap C| = ${bc}$, $|A \\cap B \\cap C| = ${abc}$. Find $|A \\cup B \\cup C|$.`,
          answer: num(ans),
          solution: [`Inclusion–exclusion: add singles, subtract pairs, add the triple: $${A} + ${B} + ${Cn} - ${ab} - ${ac} - ${bc} + ${abc} = ${ans}$.`],
        };
      },
    },
  ],
  learn: {
    summary:
      '$A \\cup B$: in either. $A \\cap B$: in both. $A \\setminus B$: in $A$ but not $B$. $A^c$: in the universe but not $A$. $A \\triangle B$: in exactly one. $|\\mathcal{P}(A)| = 2^{|A|}$, $|A \\times B| = |A||B|$, and $|A \\cup B| = |A| + |B| - |A \\cap B|$.',
    resources: [levin('sec_intro-sets', 'Sets'), wiki('Inclusion%E2%80%93exclusion_principle', 'Inclusion–exclusion principle'), mcs],
  },
};

const LETTERS = ['a', 'b', 'c', 'd', 'e'];
const FN_CLASSES = ['Injective but not surjective', 'Surjective but not injective', 'Bijective', 'Neither'];

export const functions: Skill = {
  id: 'dm.functions',
  name: 'Functions',
  prereqs: ['dm.sets'],
  levels: [
    {
      name: 'injective, surjective, bijective',
      generate(r) {
        const cls = r.int(0, 3);
        const m = cls === 2 ? r.int(3, 5) : r.int(3, 4);
        const n = cls === 0 ? m + 1 : cls === 1 ? m - 1 : cls === 2 ? m : m;
        const cod = LETTERS.slice(0, n);
        let f: string[];
        for (;;) {
          f = cls === 2 ? r.shuffle([...cod]) : Array.from({ length: m }, () => r.pick(cod));
          const inj = new Set(f).size === m;
          const sur = new Set(f).size === n;
          const got = inj && sur ? 2 : inj ? 0 : sur ? 1 : 3;
          if (got === cls) break;
        }
        const inj = new Set(f).size === m;
        const sur = new Set(f).size === n;
        return {
          prompt: `$f: \\{1, \\dots, ${m}\\} \\to \\{${cod.join(', ')}\\}$ is given by ${f.map((y, i) => `$f(${i + 1}) = ${y}$`).join(', ')}. Which is it?`,
          answer: { kind: 'choice', options: FN_CLASSES, correct: cls },
          solution: [
            inj ? 'No two inputs share an output, so it is injective.' : `Two inputs share the output $${f.find((y, i) => f.indexOf(y) !== i)}$, so it is not injective.`,
            sur ? 'Every element of the codomain is hit, so it is surjective.' : `$${cod.find((y) => !f.includes(y))}$ is never hit, so it is not surjective.`,
          ],
        };
      },
    },
    {
      name: 'counting functions',
      generate(r) {
        const m = r.int(2, 5);
        const n = r.int(m, 7);
        const kind = r.int(0, 3);
        if (kind === 0)
          return {
            prompt: `How many functions are there from a ${m}-element set to a ${n}-element set?`,
            answer: num(n ** m),
            solution: [`Each of the ${m} inputs independently picks one of ${n} outputs: $${n}^{${m}} = ${fmtN(n ** m)}$.`],
          };
        if (kind === 1)
          return {
            prompt: `How many injective functions are there from a ${m}-element set to a ${n}-element set?`,
            answer: num(P(n, m)),
            solution: [`The first input has ${n} choices, the next ${n - 1}, and so on: $${range(n - m + 1, n).reverse().join(' \\cdot ')} = ${fmtN(P(n, m))}$.`],
          };
        if (kind === 2)
          return {
            prompt: `How many bijections are there from a ${n}-element set to itself?`,
            answer: num(fact(n)),
            solution: [`A bijection is a permutation: $${n}! = ${fmtN(fact(n))}$.`],
          };
        return {
          prompt: `How many functions $f$ from $\\{1, \\dots, ${m}\\}$ to $\\{1, \\dots, ${n}\\}$ satisfy $f(1) = 1$?`,
          answer: num(n ** (m - 1)),
          solution: [`$f(1)$ is fixed; the other ${m - 1} inputs are free: $${n}^{${m - 1}} = ${fmtN(n ** (m - 1))}$.`],
        };
      },
    },
    {
      name: 'counting surjections',
      generate(r) {
        const n = r.int(2, 3);
        const m = r.int(n + 1, 5);
        const terms = range(0, n).map((i) => (-1) ** i * C(n, i) * (n - i) ** m);
        const ans = terms.reduce((a, b) => a + b, 0);
        return {
          prompt: `How many surjective functions are there from a ${m}-element set onto a ${n}-element set?`,
          answer: num(ans),
          solution: [
            'Inclusion–exclusion over the outputs that are missed: $\\sum_{i=0}^{n} (-1)^i \\binom{n}{i}(n - i)^m$.',
            `$${range(0, n).map((i) => `${i % 2 ? '-' : i ? '+' : ''} \\binom{${n}}{${i}}${n - i}^{${m}}`).join(' ')} = ${ans}$`,
          ],
          selfCheck: () => {
            let count = 0;
            for (let code = 0; code < n ** m; code++) {
              const seen = new Set<number>();
              let c = code;
              for (let i = 0; i < m; i++, c = Math.floor(c / n)) seen.add(c % n);
              if (seen.size === n) count++;
            }
            return count === ans;
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'Injective: no two inputs share an output. Surjective: every element of the codomain is hit. Bijective: both. From an $m$-set to an $n$-set there are $n^m$ functions, $n(n-1)\\cdots(n-m+1)$ injective ones, and the surjections can be counted by inclusion–exclusion on the missed outputs.',
    resources: [levin('sec_intro-functions', 'Functions'), wiki('Bijection,_injection_and_surjection', 'Bijection, injection and surjection')],
  },
};

type Pair = [number, number];
const pairsTex = (R: Pair[]) => `\\{${R.map(([a, b]) => `(${a},${b})`).join(', ')}\\}`;

const PROPS = {
  reflexive: (S: number[], R: Pair[]) => S.find((a) => !R.some(([x, y]) => x === a && y === a)),
  symmetric: (_: number[], R: Pair[]) => R.find(([a, b]) => !R.some(([x, y]) => x === b && y === a)),
  antisymmetric: (_: number[], R: Pair[]) => R.find(([a, b]) => a !== b && R.some(([x, y]) => x === b && y === a)),
  transitive: (_: number[], R: Pair[]) => {
    for (const [a, b] of R) for (const [c, d] of R) if (b === c && !R.some(([x, y]) => x === a && y === d)) return [a, b, d];
    return undefined;
  },
};
type Prop = keyof typeof PROPS;

function closeUnder(prop: Prop, S: number[], R: Pair[]): Pair[] {
  const has = (a: number, b: number, X: Pair[]) => X.some(([x, y]) => x === a && y === b);
  let X = [...R];
  if (prop === 'reflexive') S.forEach((a) => has(a, a, X) || X.push([a, a]));
  if (prop === 'symmetric') [...X].forEach(([a, b]) => has(b, a, X) || X.push([b, a]));
  if (prop === 'antisymmetric') X = X.filter(([a, b]) => a >= b || !has(b, a, R));
  if (prop === 'transitive') {
    for (let changed = true; changed; ) {
      changed = false;
      for (const [a, b] of [...X]) for (const [c, d] of [...X]) if (b === c && !has(a, d, X)) (X.push([a, d]), (changed = true));
    }
  }
  return X.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

const BELL = [1, 1, 2, 5, 15, 52, 203];

export const relations: Skill = {
  id: 'dm.relations',
  name: 'Relations',
  prereqs: ['dm.sets'],
  levels: [
    {
      name: 'properties',
      generate(r) {
        const S = [1, 2, 3, 4];
        const prop = r.pick(Object.keys(PROPS) as Prop[]);
        let R: Pair[] = [];
        while (R.length < 3) {
          const all: Pair[] = S.flatMap((a) => S.map((b) => [a, b] as Pair));
          R = r.shuffle(all).slice(0, r.int(4, 8));
          if (r.next() < 0.5) R = closeUnder(prop, S, R);
          R = R.filter((p, i) => R.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
          if (R.length > 11) R = [];
        }
        const bad = PROPS[prop](S, R);
        const holds = bad === undefined;
        const why = holds
          ? {
              reflexive: 'Every $(a, a)$ is present.',
              symmetric: 'Every pair appears together with its reverse.',
              antisymmetric: 'No two different elements are related in both directions.',
              transitive: 'Whenever $(a,b)$ and $(b,c)$ are in $R$, so is $(a,c)$.',
            }[prop]
          : {
              reflexive: `$(${bad},${bad}) \\notin R$.`,
              symmetric: `$(${(bad as number[])[0]},${(bad as number[])[1]}) \\in R$ but $(${(bad as number[])[1]},${(bad as number[])[0]}) \\notin R$.`,
              antisymmetric: `Both $(${(bad as number[])[0]},${(bad as number[])[1]})$ and $(${(bad as number[])[1]},${(bad as number[])[0]})$ are in $R$.`,
              transitive: `$(${(bad as number[])[0]},${(bad as number[])[1]})$ and $(${(bad as number[])[1]},${(bad as number[])[2]})$ are in $R$ but $(${(bad as number[])[0]},${(bad as number[])[2]})$ is not.`,
            }[prop];
        return {
          prompt: `On $\\{1, 2, 3, 4\\}$, is $R = ${pairsTex(R)}$ ${prop}?`,
          answer: { kind: 'choice', options: ['Yes', 'No'], correct: holds ? 0 : 1 },
          solution: [why],
        };
      },
    },
    {
      name: 'equivalence relations and orders',
      generate(r) {
        const cls = r.int(0, 2);
        const S = [1, 2, 3, 4];
        let R: Pair[];
        let why: string;
        if (cls === 0) {
          const parts: number[][] = [];
          r.shuffle([...S]).forEach((x) => {
            const i = r.int(0, parts.length);
            (parts[i] ??= []).push(x);
          });
          const blocks = parts.filter(Boolean);
          if (blocks.length === S.length) blocks.splice(0, 2, [...blocks[0], ...blocks[1]]);
          R = blocks.flatMap((b) => b.flatMap((x) => b.map((y) => [x, y] as Pair))).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
          why = `Reflexive, symmetric and transitive: it groups the elements into the classes ${blocks.map((b) => setTex(b)).join(', ')}.`;
        } else if (cls === 1) {
          const base: Pair[] = r.shuffle(S.flatMap((a) => S.filter((b) => b > a).map((b) => [a, b] as Pair))).slice(0, r.int(2, 4));
          R = closeUnder('transitive', S, closeUnder('reflexive', S, base));
          why = 'Reflexive, antisymmetric and transitive, so a partial order. It is not symmetric, so not an equivalence relation.';
        } else {
          for (;;) {
            R = closeUnder('reflexive', S, r.shuffle(S.flatMap((a) => S.map((b) => [a, b] as Pair))).slice(0, r.int(3, 6)));
            const eq = !PROPS.symmetric(S, R) && !PROPS.transitive(S, R);
            const po = !PROPS.antisymmetric(S, R) && !PROPS.transitive(S, R);
            if (!eq && !po) break;
          }
          const sym = PROPS.symmetric(S, R);
          const tr = PROPS.transitive(S, R);
          const anti = PROPS.antisymmetric(S, R);
          why = [
            sym ? `Not symmetric: $(${sym[0]},${sym[1]}) \\in R$ but not its reverse.` : '',
            tr ? `Not transitive: $(${tr[0]},${tr[1]}), (${tr[1]},${tr[2]}) \\in R$ but $(${tr[0]},${tr[2]}) \\notin R$.` : '',
            anti ? `Not antisymmetric: $(${anti[0]},${anti[1]})$ and its reverse are both in $R$.` : '',
          ]
            .filter(Boolean)
            .join(' ');
        }
        return {
          prompt: `On $\\{1, 2, 3, 4\\}$, what is $R = ${pairsTex(R)}$?`,
          answer: { kind: 'choice', options: ['An equivalence relation', 'A partial order', 'Neither'], correct: cls },
          solution: [why],
        };
      },
    },
    {
      name: 'counting relations',
      generate(r) {
        const n = r.int(2, 5);
        const pool = [
          { q: 'relations', v: 2 ** (n * n), why: `A relation is any subset of the $${n * n}$ ordered pairs: $2^{${n * n}}$.`, d: `2^{${n * n}}` },
          { q: 'reflexive relations', v: 2 ** (n * n - n), why: `The ${n} pairs $(a,a)$ are forced; the other $${n * n - n}$ are free: $2^{${n * n - n}}$.`, d: `2^{${n * n - n}}` },
          { q: 'symmetric relations', v: 2 ** ((n * (n + 1)) / 2), why: `Choose freely on the ${n} diagonal pairs and the $\\binom{${n}}{2}$ unordered off-diagonal pairs: $2^{${(n * (n + 1)) / 2}}$.`, d: `2^{${(n * (n + 1)) / 2}}` },
          { q: 'equivalence relations', v: BELL[n], why: `Equivalence relations correspond to partitions; the number of partitions of an ${n}-set is the Bell number $B_{${n}} = ${BELL[n]}$.`, d: undefined },
        ];
        const p = r.pick(pool);
        return {
          prompt: `How many ${p.q} are there on a set with ${n} elements?`,
          answer: num(p.v, p.d),
          inputHint: 'An expression like 2^12 is fine.',
          solution: [p.why],
        };
      },
    },
  ],
  learn: {
    summary:
      'A relation on $S$ is a set of ordered pairs. Reflexive: every $(a,a)$. Symmetric: $(a,b)$ implies $(b,a)$. Antisymmetric: never both $(a,b)$ and $(b,a)$ for $a \\ne b$. Transitive: $(a,b), (b,c)$ imply $(a,c)$. Equivalence relation = reflexive + symmetric + transitive (it partitions $S$ into classes); partial order = reflexive + antisymmetric + transitive.',
    resources: [wiki('Binary_relation', 'Binary relation'), wiki('Equivalence_relation', 'Equivalence relation'), wiki('Partially_ordered_set', 'Partially ordered set'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Chapter 2: counting

export const basicCounting: Skill = {
  id: 'dm.basic',
  name: 'Sum and product rules',
  prereqs: [],
  levels: [
    {
      name: 'product rule',
      generate(r) {
        const k = r.int(3, 6);
        const pool = [
          { q: `How many PINs of ${k} digits are there (leading zeros allowed)?`, v: 10 ** k, why: `$10^{${k}}$` },
          { q: `How many binary strings of length ${k + 4} are there?`, v: 2 ** (k + 4), why: `$2^{${k + 4}}$` },
          { q: `How many ${k}-digit numbers are there (no leading zero)?`, v: 9 * 10 ** (k - 1), why: `$9 \\cdot 10^{${k - 1}}$: the first digit has 9 choices, the rest 10 each` },
          { q: 'How many licence plates have 3 letters (A–Z) followed by 3 digits?', v: 26 ** 3 * 1000, why: '$26^3 \\cdot 10^3$' },
          { q: `A menu has ${k} starters, ${k + 2} mains and 4 desserts. How many three-course meals are there?`, v: k * (k + 2) * 4, why: `$${k} \\cdot ${k + 2} \\cdot 4$` },
        ];
        const p = r.pick(pool);
        return { prompt: p.q, answer: num(p.v), solution: [`Product rule: ${p.why} $= ${fmtN(p.v)}$.`] };
      },
    },
    {
      name: 'restrictions',
      generate(r) {
        const k = r.int(3, 6);
        const pool = [
          { q: `How many ${k}-letter strings (A–Z) have no repeated letter?`, v: P(26, k), why: `$26 \\cdot 25 \\cdots ${27 - k}$` },
          { q: `How many binary strings of length ${k + 4} contain at least one 1?`, v: 2 ** (k + 4) - 1, why: `all strings minus the all-zero one: $2^{${k + 4}} - 1$` },
          { q: `How many ${k}-digit PINs have at least one repeated digit?`, v: 10 ** k - P(10, k), why: `all PINs minus those with distinct digits: $10^{${k}} - 10 \\cdot 9 \\cdots ${11 - k}$` },
          { q: `How many ${k}-character passwords from lowercase letters and digits contain at least one digit?`, v: 36 ** k - 26 ** k, why: `all minus letter-only: $36^{${k}} - 26^{${k}}$` },
          { q: `How many ${k + 2}-bit strings start with 1 or end with 00?`, v: 2 ** (k + 1) + 2 ** k - 2 ** (k - 1), why: `$2^{${k + 1}} + 2^{${k}} - 2^{${k - 1}}$ (inclusion–exclusion on the overlap)` },
        ];
        const p = r.pick(pool);
        return { prompt: p.q, answer: num(p.v), solution: [`${p.why[0].toUpperCase()}${p.why.slice(1)}, which is $${fmtN(p.v)}$.`] };
      },
    },
    {
      name: 'cases and complements',
      generate(r) {
        const lo = r.int(4, 6);
        const hi = lo + r.int(1, 2);
        const v = range(lo, hi).reduce((s, k) => s + 36 ** k - 26 ** k, 0);
        return {
          prompt: `Passwords have length ${lo} to ${hi}, use lowercase letters and digits, and must contain at least one digit. How many are there?`,
          answer: num(v),
          inputHint: 'An expression like 36^6 - 26^6 + ... is fine.',
          solution: [
            'Sum rule over the lengths, and for each length count all strings minus those with no digit:',
            `$${range(lo, hi).map((k) => `(36^{${k}} - 26^{${k}})`).join(' + ')} = ${fmtN(v)}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Product rule: a sequence of independent choices with $n_1, n_2, \\dots$ options gives $n_1 n_2 \\cdots$ outcomes. Sum rule: disjoint cases add up. For "at least one", count the complement ("none") and subtract from the total.',
    resources: [levin('sec_counting-addmult', 'Additive and Multiplicative Principles'), mcs],
  },
};

const WORDS = ['BANANA', 'LETTER', 'BALLOON', 'COFFEE', 'STATISTICS', 'MISSISSIPPI', 'PEPPER', 'ASSESS', 'COMMITTEE', 'REFERRED'];

export const permComb: Skill = {
  id: 'dm.perm',
  name: 'Permutations and combinations',
  prereqs: ['dm.basic'],
  levels: [
    {
      name: 'choose or arrange?',
      generate(r) {
        const n = r.int(6, 12);
        const k = r.int(2, 4);
        const pool = [
          { q: `In how many ways can a committee of ${k} be chosen from ${n} people?`, v: C(n, k), why: `Order does not matter: $\\binom{${n}}{${k}}$` },
          { q: `In how many ways can a president, a secretary and a treasurer be chosen from ${n} people?`, v: P(n, 3), why: `Order matters (roles differ): $${n} \\cdot ${n - 1} \\cdot ${n - 2}$` },
          { q: `In how many ways can ${k + 3} different books be arranged on a shelf?`, v: fact(k + 3), why: `$${k + 3}!$` },
          { q: `In how many ways can ${k} different prizes be given to ${n} people, at most one prize each?`, v: P(n, k), why: `$${n}!/${n - k}!$` },
          { q: `How many ${k}-element subsets does a ${n}-element set have?`, v: C(n, k), why: `$\\binom{${n}}{${k}}$` },
        ];
        const p = r.pick(pool);
        return { prompt: p.q, answer: num(p.v), solution: [`${p.why} $= ${fmtN(p.v)}$.`] };
      },
    },
    {
      name: 'repeated letters',
      generate(r) {
        const w = r.pick(WORDS);
        const counts = [...new Set(w)].map((ch) => [ch, [...w].filter((c) => c === ch).length] as const);
        const v = fact(w.length) / counts.reduce((a, [, c]) => a * fact(c), 1);
        const reps = counts.filter(([, c]) => c > 1);
        return {
          prompt: `How many distinct arrangements of the letters of ${w} are there?`,
          answer: num(v),
          solution: [
            `${w.length} letters, with ${reps.map(([ch, c]) => `${ch} ×${c}`).join(', ')}.`,
            `Divide out the rearrangements of identical letters: $\\frac{${w.length}!}{${reps.map(([, c]) => `${c}!`).join('\\,')}} = ${fmtN(v)}$.`,
          ],
        };
      },
    },
    {
      name: 'committees with conditions',
      generate(r) {
        const m = r.int(4, 8);
        const w = r.int(3, 7);
        const k = r.int(3, 5);
        const n = m + w;
        const kind = r.int(0, 3);
        if (kind === 0)
          return {
            prompt: `A committee of ${k} is chosen from ${m} men and ${w} women. How many committees include at least one woman?`,
            answer: num(C(n, k) - C(m, k)),
            solution: [`All committees minus the all-men ones: $\\binom{${n}}{${k}} - \\binom{${m}}{${k}} = ${C(n, k)} - ${C(m, k)} = ${C(n, k) - C(m, k)}$.`],
          };
        if (kind === 1) {
          const j = r.int(1, Math.min(w, k - 1));
          return {
            prompt: `A committee of ${k} is chosen from ${m} men and ${w} women. How many have exactly ${j} women?`,
            answer: num(C(w, j) * C(m, k - j)),
            solution: [`Choose the women and the men separately: $\\binom{${w}}{${j}}\\binom{${m}}{${k - j}} = ${C(w, j)} \\cdot ${C(m, k - j)} = ${C(w, j) * C(m, k - j)}$.`],
          };
        }
        if (kind === 2)
          return {
            prompt: `From ${n} people, a committee of ${k} is chosen. Alex and Sam refuse to serve together. How many committees are possible?`,
            answer: num(C(n, k) - C(n - 2, k - 2)),
            solution: [`All committees minus those with both: $\\binom{${n}}{${k}} - \\binom{${n - 2}}{${k - 2}} = ${C(n, k) - C(n - 2, k - 2)}$.`],
          };
        const p = r.int(5, 8);
        return {
          prompt: `In how many ways can ${p} people stand in a line if two particular people must stand next to each other?`,
          answer: num(2 * fact(p - 1)),
          solution: [`Glue the pair into one block: $${p - 1}!$ arrangements of the blocks, times $2$ orders inside the pair: $2 \\cdot ${p - 1}! = ${fmtN(2 * fact(p - 1))}$.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Arrangements where order matters: $P(n,k) = \\frac{n!}{(n-k)!}$. Selections where it doesn\'t: $\\binom{n}{k} = \\frac{n!}{k!(n-k)!}$. Repeated letters: divide by the factorial of each repeat count. For conditions, count directly by cases or subtract the bad configurations from all of them.',
    resources: [levin('sec_counting-combperm', 'Combinations and Permutations'), wiki('Combination', 'Combination'), mcs],
  },
};

export const binomial: Skill = {
  id: 'dm.binom',
  name: 'Binomial theorem',
  prereqs: ['dm.perm'],
  levels: [
    {
      name: '(x + a)ⁿ',
      generate(r) {
        const n = r.int(4, 9);
        const a = r.nz(-3, 3);
        const k = r.int(1, n - 1);
        const v = C(n, k) * a ** (n - k);
        return {
          prompt: `Find the coefficient of $x^{${k}}$ in $(x ${st(a, '')})^{${n}}$.`,
          answer: num(v),
          solution: [`The term is $\\binom{${n}}{${k}}x^{${k}}(${a})^{${n - k}}$, so the coefficient is $${C(n, k)} \\cdot ${a < 0 ? `(${a})` : a}^{${n - k}} = ${v}$.`],
        };
      },
    },
    {
      name: '(ax + b)ⁿ',
      generate(r) {
        const n = r.int(3, 7);
        const a = r.nz(-3, 3);
        const b = r.nz(-3, 3);
        const k = r.int(1, n - 1);
        const v = C(n, k) * a ** k * b ** (n - k);
        return {
          prompt: `Find the coefficient of $x^{${k}}$ in $(${coef(a)}x ${st(b, '')})^{${n}}$.`,
          answer: num(v),
          solution: [`The term is $\\binom{${n}}{${k}}(${coef(a) || '1'}x)^{${k}}(${b})^{${n - k}}$: coefficient $${C(n, k)} \\cdot (${a})^{${k}} \\cdot (${b})^{${n - k}} = ${fmtN(v)}$.`],
        };
      },
    },
    {
      name: 'x and 1/x',
      generate(r) {
        const n = r.int(4, 9);
        const c = r.nz(-3, 3);
        const k = r.int(0, n);
        const j = 2 * k - n; // x^k (c/x)^(n-k)
        const v = C(n, k) * c ** (n - k);
        return {
          prompt: `Find the coefficient of $x^{${j}}$ in $\\left(x ${c < 0 ? '-' : '+'} \\frac{${Math.abs(c)}}{x}\\right)^{${n}}$.`,
          answer: num(v),
          solution: [
            `A general term is $\\binom{${n}}{k}x^k\\left(\\frac{${c}}{x}\\right)^{${n}-k} = \\binom{${n}}{k}(${c})^{${n}-k}x^{2k-${n}}$.`,
            `$2k - ${n} = ${j}$ gives $k = ${k}$: coefficient $\\binom{${n}}{${k}}(${c})^{${n - k}} = ${v}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      '$(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^k b^{n-k}$. To find one coefficient, write the general term, collect the power of $x$ it contributes, and solve for the $k$ that gives the power you want. Watch the signs: negative $b$ gives alternating terms.',
    resources: [levin('sec_counting-binom', 'Binomial Coefficients'), wiki('Binomial_theorem', 'Binomial theorem')],
  },
};

export const incExc: Skill = {
  id: 'dm.ie',
  name: 'Inclusion–exclusion and pigeonhole',
  prereqs: ['dm.basic'],
  levels: [
    {
      name: 'two conditions',
      generate(r) {
        const [a, b] = distinct(r, 2, 2, 9);
        const N = r.int(50, 300);
        const L = lcm(a, b);
        const v = Math.floor(N / a) + Math.floor(N / b) - Math.floor(N / L);
        return {
          prompt: `How many integers from 1 to ${N} are divisible by ${a} or ${b}?`,
          answer: num(v),
          solution: [`$\\lfloor ${N}/${a} \\rfloor + \\lfloor ${N}/${b} \\rfloor - \\lfloor ${N}/${L} \\rfloor = ${Math.floor(N / a)} + ${Math.floor(N / b)} - ${Math.floor(N / L)} = ${v}$ (the last term removes numbers divisible by both, i.e. by $\\operatorname{lcm} = ${L}$).`],
        };
      },
    },
    {
      name: 'three conditions',
      generate(r) {
        const [a, b, c] = distinct(r, 3, 2, 7);
        const N = r.int(100, 500);
        const f = (d: number) => Math.floor(N / d);
        const v = f(a) + f(b) + f(c) - f(lcm(a, b)) - f(lcm(a, c)) - f(lcm(b, c)) + f(lcm(lcm(a, b), c));
        const not = r.next() < 0.5;
        return {
          prompt: `How many integers from 1 to ${N} are ${not ? 'divisible by none of' : 'divisible by at least one of'} ${a}, ${b}, ${c}?`,
          answer: num(not ? N - v : v),
          solution: [
            `Divisible by at least one: $${f(a)} + ${f(b)} + ${f(c)} - ${f(lcm(a, b))} - ${f(lcm(a, c))} - ${f(lcm(b, c))} + ${f(lcm(lcm(a, b), c))} = ${v}$, using lcms for the overlaps.`,
            not ? `So $${N} - ${v} = ${N - v}$ are divisible by none.` : '',
          ].filter(Boolean),
        };
      },
    },
    {
      name: 'pigeonhole',
      generate(r) {
        const k = r.int(2, 6);
        const c = r.int(3, 6);
        const n = r.int(4, 12);
        const pool = [
          { q: `A drawer has socks in ${c} colours. How many socks must you take (without looking) to be sure of ${k} of the same colour?`, v: c * (k - 1) + 1, why: `With $${c}\\cdot${k - 1} = ${c * (k - 1)}$ socks you could still have only ${k - 1} of each colour; one more forces ${k}.` },
          { q: `How many cards must you draw from a standard 52-card deck to be sure of ${k} cards of the same suit?`, v: 4 * (k - 1) + 1, why: `$4 \\cdot ${k - 1}$ cards could be ${k - 1} per suit; one more forces ${k} in some suit.` },
          { q: `What is the smallest number of integers you must choose from $\\{1, 2, \\dots, ${2 * n}\\}$ to be sure two of them add up to ${2 * n + 1}?`, v: n + 1, why: `Pair them up as $\\{1, ${2 * n}\\}, \\{2, ${2 * n - 1}\\}, \\dots$: ${n} pairs. Choosing ${n + 1} numbers forces two from the same pair.` },
        ];
        const p = r.pick(pool);
        return { prompt: p.q, answer: num(p.v), solution: [p.why] };
      },
    },
  ],
  learn: {
    summary:
      'Inclusion–exclusion: $|A \\cup B \\cup C| = \\sum|A| - \\sum|A \\cap B| + |A \\cap B \\cap C|$. Numbers divisible by both $a$ and $b$ are those divisible by $\\operatorname{lcm}(a,b)$. Pigeonhole: putting more than $k \\cdot n$ objects into $n$ boxes forces some box to hold more than $k$.',
    resources: [wiki('Inclusion%E2%80%93exclusion_principle', 'Inclusion–exclusion principle'), wiki('Pigeonhole_principle', 'Pigeonhole principle'), mcs],
  },
};

export const starsBars: Skill = {
  id: 'dm.stars',
  name: 'Stars and bars',
  prereqs: ['dm.perm'],
  levels: [
    {
      name: 'non-negative solutions',
      generate(r) {
        const k = r.int(3, 5);
        const n = r.int(5, 15);
        const v = C(n + k - 1, k - 1);
        return {
          prompt: `How many solutions in non-negative integers does $${range(1, k).map((i) => `x_${i}`).join(' + ')} = ${n}$ have?`,
          answer: num(v),
          solution: [`${n} stars and ${k - 1} bars: $\\binom{${n + k - 1}}{${k - 1}} = ${fmtN(v)}$.`],
        };
      },
    },
    {
      name: 'lower bounds',
      generate(r) {
        const k = r.int(3, 5);
        const m = r.int(1, 3);
        const n = k * m + r.int(2, 10);
        const v = C(n - k * m + k - 1, k - 1);
        return {
          prompt: `In how many ways can ${n} identical sweets be shared among ${k} children so that each child gets at least ${m}?`,
          answer: num(v),
          solution: [
            `Give each child ${m} first; ${n - k * m} sweets remain to share freely.`,
            `$\\binom{${n - k * m} + ${k - 1}}{${k - 1}} = \\binom{${n - k * m + k - 1}}{${k - 1}} = ${fmtN(v)}$`,
          ],
        };
      },
    },
    {
      name: 'an upper bound',
      generate(r) {
        const k = r.int(3, 4);
        const n = r.int(8, 15);
        const u = r.int(2, n - 3);
        const all = C(n + k - 1, k - 1);
        const bad = C(n - u - 1 + k - 1, k - 1);
        return {
          prompt: `How many solutions in non-negative integers does $${range(1, k).map((i) => `x_${i}`).join(' + ')} = ${n}$ have with $x_1 \\le ${u}$?`,
          answer: num(all - bad),
          solution: [
            `All solutions: $\\binom{${n + k - 1}}{${k - 1}} = ${all}$.`,
            `Bad ones have $x_1 \\ge ${u + 1}$: substitute $x_1 = y + ${u + 1}$, leaving total $${n - u - 1}$: $\\binom{${n - u - 1 + k - 1}}{${k - 1}} = ${bad}$.`,
            `Answer: $${all} - ${bad} = ${all - bad}$.`,
          ],
          selfCheck: () => {
            let count = 0;
            const rec = (i: number, left: number): void => {
              if (i === k - 1) {
                count++;
                return;
              }
              for (let x = 0; x <= left; x++) if (i !== 0 || x <= u) rec(i + 1, left - x);
            };
            rec(0, n);
            return count === all - bad;
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'The number of ways to write $n$ as an ordered sum of $k$ non-negative integers (or share $n$ identical items among $k$ people) is $\\binom{n + k - 1}{k - 1}$: arrange $n$ stars and $k - 1$ bars. Lower bounds: hand out the minimum first. Upper bounds: subtract the solutions that break the bound (inclusion–exclusion).',
    resources: [levin('sec_stars-and-bars', 'Stars and Bars'), wiki('Stars_and_bars_(combinatorics)', 'Stars and bars (combinatorics)')],
  },
};

// ---------------------------------------------------------------------------
// Chapter 3: recurrences

export const sequences: Skill = {
  id: 'dm.seq',
  name: 'Sequences and recursive definitions',
  prereqs: [],
  levels: [
    {
      name: 'first-order recurrences',
      generate(r) {
        const c = r.int(2, 3);
        const d = r.nz(-3, 4);
        const a0 = r.int(-2, 4);
        const N = r.int(4, 6);
        const seq = [a0];
        for (let i = 1; i <= N; i++) seq.push(c * seq[i - 1] + d);
        return {
          prompt: `$a_0 = ${a0}$ and $a_n = ${c}a_{n-1} ${st(d, '')}$ for $n \\ge 1$. Find $a_{${N}}$.`,
          answer: num(seq[N]),
          solution: [`Compute term by term: ${seq.map((v, i) => `$a_{${i}} = ${v}$`).join(', ')}.`],
        };
      },
    },
    {
      name: 'second-order recurrences',
      generate(r) {
        const p = r.int(1, 3);
        const q = r.nz(-2, 3);
        const a0 = r.int(0, 3);
        const a1 = r.int(1, 4);
        const N = r.int(5, 7);
        const seq = [a0, a1];
        for (let i = 2; i <= N; i++) seq.push(p * seq[i - 1] + q * seq[i - 2]);
        return {
          prompt: `$a_0 = ${a0}$, $a_1 = ${a1}$ and $a_n = ${coef(p)}a_{n-1} ${st(q, 'a_{n-2}')}$ for $n \\ge 2$. Find $a_{${N}}$.`,
          answer: num(seq[N]),
          solution: [`Compute term by term: ${seq.map((v, i) => `$a_{${i}} = ${v}$`).join(', ')}.`],
        };
      },
    },
    {
      name: 'closed forms of simple sequences',
      generate(r) {
        if (r.next() < 0.5) {
          const a = r.int(-5, 9);
          const d = r.nz(-4, 6);
          const terms = range(0, 4).map((i) => a + d * i);
          const f = poly([d, a], 'n');
          return {
            prompt: `Find a closed formula for $a_n$ (starting at $a_0$): $${terms.join(', ')}, \\dots$`,
            answer: { kind: 'expr', expected: f.expr, vars: ['n'], display: f.tex },
            solution: [`Arithmetic: the difference is constant, $d = ${d}$. So $a_n = a_0 + dn = ${f.tex}$.`],
          };
        }
        const a = r.nz(-4, 5);
        const q = r.int(2, 4);
        const terms = range(0, 4).map((i) => a * q ** i);
        return {
          prompt: `Find a closed formula for $a_n$ (starting at $a_0$): $${terms.join(', ')}, \\dots$`,
          answer: { kind: 'expr', expected: `${a}*${q}^n`, vars: ['n'], display: `${coef(a)}\\cdot ${q}^n` },
          solution: [`Geometric: each term is ${q} times the previous one. So $a_n = a_0 \\cdot r^n = ${a === 1 ? '' : a === -1 ? '-' : `${a}\\cdot `}${q}^n$.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'A recursive definition gives the first term(s) and a rule for the next term from earlier ones; compute it by stepping forward. Arithmetic sequences add a constant $d$ each step ($a_n = a_0 + dn$); geometric ones multiply by $r$ ($a_n = a_0 r^n$).',
    resources: [levin('sec_seq-arithgeom', 'Arithmetic and Geometric Sequences'), levin('sec_seq_intro', 'Describing Sequences')],
  },
};

export const recurrences: Skill = {
  id: 'dm.rec',
  name: 'Solving linear recurrences',
  prereqs: ['dm.seq'],
  levels: [
    {
      name: 'first order',
      generate(r) {
        const q = r.int(2, 4);
        const c = r.nz(-3, 3); // fixed point: a_n = (a0 + c) q^n - c
        const d = c * (q - 1);
        const a0 = r.int(-3, 5);
        const A = a0 + c;
        const display = sum([t(A, `${q}^n`, `${q}^n`), t(-c)]).tex;
        return {
          prompt: `Solve $a_n = ${q}a_{n-1} ${st(d, '')}$ with $a_0 = ${a0}$: give a closed formula for $a_n$.`,
          answer: { kind: 'expr', expected: `${A}*${q}^n - (${c})`, vars: ['n'], display },
          solution: [
            `Look for a constant solution $a_n = L$: $L = ${q}L ${st(d, '')}$ gives $L = ${-c}$.`,
            `Then $b_n = a_n - (${-c})$ satisfies $b_n = ${q}b_{n-1}$, so $b_n = b_0 \\cdot ${q}^n$ with $b_0 = ${a0} - (${-c}) = ${A}$.`,
            `$a_n = ${display}$`,
          ],
          selfCheck: () => {
            let a = a0;
            for (let n = 1; n <= 8; n++) {
              a = q * a + d;
              if (a !== A * q ** n - c) return false;
            }
            return true;
          },
        };
      },
    },
    {
      name: 'distinct roots',
      generate(r) {
        const [r1, r2] = distinct(r, 2, 1, 5).sort((x, y) => y - x);
        const A = r.nz(-3, 3);
        const B = r.nz(-3, 3);
        const p = r1 + r2;
        const q = -r1 * r2;
        const a0 = A + B;
        const a1 = A * r1 + B * r2;
        const display = sum([t(A, r1 === 1 ? '' : `${r1}^n`, `${r1}^n`), t(B, r2 === 1 ? '' : `${r2}^n`, `${r2}^n`)]).tex;
        return {
          prompt: `Solve $a_n = ${p}a_{n-1} ${st(q, 'a_{n-2}')}$ with $a_0 = ${a0}$, $a_1 = ${a1}$.`,
          answer: { kind: 'expr', expected: `${A}*${r1}^n + (${B})*${r2}^n`, vars: ['n'], display },
          solution: [
            `Characteristic equation: $x^2 - ${p}x ${st(-q, '')} = 0$, i.e. $(x - ${r1})(x - ${r2}) = 0$.`,
            `So $a_n = \\alpha\\, ${r1}^n + \\beta\\, ${r2}^n$. From $a_0$: $\\alpha + \\beta = ${a0}$; from $a_1$: $${r1}\\alpha + ${r2}\\beta = ${a1}$.`,
            `$\\alpha = ${A}$, $\\beta = ${B}$: $a_n = ${display}$`,
          ],
          selfCheck: () => {
            const s = [a0, a1];
            for (let n = 2; n <= 10; n++) s.push(p * s[n - 1] + q * s[n - 2]);
            return s.every((v, n) => v === A * r1 ** n + B * r2 ** n);
          },
        };
      },
    },
    {
      name: 'repeated root',
      generate(r) {
        const rt = r.int(2, 3);
        const A = r.nz(-3, 3);
        const B = r.nz(-3, 3);
        const a0 = A;
        const a1 = (A + B) * rt;
        return {
          prompt: `Solve $a_n = ${2 * rt}a_{n-1} - ${rt * rt}a_{n-2}$ with $a_0 = ${a0}$, $a_1 = ${a1}$.`,
          answer: { kind: 'expr', expected: `(${A} + (${B})*n)*${rt}^n`, vars: ['n'], display: `(${poly([B, A], 'n').tex})\\,${rt}^n` },
          solution: [
            `Characteristic equation: $x^2 - ${2 * rt}x + ${rt * rt} = (x - ${rt})^2 = 0$, a repeated root.`,
            `So $a_n = (\\alpha + \\beta n)${rt}^n$. $a_0 = \\alpha = ${A}$; $a_1 = (\\alpha + \\beta)${rt} = ${a1}$ gives $\\beta = ${B}$.`,
            `$a_n = (${poly([B, A], 'n').tex})\\,${rt}^n$`,
          ],
          selfCheck: () => {
            const s = [a0, a1];
            for (let n = 2; n <= 10; n++) s.push(2 * rt * s[n - 1] - rt * rt * s[n - 2]);
            return s.every((v, n) => v === (A + B * n) * rt ** n);
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'For $a_n = c_1 a_{n-1} + c_2 a_{n-2}$, solve the characteristic equation $x^2 = c_1 x + c_2$. Distinct roots $r_1, r_2$: $a_n = \\alpha r_1^n + \\beta r_2^n$. Repeated root $r$: $a_n = (\\alpha + \\beta n) r^n$. Fit $\\alpha, \\beta$ to the initial terms. First-order $a_n = q a_{n-1} + d$: shift by the constant solution to make it geometric.',
    resources: [levin('sec_recurrence', 'Solving Recurrence Relations'), wiki('Linear_recurrence_with_constant_coefficients', 'Linear recurrence with constant coefficients'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Chapter 4: asymptotics

const GROWTH = [
  { tex: '\\log n', rank: 1 },
  { tex: '\\sqrt{n}', rank: 2 },
  { tex: 'n', rank: 3 },
  { tex: 'n \\log n', rank: 4 },
  { tex: 'n^2', rank: 5 },
  { tex: 'n^3', rank: 6 },
  { tex: '2^n', rank: 7 },
  { tex: 'n!', rank: 8 },
];

export const bigO: Skill = {
  id: 'dm.bigo',
  name: 'Big-O and growth rates',
  prereqs: [],
  levels: [
    {
      name: 'dominant term',
      generate(r) {
        const terms = r.shuffle(GROWTH.slice(0, 7)).slice(0, 3);
        const coefs = terms.map(() => r.int(1, 50));
        const top = terms.reduce((a, b) => (b.rank > a.rank ? b : a));
        const options = r.shuffle([top, ...r.shuffle(GROWTH.filter((g) => g !== top)).slice(0, 3)]);
        const f = terms.map((g, i) => `${coefs[i]}${g.tex}`).join(' + ');
        return {
          prompt: `$f(n) = ${f}$. Which is the tightest bound: $f(n) = \\Theta(\\,?\\,)$`,
          answer: { kind: 'choice', options: options.map((g) => `$\\Theta(${g.tex})$`), correct: options.indexOf(top) },
          solution: [`Constant factors don't matter and the fastest-growing term dominates: $${top.tex}$.`, `Growth order: $${GROWTH.map((g) => g.tex).join(' \\ll ')}$.`],
        };
      },
    },
    {
      name: 'compare growth',
      generate(r) {
        const pick = r.shuffle([...GROWTH]).slice(0, 4);
        const fastest = r.next() < 0.5;
        const ans = pick.reduce((a, b) => (fastest ? (b.rank > a.rank ? b : a) : b.rank < a.rank ? b : a));
        return {
          prompt: `Which function grows ${fastest ? 'fastest' : 'slowest'} as $n \\to \\infty$?`,
          answer: { kind: 'choice', options: pick.map((g) => `$${g.tex}$`), correct: pick.indexOf(ans) },
          solution: [`Growth order: $${GROWTH.map((g) => g.tex).join(' \\ll ')}$. So $${ans.tex}$.`],
        };
      },
    },
    {
      name: 'master theorem',
      generate(r) {
        const [a, b, d] = r.pick([
          [1, 2, 0],
          [2, 2, 1],
          [4, 2, 2],
          [8, 2, 3],
          [3, 3, 1],
          [9, 3, 2],
          [2, 2, 0],
          [4, 2, 1],
          [8, 2, 2],
          [3, 2, 1],
          [7, 2, 2],
          [1, 2, 1],
          [2, 2, 2],
          [2, 4, 1],
          [16, 4, 2],
          [5, 4, 1],
        ]);
        const crit = Math.log(a) / Math.log(b);
        const close = Math.abs(crit - d) < 1e-9;
        const critTex = Number.isInteger(Math.round(crit * 1e9) / 1e9) ? `${Math.round(crit)}` : `\\log_{${b}} ${a}`;
        const nd = d === 0 ? '1' : d === 1 ? 'n' : `n^{${d}}`;
        const cases = {
          leaves: `\\Theta(n^{${critTex}})`.replace('n^{1}', 'n').replace('n^{0}', '1'),
          balanced: `\\Theta(${d === 0 ? '' : nd + ' '}\\log n)`,
          root: `\\Theta(${nd})`,
        };
        const correct = close ? cases.balanced : crit > d ? cases.leaves : cases.root;
        const others = [...new Set([cases.leaves, cases.balanced, cases.root, `\\Theta(n^{${d + 1}})`, '\\Theta(2^n)'])].filter((o) => o !== correct);
        const opts = r.shuffle([correct, ...r.shuffle(others).slice(0, 3)]);
        return {
          prompt: `Solve $T(n) = ${a === 1 ? '' : a}T(n/${b}) + \\Theta(${nd})$.`,
          answer: { kind: 'choice', options: opts.map((o) => `$${o}$`), correct: opts.indexOf(correct) },
          solution: [
            `Compare $\\log_{${b}} ${a} = ${critTex}$ with the exponent $d = ${d}$ of the extra work.`,
            close
              ? 'Equal: every level of the recursion does the same work, so multiply by the $\\log n$ levels.'
              : crit > d
                ? 'The recursion (leaves) dominates.'
                : 'The work at the top dominates.',
            `$T(n) = ${correct}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      '$f = O(g)$ means $f$ grows at most as fast as $g$ up to a constant factor; $\\Theta$ means exactly as fast. Drop constants and lower-order terms: $\\log n \\ll \\sqrt n \\ll n \\ll n\\log n \\ll n^2 \\ll 2^n \\ll n!$. Master theorem for $T(n) = aT(n/b) + \\Theta(n^d)$: compare $\\log_b a$ with $d$; bigger $\\log_b a$ gives $\\Theta(n^{\\log_b a})$, equal gives $\\Theta(n^d \\log n)$, smaller gives $\\Theta(n^d)$.',
    resources: [wiki('Big_O_notation', 'Big O notation'), wiki('Master_theorem_(analysis_of_algorithms)', 'Master theorem (analysis of algorithms)'), mcs],
  },
};
