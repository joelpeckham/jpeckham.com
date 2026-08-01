# [jpeckham.com](http://jpeckham.com)

This is the source for my personal site. It's basically my resume — except the projects have buttons you can actually press.

**[Live site](https://jpeckham.com)** · **[Resume (PDF)](https://jpeckham.com/Joel_Peckham_Resume.pdf)** · **[Email](mailto:mail@jpeckham.com)** · **[GitHub](https://github.com/joelpeckham)** · **[LinkedIn](https://www.linkedin.com/in/joelpeckham/)** · **[X](https://x.com/peckham_joel)**

Anyway, I'm Joel! – a fullstack and AI developer based in Laramie, Wyoming. For the last three years I've been at [BetterRx](https://www.betterrx.com/) building hospice pharmacy software, and I graduated with a B.S. in Computer Science in 2022.

I work end-to-end and care about making software that helps people. When I'm not coding I'm outside — hiking, climbing, or skiing.

## What I do when someone's paying me

At BetterRx I own production systems on a platform serving 900+ hospices and 41,000+ active patients. A few things I've shipped:

- **Saved customers $154,000 a year.** Designed and built a Therapeutic Interchange manager and reporting suite that surfaces lower-cost medication alternatives and tracks the realized savings.
- **Cut core page load times in half.** Optimized the high-traffic RxQueue clinical screen with deferred loading, batched drug-warning checks, and caching — trimming Livewire payloads across all 900 hospices.
- **Owned the EMR/EHR integrations** (Epic, MatrixCare, Careficient, HospiceMD), syncing patients, medications, and prescriptions to the pharmacy via Surescripts — OAuth token lifecycle, rate limiting, retries with exponential backoff, and usage-based billing.
- **Rewrote the most-used clinical screen from the ground up** — the e-prescribe (NewRx) workflow — with draft persistence, robust validation, PHPStan level 8, and zero clinical downtime on cutover.
- Plus the unglamorous glue that keeps a platform honest: reporting dashboards, an app-wide layout/nav rewrite, custom PHPStan rules, MFA, and 1,000+ commits across the codebase.

## Stuff on this site you can actually click on

The reason I built this thing. Most of these run live in your browser — no video, no screenshots, just poke at them:

- **[lyriic](https://lyriic.com/)** — a free, local-first lyric and poetry editor with per-line syllable counts, optional meter rulers, and client-side rhyme/synonym lookup. Dictionaries ship as bit-packed packs so the editor stays fast without a backend. ([write-up](https://jpeckham.com/projects/lyriic/))
- **[Neural Network Visualizer](https://jpeckham.com/projects/neural-net-visualizer/)** — a neural net implemented from scratch (25 inputs, a hidden layer you can resize, 10 outputs) that you watch learn digit recognition iteration by iteration. Drag the learning rate, hover any weight, or draw your own digit and watch it overfit in real time.
- **[uwyoschedule](https://uwyoschedule.org/)** — a conflict-free class planner for University of Wyoming students. Under the calendar it's a constraint-satisfaction solver: meeting times become `Uint32Array` bitmasks so a conflict check is a single bitwise AND, backtracking search uses minimum-remaining-values + forward checking, and a branch-and-bound pass keeps your week from reshuffling when you pin one class. All off the main thread in a Web Worker. ([write-up](https://jpeckham.com/projects/uwyo-schedule/))
- **[RAID Visualizer](https://jpeckham.com/projects/raid-visualizer/)** — pick a RAID level (0, 1, 4, 5, 10), write data across the array, fail a drive, and watch it rebuild using real XOR parity. Built originally to teach storage in an OS course.
- **[8-Puzzle Solver](https://jpeckham.com/projects/8-puzzle-solver/)** — race A, Greedy Best-First, and BFS against each other on the same board, swap between Manhattan and Hamming heuristics, and scrub through the solution path tile by tile.
- **[No-Bullshit QR](https://qr.jpeckham.com/)** — a paywalled QR generator broke a friend's printed posters (turns out "your" code was pointing at *their* redirect), so I built a free one that encodes your real URL, never holds it hostage, and exports proper SVG and sized PNG. ([write-up](https://jpeckham.com/projects/no-bullshit-qr/))
- **[GPT-Powered Stock Trading Research](https://jpeckham.com/projects/gpt-powered-stock-trading-research/)** — my senior research: could a transformer read a news article and call the stock? I scraped 140,000 articles and fine-tuned GPT-J-6B on Google's TPU Research Cloud. (Spoiler: it performs about as well as a coin flip, and I explain why.)
- **[FORTH interpreter in ~130 lines of Python](https://jpeckham.com/projects/forth-compiler-in-python/)** — a compile-then-interpret implementation of the stack-based FORTH language, small enough to actually read.

## How the site itself is built

The boilerplate half. It's a [Next.js](https://nextjs.org/) 16 App Router app (React 19, TypeScript), styled with Tailwind CSS v4, content authored in MDX, and deployed on [Vercel](https://vercel.com/). The whole thing rides on a hand-built Bauhaus-inspired design system — flat primary colors, heavy ink rules, hard offset shadows, and geometric type — so the marketing pages and the interactive demos all feel like one product.

```bash
pnpm install     # Node 24, pnpm
pnpm dev         # local dev server
pnpm build       # production build
pnpm test        # Vitest
pnpm typecheck   # tsc --noEmit
```



## The toolbox

- **Languages:** PHP, JavaScript, TypeScript, Python, SQL, C, C++, C#, Bash
- **Backend:** Laravel, Node.js, Eloquent ORM, Drizzle ORM, REST APIs, OAuth
- **Frontend:** Livewire, FluxUI, React, Next.js, Alpine.js, Tailwind CSS
- **Data & infra:** MySQL, Postgres, Redis, AWS (RDS, Secrets Manager, CloudWatch), Docker, Linux, Vercel
- **Testing & quality:** Pest, PHPUnit, PHPStan, Playwright, Vitest, CI/CD



## Let's talk

If any of this looks like the kind of person you want on your team, I'd love to hear about it. The fastest way to reach me is [mail@jpeckham.com](mailto:mail@jpeckham.com) — or a text to +1 (307) 631-1986. Say hey!