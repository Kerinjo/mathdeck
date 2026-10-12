// Propositional formulas: parsing what people type, evaluation, TeX, and shape checks (NNF, DNF, CNF).

export type F =
  | { t: 'var'; n: string }
  | { t: 'const'; v: boolean }
  | { t: 'not'; a: F }
  | { t: 'and' | 'or' | 'imp' | 'iff'; a: F; b: F };

export const V = (n: string): F => ({ t: 'var', n });
export const not = (a: F): F => ({ t: 'not', a });
export const and = (a: F, b: F): F => ({ t: 'and', a, b });
export const or = (a: F, b: F): F => ({ t: 'or', a, b });
export const imp = (a: F, b: F): F => ({ t: 'imp', a, b });
export const iff = (a: F, b: F): F => ({ t: 'iff', a, b });

// ---------------------------------------------------------------------------
// Parsing. Accepts ¬ ~ ! not, ∧ & /\ and, ∨ | \/ or, → -> => implies, ↔ <-> <=> iff, T F 1 0.
// Precedence, tightest first: ¬, ∧, ∨, → (right-assoc), ↔.

type Tok = { k: 'var'; n: string } | { k: 'const'; v: boolean } | { k: 'op'; o: string } | { k: '(' } | { k: ')' };

const WORDS: Record<string, Tok> = {
  not: { k: 'op', o: 'not' },
  and: { k: 'op', o: 'and' },
  or: { k: 'op', o: 'or' },
  implies: { k: 'op', o: 'imp' },
  iff: { k: 'op', o: 'iff' },
  true: { k: 'const', v: true },
  false: { k: 'const', v: false },
  T: { k: 'const', v: true },
  F: { k: 'const', v: false },
};

const SYMBOLS: [string, Tok][] = [
  ['<->', { k: 'op', o: 'iff' }],
  ['<=>', { k: 'op', o: 'iff' }],
  ['->', { k: 'op', o: 'imp' }],
  ['=>', { k: 'op', o: 'imp' }],
  ['/\\', { k: 'op', o: 'and' }],
  ['\\/', { k: 'op', o: 'or' }],
  ['¬', { k: 'op', o: 'not' }],
  ['~', { k: 'op', o: 'not' }],
  ['!', { k: 'op', o: 'not' }],
  ['∧', { k: 'op', o: 'and' }],
  ['&', { k: 'op', o: 'and' }],
  ['∨', { k: 'op', o: 'or' }],
  ['|', { k: 'op', o: 'or' }],
  ['→', { k: 'op', o: 'imp' }],
  ['↔', { k: 'op', o: 'iff' }],
  ['⊤', { k: 'const', v: true }],
  ['⊥', { k: 'const', v: false }],
  ['1', { k: 'const', v: true }],
  ['0', { k: 'const', v: false }],
  ['(', { k: '(' }],
  [')', { k: ')' }],
];

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }
    const sym = SYMBOLS.find(([p]) => s.startsWith(p, i));
    if (sym) {
      out.push(sym[1]);
      i += sym[0].length;
      continue;
    }
    const m = /^[A-Za-z][A-Za-z0-9_]*/.exec(s.slice(i));
    if (m) {
      const w = m[0];
      out.push(WORDS[w] ?? WORDS[w.toLowerCase()] ?? { k: 'var', n: w });
      i += w.length;
      continue;
    }
    throw new Error(`Unexpected "${s[i]}"`);
  }
  return out;
}

export function parseFormula(src: string): F {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (o: string) => peek()?.k === 'op' && (peek() as { o: string }).o === o;

  const iffP = (): F => {
    let a = impP();
    while (isOp('iff')) {
      pos++;
      a = iff(a, impP());
    }
    return a;
  };
  const impP = (): F => {
    const a = orP();
    if (isOp('imp')) {
      pos++;
      return imp(a, impP());
    }
    return a;
  };
  const orP = (): F => {
    let a = andP();
    while (isOp('or')) {
      pos++;
      a = or(a, andP());
    }
    return a;
  };
  const andP = (): F => {
    let a = notP();
    while (isOp('and')) {
      pos++;
      a = and(a, notP());
    }
    return a;
  };
  const notP = (): F => {
    if (isOp('not')) {
      pos++;
      return not(notP());
    }
    return atom();
  };
  const atom = (): F => {
    const t = peek();
    if (!t) throw new Error('Unexpected end');
    pos++;
    if (t.k === 'var') return V(t.n);
    if (t.k === 'const') return { t: 'const', v: t.v };
    if (t.k === '(') {
      const a = iffP();
      if (peek()?.k !== ')') throw new Error('Missing )');
      pos++;
      return a;
    }
    throw new Error('Expected a letter or (');
  };

  if (!toks.length) throw new Error('Empty');
  const f = iffP();
  if (pos < toks.length) throw new Error('Unexpected input after formula');
  return f;
}

// ---------------------------------------------------------------------------

export function evalF(f: F, env: Record<string, boolean>): boolean {
  switch (f.t) {
    case 'var':
      return env[f.n];
    case 'const':
      return f.v;
    case 'not':
      return !evalF(f.a, env);
    case 'and':
      return evalF(f.a, env) && evalF(f.b, env);
    case 'or':
      return evalF(f.a, env) || evalF(f.b, env);
    case 'imp':
      return !evalF(f.a, env) || evalF(f.b, env);
    case 'iff':
      return evalF(f.a, env) === evalF(f.b, env);
  }
}

export function varsOf(f: F, acc = new Set<string>()): Set<string> {
  if (f.t === 'var') acc.add(f.n);
  else if (f.t === 'not') varsOf(f.a, acc);
  else if (f.t !== 'const') {
    varsOf(f.a, acc);
    varsOf(f.b, acc);
  }
  return acc;
}

/** All assignments of `vars`, in textbook order (TT..., then down to FF...). */
export function assignments(vars: string[]): Record<string, boolean>[] {
  return Array.from({ length: 2 ** vars.length }, (_, i) =>
    Object.fromEntries(vars.map((v, j) => [v, !((i >> (vars.length - 1 - j)) & 1)])),
  );
}

export const truthVector = (f: F, vars: string[]) => assignments(vars).map((e) => evalF(f, e));

export function equivalent(a: F, b: F, vars?: string[]) {
  const vs = vars ?? [...new Set([...varsOf(a), ...varsOf(b)])].sort();
  return assignments(vs).every((e) => evalF(a, e) === evalF(b, e));
}

export type Kind = 'tautology' | 'contradiction' | 'contingent';
export function classify(f: F, vars?: string[]): Kind {
  const v = truthVector(f, vars ?? [...varsOf(f)].sort());
  return v.every(Boolean) ? 'tautology' : v.some(Boolean) ? 'contingent' : 'contradiction';
}

// ---------------------------------------------------------------------------
// Shapes

const isLiteral = (f: F) => f.t === 'var' || f.t === 'const' || (f.t === 'not' && f.a.t === 'var');
const flatten = (f: F, op: 'and' | 'or'): F[] => (f.t === op ? [...flatten(f.a, op), ...flatten(f.b, op)] : [f]);

export const hasImp = (f: F): boolean =>
  f.t === 'imp' || f.t === 'iff' || (f.t === 'not' ? hasImp(f.a) : f.t === 'and' || f.t === 'or' ? hasImp(f.a) || hasImp(f.b) : false);

/** Negation normal form: only ∧ ∨, and ¬ only directly on letters. */
export const isNNF = (f: F): boolean =>
  isLiteral(f) || ((f.t === 'and' || f.t === 'or') && isNNF(f.a) && isNNF(f.b));

/** OR of ANDs of literals. */
export const isDNF = (f: F) => flatten(f, 'or').every((c) => flatten(c, 'and').every(isLiteral));
/** AND of ORs of literals. */
export const isCNF = (f: F) => flatten(f, 'and').every((c) => flatten(c, 'or').every(isLiteral));

/** Push negations inward (De Morgan) and remove → ↔. */
export function nnf(f: F): F {
  switch (f.t) {
    case 'var':
    case 'const':
      return f;
    case 'and':
    case 'or':
      return { t: f.t, a: nnf(f.a), b: nnf(f.b) };
    case 'imp':
      return or(nnf(not(f.a)), nnf(f.b));
    case 'iff':
      return or(and(nnf(f.a), nnf(f.b)), and(nnf(not(f.a)), nnf(not(f.b))));
    case 'not': {
      const a = f.a;
      if (a.t === 'var') return f;
      if (a.t === 'const') return { t: 'const', v: !a.v };
      if (a.t === 'not') return nnf(a.a);
      if (a.t === 'and') return or(nnf(not(a.a)), nnf(not(a.b)));
      if (a.t === 'or') return and(nnf(not(a.a)), nnf(not(a.b)));
      if (a.t === 'imp') return and(nnf(a.a), nnf(not(a.b)));
      return or(and(nnf(a.a), nnf(not(a.b))), and(nnf(not(a.a)), nnf(a.b)));
    }
  }
}

/** Replace → and ↔ by ¬, ∧, ∨ without pushing negations around (keeps the shape recognisable). */
export function elimImp(f: F): F {
  switch (f.t) {
    case 'var':
    case 'const':
      return f;
    case 'not':
      return not(elimImp(f.a));
    case 'and':
    case 'or':
      return { t: f.t, a: elimImp(f.a), b: elimImp(f.b) };
    case 'imp':
      return or(not(elimImp(f.a)), elimImp(f.b));
    case 'iff': {
      const a = elimImp(f.a);
      const b = elimImp(f.b);
      return and(or(not(a), b), or(a, not(b)));
    }
  }
}

/** Canonical DNF (one term per true row) or CNF (one clause per false row). */
export function canonical(vector: boolean[], vars: string[], form: 'dnf' | 'cnf'): F {
  const rows = assignments(vars);
  const lit = (v: string, val: boolean) => (val ? V(v) : not(V(v)));
  const pick = rows.filter((_, i) => vector[i] === (form === 'dnf'));
  if (!pick.length) return { t: 'const', v: form === 'cnf' };
  const terms = pick.map((e) =>
    form === 'dnf'
      ? vars.map((v) => lit(v, e[v])).reduce((x, y) => and(x, y))
      : vars.map((v) => lit(v, !e[v])).reduce((x, y) => or(x, y)),
  );
  return terms.reduce((x, y) => (form === 'dnf' ? or(x, y) : and(x, y)));
}

// ---------------------------------------------------------------------------
// Display

const TEX_OP = { and: '\\land', or: '\\lor', imp: '\\to', iff: '\\leftrightarrow' } as const;
const TXT_OP = { and: '∧', or: '∨', imp: '→', iff: '↔' } as const;

/**
 * Explicit grouping beats precedence rules for readability: any binary connective inside a different
 * one (or under ¬) gets parentheses; chains of the same ∧ or ∨ do not.
 */
function render(f: F, ops: Record<'and' | 'or' | 'imp' | 'iff', string>, neg: string, varFmt: (n: string) => string, tf: [string, string]): string {
  const go = (g: F, parentOp?: string): string => {
    switch (g.t) {
      case 'var':
        return varFmt(g.n);
      case 'const':
        return g.v ? tf[0] : tf[1];
      case 'not':
        return `${neg}${go(g.a, 'not')}`;
      default: {
        const s = `${go(g.a, g.t)} ${ops[g.t]} ${go(g.b, g.t)}`;
        const chain = g.t === parentOp && (g.t === 'and' || g.t === 'or');
        return parentOp && !chain ? `(${s})` : s;
      }
    }
  };
  return go(f);
}

export const texF = (f: F) =>
  render(f, TEX_OP, '\\lnot ', (n) => (/^[a-z]$/.test(n) ? n : n.replace(/^([A-Z])\(/, '$1(')), ['\\top', '\\bot']);

/** Plain-text form in the syntax people type, used as the expected answer string. */
export const textF = (f: F) => render(f, TXT_OP, '¬', (n) => n, ['T', 'F']);
