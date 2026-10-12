import { useEffect, useState } from 'react';
import { CHAPTER_BY_ID, chapterNumber, SUBJECT_OF_CHAPTER } from '../content';
import { dropSession, markKnown, resetSkill, setDeeper } from '../core/actions';
import { levelsDone, status, STREAK_TO_LEVEL_UP } from '../core/scheduler';
import { useData } from '../core/store';
import type { Skill } from '../core/types';
import { LearnPanel } from './Card';
import { Bar, chapterProgress, Pips, STATUS_LABEL, when } from './common';
import { Text } from './Tex';

interface Props {
  chapterId: string;
  focus?: string;
  onStudy(key: string): void;
  onPractice(skillId: string, level: number): void;
  onBack(): void;
}

const ICON: Record<string, string> = { video: '▶', article: '¶', book: '❡', interactive: '◈' };

export function ChapterPage({ chapterId, focus, onStudy, onPractice, onBack }: Props) {
  const data = useData();
  const ch = CHAPTER_BY_ID[chapterId];
  const subject = SUBJECT_OF_CHAPTER[ch.id];
  const p = chapterProgress(ch, data.states);
  const key = `chapter:${ch.id}`;
  const saved = data.sessions[key];
  const [about, setAbout] = useState(false);
  const [open, setOpen] = useState<string | null>(focus ?? null);

  useEffect(() => {
    if (focus) document.getElementById(focus)?.scrollIntoView({ block: 'center' });
  }, [focus]);

  const row = (k: Skill, deeper: boolean) => (
    <SectionRow
      key={k.id}
      skill={k}
      deeper={deeper}
      open={open === k.id}
      onToggle={() => setOpen(open === k.id ? null : k.id)}
      onStudy={() => {
        if (deeper) setDeeper(k.id, true);
        onStudy(`skill:${k.id}`);
      }}
      onPractice={onPractice}
    />
  );

  return (
    <div className="chapter-page">
      <button className="link back" onClick={onBack}>
        ← {subject.name}
      </button>
      <div className="chapter-head">
        <div>
          <div className="muted small">Chapter {chapterNumber(ch)}</div>
          <h1>{ch.title}</h1>
          <div className="chapter-progress">
            <Bar value={p.value} />
            <span className="muted small">
              {p.cleared} of {p.total} sections cleared
            </span>
          </div>
        </div>
        <div className="chapter-actions">
          {saved ? (
            <>
              <button className="primary big" onClick={() => onStudy(key)}>
                Resume · {saved.answered}/{saved.target}
              </button>
              <button
                className="link small"
                onClick={() => {
                  dropSession(key);
                  onStudy(key);
                }}
              >
                Start a new session instead
              </button>
            </>
          ) : (
            <button className="primary big" onClick={() => onStudy(key)}>
              {p.cleared === 0 && !ch.skills.some((s) => data.states[s.id]) ? 'Start chapter' : 'Study chapter'}
            </button>
          )}
        </div>
      </div>

      <div className={`disclosure about ${about ? 'open' : ''}`}>
        <button className="disclosure-head" onClick={() => setAbout(!about)}>
          <span className="chev">{about ? '▾' : '▸'}</span> About this chapter <span className="muted small">(optional)</span>
        </button>
        {about && (
          <div className="disclosure-body learn">
            <p>
              <Text text={ch.about} />
            </p>
            <p>
              <b>Why it matters.</b> <Text text={ch.why} />
            </p>
            <ul className="resources">
              {ch.resources.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer">
                    <span className={`res-icon ${r.kind}`}>{ICON[r.kind]}</span>
                    <span>{r.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <h3>Sections</h3>
      <div className="sections">{ch.skills.map((k) => row(k, false))}</div>

      {ch.deeper.length > 0 && (
        <>
          <h3>Going deeper</h3>
          <p className="muted small">
            Optional extras. Switch one on to include it in chapter study and reviews. It never affects your progress
            through the book.
          </p>
          <div className="sections">{ch.deeper.map((k) => row(k, true))}</div>
        </>
      )}

      <div className="actions left">
        {ch.skills.some((s) => !data.states[s.id]?.cleared) && (
          <button
            className="ghost small"
            onClick={() =>
              confirm(`Mark every section of “${ch.title}” as already known? They'll be checked in reviews.`) &&
              markKnown(ch.skills.map((s) => s.id))
            }
          >
            I already know this chapter
          </button>
        )}
      </div>
    </div>
  );
}

function SectionRow(props: {
  skill: Skill;
  deeper: boolean;
  open: boolean;
  onToggle(): void;
  onStudy(): void;
  onPractice(id: string, level: number): void;
}) {
  const data = useData();
  const { skill } = props;
  const s = data.states[skill.id];
  const st = status(s);
  const now = Date.now();
  const saved = data.sessions[`skill:${skill.id}`];
  const on = !!data.deeper[skill.id];

  return (
    <div id={skill.id} className={`skill-row status-${st} ${props.open ? 'open' : ''}`}>
      <div className="skill-row-head">
        <button className="skill-row-title" onClick={props.onToggle}>
          <i className="swatch" />
          <span className="skill-name">{skill.name}</span>
          <Pips total={skill.levels.length} level={levelsDone(s, skill.levels.length)} />
          <span className="muted small status-text">
            {STATUS_LABEL[st]}
            {s && (!props.deeper || on) && ` · ${s.due <= now ? 'due now' : `review ${when(s.due - now)}`}`}
          </span>
        </button>
        {props.deeper && (
          <label className="toggle" title="Include in chapter study and reviews">
            <input type="checkbox" checked={on} onChange={(e) => setDeeper(skill.id, e.target.checked)} />
            <span>{on ? 'On' : 'Off'}</span>
          </label>
        )}
        <button className="ghost small" onClick={props.onStudy}>
          {saved ? `Resume ${saved.answered}/${saved.target}` : 'Study'}
        </button>
      </div>
      {props.open && (
        <div className="skill-row-body">
          <div className="levels">
            {skill.levels.map((l, i) => (
              <div key={i} className={`level ${s && (s.mastered || i < s.level) ? 'done' : s && i === s.level ? 'current' : ''}`}>
                <span>
                  <b>Level {i + 1}</b> · {l.name}
                  {s && i === s.level && !s.mastered && (
                    <span className="muted small">
                      {' '}
                      · {s.streak}/{STREAK_TO_LEVEL_UP} days in a row
                    </span>
                  )}
                </span>
                <button className="ghost small" onClick={() => props.onPractice(skill.id, i)} title="Doesn't affect your schedule">
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
            {!s?.cleared && (
              <button className="ghost small" onClick={() => markKnown([skill.id])} title="Counts as cleared; checked at the top level in 3 days">
                I already know this
              </button>
            )}
            {s && (
              <button className="ghost small danger" onClick={() => confirm(`Reset progress on “${skill.name}”?`) && resetSkill(skill.id)}>
                Reset progress
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
