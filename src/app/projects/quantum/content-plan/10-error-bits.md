# 10 — Quantum Error Correction: Bit Flips

| Field | Value |
| --- | --- |
| **Slug** | `quantum-error-bits` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-error-bits/` |
| **MDX** | `src/app/posts/quantum-error-bits/page.mdx` |
| **Demos** | `src/components/interactive/quantum-error-bits/` |

## Intent

Make the “miracle” of QEC concrete: measurement seems to destroy superpositions, yet a 3-Qbit bit-flip code can diagnose and fix single flips without learning α and β. End with stabilizer language (Z₂Z₁, Z₁Z₀) as the bridge to general codes.

## Mermin corpus

Chapter 5 §§5.1–5.4 (~L2387–~L2700): miracle of QEC, 3-Qbit encode, syndrome without destroying logical state, physics of errors (X/Y/Z view), diagnosing syndromes with ancillas.

## Demo briefs

1. **Encode** — α|0⟩+β|1⟩ → α|000⟩+β|111⟩; CircuitMini + AmplitudeBar.
2. **Inject flip** — random/pick X on one physical qubit; watch support move.
3. **Syndrome lights** — two ancilla outcomes → correct; emphasize α,β unknown.

## Outline

1. Why QEC sounded impossible.
2. Classical triple repetition → quantum encoding circuit.
3. Demo: encode.
4. The measurement trap (don’t measure the data).
5. Demo: inject a flip.
6. Syndromes on ancillas; correct.
7. Stabilizer view and general X/Y/Z errors (teaser for post 11).
