// Small-graph algorithms for generating and grading graph theory exercises.
// Vertices are 0..n-1 and are shown as letters A, B, C, ... Ties are always broken alphabetically.

import { det, mat } from './frac';
import type { GraphFigure, Rng } from './types';

export interface Edge {
  u: number;
  v: number;
  w?: number;
}

export interface Graph {
  n: number;
  edges: Edge[];
  directed?: boolean;
}

export const L = (i: number) => String.fromCharCode(65 + i);

export function adj(g: Graph): number[][] {
  const a = Array.from({ length: g.n }, () => [] as number[]);
  for (const { u, v } of g.edges) {
    a[u].push(v);
    if (!g.directed) a[v].push(u);
  }
  return a.map((xs) => [...new Set(xs)].sort((x, y) => x - y));
}

export const degree = (g: Graph, v: number) => g.edges.filter((e) => e.u === v || e.v === v).length;

export function adjMatrix(g: Graph): number[][] {
  const m = Array.from({ length: g.n }, () => Array(g.n).fill(0));
  for (const { u, v } of g.edges) {
    m[u][v] += 1;
    if (!g.directed) m[v][u] += 1;
  }
  return m;
}

export function bfsOrder(g: Graph, s: number): number[] {
  const a = adj(g);
  const seen = new Set([s]);
  const order = [s];
  for (let i = 0; i < order.length; i++)
    for (const w of a[order[i]])
      if (!seen.has(w)) {
        seen.add(w);
        order.push(w);
      }
  return order;
}

export function dfsOrder(g: Graph, s: number): number[] {
  const a = adj(g);
  const seen = new Set<number>();
  const order: number[] = [];
  const go = (v: number) => {
    seen.add(v);
    order.push(v);
    for (const w of a[v]) if (!seen.has(w)) go(w);
  };
  go(s);
  return order;
}

export function bfsDist(g: Graph, s: number): number[] {
  const a = adj(g);
  const d = Array(g.n).fill(Infinity);
  d[s] = 0;
  const q = [s];
  for (let i = 0; i < q.length; i++) for (const w of a[q[i]]) if (d[w] === Infinity) ((d[w] = d[q[i]] + 1), q.push(w));
  return d;
}

export const components = (g: Graph) => {
  const seen = new Set<number>();
  let c = 0;
  for (let v = 0; v < g.n; v++)
    if (!seen.has(v)) {
      c++;
      bfsOrder(g, v).forEach((x) => seen.add(x));
    }
  return c;
};

export const connected = (g: Graph) => components(g) === 1;

/** Dijkstra: distances, and the predecessor on a shortest path. */
export function dijkstra(g: Graph, s: number) {
  const dist = Array(g.n).fill(Infinity);
  const prev = Array(g.n).fill(-1);
  const done = Array(g.n).fill(false);
  const order: number[] = [];
  dist[s] = 0;
  for (;;) {
    let u = -1;
    for (let v = 0; v < g.n; v++) if (!done[v] && dist[v] < Infinity && (u < 0 || dist[v] < dist[u])) u = v;
    if (u < 0) break;
    done[u] = true;
    order.push(u);
    for (const e of g.edges) {
      const ends = e.u === u ? [e.v] : !g.directed && e.v === u ? [e.u] : [];
      for (const w of ends)
        if (dist[u] + (e.w ?? 1) < dist[w]) {
          dist[w] = dist[u] + (e.w ?? 1);
          prev[w] = u;
        }
    }
  }
  return { dist, prev, order };
}

export function pathTo(prev: number[], t: number): number[] {
  const p = [t];
  while (prev[p[0]] >= 0) p.unshift(prev[p[0]]);
  return p;
}

/** Number of distinct shortest paths from s to t (to reject ambiguous questions). */
export function countShortest(g: Graph, s: number, t: number) {
  const { dist } = dijkstra(g, s);
  const memo = new Map<number, number>();
  const count = (v: number): number => {
    if (v === s) return 1;
    if (memo.has(v)) return memo.get(v)!;
    let c = 0;
    for (const e of g.edges) {
      const pairs = g.directed ? [[e.u, e.v]] : [[e.u, e.v], [e.v, e.u]];
      for (const [a, b] of pairs) if (b === v && dist[a] + (e.w ?? 1) === dist[v]) c += count(a);
    }
    memo.set(v, c);
    return c;
  };
  return count(t);
}

/** Kruskal: MST edges in the order they are added. Weights should be distinct. */
export function kruskal(g: Graph): Edge[] {
  const parent = Array.from({ length: g.n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const out: Edge[] = [];
  for (const e of [...g.edges].sort((a, b) => (a.w ?? 1) - (b.w ?? 1))) {
    const [a, b] = [find(e.u), find(e.v)];
    if (a !== b) {
      parent[a] = b;
      out.push(e);
    }
  }
  return out;
}

/** Prim from s: vertices in the order they join the tree. */
export function primOrder(g: Graph, s: number): number[] {
  const inTree = new Set([s]);
  const order = [s];
  while (inTree.size < g.n) {
    let best: Edge | null = null;
    for (const e of g.edges)
      if (inTree.has(e.u) !== inTree.has(e.v) && (!best || (e.w ?? 1) < (best.w ?? 1))) best = e;
    if (!best) break;
    const v = inTree.has(best.u) ? best.v : best.u;
    inTree.add(v);
    order.push(v);
  }
  return order;
}

export function isBipartite(g: Graph): boolean {
  const a = adj(g);
  const col = Array(g.n).fill(-1);
  for (let s = 0; s < g.n; s++) {
    if (col[s] >= 0) continue;
    col[s] = 0;
    const q = [s];
    for (let i = 0; i < q.length; i++)
      for (const w of a[q[i]]) {
        if (col[w] < 0) {
          col[w] = 1 - col[q[i]];
          q.push(w);
        } else if (col[w] === col[q[i]]) return false;
      }
  }
  return true;
}

/** Smallest k with a proper k-colouring (brute force, fine for n <= 8). */
export function chromatic(g: Graph): number {
  const a = adj(g);
  for (let k = 1; k <= g.n; k++) {
    const col = Array(g.n).fill(-1);
    const go = (v: number): boolean => {
      if (v === g.n) return true;
      for (let c = 0; c < k; c++)
        if (a[v].every((w) => col[w] !== c)) {
          col[v] = c;
          if (go(v + 1)) return true;
          col[v] = -1;
        }
      return false;
    };
    if (go(0)) return k;
  }
  return g.n;
}

export function hasHamiltonCycle(g: Graph): boolean {
  if (g.n < 3) return false;
  const a = adj(g);
  const used = Array(g.n).fill(false);
  used[0] = true;
  const go = (v: number, count: number): boolean => {
    if (count === g.n) return a[v].includes(0);
    for (const w of a[v])
      if (!used[w]) {
        used[w] = true;
        if (go(w, count + 1)) return true;
        used[w] = false;
      }
    return false;
  };
  return go(0, 1);
}

/** 'circuit' if every degree is even, 'path' if exactly two are odd, else 'neither' (graph assumed connected). */
export function eulerKind(g: Graph): 'circuit' | 'path' | 'neither' {
  const odd = Array.from({ length: g.n }, (_, v) => degree(g, v)).filter((d) => d % 2).length;
  if (!connected(g)) return 'neither';
  return odd === 0 ? 'circuit' : odd === 2 ? 'path' : 'neither';
}

/** Maximum matching in a bipartite graph with parts `left` (augmenting paths). */
export function maxMatching(g: Graph, left: number[]): number {
  const a = adj(g);
  const match = Array(g.n).fill(-1);
  const tryV = (u: number, seen: Set<number>): boolean => {
    for (const w of a[u]) {
      if (seen.has(w)) continue;
      seen.add(w);
      if (match[w] < 0 || tryV(match[w], seen)) {
        match[w] = u;
        return true;
      }
    }
    return false;
  };
  return left.reduce((c, u) => c + (tryV(u, new Set()) ? 1 : 0), 0);
}

/** Max flow from s to t (Edmonds–Karp); edge weights are capacities. */
export function maxFlow(g: Graph, s: number, t: number): number {
  const cap = Array.from({ length: g.n }, () => Array(g.n).fill(0));
  for (const e of g.edges) cap[e.u][e.v] += e.w ?? 1;
  let flow = 0;
  for (;;) {
    const prev = Array(g.n).fill(-1);
    prev[s] = s;
    const q = [s];
    for (let i = 0; i < q.length && prev[t] < 0; i++)
      for (let v = 0; v < g.n; v++) if (prev[v] < 0 && cap[q[i]][v] > 0) ((prev[v] = q[i]), q.push(v));
    if (prev[t] < 0) return flow;
    let f = Infinity;
    for (let v = t; v !== s; v = prev[v]) f = Math.min(f, cap[prev[v]][v]);
    for (let v = t; v !== s; v = prev[v]) {
      cap[prev[v]][v] -= f;
      cap[v][prev[v]] += f;
    }
    flow += f;
  }
}

/** Kirchhoff's matrix-tree theorem: any cofactor of the Laplacian. */
export function spanningTrees(g: Graph): number {
  const m = adjMatrix(g);
  const lap = m.map((row, i) => row.map((x, j) => (i === j ? row.reduce((a, b) => a + b, 0) : -x)));
  const minor = lap.slice(1).map((row) => row.slice(1));
  return det(mat(minor)).value();
}

// ---------------------------------------------------------------------------
// Random graphs

/** Connected simple graph: a random spanning tree plus `extra` random edges. */
export function randomConnected(r: Rng, n: number, extra: number, weights?: [number, number]): Graph {
  const edges: Edge[] = [];
  const has = (u: number, v: number) => edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u));
  const order = r.shuffle([...Array(n).keys()]);
  for (let i = 1; i < n; i++) edges.push({ u: order[r.int(0, i - 1)], v: order[i] });
  const maxEdges = (n * (n - 1)) / 2;
  for (let k = 0; k < extra && edges.length < maxEdges; ) {
    const u = r.int(0, n - 1);
    const v = r.int(0, n - 1);
    if (u === v || has(u, v)) continue;
    edges.push({ u, v });
    k++;
  }
  const norm = edges.map((e) => (e.u < e.v ? e : { u: e.v, v: e.u })).sort((a, b) => a.u - b.u || a.v - b.v);
  if (weights) {
    const pool = r.shuffle(Array.from({ length: weights[1] - weights[0] + 1 }, (_, i) => weights[0] + i));
    norm.forEach((e, i) => (e.w = pool[i % pool.length]));
  }
  return { n, edges: norm };
}

// ---------------------------------------------------------------------------
// Figures

/** Vertices on a circle, A at the top, clockwise. */
export function circleFigure(g: Graph, opts: { weights?: boolean } = {}): GraphFigure {
  const nodes = Array.from({ length: g.n }, (_, i) => {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / g.n;
    return { label: L(i), x: 0.5 + 0.42 * Math.cos(t), y: 0.5 + 0.42 * Math.sin(t) };
  });
  return figure(g, nodes, opts);
}

/** Two columns, for bipartite graphs. */
export function bipartiteFigure(g: Graph, left: number[], right: number[]): GraphFigure {
  const nodes: GraphFigure['nodes'] = Array(g.n);
  left.forEach((v, i) => (nodes[v] = { label: L(v), x: 0.2, y: (i + 0.5) / left.length }));
  right.forEach((v, i) => (nodes[v] = { label: L(v), x: 0.8, y: (i + 0.5) / right.length }));
  return figure(g, nodes, {});
}

/** Columns given explicitly (for flow networks laid out left to right). */
export function layeredFigure(g: Graph, layers: number[][], labels?: string[]): GraphFigure {
  const nodes: GraphFigure['nodes'] = Array(g.n);
  layers.forEach((col, i) =>
    col.forEach((v, j) => (nodes[v] = { label: labels?.[v] ?? L(v), x: 0.08 + (0.84 * i) / (layers.length - 1), y: (j + 0.5) / col.length })),
  );
  return figure(g, nodes, { weights: true });
}

function figure(g: Graph, nodes: GraphFigure['nodes'], opts: { weights?: boolean }): GraphFigure {
  return {
    kind: 'graph',
    nodes,
    edges: g.edges.map((e) => ({ a: e.u, b: e.v, label: opts.weights && e.w !== undefined ? `${e.w}` : undefined })),
    directed: g.directed,
  };
}
