# 00 — Vectors, Amplitudes & Dirac Notation

| Field | Value |
| --- | --- |
| **Slug** | `quantum-math-primer` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-math-primer/` |
| **MDX** | `src/app/posts/quantum-math-primer/page.mdx` |
| **Demos** | `src/components/interactive/quantum-math-primer/` |

## Intent

Teach the linear-algebra minimum for the series with zero physics: vectors as lists, computational basis, complex amplitudes as $(u,v)$, kets/bras, inner product, normalization, and $|\langle\phi|\psi\rangle|^2$ as overlap/probability weight. Paraphrase Mermin Appendix A; cite the book.

## Mermin corpus

`/Users/joel/Documents/quantum/output/book.md` Appendix A (~L3507–3756).

## Demo briefs

1. **ComplexPlaneDemo** — real/imag sliders → Argand point + $|\alpha|^2$ bar.
2. **BasisPickerDemo** — pick `|0⟩` / `|1⟩`, show columns + orthogonality.
3. **InnerProductDemo** — two real 2D kets → $\langle\phi|\psi\rangle$ and $|\langle\phi|\psi\rangle|^2$.

## Outline (as shipped)

1. Series welcome + goals
2. Vectors as lists / computational basis + BasisPickerDemo
3. Complex amplitudes + ComplexPlaneDemo
4. Bras, inner product algebra
5. Normalization
6. Overlap → probability weight + InnerProductDemo
7. Orthonormal expansion $\alpha_x=\langle x|\psi\rangle$
8. Deliberate skips + link to Cbits
9. References (Mermin App. A)
