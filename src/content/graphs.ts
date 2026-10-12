import { matTex } from '../core/frac';
import {
  adj,
  adjMatrix,
  bfsDist,
  bfsOrder,
  bipartiteFigure,
  chromatic,
  circleFigure,
  components,
  connected,
  countShortest,
  degree,
  dfsOrder,
  dijkstra,
  eulerKind,
  hasHamiltonCycle,
  isBipartite,
  kruskal,
  L,
  layeredFigure,
  maxFlow,
  maxMatching,
  pathTo,
  primOrder,
  randomConnected,
  spanningTrees,
  type Edge,
  type Graph,
} from '../core/graph';
import type { Chapter, Problem, Resource, Rng, Skill } from '../core/types';
import { distinct } from './helpers';
import { directed, pruferCodes } from './cs-deeper';

const levin = (page: string, title: string): Resource => ({
  kind: 'book',
  title: `Levin, Discrete Mathematics: An Open Introduction: ${title}`,
  url: `https://discrete.openmathbooks.org/dmoi3/${page}.html`,
});
const wiki = (page: string, title: string): Resource => ({
  kind: 'article',
  title: `Wikipedia: ${title}`,
  url: `https://en.wikipedia.org/wiki/${page}`,
});
const mcs: Resource = {
  kind: 'book',
  title: 'MIT 6.042, Mathematics for Computer Science (free PDF), ch. 12–13: Graphs',
  url: 'https://courses.csail.mit.edu/6.042/spring18/mcs.pdf',
};

const num = (v: number): Problem['answer'] => ({ kind: 'number', expected: `${v}` });
const seq = (vs: number[]): Problem['answer'] => ({ kind: 'sequence', expected: vs.map(L) });
const yesNo = (yes: boolean): Problem['answer'] => ({ kind: 'choice', options: ['Yes', 'No'], correct: yes ? 0 : 1 });
const edgeName = (e: Edge) => `${L(e.u)}${L(e.v)}`;
const listL = (vs: number[]) => vs.map(L).join(', ');
const matPow = (m: number[][], k: number) => {
  let out = m;
  for (let i = 1; i < k; i++) out = out.map((row) => m[0].map((_, j) => row.reduce((s, x, t) => s + x * m[t][j], 0)));
  return out;
};

// ---------------------------------------------------------------------------
// Chapter 1: basics

/** Havel–Hakimi: whether a degree sequence is graphical, with the reduction steps for the solution. */
function havelHakimi(d: number[]): { ok: boolean; steps: string[] } {
  const steps: string[] = [];
  let s = [...d].sort((a, b) => b - a);
  if (s.reduce((a, b) => a + b, 0) % 2) return { ok: false, steps: ['The degree sum is odd, but it must be twice the number of edges.'] };
  for (;;) {
    s = s.filter((x) => x > 0).sort((a, b) => b - a);
    if (!s.length) return { ok: true, steps: [...steps, 'Everything reduces to zero, so the sequence is graphical.'] };
    const [k, ...rest] = s;
    if (k > rest.length) return { ok: false, steps: [...steps, `$${k}$ needs ${k} neighbours but only ${rest.length} vertices remain, so it is not graphical.`] };
    const next = rest.map((x, i) => (i < k ? x - 1 : x));
    if (next.some((x) => x < 0)) return { ok: false, steps: [...steps, 'A degree would go negative, so it is not graphical.'] };
    steps.push(`Remove ${k} and subtract 1 from the next ${k}: $(${next.join(', ')})$.`);
    s = next;
  }
}

const degrees: Skill = {
  id: 'gt.degrees',
  name: 'Degrees and edges',
  prereqs: [],
  levels: [
    {
      name: 'read the drawing',
      generate(r) {
        const g = randomConnected(r, r.int(5, 7), r.int(1, 4));
        if (r.next() < 0.5) {
          const v = r.int(0, g.n - 1);
          return {
            prompt: `What is the degree of vertex ${L(v)}?`,
            figure: circleFigure(g),
            answer: num(degree(g, v)),
            solution: [`${L(v)} is joined to ${listL(adj(g)[v])}, so its degree is ${degree(g, v)}.`],
          };
        }
        const ds = Array.from({ length: g.n }, (_, v) => degree(g, v));
        return {
          prompt: 'How many edges does this graph have?',
          figure: circleFigure(g),
          answer: num(g.edges.length),
          solution: [`Count them, or use the handshake lemma: the degrees are $${ds.join(' + ')} = ${ds.reduce((a, b) => a + b, 0)}$, and every edge is counted twice, so there are ${g.edges.length}.`],
        };
      },
    },
    {
      name: 'degree sequences',
      generate(r) {
        const n = r.int(5, 7);
        let d: number[];
        if (r.next() < 0.5) {
          const g = randomConnected(r, n, r.int(1, 5));
          d = Array.from({ length: n }, (_, v) => degree(g, v));
        } else {
          d = Array.from({ length: n }, () => r.int(1, n - 1));
        }
        d.sort((a, b) => b - a);
        const hh = havelHakimi(d);
        return {
          prompt: `Is there a simple graph with degree sequence $(${d.join(', ')})$?`,
          answer: yesNo(hh.ok),
          solution: ['Check the degree sum is even, then apply Havel–Hakimi: repeatedly remove the largest degree $k$ and subtract 1 from the next $k$ largest.', ...hh.steps],
        };
      },
    },
    {
      name: 'edges in named graphs',
      generate(r) {
        const n = r.int(4, 10);
        const m = r.int(2, 6);
        const k = r.int(2, 5);
        const pool: [string, number, string][] = [
          [`the complete graph $K_{${n}}$`, (n * (n - 1)) / 2, `Every pair is an edge: $\\binom{${n}}{2}$.`],
          [`the complete bipartite graph $K_{${m},${n}}$`, m * n, `Every left vertex is joined to every right vertex: $${m} \\cdot ${n}$.`],
          [`a tree with ${n} vertices`, n - 1, `A tree on $n$ vertices always has $n - 1$ edges.`],
          [`the hypercube $Q_{${k}}$`, k * 2 ** (k - 1), `$2^{${k}}$ vertices, each of degree ${k}: $\\frac{${k}\\cdot 2^{${k}}}{2}$.`],
          [`the wheel with ${n} rim vertices (a cycle $C_{${n}}$ plus a hub joined to all of them)`, 2 * n, `${n} rim edges and ${n} spokes.`],
          [`a ${k + 1}-regular graph with ${2 * n} vertices`, ((k + 1) * 2 * n) / 2, `Handshake lemma: $\\frac{${k + 1} \\cdot ${2 * n}}{2}$.`],
        ];
        const [what, v, why] = r.pick(pool);
        return { prompt: `How many edges does ${what} have?`, answer: num(v), solution: [`${why} $= ${v}$.`] };
      },
    },
  ],
  learn: {
    summary:
      'The degree of a vertex is the number of edges at it. Handshake lemma: the degrees add up to twice the number of edges (so the sum is even). A sequence is graphical if some simple graph has it; Havel–Hakimi decides this by repeatedly connecting the highest-degree vertex to the next highest ones.',
    resources: [levin('sec_gt-intro', 'Graph Theory: Definitions'), wiki('Handshaking_lemma', 'Handshaking lemma'), mcs],
  },
};

const matrices: Skill = {
  id: 'gt.matrix',
  name: 'Adjacency matrices and walks',
  prereqs: ['gt.degrees'],
  levels: [
    {
      name: 'write the matrix',
      generate(r) {
        const g = randomConnected(r, r.int(4, 5), r.int(1, 3));
        const m = adjMatrix(g);
        return {
          prompt: `Write the adjacency matrix, with rows and columns in the order ${listL([...Array(g.n).keys()])}.`,
          figure: circleFigure(g),
          answer: { kind: 'matrix', expected: m.map((row) => row.map(String)) },
          solution: ['Entry $(i, j)$ is 1 when vertices $i$ and $j$ are adjacent; the matrix is symmetric with zeros on the diagonal.', `$${matTex(m)}$`],
        };
      },
    },
    {
      name: 'walks of length 2',
      generate(r) {
        const g = randomConnected(r, r.int(4, 6), r.int(2, 4));
        const [u, v] = distinct(r, 2, 0, g.n - 1);
        const m = adjMatrix(g);
        const m2 = matPow(m, 2);
        const mids = adj(g)[u].filter((w) => adj(g)[w].includes(v));
        return {
          prompt: `How many walks of length 2 go from ${L(u)} to ${L(v)}?`,
          figure: circleFigure(g),
          answer: num(m2[u][v]),
          solution: [
            `A walk of length 2 is ${L(u)} → $w$ → ${L(v)} for a common neighbour $w$${mids.length ? `: ${listL(mids)}` : ' (there is none)'}.`,
            `Equivalently, the $(${L(u)}, ${L(v)})$ entry of $A^2$ is ${m2[u][v]}.`,
          ],
        };
      },
    },
    {
      name: 'walks of length 3',
      generate(r) {
        const g = randomConnected(r, 4, r.int(1, 3));
        const [u, v] = [r.int(0, 3), r.int(0, 3)];
        const m = adjMatrix(g);
        const m3 = matPow(m, 3);
        return {
          prompt: `How many walks of length 3 go from ${L(u)} to ${L(v)}? (Order of vertices: ${listL([0, 1, 2, 3])}.)`,
          figure: circleFigure(g),
          answer: num(m3[u][v]),
          solution: [`Entry $(i, j)$ of $A^k$ counts walks of length $k$ from $i$ to $j$.`, `$A = ${matTex(m)}$, $A^2 = ${matTex(matPow(m, 2))}$, $A^3 = ${matTex(m3)}$.`, `The $(${L(u)}, ${L(v)})$ entry is ${m3[u][v]}.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'The adjacency matrix $A$ has $A_{ij} = 1$ when $i$ and $j$ are joined. Powers of $A$ count walks: $(A^k)_{ij}$ is the number of walks of length $k$ from $i$ to $j$, because each matrix product sums over the possible intermediate vertex.',
    resources: [wiki('Adjacency_matrix', 'Adjacency matrix'), mcs],
  },
};

// ---------------------------------------------------------------------------
// Chapter 2: paths and traversal

const traversal: Skill = {
  id: 'gt.traversal',
  name: 'BFS, DFS and components',
  prereqs: ['gt.degrees'],
  levels: [
    {
      name: 'breadth-first search',
      generate(r) {
        const g = randomConnected(r, r.int(6, 7), r.int(2, 4));
        const o = bfsOrder(g, 0);
        return {
          prompt: 'List the vertices in the order breadth-first search visits them, starting at A and taking neighbours in alphabetical order.',
          figure: circleFigure(g),
          answer: seq(o),
          solution: ['BFS uses a queue: visit A, then all its neighbours, then their unvisited neighbours, level by level.', `Order: ${listL(o)}.`],
        };
      },
    },
    {
      name: 'depth-first search',
      generate(r) {
        const g = randomConnected(r, r.int(6, 7), r.int(2, 4));
        const o = dfsOrder(g, 0);
        return {
          prompt: 'List the vertices in the order depth-first search visits them, starting at A and taking neighbours in alphabetical order.',
          figure: circleFigure(g),
          answer: seq(o),
          solution: ['DFS goes as deep as possible first: from each vertex move to its first unvisited neighbour, and back up only when stuck.', `Order: ${listL(o)}.`],
        };
      },
    },
    {
      name: 'connected components',
      generate(r) {
        const n = r.int(6, 8);
        const parts = r.int(1, 3);
        const labels = r.shuffle([...Array(n).keys()]);
        const edges: Edge[] = [];
        let start = 0;
        for (let p = 0; p < parts; p++) {
          const size = p === parts - 1 ? n - start : r.int(1, n - start - (parts - p - 1));
          const piece = randomConnected(r, size, r.int(0, 2));
          piece.edges.forEach((e) => edges.push({ u: labels[start + e.u], v: labels[start + e.v] }));
          start += size;
        }
        const g: Graph = { n, edges };
        const c = components(g);
        return {
          prompt: 'How many connected components does this graph have?',
          figure: circleFigure(g),
          answer: num(c),
          solution: ['Start a search from any unvisited vertex; everything it reaches is one component. Repeat until all vertices are visited.', `There are ${c}.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'Breadth-first search explores in layers using a queue, so it finds shortest paths in unweighted graphs. Depth-first search follows one branch as deep as it goes before backtracking (a stack, or recursion). Either one, started from each unvisited vertex in turn, finds the connected components.',
    resources: [wiki('Breadth-first_search', 'Breadth-first search'), wiki('Depth-first_search', 'Depth-first search'), mcs],
  },
};

const shortest: Skill = {
  id: 'gt.shortest',
  name: 'Shortest paths',
  prereqs: ['gt.traversal'],
  levels: [
    {
      name: 'unweighted distance',
      generate(r) {
        for (;;) {
          const g = randomConnected(r, r.int(6, 8), r.int(1, 3));
          const d = bfsDist(g, 0);
          const t = d.indexOf(Math.max(...d));
          if (d[t] < 2) continue;
          return {
            prompt: `What is the distance (fewest edges) from A to ${L(t)}?`,
            figure: circleFigure(g),
            answer: num(d[t]),
            solution: [`BFS layers from A: ${[...new Set(d)].sort((a, b) => a - b).map((k) => `distance ${k}: ${listL(d.map((x, i) => (x === k ? i : -1)).filter((i) => i >= 0))}`).join('; ')}.`],
          };
        }
      },
    },
    {
      name: "Dijkstra's algorithm",
      generate(r) {
        const g = randomConnected(r, r.int(5, 6), r.int(3, 5), [1, 12]);
        const { dist, order } = dijkstra(g, 0);
        const t = order[order.length - 1];
        return {
          prompt: `Edge labels are lengths. What is the length of the shortest path from A to ${L(t)}?`,
          figure: circleFigure(g, { weights: true }),
          answer: num(dist[t]),
          solution: [
            "Dijkstra: repeatedly finalise the unvisited vertex with the smallest tentative distance and relax its edges.",
            `Finalised in order ${order.map((v) => `${L(v)} (${dist[v]})`).join(', ')}.`,
          ],
        };
      },
    },
    {
      name: 'the path itself',
      generate(r) {
        for (;;) {
          const g = randomConnected(r, r.int(6, 7), r.int(3, 5), [1, 12]);
          const { dist, prev, order } = dijkstra(g, 0);
          const t = order[order.length - 1];
          if (countShortest(g, 0, t) !== 1 || pathTo(prev, t).length < 3) continue;
          const p = pathTo(prev, t);
          return {
            prompt: `Edge labels are lengths. Give the shortest path from A to ${L(t)} as a list of vertices.`,
            figure: circleFigure(g, { weights: true }),
            answer: seq(p),
            solution: [`Run Dijkstra and remember each vertex's predecessor. Distances: ${order.map((v) => `${L(v)} = ${dist[v]}`).join(', ')}.`, `Following predecessors back from ${L(t)}: ${listL(p)} (length ${dist[t]}).`],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'Unweighted graphs: BFS gives distances. Weighted graphs with non-negative lengths: Dijkstra keeps a tentative distance for every vertex, repeatedly finalises the closest unfinished vertex, and relaxes its edges ($d(v) \\leftarrow \\min(d(v), d(u) + w(u,v))$). Remembering which $u$ last improved each $v$ lets you read off the path.',
    resources: [wiki('Dijkstra%27s_algorithm', "Dijkstra's algorithm"), levin('sec_paths', 'Euler Paths and Circuits'), mcs],
  },
};

const EULER_OPTIONS = ['An Euler circuit', 'An Euler path but no circuit', 'Neither'];

const euler: Skill = {
  id: 'gt.euler',
  name: 'Euler and Hamilton',
  prereqs: ['gt.degrees'],
  levels: [
    {
      name: 'Euler circuits and paths',
      generate(r) {
        const target = r.pick(['circuit', 'path', 'neither'] as const);
        for (;;) {
          const g = randomConnected(r, r.int(5, 7), r.int(2, 6));
          if (eulerKind(g) !== target) continue;
          const odd = [...Array(g.n).keys()].filter((v) => degree(g, v) % 2);
          return {
            prompt: 'Does this graph have an Euler circuit (every edge once, ending where it started), an Euler path, or neither?',
            figure: circleFigure(g),
            answer: { kind: 'choice', options: EULER_OPTIONS, correct: ['circuit', 'path', 'neither'].indexOf(target) },
            solution: [
              `The graph is connected. Odd-degree vertices: ${odd.length ? listL(odd) : 'none'}.`,
              target === 'circuit'
                ? 'All degrees even: an Euler circuit exists.'
                : target === 'path'
                  ? `Exactly two odd vertices: an Euler path from ${L(odd[0])} to ${L(odd[1])}, but no circuit.`
                  : `${odd.length} odd vertices: neither exists.`,
            ],
          };
        }
      },
    },
    {
      name: 'Hamilton cycles',
      generate(r) {
        const want = r.next() < 0.5;
        for (;;) {
          const g = randomConnected(r, r.int(5, 7), r.int(1, 5));
          if (hasHamiltonCycle(g) !== want) continue;
          const leaf = [...Array(g.n).keys()].find((v) => degree(g, v) === 1);
          return {
            prompt: 'Does this graph have a Hamilton cycle (visiting every vertex exactly once and returning to the start)?',
            figure: circleFigure(g),
            answer: yesNo(want),
            solution: want
              ? ['Yes. Try to trace one: it helps to start at a low-degree vertex, whose two cycle edges are then forced.']
              : [leaf !== undefined ? `No: ${L(leaf)} has degree 1, but every vertex on a cycle needs two cycle edges.` : 'No: an exhaustive search finds none. Low-degree vertices force edges into the cycle, and following them leads to a dead end or a premature cycle.'],
          };
        }
      },
    },
    {
      name: 'fixing odd vertices',
      generate(r) {
        for (;;) {
          const g = randomConnected(r, r.int(6, 8), r.int(3, 7));
          const odd = [...Array(g.n).keys()].filter((v) => degree(g, v) % 2);
          if (odd.length < 4) continue;
          return {
            prompt: 'What is the smallest number of edges you must add (repeated edges allowed) so the graph has an Euler circuit?',
            figure: circleFigure(g),
            answer: num(odd.length / 2),
            solution: [`There are ${odd.length} odd vertices (${listL(odd)}). Each new edge can fix at most two of them, so at least ${odd.length / 2} edges are needed, and pairing them up achieves it.`],
          };
        }
      },
    },
  ],
  learn: {
    summary:
      'A connected graph has an Euler circuit iff every degree is even, and an Euler path (but no circuit) iff exactly two degrees are odd; the path runs between them. Hamilton cycles visit every vertex once; no simple test is known (it is NP-complete), but degree-1 vertices or cut vertices rule one out.',
    resources: [levin('sec_paths', 'Euler Paths and Circuits'), wiki('Eulerian_path', 'Eulerian path'), wiki('Hamiltonian_path', 'Hamiltonian path')],
  },
};

// ---------------------------------------------------------------------------
// Chapter 3: trees

const trees: Skill = {
  id: 'gt.trees',
  name: 'Trees',
  prereqs: ['gt.degrees'],
  levels: [
    {
      name: 'is it a tree?',
      generate(r) {
        const kind = r.int(0, 2);
        const n = r.int(6, 8);
        let g = randomConnected(r, n, kind === 1 ? 1 : 0);
        if (kind === 2) g = { n, edges: r.shuffle([...g.edges]).slice(1) };
        const tree = connected(g) && g.edges.length === n - 1;
        return {
          prompt: 'Is this graph a tree?',
          figure: circleFigure(g),
          answer: yesNo(tree),
          solution: [
            `It has ${n} vertices and ${g.edges.length} edges and is ${connected(g) ? 'connected' : 'not connected'}.`,
            tree ? 'Connected with $n - 1$ edges: a tree.' : connected(g) ? 'Connected but with more than $n - 1$ edges, so it contains a cycle.' : 'Not connected, so not a tree (it is a forest).',
          ],
        };
      },
    },
    {
      name: 'counting leaves',
      generate(r) {
        const a = r.int(0, 3);
        const b = r.int(1, 4);
        const c = r.int(0, 5);
        const leaves = 2 + 2 * a + b;
        return {
          prompt: `A tree has ${a} vertices of degree 4, ${b} of degree 3, ${c} of degree 2, and all other vertices are leaves. How many leaves does it have?`,
          answer: num(leaves),
          solution: [
            'Let $\\ell$ be the number of leaves. Vertices: $n = ' + `${a + b + c}` + ' + \\ell$, edges: $n - 1$.',
            `Handshake: $4\\cdot${a} + 3\\cdot${b} + 2\\cdot${c} + \\ell = 2(n - 1) = 2(${a + b + c} + \\ell) - 2$.`,
            `Solving: $\\ell = ${leaves}$.`,
          ],
        };
      },
    },
    {
      name: 'counting spanning trees',
      generate(r) {
        if (r.next() < 0.3) {
          const n = r.int(3, 6);
          return {
            prompt: `How many different trees are there on the ${n} labelled vertices $1, \\dots, ${n}$?`,
            answer: num(n ** (n - 2)),
            solution: [`Cayley's formula: $n^{n-2} = ${n}^{${n - 2}} = ${n ** (n - 2)}$.`],
          };
        }
        const g = randomConnected(r, r.int(4, 5), r.int(1, 3));
        const t = spanningTrees(g);
        return {
          prompt: 'How many spanning trees does this graph have?',
          figure: circleFigure(g),
          answer: num(t),
          solution: [
            "Count by hand (remove edges to break each cycle in every possible way), or use Kirchhoff's theorem: delete one row and column of the Laplacian $D - A$ and take the determinant.",
            `It comes to ${t}.`,
          ],
        };
      },
    },
  ],
  learn: {
    summary:
      'A tree is a connected graph without cycles; equivalently, connected with $n - 1$ edges, or with a unique path between any two vertices. Every tree with at least 2 vertices has at least 2 leaves. A spanning tree of a graph uses all its vertices and some of its edges; there are $n^{n-2}$ trees on $n$ labelled vertices (Cayley).',
    resources: [levin('sec_trees', 'Trees'), wiki("Kirchhoff%27s_theorem", "Kirchhoff's theorem"), mcs],
  },
};

const mst: Skill = {
  id: 'gt.mst',
  name: 'Minimum spanning trees',
  prereqs: ['gt.trees'],
  levels: [
    {
      name: 'total weight',
      generate(r) {
        const g = randomConnected(r, r.int(5, 6), r.int(2, 4), [1, 15]);
        const t = kruskal(g);
        const w = t.reduce((s, e) => s + e.w!, 0);
        return {
          prompt: 'What is the total weight of a minimum spanning tree?',
          figure: circleFigure(g, { weights: true }),
          answer: num(w),
          solution: [`Kruskal: take edges from lightest to heaviest, skipping any that would close a cycle: ${t.map((e) => `${edgeName(e)} (${e.w})`).join(', ')}.`, `Total: $${t.map((e) => e.w).join(' + ')} = ${w}$.`],
        };
      },
    },
    {
      name: "Kruskal's order",
      generate(r) {
        const g = randomConnected(r, r.int(5, 6), r.int(3, 5), [1, 15]);
        const t = kruskal(g);
        const k = r.int(2, Math.min(4, t.length));
        const right = t[k - 1];
        const options = r.shuffle([right, ...r.shuffle(g.edges.filter((e) => e !== right)).slice(0, 3)]);
        return {
          prompt: `Which edge does Kruskal's algorithm add ${['', 'first', 'second', 'third', 'fourth'][k]}?`,
          figure: circleFigure(g, { weights: true }),
          answer: { kind: 'choice', options: options.map((e) => `${edgeName(e)} (weight ${e.w})`), correct: options.indexOf(right) },
          solution: [`Sorted by weight, Kruskal adds ${t.map((e) => `${edgeName(e)} (${e.w})`).join(', ')}, skipping edges that would form a cycle.`],
        };
      },
    },
    {
      name: "Prim's order",
      generate(r) {
        const g = randomConnected(r, r.int(5, 7), r.int(3, 5), [1, 15]);
        const o = primOrder(g, 0);
        return {
          prompt: "Run Prim's algorithm from A. In what order are the vertices added to the tree?",
          figure: circleFigure(g, { weights: true }),
          answer: seq(o),
          solution: ["Prim grows one tree: at each step add the lightest edge leaving the tree, and the vertex at its far end.", `Order: ${listL(o)}.`],
        };
      },
    },
  ],
  learn: {
    summary:
      'A minimum spanning tree connects all vertices with the least total edge weight. Kruskal: sort edges by weight and add each one unless it closes a cycle. Prim: grow a single tree from a start vertex, always adding the lightest edge that leaves it. With distinct weights the MST is unique, so both give the same tree.',
    resources: [wiki('Kruskal%27s_algorithm', "Kruskal's algorithm"), wiki('Prim%27s_algorithm', "Prim's algorithm"), mcs],
  },
};

// ---------------------------------------------------------------------------
// Chapter 4: colouring, planarity, matching

function randomBipartite(r: Rng, a: number, b: number, density: number): { g: Graph; left: number[]; right: number[] } {
  const left = [...Array(a).keys()];
  const right = Array.from({ length: b }, (_, i) => a + i);
  for (;;) {
    const edges: Edge[] = [];
    for (const u of left) for (const v of right) if (r.next() < density) edges.push({ u, v });
    const g = { n: a + b, edges };
    if (edges.length >= Math.max(a, b) && [...Array(g.n).keys()].every((v) => degree(g, v) > 0)) return { g, left, right };
  }
}

const coloring: Skill = {
  id: 'gt.coloring',
  name: 'Graph colouring',
  prereqs: ['gt.degrees'],
  levels: [
    {
      name: 'chromatic number',
      generate(r) {
        const g = randomConnected(r, r.int(5, 7), r.int(2, 7));
        const k = chromatic(g);
        return {
          prompt: 'What is the chromatic number of this graph (fewest colours so adjacent vertices differ)?',
          figure: circleFigure(g),
          answer: num(k),
          solution: [
            k >= 3 ? `It contains an odd cycle${k >= 4 ? ' and in fact needs more than 3 colours' : ''}, so at least ${k} colours; a ${k}-colouring exists (colour greedily, high degrees first).` : 'It has no odd cycle, so 2 colours suffice.',
            `$\\chi = ${k}$.`,
          ],
        };
      },
    },
    {
      name: 'bipartite or not?',
      generate(r) {
        const want = r.next() < 0.5;
        for (;;) {
          const g = want ? randomBipartite(r, r.int(3, 4), r.int(3, 4), 0.45).g : randomConnected(r, r.int(6, 7), r.int(2, 5));
          if (isBipartite(g) !== want) continue;
          const shuffled = r.shuffle([...Array(g.n).keys()]);
          const h: Graph = { n: g.n, edges: g.edges.map((e) => ({ u: shuffled[e.u], v: shuffled[e.v] })) };
          return {
            prompt: 'Is this graph bipartite?',
            figure: circleFigure(h),
            answer: yesNo(want),
            solution: [
              'Try to 2-colour it with BFS: colour a vertex, give its neighbours the other colour, and so on.',
              want ? 'This never creates a conflict, so it is bipartite.' : 'At some point two adjacent vertices get the same colour: there is an odd cycle, so it is not bipartite.',
            ],
          };
        }
      },
    },
    {
      name: 'named graphs',
      generate(r) {
        const n = r.int(4, 9);
        const pool: [string, number, string][] = [
          [`the complete graph $K_{${n}}$`, n, 'All vertices are pairwise adjacent, so each needs its own colour.'],
          [`the cycle $C_{${n}}$`, n % 2 ? 3 : 2, n % 2 ? 'An odd cycle cannot be 2-coloured; 3 colours work.' : 'An even cycle alternates two colours.'],
          [`the wheel with ${n} rim vertices`, n % 2 ? 4 : 3, `The rim is $C_{${n}}$ (${n % 2 ? '3' : '2'} colours) and the hub, adjacent to all of it, needs one more.`],
          [`the complete bipartite graph $K_{${n},${n + 1}}$`, 2, 'Bipartite with at least one edge: exactly 2.'],
          ['the Petersen graph', 3, 'It contains 5-cycles (so at least 3), and a 3-colouring exists.'],
          [`a tree with ${n} vertices`, 2, 'Trees have no cycles, so they are bipartite.'],
        ];
        const [what, v, why] = r.pick(pool);
        return { prompt: `What is the chromatic number of ${what}?`, answer: num(v), solution: [why, `$\\chi = ${v}$.`] };
      },
    },
  ],
  learn: {
    summary:
      'The chromatic number $\\chi(G)$ is the fewest colours needed so adjacent vertices differ. $\\chi \\le 2$ exactly when the graph is bipartite, i.e. has no odd cycle. A clique of size $k$ forces $\\chi \\ge k$. Colouring models scheduling and register allocation; the four colour theorem says planar graphs need at most 4.',
    resources: [levin('sec_coloring', 'Coloring'), wiki('Graph_coloring', 'Graph coloring'), mcs],
  },
};

const planarity: Skill = {
  id: 'gt.planar',
  name: 'Planarity',
  prereqs: ['gt.degrees'],
  levels: [
    {
      name: "Euler's formula",
      generate(r) {
        const v = r.int(5, 15);
        const e = r.int(v, 3 * v - 6);
        return {
          prompt: `A connected planar graph is drawn without crossings. It has ${v} vertices and ${e} edges. How many faces does the drawing have (including the outer face)?`,
          answer: num(e - v + 2),
          solution: [`Euler's formula: $V - E + F = 2$, so $F = ${e} - ${v} + 2 = ${e - v + 2}$.`],
        };
      },
    },
    {
      name: 'edge bounds',
      generate(r) {
        const v = r.int(5, 12);
        const bip = r.next() < 0.4;
        const max = bip ? 2 * v - 4 : 3 * v - 6;
        const e = max + r.pick([-2, -1, 0, 1, 2]);
        const ok = e <= max;
        return {
          prompt: `Can a simple planar ${bip ? 'bipartite ' : ''}graph have ${v} vertices and ${e} edges?`,
          answer: yesNo(ok),
          solution: [
            bip
              ? 'Faces of a bipartite planar graph have at least 4 edges, giving $E \\le 2V - 4$.'
              : 'Every face of a simple planar graph has at least 3 edges, giving $E \\le 3V - 6$.',
            `Here the bound is ${max}, ${ok ? 'and it can be reached by a suitable drawing, so yes.' : `and ${e} exceeds it, so no.`}`,
          ],
        };
      },
    },
    {
      name: 'planar or not?',
      generate(r) {
        const pool: [string, boolean, string][] = [
          ['$K_4$', true, 'Draw it as a triangle with one vertex inside, joined to all three corners.'],
          ['$K_5$', false, '$E = 10 > 3V - 6 = 9$.'],
          ['$K_{3,3}$', false, 'It is bipartite with $E = 9 > 2V - 4 = 8$.'],
          ['$K_{2,5}$', true, 'Put the two vertices on either side and the five in a line between them.'],
          ['the cube graph $Q_3$', true, 'Draw one square inside another and join corresponding corners.'],
          ['the Petersen graph', false, 'It contains a subdivision of $K_{3,3}$ (Kuratowski).'],
          ['$K_5$ with one edge removed', true, '$E = 9 = 3V - 6$, and an explicit drawing exists.'],
          ['$K_{3,3}$ with one edge removed', true, 'Removing an edge destroys the only obstruction; it can be drawn without crossings.'],
          ['$K_6$', false, 'It contains $K_5$.'],
        ];
        const [what, ok, why] = r.pick(pool);
        return { prompt: `Is ${what} planar?`, answer: yesNo(ok), solution: [why] };
      },
    },
  ],
  learn: {
    summary:
      "A graph is planar if it can be drawn without crossing edges. For a connected planar drawing, Euler's formula $V - E + F = 2$ holds. Consequences: a simple planar graph has $E \\le 3V - 6$, and $E \\le 2V - 4$ if it has no triangles. Kuratowski: a graph is planar iff it contains no subdivision of $K_5$ or $K_{3,3}$.",
    resources: [levin('sec_planar', 'Planar Graphs'), wiki('Planar_graph', 'Planar graph'), mcs],
  },
};

const matching: Skill = {
  id: 'gt.matching',
  name: 'Matchings and flows',
  prereqs: ['gt.coloring'],
  levels: [
    {
      name: 'maximum matching',
      generate(r) {
        const { g, left, right } = randomBipartite(r, r.int(3, 4), r.int(3, 4), 0.4);
        const m = maxMatching(g, left);
        return {
          prompt: `What is the size of a maximum matching (largest set of edges with no shared vertex)? Left: ${listL(left)}; right: ${listL(right)}.`,
          figure: bipartiteFigure(g, left, right),
          answer: num(m),
          solution: ['Grow a matching and improve it with augmenting paths (alternating unmatched and matched edges between two free vertices).', `The maximum is ${m}.`],
        };
      },
    },
    {
      name: 'perfect matchings',
      generate(r) {
        const n = r.int(3, 4);
        const want = r.next() < 0.5;
        for (;;) {
          const { g, left, right } = randomBipartite(r, n, n, 0.4);
          const perfect = maxMatching(g, left) === n;
          if (perfect !== want) continue;
          let hall = '';
          if (!perfect) {
            const a = adj(g);
            for (let mask = 1; mask < 1 << n && !hall; mask++) {
              const S = left.filter((_, i) => mask & (1 << i));
              const N = [...new Set(S.flatMap((v) => a[v]))];
              if (N.length < S.length) hall = `Hall's condition fails: ${listL(S)} together only have the neighbours ${N.length ? listL(N) : 'none'}.`;
            }
          }
          return {
            prompt: 'Does this bipartite graph have a perfect matching?',
            figure: bipartiteFigure(g, left, right),
            answer: yesNo(perfect),
            solution: perfect ? ['Yes: an augmenting-path search reaches a matching that covers every vertex.'] : [hall, "Hall's theorem: a perfect matching exists iff every set $S$ of left vertices has at least $|S|$ neighbours."],
          };
        }
      },
    },
    {
      name: 'maximum flow',
      generate(r) {
        // s=0, a=1, b=2, c=3, d=4, t=5
        const edges: Edge[] = [
          { u: 0, v: 1 },
          { u: 0, v: 2 },
          { u: 1, v: 3 },
          { u: 2, v: 4 },
          { u: 3, v: 5 },
          { u: 4, v: 5 },
          ...r.shuffle<Edge>([
            { u: 1, v: 4 },
            { u: 2, v: 3 },
            { u: 1, v: 2 },
          ]).slice(0, r.int(1, 2)),
        ].map((e) => ({ ...e, w: r.int(1, 9) }));
        const g: Graph = { n: 6, edges, directed: true };
        const f = maxFlow(g, 0, 5);
        let best = { cap: Infinity, S: [] as number[] };
        for (let mask = 0; mask < 16; mask++) {
          const S = [0, ...[1, 2, 3, 4].filter((_, i) => mask & (1 << i))];
          const cap = edges.filter((e) => S.includes(e.u) && !S.includes(e.v)).reduce((s, e) => s + e.w!, 0);
          if (cap < best.cap) best = { cap, S };
        }
        const labels = ['s', 'a', 'b', 'c', 'd', 't'];
        const cut = edges.filter((e) => best.S.includes(e.u) && !best.S.includes(e.v));
        return {
          prompt: 'Edge labels are capacities. What is the maximum flow from $s$ to $t$?',
          figure: layeredFigure(g, [[0], [1, 2], [3, 4], [5]], labels),
          answer: num(f),
          solution: [
            'Push flow along augmenting paths until none is left, or find a minimum cut: max flow = min cut.',
            `A minimum cut separates $\\{${best.S.map((v) => labels[v]).join(', ')}\\}$ from the rest; it cuts ${cut.map((e) => `${labels[e.u]}→${labels[e.v]} (${e.w})`).join(', ')}, total ${best.cap}.`,
            `So the maximum flow is ${f}.`,
          ],
          selfCheck: () => best.cap === f,
        };
      },
    },
  ],
  learn: {
    summary:
      "A matching is a set of edges with no shared endpoint. In bipartite graphs, augmenting paths grow a matching to maximum size, and Hall's theorem characterises perfect matchings. Max-flow min-cut: the largest flow from $s$ to $t$ equals the smallest total capacity of edges whose removal separates $t$ from $s$.",
    resources: [levin('sec_matchings', 'Matching in Bipartite Graphs'), wiki('Max-flow_min-cut_theorem', 'Max-flow min-cut theorem'), mcs],
  },
};

// ---------------------------------------------------------------------------

export const graphChapters: Chapter[] = [
  {
    id: 'gt.ch.basics',
    title: 'Graph basics',
    about: 'Vertices, edges and degrees, the handshake lemma, special graphs, and adjacency matrices.',
    why: 'Graphs model networks, dependencies, state machines and social connections; the adjacency matrix connects them to linear algebra.',
    resources: [levin('sec_gt-intro', 'Graph Theory: Definitions'), mcs],
    skills: [degrees, matrices],
    deeper: [],
  },
  {
    id: 'gt.ch.paths',
    title: 'Paths and traversal',
    about: 'Breadth-first and depth-first search, components, shortest paths with Dijkstra, Euler and Hamilton tours.',
    why: 'Graph search is the backbone of routing, crawling, puzzle solving and dependency resolution.',
    resources: [wiki('Breadth-first_search', 'Breadth-first search'), wiki('Dijkstra%27s_algorithm', "Dijkstra's algorithm"), levin('sec_paths', 'Euler Paths and Circuits')],
    skills: [traversal, shortest, euler],
    deeper: [directed],
  },
  {
    id: 'gt.ch.trees',
    title: 'Trees',
    about: 'Characterisations of trees, counting leaves and spanning trees, and minimum spanning trees with Kruskal and Prim.',
    why: 'Trees are everywhere in computing: file systems, parse trees, heaps, and cheapest-network design.',
    resources: [levin('sec_trees', 'Trees'), wiki('Minimum_spanning_tree', 'Minimum spanning tree')],
    skills: [trees, mst],
    deeper: [pruferCodes],
  },
  {
    id: 'gt.ch.structure',
    title: 'Colouring, planarity and matching',
    about: 'Chromatic numbers and bipartite graphs, planar graphs and Euler’s formula, matchings and network flows.',
    why: 'Scheduling, register allocation, circuit layout, assignment problems and network capacity all reduce to these questions.',
    resources: [levin('sec_coloring', 'Coloring'), levin('sec_planar', 'Planar Graphs'), levin('sec_matchings', 'Matching in Bipartite Graphs')],
    skills: [coloring, planarity, matching],
    deeper: [],
  },
];
