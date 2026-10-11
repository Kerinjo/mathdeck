import katex from 'katex';
import { useMemo } from 'react';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const tex = (src: string, displayMode: boolean) =>
  katex.renderToString(src, { throwOnError: false, displayMode, strict: false });

/** Render text with inline $...$ and display $$...$$ math. */
export function renderMixed(text: string): string {
  return text
    .split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g)
    .map((part) => {
      if (part.startsWith('$$')) return tex(part.slice(2, -2), true);
      if (part.startsWith('$') && part.endsWith('$') && part.length > 1) return tex(part.slice(1, -1), false);
      return escape(part);
    })
    .join('');
}

export function Text({ text, className }: { text: string; className?: string }) {
  const html = useMemo(() => renderMixed(text), [text]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Math({ tex: src, display = false }: { tex: string; display?: boolean }) {
  const html = useMemo(() => tex(src, display), [src, display]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
