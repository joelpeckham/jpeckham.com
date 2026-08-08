# 07 — Quantum Fourier Transform & Period Finding

| Field | Value |
| --- | --- |
| **Slug** | `quantum-qft-period` |
| **Status** | Shipped draft |
| **Hub** | `/projects/quantum/` |
| **Post** | `/posts/quantum-qft-period/` |
| **MDX** | `src/app/posts/quantum-qft-period/page.mdx` |
| **Demos** | `src/components/interactive/quantum-qft-period/` |

## Intent

Teach Shor’s engine room: prepare $\sum |x\rangle|f(x)\rangle$, collapse to periodic input state, QFT peaks near $j\,2^n/r$, continued-fraction recovery of a divisor of $r$. Intuition over full gate decomposition; App K example included.

## Mermin corpus

- Ch 3 §§3.4–3.9 (preliminaries, QFT, period extraction, mod-exp, phase errors)
- Appendix K (continued fractions; $y=11490$, $n=14$, $r=77$)
- Cite Mermin 2007

## Demo briefs

1. **PhaseWheelDemo** — small-register QFT peak visualizer + phase wheel.
2. **ModExpAmplitudeDemo** — $a^x\bmod N$ grid; measure $f_0$; equal amplitudes on arithmetic progression.
3. **ContinuedFractionDemo** — convergents of $y/2^n$ → candidate period.

## Outline

1. Recap: need period of $f(x)=b^x\bmod N$
2. Two registers, $U_f$, measure output → $|x_0+kr\rangle$
3. Why QFT (kill unknown $x_0$ into a phase)
4. Peak formula intuition + phase wheel demo
5. Mod-exp amplitude sketch
6. Continued fractions (MathAside) + App K toy
7. Bridge to factoring post
