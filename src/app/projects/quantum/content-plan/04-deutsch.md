# 04 — Oracles, U_f & Deutsch’s Problem

| Field | Value |
| --- | --- |
| **Slug** | `quantum-deutsch` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-deutsch/` |
| **MDX** | `src/app/posts/quantum-deutsch/page.mdx` |
| **Demos** | `src/components/interactive/quantum-deutsch/` |

## Intent

Introduce the standard $U_f$ dual-register protocol, show why naive superposition does not yield free parallel answers, solve Deutsch’s constant-vs-balanced question in one query, and explain why workspace Qbits must be uncomputed before you ignore them.

## Mermin corpus

Ch 2 §§2.1–2.3 (`book.md` ~L1062–~L1340): general computational process, input/output registers, $U_f$, no-cloning / measurement limits, Deutsch’s problem (four 1-bit functions, full one-shot protocol), workspace cleanup with $V^\dagger$.

## Demo briefs

1. **UfStepperDemo** — Pick $f_0$–$f_3$; step $|x\rangle|y\rangle \mapsto |x\rangle|y\oplus f(x)\rangle$; truth table + CircuitMini.
2. **DeutschCircuitDemo** — Step full protocol; Mermin convention: measure input $|1\rangle$ ⇒ constant, $|0\rangle$ ⇒ balanced; optional hidden oracle.
3. **GarbageCleanupDemo** — Dirty vs cleaned workspace; entanglement vs product state after uncompute.

## Outline

1. Relational answer hook
2. $U_f$ + four functions + UfStepperDemo
3. Superposition ≠ free answers
4. Deutsch protocol + MathAside + DeutschCircuitDemo
5. Workspace garbage + GarbageCleanupDemo → link oracles post
