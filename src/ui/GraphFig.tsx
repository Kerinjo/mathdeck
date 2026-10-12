import type { GraphFigure } from '../core/types';

const R = 4.2;

/** A small graph drawing; scales to the card width. */
export function GraphFig({ fig }: { fig: GraphFigure }) {
  const P = (i: number) => ({ x: 8 + fig.nodes[i].x * 84, y: 6 + fig.nodes[i].y * 58 });
  return (
    <svg className="graph-fig" viewBox="0 0 100 70" role="img" aria-label="Graph">
      <defs>
        <marker id="g-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" className="g-arrowhead" />
        </marker>
      </defs>
      {fig.edges.map((e, i) => {
        const a = P(e.a);
        const b = P(e.b);
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len];
        const end = fig.directed ? { x: b.x - ux * (R + 0.6), y: b.y - uy * (R + 0.6) } : b;
        // Labels sit 40% along the edge, not at the midpoint, so edges crossing in the middle don't stack them.
        const mid = { x: a.x + (b.x - a.x) * 0.4 - uy * 1.6, y: a.y + (b.y - a.y) * 0.4 + ux * 1.6 };
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={end.x} y2={end.y} className="g-edge" markerEnd={fig.directed ? 'url(#g-arrow)' : undefined} />
            {e.label && (
              <text x={mid.x} y={mid.y} className="g-weight" textAnchor="middle" dominantBaseline="central">
                {e.label}
              </text>
            )}
          </g>
        );
      })}
      {fig.nodes.map((nd, i) => {
        const p = P(i);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={R} className="g-node" />
            <text x={p.x} y={p.y} className="g-label" textAnchor="middle" dominantBaseline="central">
              {nd.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
