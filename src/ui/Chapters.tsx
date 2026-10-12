import { chapterNumber, SUBJECTS } from '../content';
import { useData } from '../core/store';
import { Bar, chapterProgress, currentChapter } from './common';
import { Text } from './Tex';

/** The table of contents: every subject as a book, chapters in order. Nothing is locked. */
export function Chapters({ onChapter }: { onChapter(id: string): void }) {
  const data = useData();
  return (
    <div className="chapters">
      {SUBJECTS.map((subj) => {
        const cur = currentChapter(subj, data.states);
        return (
          <section key={subj.id}>
            <h2>{subj.name}</h2>
            <div className="chapter-list">
              {subj.chapters.map((c) => {
                const p = chapterProgress(c, data.states);
                return (
                  <button key={c.id} className={`chapter-card ${c === cur ? 'current' : ''}`} onClick={() => onChapter(c.id)}>
                    <div className="chapter-card-head">
                      <span className="ch-num">{chapterNumber(c)}</span>
                      <span className="ch-title">{c.title}</span>
                      {c === cur && <span className="badge new">you are here</span>}
                      {data.sessions[`chapter:${c.id}`] && <span className="badge">paused</span>}
                    </div>
                    <div className="muted small ch-about">
                      <Text text={c.about} />
                    </div>
                    <div className="chapter-card-foot">
                      <Bar value={p.value} />
                      <span className="muted small">
                        {p.cleared}/{p.total} sections{c.deeper.length > 0 && ` · +${c.deeper.length} going deeper`}
                      </span>
                    </div>
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
