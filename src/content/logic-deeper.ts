// Optional "going deeper" sections for Logic and Proofs.
import { and, assignments, evalF, iff, imp, not, or, texF, textF, V, type F } from '../core/logic';
import type { Problem, Resource, Rng, Skill } from '../core/types';

const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});
const forallx: Resource = { kind: 'book', title: 'forall x: Calgary (open logic textbook)', url: 'https://forallx.openlogicproject.org/' };
const levin = (page: string, title: string): Resource => ({
  kind: 'book',
  title: `Levin, Discrete Mathematics: An Open Introduction: ${title}`,
  url: `https://discrete.openmathbooks.org/dmoi3/${page}.html`,
});
const bookOfProof: Resource = { kind: 'book', title: 'Hammack, Book of Proof (free textbook)', url: 'https://richardhammack.github.io/BookOfProof/' };

const tf = (b: boolean) => (b ? '\\text{T}' : '\\text{F}');
const envTex = (e: Record<string, boolean>) =>
  Object.entries(e)
    .map(([k, v]) => `${k} = ${tf(v)}`)
    .join(',\\ ');

// ---------------------------------------------------------------------------
// Logic: translating English

const CLAUSES = [
  { p: 'it rains', q: 'the match is cancelled' },
  { p: 'you train', q: 'you improve' },
  { p: 'the tests pass', q: 'the code is merged' },
  { p: 'the light is on', q: 'someone is home' },
  { p: 'n is divisible by 6', q: 'n is even' },
];

const p = V('p');
const q = V('q');

const FORMS: { en: (a: string, b: string) => string; f: F; note: string }[] = [
  { en: (a, b) => `${a} only if ${b}`, f: imp(p, q), note: '"$p$ only if $q$" means $q$ is required for $p$: $p \\to q$.' },
  { en: (a, b) => `${a} if ${b}`, f: imp(q, p), note: '"$p$ if $q$" puts the condition after "if": $q \\to p$.' },
  { en: (a, b) => `${a} unless ${b}`, f: or(p, q), note: '"$p$ unless $q$" means "if not $q$ then $p$", i.e. $\\lnot q \\to p \\equiv p \\lor q$.' },
  { en: (a, b) => `it is neither the case that ${a} nor that ${b}`, f: and(not(p), not(q)), note: '"Neither … nor" is $\\lnot p \\land \\lnot q$.' },
  { en: (a, b) => `“${a}” is a necessary condition for “${b}”`, f: imp(q, p), note: 'A necessary condition follows from the other: $q \\to p$.' },
  { en: (a, b) => `“${a}” is a sufficient condition for “${b}”`, f: imp(p, q), note: 'A sufficient condition implies the other: $p \\to q$.' },
  { en: (a, b) => `${a}, but it is not the case that ${b}`, f: and(p, not(q)), note: '"But" is just "and": $p \\land \\lnot q$.' },
  { en: (a, b) => `${a} if and only if ${b}`, f: iff(p, q), note: '"If and only if" is $p \\leftrightarrow q$.' },
  { en: (a, b) => `either ${a} or ${b}, but not both`, f: and(or(p, q), not(and(p, q))), note: 'Exclusive or: $(p \\lor q) \\land \\lnot(p \\land q)$.' },
];

/** "it rains" -> "It rains"; negated forms of the clauses for "neither/not" read naturally enough as written. */
const cap = (s: string) => (s[0] === '“' ? s : s[0].toUpperCase() + s.slice(1));

const QUANT_STUDENTS: { en: string; f: string }[] = [
  { en: 'Every student passed some exam.', f: '\\forall s\\, \\exists e\\, P(s, e)' },
  { en: 'Some exam was passed by every student.', f: '\\exists e\\, \\forall s\\, P(s, e)' },
  { en: 'Some student passed every exam.', f: '\\exists s\\, \\forall e\\, P(s, e)' },
  { en: 'Every exam was passed by some student.', f: '\\forall e\\, \\exists s\\, P(s, e)' },
  { en: 'Some student failed every exam.', f: '\\exists s\\, \\forall e\\, \\lnot P(s, e)' },
  { en: 'No student passed every exam.', f: '\\forall s\\, \\exists e\\, \\lnot P(s, e)' },
  { en: 'Some student passed some exam.', f: '\\exists s\\, \\exists e\\, P(s, e)' },
];

const QUANT_PEOPLE: { en?: string; f: string }[] = [
  { en: 'All programmers drink coffee.', f: '\\forall x\\, (P(x) \\to C(x))' },
  { en: 'Only programmers drink coffee.', f: '\\forall x\\, (C(x) \\to P(x))' },
  { en: 'Some programmers drink coffee.', f: '\\exists x\\, (P(x) \\land C(x))' },
  { en: 'No programmer drinks coffee.', f: '\\forall x\\, (P(x) \\to \\lnot C(x))' },
  { en: 'Not all programmers drink coffee.', f: '\\exists x\\, (P(x) \\land \\lnot C(x))' },
  { en: 'Everyone is a programmer who drinks coffee.', f: '\\forall x\\, (P(x) \\land C(x))' },
  { f: '\\exists x\\, (P(x) \\to C(x))' },
  { f: '\\forall x\\, (P(x) \\lor C(x))' },
];

function quantChoice(r: Rng, pool: { en?: string; f: string }[], intro: string, why: string): Problem {
  const withEn = pool.filter((x) => x.en);
  const pick = r.pick(withEn);
  const others = r.shuffle(pool.filter((x) => x !== pick)).slice(0, 3);
  const options = r.shuffle([pick, ...others]);
  return {
    prompt: `${intro} Which formula says: “${pick.en}”`,
    answer: { kind: 'choice', options: options.map((o) => `$${o.f}$`), correct: options.indexOf(pick) },
    solution: [`$${pick.f}$. ${why}`],
  };
}

export const translate: Skill = {
  id: 'logic.translate',
  name: 'Translating English into logic',
  prereqs: ['logic.equiv', 'logic.quant'],
  levels: [
    {
      name: 'connectives',
      generate(r) {
        const c = r.pick(CLAUSES);
        const form = r.pick(FORMS);
        return {
          prompt: `Let $p$ = “${c.p}” and $q$ = “${c.q}”. Write as a formula: “${cap(form.en(c.p, c.q))}.”`,
          answer: { kind: 'formula', expected: textF(form.f), vars: ['p', 'q'] },
          inputHint: 'Type ~ for ¬, & for ∧, | for ∨, -> for →, <-> for ↔. Any equivalent formula counts.',
          solution: [form.note, `$${texF(form.f)}$`],
        };
      },
    },
    {
      name: 'nested quantifiers',
      generate: (r) =>
        quantChoice(
          r,
          QUANT_STUDENTS,
          '$P(s, e)$ means “student $s$ passed exam $e$”.',
          'Read the quantifiers left to right: the first one picks its object before the second.',
        ),
    },
    {
      name: '“all”, “only”, “no”, “not all”',
      generate: (r) =>
        quantChoice(
          r,
          QUANT_PEOPLE,
          '$P(x)$: “$x$ is a programmer”, $C(x)$: “$x$ drinks coffee”, over all people.',
          '“All $A$ are $B$” is $\\forall x(A \\to B)$ (not $\\land$); “some $A$ are $B$” is $\\exists x(A \\land B)$ (not $\\to$); “only $A$ are $B$” swaps the roles: $\\forall x(B \\to A)$.',
        ),
    },
  ],
  learn: {
    summary:
      '"$p$ only if $q$" and "$p$ is sufficient for $q$" are $p \\to q$; "$p$ if $q$" and "$p$ is necessary for $q$" are $q \\to p$; "unless" means "if not". With quantifiers: "all $A$ are $B$" is $\\forall x(A(x) \\to B(x))$, "some $A$ are $B$" is $\\exists x(A(x) \\land B(x))$, and the order of $\\forall$ / $\\exists$ follows the order of choice in the sentence.',
    resources: [forallx, wiki('Necessity_and_sufficiency', 'Necessity and sufficiency'), levin('sec_intro-statements', 'Mathematical Statements')],
  },
};

// ---------------------------------------------------------------------------
// Logic: satisfiability

const VARS3 = ['p', 'q', 'r'];

function randomCNF(r: Rng, vars: string[], clauses: number, width: [number, number]): F[] {
  const out: F[] = [];
  while (out.length < clauses) {
    const vs = r.shuffle([...vars]).slice(0, r.int(width[0], width[1])).sort();
    const c = vs.map((v) => (r.next() < 0.5 ? not(V(v)) : V(v))).reduce((a, b) => or(a, b));
    if (!out.some((x) => textF(x) === textF(c))) out.push(c);
  }
  return out;
}

const cnfTex = (cs: F[]) => cs.map((c) => (c.t === 'or' ? `(${texF(c)})` : texF(c))).join(' \\land ');
const models = (cs: F[], vars: string[]) => assignments(vars).filter((e) => cs.every((c) => evalF(c, e)));

export const satisfiability: Skill = {
  id: 'logic.sat',
  name: 'Satisfiability',
  prereqs: ['logic.nf'],
  levels: [
    {
      name: 'satisfiable or not?',
      generate(r) {
        const want = r.next() < 0.5;
        for (;;) {
          const cs = randomCNF(r, VARS3, r.int(4, 7), [1, 2]);
          const ms = models(cs, VARS3);
          if ((ms.length > 0) !== want) continue;
          return {
            prompt: `Is $${cnfTex(cs)}$ satisfiable?`,
            answer: { kind: 'choice', options: ['Yes', 'No'], correct: want ? 0 : 1 },
            solution: want
              ? [`Yes: $${envTex(ms[0])}$ makes every clause true.`]
              : ['No: each of the 8 assignments falsifies at least one clause. Unit clauses force values; following them leads to a clause with every literal false.'],
          };
        }
      },
    },
    {
      name: 'counting models',
      generate(r) {
        const vars = r.next() < 0.5 ? VARS3 : [...VARS3, 's'];
        const cs = randomCNF(r, vars, r.int(2, 4), [2, 3]);
        const ms = models(cs, vars);
        return {
          prompt: `How many of the ${2 ** vars.length} assignments to $${vars.join(', ')}$ satisfy $${cnfTex(cs)}$?`,
          answer: { kind: 'number', expected: `${ms.length}` },
          solution: [
            'Count the assignments that falsify some clause and subtract, or go through the table.',
            `Each clause is false on exactly one combination of its letters; inclusion–exclusion over the clauses (or a table) gives ${ms.length}.`,
          ],
        };
      },
    },
    {
      name: 'find a satisfying assignment',
      generate(r) {
        for (;;) {
          const cs = randomCNF(r, VARS3, r.int(4, 6), [2, 2]);
          const ms = models(cs, VARS3);
          if (ms.length !== 1) continue;
          const good = ms[0];
          const bad = r.shuffle(assignments(VARS3).filter((e) => envTex(e) !== envTex(good))).slice(0, 3);
          const options = r.shuffle([good, ...bad]);
          return {
            prompt: `Which assignment satisfies $${cnfTex(cs)}$?`,
            answer: { kind: 'choice', options: options.map((e) => `$${envTex(e)}$`), correct: options.indexOf(good) },
            solution: [
              'Each 2-literal clause $(a \\lor b)$ is two implications, $\\lnot a \\to b$ and $\\lnot b \\to a$. Chase them from any choice to see what is forced.',
              `Only $${envTex(good)}$ works; each other option falsifies a clause.`,
            ],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'A formula is satisfiable if some assignment makes it true. For CNF this means making at least one literal true in every clause. SAT is NP-complete in general, yet modern solvers handle millions of clauses; 2-SAT (two literals per clause) is easy, because each clause is a pair of implications you can chase.',
    resources: [wiki('Boolean_satisfiability_problem', 'Boolean satisfiability problem'), wiki('2-satisfiability', '2-satisfiability')],
  },
};

// ---------------------------------------------------------------------------
// Proofs: pigeonhole

const prove = (statement: string, proof: string[], selfCheck?: () => boolean): Problem => ({
  prompt: `Prove: ${statement}`,
  answer: { kind: 'self' },
  solution: proof,
  selfCheck,
});

export const pigeonhole: Skill = {
  id: 'proofs.pigeon',
  name: 'Pigeonhole proofs',
  prereqs: ['proofs.contradiction'],
  levels: [
    {
      name: 'remainders and boxes',
      generate(r) {
        const n = r.int(3, 12);
        return r.next() < 0.6
          ? prove(`among any ${n + 1} integers, some two have a difference divisible by ${n}.`, [
              `There are only ${n} possible remainders on division by ${n}: $0, 1, \\dots, ${n - 1}$.`,
              `With ${n + 1} integers (pigeons) and ${n} remainders (holes), two integers $a, b$ share a remainder.`,
              `Then $a - b$ has remainder $0$, i.e. ${n} divides $a - b$. $\\blacksquare$`,
            ])
          : prove(`if ${2 * n + 1} letters are put into ${n} mailboxes, some mailbox gets at least 3 letters.`, [
              `Suppose every mailbox got at most 2 letters. Then there would be at most $2\\cdot ${n} = ${2 * n}$ letters.`,
              `But there are ${2 * n + 1}. Contradiction, so some mailbox has at least 3. $\\blacksquare$`,
            ]);
      },
    },
    {
      name: 'choosing the holes',
      generate(r) {
        if (r.next() < 0.5) {
          const s = r.int(1, 4) * 2;
          const d = `${s === 2 ? '' : s / 2}\\sqrt{2}`;
          return prove(`among any 5 points in a square of side ${s}, some two are at distance at most $${d}$.`, [
            `Split the square into 4 squares of side ${s / 2} (the holes).`,
            '5 points in 4 small squares: two points lie in the same small square (boundaries can go to either one).',
            `Two points in a square of side ${s / 2} are at most its diagonal apart, $${d}$. $\\blacksquare$`,
          ]);
        }
        const n = r.int(2, 20);
        return prove(`in any group of ${n} people, two people have the same number of friends within the group (friendship is mutual).`, [
          `Each person has between $0$ and ${n - 1} friends: ${n} possible values.`,
          `But $0$ and ${n - 1} cannot both occur: someone with ${n - 1} friends is friends with everyone, so nobody has $0$.`,
          `So the ${n} people take at most ${n - 1} values, and two must share one. $\\blacksquare$`,
        ]);
      },
    },
    {
      name: 'harder applications',
      generate(r) {
        const n = r.int(3, 10);
        return r.next() < 0.5
          ? prove(`among any ${n + 1} numbers chosen from $\\{1, 2, \\dots, ${2 * n}\\}$, one divides another.`, [
              'Write each chosen number as $2^k m$ with $m$ odd.',
              `The odd part $m$ is one of the ${n} odd numbers $1, 3, \\dots, ${2 * n - 1}$, so two chosen numbers share the same $m$.`,
              'Say $2^a m < 2^b m$; then $a < b$ and $2^a m$ divides $2^b m$. $\\blacksquare$',
            ])
          : prove(`any sequence of ${n * n + 1} distinct real numbers has an increasing or a decreasing subsequence of length ${n + 1}.`, [
              `Label each term $x_i$ with $(a_i, d_i)$: the lengths of the longest increasing and decreasing subsequences starting at $x_i$.`,
              `If no such subsequence of length ${n + 1} exists, every label lies in $\\{1..${n}\\} \\times \\{1..${n}\\}$: only ${n * n} possible labels for ${n * n + 1} terms.`,
              'So two terms $x_i, x_j$ ($i < j$) share a label. If $x_i < x_j$, prepending $x_i$ to the increasing run from $x_j$ gives $a_i > a_j$; if $x_i > x_j$, similarly $d_i > d_j$. Either way the labels differ. Contradiction. $\\blacksquare$',
            ]);
      },
    },
  ],
  learn: {
    summary:
      'Pigeonhole principle: if more than $kn$ objects go into $n$ boxes, some box holds more than $k$. The art is choosing the boxes: remainders mod $n$, sub-squares of a region, possible degree values, odd parts of numbers, or labels attached to each object.',
    resources: [wiki('Pigeonhole_principle', 'Pigeonhole principle'), bookOfProof],
  },
};

// ---------------------------------------------------------------------------
// Proofs: structural induction

export const structural: Skill = {
  id: 'proofs.structural',
  name: 'Recursive definitions and structural induction',
  prereqs: ['proofs.strong'],
  levels: [
    {
      name: 'recursive sequences',
      generate(r) {
        const k = r.int(2, 9);
        const c = r.int(2, 4);
        // a_0 = k, a_{n+1} = c a_n - (c - 1)  =>  a_n = (k - 1) c^n + 1
        const lead = k - 1 === 1 ? '' : `${k - 1}\\cdot `;
        return prove(`if $a_0 = ${k}$ and $a_{n+1} = ${c}a_n - ${c - 1}$, then $a_n = ${lead}${c}^n + 1$ for all $n \\ge 0$.`, [
          `Base case: $a_0 = ${k} = ${k - 1} \\cdot 1 + 1$.`,
          `Inductive step: assume $a_n = ${k - 1}\\cdot ${c}^n + 1$. Then $a_{n+1} = ${c}(${k - 1}\\cdot ${c}^n + 1) - ${c - 1} = ${k - 1}\\cdot ${c}^{n+1} + ${c} - ${c - 1} = ${k - 1}\\cdot ${c}^{n+1} + 1$. $\\blacksquare$`,
        ], () => {
          let a = k;
          for (let n = 0; n < 12; n++, a = c * a - (c - 1)) if (a !== (k - 1) * c ** n + 1) return false;
          return true;
        });
      },
    },
    {
      name: 'trees',
      generate(r) {
        const pool: [string, string[]][] = [
          [
            'in every full binary tree (each node has 0 or 2 children), the number of leaves is one more than the number of internal nodes.',
            [
              'Structural induction. Base: a single node is 1 leaf and 0 internal nodes.',
              'Step: a tree made of a root with subtrees $T_1, T_2$ has $L_1 + L_2$ leaves and $I_1 + I_2 + 1$ internal nodes.',
              'By the hypothesis $L_i = I_i + 1$, so $L_1 + L_2 = I_1 + I_2 + 2 = (I_1 + I_2 + 1) + 1$. $\\blacksquare$',
            ],
          ],
          [
            'a binary tree of height $h$ has at most $2^h$ leaves (a single node has height 0).',
            [
              'Base: height 0 is one node, $1 = 2^0$ leaf.',
              'Step: a tree of height $h \\ge 1$ is a root with at most two subtrees, each of height at most $h - 1$, so each has at most $2^{h-1}$ leaves.',
              'Total at most $2\\cdot 2^{h-1} = 2^h$. $\\blacksquare$',
            ],
          ],
          [
            'every full binary tree has an odd number of nodes.',
            [
              'Base: a single node, $1$ node.',
              'Step: a root with subtrees of $n_1$ and $n_2$ nodes (both odd by the hypothesis) has $n_1 + n_2 + 1$ nodes: odd + odd + 1 is odd. $\\blacksquare$',
            ],
          ],
        ];
        const [s, proof] = r.pick(pool);
        return prove(s, proof);
      },
    },
    {
      name: 'strings and formulas',
      generate(r) {
        const pool: [string, string[]][] = [
          [
            'let $S$ be the set of strings defined by: the empty string is in $S$, and if $w \\in S$ then $awb \\in S$. Every string in $S$ has as many $a$’s as $b$’s.',
            [
              'Structural induction over the definition. Base: the empty string has $0$ of each.',
              'Step: if $w$ has $k$ $a$’s and $k$ $b$’s, then $awb$ has $k + 1$ of each. $\\blacksquare$',
            ],
          ],
          [
            'in every balanced string of parentheses (defined by: the empty string is balanced; if $u, v$ are balanced then so are $(u)$ and $uv$), every prefix has at least as many "(" as ")".',
            [
              'Base: the empty string has only the empty prefix.',
              'Step $(u)$: a prefix is "(" followed by a prefix of $u$ (surplus $\\ge 1$), or the whole string (surplus $0$).',
              'Step $uv$: a prefix is a prefix of $u$ (surplus $\\ge 0$), or all of $u$ (surplus $0$) followed by a prefix of $v$ (surplus $\\ge 0$). $\\blacksquare$',
            ],
          ],
          [
            'every propositional formula built from letters using only $\\land$ and $\\lor$ is true when all its letters are true.',
            [
              'Base: a letter is true by assumption.',
              'Step: $A \\land B$ and $A \\lor B$ with $A, B$ true (by the hypothesis) are both true. $\\blacksquare$',
              'Consequence: such formulas cannot express $\\lnot p$, so $\\{\\land, \\lor\\}$ is not functionally complete.',
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
      'Recursively defined objects (sequences, trees, strings, formulas) are built from base cases by construction rules. Structural induction proves a property for all of them: check it for the base cases, then show each rule preserves it, assuming it for the pieces the rule combines.',
    resources: [wiki('Structural_induction', 'Structural induction'), levin('sec_seq-induction', 'Proof by Induction')],
  },
};
