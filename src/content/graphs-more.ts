// Graph Theory: widened levels, structural sections and the chapter list.
import { adj, bfsDist, bipartiteFigure, circleFigure, components, countShortest, degree, L, maxMatching, randomConnected, type Edge, type Graph } from '../core/graph';
import type { Chapter, GraphFigure, Problem, Rng, Skill } from '../core/types';
import { mix } from './calc-helpers';
import { directed, pruferCodes } from './cs-deeper';
import { coloring, degrees, euler, levin, listL, matching, matrices, mcs, mst, num, planarity, randomBipartite, shortest, traversal, trees, wiki, yesNo } from './graphs';

type Gen = (r: Rng) => Problem;

const C2 = (n: number) => (n * (n - 1)) / 2;
const hasEdge = (g: Graph, u: number, v: number) => g.edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u));
const norm = (edges: Edge[]) => edges.map((e) => (e.u < e.v ? e : { u: e.v, v: e.u })).sort((a, b) => a.u - b.u || a.v - b.v);

function permutations(n: number): number[][] {
  if (n === 0) return [[]];
  return permutations(n - 1).flatMap((p) => Array.from({ length: n }, (_, i) => [...p.slice(0, i), n - 1, ...p.slice(i)]));
}
const PERMS: Record<number, number[][]> = {};
function isomorphic(g: Graph, h: Graph) {
  if (g.n !== h.n || g.edges.length !== h.edges.length) return false;
  const dg = Array.from({ length: g.n }, (_, v) => degree(g, v)).sort().join();
  const dh = Array.from({ length: h.n }, (_, v) => degree(h, v)).sort().join();
  if (dg !== dh) return false;
  const perms = (PERMS[g.n] ??= permutations(g.n));
  return perms.some((p) => g.edges.every((e) => hasEdge(h, p[e.u], p[e.v])));
}
const triangles = (g: Graph) => {
  let c = 0;
  for (let a = 0; a < g.n; a++) for (let b = a + 1; b < g.n; b++) for (let d = b + 1; d < g.n; d++) if (hasEdge(g, a, b) && hasEdge(g, b, d) && hasEdge(g, a, d)) c++;
  return c;
};
const degSeq = (g: Graph) => Array.from({ length: g.n }, (_, v) => degree(g, v)).sort((a, b) => b - a);

/** Random simple graph with n vertices and m edges (not necessarily connected). */
function randomGraph(r: Rng, n: number, m: number): Graph {
  const all: Edge[] = [];
  for (let u = 0; u < n; u++) for (let v = u + 1; v < n; v++) all.push({ u, v });
  return { n, edges: norm(r.shuffle(all).slice(0, m)) };
}
function relabel(g: Graph, p: number[]): Graph {
  return { n: g.n, edges: norm(g.edges.map((e) => ({ u: p[e.u], v: p[e.v] }))) };
}

/** Two graphs side by side in one figure: the first labelled A…, the second continuing the alphabet. */
function pairFigure(g: Graph, h: Graph): GraphFigure {
  const ring = (n: number, cx: number, off: number) =>
    Array.from({ length: n }, (_, i) => {
      const t = -Math.PI / 2 + (2 * Math.PI * i) / n;
      return { label: L(off + i), x: cx + 0.17 * Math.cos(t), y: 0.5 + ((0.17 * 84) / 58) * Math.sin(t) };
    });
  return {
    kind: 'graph',
    nodes: [...ring(g.n, 0.21, 0), ...ring(h.n, 0.79, g.n)],
    edges: [...g.edges.map((e) => ({ a: e.u, b: e.v })), ...h.edges.map((e) => ({ a: e.u + g.n, b: e.v + g.n }))],
  };
}
const span = (off: number, n: number) => `${L(off)}–${L(off + n - 1)}`;

/** A reason two graphs differ, among easy invariants. */
function difference(g: Graph, h: Graph): string {
  if (g.edges.length !== h.edges.length) return `They have different numbers of edges (${g.edges.length} and ${h.edges.length}).`;
  if (degSeq(g).join() !== degSeq(h).join()) return `Their degree sequences differ: $(${degSeq(g).join(', ')})$ and $(${degSeq(h).join(', ')})$.`;
  if (triangles(g) !== triangles(h)) return `Same degrees, but one has ${triangles(g)} triangle${triangles(g) === 1 ? '' : 's'} and the other ${triangles(h)}.`;
  if (components(g) !== components(h)) return `One is connected and the other is not (${components(g)} vs ${components(h)} components).`;
  const nb = (x: Graph) =>
    Array.from({ length: x.n }, (_, v) => adj(x)[v].map((w) => degree(x, w)).sort().join(''))
      .sort()
      .join('|');
  if (nb(g) !== nb(h)) return 'Same degrees and triangles, but the degrees of each vertex’s neighbours do not match up: look at how the high-degree vertices are joined.';
  return 'Checking every relabelling finds no edge-preserving one.';
}

// ---------------------------------------------------------------------------
// Basics: handshake puzzles, isomorphism

const handshake: Gen = (r) => {
  if (r.next() < 0.5) {
    const n = r.int(5, 11);
    const d = r.int(1, n - 2);
    const ok = (n * d) % 2 === 0;
    return {
      prompt: `At a party of ${n} people, can everyone shake hands with exactly ${d} other${d === 1 ? '' : 's'}?`,
      answer: yesNo(ok),
      solution: ok
        ? [`The degree sum would be $${n}\\cdot ${d} = ${n * d}$, which is even; a ${d}-regular graph on ${n} vertices exists (e.g. join each person to the next ${d} around a circle${d % 2 ? ', plus the person opposite' : ''}).`]
        : [`The degree sum would be $${n}\\cdot ${d} = ${n * d}$, which is odd. The handshake lemma says it must be twice the number of handshakes: impossible.`],
    };
  }
  const d = r.int(2, 6);
  const n = 2 * r.int(3, 10);
  const m = (n * d) / 2;
  return {
    prompt: `A graph has ${m} edges and every vertex has degree ${d}. How many vertices does it have?`,
    answer: num(n),
    solution: [`Handshake lemma: $${d}n = 2\\cdot ${m}$.`, `$n = ${n}$`],
  };
};

const SMALL_GRAPHS: Record<number, number[]> = { 3: [1, 1, 1, 1], 4: [1, 1, 2, 3, 2, 1, 1] };

const isomorphism: Skill = {
  id: 'gt.iso',
  name: 'Isomorphism and invariants',
  prereqs: ['gt.degrees'],
  levels: [
    {
      name: 'invariants',
      generate: mix(
        (r) => {
          let g: Graph;
          // Few enough triangles to count from a drawing.
          do g = randomConnected(r, r.int(5, 6), r.int(3, 6));
          while (triangles(g) > 5);
          const t = triangles(g);
          return {
            prompt: 'How many triangles (sets of three mutually adjacent vertices) does this graph have?',
            figure: circleFigure(g),
            answer: num(t),
            solution: ['For each edge, look for vertices adjacent to both ends; each triangle is found three times that way.', `${t} triangle${t === 1 ? '' : 's'}.`],
          };
        },
        (r) => {
          const g = randomConnected(r, r.int(5, 7), r.int(1, 5));
          const c = C2(g.n) - g.edges.length;
          return {
            prompt: 'How many edges does the complement of this graph have (same vertices, joined exactly when they are not joined here)?',
            figure: circleFigure(g),
            answer: num(c),
            solution: [`${g.n} vertices have $\\binom{${g.n}}{2} = ${C2(g.n)}$ possible edges, and ${g.edges.length} are used.`, `$${C2(g.n)} - ${g.edges.length} = ${c}$`],
          };
        },
        (r) => {
          const n = r.pick([3, 4]);
          const m = r.int(0, C2(n));
          return {
            prompt: `How many non-isomorphic simple graphs have ${n} vertices and ${m} edge${m === 1 ? '' : 's'}?`,
            answer: num(SMALL_GRAPHS[n][m]),
            solution: [
              n === 4
                ? 'On 4 vertices: 0 or 6 edges, 1 each; 1 or 5 edges, 1 each; 2 edges: adjacent or disjoint (2); 3 edges: triangle, path or star (3); 4 edges: the 4-cycle or a triangle with a pendant edge (2).'
                : 'On 3 vertices a graph is determined up to isomorphism by its number of edges.',
              `So ${SMALL_GRAPHS[n][m]}.`,
            ],
          };
        },
      ),
    },
    {
      name: 'isomorphic or not?',
      generate(r) {
        const n = r.int(4, 6);
        const g = randomGraph(r, n, r.int(n - 1, n + 2));
        const same = r.next() < 0.5;
        let h = relabel(g, r.shuffle([...Array(n).keys()]));
        if (!same) {
          do h = randomGraph(r, n, g.edges.length + r.pick([0, 0, 1, -1]));
          while (isomorphic(g, h) || h.edges.length < 1);
        }
        return {
          prompt: `Are the graph on ${span(0, n)} and the graph on ${span(n, n)} isomorphic?`,
          figure: pairFigure(g, h),
          answer: yesNo(same),
          solution: same ? ['Yes: match vertices of equal degree and check that edges correspond.', 'A relabelling that maps edges to edges exists (both are drawings of the same graph).'] : [difference(g, h)],
          selfCheck: () => isomorphic(g, h) === same,
        };
      },
    },
    {
      name: 'same degrees, same graph?',
      generate(r) {
        for (;;) {
          const n = 6;
          const g = randomGraph(r, n, r.int(6, 9));
          const same = r.next() < 0.4;
          let h: Graph | null = same ? relabel(g, r.shuffle([...Array(n).keys()])) : null;
          if (!same) {
            // Double edge swap: ab, cd -> ac, bd keeps every degree.
            for (let tries = 0; tries < 40 && !h; tries++) {
              const [e1, e2] = r.shuffle([...g.edges]).slice(0, 2);
              const [a, b, c, d] = [e1.u, e1.v, e2.u, e2.v];
              if (new Set([a, b, c, d]).size < 4 || hasEdge(g, a, c) || hasEdge(g, b, d)) continue;
              const cand: Graph = { n, edges: norm([...g.edges.filter((e) => e !== e1 && e !== e2), { u: a, v: c }, { u: b, v: d }]) };
              if (!isomorphic(g, cand)) h = relabel(cand, r.shuffle([...Array(n).keys()]));
            }
            if (!h) continue;
          }
          return {
            prompt: `Both graphs have the same degree sequence $(${degSeq(g).join(', ')})$. Are the graph on ${span(0, n)} and the graph on ${span(n, n)} isomorphic?`,
            figure: pairFigure(g, h!),
            answer: yesNo(same),
            solution: same ? ['Yes: there is a relabelling that maps edges to edges.', 'Equal degree sequences are necessary, not sufficient, so you still have to find the matching.'] : [difference(g, h!), 'Equal degree sequences are necessary for isomorphism, but not sufficient.'],
            selfCheck: () => isomorphic(g, h!) === same && degSeq(g).join() === degSeq(h!).join(),
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'Two graphs are isomorphic if some relabelling of the vertices maps edges exactly to edges: they are the same graph drawn differently. To show they are not, find an invariant that differs: number of edges, degree sequence, number of triangles or cycles of a given length, connectivity, how vertices of each degree are joined. To show they are, exhibit the relabelling.',
    resources: [levin('sec_gt-intro', 'Graph Theory: Definitions (isomorphism)'), wiki('Graph_isomorphism', 'Graph isomorphism'), mcs],
  },
};

const degreesDeep: Skill = { ...degrees, levels: [degrees.levels[0], { name: 'degree sequences and handshakes', generate: mix(degrees.levels[1].generate, handshake) }, degrees.levels[2]] };

// ---------------------------------------------------------------------------
// Paths: counting shortest paths, distances and connectivity

const countPaths: Gen = (r) => {
  for (;;) {
    const g = randomConnected(r, r.int(6, 8), r.int(3, 6));
    const t = r.int(1, g.n - 1);
    const d = bfsDist(g, 0)[t];
    const c = countShortest(g, 0, t);
    if (d < 2 || c < 2) continue;
    return {
      prompt: `How many different shortest paths are there from A to ${L(t)}?`,
      figure: circleFigure(g),
      answer: num(c),
      hint: 'Label every vertex with its distance from A; the number of shortest paths to a vertex is the sum over its neighbours one step closer.',
      solution: [`The distance is ${d}. Count layer by layer: each vertex gets the sum of the counts of its neighbours one layer closer to A.`, `${c} shortest paths reach ${L(t)}.`],
    };
  }
};

const cutVertices = (g: Graph) =>
  Array.from({ length: g.n }, (_, v) => v).filter((v) => {
    const keep = Array.from({ length: g.n }, (_, i) => i).filter((i) => i !== v);
    const idx = new Map(keep.map((x, i) => [x, i]));
    const h: Graph = { n: g.n - 1, edges: g.edges.filter((e) => e.u !== v && e.v !== v).map((e) => ({ u: idx.get(e.u)!, v: idx.get(e.v)! })) };
    return components(h) > components(g);
  });
const bridges = (g: Graph) => g.edges.filter((e) => components({ n: g.n, edges: g.edges.filter((f) => f !== e) }) > components(g));

const distances: Skill = {
  id: 'gt.distance',
  name: 'Distances and connectivity',
  prereqs: ['gt.shortest'],
  levels: [
    {
      name: 'eccentricity, radius, diameter',
      generate(r) {
        const g = randomConnected(r, r.int(6, 8), r.int(0, 3));
        const ecc = Array.from({ length: g.n }, (_, v) => Math.max(...bfsDist(g, v)));
        const kind = r.int(0, 2);
        const v = r.int(0, g.n - 1);
        const ans = kind === 0 ? ecc[v] : kind === 1 ? Math.min(...ecc) : Math.max(...ecc);
        return {
          prompt: kind === 0 ? `What is the eccentricity of ${L(v)} (its distance to the farthest vertex)?` : `What is the ${kind === 1 ? 'radius (smallest eccentricity)' : 'diameter (largest distance between two vertices)'} of this graph?`,
          figure: circleFigure(g),
          answer: num(ans),
          solution: [`Eccentricities: ${ecc.map((e, i) => `${L(i)}: ${e}`).join(', ')} (BFS from each vertex).`, kind === 0 ? `${L(v)}: ${ans}` : `${kind === 1 ? 'Smallest' : 'Largest'}: ${ans}`],
        };
      },
    },
    {
      name: 'cut vertices and bridges',
      generate(r) {
        const g = randomConnected(r, r.int(6, 8), r.int(1, 3));
        const askBridges = r.next() < 0.5;
        const cv = cutVertices(g);
        const br = bridges(g);
        return {
          prompt: askBridges ? 'How many bridges does this graph have (edges whose removal disconnects it)?' : 'How many cut vertices does this graph have (vertices whose removal disconnects it)?',
          figure: circleFigure(g),
          answer: num(askBridges ? br.length : cv.length),
          solution: askBridges
            ? ['An edge is a bridge exactly when it lies on no cycle.', br.length ? `Bridges: ${br.map((e) => L(e.u) + L(e.v)).join(', ')}.` : 'Every edge lies on a cycle: none.']
            : ['A vertex is a cut vertex when removing it (and its edges) leaves more components.', cv.length ? `Cut vertices: ${listL(cv)}.` : 'None.'],
        };
      },
    },
    {
      name: 'how many edges force connectivity?',
      generate(r) {
        const n = r.int(5, 15);
        const k = r.int(2, 4);
        const m = r.int(n, C2(n) - 1);
        const pool: { q: string; a: number; why: string }[] = [
          { q: `What is the largest number of edges a disconnected simple graph on ${n} vertices can have?`, a: C2(n - 1), why: `Take $K_{${n - 1}}$ plus an isolated vertex: $\\binom{${n - 1}}{2} = ${C2(n - 1)}$. Any more edges and it must be connected.` },
          { q: `What is the smallest number of edges that guarantees a simple graph on ${n} vertices is connected?`, a: C2(n - 1) + 1, why: `A disconnected graph has at most $\\binom{${n - 1}}{2} = ${C2(n - 1)}$ edges, so one more forces connectivity.` },
          { q: `What is the smallest number of edges a connected graph on ${n} vertices can have?`, a: n - 1, why: 'A spanning tree: $n - 1$ edges, and fewer cannot connect everything.' },
          { q: `A forest has ${n} vertices and ${k} trees. How many edges does it have?`, a: n - k, why: `Each tree has one edge fewer than vertices: $${n} - ${k}$.` },
          { q: `A simple graph has ${n} vertices and ${m} edges. How many edges does its complement have?`, a: C2(n) - m, why: `$\\binom{${n}}{2} - ${m} = ${C2(n) - m}$` },
        ];
        const p = r.pick(pool);
        return { prompt: p.q, answer: num(p.a), solution: [p.why] };
      },
    },
  ],
  learn: {
    summary:
      'The eccentricity of a vertex is its distance to the farthest vertex; the radius and diameter are the smallest and largest eccentricities. A cut vertex or bridge is a vertex or edge whose removal disconnects the graph; an edge is a bridge exactly when it lies on no cycle. A connected graph on $n$ vertices needs at least $n - 1$ edges, and any graph with more than $\\binom{n-1}{2}$ edges is connected.',
    resources: [wiki('Distance_(graph_theory)', 'Distance (graph theory)'), wiki('Biconnected_component', 'Biconnected component'), levin('sec_gt-intro', 'Graph Theory: Definitions')],
  },
};

const shortestDeep: Skill = { ...shortest, levels: [{ name: 'unweighted distance and counting paths', generate: mix(shortest.levels[0].generate, countPaths) }, shortest.levels[1], shortest.levels[2]] };

// ---------------------------------------------------------------------------
// Trees: binary trees and forests

const binaryTrees: Gen = (r) => {
  const i = r.int(3, 40);
  const pool = [
    { q: `A full binary tree (every node has 0 or 2 children) has ${i} internal nodes. How many leaves does it have?`, a: i + 1, why: 'Every internal node adds 2 children: counting edges, $2i = (\\text{nodes}) - 1 = i + \\ell - 1$, so $\\ell = i + 1$.' },
    { q: `A full binary tree has ${i + 1} leaves. How many nodes does it have in total?`, a: 2 * i + 1, why: `It has ${i} internal nodes (one fewer than leaves), so $${i} + ${i + 1} = ${2 * i + 1}$.` },
    { q: `What is the largest number of leaves a binary tree of height ${i % 8 + 2} can have?`, a: 2 ** ((i % 8) + 2), why: `Each level can at most double: $2^{${i % 8 + 2}}$ leaves at the bottom level.` },
    { q: `What is the smallest possible height of a binary tree with ${i * 3} nodes?`, a: Math.ceil(Math.log2(i * 3 + 1)) - 1, why: `Height $h$ allows at most $2^{h+1} - 1$ nodes; the smallest $h$ with $2^{h+1} - 1 \\ge ${i * 3}$ is $${Math.ceil(Math.log2(i * 3 + 1)) - 1}$.` },
  ];
  const p = r.pick(pool);
  return { prompt: p.q, answer: num(p.a), solution: [p.why] };
};

const treesDeep: Skill = { ...trees, levels: [trees.levels[0], { name: 'counting leaves', generate: mix(trees.levels[1].generate, binaryTrees) }, trees.levels[2]] };

// ---------------------------------------------------------------------------
// Colouring: named graphs, cliques and covers

const namedChromatic: Gen = (r) => {
  const n = r.int(4, 11);
  const k = r.int(2, 5);
  const pool: [string, number, string][] = [
    [`the cycle $C_{${n}}$`, n % 2 ? 3 : 2, n % 2 ? 'An odd cycle cannot be 2-coloured: going around, colours must alternate and the parity fails at the end.' : 'An even cycle alternates two colours.'],
    [`the complete bipartite graph $K_{${k},${n}}$`, 2, 'Colour each side with its own colour.'],
    [`the hypercube $Q_{${k}}$`, 2, 'Colour vertices by the parity of the number of 1s in their label: every edge flips one bit.'],
    ['the Petersen graph', 3, 'It contains 5-cycles (odd), so at least 3; a 3-colouring exists.'],
    [`any tree with ${n} vertices`, 2, 'Trees are bipartite: colour by depth parity from any root.'],
  ];
  const [what, v, why] = r.pick(pool);
  return { prompt: `What is the chromatic number of ${what}?`, answer: num(v), solution: [why, `$\\chi = ${v}$`] };
};

const coloringDeep: Skill = { ...coloring, levels: [coloring.levels[0], coloring.levels[1], { name: 'named graphs', generate: mix(coloring.levels[2].generate, namedChromatic) }] };

function cliqueNumber(g: Graph) {
  let best = 1;
  for (let mask = 1; mask < 1 << g.n; mask++) {
    const vs = Array.from({ length: g.n }, (_, i) => i).filter((i) => mask & (1 << i));
    if (vs.length > best && vs.every((a, i) => vs.slice(i + 1).every((b) => hasEdge(g, a, b)))) best = vs.length;
  }
  return best;
}
const complementOf = (g: Graph): Graph => {
  const edges: Edge[] = [];
  for (let u = 0; u < g.n; u++) for (let v = u + 1; v < g.n; v++) if (!hasEdge(g, u, v)) edges.push({ u, v });
  return { n: g.n, edges };
};

const cliques: Skill = {
  id: 'gt.cliques',
  name: 'Cliques, independent sets and covers',
  prereqs: ['gt.coloring'],
  levels: [
    {
      name: 'cliques',
      generate(r) {
        let g: Graph;
        // A clique of 3 or 4 inside a graph that is far from complete.
        do g = randomConnected(r, r.int(6, 7), r.int(3, 7));
        while (cliqueNumber(g) < 3 || cliqueNumber(g) > 4);
        const w = cliqueNumber(g);
        return {
          prompt: 'What is the size of the largest clique (set of mutually adjacent vertices) in this graph?',
          figure: circleFigure(g),
          answer: num(w),
          solution: ['Look for triangles first, then try to extend them by a vertex adjacent to all three.', `The largest clique has ${w} vertices. (So the chromatic number is at least ${w}.)`],
        };
      },
    },
    {
      name: 'independent sets',
      generate(r) {
        const g = randomConnected(r, r.int(5, 7), r.int(1, 6));
        const a = cliqueNumber(complementOf(g));
        return {
          prompt: 'What is the size of the largest independent set (vertices with no edges between them) in this graph?',
          figure: circleFigure(g),
          answer: num(a),
          solution: ['An independent set here is a clique in the complement. Greedily picking low-degree vertices gives a good start; then check nothing larger exists.', `The largest has ${a} vertices.`],
        };
      },
    },
    {
      name: 'vertex covers',
      generate: mix(
        (r) => {
          const g = randomConnected(r, r.int(5, 7), r.int(1, 6));
          const a = cliqueNumber(complementOf(g));
          return {
            prompt: 'What is the size of the smallest vertex cover (a set of vertices touching every edge) of this graph?',
            figure: circleFigure(g),
            answer: num(g.n - a),
            hint: 'The vertices outside a vertex cover form an independent set.',
            solution: [`A set is a vertex cover exactly when its complement is independent, so the smallest cover has $n - \\alpha = ${g.n} - ${a}$ vertices.`, `$${g.n - a}$`],
          };
        },
        (r) => {
          const { g, left, right } = randomBipartite(r, r.int(3, 4), r.int(3, 4), 0.45);
          const m = maxMatching(g, left);
          return {
            prompt: 'What is the size of the smallest vertex cover of this bipartite graph?',
            figure: bipartiteFigure(g, left, right),
            answer: num(m),
            hint: 'In bipartite graphs, König’s theorem links covers to matchings.',
            solution: ['König’s theorem: in a bipartite graph the minimum vertex cover has the same size as a maximum matching.', `A maximum matching has ${m} edges, so the smallest cover has ${m} vertices.`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'A clique is a set of pairwise adjacent vertices (size $\\omega$); an independent set has no edges inside (size $\\alpha$); a vertex cover touches every edge. A set is a vertex cover exactly when the remaining vertices are independent, so the minimum cover is $n - \\alpha$. Colouring needs at least $\\omega$ colours. In bipartite graphs, König’s theorem: minimum vertex cover = maximum matching.',
    resources: [wiki('Clique_(graph_theory)', 'Clique'), wiki('Independent_set_(graph_theory)', 'Independent set'), wiki('K%C5%91nig%27s_theorem_(graph_theory)', "König's theorem")],
  },
};

// ---------------------------------------------------------------------------
// Going deeper: extremal graphs and Ramsey theory

const turanEdges = (n: number, r: number) => {
  const sizes = Array.from({ length: r }, (_, i) => Math.floor(n / r) + (i < n % r ? 1 : 0));
  return { sizes, edges: C2(n) - sizes.reduce((s, x) => s + C2(x), 0) };
};
const RAMSEY: [string, number][] = [
  ['R(3, 3)', 6],
  ['R(3, 4)', 9],
  ['R(3, 5)', 14],
  ['R(4, 4)', 18],
  ['R(2, 7)', 7],
];

const extremal: Skill = {
  id: 'gt.extremal',
  name: 'Extremal graphs and Ramsey theory',
  prereqs: ['gt.cliques'],
  levels: [
    {
      name: 'triangle-free graphs',
      generate: mix(
        (r) => {
          const n = r.int(4, 20);
          return {
            prompt: `What is the largest number of edges a triangle-free simple graph on ${n} vertices can have?`,
            answer: num(Math.floor((n * n) / 4)),
            solution: ['Mantel’s theorem: at most $\\lfloor n^2/4 \\rfloor$, achieved by the complete bipartite graph with parts as equal as possible.', `$\\lfloor ${n * n}/4 \\rfloor = ${Math.floor((n * n) / 4)}$ ($K_{${Math.floor(n / 2)},${Math.ceil(n / 2)}}$)`],
          };
        },
        (r) => {
          const n = r.int(5, 14);
          const m = Math.floor((n * n) / 4) + r.int(-3, 3);
          const forced = m > Math.floor((n * n) / 4);
          return {
            prompt: `Must every simple graph with ${n} vertices and ${m} edges contain a triangle?`,
            answer: yesNo(forced),
            solution: [`Mantel: triangle-free graphs on ${n} vertices have at most $${Math.floor((n * n) / 4)}$ edges.`, forced ? `${m} exceeds that, so a triangle is forced.` : `${m} does not exceed it, so a triangle-free example exists (inside $K_{${Math.floor(n / 2)},${Math.ceil(n / 2)}}$).`],
          };
        },
      ),
    },
    {
      name: 'Turán’s theorem',
      generate(r) {
        const k = r.int(3, 5);
        const n = r.int(k + 2, 16);
        const t = turanEdges(n, k - 1);
        return {
          prompt: `What is the largest number of edges a simple graph on ${n} vertices can have without containing $K_{${k}}$?`,
          answer: num(t.edges),
          solution: [`Turán: the extremal graph splits the vertices into ${k - 1} parts as equal as possible (sizes ${t.sizes.join(', ')}) and joins every pair in different parts.`, `$\\binom{${n}}{2} - ${t.sizes.map((x) => `\\binom{${x}}{2}`).join(' - ')} = ${t.edges}$`],
        };
      },
    },
    {
      name: 'Ramsey numbers',
      generate: mix(
        (r) => {
          const n = r.int(3, 9);
          const forced = n >= 6;
          return {
            prompt: `Among any ${n} people, must there be 3 who all know each other or 3 who are all strangers?`,
            answer: yesNo(forced),
            solution: forced
              ? ['Yes: $R(3, 3) = 6$. Pick one person; of the other 5, at least 3 are friends or at least 3 are strangers with them, and those 3 finish the argument.']
              : ['No: colour the edges of a 5-cycle "friends" and the other 5 edges "strangers"; both colour classes are 5-cycles, with no triangle. $R(3,3) = 6 > 5$.'],
          };
        },
        (r) => {
          const [what, v] = r.pick(RAMSEY);
          return {
            prompt: `What is the Ramsey number $${what}$: the smallest $n$ such that every red/blue colouring of the edges of $K_n$ has a red $K_{${what[2]}}$ or a blue $K_{${what[5]}}$?`,
            answer: num(v),
            solution: [what === 'R(2, 7)' ? '$R(2, k) = k$: either some edge is red, or the whole $K_k$ is blue.' : 'This is one of the few known values; most Ramsey numbers are unknown (even $R(5, 5)$ is only bounded).', `$${what} = ${v}$`],
          };
        },
      ),
    },
  ],
  learn: {
    summary:
      'Extremal graph theory asks how many edges force a structure. Mantel: a triangle-free graph on $n$ vertices has at most $\\lfloor n^2/4 \\rfloor$ edges. Turán: avoiding $K_{r+1}$ allows at most the edges of the complete $r$-partite graph with near-equal parts. Ramsey: large enough complete graphs, however their edges are coloured, contain monochromatic cliques; $R(3,3) = 6$ (the party problem).',
    resources: [wiki('Tur%C3%A1n%27s_theorem', "Turán's theorem"), wiki('Ramsey%27s_theorem', "Ramsey's theorem"), mcs],
  },
};

// ---------------------------------------------------------------------------

export const graphChapters: Chapter[] = [
  {
    id: 'gt.ch.basics',
    title: 'Graph basics',
    about: 'Vertices, edges and degrees, the handshake lemma, special graphs, adjacency matrices, and when two graphs are the same.',
    why: 'Graphs model networks, dependencies, state machines and social connections; the adjacency matrix connects them to linear algebra.',
    resources: [levin('sec_gt-intro', 'Graph Theory: Definitions'), mcs],
    skills: [degreesDeep, matrices, isomorphism],
    deeper: [],
  },
  {
    id: 'gt.ch.paths',
    title: 'Paths and traversal',
    about: 'Breadth-first and depth-first search, components, shortest paths, distances and connectivity, Euler and Hamilton tours.',
    why: 'Graph search is the backbone of routing, crawling, puzzle solving and dependency resolution; cut vertices and bridges are a network’s single points of failure.',
    resources: [wiki('Breadth-first_search', 'Breadth-first search'), wiki('Dijkstra%27s_algorithm', "Dijkstra's algorithm"), levin('sec_paths', 'Euler Paths and Circuits')],
    skills: [traversal, shortestDeep, distances, euler],
    deeper: [directed],
  },
  {
    id: 'gt.ch.trees',
    title: 'Trees',
    about: 'Characterisations of trees, binary trees, counting leaves and spanning trees, and minimum spanning trees with Kruskal and Prim.',
    why: 'Trees are everywhere in computing: file systems, parse trees, heaps, and cheapest-network design.',
    resources: [levin('sec_trees', 'Trees'), wiki('Minimum_spanning_tree', 'Minimum spanning tree')],
    skills: [treesDeep, mst],
    deeper: [pruferCodes],
  },
  {
    id: 'gt.ch.structure',
    title: 'Colouring, planarity and matching',
    about: 'Chromatic numbers and bipartite graphs, cliques, independent sets and covers, planar graphs and Euler’s formula, matchings and network flows.',
    why: 'Scheduling, register allocation, circuit layout, assignment problems and network capacity all reduce to these questions.',
    resources: [levin('sec_coloring', 'Coloring'), levin('sec_planar', 'Planar Graphs'), levin('sec_matchings', 'Matching in Bipartite Graphs')],
    skills: [coloringDeep, cliques, planarity, matching],
    deeper: [extremal],
  },
];
