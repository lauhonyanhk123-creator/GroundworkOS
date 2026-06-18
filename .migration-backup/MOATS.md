# GroundworkOS — Competitive Moats

A moat is what makes a customer stay even when a cheaper or shinier
alternative shows up. For a CRM sold to UK groundwork companies, the moat is
never the UI — it is the accumulated data, the automated drudgery, and the
UK-specific workflows a generic CRM (or a spreadsheet) cannot replicate
without months of re-entry and reconfiguration.

This document inventories the moats GroundworkOS already has, describes the
one built in this pass (the Rate Book), and sets out a prioritised roadmap
for deepening them.

---

## 1. Moats already in the product

| Moat | What it is | Where it lives |
|------|-----------|----------------|
| AI workflow moat | Mistral orchestrates 47 MCP tools covering the whole business — staff ask in plain English instead of learning menus | `groundworkos/src/lib/mistral-tools.ts`, `groundworkos-mcp/servers/*` |
| UK regulatory moat | CIS monthly returns, 20% deductions, UK tax-year payment schedules, VAT, aged debtors | `reporting-mcp`, `/reports/cis` |
| Integration moat | Xero OAuth connection and invoice sync — accounting data flows without re-keying | `groundworkos/src/lib/xero.ts`, `/api/xero/*` |
| Compliance data moat | Insurance/RAMS/CSCS documents with automatic expiry status and AI-queryable health checks | `compliance-mcp`, `documents` table triggers |
| Audit/history moat | Every status change on jobs, quotes and invoices is logged automatically | `status_history` table + triggers |
| Multi-tenant foundation | RLS-enforced tenancy means the product can be sold to many firms without a rebuild | `database/schema.sql`, `user_companies` |

Each of these gets stronger with use: more documents tracked, more history
logged, more invoices synced — and all of it is lost if the customer leaves.

---

## 2. New in this pass: the Rate Book (data moat)

**The idea.** Every quote a groundwork company prices already contains its
hardest-won knowledge: what to charge for a metre of kerbing, a drainage
run, a day of excavation. That knowledge was sitting unused in the
`quotes.line_items` JSONB column. The Rate Book turns it into a compounding
asset: every priced line item — and every win or loss — makes the next
quote smarter. After a year of use, leaving GroundworkOS means abandoning
the company's own pricing intelligence.

**How it works.** A pure aggregation engine groups historical line items by
normalised description and computes, per work item:

- suggested rate (median of *accepted* quotes, falling back to all quotes)
- min / max / last-used rate
- win rate from decided outcomes (accepted vs rejected)
- usage counts and last-used date

**Where it surfaces (three places):**

1. **Quote form** — typing a line-item description on `/quotes/new` shows
   matching rate-book entries with suggested rate and win rate; one click
   fills the description and price. Focusing an empty row shows the three
   most-quoted items.
2. **Rate Book report** — `/reports/rate-book` shows the full searchable
   rate book with win rates and price ranges, making the accumulated asset
   visible to the customer.
3. **AI assistant** — a new `get_rate_book` MCP tool lets staff ask
   "what do we usually charge for trench excavation?" and get an answer
   grounded in their own history.

**Files:**

- `groundworkos-mcp/servers/quotes-mcp/rate-book.ts` — pure engine (shared
  by server and browser)
- `groundworkos-mcp/servers/quotes-mcp/tools.ts` — `getRateBook` handler
- `groundworkos-mcp/servers/quotes-mcp/index.ts` — stdio tool registration
- `groundworkos/src/lib/mistral-tools.ts` + `src/app/api/ai/route.ts` — AI wiring
- `groundworkos/src/app/(dashboard)/quotes/new/page.tsx` — inline suggestions
- `groundworkos/src/app/(dashboard)/reports/rate-book/` — report page
- `groundworkos-mcp/src/test/rate-book.test.ts` — engine unit tests

---

## 3. Roadmap to deepen the moats (prioritised)

1. **Compliance auto-chasing.** Email subcontractors automatically when
   insurance/CSCS documents near expiry (SendGrid is already integrated for
   sending). Needs a scheduling decision on the Oracle host — a cron job
   hitting a secured API route is the simplest fit. High lock-in: the
   product becomes the thing that keeps the firm compliant.
2. **Rate Book everywhere quoting happens.** Add the same suggestions to
   quote editing (`/quotes/[id]`), and let the AI draft a full quote from
   the rate book ("quote 40m of drainage and reinstatement for Smith Ltd").
3. **Win/loss intelligence.** Per-client and per-job-type win rates and
   pricing sensitivity ("you win 80% of drainage work but only 30% of
   kerbing — your kerbing rate is 15% above your winning median").
   The data is already captured; this is reporting on top of it.
4. **Weather-aware scheduling.** `get_weather_risk` exists; correlate
   weather with schedule slippage so the system warns "jobs like this slip
   2 days in wet Octobers". Unique to groundworks, hard to copy.
5. **Client-facing quote acceptance.** A public accept/reject link on sent
   quotes. Speeds the customer's sales cycle and feeds cleaner win/loss
   data back into the Rate Book (moat 2 and 3 compound).
6. **Deeper Xero reconciliation.** Two-way payment status sync so invoice
   states are always truthful — raises switching cost on the accounting
   side.

The common thread: every roadmap item either accumulates data a competitor
cannot import, or automates a duty (compliance, CIS, chasing) the customer
will not risk moving away from.
