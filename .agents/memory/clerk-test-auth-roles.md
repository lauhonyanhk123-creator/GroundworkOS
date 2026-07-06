---
name: Clerk test-auth role limits
description: testClerkAuth-created users can't be given a specific role/publicMetadata, which breaks e2e tests of role-gated routes
---

**Problem**: When using `runTest({ testClerkAuth: true, ... })` with a test plan step like `[Clerk Auth] Sign in as {..., publicMetadata: {role: "admin"}}`, the custom `publicMetadata` is not actually applied. New test users come out with whatever role the app defaults unknown/new users to — because Clerk's self-serve signup flow doesn't accept arbitrary metadata, and the app itself only lets an *existing* admin promote another user's role via a backend endpoint.

**Note (GroundworkOS-specific, as of this change):** the app now defaults roleless users to `"admin"` (not `"foreman"`), so fresh test signups come out as admin. The role-gating limitations below still apply generically — to test a *low*-privilege path in GroundworkOS now, you must explicitly assign a `manager`/`foreman` role rather than relying on the default.

**Why**: Custom `publicMetadata` on a Clerk user can only be set via the Clerk backend/admin API, not through client-side signup. Test-harness programmatic sign-in goes through the same signup surface, so it inherits this limitation. This is a test-infrastructure/app-bootstrap constraint, not a bug in role-gating code — if a fresh test user is redirected away from an admin/manager-only page, that is the role gate working correctly.

**How to apply**: Don't write e2e test plans that assume a freshly-signed-up Clerk test user has an elevated role. Either (a) test the low-privilege path (confirm correct redirect/403, no crash) instead of the elevated one, or (b) if elevated-role coverage is required, seed the role directly via the app's own admin/role-update endpoint (or DB) after the test user is created, using a stable identifier you can look up — not by including metadata in the sign-in step itself.

**Trick for testing catch-all/404 routes under a role-gated layout**: if a low-privilege redirect guard blocks unmatched top-level paths (e.g. GroundworkOS's `ForemanRedirect` sends any path outside an allow-list back home), you can still exercise the real catch-all route without elevating the role — pick a nonexistent path that starts with an *allowed* prefix but has extra segments no real route matches (e.g. `/jobs/deep/nonexistent/subpath` when `/jobs` is allowed but only `/jobs` and `/jobs/:id` are defined routes). It passes the prefix-based allow check yet still falls through to the router's fallback component.
