---
name: GroundworkOS role system
description: How roles work in GroundworkOS — Clerk publicMetadata, hook, nav filtering, route guards
---

Roles are stored in Clerk `user.publicMetadata.role` as one of: `"admin" | "manager" | "foreman"`.

**Default role for users with no explicit `publicMetadata.role`: `"admin"`** (changed from `"foreman"`). Set in BOTH frontend `useRole.ts` and backend `lib/auth.ts` `getUserRole` + `admin.ts` `requireAdmin`/user-list mapping — all four must stay in sync or the UI and API disagree (e.g. UI shows admin screens but `/admin/*` returns 403). An explicitly-set role always takes precedence over the default. **Why:** user wanted every new signup to have full access out of the box (single-company deployment, trusted team). Consequence: the bootstrap "Make me admin" screen and `adminExists()` path are now effectively dead (everyone is admin by default); to create a limited user you must explicitly PATCH their role to manager/foreman.

**Hook**: `artifacts/groundworkos/src/hooks/useRole.ts`
- `useRole()` returns the current user's role (defaults to `"admin"` if unset)
- `isAtLeast(role, min)` checks rank (admin=2, manager=1, foreman=0)
- `ROLE_LABELS` maps to display strings

**Nav filtering**: `DashboardLayout.tsx`
- Each nav item has `minRole: Role`; items filtered by `isAtLeast(role, item.minRole)`
- Foreman sees: Dashboard, Jobs, Schedule only
- Manager sees all except Users
- Admin sees everything including `/settings/users`

**Route guard**: `ForemanRedirect` component in `App.tsx`
- Redirects foremen to `/` if they navigate to a restricted path
- Navigation must happen in a `useEffect` (calling `setLocation` during render throws a React warning), but while `blocked` is true and the effect hasn't fired yet, render a visible placeholder (e.g. "Redirecting…") instead of `null` — returning `null` produces a real bare blank/white page for a frame, which e2e tests (correctly) flag as a bug even though it "self-heals".

**Bootstrap RBAC exception pattern**: routes needed by the very first user before any admin/manager exists (e.g. `PUT /settings/company` for onboarding) must bypass the normal `requireRole()` gate when `!(await adminExists())`, mirroring `POST /admin/bootstrap`. Without this, a fresh deployment's first (default-foreman) user can see the onboarding wizard (GET is open) but silently can't save it (PUT is manager-gated) — a chicken-and-egg lockout.

**Users page**: `/settings/users` (admin only)
- Lists Clerk users via `GET /api/admin/users`
- Role dropdown calls `PATCH /api/admin/users/:id/role`
- Uses `clerkClient` from `@clerk/express`

**Why**: Role system uses Clerk publicMetadata (not a DB table) so roles survive DB resets and are available in JWT claims server-side.
