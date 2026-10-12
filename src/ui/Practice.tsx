import { useState } from 'react';
import { SKILLS } from '../content';
import { makeRng } from '../core/rng';
import { solved } from '../core/scheduler';
import { Card } from './Card';

/** Unscheduled drilling: answers here never touch progress or the review schedule. */
export function Practice({ skillId, level, onExit }: { skillId: string; level: number; onExit(): void }) {
  const skill = SKILLS[skillId];
  const [lvl, setLvl] = useState(level);
  const [n, setN] = useState(0);
  const [problem, setProblem] = useState(() => skill.levels[level].generate(makeRng()));
  const [score, setScore] = useState({ right: 0, total: 0 });

  const next = (l = lvl) => {
    setProblem(skill.levels[l].generate(makeRng()));
    setN((x) => x + 1);
  };

  return (
    <div className="review">
      <div className="progress-meta">
        <span className="badge">practice · not counted</span>
        <span className="level-picker">
          {skill.levels.map((l, i) => (
            <button
              key={i}
              className={`ghost small ${i === lvl ? 'active' : ''}`}
              title={l.name}
              onClick={() => {
                setLvl(i);
                next(i);
              }}
            >
              L{i + 1}
            </button>
          ))}
        </span>
        <span className="muted small">
          {score.right}/{score.total}
        </span>
        <button className="link" onClick={onExit}>
          Done
        </button>
      </div>
      <Card
        key={n}
        skill={skill}
        level={lvl}
        problem={problem}
        onRated={(r) => setScore((s) => ({ right: s.right + (solved(r) ? 1 : 0), total: s.total + 1 }))}
        onNext={() => next()}
      />
    </div>
  );
}
