import { useEffect, useState, type ReactNode } from 'react';
import { CHAPTER_OF, chapterNumber, SUBJECT_OF_CHAPTER, SUBJECTS } from '../content';
import { dropSession, markKnown, resetSkill, setDeeper } from '../core/actions';
import { levelsDone, status, STREAK_TO_LEVEL_UP } from '../core/scheduler';
import { useData, type Data } from '../core/store';
import type { Chapter, Skill, Subject } from '../core/types';
import { LearnPanel } from './Card';
import { History } from './Insight';
import { Bar, chapterProgress, currentChapter, Pips, STATUS_LABEL, subjectProgress, when } from './common';
import { SubjectMap } from './SubjectMap';
import { Text } from './Tex';

/** What to reveal when arriving here: a subject, a chapter, or a section (opens its ancestors). */
export type Focus = { subject?: string; chapter?: string; section?: string };

interface Props {
  focus?: Focus;
  onStudy(key: string): void;
  onPractice(skillId: string, level: number): void;
}

const OPEN_KEY = 'mathdeck:outline';
const ICON: Record<string, string> = { video: '▶', article: '¶', book: '❡', interactive: '◈' };

/** Open/closed rows, remembered per browser. Keys: s:<subject>, c:<chapter>, a:<chapter about>, k:<section>. */
function initialOpen(d: Data): Set<string> {
  try {
    const saved = localStorage.getItem(OPEN_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch {
    // fall through to defaults
  }
  const open = new Set<string>();
  for (const subj of SUBJECTS) {
    const started = subj.chapters.some((c) => c.skills.some((s) => d.states[s.id]));
    if (!started) continue;
    open.add(`s:${subj.id}`);
    const cur = currentChapter(subj, d.states);
    if (cur) open.add(`c:${cur.id}`);
  }
  if (open.size === 0) {
    open.add(`s:${SUBJECTS[0].id}`);
    open.add(`c:${SUBJECTS[0].chapters[0].id}`);
  }
  return open;
}

export function Subjects({ focus, onStudy, onPractice }: Props) {
  const data = useData();
  const [open, setOpen] = useState<Set<string>>(() => initialOpen(data));
  const [selected, setSelected] = useState<string | null>(focus?.subject ?? null);

  const save = (next: Set<string>) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify([...next]));
    } catch {
      // per-browser convenience only
    }
  };
  const toggle = (k: string) => {
    const next = new Set(open);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    save(next);
  };
  const reveal = (keys: string[], scrollTo: string) => {
    save(new Set([...open, ...keys]));
    requestAnimationFrame(() => document.getElementById(scrollTo)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  };

  useEffect(() => {
    if (!focus) return;
    if (focus.section) {
      const ch = CHAPTER_OF[focus.section];
      reveal([`s:${SUBJECT_OF_CHAPTER[ch.id].id}`, `c:${ch.id}`, `k:${focus.section}`], focus.section);
    } else if (focus.chapter) {
      reveal([`s:${SUBJECT_OF_CHAPTER[focus.chapter].id}`, `c:${focus.chapter}`], focus.chapter);
    } else if (focus.subject) reveal([`s:${focus.subject}`], `subj-${focus.subject}`);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="subjects">
      <SubjectMap
        selected={selected}
        onPick={(id) => {
          setSelected(id);
          reveal([`s:${id}`], `subj-${id}`);
        }}
      />
      <div className="outline">
        {SUBJECTS.map((subj) => (
          <SubjectBlock key={subj.id} subject={subj} data={data} open={open} toggle={toggle} onStudy={onStudy} onPractice={onPractice} />
        ))}
      </div>
    </div>
  );
}

function StudyButton({ sessionKey, data, onStudy, label = 'Study' }: { sessionKey: string; data: Data; onStudy(k: string): void; label?: string }) {
  const saved = data.sessions[sessionKey];
  return (
    <button
      className={`ghost small study-btn ${saved ? 'resume' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onStudy(sessionKey);
      }}
      title={saved ? 'Pick up where you paused' : undefined}
    >
      {saved ? `Resume ${saved.answered}/${saved.target}` : label}
    </button>
  );
}

function SubjectBlock(props: {
  subject: Subject;
  data: Data;
  open: Set<string>;
  toggle(k: string): void;
  onStudy(k: string): void;
  onPractice(id: string, level: number): void;
}) {
  const { subject, data, open, toggle } = props;
  const isOpen = open.has(`s:${subject.id}`);
  const prog = subjectProgress(subject, data.states);
  const cur = currentChapter(subject, data.states);
  return (
    <section id={`subj-${subject.id}`} className={`ol-subject ${isOpen ? 'open' : ''}`}>
      <div className="ol-row ol-subject-row" onClick={() => toggle(`s:${subject.id}`)}>
        <span className="chev">{isOpen ? '▾' : '▸'}</span>
        <span className="ol-name">{subject.name}</span>
        <span className="muted small ol-blurb">{subject.blurb}</span>
        <Bar value={prog} />
        <span className="muted small ol-pct">{Math.round(prog * 100)}%</span>
        {cur && <StudyButton sessionKey={`chapter:${cur.id}`} data={data} onStudy={props.onStudy} label="Continue" />}
      </div>
      {isOpen &&
        subject.chapters.map((c) => (
          <ChapterBlock key={c.id} chapter={c} current={c === cur} {...props} />
        ))}
    </section>
  );
}

function ChapterBlock(props: {
  chapter: Chapter;
  current: boolean;
  data: Data;
  open: Set<string>;
  toggle(k: string): void;
  onStudy(k: string): void;
  onPractice(id: string, level: number): void;
}) {
  const { chapter: ch, data, open, toggle } = props;
  const isOpen = open.has(`c:${ch.id}`);
  const about = open.has(`a:${ch.id}`);
  const p = chapterProgress(ch, data.states);
  const key = `chapter:${ch.id}`;
  return (
    <div id={ch.id} className={`ol-chapter ${props.current ? 'current' : ''}`}>
      <div className="ol-row ol-chapter-row" onClick={() => toggle(`c:${ch.id}`)}>
        <span className="chev">{isOpen ? '▾' : '▸'}</span>
        <span className="ch-num">{chapterNumber(ch)}</span>
        <span className="ol-name">{ch.title}</span>
        <button
          className={`info ${about ? 'active' : ''}`}
          title="About this chapter (optional)"
          onClick={(e) => {
            e.stopPropagation();
            toggle(`a:${ch.id}`);
          }}
        >
          ⓘ
        </button>
        <span className="muted small ol-count">
          {p.cleared}/{p.total}
        </span>
        <Bar value={p.value} />
        <StudyButton sessionKey={key} data={data} onStudy={props.onStudy} />
      </div>
      {about && (
        <div className="ol-about learn">
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
          <div className="actions left">
            {data.sessions[key] && (
              <button className="link small" onClick={() => dropSession(key)}>
                Discard paused session
              </button>
            )}
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
      )}
      {isOpen && (
        <div className="ol-sections">
          {ch.skills.map((k) => (
            <SectionRow key={k.id} skill={k} deeper={false} {...props} />
          ))}
          {ch.deeper.length > 0 && (
            <>
              <div className="ol-deeper-label">
                Going deeper <span className="muted">· optional, switch on to include in study and reviews</span>
              </div>
              {ch.deeper.map((k) => (
                <SectionRow key={k.id} skill={k} deeper {...props} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SectionRow(props: {
  skill: Skill;
  deeper: boolean;
  data: Data;
  open: Set<string>;
  toggle(k: string): void;
  onStudy(k: string): void;
  onPractice(id: string, level: number): void;
}) {
  const { skill, data } = props;
  const s = data.states[skill.id];
  const st = status(s);
  const now = Date.now();
  const on = !!data.deeper[skill.id];
  const isOpen = props.open.has(`k:${skill.id}`);
  const details: ReactNode = isOpen && (
    <div className="ol-section-body">
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
            <button className="ghost small" onClick={() => props.onPractice(skill.id, i)} title="Doesn't affect your progress">
              Practice
            </button>
          </div>
        ))}
      </div>
      <History skillId={skill.id} />
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
  );

  return (
    <div id={skill.id} className={`ol-section status-${st} ${isOpen ? 'open' : ''}`}>
      <div className="ol-row ol-section-row" onClick={() => props.toggle(`k:${skill.id}`)}>
        <i className="swatch" />
        <span className="ol-name">{skill.name}</span>
        <Pips total={skill.levels.length} level={levelsDone(s, skill.levels.length)} />
        <span className="muted small status-text">
          {STATUS_LABEL[st]}
          {s && (!props.deeper || on) && ` · ${s.due <= now ? 'due now' : `review ${when(s.due - now)}`}`}
        </span>
        {props.deeper && (
          <label className="toggle" title="Include in chapter study and reviews" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={on} onChange={(e) => setDeeper(skill.id, e.target.checked)} />
            <span>{on ? 'On' : 'Off'}</span>
          </label>
        )}
        <span
          onClickCapture={() => {
            if (props.deeper && !on) setDeeper(skill.id, true);
          }}
        >
          <StudyButton sessionKey={`skill:${skill.id}`} data={data} onStudy={props.onStudy} />
        </span>
      </div>
      {details}
    </div>
  );
}
