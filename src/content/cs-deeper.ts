// Optional "going deeper" sections for Discrete Math, Graph Theory and Number Theory.
import { circleFigure, L, randomConnected, type Edge, type Graph } from '../core/graph';
import type { Problem, Resource, Rng, Skill } from '../core/types';
import { fact } from './helpers';

const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});
const levin = (page: string, title: string): Resource => ({
  kind: 'book',
  title: `Levin, Discrete Mathematics: An Open Introduction: ${title}`,
  url: `https://discrete.openmathbooks.org/dmoi3/${page}.html`,
});
const mcs: Resource = {
  kind: 'book',
  title: 'MIT 6.042, Mathematics for Computer Science (free PDF)',
  url: 'https://courses.csail.mit.edu/6.042/spring18/mcs.pdf',
};

const num = (v: number): Problem['answer'] => ({ kind: 'number', expected: `${v}` });
const yesNo = (yes: boolean): Problem['answer'] => ({ kind: 'choice', options: ['Yes', 'No'], correct: yes ? 0 : 1 });
const C = (n: number, k: number) => (k < 0 || k > n ? 0 : Math.round(fact(n) / (fact(k) * fact(n - k))));
const fmtN = (n: number) => n.toLocaleString('en-US').replace(/,/g, '{,}');
const listL = (vs: number[]) => vs.map(L).join(', ');

// ---------------------------------------------------------------------------
// Discrete: countability

const COUNTABLE = ['Countable (finite or countably infinite)', 'Uncountable'];

const COUNT_EASY: [string, boolean, string][] = [
  ['$\\mathbb{Z}$', true, 'List it as $0, 1, -1, 2, -2, \\dots$'],
  ['the even natural numbers', true, '$n \\mapsto 2n$ is a bijection with $\\mathbb{N}$.'],
  ['$\\mathbb{Q}$', true, 'List fractions $p/q$ by increasing $|p| + q$ (skipping repeats).'],
  ['$\\mathbb{R}$', false, "Cantor's diagonal argument: any list of reals misses one."],
  ['the interval $(0, 1)$', false, 'It has the same size as $\\mathbb{R}$ (e.g. via $\\tan$), and diagonalisation applies directly to decimal expansions.'],
  ['$\\mathbb{N} \\times \\mathbb{N}$', true, 'List pairs by increasing $a + b$ (the diagonal enumeration).'],
  ['$\\mathcal{P}(\\{1, \\dots, 10\\})$', true, 'It is finite: $2^{10}$ elements.'],
  ['the set of primes', true, 'It is an infinite subset of $\\mathbb{N}$.'],
];
const COUNT_HARD: [string, boolean, string][] = [
  ['the set of all finite strings over the alphabet $\\{a, b\\}$', true, 'List them by length, then alphabetically: finitely many of each length.'],
  ['the set of all infinite binary sequences', false, 'Diagonalise: flip the $n$-th bit of the $n$-th sequence to get one not on the list.'],
  ['$\\mathcal{P}(\\mathbb{N})$', false, "Cantor's theorem: no set is in bijection with its power set; also it matches infinite binary sequences."],
  ['the set of polynomials with integer coefficients', true, 'Finitely many polynomials have degree + sum of $|$coefficients$|$ equal to $k$; list them by $k$.'],
  ['the algebraic numbers (roots of integer polynomials)', true, 'Countably many polynomials, each with finitely many roots.'],
  ['the irrational numbers', false, 'If they were countable, $\\mathbb{R} = \\mathbb{Q} \\cup$ irrationals would be countable.'],
  ['the set of all functions $\\mathbb{N} \\to \\{0, 1\\}$', false, 'These are exactly the infinite binary sequences.'],
  ['the set of finite subsets of $\\mathbb{N}$', true, 'Each finite subset is a finite binary string (or list by largest element).'],
  ['the set of all computer programs (finite source files)', true, 'They are finite strings over a finite alphabet.'],
];
const SAME_SIZE: [string, string, boolean, string][] = [
  ['$\\mathbb{N}$', '$\\mathbb{Q}$', true, 'Both are countably infinite.'],
  ['$\\mathbb{R}$', '$(0, 1)$', true, '$x \\mapsto \\tan(\\pi(x - \\tfrac12))$ is a bijection $(0,1) \\to \\mathbb{R}$.'],
  ['$\\mathbb{N}$', '$\\mathbb{R}$', false, '$\\mathbb{R}$ is uncountable.'],
  ['$\\mathcal{P}(\\mathbb{N})$', '$\\mathbb{R}$', true, 'Both have the cardinality of the continuum (binary expansions).'],
  ['$\\mathbb{R}$', '$\\mathbb{R}^2$', true, 'Interleave decimal digits (with care over trailing 9s), or use Schröder–Bernstein.'],
  ['$\\mathbb{Z}$', '$\\mathbb{N} \\times \\mathbb{N}$', true, 'Both are countably infinite.'],
  ['$\\mathbb{N}$', '$\\mathcal{P}(\\mathbb{N})$', false, "Cantor's theorem: a set is always strictly smaller than its power set."],
  ['$[0, 1]$', '$(0, 1)$', true, 'Schröder–Bernstein: each injects into the other.'],
];

export const countability: Skill = {
  id: 'dm.countable',
  name: 'Countable and uncountable sets',
  prereqs: ['dm.functions'],
  levels: [
    {
      name: 'classic sets',
      generate(r) {
        const [s, c, why] = r.pick(COUNT_EASY);
        return { prompt: `Is ${s} countable or uncountable?`, answer: { kind: 'choice', options: COUNTABLE, correct: c ? 0 : 1 }, solution: [why] };
      },
    },
    {
      name: 'strings, sequences and subsets',
      generate(r) {
        const [s, c, why] = r.pick(COUNT_HARD);
        return { prompt: `Is ${s} countable or uncountable?`, answer: { kind: 'choice', options: COUNTABLE, correct: c ? 0 : 1 }, solution: [why] };
      },
    },
    {
      name: 'same size?',
      generate(r) {
        const [a, b, same, why] = r.pick(SAME_SIZE);
        return { prompt: `Do ${a} and ${b} have the same cardinality?`, answer: yesNo(same), solution: [why] };
      },
    },
  ],
  learn: {
    summary:
      'A set is countable if it is finite or can be listed as $a_1, a_2, a_3, \\dots$ (a bijection with $\\mathbb{N}$). Countable unions of countable sets are countable, so $\\mathbb{Z}$, $\\mathbb{Q}$, $\\mathbb{N}^2$ and all finite strings are. Cantor\'s diagonal argument shows $\\mathbb{R}$, infinite binary sequences and $\\mathcal{P}(\\mathbb{N})$ are not.',
    resources: [wiki('Countable_set', 'Countable set'), wiki('Cantor%27s_diagonal_argument', "Cantor's diagonal argument"), mcs],
  },
};

// ---------------------------------------------------------------------------
// Discrete: special counting numbers

const derange = (n: number): number => (n === 0 ? 1 : n === 1 ? 0 : (n - 1) * (derange(n - 1) + derange(n - 2)));
const catalan = (n: number) => C(2 * n, n) / (n + 1);
function stirling2(n: number, k: number): number {
  if (n === k) return 1;
  if (k === 0 || k > n) return 0;
  return k * stirling2(n - 1, k) + stirling2(n - 1, k - 1);
}

export const specialNumbers: Skill = {
  id: 'dm.special',
  name: 'Derangements, Catalan and Stirling numbers',
  prereqs: ['dm.perm', 'dm.ie'],
  levels: [
    {
      name: 'derangements',
      generate(r) {
        const n = r.int(3, 8);
        const ctx = r.pick([
          `${n} people check their hats and get them back at random. In how many ways can nobody get their own hat?`,
          `${n} letters are put into ${n} addressed envelopes. In how many ways can every letter go into a wrong envelope?`,
          `${n} friends draw names for Secret Santa. In how many ways can nobody draw their own name?`,
        ]);
        const v = derange(n);
        return {
          prompt: ctx,
          answer: num(v),
          solution: [
            'These are derangements: permutations with no fixed point. By inclusion–exclusion $D_n = n!\\sum_{k=0}^{n} \\frac{(-1)^k}{k!}$, or $D_n = (n-1)(D_{n-1} + D_{n-2})$ with $D_1 = 0$, $D_2 = 1$.',
            `$D_{${n}} = ${fmtN(v)}$`,
          ],
          selfCheck: () => {
            let s = 0;
            for (let k = 0; k <= n; k++) s += ((-1) ** k * fact(n)) / fact(k);
            return Math.round(s) === v;
          },
        };
      },
    },
    {
      name: 'Catalan numbers',
      generate(r) {
        const n = r.int(3, 8);
        const ctx = r.pick([
          `How many strings of ${n} pairs of balanced parentheses are there?`,
          `In how many ways can a convex polygon with ${n + 2} sides be cut into triangles by non-crossing diagonals?`,
          `How many binary trees (each node has a left and/or right child, or none) have exactly ${n} nodes?`,
          `How many lattice paths go from $(0,0)$ to $(${n},${n})$ using unit steps right and up, never going above the diagonal $y = x$?`,
        ]);
        const v = catalan(n);
        return {
          prompt: ctx,
          answer: num(v),
          solution: [`All of these are counted by the Catalan number $C_n = \\frac{1}{n+1}\\binom{2n}{n}$ with $n = ${n}$.`, `$C_{${n}} = \\frac{1}{${n + 1}}\\binom{${2 * n}}{${n}} = ${fmtN(v)}$`],
        };
      },
    },
    {
      name: 'Stirling numbers of the second kind',
      generate(r) {
        const n = r.int(4, 7);
        const k = r.int(2, Math.min(4, n - 1));
        const s = stirling2(n, k);
        if (r.next() < 0.5)
          return {
            prompt: `In how many ways can ${n} different people be split into ${k} non-empty groups (the groups are not labelled)?`,
            answer: num(s),
            solution: [
              `This is the Stirling number $S(${n}, ${k})$, with $S(n, k) = kS(n-1, k) + S(n-1, k-1)$: the last person either joins one of $k$ existing groups or starts a new one.`,
              `$S(${n}, ${k}) = ${fmtN(s)}$`,
            ],
          };
        return {
          prompt: `In how many ways can ${n} different jobs be assigned to ${k} named workers so that every worker gets at least one job?`,
          answer: num(fact(k) * s),
          solution: [`Split the jobs into ${k} non-empty groups ($S(${n}, ${k}) = ${s}$ ways), then hand the groups to the workers ($${k}!$ ways).`, `$${k}!\\cdot ${s} = ${fmtN(fact(k) * s)}$`],
          selfCheck: () => {
            let sum = 0;
            for (let i = 0; i <= k; i++) sum += (-1) ** i * C(k, i) * (k - i) ** n;
            return sum === fact(k) * s;
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'Derangements $D_n$ count permutations with no fixed points ($D_n \\approx n!/e$). Catalan numbers $C_n = \\frac{1}{n+1}\\binom{2n}{n}$ count balanced parentheses, binary trees, triangulations and non-crossing paths. Stirling numbers $S(n, k)$ count ways to split $n$ labelled items into $k$ unlabelled non-empty blocks; multiplying by $k!$ counts surjections.',
    resources: [wiki('Derangement', 'Derangement'), wiki('Catalan_number', 'Catalan number'), wiki('Stirling_numbers_of_the_second_kind', 'Stirling numbers of the second kind')],
  },
};

// ---------------------------------------------------------------------------
// Discrete: divide-and-conquer recurrences

export const divideConquer: Skill = {
  id: 'dm.divconq',
  name: 'Divide-and-conquer recurrences',
  prereqs: ['dm.rec', 'dm.bigo'],
  levels: [
    {
      name: 'halving with constant work',
      generate(r) {
        const c = r.int(1, 5);
        const d = r.int(1, 6);
        const k = r.int(4, 12);
        return {
          prompt: `$T(1) = ${c}$ and $T(n) = T(n/2) + ${d}$ for $n$ a power of 2. Find $T(${fmtN(2 ** k)})$.`,
          answer: num(c + d * k),
          solution: [`Unroll: each halving adds ${d}, and it takes $\\log_2 n$ halvings to reach 1. So $T(2^k) = ${c} + ${d}k$.`, `$2^{${k}} = ${fmtN(2 ** k)}$, so $T = ${c} + ${d}\\cdot ${k} = ${c + d * k}$.`],
        };
      },
    },
    {
      name: 'merge-sort type',
      generate(r) {
        const c = r.int(0, 4);
        const k = r.int(3, 10);
        const v = 2 ** k * (c + k);
        return {
          prompt: `$T(1) = ${c}$ and $T(n) = 2T(n/2) + n$ for $n$ a power of 2. Find $T(${fmtN(2 ** k)})$.`,
          answer: num(v),
          solution: [
            'Each of the $\\log_2 n$ levels of the recursion does $n$ work in total, and the $n$ leaves contribute $T(1)$ each.',
            `$T(2^k) = 2^k(k + ${c})$: here $2^{${k}}(${k} + ${c}) = ${fmtN(v)}$.`,
          ],
          selfCheck: () => {
            let t = c;
            for (let j = 1; j <= k; j++) t = 2 * t + 2 ** j;
            return t === v;
          },
        };
      },
    },
    {
      name: 'many subproblems',
      generate(r) {
        const a = r.int(3, 5);
        const k = r.int(3, 7);
        const v = (a ** (k + 1) - 1) / (a - 1);
        return {
          prompt: `$T(1) = 1$ and $T(n) = ${a}T(n/2) + 1$ for $n$ a power of 2. Find $T(${2 ** k})$.`,
          answer: num(v),
          solution: [
            `Level $j$ of the recursion has $${a}^j$ calls, each doing 1 unit of work, for $j = 0, \\dots, k$.`,
            `$T(2^k) = 1 + ${a} + \\dots + ${a}^{k} = \\frac{${a}^{k+1} - 1}{${a - 1}}$; with $k = ${k}$ that is $${fmtN(v)}$. (So $T(n) = \\Theta(n^{\\log_2 ${a}})$.)`,
          ],
          selfCheck: () => {
            let t = 1;
            for (let j = 1; j <= k; j++) t = a * t + 1;
            return t === v;
          },
        };
      },
    },
  ],
  learn: {
    summary:
      'Unroll the recursion as a tree: level $j$ has $a^j$ subproblems of size $n/b^j$. Add the work level by level, plus the leaves. Constant work per call with one halving gives $\\log n$; $2T(n/2) + n$ gives $n\\log n$ (merge sort); $aT(n/2) + 1$ gives a geometric sum dominated by the $a^{\\log_2 n} = n^{\\log_2 a}$ leaves.',
    resources: [levin('sec_recurrence', 'Solving Recurrence Relations'), wiki('Master_theorem_(analysis_of_algorithms)', 'Master theorem (analysis of algorithms)'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Graphs: directed graphs

function randomDAG(r: Rng, n: number, p: number): Graph {
  const order = r.shuffle([...Array(n).keys()]);
  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (r.next() < p) edges.push({ u: order[i], v: order[j] });
  return { n, edges, directed: true };
}

function topoSmallest(g: Graph): number[] {
  const indeg = Array(g.n).fill(0);
  g.edges.forEach((e) => indeg[e.v]++);
  const out: number[] = [];
  const ready = [...Array(g.n).keys()].filter((v) => indeg[v] === 0);
  while (ready.length) {
    ready.sort((a, b) => a - b);
    const v = ready.shift()!;
    out.push(v);
    for (const e of g.edges) if (e.u === v && --indeg[e.v] === 0) ready.push(e.v);
  }
  return out;
}

function countTopo(g: Graph): number {
  const preds = Array.from({ length: g.n }, () => 0);
  g.edges.forEach((e) => (preds[e.v] |= 1 << e.u));
  const memo = new Map<number, number>([[(1 << g.n) - 1, 1]]);
  const go = (mask: number): number => {
    if (memo.has(mask)) return memo.get(mask)!;
    let c = 0;
    for (let v = 0; v < g.n; v++) if (!(mask & (1 << v)) && (preds[v] & mask) === preds[v]) c += go(mask | (1 << v));
    memo.set(mask, c);
    return c;
  };
  return go(0);
}

function sccCount(g: Graph): { count: number; groups: number[][] } {
  const reach = Array.from({ length: g.n }, (_, i) => {
    const seen = new Set([i]);
    const stack = [i];
    while (stack.length) {
      const v = stack.pop()!;
      for (const e of g.edges) if (e.u === v && !seen.has(e.v)) (seen.add(e.v), stack.push(e.v));
    }
    return seen;
  });
  const groups: number[][] = [];
  const done = new Set<number>();
  for (let v = 0; v < g.n; v++) {
    if (done.has(v)) continue;
    const grp = [...Array(g.n).keys()].filter((w) => reach[v].has(w) && reach[w].has(v));
    grp.forEach((w) => done.add(w));
    groups.push(grp);
  }
  return { count: groups.length, groups };
}

export const directed: Skill = {
  id: 'gt.directed',
  name: 'Directed graphs',
  prereqs: ['gt.traversal'],
  levels: [
    {
      name: 'topological sort',
      generate(r) {
        const g = randomDAG(r, r.int(5, 7), 0.4);
        const o = topoSmallest(g);
        return {
          prompt: 'Give a topological order of this DAG (every arrow points forward). When several vertices are available, take the alphabetically first.',
          figure: circleFigure(g),
          answer: { kind: 'sequence', expected: o.map(L) },
          solution: ["Kahn's algorithm: repeatedly output an available vertex (no remaining incoming arrows) and delete its outgoing arrows.", `Order: ${listL(o)}.`],
        };
      },
    },
    {
      name: 'strongly connected components',
      generate(r) {
        const n = r.int(5, 7);
        const base = randomConnected(r, n, r.int(1, 3));
        const edges = base.edges.flatMap((e) => (r.next() < 0.3 ? [e, { u: e.v, v: e.u }] : [r.next() < 0.5 ? e : { u: e.v, v: e.u }]));
        const g: Graph = { n, edges, directed: true };
        const { count, groups } = sccCount(g);
        return {
          prompt: 'How many strongly connected components does this directed graph have?',
          figure: circleFigure(g),
          answer: num(count),
          solution: ['Two vertices are in the same component when each can reach the other along the arrows.', `Components: ${groups.map((gr) => `\\{${listL(gr)}\\}`).map((x) => `$${x}$`).join(', ')}: ${count} in total.`],
        };
      },
    },
    {
      name: 'counting topological orders',
      generate(r) {
        const g = randomDAG(r, r.int(4, 6), 0.35);
        const c = countTopo(g);
        return {
          prompt: 'How many different topological orders does this DAG have?',
          figure: circleFigure(g),
          answer: num(c),
          solution: ['Count by choosing which available vertex comes first and recursing on the rest (or count the linear extensions directly).', `There are ${c}.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'A topological order lists the vertices of a directed acyclic graph so that every edge points forward; it exists iff there is no directed cycle. Kahn\'s algorithm repeatedly removes a vertex with no incoming edges. Strongly connected components group vertices that can reach each other; collapsing them turns any digraph into a DAG.',
    resources: [wiki('Topological_sorting', 'Topological sorting'), wiki('Strongly_connected_component', 'Strongly connected component'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Graphs: Prüfer codes

function prufer(g: Graph): number[] {
  const deg = Array(g.n).fill(0);
  g.edges.forEach((e) => (deg[e.u]++, deg[e.v]++));
  const alive = Array(g.n).fill(true);
  const code: number[] = [];
  for (let step = 0; step < g.n - 2; step++) {
    const leaf = [...Array(g.n).keys()].find((v) => alive[v] && deg[v] === 1)!;
    const e = g.edges.find((x) => (x.u === leaf && alive[x.v]) || (x.v === leaf && alive[x.u]))!;
    const nb = e.u === leaf ? e.v : e.u;
    code.push(nb);
    alive[leaf] = false;
    deg[nb]--;
  }
  return code;
}

export const pruferCodes: Skill = {
  id: 'gt.prufer',
  name: 'Prüfer codes',
  prereqs: ['gt.trees'],
  levels: [
    {
      name: 'encode a tree',
      generate(r) {
        const g = randomConnected(r, r.int(5, 7), 0);
        const code = prufer(g);
        return {
          prompt: 'Find the Prüfer code of this labelled tree (remove the alphabetically smallest leaf each time and write down its neighbour).',
          figure: circleFigure(g),
          answer: { kind: 'sequence', expected: code.map(L) },
          solution: [`Repeat $n - 2 = ${g.n - 2}$ times: delete the smallest leaf and record its neighbour.`, `Code: ${listL(code)}.`],
        };
      },
    },
    {
      name: 'read degrees from a code',
      generate(r) {
        const n = r.int(6, 9);
        const code = Array.from({ length: n - 2 }, () => r.int(0, n - 1));
        if (r.next() < 0.5) {
          const v = r.pick(code);
          const d = code.filter((x) => x === v).length + 1;
          return {
            prompt: `A tree on the vertices ${listL([...Array(n).keys()])} has Prüfer code ${listL(code)}. What is the degree of ${L(v)}?`,
            answer: num(d),
            solution: [`A vertex appears in the code exactly (degree − 1) times. ${L(v)} appears ${d - 1} times, so its degree is ${d}.`],
          };
        }
        const leaves = n - new Set(code).size;
        return {
          prompt: `A tree on the vertices ${listL([...Array(n).keys()])} has Prüfer code ${listL(code)}. How many leaves does it have?`,
          answer: num(leaves),
          solution: [`Leaves are exactly the vertices that never appear in the code. ${new Set(code).size} distinct vertices appear, so $${n} - ${new Set(code).size} = ${leaves}$ are leaves.`],
        };
      },
    },
    {
      name: 'counting with degrees',
      generate(r) {
        const n = r.int(5, 9);
        const d = r.int(1, n - 2);
        const v = C(n - 2, d - 1) * (n - 1) ** (n - 1 - d);
        return {
          prompt: `How many labelled trees on ${n} vertices give vertex 1 degree exactly ${d}?`,
          answer: num(v),
          solution: [
            `Vertex 1 must appear exactly ${d - 1} times among the ${n - 2} code positions; the other positions use the remaining ${n - 1} labels.`,
            `$\\binom{${n - 2}}{${d - 1}}\\cdot ${n - 1}^{${n - 1 - d}} = ${fmtN(v)}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'The Prüfer code turns a labelled tree on $n$ vertices into a sequence of $n - 2$ labels (repeatedly delete the smallest leaf and record its neighbour), and every sequence decodes to exactly one tree. That proves Cayley\'s formula $n^{n-2}$. Each vertex appears in the code (degree − 1) times, so leaves are the labels that never appear.',
    resources: [wiki('Pr%C3%BCfer_sequence', 'Prüfer sequence'), levin('sec_trees', 'Trees')],
  },
};

// ---------------------------------------------------------------------------
// Number theory: orders, primitive roots, square roots

const mod = (a: number, m: number) => ((a % m) + m) % m;
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
function powmod(a: number, k: number, m: number) {
  let res = 1 % m;
  let b = mod(a, m);
  for (let e = k; e > 0; e = Math.floor(e / 2)) {
    if (e % 2) res = (res * b) % m;
    b = (b * b) % m;
  }
  return res;
}
const order = (a: number, n: number) => {
  for (let k = 1, x = mod(a, n); ; k++, x = (x * a) % n) if (x === 1) return k;
};
const PRIMES = [5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
const phi = (n: number) => [...Array(n).keys()].filter((k) => k > 0 && gcd(k, n) === 1).length;

const rem = (v: number): Problem['answer'] => ({ kind: 'number', expected: `${v}`, integer: true });

export const orders: Skill = {
  id: 'nt.orders',
  name: 'Orders, primitive roots and square roots',
  prereqs: ['nt.fermat'],
  levels: [
    {
      name: 'order of an element',
      generate(r) {
        const n = r.int(7, 30);
        let a: number;
        do a = r.int(2, n - 1);
        while (gcd(a, n) !== 1);
        const k = order(a, n);
        const powers = Array.from({ length: k }, (_, i) => powmod(a, i + 1, n));
        return {
          prompt: `What is the order of ${a} modulo ${n} (the smallest $k \\ge 1$ with $${a}^k \\equiv 1$)?`,
          answer: rem(k),
          solution: [`Powers of ${a} mod ${n}: ${powers.map((x, i) => `$${a}^{${i + 1}} \\equiv ${x}$`).join(', ')}.`, `The order is ${k} (it always divides $\\varphi(${n}) = ${phi(n)}$).`],
        };
      },
    },
    {
      name: 'primitive roots',
      generate(r) {
        // From 7 up: modulo 5 every candidate 2..3 is a primitive root, so a "No" case would not exist.
        const p = r.pick(PRIMES.filter((x) => x >= 7 && x <= 31));
        const want = r.next() < 0.5;
        let g: number;
        do g = r.int(2, p - 2);
        while ((order(g, p) === p - 1) !== want);
        const primeFactors = [2, 3, 5, 7, 11, 13].filter((q) => (p - 1) % q === 0);
        return {
          prompt: `Is ${g} a primitive root modulo ${p}?`,
          answer: yesNo(want),
          solution: [
            `$g$ is a primitive root iff its order is $p - 1 = ${p - 1}$, i.e. $g^{(p-1)/q} \\not\\equiv 1$ for every prime $q \\mid ${p - 1}$.`,
            primeFactors.map((q) => `$${g}^{${(p - 1) / q}} \\equiv ${powmod(g, (p - 1) / q, p)}$`).join(', ') + '.',
            want ? 'None is 1, so yes.' : `The order of ${g} is ${order(g, p)}, so no.`,
          ],
        };
      },
    },
    {
      name: 'square roots mod p',
      generate(r) {
        const p = r.pick(PRIMES.filter((x) => x <= 31));
        const residue = r.next() < 0.6;
        let a: number;
        do a = r.int(2, p - 1);
        while ((powmod(a, (p - 1) / 2, p) === 1) !== residue);
        const roots = [...Array(p).keys()].filter((x) => (x * x) % p === a);
        return {
          prompt: `Find all $x$ with $0 \\le x < ${p}$ and $x^2 \\equiv ${a} \\pmod{${p}}$.`,
          answer: { kind: 'set', expected: roots.map(String) },
          inputHint: 'Like {3, 8}; use {} if there are none.',
          solution: [
            `Euler's criterion: $${a}^{(p-1)/2} = ${a}^{${(p - 1) / 2}} \\equiv ${powmod(a, (p - 1) / 2, p) === 1 ? '1' : '-1'} \\pmod{${p}}$, so ${a} is ${residue ? 'a' : 'not a'} square mod ${p}.`,
            residue ? `The roots come in a pair $\\pm x$: $\\{${roots.join(', ')}\\}$.` : 'No solutions.',
          ],
          selfCheck: () => roots.length === (residue ? 2 : 0),
        };
      },
    },
  ],
  learn: {
    summary:
      'The order of $a$ mod $n$ is the least $k \\ge 1$ with $a^k \\equiv 1$; it divides $\\varphi(n)$. A primitive root mod $p$ has order $p - 1$, so its powers hit every non-zero residue; test it by checking $g^{(p-1)/q} \\not\\equiv 1$ for each prime $q \\mid p - 1$. Euler\'s criterion: $a$ is a square mod an odd prime $p$ iff $a^{(p-1)/2} \\equiv 1$, and then it has exactly two square roots $\\pm x$.',
    resources: [wiki('Multiplicative_order', 'Multiplicative order'), wiki('Primitive_root_modulo_n', 'Primitive root modulo n'), wiki('Quadratic_residue', 'Quadratic residue')],
  },
};

// ---------------------------------------------------------------------------
// Number theory: Diffie–Hellman

function dhSetup(r: Rng) {
  const p = r.pick(PRIMES.filter((x) => x >= 11));
  const roots = [...Array(p).keys()].filter((g) => g > 1 && order(g, p) === p - 1);
  return { p, g: r.pick(roots) };
}

export const diffieHellman: Skill = {
  id: 'nt.dh',
  name: 'Diffie–Hellman and discrete logarithms',
  prereqs: ['nt.mod'],
  levels: [
    {
      name: 'public values',
      generate(r) {
        const { p, g } = dhSetup(r);
        const a = r.int(3, p - 2);
        const A = powmod(g, a, p);
        return {
          prompt: `Diffie–Hellman with $p = ${p}$, $g = ${g}$. Alice's secret is $a = ${a}$. What does she publish?`,
          answer: rem(A),
          solution: [`She publishes $A = g^a \\bmod p = ${g}^{${a}} \\bmod ${p} = ${A}$.`],
        };
      },
    },
    {
      name: 'the shared secret',
      generate(r) {
        const { p, g } = dhSetup(r);
        const a = r.int(3, p - 2);
        const b = r.int(3, p - 2);
        const B = powmod(g, b, p);
        const s = powmod(B, a, p);
        return {
          prompt: `Diffie–Hellman with $p = ${p}$, $g = ${g}$. Alice's secret is $a = ${a}$, and Bob publishes $B = ${B}$. What is their shared secret?`,
          answer: rem(s),
          solution: [`Alice computes $B^a \\bmod p = ${B}^{${a}} \\bmod ${p} = ${s}$.`, `Bob gets the same from $A^b$, since both equal $g^{ab}$.`],
          selfCheck: () => s === powmod(powmod(g, a, p), b, p),
        };
      },
    },
    {
      name: 'discrete logarithms',
      generate(r) {
        const { p, g } = dhSetup(r);
        const x = r.int(2, p - 2);
        const h = powmod(g, x, p);
        return {
          prompt: `Find the smallest $x \\ge 1$ with $${g}^x \\equiv ${h} \\pmod{${p}}$.`,
          answer: rem(x),
          solution: [`List powers of ${g} mod ${p} until you hit ${h}: ${Array.from({ length: x }, (_, i) => `$${powmod(g, i + 1, p)}$`).join(', ')}.`, `So $x = ${x}$. For large $p$ no efficient method is known, which is what makes Diffie–Hellman secure.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Diffie–Hellman: agree publicly on a prime $p$ and generator $g$. Alice picks secret $a$ and publishes $g^a$, Bob picks $b$ and publishes $g^b$; both compute $g^{ab}$, which an eavesdropper cannot get without solving a discrete logarithm (find $x$ from $g^x$), believed hard for large $p$.',
    resources: [wiki('Diffie%E2%80%93Hellman_key_exchange', 'Diffie–Hellman key exchange'), wiki('Discrete_logarithm', 'Discrete logarithm'), { kind: 'video', title: 'Khan Academy: Journey into cryptography', url: 'https://www.khanacademy.org/computing/computer-science/cryptography' }],
  },
};
