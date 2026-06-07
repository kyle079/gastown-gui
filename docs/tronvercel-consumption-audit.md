# Tronvercel Consumption Audit

Date: 2026-06-07
Issue: `gg-1kx`

## Objective

Evaluate Gas Town GUI's reusable UI boundary against Tronvercel and identify which
surfaces can consume shared design-system primitives without creating more local
one-off UI components.

Criteria used for the audit:

- reusable design-system consumption
- visual hierarchy
- interaction clarity
- accessibility
- responsive behavior
- no new one-off local primitives

## Safe Primitive Boundary

The following local primitives are already effectively aligned with Tronvercel's
documented API and visual system:

- `Button`
- `Input`
- `Badge`
- `StatusDot`
- `StatusPill`
- `Panel`
- `PanelHeader`
- `PanelBody`
- `Kbd`
- `Spinner`

These should be the first swap candidates once the upstream package is consumable
in this repo.

## Intentional Local Adapters

The following primitives should remain local until their contracts are aligned with
Tronvercel, because they encode app-specific behavior rather than generic styling:

- `Dialog`
  Keeps Gas Town's simplified `open/onClose/title/description/footer` API and its
  mobile-sheet behavior.
- `Select`
  Uses native `<select>` semantics that current operator flows depend on.
- `Table`
  Owns the app's mobile card + desktop table dual rendering from one schema.
- `ToastProvider`
  Exposes a local `notify()` hook rather than Radix toast primitives.

## Packaging Blocker

Direct installation of `@tronvercel/ui` from the currently available GitHub source
is not viable for this repo today. The package metadata exports `./dist/*`, but the
installed artifact does not include `dist/`, which causes TypeScript and build-time
resolution failures in consumers.

This is an upstream packaging/distribution issue, not a Gas Town theme mismatch.

## UI Surface Guidance

When migrating operator-facing surfaces:

- keep app-specific workflow composition in Gas Town
- pull shared controls and visual primitives from Tronvercel
- preserve strong hierarchy: panel header, primary action, dense supporting metadata
- preserve keyboard-first interaction and visible focus treatment
- preserve responsive rules already documented in `DESIGN.md`

## Next Step

Fix upstream Tronvercel packaging so consumers can install a built artifact, then
swap the safe primitive subset first before attempting contract-changing adapters.
