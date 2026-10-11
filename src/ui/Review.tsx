import { useState, type ReactNode } from 'react';
import { makeRng } from '../core/rng';
import { buildQueue, newIntroducedToday, newState, review, servedLevel } from '../core/scheduler';
import { getData, update } from '../core/store';
import type { Problem } from '../core/types';
import { ALL_SKILLS, SKILLS } from '../content';
import { Card } from './Card';

interface Item {
  uid: number;
  skillId: string;
  level: number;
  problem: Problem;
  fresh: boolean;
}

let uid = 0;
const RETRY_GAP = 3;
const SOON = 15 * 60 * 1000;

function makeItem(skillId: string, fresh = false): Item {
  const s = getData().states[skillId];
  const level = s ? servedLevel(s) : 0;
  const problem = SKILLS[skillId].levels[level].generate(makeRng());
  return { uid: ++uid, skillId, level, problem, fresh };
}

export function todaysQueue(now = Date.now()) {
  const { states, settings } = getData();
  return buildQueue(ALL_SKILLS, states, now, settings.newPerDay - newIntroducedToday(states, now));
}

export function Review({ onExit }: { onExit(): void }) {
  const [items, setItems] = useState<Item[]>(() => {
    const { due, fresh } = todaysQueue();
    return [...due.map((id) => makeItem(id)), ...fresh.map((id) => makeItem(id, true))];
  });
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [requeue, setRequeue] = useState(false);

  const current = items[0];

  if (!current) {
    return (
      <div className="card done-card">
        <h2>{done === 0 ? 'Nothing due right now' : 'Session complete'}</h2>
        {done > 0 && (
          <p>
            {right} / {done} correct.
          </p>
        )}
        <p className="muted">
          Missed skills come back in your next session; the rest are scheduled further out. Want more? Practice any skill
          from the Skills page without affecting the schedule.
        </p>
        <div className="actions">
          <button className="primary" onClick={onExit}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const skill = SKILLS[current.skillId];

  const onAnswered = (ok: boolean) => {
    const now = Date.now();
    const before = getData().states[skill.id] ?? newState(now);
    const after = review(before, skill, ok, now);
    update((d) => ({
      ...d,
      states: { ...d.states, [skill.id]: after },
      log: [...d.log, { t: now, skill: skill.id, level: current.level, ok }],
    }));
    setDone((n) => n + 1);
    if (ok) setRight((n) => n + 1);
    setRequeue(after.due <= now + SOON);
    setFeedback(describe(before, after, ok, now));
  };

  const onNext = () => {
    const rest = items.slice(1);
    if (requeue) rest.splice(Math.min(RETRY_GAP, rest.length), 0, makeItem(skill.id));
    setItems(rest);
    setFeedback(null);
    setRequeue(false);
  };

  function describe(before: ReturnType<typeof newState>, after: ReturnType<typeof newState>, ok: boolean, now: number) {
    if (!ok) {
      return (
        <>
          You'll get a fresh one in a few cards.
          {after.stepDown && ' It will be one level easier, to rebuild the basics.'}
          {after.missStreak >= 2 && ' This skill is now on your weak list; the links below are worth a look.'}
        </>
      );
    }
    if (after.mastered && !before.mastered) return <>Mastered! Reviews of this skill get rare now.</>;
    if (after.level > before.level)
      return (
        <>
          Level up → <b>Level {after.level + 1}: {skill.levels[after.level].name}</b>, starting tomorrow.
        </>
      );
    if (before.stepDown) return <>Good. Back to level {after.level + 1} next.</>;
    const streakNote =
      !after.mastered && after.streak > 0 ? ` · ${after.streak}/3 toward level ${after.level + 2 <= skill.levels.length ? after.level + 2 : 'mastery'}` : '';
    return (
      <>
        Next review {when(after.due - now)}
        {streakNote}.
      </>
    );
  }

  const total = done + items.length;
  return (
    <div className="review">
      <div className="progress">
        <div className="bar" style={{ width: `${(done / Math.max(1, total)) * 100}%` }} />
      </div>
      <div className="progress-meta">
        <span>{items.length} left</span>
        {current.fresh && <span className="badge new">new skill</span>}
        <button className="link" onClick={onExit}>
          End session
        </button>
      </div>
      <Card
        key={current.uid}
        skill={skill}
        level={current.level}
        problem={current.problem}
        onAnswered={onAnswered}
        onNext={onNext}
        feedback={feedback}
      />
    </div>
  );
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
