# Product

## Register

product

## Users

Developers and operators running Gas Town, a multi-agent orchestration system for
Claude Code. They sit in front of this GUI as a mission-control surface: watching
fleets of agents (mayor, deacon, witnesses, refineries, polecats) work across
repositories ("rigs"), tracking work items ("beads"), convoys, mail, and PRs in
near real time. The context is focused and operational, often a second monitor
left open while real work happens elsewhere. The job to be done: understand system
state at a glance and intervene (start/stop services, sling work, send mail/nudges)
without ceremony.

## Product Purpose

Gas Town GUI is a standalone web dashboard for observing and steering a Gas Town
deployment. It exists so an operator does not have to read CLI output to know what
the swarm is doing. Success is when a user opens the dashboard and within seconds
knows: is the system healthy, who is working, what is stuck, and what needs me.

## Brand Personality

Industrial, instrument-panel, legible. Three words: mechanical, calm, dense. It
should feel like a well-built ops console (a control room readout), not a
consumer SaaS landing page. Confidence through clarity, not decoration. The
existing dark, GitHub-derived palette with industrial status colors (running
green, working amber, stuck red, done purple) is the established identity and is
preserved.

## Anti-references

- Rainbow/Tailwind candy palettes layered on top of the established token system.
- Marketing-dashboard tropes: hero metric templates, gradient text, glassmorphism,
  oversized friendly illustrations.
- Anything that reads as a generic admin-template starter. This is a purpose-built
  instrument, not a Bootstrap clone.

## Design Principles

1. **Glanceable first.** State must read in under a second. Color and position
   carry meaning before text does.
2. **One palette, one identity.** Reuse the established tokens (variables.css);
   never introduce a parallel color system. Status color is information, not decor.
3. **Density without noise.** Show a lot, but with rhythm and hierarchy so it never
   feels cramped.
4. **The tool disappears.** Familiar, standard affordances. No invented controls
   for standard tasks. Motion conveys state, never performs.
5. **Honest empty/error states.** When there is nothing, teach the next action;
   when something breaks, say what and offer a retry.

## Accessibility & Inclusion

- Target WCAG AA: body text >= 4.5:1, large/UI text >= 3:1 against its surface.
- Respect `prefers-reduced-motion` (handled globally in animations.css).
- Keyboard-operable controls with visible focus; semantic roles on interactive
  elements.
- Status is never encoded by color alone; pair with icon, label, or shape.
