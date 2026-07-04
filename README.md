# GroundworkOS

**The OS for UK groundwork contractors.**

Manage jobs, CIS compliance, quotes, invoices, plant, subcontractors, timesheets and more — built specifically for the way UK groundwork companies operate.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind v4 + wouter |
| Backend | Express v5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Clerk |
| Monorepo | pnpm workspaces |
| Email | Resend |

---

## Features

- **Jobs** — full lifecycle from enquiry to completion, with progress tracking and site details
- **Quotes** — line-item quotes with PDF export and client email sending
- **Invoices** — CIS-aware invoicing with PDF export and accounting sync (Xero, QuickBooks, Sage, FreeAgent)
- **Schedule** — crew and plant scheduling calendar
- **Clients & Subcontractors** — full contact management with CIS verification status
- **Documents** — compliance document tracking with expiry alerts (RAMS, insurance, permits)
- **Plant** — fleet management with MOT, service and LOLER exam tracking
- **Timesheets** — daily time logging per job and worker
- **Purchase Orders** — supplier PO management with PDF export
- **Reports** — revenue overview, job P&L, CIS300 submission export, rate book
- **CIS300 Export** — HMRC-formatted CSV per tax month, ready for submission
- **Audit Trail** — every create/update/delete recorded with full change history
- **Client Portal** — shareable quote approval links for clients
- **Accounting Integrations** — sync contacts, invoices and quotes, and pull payment status, with Xero, QuickBooks Online, Sage Accounting, or FreeAgent (self-service OAuth — the client connects with their own accounting login, no API keys required)
- **CSV Import** — bulk import clients and jobs from spreadsheet
- **Role-based access** — Admin / Manager / Foreman permission levels
- **Onboarding wizard** — guided company setup on first login

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database

### Environment Variables

Create a `.env` file in the project root (or set these as secrets in your host):

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/groundworkos

# Clerk Auth (get from dashboard.clerk.com)
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Email (optional — get from resend.com)
RESEND_API_KEY=re_...

# Xero (optional)
XERO_CLIENT_ID=...
XERO_CLIENT_SECRET=...
XERO_REDIRECT_URI=...

# QuickBooks Online (optional)
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
QUICKBOOKS_REDIRECT_URI=...

# Sage Accounting (optional)
SAGE_CLIENT_ID=...
SAGE_CLIENT_SECRET=...
SAGE_REDIRECT_URI=...

# FreeAgent (optional)
FREEAGENT_CLIENT_ID=...
FREEAGENT_CLIENT_SECRET=...
FREEAGENT_REDIRECT_URI=...
```

Each accounting integration is optional and independent — set only the credentials for the providers this client actually uses. Every provider uses self-service OAuth: the client logs in with their own accounting software account and authorises access, so you never need to obtain or hold their accounting API keys.

### Install & Run

```bash
# Install all dependencies
pnpm install

# Run database migrations
pnpm --filter @workspace/db run migrate

# Start development (all services)
pnpm run dev
```

The frontend runs on port `5173` (or `$PORT` in production), the API server on `3001`.

---

## Project Structure

```
/
├── artifacts/
│   ├── groundworkos/        # React + Vite frontend
│   └── api-server/          # Express API server
├── lib/
│   ├── db/                  # Drizzle schema + migrations
│   ├── api-client-react/    # Typed API client (shared)
│   └── object-storage-web/  # File upload utilities
└── pnpm-workspace.yaml
```

---

## User Roles

Roles are stored in Clerk `publicMetadata.role`. Set via the **Settings → Users** page (admin only) or directly in the Clerk dashboard.

| Role | Access |
|---|---|
| `admin` | Full access including Users, Audit Log, Deploy Guide |
| `manager` | All operational features: jobs, quotes, invoices, reports, settings |
| `foreman` | Dashboard, jobs, schedule, timesheets |

**First-time setup:** Set your own account to `admin` via the Clerk dashboard before logging in.

---

## First Login Checklist

1. Sign up via the app — you'll be assigned `foreman` role by default
2. Go to [dashboard.clerk.com](https://dashboard.clerk.com) → Users → your account → Public metadata → set `{ "role": "admin" }`
3. Refresh the app — full sidebar now visible
4. Go to **Settings** and complete your company details (name, address, VAT number, bank details)
5. Invite any additional users and set their roles from **Settings → Users**
6. (Optional) Connect an accounting provider from **Settings → [Provider] Integration** (Xero, QuickBooks, Sage, or FreeAgent)
7. (Optional) Add `RESEND_API_KEY` secret to enable email sending for quotes and invoices

---

## Deployment

See the **Deploy Guide** page in the app (`/deploy`, admin only) for a full step-by-step guide covering:

- Oracle Cloud ARM A1 server setup
- PostgreSQL configuration
- Nginx reverse proxy + Let's Encrypt SSL
- PM2 process management
- Environment variable setup
- Zero-downtime redeployment script

---

## CIS Compliance

GroundworkOS is built around UK Construction Industry Scheme requirements:

- Subcontractor CIS status tracking (Gross / Net / Unmatched / Unverified)
- Automatic CIS deduction calculation on invoices
- Monthly CIS300 return export (HMRC-formatted CSV)
- Expiry tracking for CSCS cards, NRSWA certifications, public liability insurance

---

## License

Private — not open source. All rights reserved.
