# Orchestrator Sync Audit - March 2026

## Executive Summary

If your orchestrator last synced with `gastown-gui` around the last major merge window on `2026-02-12`, use commit `92863ea` as the primary baseline. That merge window ended with GUI version `0.9.4`. Current `origin/master` is `b375753` / `v0.9.5`.

Between `0.9.4` and `0.9.5`, there are no new backend API contracts, no new WebSocket message types, and no new Gastown/Beads command compatibility fixes in the GUI server. The meaningful deltas are:

- Nix / NixOS packaging and service deployment support.
- UI navigation changes that move several views under a `More` dropdown.
- Empty-state and onboarding affordances for new users.
- Test helper changes required for UI automation that assumed every view was a top-level tab.

If your orchestrator is already aligned to the `2026-02-12` CLI-compatibility work, this is a low-risk sync. Most environments do not need server code changes. They may need deployment config changes and browser automation updates.

## How The Baseline Was Inferred

The "few weeks ago" sync point most likely maps to the big merge cluster on `2026-02-12`:

- `d03cb14` - merge of PR `#9`, package version still `0.9.2`
- `daf4261` - merge of PR `#10`, package version `0.9.3`
- `92863ea` - merge of PR `#11`, package version `0.9.4`

That is the last substantial merge window before the March work. The March changes start on `2026-03-03` and run through `2026-03-19`.

## Upstream Reference Point

This audit was checked against the upstream projects the GUI wraps:

- Gastown: <https://github.com/steveyegge/gastown>
- Beads: <https://github.com/steveyegge/beads>

For local command mapping history, see [CLI-COMPATIBILITY.md](../CLI-COMPATIBILITY.md).

## Changes Since `92863ea` (`v0.9.4`)

### 1. Deployment and Packaging

New Nix support was added in [flake.nix](../flake.nix) and [nix/deployment.nix](../nix/deployment.nix#L1). This introduces:

- A flake package and app entrypoint.
- A NixOS module exposing `services.gastown-gui.*`.
- Optional `gtPackage` and `beadsPackage` service-path injection so the service can find both CLIs.
- Configurable `user`, `group`, `createUser`, and `createGroup`.
- Optional `GT_ROOT` injection with an absolute-path assertion.
- Systemd hardening defaults like `NoNewPrivileges`, `PrivateTmp`, and `ProtectSystem`.

Relevant references:

- [README.md](../README.md#L65) documents flake build and NixOS service setup.
- [nix/deployment.nix](../nix/deployment.nix#L16) adds `gtPackage`.
- [nix/deployment.nix](../nix/deployment.nix#L22) adds `beadsPackage`.
- [nix/deployment.nix](../nix/deployment.nix#L46) adds service identity controls.
- [nix/deployment.nix](../nix/deployment.nix#L70) adds `gtRoot`.
- [nix/deployment.nix](../nix/deployment.nix#L112) builds the runtime `PATH`.
- [nix/deployment.nix](../nix/deployment.nix#L119) defines the hardened `systemd` service.

### 2. UI Navigation Restructure

The header nav was compacted. Several views are no longer first-class top-level tabs:

- `crews`
- `formulas`
- `prs`
- `issues`
- `mail`
- `health`

They now live under a `More` dropdown in [index.html](../index.html#L61). The app wiring in [js/app.js](../js/app.js#L218) was updated to:

- Handle dropdown-item clicks.
- Toggle dropdown open/closed state.
- Mark the dropdown toggle active when a dropdown view is selected.
- Mirror unread mail count onto the new `more-badge`.

This was also stabilized after PR `#13` so dropdown views actually switch correctly:

- [js/app.js](../js/app.js#L256)
- [test/setup.js](../test/setup.js#L115)

### 3. New-User UX Additions

The dashboard now shows a getting-started banner when the system is empty:

- [js/components/dashboard.js](../js/components/dashboard.js#L185)
- [js/components/dashboard.js](../js/components/dashboard.js#L246)

The rigs view empty state now includes a first-rig CTA:

- [js/components/rig-list.js](../js/components/rig-list.js#L22)

To make those dynamically rendered CTA buttons work, modal opening was changed from static binding to delegated click handling:

- [js/components/modals.js](../js/components/modals.js#L102)

### 4. Non-Functional Metadata

These do not require orchestrator changes:

- Sponsor links added to [README.md](../README.md#L3)
- Version bump to `0.9.5` in [package.json](../package.json#L1)

## Required Changes In The Orchestrator

### Required If You Deploy Through Nix / NixOS

If your orchestrator consumes the GUI as a Nix package or NixOS service, update it to match the new service contract in [nix/deployment.nix](../nix/deployment.nix#L1):

- Pass both `gtPackage` and `beadsPackage` if the service environment does not already expose `gt` and `bd`.
- Set `user` and `group` explicitly if you do not want the default `gastown:gastown`.
- Set `createUser = false` and `createGroup = false` if you already manage the service account elsewhere.
- Ensure `gtRoot` is absolute if you set it.
- Expect the service to run with stronger systemd hardening than before.

If you do not use the Nix/NixOS path, this section is not required.

### Required If You Have Browser Automation Or Screenshot Flows

Any orchestration that clicks top navigation items by assuming they are always visible must be updated. Since [index.html](../index.html#L82), `prs`, `mail`, `issues`, `formulas`, `crews`, and `health` may require opening the dropdown first.

Minimum change:

- Do not assume `[data-view=\"prs\"]` is a visible top-level tab.
- Do not assume `[data-view="prs"]` is a visible top-level tab.
- Use a visible-element click strategy or explicitly open `.nav-dropdown-toggle` first.
- Mirror the logic in [test/setup.js](../test/setup.js#L115) if you have Puppeteer or Playwright flows.

Without this change, automation can report false failures even though the app is working.

## Recommended Changes In The Orchestrator

- If you surface guided onboarding or first-run screenshots, account for the new welcome banner and rig empty-state cards in [js/components/dashboard.js](../js/components/dashboard.js#L246) and [js/components/rig-list.js](../js/components/rig-list.js#L22).
- If you rely on unread mail badges in the header, note that unread counts now also appear on `#more-badge` in [js/app.js](../js/app.js#L767).
- If you had custom modal-open hooks bound only at page load, align them with the delegated click behavior in [js/components/modals.js](../js/components/modals.js#L102).

## No Changes Required

Assuming your local sync already includes the `2026-02-12` compatibility work, no new changes are required for:

- REST API endpoints
- WebSocket message schema
- CLI flag compatibility with upstream Gastown / Beads
- Server-side request payloads
- Security model around CLI execution

There were no new backend route files, gateway changes, or `server.js` behavior changes after `92863ea`.

## Important Caveat If Your Real Baseline Was Older Than `0.9.4`

If your orchestrator actually stopped at `0.9.2` or earlier, then you are missing the February CLI-compatibility work, which was material:

- Current Gastown command mappings
- Current Beads command mappings
- Witness/refinery rig handling fixes
- XSS and review-driven fixes from the February review cycle

In that case, do not treat this as a March-only sync. You need the February compatibility set first. The main references are:

- [CLI-COMPATIBILITY.md](../CLI-COMPATIBILITY.md)
- merge `d03cb14`
- merge `daf4261`
- merge `92863ea`

## Verification

Current `origin/master` was validated locally with the full test suite:

- `npm test`
- Result: `36` test files passed, `316` tests passed

## Recommendation

Sync your orchestrator to current `origin/master` if your last integration point was around `2026-02-12`. Treat this as:

- Deployment update required only for Nix/NixOS consumers.
- UI automation update required for dropdown navigation consumers.
- No backend integration migration required.
