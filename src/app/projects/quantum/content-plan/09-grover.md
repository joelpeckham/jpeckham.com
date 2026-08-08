# 09 — Grover’s Search Algorithm

| Field | Value |
| --- | --- |
| **Slug** | `quantum-grover` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-grover/` |
| **MDX** | `src/app/posts/quantum-grover/page.mdx` |
| **Demos** | `src/components/interactive/quantum-grover/` |

## Intent

Teach unstructured search as amplitude amplification: oracle phase kick, diffusion about the mean, and the geometric rotation picture. Leave readers able to say why ~√N oracle calls beat classical ~N/2, and what changes when several items are marked.

## Mermin corpus

Chapter 4 entire (~L2167–2386): nature of the search, Grover iteration (V and W), constructing W (light touch), multi-solution generalization, N=4 exact case.

## Demo briefs

1. **Amplitude amplification** — N=8/16, marked item, AmplitudeBar, Step/Play/Reset through Grover iterations.
2. **Geometric rotation** — 2D plane of |a⊥⟩ and |a⟩; each WV rotates by 2θ.
3. **Several marked items** — N=16, m=1–4; optimal iterations scale as 1/√m.

## Outline

1. Classical needle-in-haystack vs quantum √N.
2. Oracle as phase flip V; diffusion W.
3. Demo: amplify the marked amplitude.
4. Geometry: reflections → rotation.
5. How many iterations (π/4 √N).
6. Multi-solution case.
7. W construction note (controlled-Z sandwich) — pointer only.
8. What Grover is (and isn’t) good for.
