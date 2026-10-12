import { useEffect, useMemo, useState } from 'react';
import { CHAPTER_OF, chapterNumber, SKILLS, SUBJECT_OF_CHAPTER, SUBJECTS } from '../content';
import { chapterOfKey, isActive, sessionTitle } from '../core/actions';
import { dayKey } from '../core/scheduler';
import { useData } from '../core/store';
import { Bar, chapterProgress, currentChapter, when } from './common';
import { dueQueue } from './Review';

interface Props {
  onReview(): void;
  onStudy(key: string): void;
  onChapter(id: string, focus?: string): void;
}

export function Dashboard({ onReview, onStudy, onChapter }: Props) {
  const data = useData();
  // Re-render every 30 s so retries that come due show up without a reload.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const now = Date.now();
  const due = dueQueue(now);
  const stats = useStats();

  const nextDue = Object.entries(data.states)
    .filter(([id]) => isActive(id, data))
    .map(([, s]) => s.due)
    .filter((d) => d > now)
    .sort((a, b) => a - b)[0];
  const weak = Object.keys(data.states).filter((id) => data.states[id].missStreak >= 2 && isActive(id, data));

  // Continue: the most recent unfinished session, else the current chapter of your most recent subject.
  const saved = Object.values(data.sessions).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const lastSkill = data.log[data.log.length - 1]?.skill;
  const subject = lastSkill && SKILLS[lastSkill] ? SUBJECT_OF_CHAPTER[CHAPTER_OF[lastSkill].id] : SUBJECTS[0];
  const next = currentChapter(subject, data.states);

  const mainIds = SUBJECTS.flatMap((s) => s.chapters.flatMap((c) => c.skills.map((k) => k.id)));

  return (
    <div className="dashboard">
      <section className="hero-grid">
        <div className="hero">
          <div className="hero-label">Review</div>
          {due.length > 0 ? (
            <>
              <div className="hero-count">
                <b>{due.length}</b> due
              </div>
              <div className="muted small">Mixed from every chapter, weakest first.</div>
              <button className="primary big" onClick={onReview}>
                Start review
              </button>
            </>
          ) : (
            <>
              <div className="hero-count">All caught up</div>
              <div className="muted small">{nextDue ? `Next review ${when(nextDue - now)}.` : 'Study a chapter to fill your reviews.'}</div>
            </>
          )}
        </div>
        <div className="hero">
          <div className="hero-label">Study</div>
          {saved ? (
            <>
              <div className="hero-count">{sessionTitle(saved.key)}</div>
              <div className="muted small">
                Paused at {saved.answered} / {saved.target} · {SUBJECT_OF_CHAPTER[chapterOfKey(saved.key).id].name}
              </div>
              <button className="primary big" onClick={() => onStudy(saved.key)}>
                Resume
              </button>
            </>
          ) : next ? (
            <>
              <div className="hero-count">
                {chapterNumber(next)}. {next.title}
              </div>
              <div className="muted small">
                {subject.name} · {chapterProgress(next, data.states).cleared} / {next.skills.length} sections cleared
              </div>
              <button className="primary big" onClick={() => onStudy(`chapter:${next.id}`)}>
                {chapterProgress(next, data.states).cleared === 0 && !next.skills.some((s) => data.states[s.id]) ? 'Start' : 'Continue'}
              </button>
            </>
          ) : (
            <div className="hero-count">{subject.name} done!</div>
          )}
        </div>
      </section>

      <section className="tiles">
        <Tile label="Answers today" value={stats.today} />
        <Tile label="Accuracy, 30 days" value={stats.acc30 === null ? '–' : `${Math.round(stats.acc30 * 100)}%`} />
        <Tile label="Day streak" value={stats.streak} />
        <Tile label="Sections cleared" value={`${mainIds.filter((id) => data.states[id]?.cleared).length} / ${mainIds.length}`} />
      </section>

      <Heatmap counts={stats.perDay} />

      {weak.length > 0 && (
        <section>
          <h3>Struggling with</h3>
          <p className="muted small">Missed several times in a row. They come up more often until they stick.</p>
          <div className="chips">
            {weak.map((id) => (
              <button key={id} className="chip status-weak" onClick={() => onChapter(CHAPTER_OF[id].id, id)}>
                {SKILLS[id].name}
              </button>
            ))}
          </div>
        </section>
      )}

      {SUBJECTS.map((subj) => {
        const cur = currentChapter(subj, data.states);
        return (
          <section key={subj.id}>
            <h3>{subj.name}</h3>
            <div className="chapter-list compact">
              {subj.chapters.map((c) => {
                const p = chapterProgress(c, data.states);
                return (
                  <button key={c.id} className={`chapter-row ${c === cur ? 'current' : ''}`} onClick={() => onChapter(c.id)}>
                    <span className="ch-num">{chapterNumber(c)}</span>
                    <span className="ch-title">
                      {c.title} {data.sessions[`chapter:${c.id}`] && <span className="badge">paused</span>}
                    </span>
                    <span className="muted small ch-count">
                      {p.cleared}/{p.total}
                    </span>
                    <Bar value={p.value} />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}


function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="tile">
      <div className="tile-value">{value}</div>
      <div className="tile-label">{label}</div>
    </div>
  );
}

function useStats() {
  const { log } = useData();
  return useMemo(() => {
    const now = Date.now();
    const perDay = new Map<string, number>();
    for (const e of log) perDay.set(dayKey(e.t), (perDay.get(dayKey(e.t)) ?? 0) + 1);
    const recent = log.filter((e) => e.t > now - 30 * 86_400_000);
    let streak = 0;
    const d = new Date(now);
    if (!perDay.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
    while (perDay.has(dayKey(d.getTime()))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return {
      perDay,
      today: perDay.get(dayKey(now)) ?? 0,
      acc30: recent.length ? recent.filter((e) => e.ok).length / recent.length : null,
      streak,
    };
  }, [log]);
}

function Heatmap({ counts }: { counts: Map<string, number> }) {
  const weeks = 52;
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - end.getDay() - (weeks - 1) * 7);
  const days: { key: string; n: number; future: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({ key: dayKey(d.getTime()), n: counts.get(dayKey(d.getTime())) ?? 0, future: d > end });
  }
  const level = (n: number) => (n === 0 ? 0 : n < 5 ? 1 : n < 12 ? 2 : n < 25 ? 3 : 4);
  return (
    <section className="heatmap-wrap">
      <div className="heatmap">
        {days.map((d) => (
          <i key={d.key} className={`hm l${d.future ? 'x' : level(d.n)}`} title={`${d.key}: ${d.n} answers`} />
        ))}
      </div>
    </section>
  );
}
