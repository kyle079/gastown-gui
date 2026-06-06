# Design

## Register
design-system

## Visual Direction
Vercel-grade modern high-tech with a **restrained Tron** influence. Dark, precise,
geometric. Structure comes from grid lines, hairline borders, and sharp corners;
legibility comes from a tight type scale and high-contrast text on deep ink.

What we take from Tron: **structure and precision** — the sense of a technical
control surface, digital geometry, mono accents. What we explicitly reject:
**the glow.** No neon bloom, no box-shadow halos on accents, no cyberpunk overload.
The accent color is applied flat. Quiet, composed, confident.

The design SERVES the work. This is an internal power tool for one expert operator
who lives in it all day — optimize for speed, glanceable signal, and keyboard control.

## The AI-Slop Test (banned tells)
Every surface must pass. We do **not** ship:
- Generic icon-card grids / identical repeated cards.
- Gradient text or gradient accents.
- Tiny uppercase "eyebrow" kickers used decoratively.
- Emoji-stuffed UI.
- Hero-metric templates (six identical stat cards in a row).
- Neon glow / colored drop-shadows.

Where a dashboard would reach for a 6-card metric grid, we use a single composed
stat strip (`MetricStrip`) — hairline-separated, numbers in mono, read left to right.

## Color Tokens
Source of truth: `web/src/styles/tokens.css` (RGB channel triples so Tailwind's
`/<alpha>` opacity modifiers work). Tailwind maps semantic names in
`web/tailwind.config.ts`. **No raw palette colors** (`indigo-500`, etc.) — semantic
tokens only.

### Surfaces (dark → light)
| Token | Use |
|-------|-----|
| `ink` | Deepest background; insets, key wells |
| `base` | App background |
| `surface` | Panels, cards |
| `raised` | Hover / lifted rows |
| `overlay` | Dialogs, popovers, palette |

Steps between surfaces are small and deliberate — composed, not crammed. The base
is deep ink with a faint cool undertone, never pure black.

### Lines & Text
| Token | Use |
|-------|-----|
| `line` | Hairline borders (the primary structural element) |
| `line-strong` | Emphasized edges, scrollbar thumb |
| `fg` | Primary text |
| `muted` | Secondary text |
| `faint` | Tertiary / disabled / labels |

### Accent — one only
| Token | Use |
|-------|-----|
| `accent` | Restrained technical cyan (`#34c0d4`). Focus rings, active nav, primary action. **Flat, never glowing.** |
| `accent-fg` | Text on accent fills |
| `accent-dim` | Idle/border accent |

### Status (desaturated for the dark base)
`ok` (green) · `warn` (amber) · `danger` (red) · `info` (blue). Used as flat fills at
low opacity (`/10`) with matching borders (`/30`), or as a 6px `StatusDot`.

## Shape, Type, Motion
- **Radius:** sharp. `sm 3px`, default `4px`, `md 6px`, `lg 8px`. No blobby `rounded-2xl`.
- **Type:** Inter for UI; JetBrains Mono / `ui-monospace` for IDs, metrics, addresses,
  and technical accents. A tight scale; `2xs` (0.6875rem) for labels.
- **Focus:** a 1px flat accent ring (`ring-1 ring-accent`). No glow.
- **Motion:** fast and quiet — 100–120ms fades/scales. `StatusDot` may pulse to mean
  "live"; nothing else animates decoratively.
- **Grid:** an optional faint structural grid (`bg-grid`) is available for empty
  expanses — used sparingly, never as wallpaper.

## Primitives
A real TypeScript + Tailwind component library (`web/src/components/primitives/`):
`Button`, `Input`, `Select`, `Badge` / `StatusDot` / `StatusPill`, `Panel` /
`PanelHeader` / `PanelBody`, `Table`, `ListRow`, `Kbd`, `Spinner`, `Dialog`,
`Toast` (provider + `useToast`). Plus the page-level `Surface` container.

Consistency comes from the system: surfaces compose primitives; primitives consume
tokens; nothing hardcodes a hex value.

## Keyboard-First
The expert drives by keyboard.
- **Command palette** (`mod+k`): fuzzy command list, `↑/↓` to move, `Enter` to run.
- **Navigation sequences** (`g` then a key): `g d` Dashboard, `g r` Rigs, `g w` Work,
  `g m` Mail, `g e` Escalations, `g t` Terminal.
- Shortcuts are **discoverable**: the sidebar reveals each surface's `g _` on hover;
  the palette lists every command's binding.

## Layout Principles
1. **One surface, one job.** The page header states the job; the body does it.
2. **Signal over noise.** What needs the operator (escalations, stalled agents,
   missing services) sorts to the top — see `AttentionPanel` on the Dashboard.
3. **Refined density.** Dense enough to be glanceable, composed enough to read.
4. Max content width ~1200px (widening to ~1440px at `2xl`); page padding via `Surface`
   (tightened on phones: `px-4 py-4`, `sm:px-6 sm:py-6`).

## Responsiveness & Breakpoints
The console is **one codebase for every screen**. The operator lives in it on desktop
(optimize for density) but also reaches for it on a phone (optimize for legibility and
touch). The rule: **dense on desktop, legible and touch-friendly on mobile** — never two
codebases, never a surface that dead-ends on a small screen, never sideways page scroll.

### The breakpoint system
We use Tailwind's default breakpoints, mapped to four device tiers. Design **mobile-first**:
unprefixed classes are the phone layout; each breakpoint prefix layers on more room.

| Tier | Tailwind | Min width | Verify at | Behavior |
|------|----------|-----------|-----------|----------|
| **Mobile** | (base) | 0 | **375** | Single column. Nav is an off-canvas **drawer** (hamburger in the top bar). Tables → stacked **cards**. Dialogs + command palette go **full-screen**. Roomier tap targets. |
| **Tablet** | `md` | 768 | **768** | Content uses full width; the dense `<table>` returns; metric strip goes 3-up. Nav is still the drawer (the rail would crowd the content). |
| **Desktop** | `lg` | 1024 | **1440** | Persistent **sidebar rail** (no hamburger). Dashboard goes multi-column (`lg:grid-cols-3`); metric strip is a single 6-up row. Peak density. |
| **4k** | `2xl` | 1536 | **3840** | Content **centers** at a ~1440px max — deliberately not stretched to the panel edge (a wall of full-bleed UI reads as noise). Generous margins are on-brand restraint. |

`sm` (640) is the mobile→small-tablet hinge: it's where dialogs/palette stop being
full-screen sheets and the metric grid steps from 2-up to 3-up.

### Per-area behavior
- **App shell** (`AppShell`): persistent `Sidebar` at `lg+` (`hidden lg:flex`); below `lg`
  the same `Sidebar` renders inside a slide-in drawer with a scrim, toggled by the top-bar
  hamburger. The drawer closes on navigation, on scrim click, and on `Escape`; body scroll
  locks while open. Height is `100dvh` so mobile browser chrome doesn't clip the layout.
- **Primitives:**
  - `Table` — renders a real `<table>` at `md+` and a stacked label/value **card** per row
    below `md` (labels come from the column headers). One schema, two layouts; no sideways scroll.
  - `Dialog` / `CommandPalette` — full-screen sheet below `sm`, centered modal at `sm+`.
  - `Surface` — tighter gutters on phones, wider max at `2xl`.
  - Tap targets — interactive nav rows and palette items grow their vertical padding below
    `lg`/`sm`; touch inputs (palette field) are ≥44px tall.
- **Dashboard:** `MetricStrip` is a hairline grid (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`,
  uniform 1px separators via `gap-px` over a `line`-colored track) so it wraps cleanly instead
  of showing broken vertical-only dividers. Panels stack to one column below `lg`.

### The aesthetic holds at every size
Restrained-Tron / Vercel restraint is **not** relaxed on mobile: same tokens, same hairlines,
same sharp corners, same flat accent. Mobile changes *layout and target size*, never the
visual language. Verify every new surface at **375 / 768 / 1440 / 3840** before shipping.

## Reference Surface
The **Dashboard** (`web/src/features/dashboard/`) proves the system end to end:
`AttentionPanel` (signal first) → `MetricStrip` (composed stats, not a card grid) →
`RigsPanel` (the work, a dense table) beside `HqPanel` + `ServicesPanel` (the
plumbing). All fed by the TanStack Query data layer from the live `gt` bridge.
