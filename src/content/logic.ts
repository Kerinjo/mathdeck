import {
  and,
  assignments,
  canonical,
  classify,
  elimImp,
  equivalent,
  evalF,
  hasImp,
  iff,
  imp,
  nnf,
  not,
  or,
  texF,
  textF,
  truthVector,
  V,
  varsOf,
  type F,
  type Kind,
} from '../core/logic';
import type { Chapter, Problem, Resource, Rng, Skill } from '../core/types';
import { satisfiability, translate } from './logic-deeper';

// ---------------------------------------------------------------------------
// Resources

const levin = (page: string, title: string): Resource => ({
  kind: 'book',
  title: `Levin, Discrete Mathematics: An Open Introduction: ${title}`,
  url: `https://discrete.openmathbooks.org/dmoi3/${page}.html`,
});
const forallx: Resource = { kind: 'book', title: 'forall x: Calgary (open logic textbook)', url: 'https://forallx.openlogicproject.org/' };
const mcs: Resource = {
  kind: 'book',
  title: 'MIT 6.042, Mathematics for Computer Science (free PDF), ch. 3: Logical Formulas',
  url: 'https://courses.csail.mit.edu/6.042/spring18/mcs.pdf',
};
const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});

// ---------------------------------------------------------------------------
// Helpers

const tf = (b: boolean) => (b ? '\\text{T}' : '\\text{F}');
const tfChoice = (value: boolean): Problem['answer'] => ({ kind: 'choice', options: ['True', 'False'], correct: value ? 0 : 1 });
const $ = (f: F) => `$${texF(f)}$`;

type Op = 'not' | 'and' | 'or' | 'imp' | 'iff';

/** Random formula of at most `depth` connectives deep. */
function randF(r: Rng, vars: string[], depth: number, ops: Op[], negated = false): F {
  if (depth === 0 || (depth === 1 && r.next() < 0.25)) {
    const v = V(r.pick(vars));
    return !negated && r.next() < 0.2 ? not(v) : v;
  }
  const op = r.pick(ops.filter((o) => !(negated && o === 'not')));
  if (op === 'not') return not(randF(r, vars, depth - 1, ops, true));
  const a = randF(r, vars, depth - 1, ops);
  // Avoid degenerate pairs like q ∧ q or p → ¬p.
  for (;;) {
    const b = randF(r, vars, depth - 1, ops);
    const base = (f: F) => (f.t === 'not' ? f.a : f);
    if (textF(base(a)) !== textF(base(b))) return { t: op, a, b };
  }
}

/** No ∧/∨ chain repeats an operand, e.g. p ∧ q ∧ q. */
function tidy(f: F): boolean {
  if (f.t === 'var' || f.t === 'const') return true;
  if (f.t === 'not') return tidy(f.a);
  if (f.t === 'and' || f.t === 'or') {
    const parts: F[] = [];
    const walk = (g: F): void => {
      if (g.t === f.t) {
        walk(g.a);
        walk(g.b);
      } else parts.push(g);
    };
    walk(f);
    const texts = parts.map(textF);
    if (new Set(texts).size !== texts.length) return false;
  }
  return tidy(f.a) && tidy(f.b);
}

/** Random formula using every one of `vars`. */
function randFull(r: Rng, vars: string[], depth: number, ops: Op[], kind?: Kind): F {
  for (;;) {
    const f = randF(r, vars, depth, ops);
    if (!tidy(f) || varsOf(f).size !== vars.length) continue;
    if (kind && classify(f, vars) !== kind) continue;
    return f;
  }
}

/** Distinct non-letter subformulas, innermost first. */
function subformulas(f: F, acc: F[] = []): F[] {
  if (f.t === 'not') subformulas(f.a, acc);
  else if (f.t !== 'var' && f.t !== 'const') {
    subformulas(f.a, acc);
    subformulas(f.b, acc);
  }
  if (f.t !== 'var' && f.t !== 'const' && !acc.some((g) => textF(g) === textF(f))) acc.push(f);
  return acc;
}

const envTex = (e: Record<string, boolean>) =>
  Object.entries(e)
    .map(([k, v]) => `${k} = ${tf(v)}`)
    .join(',\\ ');

/** Evaluation steps for the worked solution. */
const evalSteps = (f: F, e: Record<string, boolean>) =>
  subformulas(f).map((g) => `$${texF(g)}$ is $${tf(evalF(g, e))}$`);

/** Truth table as a TeX array, with optional extra columns. */
function tableTex(vars: string[], cols: { head: string; f?: F; values?: boolean[] }[]) {
  const rows = assignments(vars);
  const head = [...vars, ...cols.map((c) => c.head)].join(' & ');
  const body = rows
    .map((e, i) => [...vars.map((v) => tf(e[v])), ...cols.map((c) => tf(c.values ? c.values[i] : evalF(c.f!, e)))].join(' & '))
    .join(' \\\\ ');
  return `$$\\begin{array}{${'c'.repeat(vars.length)}|${'c'.repeat(cols.length)}} ${head} \\\\ \\hline ${body} \\end{array}$$`;
}

/** Substitute formulas for the letters A, B, C of a template. */
function subst(f: F, map: Record<string, F>): F {
  switch (f.t) {
    case 'var':
      return map[f.n] ?? f;
    case 'const':
      return f;
    case 'not':
      return not(subst(f.a, map));
    default:
      return { t: f.t, a: subst(f.a, map), b: subst(f.b, map) };
  }
}

const A = V('A');
const B = V('B');
const C = V('C');

// ---------------------------------------------------------------------------
// Chapter 1: propositions

const evaluate: Skill = {
  id: 'logic.eval',
  name: 'Evaluating formulas',
  prereqs: [],
  levels: [
    {
      name: 'and, or, not',
      generate: (r) => evalProblem(r, ['p', 'q'], 2, ['not', 'and', 'or']),
    },
    {
      name: 'with → and ↔',
      generate: (r) => evalProblem(r, ['p', 'q', 'r'], 3, ['not', 'and', 'or', 'imp', 'iff']),
    },
    {
      name: 'reasoning from partial information',
      generate(r) {
        const e = { p: true, q: false };
        for (;;) {
          const f = randFull(r, ['p', 'q', 'r'], 3, ['not', 'and', 'or', 'imp', 'iff']);
          const vt = evalF(f, { ...e, r: true });
          const vf = evalF(f, { ...e, r: false });
          if (vt !== vf) continue;
          return {
            prompt: `You know that $p \\to q$ is false, but nothing about $r$. Is ${$(f)} true or false?`,
            answer: tfChoice(vt),
            solution: [
              `An implication is false only when its premise is true and its conclusion false, so $p = \\text{T}$ and $q = \\text{F}$.`,
              `With $r = \\text{T}$: ${evalSteps(f, { ...e, r: true }).slice(-1)[0]}. With $r = \\text{F}$: ${evalSteps(f, { ...e, r: false }).slice(-1)[0]}.`,
              `Either way the formula is ${vt ? 'true' : 'false'}.`,
            ],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      '$\\lnot p$ flips the value. $p \\land q$ is true only when both are; $p \\lor q$ when at least one is. $p \\to q$ is false only when $p$ is true and $q$ false. $p \\leftrightarrow q$ is true when both have the same value. Evaluate from the inside out.',
    resources: [levin('sec_propositional', 'Propositional Logic'), levin('sec_intro-statements', 'Mathematical Statements'), forallx],
  },
};

function evalProblem(r: Rng, vars: string[], depth: number, ops: Op[]): Problem {
  const f = randFull(r, vars, depth, ops);
  const e = Object.fromEntries(vars.map((v) => [v, r.next() < 0.5]));
  return {
    prompt: `Let $${envTex(e)}$. Is ${$(f)} true or false?`,
    answer: tfChoice(evalF(f, e)),
    solution: [`Work from the inside out:`, ...evalSteps(f, e)],
  };
}

const truthTables: Skill = {
  id: 'logic.tt',
  name: 'Truth tables',
  prereqs: ['logic.eval'],
  levels: [
    { name: 'two letters', generate: (r) => countProblem(r, ['p', 'q'], 2) },
    { name: 'three letters', generate: (r) => countProblem(r, ['p', 'q', 'r'], 3) },
    { name: 'four letters', generate: (r) => countProblem(r, ['p', 'q', 'r', 's'], 3) },
  ],
  learn: {
    summary:
      'A truth table lists every assignment of truth values to the letters ($2^n$ rows for $n$ letters) and the value of the formula in each. Add a column for each subformula, innermost first, so every step is a single connective.',
    resources: [levin('sec_propositional', 'Propositional Logic'), wiki('Truth_table', 'Truth table')],
  },
};

function countProblem(r: Rng, vars: string[], depth: number): Problem {
  const f = randFull(r, vars, depth, ['not', 'and', 'or', 'imp', 'iff'], 'contingent');
  const v = truthVector(f, vars);
  const n = v.filter(Boolean).length;
  const subs = subformulas(f);
  return {
    prompt: `In how many rows of the truth table is ${$(f)} true?`,
    answer: { kind: 'number', expected: `${n}` },
    inputHint: `There are ${2 ** vars.length} rows.`,
    solution: [
      `Build the table with one column per subformula:`,
      tableTex(vars, subs.map((g) => ({ head: texF(g), f: g }))),
      `The last column has ${n} T's.`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Chapter 2: equivalence and normal forms

const TAUT_T: F[] = [
  or(A, not(A)),
  imp(A, A),
  imp(A, imp(B, A)),
  imp(and(A, B), A),
  imp(A, or(A, B)),
  imp(and(A, imp(A, B)), B),
  imp(and(imp(A, B), not(B)), not(A)),
  imp(and(imp(A, B), imp(B, C)), imp(A, C)),
  iff(imp(A, B), imp(not(B), not(A))),
  iff(not(and(A, B)), or(not(A), not(B))),
];
const CONTINGENT_T: F[] = [
  imp(A, and(A, B)),
  imp(or(A, B), A),
  imp(imp(A, B), imp(B, A)),
  iff(imp(A, B), imp(not(A), not(B))),
  and(A, or(B, not(A))),
  imp(and(imp(A, B), B), A),
  or(and(A, B), and(not(A), C)),
];

const tautologies: Skill = {
  id: 'logic.taut',
  name: 'Tautologies and contradictions',
  prereqs: ['logic.tt'],
  levels: [
    { name: 'classic patterns', generate: (r) => tautProblem(r, () => [V('p'), V('q'), V('r')]) },
    {
      name: 'patterns in disguise',
      generate: (r) => tautProblem(r, () => r.shuffle([V('p'), not(V('q')), V('r'), not(V('p'))]).slice(0, 3)),
    },
    {
      name: 'compound pieces',
      generate: (r) =>
        tautProblem(r, () => [randF(r, ['p', 'q'], 1, ['and', 'or', 'not']), randF(r, ['q', 'r'], 1, ['and', 'or', 'not']), V('r')]),
    },
  ],
  learn: {
    summary:
      'A tautology is true in every row of its truth table, a contradiction false in every row, and anything else is contingent. Instead of a full table you can hunt for a single row that makes a formula false (then it is not a tautology) or true (then it is not a contradiction).',
    resources: [levin('sec_propositional', 'Propositional Logic'), wiki('Tautology_(logic)', 'Tautology (logic)')],
  },
};

const KIND_OPTIONS = ['Tautology', 'Contradiction', 'Neither (contingent)'];
const KIND_INDEX: Record<Kind, number> = { tautology: 0, contradiction: 1, contingent: 2 };

function tautProblem(r: Rng, pieces: () => F[]): Problem {
  const target = r.pick<Kind>(['tautology', 'contradiction', 'contingent']);
  for (;;) {
    const [a, b, c] = pieces();
    const map = { A: a, B: b, C: c };
    const base = target === 'contingent' ? r.pick(CONTINGENT_T) : r.pick(TAUT_T);
    const f = subst(target === 'contradiction' ? not(base) : base, map);
    const vars = [...varsOf(f)].sort();
    const kind = classify(f, vars);
    if (kind !== target) continue;
    const v = truthVector(f, vars);
    const rows = assignments(vars);
    const witness = rows[v.findIndex((x) => x === (kind === 'tautology'))];
    return {
      prompt: `Is ${$(f)} a tautology, a contradiction, or neither?`,
      answer: { kind: 'choice', options: KIND_OPTIONS, correct: KIND_INDEX[kind] },
      solution: [
        kind === 'contingent'
          ? `It is true at $${envTex(rows[v.indexOf(true)])}$ and false at $${envTex(rows[v.indexOf(false)])}$, so it is contingent.`
          : `It is ${kind === 'tautology' ? 'true' : 'false'} in all ${rows.length} rows (e.g. at $${envTex(witness)}$), so it is a ${kind}.`,
        tableTex(vars, [{ head: '\\varphi', f }]),
      ],
    };
  }
}

const LAWS: { a: F; b: F; name: string }[] = [
  { a: not(and(A, B)), b: or(not(A), not(B)), name: "De Morgan's law" },
  { a: not(or(A, B)), b: and(not(A), not(B)), name: "De Morgan's law" },
  { a: imp(A, B), b: or(not(A), B), name: 'implication as a disjunction' },
  { a: imp(A, B), b: imp(not(B), not(A)), name: 'the contrapositive' },
  { a: iff(A, B), b: and(imp(A, B), imp(B, A)), name: 'a biconditional is two implications' },
  { a: and(A, or(B, C)), b: or(and(A, B), and(A, C)), name: 'distributivity' },
  { a: or(A, and(B, C)), b: and(or(A, B), or(A, C)), name: 'distributivity' },
  { a: not(imp(A, B)), b: and(A, not(B)), name: 'negating an implication' },
  { a: imp(A, imp(B, C)), b: imp(and(A, B), C), name: 'exportation' },
];
const TRAPS: { a: F; b: F; name: string }[] = [
  { a: imp(A, B), b: imp(B, A), name: 'the converse' },
  { a: imp(A, B), b: imp(not(A), not(B)), name: 'the inverse' },
  { a: not(and(A, B)), b: and(not(A), not(B)), name: 'a common De Morgan mistake' },
  { a: not(or(A, B)), b: or(not(A), not(B)), name: 'a common De Morgan mistake' },
  { a: imp(A, imp(B, C)), b: imp(imp(A, B), C), name: 'regrouping an implication' },
  { a: and(A, or(B, C)), b: or(and(A, B), C), name: 'dropping a distributed term' },
  { a: not(imp(A, B)), b: imp(not(A), not(B)), name: 'negating both sides of an implication' },
];

const equivalence: Skill = {
  id: 'logic.equiv',
  name: 'Logical equivalence',
  prereqs: ['logic.tt'],
  levels: [
    {
      name: 'equivalent or not?',
      generate(r) {
        const law = r.next() < 0.5 ? r.pick(LAWS) : r.pick(TRAPS);
        const letters = r.shuffle(['p', 'q', 'r']);
        const map = { A: V(letters[0]), B: V(letters[1]), C: V(letters[2]) };
        const [x, y] = r.shuffle([subst(law.a, map), subst(law.b, map)]);
        const same = equivalent(x, y);
        const vars = [...new Set([...varsOf(x), ...varsOf(y)])].sort();
        const row = assignments(vars).find((e) => evalF(x, e) !== evalF(y, e));
        return {
          prompt: `Are ${$(x)} and ${$(y)} logically equivalent?`,
          answer: { kind: 'choice', options: ['Yes', 'No'], correct: same ? 0 : 1 },
          solution: same
            ? [`Yes: this is ${law.name}. Their truth tables agree in every row.`, tableTex(vars, [{ head: '\\text{left}', f: x }, { head: '\\text{right}', f: y }])]
            : [`No: this is ${law.name}. At $${envTex(row!)}$ the first is $${tf(evalF(x, row!))}$ and the second is $${tf(evalF(y, row!))}$.`],
        };
      },
    },
    {
      name: 'rewrite without → and ↔',
      generate(r) {
        let f: F;
        do f = randFull(r, ['p', 'q', 'r'].slice(0, r.int(2, 3)), 2, ['and', 'or', 'imp', 'iff', 'not']);
        while (!hasImp(f));
        const g = [elimImp(f), nnf(f)].sort((x, y) => textF(x).length - textF(y).length)[0];
        return {
          prompt: `Write a formula equivalent to ${$(f)} using only $\\lnot$, $\\land$ and $\\lor$.`,
          answer: { kind: 'formula', expected: textF(g), vars: [...varsOf(f)].sort(), form: 'noimp' },
          inputHint: 'Type ~ for ¬, & for ∧, | for ∨. Any equivalent answer counts.',
          solution: [
            `Use $A \\to B \\equiv \\lnot A \\lor B$ and $A \\leftrightarrow B \\equiv (\\lnot A \\lor B) \\land (A \\lor \\lnot B)$.`,
            `One answer: $${texF(g)}$. Anything with the same truth table is fine.`,
          ],
        };
      },
    },
    {
      name: 'push the negation inward',
      generate(r) {
        let f: F;
        do f = not(randFull(r, ['p', 'q', 'r'], 2, ['and', 'or', 'imp']));
        while (f.t !== 'not' || f.a.t === 'not');
        const g = nnf(f);
        return {
          prompt: `Write ${$(f)} in negation normal form: only $\\land$ and $\\lor$, with $\\lnot$ applied only directly to letters.`,
          answer: { kind: 'formula', expected: textF(g), vars: [...varsOf(f)].sort(), form: 'nnf' },
          inputHint: 'Type ~ for ¬, & for ∧, | for ∨.',
          solution: [
            `Push $\\lnot$ inward step by step: $\\lnot(A \\land B) \\equiv \\lnot A \\lor \\lnot B$, $\\lnot(A \\lor B) \\equiv \\lnot A \\land \\lnot B$, $\\lnot(A \\to B) \\equiv A \\land \\lnot B$, $\\lnot\\lnot A \\equiv A$.`,
            `Result: $${texF(g)}$`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'Two formulas are equivalent ($\\equiv$) when they have the same truth value in every row. Key laws: De Morgan ($\\lnot(A \\land B) \\equiv \\lnot A \\lor \\lnot B$ and dually), $A \\to B \\equiv \\lnot A \\lor B \\equiv \\lnot B \\to \\lnot A$ (contrapositive), distributivity, double negation. The converse $B \\to A$ and the inverse $\\lnot A \\to \\lnot B$ are not equivalent to $A \\to B$.',
    resources: [levin('sec_propositional', 'Propositional Logic'), wiki('Logical_equivalence', 'Logical equivalence'), mcs],
  },
};

const normalForms: Skill = {
  id: 'logic.nf',
  name: 'Normal forms (DNF, CNF)',
  prereqs: ['logic.equiv'],
  levels: [
    {
      name: 'DNF from a truth table',
      generate: (r) => fromTable(r, ['p', 'q'], 'dnf'),
    },
    {
      name: 'CNF from a truth table',
      generate: (r) => fromTable(r, ['p', 'q', 'r'], 'cnf'),
    },
    {
      name: 'convert a formula',
      generate(r) {
        const vars = ['p', 'q', 'r'];
        const form = r.pick(['dnf', 'cnf'] as const);
        const f = randFull(r, vars, 2, ['and', 'or', 'imp', 'not'], 'contingent');
        const g = canonical(truthVector(f, vars), vars, form);
        return {
          prompt: `Write ${$(f)} in ${form === 'dnf' ? 'disjunctive normal form (an OR of ANDs)' : 'conjunctive normal form (an AND of ORs)'}.`,
          answer: { kind: 'formula', expected: textF(g), vars, form },
          inputHint: 'Type ~ for ¬, & for ∧, | for ∨. Any equivalent formula of the right shape counts.',
          solution: [
            `Either rewrite with the laws (remove $\\to$, push $\\lnot$ inward, then distribute), or read it off the truth table:`,
            tableTex(vars, [{ head: '\\varphi', f }]),
            form === 'dnf'
              ? `One term per T row: $${texF(g)}$ (simplifying is optional).`
              : `One clause per F row, ruling that row out: $${texF(g)}$ (simplifying is optional).`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'DNF is an OR of terms, each an AND of letters or negated letters; CNF is an AND of clauses, each an OR of literals. From a truth table: for DNF take one term per row where the formula is T (e.g. $p \\land \\lnot q$ for $p = $ T, $q = $ F); for CNF take one clause per F row that excludes exactly that row (e.g. $\\lnot p \\lor q$). CNF is the input format of SAT solvers.',
    resources: [wiki('Disjunctive_normal_form', 'Disjunctive normal form'), wiki('Conjunctive_normal_form', 'Conjunctive normal form'), mcs],
  },
};

function fromTable(r: Rng, vars: string[], form: 'dnf' | 'cnf'): Problem {
  let v: boolean[];
  do v = vars.length === 2 ? Array.from({ length: 4 }, () => r.next() < 0.5) : Array.from({ length: 8 }, () => r.next() < 0.5);
  while (v.every(Boolean) || !v.some(Boolean));
  const g = canonical(v, vars, form);
  return {
    prompt: `Write a formula in ${form === 'dnf' ? 'disjunctive normal form (an OR of ANDs)' : 'conjunctive normal form (an AND of ORs)'} with this truth table: ${tableTex(vars, [{ head: 'f', values: v }])}`,
    answer: { kind: 'formula', expected: textF(g), vars, form },
    inputHint: 'Type ~ for ¬, & for ∧, | for ∨. Any equivalent formula of the right shape counts.',
    solution: [
      form === 'dnf'
        ? 'Take one AND-term for each row where $f$ is T, describing exactly that row, and OR them together.'
        : 'Take one OR-clause for each row where $f$ is F, which is false exactly on that row, and AND them together.',
      `$${texF(g)}$`,
    ],
  };
}

// ---------------------------------------------------------------------------
// Chapter 3: quantifiers

const DOMAINS = [
  { tex: '\\{1, 2, 3, 4, 5\\}', xs: [1, 2, 3, 4, 5] },
  { tex: '\\{-2, -1, 0, 1, 2\\}', xs: [-2, -1, 0, 1, 2] },
  { tex: '\\{0, 1, 2, 3\\}', xs: [0, 1, 2, 3] },
];

const quantifiers: Skill = {
  id: 'logic.quant',
  name: 'Evaluating quantified statements',
  prereqs: ['logic.eval'],
  levels: [
    {
      name: 'one quantifier, finite domain',
      generate(r) {
        const D = r.pick(DOMAINS);
        const k = r.int(0, 6);
        const preds = [
          { tex: `x^2 > ${k}`, p: (x: number) => x * x > k },
          { tex: `x \\text{ is even}`, p: (x: number) => x % 2 === 0 },
          { tex: `x + ${k} > 3`, p: (x: number) => x + k > 3 },
          { tex: `x^2 \\le ${k}`, p: (x: number) => x * x <= k },
          { tex: `x^2 = x`, p: (x: number) => x * x === x },
          { tex: `x < ${k - 2}`, p: (x: number) => x < k - 2 },
        ];
        const P = r.pick(preds);
        const all = r.next() < 0.5;
        const value = all ? D.xs.every(P.p) : D.xs.some(P.p);
        const witness = all ? D.xs.find((x) => !P.p(x)) : D.xs.find(P.p);
        return {
          prompt: `Domain $D = ${D.tex}$. Is $${all ? '\\forall' : '\\exists'} x \\in D:\\ ${P.tex}$ true?`,
          answer: tfChoice(value),
          solution: [
            all
              ? value
                ? `Every element works: ${D.xs.map((x) => `$${x}$`).join(', ')} all satisfy it.`
                : `$x = ${witness}$ is a counterexample, so the "for all" statement is false.`
              : value
                ? `$x = ${witness}$ is a witness, so the "there exists" statement is true.`
                : `No element of $D$ satisfies it, so it is false.`,
          ],
        };
      },
    },
    {
      name: 'two quantifiers, finite domain',
      generate(r) {
        const D = r.pick(DOMAINS);
        const k = r.pick(D.xs);
        const rels = [
          { tex: `x + y = ${k}`, p: (x: number, y: number) => x + y === k },
          { tex: `x \\cdot y = y`, p: (x: number, y: number) => x * y === y },
          { tex: `y > x`, p: (x: number, y: number) => y > x },
          { tex: `x \\le y`, p: (x: number, y: number) => x <= y },
          { tex: `x + y \\text{ is even}`, p: (x: number, y: number) => (x + y) % 2 === 0 },
          { tex: `|x - y| \\le 1`, p: (x: number, y: number) => Math.abs(x - y) <= 1 },
        ];
        const R = r.pick(rels);
        const [q1, q2] = [r.pick(['∀', '∃'] as const), r.pick(['∀', '∃'] as const)];
        const inner = (x: number) => (q2 === '∀' ? D.xs.every((y) => R.p(x, y)) : D.xs.some((y) => R.p(x, y)));
        const value = q1 === '∀' ? D.xs.every(inner) : D.xs.some(inner);
        const qt = (q: string) => (q === '∀' ? '\\forall' : '\\exists');
        const why = D.xs.map((x) => {
          const ys = D.xs.filter((y) => R.p(x, y));
          return `$x = ${x}$: ${q2 === '∀' ? (ys.length === D.xs.length ? 'every $y$ works' : `fails at $y = ${D.xs.find((y) => !R.p(x, y))}$`) : ys.length ? `$y = ${ys[0]}$ works` : 'no $y$ works'}`;
        });
        return {
          prompt: `Domain $D = ${D.tex}$ for both variables. Is $${qt(q1)} x\\, ${qt(q2)} y:\\ ${R.tex}$ true?`,
          answer: tfChoice(value),
          solution: [
            `Read it left to right: for ${q1 === '∀' ? 'every' : 'some'} $x$, ${q2 === '∀' ? 'every' : 'some'} $y$ must work. Check each $x$:`,
            why.join('; ') + '.',
            `So it is ${value ? 'true' : 'false'}.`,
          ],
        };
      },
    },
    {
      name: 'infinite domains, order matters',
      generate(r) {
        const k = r.int(2, 5);
        const pool: { tex: string; v: boolean; why: string }[] = [
          { tex: `\\forall x \\in \\mathbb{Z}\\ \\exists y \\in \\mathbb{Z}:\\ x + y = ${k}`, v: true, why: `Given $x$, take $y = ${k} - x$.` },
          { tex: `\\exists y \\in \\mathbb{Z}\\ \\forall x \\in \\mathbb{Z}:\\ x + y = ${k}`, v: false, why: `One fixed $y$ cannot work for both $x = 0$ and $x = 1$.` },
          { tex: '\\forall x \\in \\mathbb{N}\\ \\exists y \\in \\mathbb{N}:\\ y > x', v: true, why: 'Take $y = x + 1$.' },
          { tex: '\\exists y \\in \\mathbb{N}\\ \\forall x \\in \\mathbb{N}:\\ y > x', v: false, why: 'Whatever $y$ you pick, $x = y$ breaks it.' },
          { tex: '\\forall x \\in \\mathbb{R}\\ \\exists y \\in \\mathbb{R}:\\ y^2 = x', v: false, why: 'For $x = -1$ no real $y$ has $y^2 = -1$.' },
          { tex: '\\forall x \\in \\mathbb{R}\\ \\exists y \\in \\mathbb{R}:\\ y^3 = x', v: true, why: 'Take $y = \\sqrt[3]{x}$, which exists for every real $x$.' },
          { tex: '\\exists x \\in \\mathbb{R}\\ \\forall y \\in \\mathbb{R}:\\ xy = 0', v: true, why: '$x = 0$ works for every $y$.' },
          { tex: `\\forall x \\in \\mathbb{Z}\\ \\exists y \\in \\mathbb{Z}:\\ ${k}y = x`, v: false, why: `$x = 1$: no integer $y$ has $${k}y = 1$.` },
          { tex: '\\forall x \\in \\mathbb{Q}\\setminus\\{0\\}\\ \\exists y \\in \\mathbb{Q}:\\ xy = 1', v: true, why: 'Take $y = 1/x$.' },
          { tex: '\\exists x \\in \\mathbb{Z}\\ \\forall y \\in \\mathbb{Z}:\\ x \\le y', v: false, why: 'Whatever $x$ you pick, $y = x - 1$ is smaller.' },
          { tex: '\\exists x \\in \\mathbb{N}\\ \\forall y \\in \\mathbb{N}:\\ x \\le y', v: true, why: 'The smallest natural number works.' },
          { tex: '\\forall x \\in \\mathbb{R}\\ \\exists y \\in \\mathbb{R}:\\ x < y < x + 1', v: true, why: 'Take $y = x + \\tfrac12$.' },
          { tex: '\\forall x \\in \\mathbb{Z}\\ \\exists y \\in \\mathbb{Z}:\\ x < y < x + 1', v: false, why: 'There is no integer strictly between consecutive integers.' },
        ];
        const s = r.pick(pool);
        return {
          prompt: `Is $${s.tex}$ true?`,
          answer: tfChoice(s.v),
          solution: [s.why, `In $\\forall x\\, \\exists y$ the $y$ may depend on $x$; in $\\exists y\\, \\forall x$ one $y$ must work for all $x$.`],
        };
      },
    },
  ],
  learn: {
    summary:
      '$\\forall x\\, P(x)$ is true when every element satisfies $P$ (one counterexample makes it false); $\\exists x\\, P(x)$ when at least one does (one witness makes it true). With two quantifiers, order matters: $\\forall x\\, \\exists y$ lets $y$ depend on $x$, $\\exists y\\, \\forall x$ needs a single $y$ that works for every $x$.',
    resources: [levin('sec_intro-statements', 'Mathematical Statements'), wiki('Quantifier_(logic)', 'Quantifier (logic)'), forallx],
  },
};

type Q = { q: '∀' | '∃'; v: string };
const qTex = (qs: Q[], body: F) => `${qs.map((x) => `${x.q === '∀' ? '\\forall' : '\\exists'} ${x.v}\\,`).join(' ')}\\big(${texF(body)}\\big)`;
const flip = (qs: Q[]): Q[] => qs.map((x) => ({ ...x, q: x.q === '∀' ? '∃' : '∀' }));
/** The classic wrong negation: negate each atom, keep the connective. */
const naiveNeg = (f: F): F =>
  f.t === 'var' ? not(f) : f.t === 'not' ? f.a : f.t === 'const' ? f : { t: f.t, a: naiveNeg(f.a), b: naiveNeg(f.b) };

const negation: Skill = {
  id: 'logic.negq',
  name: 'Negating quantified statements',
  prereqs: ['logic.quant', 'logic.equiv'],
  levels: [
    { name: 'one quantifier', generate: (r) => negProblem(r, [{ q: r.pick(['∀', '∃']), v: 'x' }], ['P(x)', 'Q(x)']) },
    {
      name: 'two quantifiers',
      generate: (r) =>
        negProblem(r, [{ q: r.pick(['∀', '∃']), v: 'x' }, { q: r.pick(['∀', '∃']), v: 'y' }], ['P(x)', 'R(x,y)', 'Q(y)']),
    },
    {
      name: 'three quantifiers',
      generate: (r) =>
        negProblem(
          r,
          [{ q: r.pick(['∀', '∃']), v: 'x' }, { q: r.pick(['∀', '∃']), v: 'y' }, { q: r.pick(['∀', '∃']), v: 'z' }],
          ['R(x,y)', 'S(y,z)', 'P(z)'],
        ),
    },
  ],
  learn: {
    summary:
      'Negation swaps the quantifiers and moves inward: $\\lnot \\forall x\\, P(x) \\equiv \\exists x\\, \\lnot P(x)$ and $\\lnot \\exists x\\, P(x) \\equiv \\forall x\\, \\lnot P(x)$. Flip every quantifier, then negate the body with the propositional laws; in particular $\\lnot(P \\to Q) \\equiv P \\land \\lnot Q$. So "not every bird flies" means "some bird does not fly".',
    resources: [levin('sec_intro-statements', 'Mathematical Statements'), wiki('Quantifier_(logic)', 'Quantifier (logic)'), mcs],
  },
};

function negProblem(r: Rng, qs: Q[], atoms: string[]): Problem {
  for (;;) {
    const [a, b] = r.shuffle([...atoms]).slice(0, 2).map(V);
    const body = r.pick([imp(a, b), and(a, b), or(a, b), imp(a, not(b))]);
    const right = qTex(flip(qs), nnf(not(body)));
    const wrongs = [
      qTex(qs, nnf(not(body))),
      qTex(flip(qs), body),
      qTex(flip(qs), naiveNeg(body)),
      ...(qs.length > 1 ? [qTex([flip(qs)[0], ...qs.slice(1)], nnf(not(body)))] : []),
    ].filter((w, i, all) => w !== right && all.indexOf(w) === i);
    if (wrongs.length < 3) continue;
    const options = r.shuffle([right, ...r.shuffle(wrongs).slice(0, 3)]);
    return {
      prompt: `Which statement is the negation of $${qTex(qs, body)}$?`,
      answer: { kind: 'choice', options: options.map((o) => `$${o}$`), correct: options.indexOf(right) },
      solution: [
        'Flip every quantifier ($\\forall \\leftrightarrow \\exists$), then negate the body.',
        `$\\lnot(${texF(body)}) \\equiv ${texF(nnf(not(body)))}$`,
        `So the negation is $${right}$.`,
      ],
    };
  }
}

// ---------------------------------------------------------------------------
// Chapter 4: arguments

const p = V('p');
const q = V('q');
const rr = V('r');

const FORMS: { name: string; premises: F[]; concl: F; valid: boolean }[] = [
  { name: 'Modus ponens', premises: [imp(p, q), p], concl: q, valid: true },
  { name: 'Modus tollens', premises: [imp(p, q), not(q)], concl: not(p), valid: true },
  { name: 'Hypothetical syllogism', premises: [imp(p, q), imp(q, rr)], concl: imp(p, rr), valid: true },
  { name: 'Disjunctive syllogism', premises: [or(p, q), not(p)], concl: q, valid: true },
  { name: 'Affirming the consequent', premises: [imp(p, q), q], concl: p, valid: false },
  { name: 'Denying the antecedent', premises: [imp(p, q), not(p)], concl: not(q), valid: false },
];

const argTex = (premises: F[], concl: F) =>
  `$$\\begin{array}{l} ${premises.map(texF).join(' \\\\ ')} \\\\ \\hline \\therefore\\ ${texF(concl)} \\end{array}$$`;

/** Rows where every premise holds but the conclusion fails. */
function counterexamples(premises: F[], concl: F, vars: string[]) {
  return assignments(vars).filter((e) => premises.every((f) => evalF(f, e)) && !evalF(concl, e));
}

function randomArgument(r: Rng, wantValid: boolean) {
  const vars = ['p', 'q', 'r'];
  for (;;) {
    const premises = [randF(r, vars, 2, ['and', 'or', 'imp', 'not']), randF(r, vars, r.int(1, 2), ['and', 'or', 'imp', 'not'])];
    const concl = randF(r, vars, r.int(0, 1), ['and', 'or', 'imp', 'not']);
    if (![...premises, concl].every(tidy)) continue;
    const rows = assignments(vars).filter((e) => premises.every((f) => evalF(f, e)));
    if (rows.length === 0 || rows.length === 8) continue; // vacuous or trivial premises
    if (classify(concl, vars) !== 'contingent') continue;
    const ce = counterexamples(premises, concl, vars);
    if ((ce.length === 0) !== wantValid) continue;
    return { premises, concl, vars, ce, rows };
  }
}

const validity: Skill = {
  id: 'logic.valid',
  name: 'Valid arguments',
  prereqs: ['logic.tt'],
  levels: [
    {
      name: 'classic forms',
      generate(r) {
        const form = r.pick(FORMS);
        const letters = r.shuffle(['p', 'q', 'r', 's']);
        const map: Record<string, F> = { p: V(letters[0]), q: V(letters[1]), r: V(letters[2]) };
        const premises = form.premises.map((f) => subst(f, map));
        const concl = subst(form.concl, map);
        const vars = [...new Set([...premises.flatMap((f) => [...varsOf(f)]), ...varsOf(concl)])].sort();
        const ce = counterexamples(premises, concl, vars);
        return {
          prompt: `Is this argument valid? ${argTex(premises, concl)}`,
          answer: { kind: 'choice', options: ['Valid', 'Invalid'], correct: ce.length ? 1 : 0 },
          solution: [
            `This is ${form.name.toLowerCase()}${form.valid ? ', a valid form' : ', a classic fallacy'}.`,
            ce.length
              ? `Counterexample: $${envTex(ce[0])}$ makes every premise true and the conclusion false.`
              : 'In every row where all premises are true, the conclusion is true too.',
          ],
        };
      },
    },
    {
      name: 'check with a truth table',
      generate(r) {
        const a = randomArgument(r, r.next() < 0.5);
        return {
          prompt: `Is this argument valid? ${argTex(a.premises, a.concl)}`,
          answer: { kind: 'choice', options: ['Valid', 'Invalid'], correct: a.ce.length ? 1 : 0 },
          solution: [
            `Only the rows where all premises are true matter: ${a.rows.map((e) => `$${envTex(e)}$`).join('; ')}.`,
            a.ce.length
              ? `At $${envTex(a.ce[0])}$ the conclusion is false, so the argument is invalid.`
              : 'The conclusion is true in each of them, so the argument is valid.',
          ],
        };
      },
    },
    {
      name: 'find the counterexample',
      generate(r) {
        const a = randomArgument(r, false);
        const good = r.pick(a.ce);
        const isCe = (e: Record<string, boolean>) => a.ce.some((c) => envTex(c) === envTex(e));
        const others = r.shuffle(assignments(a.vars).filter((e) => !isCe(e))).slice(0, 3);
        const options = r.shuffle([good, ...others]);
        return {
          prompt: `This argument is invalid. Which assignment shows it? ${argTex(a.premises, a.concl)}`,
          answer: { kind: 'choice', options: options.map((e) => `$${envTex(e)}$`), correct: options.indexOf(good) },
          solution: [
            'A counterexample makes every premise true and the conclusion false.',
            `At $${envTex(good)}$: premises ${a.premises.map((f) => `$${tf(evalF(f, good))}$`).join(', ')}; conclusion $${tf(evalF(a.concl, good))}$.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'An argument is valid if the conclusion is true in every situation where all the premises are true. To show it is invalid, find one counterexample: an assignment making all premises true and the conclusion false. Valid forms include modus ponens and modus tollens; affirming the consequent and denying the antecedent are classic fallacies.',
    resources: [wiki('Validity_(logic)', 'Validity (logic)'), wiki('Rule_of_inference', 'Rule of inference'), forallx],
  },
};

const STORIES = [
  { p: 'it rains', np: 'it does not rain', q: 'the street is wet', nq: 'the street is not wet', r: 'cars slow down', nr: 'cars do not slow down' },
  { p: 'the code compiles', np: 'the code does not compile', q: 'the tests run', nq: 'the tests do not run', r: 'the build is green', nr: 'the build is not green' },
  { p: 'n is divisible by 4', np: 'n is not divisible by 4', q: 'n is even', nq: 'n is odd', r: 'n² is even', nr: 'n² is odd' },
  { p: 'the server is down', np: 'the server is up', q: 'the site is unreachable', nq: 'the site is reachable', r: 'users complain', nr: 'users do not complain' },
  { p: 'Ana studies', np: 'Ana does not study', q: 'Ana passes', nq: 'Ana does not pass', r: 'Ana graduates', nr: 'Ana does not graduate' },
];

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

const rules: Skill = {
  id: 'logic.rules',
  name: 'Rules of inference',
  prereqs: ['logic.valid'],
  levels: [
    {
      name: 'name the form',
      generate(r) {
        const form = r.pick(FORMS);
        const options = ruleOptions(r, form.name);
        return {
          prompt: `Which rule (or fallacy) is this? ${argTex(form.premises, form.concl)}`,
          answer: { kind: 'choice', options, correct: options.indexOf(form.name) },
          solution: [`It is ${form.name.toLowerCase()}. ${form.valid ? 'It is valid.' : 'It is not valid: it is a fallacy.'}`],
        };
      },
    },
    {
      name: 'in plain English',
      generate(r) {
        const s = r.pick(STORIES);
        const forms: Record<string, string> = {
          'Modus ponens': `If ${s.p}, then ${s.q}. ${cap(s.p)}. Therefore ${s.q}.`,
          'Modus tollens': `If ${s.p}, then ${s.q}. ${cap(s.nq)}. Therefore ${s.np}.`,
          'Hypothetical syllogism': `If ${s.p}, then ${s.q}. If ${s.q}, then ${s.r}. Therefore, if ${s.p}, then ${s.r}.`,
          'Disjunctive syllogism': `Either ${s.p} or ${s.q}. ${cap(s.np)}. Therefore ${s.q}.`,
          'Affirming the consequent': `If ${s.p}, then ${s.q}. ${cap(s.q)}. Therefore ${s.p}.`,
          'Denying the antecedent': `If ${s.p}, then ${s.q}. ${cap(s.np)}. Therefore ${s.nq}.`,
        };
        const name = r.pick(Object.keys(forms));
        const options = ruleOptions(r, name);
        const valid = FORMS.find((f) => f.name === name)!.valid;
        return {
          prompt: `Which rule (or fallacy) is this argument? “${forms[name]}”`,
          answer: { kind: 'choice', options, correct: options.indexOf(name) },
          solution: [
            `Strip it down to letters ($p$ = "${s.p}", $q$ = "${s.q}") and compare with the standard forms.`,
            `It is ${name.toLowerCase()}, which is ${valid ? 'valid' : 'a fallacy'}.`,
          ],
        };
      },
    },
    {
      name: 'what follows?',
      generate(r) {
        const s = r.pick(STORIES);
        const nothing = `Nothing follows about whether ${s.p}`;
        const T = [
          { prem: [`If ${s.p}, then ${s.q}.`, `If ${s.q}, then ${s.r}.`, `${cap(s.p)}.`], good: s.r, bad: [s.nr, s.np, nothing], why: 'Chain the implications to "if p then r" (hypothetical syllogism), then modus ponens with p.' },
          { prem: [`If ${s.p}, then ${s.q}.`, `If ${s.q}, then ${s.r}.`, `${cap(s.nr)}.`], good: s.np, bad: [s.p, s.q, nothing], why: 'Chain to "if p then r", then modus tollens: not r gives not p.' },
          { prem: [`Either ${s.p} or ${s.q}.`, `If ${s.p}, then ${s.r}.`, `${cap(s.nr)}.`], good: s.q, bad: [s.p, s.nq, s.r], why: 'Modus tollens: not r gives not p. Then disjunctive syllogism with "p or q" gives q.' },
          { prem: [`If ${s.p}, then ${s.q}.`, `${cap(s.q)}.`], good: nothing, bad: [s.p, s.np, s.r], why: 'Concluding p would be affirming the consequent, and q being true is consistent with p either way.' },
        ];
        const t = r.pick(T);
        const options = r.shuffle([t.good, ...t.bad].map(cap));
        return {
          prompt: `Premises: “${t.prem.join(' ')}” Which conclusion follows validly?`,
          answer: { kind: 'choice', options, correct: options.indexOf(cap(t.good)) },
          solution: [`Let $p$ = "${s.p}", $q$ = "${s.q}", $r$ = "${s.r}".`, t.why],
        };
      },
    },
  ],
  learn: {
    summary:
      'Modus ponens: from $p \\to q$ and $p$ conclude $q$. Modus tollens: from $p \\to q$ and $\\lnot q$ conclude $\\lnot p$. Hypothetical syllogism chains implications. Disjunctive syllogism: from $p \\lor q$ and $\\lnot p$ conclude $q$. Fallacies: affirming the consequent ($p \\to q$, $q$, so $p$) and denying the antecedent ($p \\to q$, $\\lnot p$, so $\\lnot q$).',
    resources: [wiki('Rule_of_inference', 'Rule of inference'), wiki('Affirming_the_consequent', 'Affirming the consequent'), forallx],
  },
};

function ruleOptions(r: Rng, correct: string) {
  const others = r.shuffle(FORMS.map((f) => f.name).filter((n) => n !== correct)).slice(0, 3);
  return r.shuffle([correct, ...others]);
}

// ---------------------------------------------------------------------------

export const logicChapters: Chapter[] = [
  {
    id: 'logic.ch.prop',
    title: 'Propositions and connectives',
    about: 'Statements that are true or false, the connectives $\\lnot, \\land, \\lor, \\to, \\leftrightarrow$, and truth tables.',
    why: 'Every condition in a program is a propositional formula, and every proof is built out of these connectives.',
    resources: [levin('sec_propositional', 'Propositional Logic'), forallx, mcs],
    skills: [evaluate, truthTables],
    deeper: [],
  },
  {
    id: 'logic.ch.equiv',
    title: 'Equivalence and normal forms',
    about: 'When two formulas say the same thing, the laws that transform one into the other, tautologies, and the DNF/CNF normal forms.',
    why: 'Simplifying conditions, De Morgan in code, and CNF as the input of SAT solvers that power verification and scheduling tools.',
    resources: [wiki('Logical_equivalence', 'Logical equivalence'), wiki('Conjunctive_normal_form', 'Conjunctive normal form'), mcs],
    skills: [tautologies, equivalence, normalForms],
    deeper: [satisfiability],
  },
  {
    id: 'logic.ch.quant',
    title: 'Quantifiers',
    about: 'Statements about "all" and "some": evaluating them, the importance of quantifier order, and negating them.',
    why: 'Definitions in mathematics (limits, continuity, Big-O) are nested quantifiers. Negating them correctly is how you prove something fails.',
    resources: [levin('sec_intro-statements', 'Mathematical Statements'), wiki('Quantifier_(logic)', 'Quantifier (logic)'), forallx],
    skills: [quantifiers, negation],
    deeper: [translate],
  },
  {
    id: 'logic.ch.args',
    title: 'Arguments',
    about: 'Valid and invalid arguments, counterexamples, and the standard rules of inference and fallacies.',
    why: 'Recognising a valid step from a fallacy is the core skill behind writing (and checking) proofs.',
    resources: [wiki('Validity_(logic)', 'Validity (logic)'), wiki('Rule_of_inference', 'Rule of inference'), forallx],
    skills: [validity, rules],
    deeper: [],
  },
];
