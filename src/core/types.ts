// Text fields (prompt, solution steps, summaries) are plain text with inline
// TeX in $...$ and display TeX in $$...$$.

export type Answer =
  /** Expression in `vars`, compared numerically at random points. */
  | { kind: 'expr'; expected: string; vars: string[]; upToConstant?: boolean; display?: string }
  /** A single number; `expected` is a mathjs expression like "3/8" or "sqrt(2)". */
  | { kind: 'number'; expected: string; display?: string }
  /** Comma-separated numbers, order ignored (e.g. eigenvalues, roots). */
  | { kind: 'list'; expected: string[]; display?: string }
  /** Matrix (or column vector) entered in a grid. */
  | { kind: 'matrix'; expected: string[][] }
  /** Column vector, any non-zero multiple of `expected` is accepted. */
  | { kind: 'direction'; expected: string[] }
  | { kind: 'choice'; options: string[]; correct: number }
  /**
   * Propositional formula over `vars`, accepted if logically equivalent to `expected`.
   * `form` additionally requires a shape: no → / ↔, negation normal form, DNF or CNF.
   */
  | { kind: 'formula'; expected: string; vars: string[]; form?: 'noimp' | 'nnf' | 'dnf' | 'cnf' }
  /** No answer box: show the model solution, then you rate yourself (proofs). */
  | { kind: 'self' };

export interface Problem {
  prompt: string;
  answer: Answer;
  /** Worked solution, one step per entry. */
  solution: string[];
  /** Optional input hint shown under the answer box, e.g. "Enter a fraction". */
  inputHint?: string;
  /** Independent verification of the generator, used by tests only. */
  selfCheck?: () => boolean;
}

export type Rng = {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [lo, hi], inclusive. */
  int(lo: number, hi: number): number;
  /** Non-zero integer in [lo, hi]. */
  nz(lo: number, hi: number): number;
  pick<T>(xs: readonly T[]): T;
  sign(): 1 | -1;
  shuffle<T>(xs: T[]): T[];
};

export interface Level {
  /** Short description of what this level adds, e.g. "repeated parts". */
  name: string;
  generate(rng: Rng): Problem;
}

export interface Resource {
  kind: 'video' | 'article' | 'book' | 'interactive';
  title: string;
  url: string;
  note?: string;
}

export interface Skill {
  id: string;
  name: string;
  /** Skills this one builds on. Only used for hints; nothing is ever locked. */
  prereqs: string[];
  levels: Level[];
  /** Optional section intro: summary plus links. */
  learn: { summary: string; resources: Resource[] };
}

export interface Chapter {
  id: string;
  title: string;
  /** What the chapter covers (mixed text). */
  about: string;
  /** Why it matters. */
  why: string;
  resources: Resource[];
  /** Main sections, in book order. */
  skills: Skill[];
  /** Optional "going deeper" sections: opt-in, never required. */
  deeper: Skill[];
}

export type SubjectId = 'calculus' | 'linalg' | 'logic' | 'proofs' | 'discrete' | 'graphs' | 'numtheory';

export interface Subject {
  id: SubjectId;
  name: string;
  /** One line for the subject map. */
  blurb: string;
  /** Subjects this one builds on (arrows on the subject map). */
  requires: SubjectId[];
  chapters: Chapter[];
}
