# 06 — RSA, Periods & Why Factoring Matters

| Field | Value |
| --- | --- |
| **Slug** | `quantum-rsa` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-rsa/` |
| **MDX** | `src/app/posts/quantum-rsa/page.mdx` |
| **Demos** | `src/components/interactive/quantum-rsa/` |

## Intent

Motivate Shor’s algorithm for CS readers: modular groups $G_N$, RSA encrypt/decrypt, and why finding the *order* (period) of a ciphertext breaks RSA without factoring $N$. Heavy hand-holding on $\equiv \pmod N$, groups, and order. Quantum circuit deferred to posts 7–8.

## Mermin corpus

- Ch 3 §§3.1–3.3 (period finding → cryptography; $G_N$; RSA)
- Appendix I (elementary groups / Lagrange → order divides $|G|$)
- Appendix J (Euclid, modular inverse, coprimality odds)
- Cite: N. D. Mermin, *Quantum Computer Science*, Cambridge, 2007

## Demo briefs

1. **TinyRsaDemo** — toy primes, encrypt $b \equiv a^c \pmod N$, decrypt with $d$.
2. **OrderFindingDemo** — power ladder $a^k \bmod N$ until $1$; label order $r$.
3. **PeriodBreaksRsaDemo** — scrubber: public $(N,c,b)$ → period $r$ → $d'\equiv c^{-1}\pmod r$ → recover $a$.

## Outline

1. Hook: Simon’s XOR-period vs ordinary additive period
2. Mod $N$ and $G_N$ (MathAside: groups)
3. Order / Fermat / RSA equations
4. RSA protocol for Bob & Alice + tiny demo
5. Order-finding toy
6. Eve’s period attack (Table 3.1 paraphrase) + scrubber
7. Bridge to QFT post
