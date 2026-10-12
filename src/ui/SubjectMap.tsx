import { useEffect, useRef, useState } from 'react';
import { SUBJECTS } from '../content';
import { useData } from '../core/store';
import type { Subject } from '../core/types';
import { subjectProgress } from './common';

/** Node size and gaps, wide (left to right) and narrow (top to bottom). */
const WIDE = { w: 232, h: 62, gapAcross: 64, gapAlong: 16 };
const NARROW = { w: 150, h: 58, gapAcross: 40, gapAlong: 10 };

/**
 * Columns: each subject sits as late as it can, one column before the earliest subject that builds on it,
 * so arrows stay short. Subjects nothing builds on keep their earliest column; unconnected ones go first.
 * Rows: the last column is spread evenly; every other subject is centred on the subjects it leads to.
 * Returns fractional slots: col along the reading direction, row across it.
 */
export function layout(subjects: Subject[]) {
  const byId = Object.fromEntries(subjects.map((s) => [s.id, s]));
  const children = (id: string) => subjects.filter((s) => (s.requires as string[]).includes(id));
  const isolated = (s: Subject) => !s.requires.length && !children(s.id).length;

  const depth: Record<string, number> = {};
  const earliest = (s: Subject): number =>
    (depth[s.id] ??= s.requires.length ? 1 + Math.max(...s.requires.map((x) => earliest(byId[x]))) : 0);
  const col: Record<string, number> = {};
  const latest = (s: Subject): number => {
    if (col[s.id] !== undefined) return col[s.id];
    const kids = children(s.id);
    return (col[s.id] = kids.length ? Math.min(...kids.map(latest)) - 1 : earliest(s));
  };
  const linked = subjects.filter((s) => !isolated(s));
  linked.forEach(latest);

  const row: Record<string, number> = {};
  const last = Math.max(...linked.map((s) => col[s.id]));
  for (let c = last; c >= 0; c--) {
    const here = linked.filter((s) => col[s.id] === c);
    const want = (s: Subject) => {
      const kids = children(s.id);
      return kids.length ? kids.reduce((a, k) => a + row[k.id], 0) / kids.length : null;
    };
    // Leaves (in book order) take the free slots; everything else is centred on its children.
    const placed = here.map((s) => ({ s, y: want(s) }));
    let free = 0;
    for (const p of placed) if (p.y === null) p.y = free++;
    placed.sort((a, b) => a.y! - b.y!);
    for (let i = 1; i < placed.length; i++) placed[i].y = Math.max(placed[i].y!, placed[i - 1].y! + 1);
    for (const p of placed) row[p.s.id] = p.y!;
  }

  // Unconnected subjects fill the first free whole-number slots of the first column.
  const taken = linked.filter((s) => col[s.id] === 0).map((s) => row[s.id]);
  let slot = 0;
  for (const s of subjects.filter(isolated)) {
    while (taken.some((y) => Math.abs(y - slot) < 1)) slot++;
    col[s.id] = 0;
    row[s.id] = slot;
    taken.push(slot);
  }
  const top = Math.min(...Object.values(row));
  for (const id in row) row[id] -= top;
  return { col, row };
}

/** Split a long name over two lines at the space nearest the middle. */
function lines(name: string, maxChars: number): string[] {
  if (name.length <= maxChars) return [name];
  const spaces = [...name.matchAll(/ /g)].map((m) => m.index!);
  if (!spaces.length) return [name];
  const cut = spaces.reduce((a, b) => (Math.abs(b - name.length / 2) < Math.abs(a - name.length / 2) ? b : a));
  return [name.slice(0, cut), name.slice(cut + 1)];
}

/** Subjects as a graph, arrows from what each builds on. Turns vertical on narrow screens. */
export function SubjectMap({ onPick, selected }: { onPick(id: string): void; selected?: string | null }) {
  const { states } = useData();
  const box = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setNarrow(el.clientWidth < 620));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = narrow ? NARROW : WIDE;
  const { col, row } = layout(SUBJECTS);
  const pos: Record<string, { x: number; y: number }> = {};
  for (const s of SUBJECTS) {
    const along = col[s.id] * ((narrow ? g.h : g.w) + g.gapAcross);
    const across = row[s.id] * ((narrow ? g.w : g.h) + g.gapAlong);
    pos[s.id] = narrow ? { x: across, y: along } : { x: along, y: across };
  }
  const width = Math.max(...Object.values(pos).map((p) => p.x)) + g.w;
  const height = Math.max(...Object.values(pos).map((p) => p.y)) + g.h;

  const edge = (from: string, to: string) => {
    const a = pos[from];
    const b = pos[to];
    if (narrow) {
      const [x1, y1, x2, y2] = [a.x + g.w / 2, a.y + g.h, b.x + g.w / 2, b.y - 3];
      const m = (y1 + y2) / 2;
      return `M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2}`;
    }
    const [x1, y1, x2, y2] = [a.x + g.w, a.y + g.h / 2, b.x - 3, b.y + g.h / 2];
    const m = (x1 + x2) / 2;
    return `M${x1},${y1} C${m},${y1} ${m},${y2} ${x2},${y2}`;
  };
  const focus = hover ?? selected ?? null;

  return (
    <div className={`subject-map ${narrow ? 'narrow' : ''}`} ref={box}>
      <svg viewBox={`-4 -4 ${width + 8} ${height + 8}`} style={{ maxWidth: width + 8 }} role="img" aria-label="Subject map">
        <defs>
          <marker id="map-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M1,1.5 L8,5 L1,8.5" className="map-arrowhead" />
          </marker>
          <marker id="map-arrow-hot" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M1,1.5 L8,5 L1,8.5" className="map-arrowhead hot" />
          </marker>
        </defs>
        {SUBJECTS.flatMap((s) =>
          s.requires.map((r) => {
            const hot = focus === r || focus === s.id;
            return <path key={`${r}-${s.id}`} d={edge(r, s.id)} className={`map-edge ${hot ? 'hot' : ''}`} markerEnd={`url(#map-arrow${hot ? '-hot' : ''})`} />;
          }),
        )}
        {SUBJECTS.map((s) => {
          const p = pos[s.id];
          const prog = subjectProgress(s, states);
          const name = lines(s.name, narrow ? 15 : 26);
          const sections = s.chapters.reduce((n, c) => n + c.skills.length, 0);
          // Narrow cards put the percentage beside the bar, leaving the title line to the name.
          const barW = g.w - 28 - (narrow && prog > 0 ? 34 : 0);
          return (
            <g
              key={s.id}
              transform={`translate(${p.x},${p.y})`}
              className={`map-node ${selected === s.id ? 'selected' : ''} ${prog >= 1 ? 'done' : ''}`}
              onClick={() => onPick(s.id)}
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              role="button"
              tabIndex={0}
              aria-label={`${s.name}, ${Math.round(prog * 100)}%`}
              onKeyDown={(e) => e.key === 'Enter' && onPick(s.id)}
            >
              <title>{s.blurb}</title>
              <rect className="map-card" width={g.w} height={g.h} rx={10} />
              <text x={14} y={name.length > 1 ? 21 : 25} className="map-title">
                {name.map((l, i) => (
                  <tspan key={i} x={14} dy={i ? 16 : 0}>
                    {l}
                  </tspan>
                ))}
              </text>
              {!narrow && name.length === 1 && (
                <text x={14} y={43} className="map-meta">
                  {s.chapters.length} chapters · {sections} sections
                </text>
              )}
              {prog > 0 && (
                <text x={g.w - 14} y={narrow ? g.h - 6 : 43} textAnchor="end" className="map-pct">
                  {Math.round(prog * 100)}%
                </text>
              )}
              <rect x={14} y={g.h - 10} width={barW} height={3} rx={1.5} className="map-track" />
              {prog > 0 && <rect x={14} y={g.h - 10} width={Math.max(3, barW * prog)} height={3} rx={1.5} className="map-fill" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
