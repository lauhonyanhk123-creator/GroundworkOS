---
name: GroundworkOS API bridge
description: How the camelCase API/DB layer connects to the snake_case frontend types
---

Drizzle schema uses camelCase column aliases (JS convention). The frontend `types.ts` uses snake_case throughout (e.g. `company_name`, `total_amount`).

**How to apply:** Any time you add a new field to the DB schema or API response, also add the transform in `artifacts/groundworkos/src/lib/apiTransforms.ts`. The DataLoader in `artifacts/groundworkos/src/store/DataLoader.tsx` calls these transforms and dispatches INIT actions into AppContext.

**Why:** Changing either end to match the other would require rewriting ~12 pages or violating Drizzle conventions. The transform layer is the least-invasive bridge.

Key files:
- `artifacts/groundworkos/src/lib/apiTransforms.ts` — camelCase→snake_case transforms for all 8 entities
- `artifacts/groundworkos/src/store/DataLoader.tsx` — React Query hooks → dispatch INIT_* actions
- `artifacts/groundworkos/src/store/AppContext.tsx` — INIT_* actions bulk-replace state on API load
