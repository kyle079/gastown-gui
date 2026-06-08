# IA Consolidation: Synthesis & Verification
**Bead:** gg-thj · **Date:** 2026-06-08

## What Landed

Seven beads shipped in sequence across the GUI IA consolidation epic:

| Bead | Work |
|------|------|
| gg-3qb | Create-work flow — file an issue without dispatching (NewWorkPanel stub) |
| gg-4p1 | Nav copy + label fixes — IA Phase 1 legibility |
| gg-5ix | Attention panels and metric strip made interactive |
| gg-9pt | Inline nudge/mail from terminal and activity feed views |
| gg-a79 | Nav collapse: 12 items → 7 job-based surfaces, legacy redirects for all old routes |
| gg-aa3 | First-run onboarding, plain-language glossary, actionable empty states throughout |
| gg-eij | DispatchSurface with dispatch/create/track tabs; AskMayorPanel; formula explorer |

**Net result:** `web/src/app/navigation.ts` defines exactly 7 `NAV_ITEMS` across two
sections (`Surfaces` / `Reference`). The router registers primary routes for
`/`, `/attention`, `/dispatch`, `/dispatch/$convoyId`, `/fleet`, `/fleet/$rig`,
`/landing`, `/landing/$owner/$repo/$prNumber`, `/investigate`, `/help`, and `/terminal`.
Thirteen legacy paths (`/mail`, `/rigs`, `/work`, `/prs`, `/activity`, `/issues`,
`/formulas`, `/graph`, `/ops`, `/catalog`, and variants) all redirect to their
new homes, preserving deep links.

---

## DoD Verification (operator-ia-workflow-map.md)

**1. "What needs me now?" from one starting surface.**
✅ Overview (`/`) renders `AttentionPanel` (clickable escalation and blocked-work rows,
each linking to `/attention/$id` or `/fleet/$rig`) and `MetricStrip` (live counts
linking to `/fleet` and `/dispatch`). A non-expert lands here, sees the urgent
count, and can click straight to the blocked item.

**2. No top-level destination exists only because of backend object shape.**
✅ Issues, Formulas, Activity, and Graph are all sub-modes of `InvestigateSurface`
(`/investigate?mode=timeline|issues|formulas|graph`). None hold a primary nav slot.
Terminal stays reachable at `/terminal` but is absent from `NAV_ITEMS`.

**3. Dispatch, triage, review, and supervision each have one clear home.**
✅
- **Dispatch** → `/dispatch` (DispatchSurface, tabs: dispatch / create / track)
- **Triage** → `/attention` (MailSurface — mail, escalations, blocked work in one queue)
- **Review** → `/landing` (PullRequestsPage — open/merged/closed/all, links to bead and rig)
- **Supervision** → `/fleet` (Fleet + RigDetail — agents, status, hook beads)

**4. Advanced tools remain available without dominating.**
✅ Terminal is one keypress away (keyboard shortcut `t`, or `/terminal` link in Help
readiness panel) but does not appear in the primary nav list.

**5. Gas Town terminology supports workflow instead of defining it.**
✅ `HelpSurface` (`/help`) leads with `WorkflowPanel` (plain-English steps referencing
Overview → Needs Attention → Dispatch → Fleet → Landing). `ConceptsPanel` lists the
plain term first (`A convoy is a batch of related tasks`) with the Gas Town label in
mono (`convoy`) shown after, introduced in context. Empty states across all surfaces
use plain language and name the next surface to visit.

---

## Operator Flow Check

**"What needs me now?" from one surface**
Starting at `/` (Overview): the AttentionPanel shows escalation count and blocked
work inline. Clicking any row routes to `/attention/$messageId` or `/fleet/$rig`.
No secondary search required. ✅

**Create work without knowing the formula name**
`/dispatch` → "Create" tab → `NewWorkPanel`. The panel offers a text field for
goal description + an "Ask Mayor" path (`AskMayorPanel`) for orchestration.
`FormulaExplorerPanel` lists all templates with type/description for guided
selection. The operator can file work or dispatch without knowing any formula name. ✅

**Act on every attention item by clicking**
`/attention` renders `MailSurface`. Each message row is a clickable
`Link to="/attention/$messageId"` (added in gg-5ix / gg-9pt). The nudge/mail
inline action panel is accessible from activity rows and terminal output. ✅

**Dispatch / triage / review / supervision each in one clear home**
Verified above in DoD criterion 3. Each surface is reachable from the sidebar
in ≤1 click, and cross-links use the new route paths throughout (confirmed by
grep across all feature files). ✅

---

## Reconciliation Against usability-review-gg-v19.md

The usability review flagged six categories of issues:

| Category | Finding | Status |
|----------|---------|--------|
| Nav overload | 12 items, many redundant or tool-named | ✅ Resolved — 7 items, job-named |
| Cognitive front-loading | Gas Town terms before plain language | ✅ Resolved — Help leads with plain English; empty states same |
| No "what now?" entry | First-time user has no starting surface | ✅ Resolved — Overview is the default route |
| Dead ends | Empty states with no next action | ✅ Resolved — all 6 major empty states point to next surface |
| Scattered related tools | Activity/Issues/Formulas/Graph at nav level | ✅ Resolved — all four under /investigate |
| Inline actions buried | Nudge/mail only accessible from dialogs | ✅ Resolved — inline in terminal and activity feed (gg-9pt) |

---

## What Remains

These items were explicitly deferred or fall outside the current epic:

1. **Terminal contextualization (phase 5)** — Terminal is accessible but not yet
   surfaced from Fleet or Dispatch context (e.g., "open terminal for this rig" from
   `RigDetail`). Filed as a follow-on.

2. **Investigate workbench depth** — The graph and timeline sub-modes are embedded
   but the graph view has no filtering or focus controls. A dedicated bead tracks
   this.

3. **Landing / merge-queue state integration** — `PullRequestsPage` lists PRs but
   does not yet surface MQ position or estimated merge time. This requires
   Refinery API work before the UI can show it.

4. **First-run onboarding trigger** — `ReadinessPanel` in Help shows static
   readiness signals. A proper "first time here?" detection and step-through
   onboarding flow was filed but not yet dispatched.

5. **Mobile responsiveness audit** — `ConvoyBoardPanel` has a mobile state-selector
   mode but no systematic mobile pass was done on the new surfaces.

---

## Summary

The 7-bead series lands a complete restructuring of the navigation and surface
architecture. The non-expert end-to-end flow — land on Overview, triage in Needs
Attention, create or dispatch in Dispatch, supervise in Fleet, review in Landing —
is fully clickable and each step names the next. All five DoD criteria from
`operator-ia-workflow-map.md` are met. The remaining items are deeper feature work
(not IA defects) and have been filed as separate beads.
