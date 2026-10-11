import { useEffect, useState } from 'react';
import { makeRng } from '../core/rng';
import { newState, status, STREAK_TO_LEVEL_UP } from '../core/scheduler';
import { update, useData } from '../core/store';
import type { Skill } from '../core/types';
import { SKILLS, SUBJECTS } from '../content';
import { Card, LearnPanel } from './Card';
import { Pips, STATUS_LABEL } from './Dashboard';
import { when } from './Review';

export function Skills({ focus, onPractice }: { focus?: string; onPractice(id: string, level: number): void }) {
  const [open, setOpen] = useState<string | null>(focus ?? null);
  useEffect(() => {
    if (focus) document.getElementById(focus)?.scrollIntoView({ block: 'center' });
  }, [focus]);

  return (
    <div className="skills">
      {SUBJECTS.map((subj) => (
        <section key={subj.id}>
          <h2>{subj.name}</h2>
          {subj.skills.map((k) => (
            <SkillRow key={k.id} skill={k} open={open === k.id} onToggle={() => setOpen(open === k.id ? null : k.id)} onPractice={onPractice} />
          ))}
        </section>
      ))}
    </div>
  );
}

function SkillRow({ skill, open, onToggle, onPractice }: { skill: Skill; open: boolean; onToggle(): void; onPractice(id: string, level: number): void }) {
  const { states } = useData();
  const s = states[skill.id];
  const st = status(skill, states);
  const now = Date.now();

  const start = () => update((d) => ({ ...d, states: { ...d.states, [skill.id]: newState(now) } }));
  const known = () =>
    update((d) => ({
      ...d,
      states: {
        ...d.states,
        [skill.id]: { ...newState(now), level: skill.levels.length - 1, interval: 3, due: now + 3 * 86_400_000 },
      },
    }));
  const forget = () =>
    update((d) => {
      const states = { ...d.states };
      delete states[skill.id];
      return { ...d, states };
    });

  return (
    <div id={skill.id} className={`skill-row ${open ? 'open' : ''}`}>
      <button className="skill-row-head" onClick={onToggle}>
        <i className={`swatch status-${st}`} />
        <span className="skill-name">{skill.name}</span>
        <span className="muted small topic">{skill.topic}</span>
        <Pips total={skill.levels.length} level={s ? (s.mastered ? skill.levels.length : s.level) : 0} />
        <span className="muted small status-text">
          {STATUS_LABEL[st]}
          {s && ` · ${s.due <= now ? 'due now' : `due ${when(s.due - now)}`}`}
        </span>
      </button>
      {open && (
        <div className="skill-row-body">
          <div className="levels">
            {skill.levels.map((l, i) => (
              <div key={i} className={`level ${s && (s.mastered || i < s.level) ? 'done' : s && i === s.level ? 'current' : ''}`}>
                <span>
                  <b>Level {i + 1}</b> · {l.name}
                  {s && i === s.level && !s.mastered && <span className="muted small"> · {s.streak}/{STREAK_TO_LEVEL_UP} days in a row</span>}
                </span>
                <button className="ghost small" onClick={() => onPractice(skill.id, i)}>
                  Practice
                </button>
              </div>
            ))}
          </div>
          {s && (
            <div className="muted small">
              {s.correct}/{s.attempts} correct overall{s.missStreak >= 2 ? ` · missed ${s.missStreak} in a row` : ''}
            </div>
          )}
          <LearnPanel skill={skill} />
          <div className="actions left">
            {!s && (
              <>
                <button className="primary small" onClick={start}>
                  Start learning now
                </button>
                <button className="ghost small" onClick={known} title="Counts as reliable; you'll be tested on the top level in 3 days">
                  I already know this
                </button>
              </>
            )}
            {s && (
              <button className="ghost small danger" onClick={() => confirm(`Reset progress on “${skill.name}”?`) && forget()}>
                Reset progress
              </button>
            )}
          </div>
          {!s && st === 'locked' && (
            <div className="muted small">
              Unlocks automatically when {skill.prereqs.map((p) => SKILLS[p].name).join(' and ')} {skill.prereqs.length > 1 ? 'are' : 'is'} reliable,
              or start it now.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Unscheduled drilling: answers here never touch the review schedule. */
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
        <span className="badge">practice · not scheduled</span>
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
        onAnswered={(ok) => setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }))}
        onNext={() => next()}
      />
    </div>
  );
}
