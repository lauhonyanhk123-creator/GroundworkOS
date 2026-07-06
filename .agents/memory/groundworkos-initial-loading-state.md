---
name: GroundworkOS initial loading state
description: How the app avoids a flash-of-empty-state on cold load, and where the gate lives
---

**Decision**: `DataLoader` (which fetches all app data via react-query hooks and dispatches `INIT_*` actions into `AppContext`) does not gate rendering by default — pages read from reducer state that starts as empty arrays, so on a slow network a page could briefly render "No jobs found" / "No active jobs" etc. before real data arrives. `AppState.isLoading` (default `true`) is combined from the `isLoading` flags of the primary list queries (clients/jobs/quotes/invoices) and flipped to `false` via a `SET_LOADED` action once all have resolved. `DashboardLayout` reads `state.isLoading` and renders a branded spinner in place of `children` in `<main>` until then.

**Why**: Without this gate, every list page needs its own loading check, which is easy to forget on new pages and was inconsistent across the app (only 3 of ~15 pages had ad-hoc "Loading…" text). A single gate at the layout level guarantees no page can show a false empty state on first load, with one branded loading treatment reused everywhere.

**How to apply**: If a new top-level dataset is added to `DataLoader` that a page depends on for its initial render, add its `isLoading` flag to the `SET_LOADED` effect's condition (or accept that page may briefly show empty state if it's not one of the "core" datasets the gate already covers).
