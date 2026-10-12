import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SKILLS } from '../content';
import { dropSession, recordAnswer, scopeOf, sessionTitle } from '../core/actions';
import { makeRng } from '../core/rng';
import { newSession, pickNext, recordAnswer as recordInSession, type SessionState } from '../core/session';
import type { Rating } from '../core/scheduler';
import { getData, update, useData } from '../core/store';
import { Card } from './Card';
import { describeAnswer } from './common';

const seed = () => Math.floor(Math.random() * 2 ** 32);

function save(s: SessionState) {
  update((d) => ({ ...d, sessions: { ...d.sessions, [s.key]: s } }));
}

/** Pick the next problem, using the freshest progress. */
function advance(s: SessionState) {
  const d = getData();
  save(pickNext(s, scopeOf(s.key, d), d.states, Date.now(), seed()));
}

/** Done once the target is reached and the last answer has been seen (Next clears `current`). */
const isComplete = (s: SessionState) => s.answered >= s.target && !s.current;

/** After an answer: move to the next problem, or finish if the target is reached. */
function proceed(s: SessionState) {
  if (s.answered >= s.target) save({ ...s, current: null, updatedAt: Date.now() });
  else advance(s);
}

/** Study one chapter or one section. Saved after every answer; leaving and coming back resumes it. */
export function Session({ sessionKey, onExit }: { sessionKey: string; onExit(): void }) {
  const data = useData();
  const s = data.sessions[sessionKey];
  const [feedback, setFeedback] = useState<ReactNode>(null);

  useEffect(() => {
    const cur = getData().sessions[sessionKey];
    if (!cur) advance(newSession(sessionKey, getData().settings.sessionLength, Date.now()));
    else if (cur.current?.answered) proceed(cur);
    else if (!cur.current && !isComplete(cur)) advance(cur);
  }, [sessionKey]);

  const item = s?.current;
  const problem = useMemo(
    () => (item ? SKILLS[item.skillId].levels[item.level].generate(makeRng(item.seed)) : null),
    [item?.skillId, item?.level, item?.seed],
  );

  if (!s) return null;

  const quit = () => {
    if (s.answered === 0) dropSession(sessionKey);
    onExit();
  };

  if (isComplete(s)) {
    return (
      <div className="card done-card">
        <h2>Session complete</h2>
        <p>
          {s.right} / {s.answered} solved.
        </p>
        {s.cleared.length > 0 && (
          <p>
            Sections cleared: <b>{s.cleared.map((id) => SKILLS[id].name).join(', ')}</b>.
          </p>
        )}
        <p className="muted">Everything you answered is in your review schedule now.</p>
        <div className="actions">
          <button
            className="ghost"
            onClick={() => {
              dropSession(sessionKey);
              onExit();
            }}
          >
            Finish
          </button>
          <button
            className="primary"
            onClick={() => advance({ ...s, target: s.target + getData().settings.sessionLength })}
          >
            Keep going (+{data.settings.sessionLength})
          </button>
        </div>
      </div>
    );
  }

  if (!item || !problem) return null;

  const onRated = (rating: Rating) => {
    const now = Date.now();
    const { before, after } = recordAnswer(item.skillId, item.level, rating, now);
    const latest = getData().sessions[sessionKey];
    setFeedback(describeAnswer(item.skillId, before, after, rating, now));
    proceed(recordInSession(latest, rating, after.cleared && !before.cleared, now));
  };

  return (
    <div className="review">
      <div className="progress">
        <div className="bar" style={{ width: `${(s.answered / s.target) * 100}%` }} />
      </div>
      <div className="progress-meta">
        <span className="badge">study · {sessionTitle(sessionKey)}</span>
        <span>
          {Math.min(s.answered + (item.answered ? 0 : 1), s.target)} / {s.target}
        </span>
        {item.fresh && <span className="badge new">new section</span>}
        {item.kind === 'due' && <span className="badge">review</span>}
        <button className="link" onClick={quit} title="Your place is saved">
          Pause
        </button>
      </div>
      <Card
        key={`${sessionKey}-${item.skillId}-${item.seed}`}
        skill={SKILLS[item.skillId]}
        level={item.level}
        problem={problem}
        onRated={onRated}
        banner={feedback}
      />
    </div>
  );
}
