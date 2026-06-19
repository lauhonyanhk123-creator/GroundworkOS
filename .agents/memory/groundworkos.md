---
name: GroundworkOS project conventions
description: Key decisions and gotchas for the GroundworkOS construction CRM project
---

# GroundworkOS Project Conventions

## What it is
UK construction groundwork industry CRM. React+Vite SPA at `artifacts/groundworkos/`. Mock data only (no Supabase, no backend calls). User plans to self-host with Nginx.

## Mock data dates
All dates in `src/data/mock.ts` must stay in the 2025-2026 range. The app uses `new Date()` for:
- Revenue chart (last 6 months window) — paid_at dates must be within 6 months of today
- "N days late" calculation on invoices — due dates from 2024 show as 600+ days late which looks broken
- Document expiry alerts — expiry dates must be 1-18 months in the future for realistic alerts

**Why:** Client review showed all these break badly when dates fall >1 year in the past.

## Schedule `getDate()` fix
Use explicit date-only construction, never `toISOString()` with time component, for schedule entries. Use fixed hour strings:
```typescript
const futureDate = (offsetDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};
// Then: start_datetime: `${futureDate(1)}T07:00:00`
```
**Why:** `toISOString()` returns UTC time; appending `:00` to the truncated result creates timezone-shifted times that display as "01:48" in the browser instead of "07:00".

## Architecture
- Global state: `src/store/AppContext.tsx` (React Context + useReducer, seeded from mock.ts)
- All pages use `useApp()` hook — no direct mock imports except `RATE_BOOK` (read-only reference data)
- Modal/form components: `src/components/ui/Modal.tsx` (Field, Input, Select, Textarea helpers)
- Global search: `src/components/ui/GlobalSearch.tsx` — searches jobs/invoices/quotes/clients/subcons via ⌘K
- Types: `PlantStatus = 'available'|'on_site'|'maintenance'|'hired_in'|'disposed'` (not 'decommissioned')
- Plant interface has NO `created_at` field
- CISStatus = `'gross'|'net'|'unmatched'|'unverified'`

## Planned next steps (as of client review)
1. ✅ Wire up all buttons/forms
2. ✅ Client reviews and signs off on the flow
3. Real backend (Express API server at `artifacts/api-server/` + Replit PostgreSQL)
4. Auth
5. PDF generation for invoices/quotes
6. Deploy (Nginx on user's own server — static dist/ build)
