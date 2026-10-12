import type { Chapter, Skill, Subject } from '../core/types';
import { calculus1Chapters } from './calc1';
import { calculus2Chapters } from './calc2';
import { multivariableChapters } from './calc3';
import { discreteChapters } from './discrete-more';
import { graphChapters } from './graphs-more';
import { linalgChapters } from './linalg-more';
import { logicChapters } from './logic';
import { numberTheoryChapters } from './numtheory-more';
import { probabilityChapters } from './prob';
import { proofsChapters } from './proofs-more';

export const SUBJECTS: Subject[] = [
  { id: 'calculus', name: 'Calculus I', blurb: 'Limits, continuity, derivatives and their applications', requires: [], chapters: calculus1Chapters },
  { id: 'calculus2', name: 'Calculus II', blurb: 'Integration, its applications, series, differential equations', requires: ['calculus'], chapters: calculus2Chapters },
  { id: 'multivar', name: 'Multivariable Calculus', blurb: 'Partial derivatives, multiple integrals, vector calculus', requires: ['calculus2'], chapters: multivariableChapters },
  { id: 'linalg', name: 'Linear Algebra', blurb: 'Vectors, matrices, eigenvalues', requires: [], chapters: linalgChapters },
  { id: 'logic', name: 'Logic', blurb: 'Connectives, equivalence, quantifiers, arguments', requires: [], chapters: logicChapters },
  { id: 'proofs', name: 'Proofs', blurb: 'Direct, contradiction, induction, sets and functions', requires: ['logic'], chapters: proofsChapters },
  { id: 'discrete', name: 'Discrete Math', blurb: 'Sets, counting, recurrences, Big-O', requires: ['proofs'], chapters: discreteChapters },
  { id: 'graphs', name: 'Graph Theory', blurb: 'Search, shortest paths, trees, colouring, flows', requires: ['discrete'], chapters: graphChapters },
  { id: 'numtheory', name: 'Number Theory', blurb: 'Primes, gcd, modular arithmetic, RSA', requires: ['discrete'], chapters: numberTheoryChapters },
  { id: 'prob', name: 'Probability & Statistics', blurb: 'Bayes, distributions, the normal curve, confidence intervals', requires: [], chapters: probabilityChapters },
];

export const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<string, Subject>;

export const CHAPTERS: Chapter[] = SUBJECTS.flatMap((s) => s.chapters);

/** Every skill in book order: each chapter's main sections, then its deeper ones. */
export const ALL_SKILLS: Skill[] = CHAPTERS.flatMap((c) => [...c.skills, ...c.deeper]);

export const SKILLS: Record<string, Skill> = Object.fromEntries(ALL_SKILLS.map((s) => [s.id, s]));

export const CHAPTER_BY_ID: Record<string, Chapter> = Object.fromEntries(CHAPTERS.map((c) => [c.id, c]));

export const CHAPTER_OF: Record<string, Chapter> = Object.fromEntries(
  CHAPTERS.flatMap((c) => [...c.skills, ...c.deeper].map((s) => [s.id, c])),
);

export const SUBJECT_OF_CHAPTER: Record<string, Subject> = Object.fromEntries(
  SUBJECTS.flatMap((s) => s.chapters.map((c) => [c.id, s])),
);

export const isDeeper = (skillId: string) => CHAPTER_OF[skillId].deeper.some((s) => s.id === skillId);

/** Chapter number within its subject, 1-based. */
export const chapterNumber = (c: Chapter) => SUBJECT_OF_CHAPTER[c.id].chapters.indexOf(c) + 1;
