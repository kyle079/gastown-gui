# PR 20 Review - `fix: parse rig names with emoji status indicators`

Date: 2026-03-27
Reviewer: Codex (third-party review)

## Verdict

**Request changes before merge.**

The PR correctly fixes `/api/rigs` parsing for emoji-prefixed rig lines, but it introduces/keeps a blocking regression path in setup status detection for environments where `gt rig list --json` is unsupported.

## Scope Reviewed

- PR metadata + commit + full diff (`gh pr view 20`, `gh pr diff 20`)
- Docs read in full: `CLAUDE.md`, `CODEBASE_DOCUMENTATION.md`, `CLI-COMPATIBILITY.md`
- Changed files read in full:
  - `server.js` (all 1,738 lines)

## Runtime Validation

### Baseline (before PR checkout)
- `npm install`: success
- `npm test`: **321/321 passed**
- `npm run build`: fails with missing script (`build` not defined in `package.json`)

### PR branch (`fix/rig-list-emoji-parsing`)
- `npm test`: **321/321 passed**
- `npm run build`: same expected missing-script failure

### Targeted behavioral repro (stubbed CLI)
I ran `server.js` with stubbed `gt`/`bd` binaries where:
- `gt rig list --json` fails with `Error: unknown flag: --json`
- `gt rig list` returns `🟢 alpha`

Observed:
- `/api/rigs` => `[ { "name": "alpha" } ]` (correct)
- `/api/setup/status` => `"rigs": []` (incorrect)

This confirms a real functional gap in the PR's fallback logic.

## Findings (ordered by severity)

### 1) High - `/api/setup/status` does not fall back when `--json` command fails

**Location:** `server.js:1084-1099`

The new logic only falls back to text parsing when JSON parsing throws. If `executeGT(['rig', 'list', '--json'])` returns `{ success: false }` (for example, unknown flag), fallback is skipped entirely and `status.rigs` stays empty.

Impact:
- Setup wizard can still show no rigs / "no projects configured" in CLI versions without `--json` support.
- This directly undercuts the stated goal of fixing rig detection robustness.

Suggested fix:
- In `/api/setup/status`, trigger fallback text parsing on either:
  - JSON parse failure **or**
  - `--json` command failure (`!rigResult.success`)

### 2) Medium - Same rig-list format break remains in `/api/bead/:beadId/links`

**Location:** `server.js:707-711`

This endpoint still assumes legacy rig list formatting (`/^  \S/`) and strips with `.trim()`. Emoji-prefixed output (`🟢 rig`) is excluded, resulting in an empty `rigNames` list and degraded PR-link discovery.

Impact:
- Bead link enrichment can silently miss related repos/PRs on newer CLI output.

Suggested fix:
- Reuse `parseRigNames()` here or a shared rig-list parser used by all endpoints.

### 3) Medium - Missing test coverage for the new parsing/fallback behavior

No tests were added for:
- emoji-prefixed text parsing
- `--json` command failure fallback
- `/api/setup/status` rigs population under non-JSON-capable CLI

Impact:
- The regression in Finding #1 passed CI undetected.

Suggested fix:
- Add integration or route-level tests that mock:
  - `rig list --json` failure + text success
  - emoji output in `rig list` text mode

## Security Review

- No command-injection concerns added by this PR.
- Existing command execution still uses `execFile` wrappers (`executeGT`/`executeBD`).
- No secrets, credentials, or unsafe dependency additions observed.

## Dependency Review

- No new dependencies added.

## Performance Review

- Negligible impact.
- One extra CLI call in fallback paths is acceptable and only incurred when JSON parse/command fails.

## Architectural/Code Quality Notes

- Positive: shared `parseRigNames()` helper is cleaner than duplicating regex parsing in multiple endpoints.
- Gap: fallback behavior is inconsistent across endpoints (`/api/rigs` robust, `/api/setup/status` incomplete, `/api/bead/:beadId/links` still legacy).

## Recommendation

Do not merge as-is. Fix Finding #1 at minimum; ideally also address Findings #2 and #3 in the same PR so rig discovery behavior is consistent and test-protected across endpoints.
