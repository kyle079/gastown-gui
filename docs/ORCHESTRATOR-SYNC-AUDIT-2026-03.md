# Gastown Upstream Sync Audit - March 2026

## Executive Summary

This audit answers the actual sync question: what does `gastown-gui` need in order to stay aligned with upstream [`steveyegge/gastown`](https://github.com/steveyegge/gastown) and [`steveyegge/beads`](https://github.com/steveyegge/beads)?

Current conclusion:

- The February CLI-compatibility work already covered the major command/flag drift.
- The main remaining upstream mismatch was tmux session naming.
- Upstream `gastown` no longer assumes `gt-<rig>-<agent>` session names. It uses town-level `hq-*` names plus rig-specific prefixes loaded from `mayor/rigs.json`.
- That mismatch is now fixed on this branch.
- After this fix, the GUI is materially in sync with current upstream `gastown` for the server-side surfaces it uses.

## Upstream Reference Point

This audit was checked against these upstream heads:

- `steveyegge/gastown` at `3b4460b` (`2026-03-18`)
- `steveyegge/beads` at `27b24a2` (`2026-03-18`)

The key upstream session-name sources are:

- `/tmp/gastown-upstream-e6xIMD/internal/session/names.go`
- `/tmp/gastown-upstream-e6xIMD/internal/session/identity.go`
- `/tmp/gastown-upstream-e6xIMD/internal/session/registry.go`

## What Changed Upstream That Matters To The GUI

### 1. Session names are now prefix-based, not rigid `gt-*`

Upstream now resolves rig-level tmux session names from the rig prefix registry in `mayor/rigs.json`.

Current upstream patterns:

- Mayor: `hq-mayor`
- Deacon: `hq-deacon`
- Witness: `<prefix>-witness`
- Refinery: `<prefix>-refinery`
- Crew: `<prefix>-crew-<name>`
- Polecat: `<prefix>-<name>`

The rig prefix is not necessarily `gt`. It is resolved per rig from `mayor/rigs.json`, with fallback behavior if a rig is unknown.

### 2. The GUI still had hardcoded legacy assumptions

Before this branch, the GUI still assumed old-style tmux naming in multiple places:

- `server/domain/values/AgentPath.js` generated `gt-<rig>-<agent>`.
- `server/services/StatusService.js` parsed `tmux ls` output as `gt-rig-agent`.
- `server.js` used hardcoded session names like `gt-mayor`, `gt-${name}`, and `gt-${target}` for status, output, restart, stop, and nudge behavior.

That made the GUI drift out of sync with upstream `gastown` even though the CLI commands themselves were mostly already compatible.

## Fix Implemented On This Branch

This branch adds registry-aware session handling that mirrors the upstream model.

### New code

- `server/domain/session/SessionNames.js`
  - reads `mayor/rigs.json` first and falls back to `rigs.json`
  - caches prefix registry data
  - maps addresses to current tmux session names
  - parses current tmux session names back into agent identities
  - preserves compatibility for legacy `rig/polecats/name` addressing

### Updated code

- `server/domain/values/AgentPath.js`
  - now requires a rig prefix when deriving a tmux session name
- `server/services/StatusService.js`
  - now parses tmux sessions through the registry-aware parser
  - correctly marks witness, refinery, and polecat hooks as running under current upstream names
- `server.js`
  - resolves mayor output through `hq-mayor`
  - resolves polecat stop/restart/output/transcript through the rig prefix registry
  - resolves nudge targets through current upstream session naming
  - resolves service status/down fallback behavior through the same registry
  - clears the session registry cache after rig add/remove operations

### Tests added or updated

- `test/unit/sessionNames.test.js`
- `test/unit/agentPath.test.js`
- `test/unit/statusService.test.js`

Verification result:

- `npm test`
- `37` test files passed
- `321` tests passed

## Remaining Required Sync Work

No additional required backend sync work was found after the session-prefix fix.

Specifically, I did not find a newer upstream `gastown` or `beads` CLI contract change that currently forces another GUI server change in these areas:

- convoy flows
- sling/escalate flows
- mail flows
- formula run flows
- beads create/list/show/update/close/defer flows
- rig and crew flows already covered by the February compatibility pass

In practical terms: if the goal is “make this GUI work correctly with current upstream Gastown,” the tmux session-name alignment was the material missing piece.

## Optional Hardening

These are optional, not blockers for upstream compatibility:

- The GUI can eventually switch any text-parsed rig listing to `gt rig list --json` where appropriate.
- More direct integration tests against a real upstream `gastown` checkout would reduce future drift risk.
- A dedicated compatibility test that exercises non-`gt` rig prefixes would be useful beyond the current unit coverage.

## Recommendation

Treat this branch as the upstream sync branch.

After this change set:

- the GUI’s server-side session handling matches current upstream `gastown` semantics
- the previously identified session-name drift is resolved
- no additional required upstream CLI migration was identified for the GUI surfaces currently in use
