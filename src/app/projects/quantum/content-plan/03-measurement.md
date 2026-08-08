# 03 — Measurement & the Born Rule

| Field | Value |
| --- | --- |
| **Slug** | `quantum-measurement` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-measurement/` |
| **MDX** | `src/app/posts/quantum-measurement/page.mdx` |
| **Demos** | `src/components/interactive/quantum-measurement/` |

## Intent

Teach how measurement turns amplitudes into random classical outcomes, collapses state, prepares standard inputs, and differs from reading Cbits — so later oracle articles can treat “measure the register” as a known primitive.

## Mermin corpus

Ch 1 §§1.8–1.12 (`book.md` ~L811–~L1057): Born rule, measurement gates, collapse, mixture ≠ superposition, generalized Born / partial measure, measurement as state preparation, arbitrary 1-/2-Qbit prep sketch, Cbit vs Qbit summary table.

## Demo briefs

1. **BornSamplerDemo** — Tune real amplitudes; sample once / 100×; histogram vs $|\alpha|^2$.
2. **PartialMeasureDemo** — 2-Qbit presets (Bell-like, product); measure one wire; show renormalized leftover.
3. **PrepareMeasureDemo** — Shelf → measure → X-clean to $|0\rangle$ → H → measure loop with CircuitMini.

## Outline

1. Amplitudes are not answers (series glue)
2. Born rule, one Qbit + MathAside + BornSamplerDemo
3. $n$-Qbit measurement / algorithm artistry
4. Generalized Born + PartialMeasureDemo
5. State preparation + PrepareMeasureDemo
6. Arbitrary 1-/2-Qbit prep (short)
7. Cbits vs Qbits summary in prose → link Deutsch
