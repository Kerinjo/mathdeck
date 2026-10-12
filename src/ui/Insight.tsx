import { useState } from 'react';
import { CHAPTER_OF, chapterNumber, SKILLS, SUBJECT_OF_CHAPTER } from '../content';
import { isActive } from '../core/actions';
import { ratingOf, sectionHistory, weakSpots, type WeakSpot } from '../core/insight';
import type { Rating } from '../core/scheduler';
import { useData } from '../core/store';

export const RATING_LABEL: Record<Rating, string> = {
  again: "didn't know how",
  slip: 'slip',
  hinted: 'with a hint',
  hard: 'hard',
  good: 'good',
  easy: 'easy',
};
const ORDER: Rating[] = ['again', 'slip', 'hinted', 'hard', 'good', 'easy'];

const why = (w: WeakSpot) => {
  const n = `${w.count} of the last ${w.of}`;
  switch (w.reason) {
    case 'again':
      return `Didn't know how ${n}`;
    case 'hinted':
      return `Needed a hint ${n}`;
    case 'slip':
      return `Slipped ${n}: the method is there, watch the details`;
    case 'hard':
      return `Felt hard ${n}`;
  }
};

const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const ago = (ms: number) => {
  const d = Math.floor(ms / 86_400_000);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

const SHOWN = 5;

export function WeakSpots({ onOpen, onStudy }: { onOpen(skillId: string): void; onStudy(key: string): void }) {
  const data = useData();
  const [all, setAll] = useState(false);
  const spots = weakSpots(data.log, data.states, (id) => isActive(id, data));
  if (spots.length === 0) return null;
  return (
    <section>
      <h3>Weak spots</h3>
      <p className="muted small">From your recent answers, latest counting most. Slips weigh little; they fade out as you get them right.</p>
      <div className="weak-list">
        {(all ? spots : spots.slice(0, SHOWN)).map((w) => {
          const ch = CHAPTER_OF[w.skill];
          return (
            <div key={w.skill} className={`weak-row r-${w.reason}`}>
              <span className="weak-meter" title={`${Math.round(w.score * 100)}% trouble, recency-weighted`}>
                <i style={{ height: `${Math.round(w.score * 100)}%` }} />
              </span>
              <div className="weak-main">
                <button className="link weak-name" onClick={() => onOpen(w.skill)}>
                  {SKILLS[w.skill].name}
                </button>
                <span className="muted small">
                  {SUBJECT_OF_CHAPTER[ch.id].name} · {chapterNumber(ch)}. {ch.title}
                </span>
                <span className="weak-why small">{why(w)}</span>
              </div>
              <button className="ghost small" onClick={() => onStudy(`skill:${w.skill}`)}>
                Study
              </button>
            </div>
          );
        })}
      </div>
      {spots.length > SHOWN && (
        <button className="link small" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${spots.length}`}
        </button>
      )}
    </section>
  );
}

/** Every answer to one section as a strip of marks, grouped by day, plus a summary. */
export function History({ skillId }: { skillId: string }) {
  const data = useData();
  const now = Date.now();
  const h = sectionHistory(data.log, skillId, now);
  const s = data.states[skillId];
  if (!h.entries.length) return null;

  const days: { key: string; entries: typeof h.entries }[] = [];
  for (const e of h.entries.slice(-80)) {
    const key = new Date(e.t).toDateString();
    if (days[days.length - 1]?.key === key) days[days.length - 1].entries.push(e);
    else days.push({ key, entries: [e] });
  }

  return (
    <div className="history">
      <div className="history-strip" aria-label="Answer history, oldest first">
        {days.map((d) => (
          <span key={d.key} className="history-day" title={fmtDate(d.entries[0].t)}>
            {d.entries.map((e) => {
              const r = ratingOf(e);
              return <i key={e.t} className={`hmark h-${r}`} title={`${fmtDate(e.t)} · level ${e.level + 1} · ${RATING_LABEL[r]}`} />;
            })}
          </span>
        ))}
      </div>
      <div className="history-legend small">
        {ORDER.filter((r) => h.counts[r]).map((r) => (
          <span key={r}>
            <i className={`hmark h-${r}`} /> {h.counts[r]} {RATING_LABEL[r]}
          </span>
        ))}
      </div>
      <div className="muted small">
        {h.entries.length} answer{h.entries.length === 1 ? '' : 's'} on {h.days} day{h.days === 1 ? '' : 's'} since {fmtDate(h.first!)}
        {' · '}last {ago(now - h.last!)}
        {h.recentSolved !== null && ` · ${Math.round(h.recentSolved * 100)}% solved in the last 30 days`}
        {s && s.interval >= 1 && ` · reviews every ~${Math.round(s.interval)} day${Math.round(s.interval) === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}
