import { useEffect, useRef, useState, type ReactNode } from 'react';
import { answerTex, check } from '../core/check';
import { useData } from '../core/store';
import type { Problem, Skill } from '../core/types';
import { CHAPTER_OF, chapterNumber, SKILLS, SUBJECT_OF_CHAPTER } from '../content';
import { AnswerInput, emptyResponse, type ResponseValue } from './AnswerInput';
import { Math, Text } from './Tex';

interface Props {
  skill: Skill;
  level: number;
  problem: Problem;
  /** Called once with the verdict. */
  onAnswered(ok: boolean): void;
  onNext(): void;
  /** Extra line under the verdict (e.g. "Level up!"). */
  feedback?: ReactNode;
  header?: ReactNode;
}

export function Card({ skill, level, problem, onAnswered, onNext, feedback, header }: Props) {
  const [response, setResponse] = useState<ResponseValue>(() => emptyResponse(problem.answer));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; gaveUp: boolean } | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const gradedAt = useRef(0);

  const grade = (v: ResponseValue = response) => {
    if (result) return;
    if (v === null || v === '') return setError('Enter an answer first, or press "I don\'t know".');
    const verdict = check(problem.answer, v);
    if (verdict.error) return setError(verdict.error);
    setError(null);
    finish(verdict.ok, false);
  };
  const finish = (ok: boolean, gaveUp: boolean) => {
    gradedAt.current = Date.now();
    setResult({ ok, gaveUp });
    setShowSolution(!ok);
    setShowLearn(!ok);
    onAnswered(ok);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement;
      if (result) {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && Date.now() - gradedAt.current > 250) {
          e.preventDefault();
          onNext();
        }
        return;
      }
      if (problem.answer.kind === 'choice' && !typing) {
        const n = Number(e.key);
        if (n >= 1 && n <= problem.answer.options.length) {
          setResponse(n - 1);
          grade(n - 1);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const chapter = CHAPTER_OF[skill.id];
  const subject = SUBJECT_OF_CHAPTER[chapter.id];

  return (
    <div className="card">
      <div className="card-head">
        <div className="crumbs">
          {subject.name} <span className="sep">›</span> {chapterNumber(chapter)}. {chapter.title} <span className="sep">›</span>{' '}
          <b>{skill.name}</b>
        </div>
        <div className="level-tag">
          Level {level + 1}/{skill.levels.length} · {skill.levels[level].name}
        </div>
      </div>
      {header}

      <div className="prompt">
        <Text text={problem.prompt} />
      </div>

      <AnswerInput
        answer={problem.answer}
        value={response}
        onChange={(v) => {
          setResponse(v);
          setError(null);
        }}
        onSubmit={grade}
        disabled={!!result}
        reveal={!!result}
      />
      {problem.inputHint && !result && <div className="hint">{problem.inputHint}</div>}
      {error && <div className="error">{error}</div>}

      {!result ? (
        <div className="actions">
          <button className={`ghost intro-btn ${showLearn ? 'active' : ''}`} onClick={() => setShowLearn(!showLearn)}>
            📖 Intro
          </button>
          <button className="ghost" onClick={() => finish(false, true)}>
            I don't know
          </button>
          {problem.answer.kind !== 'choice' && (
            <button className="primary" onClick={() => grade()}>
              Check <kbd>⏎</kbd>
            </button>
          )}
        </div>
      ) : null}
      {!result && showLearn && (
        <div className="intro-panel">
          <LearnPanel skill={skill} />
        </div>
      )}
      {result && (
        <>
          <div className={`verdict ${result.ok ? 'ok' : 'bad'}`}>
            <div className="verdict-main">
              <span className="verdict-icon">{result.ok ? '✓' : '✗'}</span>
              <span>{result.ok ? 'Correct' : result.gaveUp ? 'Here is how it goes' : 'Not quite'}</span>
              {!result.ok && problem.answer.kind !== 'choice' && (
                <span className="expected">
                  Answer: <Math tex={answerTex(problem.answer)} />
                </span>
              )}
            </div>
            {feedback && <div className="verdict-sub">{feedback}</div>}
          </div>

          <Disclosure open={showSolution} onToggle={setShowSolution} label="Worked solution">
            <ol className="steps">
              {problem.solution.map((s, i) => (
                <li key={i}>
                  <Text text={s} />
                </li>
              ))}
            </ol>
          </Disclosure>
          <Disclosure open={showLearn} onToggle={setShowLearn} label="Learn this section">
            <LearnPanel skill={skill} />
          </Disclosure>

          <div className="actions">
            <button className="primary" onClick={onNext}>
              Next <kbd>⏎</kbd>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Disclosure(props: { open: boolean; onToggle(v: boolean): void; label: string; children: ReactNode }) {
  return (
    <div className={`disclosure ${props.open ? 'open' : ''}`}>
      <button className="disclosure-head" onClick={() => props.onToggle(!props.open)}>
        <span className="chev">{props.open ? '▾' : '▸'}</span> {props.label}
      </button>
      {props.open && <div className="disclosure-body">{props.children}</div>}
    </div>
  );
}

const ICON: Record<string, string> = { video: '▶', article: '¶', book: '❡', interactive: '◈' };
const KIND: Record<string, string> = { video: 'Video', article: 'Notes', book: 'Textbook', interactive: 'Interactive' };

export function LearnPanel({ skill }: { skill: Skill }) {
  const { states } = useData();
  const weakPrereqs = skill.prereqs.filter((p) => !states[p]?.cleared);
  return (
    <div className="learn">
      <p className="summary">
        <Text text={skill.learn.summary} />
      </p>
      <ul className="resources">
        {skill.learn.resources.map((r) => (
          <li key={r.url}>
            <a href={r.url} target="_blank" rel="noreferrer">
              <span className={`res-icon ${r.kind}`} title={KIND[r.kind]}>
                {ICON[r.kind]}
              </span>
              <span>{r.title}</span>
            </a>
            {r.note && <span className="muted"> · {r.note}</span>}
          </li>
        ))}
      </ul>
      {skill.prereqs.length > 0 && (
        <div className="prereqs">
          Builds on:{' '}
          {skill.prereqs.map((p, i) => (
            <span key={p}>
              {i > 0 && ', '}
              <span className={weakPrereqs.includes(p) ? 'weak' : ''}>{SKILLS[p].name}</span>
            </span>
          ))}
          {weakPrereqs.length > 0 && (
            <div className="weak-note">
              You haven't cleared {weakPrereqs.map((p) => SKILLS[p].name).join(' / ')} yet. If this feels
              hard, the gap may be there.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
