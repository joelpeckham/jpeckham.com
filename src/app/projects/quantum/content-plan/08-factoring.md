# 08 — From Periods to Factors

| Field | Value |
| --- | --- |
| **Slug** | `quantum-factoring` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-factoring/` |
| **MDX** | `src/app/posts/quantum-factoring/page.mdx` |
| **Demos** | `src/components/interactive/quantum-factoring/` |

## Intent

Classical reduction: given order $r$ of random $a\in G_{pq}$, when $r$ is even and $a^{r/2}\not\equiv -1\pmod N$, Euclid extracts factors. Success/fail cases; end-to-end tiny $N$. Note App M ≥½ success probability without proving it fully.

## Mermin corpus

- Ch 3 §3.10
- Appendix M (probability sketch — paraphrase lightly)
- Appendix J (Euclid) as needed
- Cite Mermin 2007

## Demo briefs

1. **GcdFactorDemo** — $x=a^{r/2}\bmod N$, Euclid on $(x\pm1,N)$.
2. **SuccessFailDemo** — odd $r$ / $x\equiv-1$ / success.
3. **EndToEndDemo** — pick $a$ → “period” → factors for $N=15$ or $21$.

## Outline

1. Recap: RSA needs factors *or* period; factoring path
2. Pick $a$, find $r$ with $a^r\equiv1\pmod N$
3. Even $r$: $(x-1)(x+1)\equiv0\pmod N$ with $x=a^{r/2}$
4. GCD demo
5. Failure modes demo
6. End-to-end walkthrough
7. Series bridge to Grover
