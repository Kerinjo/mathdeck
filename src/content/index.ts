import type { Skill, Subject } from '../core/types';
import { calculusSkills } from './calculus';
import { linalgSkills } from './linalg';

export const SUBJECTS: Subject[] = [
  { id: 'calculus', name: 'Calculus', skills: calculusSkills },
  { id: 'linalg', name: 'Linear Algebra', skills: linalgSkills },
];

export const ALL_SKILLS: Skill[] = SUBJECTS.flatMap((s) => s.skills);

export const SKILLS: Record<string, Skill> = Object.fromEntries(ALL_SKILLS.map((s) => [s.id, s]));
