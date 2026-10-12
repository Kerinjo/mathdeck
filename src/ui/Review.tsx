import { useState, type ReactNode } from 'react';
import { CHAPTER_OF, SKILLS, ALL_SKILLS } from '../content';
import { isActive, recordAnswer } from '../core/actions';
import { makeRng } from '../core/rng';
import { reviewQueue, servedLevel } from '../core/scheduler';
import { getData } from '../core/store';
import type { Problem } from '../core/types';
import { Card } from './Card';
import { describeAnswer } from './common';

interface Item {
  uid: number;
  skillId: string;
  level: number;
  problem: Problem;
}

let uid = 0;
const RETRY_GAP = 3;
const SOON = 15 * 60 * 1000;

function makeItem(skillId: string): Item {
  const s = getData().states[skillId];
  const level = s ? servedLevel(s) : 0;
  return { uid: ++uid, skillId, level, problem: SKILLS[skillId].levels[level].generate(makeRng()) };
}

/** Due skills across every chapter, weakest first, interleaved by chapter. */
export function dueQueue(now = Date.now()) {
  const d = getData();
  const ids = ALL_SKILLS.map((s) => s.id).filter((id) => isActive(id, d));
  return reviewQueue(ids, (id) => CHAPTER_OF[id].id, d.states, now, d.settings.reviewCap);
}

/** Mixed review. Not resumable on purpose: it's rebuilt from what's due each time. */
export function Review({ onExit }: { onExit(): void }) {
  const [items, setItems] = useState<Item[]>(() => dueQueue().map(makeItem));
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [feedback, setFeedback] = useState<ReactNode>(null);
  const [requeue, setRequeue] = useState(false);

  const current = items[0];

  if (!current) {
    return (
      <div className="card done-card">
        <h2>{done === 0 ? 'Nothing due right now' : 'Review complete'}</h2>
        {done > 0 && (
          <p>
            {right} / {done} correct.
          </p>
        )}
        <p className="muted">
          Missed problems come back soon; easy ones are pushed further out. To learn something new, open a chapter and
          study it.
        </p>
        <div className="actions">
          <button className="primary" onClick={onExit}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const onAnswered = (ok: boolean) => {
    const now = Date.now();
    const { before, after } = recordAnswer(current.skillId, current.level, ok, now);
    setDone((n) => n + 1);
    if (ok) setRight((n) => n + 1);
    setRequeue(after.due <= now + SOON);
    setFeedback(describeAnswer(current.skillId, before, after, ok, now));
  };

  const onNext = () => {
    const rest = items.slice(1);
    if (requeue) rest.splice(Math.min(RETRY_GAP, rest.length), 0, makeItem(current.skillId));
    setItems(rest);
    setFeedback(null);
    setRequeue(false);
  };

  const total = done + items.length;
  return (
    <div className="review">
      <div className="progress">
        <div className="bar" style={{ width: `${(done / Math.max(1, total)) * 100}%` }} />
      </div>
      <div className="progress-meta">
        <span className="badge">review · mixed</span>
        <span>{items.length} left</span>
        <button className="link" onClick={onExit}>
          End review
        </button>
      </div>
      <Card
        key={current.uid}
        skill={SKILLS[current.skillId]}
        level={current.level}
        problem={current.problem}
        onAnswered={onAnswered}
        onNext={onNext}
        feedback={feedback}
      />
    </div>
  );
}
