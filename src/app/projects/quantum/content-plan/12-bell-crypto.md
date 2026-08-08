# 12 — Bell States, QKD & Dense Coding

| Field | Value |
| --- | --- |
| **Slug** | `quantum-bell-crypto` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-bell-crypto/` |
| **MDX** | `src/app/posts/quantum-bell-crypto/page.mdx` |
| **Demos** | `src/components/interactive/quantum-bell-crypto/` |

## Intent

Turn entangled pairs into a *resource*: build the Bell basis from H + cNOT, use random bases for BB84-style key exchange, sketch why bit commitment fails with entanglement, then pack two classical bits into one transmitted Qbit (dense coding).

## Mermin corpus

Ch 6 §§6.1–6.4 (`book.md` ~L3101–~L3400). Paraphrase only. Cite Mermin, *Quantum Computer Science* (Cambridge, 2007).

## Demo briefs

| Demo | File | Job |
| --- | --- | --- |
| Bell-pair builder | `bell-pair-builder.tsx` | Pick \|xy⟩; animate H₁ then C₁₀; show \|ψ_xy⟩ amps + Z₁ˣ X₀ʸ rewrite |
| BB84 sampler | `bb84-sampler.tsx` | Match/mismatch sift; optional Eve; accumulate agreement stats |
| Dense coding | `dense-coding-demo.tsx` | Encode 00/01/10/11 via I/X/Z/ZX; Bob Bell-measures |
| Bit commitment sketch | `bit-commitment-sketch.tsx` | YES/NO basis commit + entanglement cheat toggle |

## Outline

1. Bell states from H + cNOT; four orthonormal entangled states
2. BB84: one-time pads, basis sifting, eavesdropper disturbance
3. Bit commitment sketch + entanglement loophole
4. Dense coding: two classical bits per shared e-bit
5. Tease teleportation (next post)
