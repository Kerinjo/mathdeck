// Operations shared by the study, review and chapter screens.
import { CHAPTER_BY_ID, CHAPTER_OF, isDeeper, SKILLS } from '../content';
import { newState, review, type SkillState } from './scheduler';
import { getData, update, type Data } from './store';

/** Skills a session key covers, in book order. Deeper sections count only when switched on. */
export function scopeOf(key: string, d: Data = getData()): string[] {
  const [kind, id] = key.split(/:(.*)/s);
  if (kind === 'skill') return [id];
  const ch = CHAPTER_BY_ID[id];
  return [...ch.skills.map((s) => s.id), ...ch.deeper.filter((s) => d.deeper[s.id]).map((s) => s.id)];
}

/** Skills that take part in reviews: every started main section, plus deeper ones that are switched on. */
export const isActive = (id: string, d: Data = getData()) => !isDeeper(id) || !!d.deeper[id];

export function recordAnswer(skillId: string, level: number, ok: boolean, now = Date.now()) {
  const before = getData().states[skillId] ?? newState(now);
  const after = review(before, SKILLS[skillId], ok, now);
  update((d) => ({
    ...d,
    states: { ...d.states, [skillId]: after },
    log: [...d.log, { t: now, skill: skillId, level, ok }],
  }));
  return { before, after };
}

export function setDeeper(skillId: string, on: boolean) {
  update((d) => ({ ...d, deeper: { ...d.deeper, [skillId]: on } }));
}

/** "I already know this": counts as cleared, tested at the top level in 3 days. */
export function markKnown(skillIds: string[], now = Date.now()) {
  update((d) => {
    const states = { ...d.states };
    for (const id of skillIds) {
      if (states[id]?.cleared) continue;
      const top = SKILLS[id].levels.length - 1;
      states[id] = { ...newState(now), level: top, cleared: true, interval: 3, due: now + 3 * 86_400_000 } as SkillState;
    }
    return { ...d, states };
  });
}

export function resetSkill(skillId: string) {
  update((d) => {
    const states = { ...d.states };
    delete states[skillId];
    return { ...d, states };
  });
}

export function dropSession(key: string) {
  update((d) => {
    const sessions = { ...d.sessions };
    delete sessions[key];
    return { ...d, sessions };
  });
}

export const sessionTitle = (key: string) => {
  const [kind, id] = key.split(/:(.*)/s);
  return kind === 'skill' ? SKILLS[id].name : CHAPTER_BY_ID[id].title;
};

export const chapterOfKey = (key: string) => {
  const [kind, id] = key.split(/:(.*)/s);
  return kind === 'skill' ? CHAPTER_OF[id] : CHAPTER_BY_ID[id];
};
