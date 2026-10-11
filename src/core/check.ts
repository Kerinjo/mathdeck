import { all, create, type MathNode } from 'mathjs';
import { makeRng } from './rng';
import type { Answer } from './types';

const math = create(all, {});

const FUNCS = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'log', 'log10', 'log2', 'sqrt', 'cbrt', 'exp', 'abs', 'nthRoot',
]);
const CONSTS = new Set(['pi', 'e', 'Infinity']);

/**
 * Turn what people naturally type into something mathjs parses:
 * "2xe^x" -> "2*x*e^x", "x(x+1)" -> "x*(x+1)", "ln" -> "log", trailing "+ C" dropped.
 */
export function normalize(input: string, vars: string[] = []): string {
  let s = input
    .trim()
    .replace(/[−–]/g, '-')
    .replace(/[·×⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/∞/g, 'Infinity')
    .replace(/√/g, 'sqrt')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\|([^|]+)\|/g, 'abs($1)');
  if (!vars.includes('c')) s = s.replace(/\+\s*[Cc]\s*$/, '');
  else s = s.replace(/\+\s*C\s*$/, '');
  s = s
    .replace(/\b(inf|infinity|oo)\b/gi, 'Infinity')
    .replace(/\bln\b/g, 'log')
    .replace(/\barc(sin|cos|tan)\b/g, 'a$1')
    .replace(/(\d)([A-Za-z])/g, '$1*$2');

  const atoms = [...vars, 'pi', 'e'];
  const decompose = (id: string): string[] | null => {
    if (id === '') return [];
    for (const a of atoms) {
      if (id.startsWith(a)) {
        const rest = decompose(id.slice(a.length));
        if (rest) return [a, ...rest];
      }
    }
    return null;
  };

  return s.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (m, offset: number, str: string) => {
    const known = FUNCS.has(m) || CONSTS.has(m) || vars.includes(m);
    const pieces = known ? [m] : (decompose(m) ?? [m]);
    let out = pieces.join('*');
    const after = str.slice(offset + m.length).trimStart();
    const last = pieces[pieces.length - 1];
    if (after.startsWith('(') && !FUNCS.has(last) && (CONSTS.has(last) || vars.includes(last))) {
      out += '*';
    }
    return out;
  });
}

export type Parsed = { ok: true; node: MathNode; tex: string } | { ok: false; error: string };

export function parse(input: string, vars: string[] = []): Parsed {
  if (!input.trim()) return { ok: false, error: 'Empty' };
  let node: MathNode;
  try {
    node = math.parse(normalize(input, vars));
  } catch (e) {
    return { ok: false, error: (e as Error).message.replace(/\(char \d+\)/, '').trim() };
  }
  let error: string | null = null;
  node.traverse((n, path, parent) => {
    if (error) return;
    if ((n as any).isSymbolNode) {
      const name = (n as any).name as string;
      if (parent && (parent as any).isFunctionNode && path === 'fn') {
        if (!FUNCS.has(name)) error = `Unknown function: ${name}`;
      } else if (!CONSTS.has(name) && !vars.includes(name)) {
        error = vars.length
          ? `Unknown symbol "${name}" (variables: ${vars.join(', ')})`
          : `Unknown symbol "${name}" (expected a number)`;
      }
    } else if (
      !(n as any).isOperatorNode &&
      !(n as any).isConstantNode &&
      !(n as any).isParenthesisNode &&
      !(n as any).isFunctionNode
    ) {
      error = 'Unsupported syntax';
    }
  });
  if (error) return { ok: false, error };
  return { ok: true, node, tex: toTex(node) };
}

export const toTex = (node: MathNode) =>
  node.toTex({ parenthesis: 'auto', implicit: 'hide' } as any);

/** Expected answers are always well-formed; render them for display. */
export function exprTex(expr: string, vars: string[] = []): string {
  const p = parse(expr, vars);
  return p.ok ? p.tex.replace(/\\frac\{-(\d+)\}\{(\d+)\}/g, '-\\frac{$1}{$2}') : expr;
}

type C = { re: number; im: number };

function evaluate(node: MathNode, scope: Record<string, number>): C | null {
  try {
    const v = node.compile().evaluate(scope);
    if (typeof v === 'number') return { re: v, im: 0 };
    if (v && typeof v === 'object' && 're' in v && 'im' in v) return { re: v.re, im: v.im };
    return null;
  } catch {
    return null;
  }
}

const finite = (c: C | null): c is C => !!c && Number.isFinite(c.re) && Number.isFinite(c.im);
const TOL = 1e-7;
const close = (a: number, b: number, scale: number) => Math.abs(a - b) <= TOL * Math.max(1, scale);
const closeC = (a: C, b: C, scale: number) => close(a.re, b.re, scale) && close(a.im, b.im, scale);
const mag = (c: C) => Math.hypot(c.re, c.im);

/** Fixed sample points so grading is deterministic. Positive range avoids ln/sqrt domain issues. */
const SAMPLES = (() => {
  const rng = makeRng(12345);
  return Array.from({ length: 16 }, () => Array.from({ length: 4 }, () => 0.35 + 2.3 * rng.next()));
})();

function sameExpr(user: MathNode, expected: MathNode, vars: string[], upToConstant: boolean) {
  let shift: C | null = null;
  let valid = 0;
  for (const pt of SAMPLES) {
    const scope = Object.fromEntries(vars.map((v, i) => [v, pt[i]]));
    const e = evaluate(expected, scope);
    if (!finite(e)) continue;
    const u = evaluate(user, scope);
    if (!finite(u)) return false;
    const scale = Math.max(mag(e), mag(u));
    if (upToConstant) {
      const d = { re: u.re - e.re, im: u.im - e.im };
      if (!shift) shift = d;
      else if (!closeC(d, shift, scale)) return false;
    } else if (!closeC(u, e, scale)) return false;
    valid++;
  }
  return valid >= 4;
}

function numberOf(input: string): { ok: true; v: C } | { ok: false; error: string } {
  const p = parse(input);
  if (!p.ok) return p;
  const v = evaluate(p.node, {});
  if (!v || Number.isNaN(v.re) || Number.isNaN(v.im)) return { ok: false, error: 'Not a number' };
  return { ok: true, v };
}

function sameNumber(u: C, e: C) {
  if (!Number.isFinite(e.re)) return u.re === e.re && u.im === 0;
  if (!finite(u)) return false;
  return closeC(u, e, Math.max(mag(u), mag(e)));
}

/** Split on commas that are not inside parentheses. */
export function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if ((ch === ',' || ch === ';') && depth === 0) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

export type Response = string | string[][] | number;
export type Verdict = { ok: boolean; error?: string };

/** Returns an error (not a verdict) when the response can't be read; the UI asks to fix it. */
export function check(answer: Answer, response: Response): Verdict {
  switch (answer.kind) {
    case 'expr': {
      const u = parse(response as string, answer.vars);
      if (!u.ok) return { ok: false, error: u.error };
      const e = parse(answer.expected, answer.vars);
      if (!e.ok) throw new Error(`bad expected answer: ${answer.expected}`);
      return { ok: sameExpr(u.node, e.node, answer.vars, !!answer.upToConstant) };
    }
    case 'number': {
      const u = numberOf(response as string);
      if (!u.ok) return { ok: false, error: u.error };
      const e = numberOf(answer.expected);
      if (!e.ok) throw new Error(`bad expected answer: ${answer.expected}`);
      return { ok: sameNumber(u.v, e.v) };
    }
    case 'list': {
      const raw = (response as string).trim().replace(/^[{[]|[}\]]$/g, '');
      const items = splitTopLevel(raw);
      if (items.length === 0) return { ok: false, error: 'Empty' };
      const us: C[] = [];
      for (const it of items) {
        const u = numberOf(it);
        if (!u.ok) return { ok: false, error: `"${it}": ${u.error}` };
        us.push(u.v);
      }
      const es = answer.expected.map((x) => {
        const e = numberOf(x);
        if (!e.ok) throw new Error(`bad expected answer: ${x}`);
        return e.v;
      });
      if (us.length !== es.length) return { ok: false };
      const left = [...us];
      for (const e of es) {
        const i = left.findIndex((u) => sameNumber(u, e));
        if (i < 0) return { ok: false };
        left.splice(i, 1);
      }
      return { ok: true };
    }
    case 'matrix':
    case 'direction': {
      const grid = response as string[][];
      const vals: C[][] = [];
      for (const row of grid) {
        const r: C[] = [];
        for (const cell of row) {
          if (!cell.trim()) return { ok: false, error: 'Fill in every cell' };
          const u = numberOf(cell);
          if (!u.ok) return { ok: false, error: `"${cell}": ${u.error}` };
          r.push(u.v);
        }
        vals.push(r);
      }
      if (answer.kind === 'matrix') {
        const ok = answer.expected.every((row, i) =>
          row.every((x, j) => {
            const e = numberOf(x);
            return e.ok && sameNumber(vals[i][j], e.v);
          }),
        );
        return { ok };
      }
      const e = answer.expected.map((x) => {
        const v = numberOf(x);
        return v.ok ? v.v.re : NaN;
      });
      const u = vals.map((r) => r[0].re);
      if (u.every((x) => Math.abs(x) < 1e-12)) return { ok: false, error: 'The zero vector is never a basis vector' };
      const k = e.reduce((best, x, i) => (Math.abs(x) > Math.abs(e[best]) ? i : best), 0);
      const lambda = u[k] / e[k];
      if (!Number.isFinite(lambda) || Math.abs(lambda) < 1e-12) return { ok: false };
      return { ok: e.every((x, i) => close(u[i], lambda * x, Math.max(Math.abs(u[i]), Math.abs(lambda * x)))) };
    }
    case 'choice':
      return { ok: response === answer.correct };
  }
}

/** TeX for the expected answer (choice answers are plain text instead). */
export function answerTex(answer: Answer): string {
  switch (answer.kind) {
    case 'expr':
      return answer.display ?? exprTex(answer.expected, answer.vars) + (answer.upToConstant ? ' + C' : '');
    case 'number':
      return answer.display ?? exprTex(answer.expected);
    case 'list':
      return answer.display ?? answer.expected.map((x) => exprTex(x)).join(',\\ ');
    case 'matrix':
      return `\\begin{bmatrix} ${answer.expected.map((r) => r.map((x) => exprTex(x)).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
    case 'direction':
      return `t\\begin{bmatrix} ${answer.expected.map((x) => exprTex(x)).join(' \\\\ ')} \\end{bmatrix},\\ t \\neq 0`;
    case 'choice':
      return answer.options[answer.correct];
  }
}
