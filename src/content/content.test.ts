import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { answerTex, check, parse } from '../core/check';
import { makeRng } from '../core/rng';
import type { Answer } from '../core/types';
import { ALL_SKILLS, SKILLS } from './index';

const RUNS = 60;

/** Throws on malformed TeX in any $...$ segment. */
function renderAll(text: string) {
  for (const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g)) {
    katex.renderToString(m[1] ?? m[2], { throwOnError: true, strict: false });
  }
}

/** Feed the expected answer back through the grader, as a user would type it. */
function expectedResponse(a: Answer) {
  switch (a.kind) {
    case 'expr':
    case 'number':
      return a.expected;
    case 'list':
      return a.expected.join(', ');
    case 'sequence':
      return a.expected.join(', ').toLowerCase();
    case 'set':
      return `{${[...a.expected].reverse().join(', ')}}`;
    case 'matrix':
      return a.expected;
    case 'direction':
      return a.expected.map((x) => [`-2*(${x})`]);
    case 'choice':
      return a.correct;
    case 'self':
      return '';
    case 'formula':
      return a.expected;
  }
}

describe('content', () => {
  it('prerequisites exist and come earlier in the curriculum', () => {
    ALL_SKILLS.forEach((s, i) => {
      for (const p of s.prereqs) {
        expect(SKILLS[p], `${s.id} -> ${p}`).toBeDefined();
        expect(ALL_SKILLS.findIndex((k) => k.id === p), `${s.id} -> ${p}`).toBeLessThan(i);
      }
    });
  });

  for (const skill of ALL_SKILLS) {
    skill.levels.forEach((level, li) => {
      it(`${skill.id} L${li + 1} (${level.name}) generates gradable problems`, () => {
        for (let seed = 1; seed <= RUNS; seed++) {
          const p = level.generate(makeRng(seed * 7919 + li));
          const where = `${skill.id} L${li + 1} seed ${seed}: ${p.prompt}`;
          expect(p.prompt, where).not.toMatch(/undefined|NaN|Infinity(?!})|\[object/);
          p.solution.forEach((s) => expect(s, where).not.toMatch(/undefined|NaN|\[object/));
          if (p.answer.kind === 'expr') expect(parse(p.answer.expected, p.answer.vars).ok, where).toBe(true);
          if (p.answer.kind === 'choice') expect(new Set(p.answer.options).size, `duplicate options in ${where}`).toBe(p.answer.options.length);
          expect(check(p.answer, expectedResponse(p.answer) as never), where).toEqual({ ok: true });
          expect(() => [p.prompt, ...p.solution, p.hint ?? ''].forEach(renderAll), where).not.toThrow();
          if (p.hint) expect(p.hint.split('$').length % 2, `unbalanced $ in hint of ${where}`).toBe(1);
          if (p.answer.kind !== 'choice' && p.answer.kind !== 'self') expect(() => katex.renderToString(answerTex(p.answer), { throwOnError: true }), where).not.toThrow();
          else if (p.answer.kind === 'choice') p.answer.options.forEach((o) => expect(() => renderAll(o), where).not.toThrow());
          p.solution.forEach((s) => expect(s.split('$').length % 2, `unbalanced $ in ${where}`).toBe(1));
          expect(p.prompt.split('$').length % 2, `unbalanced $ in ${where}`).toBe(1);
          if (p.selfCheck) expect(p.selfCheck(), `selfCheck ${where}`).toBe(true);
        }
      });
    });
  }
});
