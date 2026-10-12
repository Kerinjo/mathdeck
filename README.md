# mathdeck

Spaced repetition for maths, with exercises instead of flashcards. Every review generates a fresh problem.
You solve it on paper, type the final answer, and the app grades it.

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # generator + scheduler tests
npm run check-links  # verify every learning-resource URL
npm run build        # static build in dist/ (open dist/index.html via any static server)
```

## How it works

Each subject is organised like a book: **chapters** in order, each made of **sections** (skills). A section has 3
difficulty levels, and every problem is generated fresh.

There are two ways to use it:

- **Study** a chapter or a single section. This is how you make progress. You work through sections in book order,
  and a section counts as **cleared** after 3 solved in a row. Due reviews from the same chapter are mixed in,
  and missed problems come back a few problems later. A session is saved after every answer: **Pause** and come back
  later to the exact problem you left.
- **Review**: a mixed set from every chapter you've studied, picked from your history. Weak sections come first and
  return often; easy ones fade out. Problems are interleaved across chapters. Reviews aren't resumable: each one is
  built from whatever is due at that moment.

Everything else:

- **Grading** compares your expression numerically against the expected one at many points, so any equivalent
  form is accepted (`2(x+1)` = `2x+2`, `+ C` optional, `ln|x|` fine). Matrices are entered in a grid; eigenvectors and
  null-space vectors accept any non-zero multiple.
- **You rate every card.** The app checks your answer, then you say how it went: *Hard / Good / Easy* when it's
  right, *Didn't know how / Slip* when it's wrong (a slip means the method was right and the arithmetic wasn't; it
  costs no progress). Enter picks the default, number keys pick the others. Proof cards have no answer box: show the
  model proof, then rate yourself.
- **Scheduling** (`src/core/scheduler.ts`): each section has an *ease* learned from your ratings. Solving it
  multiplies the interval by the ease (less for Hard, more for Easy). "Didn't know how" brings it back within minutes
  and lowers the ease, so it grows more slowly afterwards. 3 solved on separate days unlocks the next level. Losing it
  right after a level-up drops you back one level to rebuild.
- **Nothing is locked.** Open any chapter at any time. "I already know this" (for a section or a whole chapter)
  marks it cleared, and it gets checked at its top level in a review 3 days later.
- **Learning material is optional.** Every chapter has an *About this chapter* panel (what it covers, why it matters,
  links), and every problem has a 📖 Intro button with a summary and links. A wrong answer shows the worked
  solution and the intro automatically.
- **Going deeper**: optional sections at the end of some chapters. Switch one on to include it in chapter study and
  reviews. They never count toward chapter progress.
- **Practice** (in a section's details): drill any level without affecting anything.

Progress is stored in the browser's localStorage. Use Settings → Export backup. Older backups import fine.

## Getting started

The **Today** page has two buttons: **Review** (what's due) and **Study** (resume your paused session, or continue
with the next chapter of the subject you used last). If basics are too easy, open a chapter and use **"I already know
this chapter"**. Session length and review size are in Settings.

## Typing answers

| Input | Meaning |
|---|---|
| `x^2`, `x^(1/3)` | powers |
| `2x`, `3xe^x`, `x(x+1)` | implicit multiplication works |
| `sqrt(x)`, `ln(x)` or `ln\|x\|`, `e^x` or `exp(x)` | functions |
| `sin(x)^2` | powers of trig (not `sin^2 x`) |
| `arctan(x)`, `asin(x)` | inverse trig |
| `3/8`, `-1/2`, `pi/4`, `sqrt(2)/2` | exact numbers |
| `inf` | ∞ |
| `1, -2` | lists (e.g. eigenvalues, critical points), any order |

A live preview under the answer box shows how your input was read.

## Content

**Calculus:** 1 Limits · 2 Derivatives · 3 Applications of derivatives · 4 Integrals (+ going deeper: improper
integrals) · 5 Series · 6 Multivariable calculus. 16 sections.

**Linear Algebra:** 1 Vectors · 2 Linear systems · 3 Matrices and linear maps · 4 Determinants · 5 Vector spaces ·
6 Eigenvalues (+ going deeper: diagonalization and matrix powers) · 7 Orthogonality. 14 sections.

**Not built yet:** Probability, Graph Theory, Discrete Math, Number Theory. Proofs are left out on purpose, because
they can't be graded automatically.

## Adding content

Content lives in `src/content/*.ts`: each file exports its chapters (`about`, `why`, links, `skills`, `deeper`). A
level is a `generate(rng) => Problem` function; give it a `selfCheck` when it can be verified independently. The tests
run every generator 60× and check that the expected answer passes the grader, the TeX renders and the self-check
holds. To add a subject, create a file and register it in `src/content/index.ts`.

Exercises are generated by code written for this project; nothing is copied from textbooks. Learning resources are
links only.
