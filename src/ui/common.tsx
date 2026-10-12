import type { ReactNode } from 'react';
import { CHAPTER_OF, SKILLS } from '../content';
import { levelsDone, type Rating, type SkillState, type Status } from '../core/scheduler';
import type { Chapter, Subject } from '../core/types';

export const STATUS_LABEL: Record<Status, string> = {
  new: 'Not started',
  learning: 'Learning',
  cleared: 'Cleared',
  mastered: 'Mastered',
};

export function Pips({ total, level }: { total: number; level: number }) {
  return (
    <span className="pips" aria-label={`${level} of ${total} levels`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < level ? 'on' : ''} />
      ))}
    </span>
  );
}

export function Bar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`pbar ${className}`}>
      <div style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </div>
  );
}

/** How far through a section you are: clearing it is the first step, then each level. */
export function sectionProgress(id: string, s: SkillState | undefined) {
  const total = SKILLS[id].levels.length;
  if (!s) return 0;
  if (s.mastered) return 1;
  return ((s.cleared ? 1 : 0) + levelsDone(s, total)) / (total + 1);
}

export function chapterProgress(ch: Chapter, states: Record<string, SkillState>) {
  const ids = ch.skills.map((s) => s.id);
  return {
    cleared: ids.filter((id) => states[id]?.cleared).length,
    total: ids.length,
    value: ids.reduce((a, id) => a + sectionProgress(id, states[id]), 0) / ids.length,
  };
}

export function subjectProgress(subject: Subject, states: Record<string, SkillState>) {
  const ids = subject.chapters.flatMap((c) => c.skills.map((s) => s.id));
  return ids.length ? ids.reduce((a, id) => a + sectionProgress(id, states[id]), 0) / ids.length : 0;
}

/** The first chapter (in book order) with a main section not yet cleared. */
export function currentChapter(subject: Subject, states: Record<string, SkillState>): Chapter | null {
  return subject.chapters.find((c) => c.skills.some((s) => !states[s.id]?.cleared)) ?? null;
}

export function when(ms: number) {
  const h = ms / 3_600_000;
  if (h < 1) return 'in a few minutes';
  if (h < 30) return 'tomorrow';
  const d = Math.round(h / 24);
  if (d < 14) return `in ${d} days`;
  if (d < 60) return `in ${Math.round(d / 7)} weeks`;
  return `in ${Math.round(d / 30)} months`;
}

/** One-line feedback after an answer: what changed and what happens next. */
export function describeAnswer(skillId: string, before: SkillState, after: SkillState, rating: Rating, now: number): ReactNode {
  const skill = SKILLS[skillId];
  const name = <b>{skill.name}</b>;
  if (rating === 'hinted' && !(after.cleared && !before.cleared))
    return (
      <>
        {name}: solved with a hint. Half credit toward clearing{after.cleared ? '' : ` (${after.run}/3)`}; it comes back tomorrow.
      </>
    );
  if (rating === 'slip') return <>{name}: slip noted. No progress lost; it comes back {when(after.due - now)}.</>;
  if (rating === 'again') {
    return (
      <>
        {name} will come back soon with a fresh problem.
        {after.stepDown && ' One level easier first, to rebuild the basics.'}
        {after.missStreak >= 2 && " If it keeps happening, the section's 📖 Intro is worth a look."}
      </>
    );
  }
  if (after.cleared && !before.cleared) {
    const ch = CHAPTER_OF[skillId];
    const order = ch.skills.map((s) => s.id);
    const next = order[order.indexOf(skillId) + 1];
    return (
      <>
        <b>Section cleared ✓ {skill.name}.</b>
        {next ? ` Next up: ${SKILLS[next].name}.` : ' That was the last main section of this chapter.'}
      </>
    );
  }
  if (after.mastered && !before.mastered) return <>{name} mastered! Reviews get rare now.</>;
  if (after.level > before.level)
    return (
      <>
        {name}: level up → <b>Level {after.level + 1}: {skill.levels[after.level].name}</b>, from tomorrow.
      </>
    );
  if (before.stepDown) return <>{name}: rebuilt. Back to level {after.level + 1} next.</>;
  if (!after.cleared) return <>{name}: {after.run}/3 in a row to clear this section.</>;
  return <>{name}: next review {when(after.due - now)}.</>;
}
