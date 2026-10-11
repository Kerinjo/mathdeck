import { useEffect, useMemo, useState } from 'react';
import { dayKey, status, type Status } from '../core/scheduler';
import { useData } from '../core/store';
import { ALL_SKILLS, SKILLS, SUBJECTS } from '../content';
import { todaysQueue, when } from './Review';

interface Props {
  onReview(): void;
  onSkill(id: string): void;
}

export function Dashboard({ onReview, onSkill }: Props) {
  const data = useData();
  // Re-render every 30 s so retries that come due show up without a reload.
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const now = Date.now();
  const { due, fresh } = todaysQueue(now);
  const stats = useStats();

  const nextDue = Object.values(data.states)
    .map((s) => s.due)
    .filter((d) => d > now)
    .sort((a, b) => a - b)[0];
  const weak = ALL_SKILLS.filter((k) => (data.states[k.id]?.missStreak ?? 0) >= 2);

  return (
    <div className="dashboard">
      <section className="hero">
        {due.length + fresh.length > 0 ? (
          <>
            <div>
              <div className="hero-count">
                <b>{due.length}</b> due <span className="dot">·</span> <b>{fresh.length}</b> new
              </div>
              <div className="muted">Solve on paper, type the final answer.</div>
            </div>
            <button className="primary big" onClick={onReview}>
              Start review <kbd>⏎</kbd>
            </button>
          </>
        ) : (
          <div>
            <div className="hero-count">All caught up</div>
            <div className="muted">
              {nextDue ? `Next review ${when(nextDue - now)}.` : 'Nothing scheduled.'} You can practice any skill from the
              Skills page.
            </div>
          </div>
        )}
      </section>

      <section className="tiles">
        <Tile label="Reviews today" value={stats.today} />
        <Tile label="Accuracy, 30 days" value={stats.acc30 === null ? '–' : `${Math.round(stats.acc30 * 100)}%`} />
        <Tile label="Day streak" value={stats.streak} />
        <Tile
          label="Skills reliable"
          value={`${ALL_SKILLS.filter((k) => ['reliable', 'mastered'].includes(status(k, data.states))).length} / ${ALL_SKILLS.length}`}
        />
      </section>

      <Heatmap counts={stats.perDay} />

      {weak.length > 0 && (
        <section>
          <h3>Weak skills</h3>
          <p className="muted small">Missed several times in a row. Open one to read the summary and links.</p>
          <div className="chips">
            {weak.map((k) => (
              <button key={k.id} className="chip status-weak" onClick={() => onSkill(k.id)}>
                {k.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {SUBJECTS.map((subj) => (
        <section key={subj.id} className="skill-map">
          <h3>{subj.name}</h3>
          {[...new Set(subj.skills.map((k) => k.topic))].map((topic) => (
            <div key={topic} className="topic-row">
              <div className="topic-name">{topic}</div>
              <div className="chips">
                {subj.skills
                  .filter((k) => k.topic === topic)
                  .map((k) => {
                    const st = status(k, data.states);
                    const s = data.states[k.id];
                    return (
                      <button
                        key={k.id}
                        className={`chip status-${st}`}
                        onClick={() => onSkill(k.id)}
                        title={st === 'locked' ? `Needs: ${k.prereqs.map((p) => SKILLS[p].name).join(', ')}` : STATUS_LABEL[st]}
                      >
                        {k.name}
                        <Pips total={k.levels.length} level={s ? (s.mastered ? k.levels.length : s.level) : 0} />
                      </button>
                    );
                  })}
              </div>
            </div>
          ))}
        </section>
      ))}
      <Legend />
    </div>
  );
}

export const STATUS_LABEL: Record<Status, string> = {
  locked: 'Locked',
  available: 'Ready to start',
  learning: 'Learning',
  reliable: 'Reliable',
  mastered: 'Mastered',
};

function Legend() {
  return (
    <div className="legend">
      {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
        <span key={s}>
          <i className={`swatch status-${s}`} /> {STATUS_LABEL[s]}
        </span>
      ))}
      <span>
        <Pips total={3} level={1} /> levels done
      </span>
    </div>
  );
}

export function Pips({ total, level }: { total: number; level: number }) {
  return (
    <span className="pips" aria-label={`${level} of ${total} levels`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < level ? 'on' : ''} />
      ))}
    </span>
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
          <i key={d.key} className={`hm l${d.future ? 'x' : level(d.n)}`} title={`${d.key}: ${d.n} reviews`} />
        ))}
      </div>
    </section>
  );
}
