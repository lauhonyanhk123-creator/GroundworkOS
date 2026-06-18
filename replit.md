# GroundworkOS

A dark-themed CRM built for the UK construction groundwork industry. Manages jobs, quotes, invoices, clients, subcontractors, plant, compliance documents, scheduling, and CIS returns.

## Run & Operate

- `pnpm --filter @workspace/groundworkos run dev` — run the GroundworkOS web app (port 25421)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, wouter (routing), Tailwind CSS v4
- Fonts: Barlow Condensed (headings), Barlow (body), DM Mono (data/labels) — loaded from Google Fonts
- All data: local mock (`artifacts/groundworkos/src/data/mock.ts`) — no backend, no database

## Where things live

```
artifacts/groundworkos/
  src/
    App.tsx                        — router (wouter), all routes
    index.css                      — dark industrial theme, CSS vars, hazard stripes
    types.ts                       — all TypeScript types
    data/mock.ts                   — all mock data (clients, jobs, quotes, invoices, etc.)
    lib/utils.ts                   — cn(), formatCurrency(), formatDate(), daysUntil()
    components/
      layout/DashboardLayout.tsx   — sidebar nav + header shell
      ui/
        Badge.tsx                  — status badges (job/invoice/CIS/plant statuses)
        Panel.tsx                  — card container with optional title + actions
        StatCard.tsx               — KPI stat card with progress bar + hazard stripe
        Btn.tsx                    — button (primary/ghost/danger/outline variants)
        Skeleton.tsx               — loading skeleton
    pages/
      DashboardPage.tsx            — KPIs, active jobs, weekly schedule, alerts
      JobsPage.tsx                 — job list with status tabs, type filter, NRSWA badge
      QuotesPage.tsx               — quote list with line item breakdown
      InvoicesPage.tsx             — invoice list with aged debtor view
      SchedulePage.tsx             — 7-day week view with colour-coded entries
      ClientsPage.tsx              — client cards with job/value totals
      SubcontractorsPage.tsx       — CIS status, UTR, NRSWA card, compliance expiry
      DocumentsPage.tsx            — RAMS, insurance, certs, permits, expiry tracking
      PlantPage.tsx                — fleet status, LOLER exam dates, daily rates
      ReportsPage.tsx              — revenue chart, pipeline, aged debtors, CIS returns, Rate Book
      SettingsPage.tsx             — company, CIS, NRSWA, notification settings
```

## Architecture decisions

- **No backend / no database** — all data lives in `src/data/mock.ts`. The app is a fully self-contained React+Vite SPA. No API calls, no auth.
- **Wouter over React Router** — lighter weight; already in the workspace catalog.
- **Inline styles alongside Tailwind** — CSS variables are set in `index.css` and used with `style={}` props for the palette colours, since Tailwind v4 `@theme inline` doesn't always tree-shake well with dynamic values.
- **No Supabase / no MCP servers** — the `.migration-backup/` directory contains a prior Next.js+Supabase version; the Replit build is intentionally a standalone mock-data app per the project brief.
- **UK-specific domain built in** — CIS (Construction Industry Scheme) deduction tracking, NRSWA street works permits, RAMS documents, LOLER plant exam dates, CHAS/Constructionline certifications.

## Product

GroundworkOS covers the full operational cycle of a UK groundwork contractor:

- **Jobs** — track drainage, foundations, excavation, kerbing, sewers, reinstatement, piling, utilities from enquiry through to completion with NRSWA permit numbers
- **Quotes & Invoices** — line item quotes with VAT, invoice tracking, overdue alerts, CIS deduction fields
- **Subcontractors** — CIS gross/net/unverified status, UTR numbers, NRSWA card tracking, public liability + CSCS expiry warnings
- **Documents** — RAMS, insurance certificates, Constructionline/CHAS certs, permits — with expiry dashboard
- **Plant** — fleet status (on-site / available / workshop / hired-in), LOLER thorough exam dates, daily rates
- **Schedule** — weekly grid with crew count, plant assigned, job reference per entry
- **Reports** — 6-month revenue chart, pipeline funnel, aged debtors table, CIS monthly return tables, Rate Book (labour/material/plant breakdown per trade)

## User preferences

- Dark industrial design: background `#0c0c0c`, accent `#FFD600` (safety yellow), hazard stripe patterns
- Fonts: Barlow Condensed for headings/values, DM Mono for data labels — never Inter or system fonts
- All currency in £ GBP, dates DD MMM YYYY (British English)
- Keep mock data — no real database connection needed for this project

## Gotchas

- The `.migration-backup/` directory is a prior Next.js/Supabase version of GroundworkOS — do not use it as a reference for the current Vite app
- Google Fonts are loaded via `@import` in `index.css` — previews require internet access
- `BASE_URL` is injected by Vite from `artifact.toml`; wouter's `<Router base={...}>` strips it so all `href` values in nav are plain paths like `/jobs`
