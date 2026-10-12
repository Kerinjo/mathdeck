import { useEffect, useRef, useState } from 'react';
import { SUBJECTS } from '../content';
import { useData } from '../core/store';
import type { Subject } from '../core/types';
import { subjectProgress } from './common';

const W = 168;
const H = 58;
const GAP_X = 56;
const GAP_Y = 14;

/** Longest chain of prerequisites above each subject: its column on the map. */
function layers(subjects: Subject[]) {
  const depth: Record<string, number> = {};
  const d = (s: Subject): number =>
    (depth[s.id] ??= s.requires.length ? 1 + Math.max(...s.requires.map((r) => d(subjects.find((x) => x.id === r)!))) : 0);
  subjects.forEach(d);
  const cols: Subject[][] = [];
  subjects.forEach((s) => (cols[depth[s.id]] ??= []).push(s));
  return cols;
}

/** Subjects as a graph, arrows from what each builds on. Turns vertical on narrow screens. */
export function SubjectMap({ onPick, selected }: { onPick(id: string): void; selected?: string | null }) {
  const { states } = useData();
  const box = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 560));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = layers(SUBJECTS);
  const pos: Record<string, { x: number; y: number }> = {};
  cols.forEach((col, i) =>
    col.forEach((s, j) => {
      pos[s.id] = narrow ? { x: j * (W + GAP_Y), y: i * (H + GAP_X) } : { x: i * (W + GAP_X), y: j * (H + GAP_Y) };
    }),
  );
  const width = Math.max(...Object.values(pos).map((p) => p.x)) + W;
  const height = Math.max(...Object.values(pos).map((p) => p.y)) + H;

  const edge = (from: string, to: string) => {
    const a = pos[from];
    const b = pos[to];
    if (narrow) {
      const [x1, y1, x2, y2] = [a.x + W / 2, a.y + H, b.x + W / 2, b.y];
      const m = (y1 + y2) / 2;
      return `M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2 - 4}`;
    }
    const [x1, y1, x2, y2] = [a.x + W, a.y + H / 2, b.x, b.y + H / 2];
    const m = (x1 + x2) / 2;
    return `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2 - 4},${y2}`;
  };

  return (
    <div className="subject-map" ref={box}>
      <svg viewBox={`-2 -2 ${width + 4} ${height + 4}`} style={{ maxWidth: width + 4 }} role="img" aria-label="Subject map">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="map-arrowhead" />
          </marker>
        </defs>
        {SUBJECTS.flatMap((s) =>
          s.requires.map((r) => <path key={`${r}-${s.id}`} d={edge(r, s.id)} className="map-edge" markerEnd="url(#arrow)" />),
        )}
        {SUBJECTS.map((s) => {
          const p = pos[s.id];
          const prog = subjectProgress(s, states);
          return (
            <g
              key={s.id}
              transform={`translate(${p.x},${p.y})`}
              className={`map-node ${selected === s.id ? 'selected' : ''}`}
              onClick={() => onPick(s.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onPick(s.id)}
            >
              <rect width={W} height={H} rx={10} />
              <text x={12} y={23} className="map-title">
                {s.name}
              </text>
              <rect x={12} y={36} width={W - 60} height={6} rx={3} className="map-track" />
              <rect x={12} y={36} width={(W - 60) * prog} height={6} rx={3} className="map-fill" />
              <text x={W - 12} y={43} textAnchor="end" className="map-pct">
                {Math.round(prog * 100)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
