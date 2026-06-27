---
name: GroundworkOS role system
description: How roles work in GroundworkOS — Clerk publicMetadata, hook, nav filtering, route guards
---

Roles are stored in Clerk `user.publicMetadata.role` as one of: `"admin" | "manager" | "foreman"`.

**Hook**: `artifacts/groundworkos/src/hooks/useRole.ts`
- `useRole()` returns the current user's role (defaults to `"foreman"` if unset)
- `isAtLeast(role, min)` checks rank (admin=2, manager=1, foreman=0)
- `ROLE_LABELS` maps to display strings

**Nav filtering**: `DashboardLayout.tsx`
- Each nav item has `minRole: Role`; items filtered by `isAtLeast(role, item.minRole)`
- Foreman sees: Dashboard, Jobs, Schedule only
- Manager sees all except Users
- Admin sees everything including `/settings/users`

**Route guard**: `ForemanRedirect` component in `App.tsx`
- Redirects foremen to `/` if they navigate to a restricted path

**Users page**: `/settings/users` (admin only)
- Lists Clerk users via `GET /api/admin/users`
- Role dropdown calls `PATCH /api/admin/users/:id/role`
- Uses `clerkClient` from `@clerk/express`

**Why**: Role system uses Clerk publicMetadata (not a DB table) so roles survive DB resets and are available in JWT claims server-side.
