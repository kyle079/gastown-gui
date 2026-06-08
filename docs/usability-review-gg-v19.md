# Usability Review: Navigation, Information Architecture, Cognitive Load

Date: 2026-06-08
Issue: `gg-v19`
Reviewer: polecat/onyx

Reference: `docs/operator-ia-workflow-map.md` (`gg-wuy`) — the IA redesign proposal
this review validates and extends.

---

## Summary

The codebase confirms every failure mode identified in `operator-ia-workflow-map.md`.
This review adds concrete code-level evidence, grades each finding, and flags three
issues the IA doc did not capture.

Severity: **MAJOR** (multiple issues block the operator's primary jobs)

---

## 1. Navigation

### 1a. Duplicate "Browse" verb in Inspect section — MAJOR

`web/src/app/navigation.ts`:

```ts
{ label: 'Browse', objectLabel: 'Issues', ... section: 'Inspect', seq: 'i' },
{ label: 'Browse', objectLabel: 'Formulas', ... section: 'Inspect', seq: 'f' },
```

Two nav items share the same verb. The verb-as-differentiator pattern (used well
elsewhere: Monitor, Watch, Unblock, Direct, Track…) breaks here. An operator scanning
the rail sees "Browse / Issues" and "Browse / Formulas" as visually identical entries
with nothing distinguishing them except the noun. If the operator is acting on memory
or keyboard sequence, there is no intent signal.

Fix: distinct verbs. Candidates: `Trace` for Issues (already used for Graph — also
a collision), `Query` / `Search` / `Find` for Issues, `Templates` for Formulas as a
noun-label. The cleanest fix is to consolidate both under an `Investigate` surface
per the IA doc.

### 1b. Nav label ≠ surface title — three mismatches — MAJOR

| Nav label | Surface title (TopBar h1) | Route |
|-----------|--------------------------|-------|
| Unblock | Queue | `/mail` |
| Operate | Operator | `/ops` |
| Direct | Fleet | `/rigs` |

Every time the operator lands on a surface, the name in the top bar is different from
the name they just clicked. "Unblock" → "Queue" is the worst: the operator's mental
model of "I'm going to unblock something" collides with a generic queue concept.
"Direct" → "Fleet" and "Operate" → "Operator" are softer but still dissonant.

The sidebar label is intent-focused (good) but the surface title should confirm
arrival at the right place. Either make surface titles match the nav verb, or choose
one naming layer (noun vs intent) and apply it consistently.

### 1c. `g e` dead sequence — MODERATE

`docs/DESIGN.md` specifies: "`g e` Escalations" as a keyboard shortcut.
`web/src/app/navigation.ts` has no entry for escalations — the `/escalations` route
exists and works as a URL, but:
- No nav item → no sidebar entry
- No nav item → no `g e` keyboard binding registered in `CommandPaletteProvider`
- No nav item → not listed in the command palette

Pressing `g e` silently does nothing. The keyboard-first user who read DESIGN.md
will press `g e` and get no response. This is a UX trust failure ("my keyboard
doesn't work here?").

Root: `EscalationsSurface` is just `MailSurface` with `defaultFilter="escalations"`.
Removing the route or merging it explicitly into the mail/unblock nav entry would
close the gap. If escalations needs a distinct keyboard entry, add it to NAV_ITEMS.

### 1d. `g g` for graph is awkward — LOW

`navigation.ts`: graph has `seq: 'g'`, producing the sequence `g → g`.
`useKeySequence` arms on the first `g` and fires on the second. Technically works
(800ms window), but `g g` is the least ergonomic chord in the set and the graph is
a low-frequency destination. Not a hard bug but worth noting.

---

## 2. Information Architecture

The IA doc (`gg-wuy`) already maps this well. The code confirms:

### 2a. Three parallel "needs attention" panels — MAJOR

| Component | Location | Interactive? | Data scope |
|-----------|----------|--------------|------------|
| `AttentionPanel` | Dashboard | **No** — text-only | Stalled/blocked agents, rig health, unread mail |
| `WorkAttentionPanel` | Work surface | **No** — text-only | Convoy + bead-level attention |
| `AttentionInboxPanel` | Ops surface, Attention tab | **Yes** — click to navigate | Stalled agents + escalations + ready beads |

An operator who sees "Refinery missing" in the Dashboard `AttentionPanel` cannot
click through to fix it — they must remember which surface handles refinery config,
navigate there manually, and hope the item is still prominent. The Ops surface has
a richer, clickable version of the same data, but the operator may not know to go
there.

Fix (short-term): make `AttentionPanel` items navigable (link to `/rigs/$rig`
for rig-health items, `/mail` for unread mail). Fix (structural): the IA doc's
"Needs Attention" surface consolidation removes the duplication entirely.

### 2b. Dispatch and formula access split across three surfaces — MAJOR

Dispatch capability appears in:
1. **Work surface** (`/work`): `DispatchDialog`, `AskMayorPanel`, `BeadQueuePanel`
2. **Ops surface** (`/ops`, Dispatch tab): `DispatchCommandCenter`, `AskMayorPanel`, `FormulaExplorerPanel`
3. **Issues view** (`/issues`): `ActionHubPanel` embedded inside the issue detail

`AskMayorPanel` is imported from `features/ops/` and rendered both in `OpsSurface`
and `WorkSurface` — two surfaces in different nav sections present the same primary
action with no clear canonical home. An operator who wants to dispatch work must
either guess or learn both surfaces.

Fix: dispatch belongs in one surface. The IA doc proposes `/dispatch` as the
dedicated home. Until then, remove `AskMayorPanel` and `DispatchDialog` from
`WorkSurface` (keep it in Ops/Dispatch tab).

### 2c. `FormulaExplorerPanel` appears in two Ops tabs — MODERATE

In `OpsSurface`, `FormulaExplorerPanel` is rendered in both the `dispatch` tab and
the `formulas` tab simultaneously. The `dispatch` tab uses it to preview a formula
before slinging; the `formulas` tab is a standalone exploration view. The component
is the same, but the surrounding intent is different enough that navigating from
Dispatch → Formulas tab loses context (selected formula state is shared via local
state, but the tab switch is jarring).

The `/formulas` nav entry is also a separate full-page surface. Three access points
for the same component (dispatch tab, formulas tab, `/formulas` route) signal that
formulas haven't found a stable home.

### 2d. `/escalations` orphaned route — MODERATE

`EscalationsSurface` at `/escalations` just renders `MailSurface` with a filter:

```ts
export function EscalationsSurface() {
  return <MailSurface defaultFilter="escalations" />;
}
```

There is no nav entry, no command palette entry, no keyboard sequence. The route
exists as a legacy or deep-link target but the operator cannot discover it from the
UI. The mail surface already handles escalations via its filter tabs. Either:
- Remove the orphaned route and update any inbound links to `/mail?filter=escalations`
- Add it to NAV_ITEMS with `seq: 'e'` to match DESIGN.md's stated shortcut

### 2e. Work surface description does not reflect its scope — LOW

`WorkSurface` title: "Work", description: "Operator triage board for convoys, queued
beads, and the next move." But the surface also contains `AskMayorPanel` (dispatch)
and `BeadQueuePanel` (backlog), making it more of a hybrid triage+dispatch board.
The mismatch between the stated job ("triage board") and the actual function
(triage + dispatch + backlog) contributes to operator uncertainty about which surface
to use for dispatch vs triage.

---

## 3. Cognitive Load

### 3a. Dashboard attention panel is non-interactive — MAJOR

The Dashboard is the highest-value surface for the operator's "what needs me?" job.
The `AttentionPanel` surfaces the right signal (stalled agents, missing rig health,
unread mail) but items are not clickable. The operator reads the list, then has to
navigate separately. This is two steps where one would do.

Stalled agent → should link to `/rigs/$rigName` or the agent detail.
Unread mail → should link to `/mail`.
No witness/refinery → should link to `/rigs/$rigName`.

The Ops `AttentionInboxPanel` already does this correctly. The Dashboard version
should match.

### 3b. Twelve top-level nav items — MAJOR

The sidebar presents 12 items before the operator has any working mental model.
Four sections (Run / Coordinate / Inspect / Reference) help structure them, but
section names are still abstract ("Coordinate" vs "Inspect" vs "Run" requires prior
knowledge of what each contains).

Per the IA doc, the right target is ~7 top-level items organized by operator job,
not by subsystem noun.

### 3c. Section labels are system-internal, not task-oriented — MODERATE

"Run" is the only section label that maps to an obvious operator intent. "Coordinate"
sounds like it means "work with others" but actually contains Ops, Rigs, and Work.
"Inspect" sounds like debugging but contains PRs and Issues. "Reference" contains
Terminal and Help — arguably the least similar pair.

The IA doc proposes organizing navigation around the operator's questions, not around
subsystem categories.

### 3d. Intent-focused nav labels obscure the nouns — MODERATE

The intent-label system (Monitor, Watch, Unblock, Operate…) is clean in principle
but creates problems in practice:

- Command palette search: "Go to Unblock" is what a first-time user would type if
  they remembered the label; but they might type "mail" or "inbox" and get no match.
  The `keywords` fields help (`['mail', 'message', 'send', 'reply', 'new']` on
  Compose), but NAV_ITEMS navigation commands only include `objectLabel` as a keyword.
  An operator who types "escalations" in the palette gets no result because no nav
  item includes "escalations" in its keywords.

- New operator onboarding: the first time someone sees the nav rail, "Unblock" as
  a mail destination is non-obvious. The secondary label ("Mail and escalations
  queue") disambiguates but requires reading two lines.

Quick fix: add common noun synonyms to nav item keywords, or include the `objectLabel`
directly in the command palette's keyword matching.

Relevant code in `CommandPaletteProvider.tsx`:

```ts
const nav: Command[] = NAV_ITEMS.map((item) => ({
  // ...
  keywords: [item.label, item.objectLabel, item.section, 'goto', 'open'],
```

The `objectLabel` IS included as a keyword, so "mail" would match "Mail and
escalations queue". But "escalations" as a standalone word would not match because
`objectLabel` is matched as a substring via the loose fuzzy match — actually it
would since `objectLabel` is included and the fuzzy match scans for subsequences.
This is less of an issue than initially assessed; however "escalation" (singular)
would match "escalations" in the haystack. Testing needed to confirm.

### 3e. MetricStrip values are non-interactive — LOW

The dashboard metric strip (Rigs / Polecats / Active hooks / Crews / Witnesses /
Refineries) shows counts but clicking a number does nothing. Power users expect
counts to be links. "3 Active hooks" should navigate to the work surface or filter
it by active hooks. "0 Witnesses" should navigate to Fleet filtered to rigs without
witnesses. This is a low-priority enhancement but reduces the surface's utility as
a command center.

---

## 4. What Works Well

Not all findings are negative. The following patterns are correct and should be
preserved in any refactor:

- **Signal-over-noise ordering**: Dashboard → AttentionPanel first, then MetricStrip,
  then content. Correct hierarchy.
- **Keyboard sequence system** (`g d`, `g r`, etc.): clean implementation in
  `useKeySequence`. The 800ms timeout is generous without being slow.
- **Command palette keywords**: nav items include `objectLabel`, `section`, and intent
  verbs — good fuzzy search surface.
- **Active state detection**: sidebar correctly highlights the active route
  (prefix match handles nested routes like `/rigs/foo`).
- **Responsive tap targets**: `py-2.5` on mobile, `lg:py-1.5` on desktop — correct
  scaling.
- **Section grouping in sidebar**: Run / Coordinate / Inspect / Reference is a
  reasonable first-pass grouping even if the labels need refinement.
- **`--sidebar-w` CSS var**: clean approach to sidebar width that avoids magic numbers
  in layouts.
- **`AttentionInboxPanel`** in Ops: the richest attention UI — interactive items,
  proper routing, next-action badges. This is the right pattern; Dashboard and Work
  should match it.

---

## 5. Priority Order for Fixes

| Priority | Finding | Effort |
|----------|---------|--------|
| 1 | Make Dashboard `AttentionPanel` items clickable (3a) | Small |
| 2 | Resolve nav label / surface title mismatches (1b) | Small |
| 3 | Fix duplicate "Browse" verb in nav (1a) | Small |
| 4 | Register `g e` sequence or remove `/escalations` route (1c) | Small |
| 5 | Remove `AskMayorPanel` + `DispatchDialog` from `WorkSurface` (2b) | Moderate |
| 6 | Begin IA consolidation per `gg-wuy` proposal (2a, 2b, 3b) | Large |

Items 1–4 are independent and can land in any order without the full IA refactor.
Item 5 depends on a decision about where dispatch lives. Item 6 is the structural
work already proposed in `gg-wuy`.

---

## 6. Out of Scope

This review does not cover:

- Visual design / token consistency (separate audit in `tronvercel-consumption-audit.md`)
- Mobile layout fidelity (would require browser testing at 375px)
- Functional correctness of data displayed
- Performance / query behavior
