import { describe, expect, it } from 'vitest';
import { tidyTex } from './tidy';

describe('tidyTex', () => {
  it.each([
    ['\\frac{5}{1}', '{5}'],
    ['2 + \\dfrac{x}{1}', '2 + {x}'],
    ['\\arctan\\frac{x}{1}', '\\arctan{x}'],
    ['3\\frac{2}{1}', '3\\frac{2}{1}'],
    ['x + -4', 'x - 4'],
    ['x - -4', 'x + 4'],
    ['x^{1} + y^{2}', 'x + y^{2}'],
    ['|x|^{1}', '|x|'],
    ['3^{1} \\equiv 3', '3^{1} \\equiv 3'],
    ['x^{10}', 'x^{10}'],
    ['1x + 11x', 'x + 11x'],
    ['-1\\cos x', '-\\cos x'],
    ['x^{2} -1xy', 'x^{2} -xy'],
    ['\\texttt{1F}', '\\texttt{1F}'],
    ['\\frac{1}{x}', '\\frac{1}{x}'],
    ['e^{1x}', 'e^{x}'],
    ['x + 0 = x', 'x = x'],
    ['x + 0.5', 'x + 0.5'],
    ['\\sum_{n=1}^{\\infty}', '\\sum_{n=1}^{\\infty}'],
  ])('%s -> %s', (input, output) => expect(tidyTex(input)).toBe(output));
});
