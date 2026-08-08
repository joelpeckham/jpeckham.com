# 13 — Teleportation & the GHZ Puzzle

| Field | Value |
| --- | --- |
| **Slug** | `quantum-teleportation` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-teleportation/` |
| **MDX** | `src/app/posts/quantum-teleportation/page.mdx` |
| **Demos** | `src/components/interactive/quantum-teleportation/` |

## Intent

Move an unknown Qbit state with a shared Bell pair plus two classical bits (teleportation), then meet the three-party GHZ paradox at intuition level — predetermined local outcomes cannot satisfy all measurement settings at once.

## Mermin corpus

Ch 6 §§6.5–6.6. Paraphrase only. Cite Mermin, *Quantum Computer Science* (Cambridge, 2007).

## Demo briefs

| Demo | File | Job |
| --- | --- | --- |
| Teleportation stepper | `teleport-stepper.tsx` | Step: prepare Bell → Alice cNOT+H → measure → classical bits → Pauli fix |
| Correction lookup | `correction-lookup.tsx` | Map Alice’s two bits → Bob’s I/X/Z/ZX |
| GHZ explorer | `ghz-explorer.tsx` | Choose Z/H settings; sample parities; paradox checklist |

## Outline

1. Setup: unknown \|ψ⟩ + shared \|Φ⁺⟩; no-cloning reminder
2. Protocol walkthrough (Bell measure + Pauli correction)
3. What teleportation does *not* do (FTL, cloning, reading αβ)
4. GHZ state & parity rules for four setting families
5. EPR-style “elements of reality” vs the XOR contradiction
