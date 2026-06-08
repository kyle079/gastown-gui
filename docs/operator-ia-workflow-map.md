# Operator Information Architecture and Workflow Map

Date: 2026-06-08
Issue: `gg-wuy`

## Goal

Make Gas Town GUI legible to a non-expert operator.

That means:

- every major surface has one obvious job
- navigation follows operator tasks, not internal data categories
- Gas Town jargon is introduced only after the operator already understands the action
- advanced inspection tools remain available, but stop competing with primary work

## Current Failure Modes

The app already has useful data and thoughtful components, but the operator model is
still fragmented.

### 1. Too many top-level choices

The current top level exposes twelve surfaces:

- Dashboard
- Activity
- Queue/Mail
- Operator
- Fleet
- Work
- Pull requests
- Issues
- Formulas
- Bead Graph
- Terminal
- Help

A new operator has to understand the system's nouns before they can answer a simple
question like "what needs me right now?"

### 2. Surface boundaries reflect subsystems, not jobs

Important operator tasks are split across multiple places:

- triage lives partly in Dashboard, Queue, Work, and Operator
- dispatch lives partly in Operator and Work
- review lives partly in Operator and Pull requests
- supervision lives partly in Fleet, Activity, and Terminal
- investigation lives partly in Activity, Issues, Formulas, and Graph

An expert can reconstruct the workflow. A new operator has to hunt.

### 3. Gas Town terminology arrives too early

Terms like `bead`, `convoy`, `formula`, `hook`, and `refinery` are useful, but they
should appear as supporting vocabulary, not as the first navigation decision.

### 4. Primary actions and expert tools have equal visual weight

The current information architecture treats high-frequency jobs and low-frequency
deep-inspection tools as peers. That makes the app feel like a toolbox instead of an
operator console.

## Operator Jobs

The GUI should be organized around the real jobs an operator performs during a shift.

### Job 1: Understand the state of the town

Questions:

- Is the system healthy?
- Which rig or agent needs attention first?
- Did anything important change recently?

### Job 2: Triage and unblock work

Questions:

- Who is blocked?
- Which messages or escalations require a reply?
- Which convoy, bead, or hook is stalled?

### Job 3: Start or redirect work

Questions:

- What should I ask the mayor to build?
- Which rig or agent should receive this work?
- Which workflow template should I use?

### Job 4: Supervise rigs and agents

Questions:

- Which rig is unhealthy?
- What is a specific agent doing?
- Do I need to nudge, inspect, or attach a terminal?

### Job 5: Land finished work

Questions:

- What is waiting for review?
- What is in the merge queue?
- Which PR or branch is blocked from landing?

### Job 6: Investigate odd behavior

Questions:

- What happened?
- How is a bead connected to other work?
- Which formula or dependency explains the current state?

### Job 7: Learn the system

Questions:

- What do these terms mean?
- What is the core loop?
- What should a first-time operator do next?

## Proposed Navigation Model

Reduce the primary navigation to job-based surfaces. Keep deep links for expert tools,
but demote them from the first decision layer.

### Tier 1: Primary navigation

1. `Overview`
   Purpose: start here, understand current state, find the highest-priority problem.
2. `Needs Attention`
   Purpose: triage messages, escalations, blocked work, and stuck agents in one queue.
3. `Dispatch`
   Purpose: create, route, and confirm new work.
4. `Fleet`
   Purpose: supervise rigs and agents, then intervene when needed.
5. `Landing`
   Purpose: review code, watch merge progress, and clear landing blockers.
6. `Investigate`
   Purpose: inspect history, issues, formulas, and dependency relationships.
7. `Help`
   Purpose: teach concepts, setup, and the core operator loop.

### Tier 2: Contextual tools, not primary nav

- `Terminal`
  Access from Fleet agent detail, Landing detail, and Investigate.
- `Activity`
  Keep as a tab or mode within Overview and Investigate.
- `Issues`
  Keep as a mode within Investigate.
- `Formulas`
  Keep as a mode within Dispatch and Investigate.
- `Bead Graph`
  Keep as a mode within Investigate.

## Current-to-Future Surface Mapping

| Current surface | Problem | Future home |
|---|---|---|
| Dashboard | Good summary, but not the full "what needs me?" answer | `Overview` |
| Activity | Important, but too raw as a primary destination | `Overview` secondary tab and `Investigate` |
| Queue / Mail | Already close to a real job | `Needs Attention` |
| Operator | Mixed bag: attention, dispatch, review, formulas | split across `Needs Attention`, `Dispatch`, and `Landing` |
| Fleet | Legitimate top-level job | `Fleet` |
| Work | Overlaps with triage and dispatch | split across `Needs Attention` and `Dispatch` |
| Pull requests | Real job, but should include merge-queue state too | `Landing` |
| Issues | Expert browse tool | `Investigate` |
| Formulas | dispatch support, not primary destination | `Dispatch` and `Investigate` |
| Bead Graph | advanced inspection tool | `Investigate` |
| Terminal | high-power tool, too advanced for primary nav | contextual action from `Fleet` and `Investigate` |
| Help | keep | `Help` |

## Surface Contracts

Each top-level surface should answer one question and lead with one primary action.

### 1. Overview

Primary question:
`What needs me first?`

Must contain:

- town health summary
- top 3 attention items across rigs, mail, and landing
- recent important changes, not the full raw stream
- one-click jump into the next job surface

Should not contain:

- dense browsing tools
- expert-only taxonomy

### 2. Needs Attention

Primary question:
`What is blocked, waiting, or asking for a decision?`

Must contain:

- unified queue of escalations, mail, blocked beads, stalled convoys, and unhealthy hooks
- clear severity ranking
- inline actions: acknowledge, reply, inspect agent, open rig, jump to landing blocker

This becomes the operator's inbox, not just the mail inbox.

### 3. Dispatch

Primary question:
`How do I send the right work to the right place?`

Must contain:

- ask-mayor entry
- target selection
- formula preview with plain-language summary
- dependency preview before sling/dispatch
- confirmation state after dispatch

This is where formulas belong as part of action composition, not as a separate noun-first destination.

### 4. Fleet

Primary question:
`Which rig or agent needs direct supervision?`

Must contain:

- rig list sorted by urgency
- rig detail with health, witness/refinery state, and active workers
- agent detail with current work, recent nudges/mail, and intervention actions
- terminal attach as an advanced action, not a starting point

### 5. Landing

Primary question:
`What is ready to land, and what is blocked from landing?`

Must contain:

- PR queue
- merge queue status
- refinery status
- review-needed items and failed landings
- links back to the owning rig, bead, and operator context

This replaces the split between `Operator > Review` and `Pull requests`.

### 6. Investigate

Primary question:
`Why is this happening?`

Must contain mode switches for:

- timeline
- issues
- formulas
- dependency graph

Every view should preserve deep linking, but the operator enters through one clear
investigation surface instead of choosing between several expert nouns.

### 7. Help

Primary question:
`How does Gas Town work, and what should I do next?`

Must contain:

- readiness and setup
- plain-language glossary
- first operator workflow
- keyboard shortcuts only after the workflow is understood

## Workflow Map

This is the intended top-level flow for a normal operator session.

### Start of shift

1. Open `Overview`
2. Identify the most urgent item
3. Jump into `Needs Attention`, `Fleet`, or `Landing`

### When an agent is blocked

1. `Needs Attention`
2. Open the blocked item
3. Inspect related agent or rig
4. Reply, nudge, or attach terminal if required
5. Return to queue

### When new work needs to be started

1. `Dispatch`
2. Describe the work or choose a workflow
3. Review target and dependency context
4. Dispatch
5. Return to `Overview` or `Landing` to monitor progress

### When work is ready to land

1. `Landing`
2. Review PR or queue blocker
3. Jump to owning rig, bead, or agent if context is missing
4. Resolve blocker
5. Confirm queue health

### When the operator does not understand what they are seeing

1. `Investigate`
2. Use timeline, issues, formulas, or graph
3. Return to the owning job surface once the cause is understood

## Copy and Terminology Rules

To keep the UI legible to a non-expert:

- lead with plain language, then show the Gas Town term as a secondary label
- every surface subtitle should answer "why would I come here?"
- empty states must suggest the next action
- badges and labels should describe operator impact before system internals
- do not put `Issues`, `Formulas`, `Graph`, or `Terminal` in the first-run path

Examples:

- `Needs Attention` with secondary label `mail, escalations, blocked work`
- `Landing` with secondary label `pull requests and merge queue`
- `Dispatch` with secondary label `targets and workflow templates`

## Routing Guidance

Preserve deep links and advanced URLs for experts, but remove them from the primary
navigation.

Suggested route shape:

- `/` -> `Overview`
- `/attention` -> `Needs Attention`
- `/dispatch` -> `Dispatch`
- `/fleet` -> `Fleet`
- `/landing` -> `Landing`
- `/investigate` -> `Investigate`
- `/help` -> `Help`

Legacy routes should redirect or mount as sub-modes:

- `/activity` -> `Investigate?mode=timeline`
- `/issues` -> `Investigate?mode=issues`
- `/formulas` -> `Investigate?mode=formulas`
- `/graph` -> `Investigate?mode=graph`
- `/prs` -> `Landing`
- `/mail` -> `Needs Attention`

## Implementation Phases

This bead defines the information architecture. The follow-on implementation bead
should execute in phases.

### Phase 1: Navigation and copy

- reduce top-level nav count
- rename surfaces around jobs
- add plain-language subtitles
- keep legacy routes working

### Phase 2: Consolidate triage

- merge mail, escalations, blocked work, and stuck convoy signals into `Needs Attention`
- remove duplicated attention panels from other surfaces

### Phase 3: Split action surfaces cleanly

- move dispatch concerns fully into `Dispatch`
- move review and merge concerns fully into `Landing`
- keep formulas available as dispatch support

### Phase 4: Create a single investigation workbench

- combine activity, issues, formulas, and graph under one parent surface
- preserve deep links and filters

### Phase 5: Contextualize expert tools

- remove Terminal from primary nav
- expose terminal attach from Fleet and detail pages

## Definition of Done for the Refactor Bead

The follow-on surface refactor should be considered successful when:

- a first-time operator can answer "what needs me now?" from one starting surface
- no top-level destination exists only because of backend object shape
- dispatch, triage, review, and supervision each have one clear home
- advanced tools remain available without dominating the first-run experience
- Gas Town terminology supports the workflow instead of defining it
