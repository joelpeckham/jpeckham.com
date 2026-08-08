# 11 — Five- and Seven-Qbit Codes

| Field | Value |
| --- | --- |
| **Slug** | `quantum-error-codes` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-error-codes/` |
| **MDX** | `src/app/posts/quantum-error-codes/page.mdx` |
| **Demos** | `src/components/interactive/quantum-error-codes/` |

## Intent

Graduate from bit-flip-only codes to codes that catch general single-Qbit errors (X, Y, Z). Contrast the perfect 5-Qbit code with Steane’s practical 7-Qbit code: transversal gates, encoding sketch, stabilizer checklist.

## Mermin corpus

Chapter 5 §§5.5–5.9: 5-Qbit stabilizers and codewords, 7-Qbit Steane, operations on codewords, 7-Qbit encoding circuit, 5-Qbit encoding circuit (high-level).

## Demo briefs

1. **Stabilizer checklist** — pick code + injected Pauli; ±1 lights → identified error.
2. **Steane encode sketch** — CircuitMini stepping through prep / CNOT cascade.
3. **Code family compare** — 3/5/7/9 illustrative table with toggles.

## Outline

1. Dimension count: need 2^{n−1} ≥ 3n+1 → n ≥ 5.
2. 5-Qbit stabilizers and why it’s “perfect.”
3. Demo: syndrome checklist.
4. Steane 7-Qbit: more qubits, easier gates.
5. Demo: encode sketch.
6. Fault tolerance / transversal H, X, Z, CNOT.
7. Family comparison demo.
8. Where Shor’s 9-Qbit code sits historically.
