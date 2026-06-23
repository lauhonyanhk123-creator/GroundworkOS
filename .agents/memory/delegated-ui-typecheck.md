---
name: Delegated UI work needs a typecheck gate
description: Why to run tsc after design-subagent UI passes on GroundworkOS, and the pre-existing casing-dup trap
---

# Always run typecheck after delegated UI work

Vite's dev server transpiles without type-checking, so app-preview screenshots can look
perfect while `tsc` is red. After any design-subagent UI pass, run
`pnpm --filter @workspace/groundworkos run typecheck` before declaring done.

**Why:** A multi-page redesign rollout looked flawless in screenshots but had several
compile errors — subagents drifted from domain types (e.g. inventing a `PlantStatus`
value, passing an unsupported `className` to a modal `Field`). These never surface in the
preview.

**How to apply:** Treat typecheck as the real acceptance gate for delegated UI edits, not
the screenshot. Re-verify delegated changes stayed presentation-only.

# Pre-existing casing-collision dead files

`src/components/ui/` carried lowercase shadcn leftovers (`badge.tsx`, `skeleton.tsx`,
`sidebar.tsx`) duplicating the real `Badge.tsx`/`Skeleton.tsx`. Two files differing only
in case both match the `src/**/*` glob and make tsc fail with TS1149/TS1261. The lowercase
trio was dead (sidebar unused; lowercase badge/skeleton only referenced by sidebar) and was
removed. If casing errors reappear, look for case-duplicate component files, not your edits.
