---
name: GroundworkOS self-host (Oracle/S3 + standalone Clerk)
description: How GroundworkOS runs off Replit — env-switched storage backend and detached Clerk — and the non-obvious constraints behind each.
---

# Self-hosting GroundworkOS (off Replit)

The app supports two deployment targets from one codebase: Replit (default) and a
generic self-hosted Linux VM (Oracle Cloud Always-Free is the documented target).
Selection is entirely via env vars — no code branches to toggle by hand.

## Storage: env-switched backend

`STORAGE_DRIVER` picks the object-storage backend (facade in `lib/objectStorage.ts`):
- unset / `replit` → GCS via the Replit sidecar (original behavior, unchanged).
- `s3` → any S3-compatible store (Oracle Object Storage, AWS S3, MinIO).

**Why the S3 path uses a same-origin upload RELAY, not browser presigned PUT:**
Oracle Cloud Object Storage has **no CORS support**, so a browser PUT to a
presigned URL fails the preflight. So `getUploadURL()` returns a relay URL on our
own API (`PUT /api/storage/uploads/direct/:id`, manager-gated, UUID-validated)
and the server streams the request body into S3 via `@aws-sdk/lib-storage`
`Upload`. Downloads are streamed back through the API too (`GetObject` →
`Readable.toWeb`), so the bucket stays private. This means the browser only ever
talks same-origin — works for any S3 provider regardless of CORS.

**How to apply:** the relay's raw body must NOT be consumed by body parsers —
`app.ts` wraps json/urlencoded in `skipUploadRelay()` which bypasses any PUT path
containing `/storage/uploads/direct/`. If you add global middleware that reads the
body, exclude that path too or uploads will hang/corrupt.

Private S3 reads are confined to the `uploads/` key prefix and reject `..`
segments (parity with the Replit backend's PRIVATE_OBJECT_DIR confinement).

## Auth: detaching from the Replit Clerk proxy

Two flags on **different tiers** must agree, or login breaks:
- Backend: `CLERK_STANDALONE=true` → `app.ts` skips `clerkProxyMiddleware` and
  passes `CLERK_PUBLISHABLE_KEY` directly to `clerkMiddleware` with
  `authorizedParties:[APP_URL]`.
- Frontend (build-time): leave `VITE_CLERK_PROXY_URL` **unset** → `App.tsx` gives
  `ClerkProvider` the raw `VITE_CLERK_PUBLISHABLE_KEY` and no `proxyUrl`.

**Why:** `publishableKeyFromHost` derives `clerk.<host>` for `pk_live` keys, which
is wrong for a standalone deploy — bypassing it is mandatory when not proxying.
Dev keys (`pk_test`) work standalone with zero DNS; `pk_live` needs the user's own
Clerk DNS CNAMEs verified in their Clerk dashboard.

## Build-time vs runtime gotchas
- `vite.config.ts` hard-requires `PORT` **and** `BASE_PATH` from the shell env
  even for `vite build` (read at config load). Self-host build uses `BASE_PATH=/`.
- `VITE_*` values are baked in at build time, not read at runtime; rebuild the
  frontend to change Clerk keys.
- Nginx: `client_max_body_size` must be raised (uploads) and
  `proxy_request_buffering off` lets the relay stream; `proxy_pass` WITHOUT a
  trailing slash preserves the `/api` prefix.
- DB is portable (plain `pg`); apply schema with `pnpm --filter @workspace/db run
  push` (interactive; `push-force` for a fresh DB).

Reference files: root `.env.example` (all vars, tagged by tier) and
`DEPLOYMENT-ORACLE.md` (full non-technical walkthrough).
