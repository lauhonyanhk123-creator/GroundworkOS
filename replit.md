# GroundworkOS

A management platform built specifically for the UK groundwork and civil engineering industry. Covers job management, quoting, invoicing, CIS compliance, RAMS/documents, plant tracking, subcontractors, and scheduling — all in one place.

## Run & Operate

- `pnpm --filter @workspace/groundworkos run dev` — run the frontend (port 25421, via workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS v4, Wouter (routing), Radix UI
- API: Express 5 (port 8080, path `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/groundworkos/src/pages/` — all 11 page components (Dashboard, Jobs, Quotes, Invoices, Schedule, Clients, Subcontractors, Documents, Plant, Reports, Settings)
- `artifacts/groundworkos/src/components/` — layout + UI components
- `artifacts/groundworkos/src/data/` — mock data (to be replaced with real API calls in Phase 2)
- `artifacts/api-server/src/routes/` — Express API routes
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle DB schema

## Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 · Foundation | ✅ Complete | App running in Replit, all 11 pages live, industrial UI |
| 2 · Core Data | 🔜 Next | Real DB + API for Jobs, Clients, Quotes, Invoices |
| 3 · UK Compliance | ⬜ Planned | CIS, RAMS, NRSWA, LOLER, CSCS tracking |
| 4 · Finance & Ops | ⬜ Planned | Rate Book, PDF invoices, plant tracker, schedule |
| 5 · Handover Ready | ⬜ Planned | Auth, roles, deployment, client onboarding |

## Product

GroundworkOS is built for UK groundwork contractors. Key industry-specific features:
- **CIS (Construction Industry Scheme)** — subcontractor verification, UTR tracking, monthly HMRC returns
- **RAMS management** — risk assessments with expiry alerts
- **NRSWA** — street works permits and supervisor card tracking
- **LOLER** — thorough examination records for lifting equipment
- **Rate Book** — granular pricing engine (Labour / Material / Plant per unit)
- **Job pipeline** — Enquiry → Quote → Active → Complete

## Architecture decisions

- Frontend-only in Phase 1 (mock data via AppContext reducer + mock.ts)
- Phase 2 will wire the frontend to real Express API routes via React Query hooks
- Contract-first: OpenAPI spec → codegen → typed hooks
- No auth in Phase 1–4; added in Phase 5 only

## User preferences

_Populate as you build._

## Gotchas

- GroundworkOS frontend runs on port 25421 (set by artifact.toml PORT env var)
- API server runs on port 8080 at path `/api`
- Run `pnpm install` from workspace root before starting workflows after dependency changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
