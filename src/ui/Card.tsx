import { useEffect, useRef, useState, type ReactNode } from 'react';
import { answerTex, check } from '../core/check';
import type { Rating } from '../core/scheduler';
import { useData } from '../core/store';
import type { Problem, Skill } from '../core/types';
import { CHAPTER_OF, chapterNumber, SKILLS, SUBJECT_OF_CHAPTER } from '../content';
import { AnswerInput, emptyResponse, type ResponseValue } from './AnswerInput';
import { GraphFig } from './GraphFig';
import { Math, Text } from './Tex';

interface Props {
  skill: Skill;
  level: number;
  problem: Problem;
  /** Called once, when you rate how it went. The parent records it (and may prepare the next card). */
  onRated(rating: Rating): void;
  /** Move on to the next card. Right after rating, except after "didn't know how": then it waits for you. */
  onNext(): void;
  /** Message about the previous card (e.g. "Section cleared"), shown above this one. */
  banner?: ReactNode;
}

type Result = { ok: boolean; gaveUp: boolean; self: boolean; hinted: boolean };

interface Choice {
  rating: Rating;
  label: string;
  hint: string;
}

/** What you can say about how it went, depending on the outcome. The first default is used for Enter. */
function choicesFor(r: Result): { choices: Choice[]; def: Rating } {
  if (r.hinted && (r.ok || r.self) && !r.gaveUp)
    return {
      choices: [
        ...(r.self ? [{ rating: 'again' as Rating, label: "Couldn't do it", hint: 'back soon' }] : []),
        { rating: 'hinted', label: 'Solved with a hint', hint: 'half credit, back tomorrow' },
      ],
      def: 'hinted',
    };
  if (r.self)
    return {
      choices: [
        { rating: 'again', label: "Couldn't do it", hint: 'back soon' },
        { rating: 'hard', label: 'Hard', hint: 'got there, with effort' },
        { rating: 'good', label: 'Good', hint: 'did it' },
        { rating: 'easy', label: 'Easy', hint: 'no effort' },
      ],
      def: 'good',
    };
  if (r.ok)
    return {
      choices: [
        { rating: 'hard', label: 'Hard', hint: 'comes back sooner' },
        { rating: 'good', label: 'Good', hint: 'normal spacing' },
        { rating: 'easy', label: 'Easy', hint: 'push it far out' },
      ],
      def: 'good',
    };
  if (r.gaveUp) return { choices: [{ rating: 'again', label: "Didn't know how", hint: 'back soon' }], def: 'again' };
  return {
    choices: [
      { rating: 'again', label: "Didn't know how", hint: 'back soon' },
      { rating: 'slip', label: 'Slip — I had the method', hint: 'no penalty' },
    ],
    def: 'again',
  };
}

export function Card({ skill, level, problem, onRated, onNext, banner }: Props) {
  const self = problem.answer.kind === 'self';
  const [response, setResponse] = useState<ResponseValue>(() => emptyResponse(problem.answer));
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [showLearn, setShowLearn] = useState(false);
  const [rated, setRated] = useState(false);
  /** After "didn't know how": stay on this card with the solution and intro until you choose to move on. */
  const [studying, setStudying] = useState(false);
  const studyingSince = useRef(0);
  const [showHint, setShowHint] = useState(false);
  const gradedAt = useRef(0);
  const hint =
    problem.hint ??
    (problem.answer.kind !== 'choice' && problem.solution.length >= 2 ? problem.solution[0] : undefined);

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
    setResult({ ok, gaveUp, self, hinted: showHint });
    setShowSolution(!ok || self);
    setShowLearn(!ok && !self);
  };
  const rate = (r: Rating) => {
    if (rated) return;
    setRated(true);
    onRated(r);
    if (r !== 'again') return onNext();
    studyingSince.current = Date.now();
    setStudying(true);
    setShowSolution(true);
    setShowLearn(true);
  };
  const next = () => {
    // A reflexive second Enter right after rating shouldn't skip the explanation.
    if (Date.now() - studyingSince.current < 1200) return;
    onNext();
  };

  const options = result ? choicesFor(result) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement;
      if (studying) {
        if (e.key === 'Enter' && !e.repeat) {
          e.preventDefault();
          next();
        }
        return;
      }
      if (result && options) {
        if (e.repeat || Date.now() - gradedAt.current < 250) return;
        if (e.key === 'Enter') {
          e.preventDefault();
          rate(options.def);
          return;
        }
        const n = Number(e.key);
        if (n >= 1 && n <= options.choices.length) {
          e.preventDefault();
          rate(options.choices[n - 1].rating);
        }
        return;
      }
      if (self && e.key === 'Enter' && !typing) {
        e.preventDefault();
        finish(true, false);
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
      {banner && <div className="banner">{banner}</div>}
      <div className="card-head">
        <div className="crumbs">
          {subject.name} <span className="sep">›</span> {chapterNumber(chapter)}. {chapter.title} <span className="sep">›</span>{' '}
          <b>{skill.name}</b>
        </div>
        <div className="level-tag">
          Level {level + 1}/{skill.levels.length} · {skill.levels[level].name}
        </div>
      </div>

      <div className="prompt">
        <Text text={problem.prompt} />
      </div>
      {problem.figure && <GraphFig fig={problem.figure} />}

      {self ? (
        !result && <div className="hint">Work it out on paper, then compare with the model proof.</div>
      ) : (
        <>
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
        </>
      )}

      {!result && (
        <div className="actions">
          <span className="aux-buttons">
            <button className={`ghost ${showLearn ? 'active' : ''}`} onClick={() => setShowLearn(!showLearn)}>
              📖 Intro
            </button>
            {hint && (
              <button
                className={`ghost ${showHint ? 'active' : ''}`}
                onClick={() => setShowHint(true)}
                disabled={showHint}
                title="Costs half the credit for this problem"
              >
                💡 Hint
              </button>
            )}
          </span>
          {self ? (
            <button className="primary" onClick={() => finish(true, false)}>
              Show model proof <kbd>⏎</kbd>
            </button>
          ) : (
            <>
              <button className="ghost" onClick={() => finish(false, true)}>
                I don't know
              </button>
              {problem.answer.kind !== 'choice' && (
                <button className="primary" onClick={() => grade()}>
                  Check <kbd>⏎</kbd>
                </button>
              )}
            </>
          )}
        </div>
      )}
      {showHint && hint && (
        <div className="hint-panel">
          <span className="hint-tag">Hint</span> <Text text={hint} />
        </div>
      )}
      {!result && showLearn && (
        <div className="intro-panel">
          <LearnPanel skill={skill} />
        </div>
      )}

      {result && options && (
        <>
          {!self && (
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
            </div>
          )}

          {!studying && (
            <div className="rate">
              <div className="rate-label">{self ? 'How did it go?' : result.ok ? 'How was it?' : 'What happened?'}</div>
              <div className="rate-buttons">
                {options.choices.map((c, i) => (
                  <button
                    key={c.rating}
                    className={`rate-btn r-${c.rating} ${c.rating === options.def ? 'default' : ''}`}
                    onClick={() => rate(c.rating)}
                    disabled={rated}
                  >
                    <span className="rate-top">
                      <kbd>{i + 1}</kbd> {c.label}
                      {c.rating === options.def && <kbd>⏎</kbd>}
                    </span>
                    <span className="rate-hint">{c.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Disclosure open={showSolution} onToggle={setShowSolution} label={self ? 'Model proof' : 'Worked solution'}>
            {self ? (
              <div className="proof">
                {problem.solution.map((s, i) => (
                  <p key={i}>
                    <Text text={s} />
                  </p>
                ))}
              </div>
            ) : (
              <ol className="steps">
                {problem.solution.map((s, i) => (
                  <li key={i}>
                    <Text text={s} />
                  </li>
                ))}
              </ol>
            )}
          </Disclosure>
          <Disclosure open={showLearn} onToggle={setShowLearn} label={studying ? 'Learn this section (start here if the solution lost you)' : 'Learn this section'}>
            <LearnPanel skill={skill} />
          </Disclosure>
          {studying && (
            // Below the reading, so moving on comes after it.
            <div className="actions">
              <button className="primary" onClick={() => onNext()}>
                Next problem <kbd>⏎</kbd>
              </button>
            </div>
          )}
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
