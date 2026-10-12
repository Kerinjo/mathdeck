import type { Chapter, Skill, Subject } from '../core/types';
import { calculusChapters } from './calculus';
import { linalgChapters } from './linalg';
import { logicChapters } from './logic';

export const SUBJECTS: Subject[] = [
  { id: 'calculus', name: 'Calculus', blurb: 'Limits, derivatives, integrals, series', requires: [], chapters: calculusChapters },
  { id: 'linalg', name: 'Linear Algebra', blurb: 'Vectors, matrices, eigenvalues', requires: [], chapters: linalgChapters },
  { id: 'logic', name: 'Logic', blurb: 'Connectives, equivalence, quantifiers, arguments', requires: [], chapters: logicChapters },
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
