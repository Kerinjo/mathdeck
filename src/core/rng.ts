import type { Rng } from './types';

/** Seeded PRNG (mulberry32) so a problem instance can be regenerated from its seed. */
export function makeRng(seed: number = Math.floor(Math.random() * 2 ** 32)): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return {
    next,
    int,
    nz(lo, hi) {
      for (;;) {
        const v = int(lo, hi);
        if (v !== 0) return v;
      }
    },
    pick: (xs) => xs[Math.floor(next() * xs.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
    shuffle(xs) {
      for (let i = xs.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [xs[i], xs[j]] = [xs[j], xs[i]];
      }
      return xs;
    },
  };
}
