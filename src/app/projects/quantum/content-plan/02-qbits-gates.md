# 02 — Qbits, Unitaries & Circuit Diagrams

| Field | Value |
| --- | --- |
| **Slug** | `quantum-qbits-gates` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-qbits-gates/` |
| **MDX** | `src/app/posts/quantum-qbits-gates/page.mdx` |
| **Demos** | `src/components/interactive/quantum-qbits-gates/` |

## Intent

Lift Cbits to Qbits: general unit superpositions, unitary 1-Qbit gates (X, Z, H), and circuit-diagram literacy (left-to-right wires vs right-to-left operator products). Paraphrase Ch 1 §§1.5–1.7. Measurement deferred.

## Mermin corpus

`/Users/joel/Documents/quantum/output/book.md` Chapter 1 §§1.5–1.7 (~L693–~L810).

## Demo briefs

1. **HadamardBarsDemo** — H on `|0⟩` / `|1⟩` with AmplitudeBar before/after.
2. **GatePickerDemo** — apply X/Z/H/I; show matrix + bars.
3. **CircuitStepperDemo** — CircuitMini H then X with step highlighting + state bars.

## Outline (as shipped)

1. Series context + Qbit superposition definition
2. Unit vector examples + MathAside vs Cbits
3. Unitarity in one paragraph
4. X, Z, H matrices and basis action + HadamardBarsDemo
5. GatePickerDemo
6. Circuit diagrams + CircuitStepperDemo (diagram vs math order)
7. n-Qbit space teaser
8. Try-it: HXH = Z
9. Link to measurement post
10. References (Mermin §§1.5–1.7)
