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

- **Skills, not cards.** Each skill (e.g. *Integration by parts*) has 3 difficulty levels, each with a random generator.
- **Grading** compares your expression numerically against the expected one at many points, so any equivalent
  form is accepted (`2(x+1)` = `2x+2`, `+ C` optional, `ln|x|` fine). Matrices are entered in a grid; eigenvectors and
  null-space vectors accept any non-zero multiple.
- **Scheduling** (`src/core/scheduler.ts`):
  - correct → interval grows (1d → 3d → 8d → 20d …)
  - wrong → back in the same session after a few cards, then tomorrow
  - 3 correct on separate days → next level unlocks
  - a miss right after a level-up drops you back one level to rebuild
- **Prerequisites:** a skill unlocks when its prerequisites are reliable (level 1 done). You can also start any skill
  manually or mark it as "I already know this" on the Skills page.
- **Stuck?** "I don't know" shows the worked solution, a short summary and curated links (3Blue1Brown, Paul's Online
  Notes, OpenStax, Interactive Linear Algebra, MIT 18.06).

- **Weak skills:** a skill missed twice in a row is listed on the dashboard with its learning links.
- **Practice mode:** on the Skills page you can drill any skill at any level; it doesn't affect the schedule.

Progress is stored in the browser's localStorage. Use Settings → Export backup.

## Getting started

Only skills with no prerequisites are unlocked at first (*Evaluating limits*, *Power rule*, *Vector arithmetic*), and
at most 3 new skills a day are added to your reviews (change this in Settings). If you already know the basics, open
the Skills page and use **"I already know this"**. The skill then counts as reliable, unlocks the skills that depend on
it, and comes back in 3 days at its hardest level to check.

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

**Calculus (16):** evaluating limits, L'Hôpital's rule, power rule, product/quotient rules, chain rule, implicit
differentiation, critical points and extrema, basic antiderivatives, definite integrals and area, substitution,
integration by parts, partial fractions, infinite series, Taylor and power series, partial derivatives and gradients,
double integrals.

**Linear Algebra (14):** vector arithmetic, length/angle/projection, matrix multiplication, matrix inverse, linear
systems, RREF, determinants, determinant properties, span/independence/coordinates, rank and null space, linear
transformations, eigenvalues and eigenvectors, Gram–Schmidt and least squares, quadratic forms and definiteness.

**Not built yet:** Probability, Graph Theory, Discrete Math, Number Theory. Proofs are left out on purpose, because
they can't be graded automatically.

## Adding content

Skills live in `src/content/*.ts`. A level is a `generate(rng) => Problem` function; give it a `selfCheck` when it can
be verified independently (the tests run every generator 60× and check that the expected answer passes the grader,
the TeX renders and the self-check holds). To add a subject, create a file and register it in `src/content/index.ts`.
