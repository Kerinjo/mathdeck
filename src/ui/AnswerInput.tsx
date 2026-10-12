import { useEffect, useRef } from 'react';
import { parse, parseLogic, splitTopLevel } from '../core/check';
import type { Answer } from '../core/types';
import { Math, Text } from './Tex';

export type ResponseValue = string | string[][] | number | null;

export function emptyResponse(a: Answer): ResponseValue {
  if (a.kind === 'matrix') return a.expected.map((r) => r.map(() => ''));
  if (a.kind === 'direction') return a.expected.map(() => ['']);
  if (a.kind === 'choice') return null;
  return '';
}

interface Props {
  answer: Answer;
  value: ResponseValue;
  onChange(v: ResponseValue): void;
  onSubmit(v?: ResponseValue): void;
  disabled: boolean;
  /** Which choice was correct, shown after grading. */
  reveal: boolean;
}

export function AnswerInput({ answer, value, onChange, onSubmit, disabled, reveal }: Props) {
  if (answer.kind === 'choice') {
    return (
      <div className="choices">
        {answer.options.map((opt, i) => {
          const cls = [
            'choice',
            value === i ? 'picked' : '',
            reveal && i === answer.correct ? 'right' : '',
            reveal && value === i && i !== answer.correct ? 'wrong' : '',
          ].join(' ');
          return (
            <button
              key={i}
              className={cls}
              disabled={disabled}
              onClick={() => {
                onChange(i);
                onSubmit(i);
              }}
            >
              <kbd>{i + 1}</kbd>
              <Text text={opt} />
            </button>
          );
        })}
      </div>
    );
  }
  if (answer.kind === 'matrix' || answer.kind === 'direction') {
    return <GridInput grid={value as string[][]} onChange={onChange} onSubmit={() => onSubmit()} disabled={disabled} />;
  }
  if (answer.kind === 'self') return null;
  return (
    <TextAnswer
      vars={answer.kind === 'expr' || answer.kind === 'formula' ? answer.vars : []}
      list={answer.kind === 'list' || answer.kind === 'set'}
      logic={answer.kind === 'formula'}
      value={value as string}
      onChange={onChange}
      onSubmit={() => onSubmit()}
      disabled={disabled}
    />
  );
}

function TextAnswer(props: {
  vars: string[];
  list: boolean;
  logic: boolean;
  value: string;
  onChange(v: string): void;
  onSubmit(): void;
  disabled: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!props.disabled) ref.current?.focus();
  }, [props.disabled]);

  let preview: JSX.Element | null = null;
  if (props.value.trim()) {
    const parts = props.list ? splitTopLevel(props.value.replace(/^[{[]|[}\]]$/g, '')) : [props.value];
    const parsed = parts.map((p) => (props.logic ? parseLogic(p, props.vars) : parse(p, props.vars)));
    const bad = parsed.find((p) => !p.ok);
    preview =
      bad && !bad.ok ? (
        <span className="preview-error">{bad.error}</span>
      ) : (
        <Math tex={parsed.map((p) => (p.ok ? p.tex : '')).join(',\\ ')} />
      );
  }

  return (
    <div className="text-answer">
      <input
        ref={ref}
        className="answer-box"
        value={props.value}
        disabled={props.disabled}
        spellCheck={false}
        autoComplete="off"
        placeholder={
          props.logic
            ? `formula in ${props.vars.join(', ')}, e.g. ~p | (q & r)`
            : props.vars.length
              ? `answer in ${props.vars.join(', ')}`
              : 'answer'
        }
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            props.onSubmit();
          }
        }}
      />
      <div className="preview">{preview ?? <span className="muted">preview</span>}</div>
    </div>
  );
}

function GridInput(props: { grid: string[][]; onChange(v: string[][]): void; onSubmit(): void; disabled: boolean }) {
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!props.disabled) first.current?.focus();
  }, [props.disabled]);
  const cols = props.grid[0].length;
  return (
    <div className="grid-wrap">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, 4.5rem)` }}>
        {props.grid.map((row, i) =>
          row.map((cell, j) => (
            <input
              key={`${i}-${j}`}
              ref={i === 0 && j === 0 ? first : undefined}
              className="cell"
              value={cell}
              disabled={props.disabled}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => {
                const g = props.grid.map((r) => [...r]);
                g[i][j] = e.target.value;
                props.onChange(g);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onSubmit();
                }
              }}
            />
          )),
        )}
      </div>
      <div className="muted small">Tab moves between cells.</div>
    </div>
  );
}
