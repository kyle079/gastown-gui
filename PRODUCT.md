# Product

## Register
product

## Users
Single power user — the operator running Gas Town, in this console all day. Expert. Wants speed, keyboard control, and signal over noise.

## Product Purpose
The control console for the Gas Town agent system: monitor and steer rigs, polecats, convoys, and the work / mail / escalation queues and live activity, then act fast (authorize escalations, dispatch work, respond). Includes attaching to agent tmux sessions from the browser (web terminal). Internal tool: design SERVES the work.

## Brand Personality
Vercel-grade modern high-tech with a RESTRAINED TRON influence: dark, precise, geometric, digital structure (grid lines, sharp edges, technical legibility) — but WITHOUT the glowing neon accents or cyberpunk overload. Quiet, composed, confident. A professional control surface, not a generated dashboard.

## Anti-references
- The AI-generated look (banned): generic icon-card grids, gradient text/accents, tiny uppercase eyebrow kickers, emoji-stuffed UI, identical repeated cards, hero-metric templates.
- The Tron neon-glow cliche / cyberpunk neon overload — we want Tron's structure and precision, NOT the glow.
- The current gastown UI: too dense, too noisy, surfaces doing too much.

## Design Principles
1. Vercel-grade restraint. Refined density, composed not crammed.
2. One surface, one job. Each view does less, well; cut what doesn't earn its place.
3. Signal over noise. Surface what needs the operator (escalations, blockers, failures) first.
4. Keyboard-first power tool. Command palette + shortcuts; the expert drives by keyboard.
5. Reusable primitives. A real TypeScript + Tailwind component library; consistency from the system.
6. Kill the AI tells. Pass the AI-slop test on every surface.

## Accessibility & Inclusion
Not a priority. Single expert user; optimize for speed, keyboard control, and glanceable legibility.

## Tech Foundation
React + TypeScript + Vite + Tailwind + TanStack Router + TanStack Query. Presentational components fed by TanStack Query from the gt backend. New capability (later phase): web terminal (xterm.js) attaching to gt tmux sessions via a PTY-over-websocket bridge in the Express server.
