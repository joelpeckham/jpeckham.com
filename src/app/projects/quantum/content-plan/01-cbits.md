# 01 — Cbits, Boxes & Reversible Gates

| Field | Value |
| --- | --- |
| **Slug** | `quantum-cbits` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-cbits/` |
| **MDX** | `src/app/posts/quantum-cbits/page.mdx` |
| **Demos** | `src/components/interactive/quantum-cbits/` |

## Intent

Introduce Mermin's Cbits: classical two-state systems in Dirac boxes, multi-Cbit products, integer labeling with width subscripts, and reversible NOT/cNOT (XOR) before any quantum superposition. Paraphrase Ch 1 §§1.1–1.4.

## Mermin corpus

`/Users/joel/Documents/quantum/output/book.md` Chapter 1 §§1.1–1.4 (~L297–~L500+).

## Demo briefs

1. **IntegerLabelDemo** — $|n\rangle_w$ vs padded binary ket; width ambiguity.
2. **ProductStateDemo** — 3-bit toggles → product / compact / integer forms.
3. **ReversibleGatesDemo** — NOT & cNOT truth tables with apply-twice reversibility.

## Outline (as shipped)

1. Series context + Cbit terminology
2. Single-Cbit boxes `|0⟩` / `|1⟩`
3. Integer labels + IntegerLabelDemo
4. Product states + ProductStateDemo
5. Why reversible ops only
6. NOT and cNOT + ReversibleGatesDemo
7. SWAP from three cNOTs (brief)
8. Optional matrix view + try-it
9. Tease H/Z → Qbits post
10. References (Mermin §§1.1–1.4)
