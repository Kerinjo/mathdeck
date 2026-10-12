/**
 * Cosmetic clean-up of generated TeX. Generators assemble expressions from random coefficients, and a few
 * patterns come out correct but awkward: "\frac{5}{1}", "+ -3", "- -3", "1x", "-1\cos x", "x^{1}", "x + 0".
 * Each rule only fires where the rewrite means the same thing.
 */
export function tidyTex(s: string): string {
  return (
    s
      // \frac{a}{1} -> {a}: braced, so \arctan\frac{x}{1} stays valid; not after a digit (3\frac{2}{1} is not 32)
      .replace(/(?<!\d)\\d?frac\{([^{}]+)\}\{1\}/g, '{$1}')
      // a + -b -> a - b, a - -b -> a + b
      .replace(/(\s)\+\s*-\s*(?=[\d\\a-zA-Z(])/g, '$1- ')
      .replace(/(\s)-\s*-\s*(?=[\d\\a-zA-Z(])/g, '$1+ ')
      // x^{1} -> x (letters, brackets and |x| only; numeric bases like 3^{1} are often deliberate)
      .replace(/([a-zA-Z)|])\^\{1\}(?!\d)/g, '$1')
      // 1x -> x, -1xy -> -xy, -1\cos x -> -\cos x: a lone coefficient 1 before a (lowercase) variable or a
      // function. Uppercase is left alone so hexadecimal like \texttt{1F} survives.
      .replace(/(^|[\s(=+\-{,])1(?=[a-z]|\\(?:sin|cos|tan|ln|sqrt|mathbf|pi)\b)/g, '$1')
      // x + 0 -> x at the end of a term
      .replace(/\s\+\s0(?=\s*(?:$|[=)}<>,&]|\\to|\\le|\\ge|\\\\))/g, '')
  );
}
