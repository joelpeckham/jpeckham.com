# 05 — Bernstein–Vazirani, Simon & Toffoli

| Field | Value |
| --- | --- |
| **Slug** | `quantum-oracles` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-oracles/` |
| **MDX** | `src/app/posts/quantum-oracles/page.mdx` |
| **Demos** | `src/components/interactive/quantum-oracles/` |

## Intent

Extend the oracle toolkit: recover a secret string $a$ in one BV query, collect Simon parity equations to find a hidden XOR period, and treat Toffoli as reversible AND (classically irreducible, quantumly synthesizable).

## Mermin corpus

Ch 2 §§2.4–2.6 (`book.md` ~L1342–~L1580): Bernstein–Vazirani ($a\cdot x$, phase kickback, Hadamard sandwich / cNOT reversal), Simon’s problem (two-to-one $f$, $y\cdot a=0$ samples, linear algebra), Toffoli construction notes.

## Demo briefs

1. **BvGuesserDemo** — Secret $a$; one simulated BV query vs $n$ classical basis queries; CircuitMini.
2. **SimonPeriodDemo** — Sample $y$ with $y\cdot a=0$; track rank; solve for period when $n-1$ independent.
3. **ToffoliTruthDemo** — Interactive truth table + ccNOT CircuitMini; AND special case.

## Outline

1. Harder oracles hook
2. BV + MathAside + BvGuesserDemo
3. Simon + SimonPeriodDemo
4. Toffoli + ToffoliTruthDemo
5. Bridge to RSA / Shor arc
