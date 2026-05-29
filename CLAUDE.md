# GroundworkOS CRM — Claude Code Instructions

## WHO YOU ARE
You are the lead developer for GroundworkOS, a world-class
MCP-powered CRM for a UK groundwork company. You write
production-grade code that is clean, consistent, and
complete every single time.

---

## THE GOLDEN RULE
Never show me broken, incomplete, or untested code.
Before showing any output, you must complete the full
self-review loop below without exception.

---

## THE LOOP — Run This After EVERY Code Change

### STEP 1 — WRITE
Write the code to complete the task as instructed.
Follow the tech stack and standards below exactly.

### STEP 2 — SELF REVIEW
After writing, stop and review your own output:

CHECK TYPESCRIPT
- Are all types correct and explicit?
- Are there any 'any' types that should be typed properly?
- Are all interfaces and types imported correctly?
- Will this pass TypeScript strict mode?

CHECK IMPORTS
- Does every import actually exist in the project?
- Are all packages in package.json before importing?
- Are all file paths correct relative to the file location?
- Are there circular imports?

CHECK LOGIC
- Does the logic actually do what the prompt asked?
- Are there any obvious bugs or edge cases missed?
- Will this break if the database returns null or empty?
- Will this break if an API call fails?

CHECK ERROR HANDLING
- Is every database call wrapped in try/catch?
- Is every API call wrapped in try/catch?
- Are error messages user-friendly (not raw errors)?
- Does the UI show something useful when data fails to load?

CHECK CONSISTENCY
- Does this match the style of other files in the project?
- Are variable and function names consistent with existing code?
- Is the component structure consistent with other components?

### STEP 3 — FIX
Fix every single issue found in Step 2.
Do not show me the code until all issues are resolved.
If you are unsure how to fix something, say so explicitly
before showing any code.

### STEP 4 — FINAL CHECK
Before showing output, ask yourself:
- Would I be comfortable shipping this to a real client?
- Is anything missing from what was asked?
- Have I changed anything that wasn't asked to be changed?

If the answer to the last question is yes, revert those
unasked changes. Only change what was requested.

### STEP 5 — SHOW OUTPUT
Now show me the final code.
Start with a one-line summary of what was built.
Then show the complete file(s).
End with a one-line confirmation of what to test.

---

## PROJECT OVERVIEW

Name: GroundworkOS
Type: Web CRM application
Client: UK groundwork construction company
Delivery: One-off handoff product

The system is MCP-powered — business logic lives in
MCP servers that Mistral AI orchestrates. The frontend
calls Mistral, which calls MCP tools, which query Supabase.

---

## TECH STACK — Never Deviate From This

Frontend:     Next.js 16 with App Router
Language:     TypeScript (strict mode)
Styling:      Tailwind CSS only (no inline styles, no CSS modules)
Database:     Supabase (PostgreSQL)
Auth:         Supabase Auth with SSR
AI:           Mistral Small 3.1 (model: mistral-small-latest)
MCP:          @modelcontextprotocol/sdk
PDF:          Puppeteer
Email:        SendGrid
Storage:      Supabase Storage
Hosting:      Oracle Free Tier (MCP servers) + Vercel (frontend)

---

## FOLDER STRUCTURE — Always Follow This

```
groundworkos-workspace/              <- Monorepo root
  package.json                       <- Workspace config
  groundworkos/                      <- Next.js project
    proxy.ts                         <- Next.js 16 proxy (replaces middleware.ts)
    src/
      app/
        (auth)/                      <- Unauthenticated pages
          login/
        (dashboard)/                 <- All authenticated pages
          dashboard/
          jobs/
          clients/
          quotes/
          invoices/
          subcontractors/
          schedule/
          documents/
          reports/
          settings/
        auth/
          callback/                  <- Supabase auth callback
        api/
          ai/                        <- Mistral API route
          pdf/                       <- PDF generation routes
          xero/                      <- Xero OAuth routes
      components/
        ui/                          <- Reusable UI components
        ai/                          <- AI chat components
        empty-states/                <- Empty state components
        forms/                       <- Form components
      hooks/                         <- Custom React hooks
      lib/
        supabase/                    <- Supabase clients
          client.ts
          server.ts
          proxy.ts                   <- Session refresh for proxy layer
        mistral.ts                   <- Mistral client
        mistral-tools.ts             <- All MCP tool definitions
      types/                         <- TypeScript types
    database/
      schema.sql
      seed.ts

  groundworkos-mcp/                  <- MCP servers
    servers/
      clients-mcp/
      jobs-mcp/
      quotes-mcp/
      invoices-mcp/
      subcon-mcp/
      schedule-mcp/
      compliance-mcp/
      reporting-mcp/
    shared/
      db.ts
      types.ts
      utils.ts
```

---

## DESIGN SYSTEM — Always Follow This

### Colours (use Tailwind custom classes)
- Background:       bg-black (#0c0c0c)
- Surface:          bg-surface (#141414)
- Surface hover:    bg-surface2 (#1c1c1c)
- Border:           border-border (#2a2a2a)
- Primary accent:   text-yellow / bg-yellow (#FFD600)
- Body text:        text-text (#e8e8e8)
- Muted text:       text-muted (#666666)
- Success:          #4ade80
- Warning:          #fb923c
- Danger:           #ff4444
- Info:             #60a5fa

### Typography
- Headlines/values: font-family Barlow Condensed, font-weight 700-800
- Body text:        font-family Barlow, font-weight 400
- Data/labels/code: font-family DM Mono, font-weight 400-500

### Component Rules
- Border radius:    rounded (4px) on cards, none on buttons
- Spacing grid:     Always multiples of 8px (p-2, p-4, p-6, p-8)
- Active state:     Yellow left border (border-l-2 border-yellow)
- Hover state:      border-yellow on cards, bg-surface2 on nav items
- Status dots:      Animated (animate-pulse) when critical/overdue
- Hazard stripes:   CSS diagonal pattern on accents (repeating-linear-gradient)

### Never Use
- Rounded-full on buttons
- Purple or gradient backgrounds
- Inter, Roboto, or system fonts
- Inline styles
- Random spacing not on the 8px grid

---

## CODING STANDARDS

### TypeScript
- Always type function parameters and return values explicitly
- Never use 'any' — use 'unknown' and type guard if needed
- Always use interfaces for object shapes, not type aliases for objects
- Export types from src/types/index.ts

### React / Next.js
- Use Server Components by default
- Only add 'use client' when using hooks or browser APIs
- Use Next.js Image component for all images
- Use Next.js Link for all internal navigation
- Always add loading.tsx for every page
- Always add error.tsx for every page
- This is Next.js 16 — use proxy.ts not middleware.ts
- The exported function in proxy.ts must be named 'proxy' not 'middleware'
- cookies() from next/headers is async — always await it:
  const cookieStore = await cookies()
- When writing proxy.ts always return the same mutable response
  object that cookies were applied to — never create a new
  NextResponse after setting cookies or sessions will not persist

### Database (Supabase)
- Always use try/catch around every Supabase query
- Always check for error in the response: const { data, error } = await...
- Never expose SUPABASE_SECRET_KEY to the client side
- Use server-side Supabase client for all sensitive operations
- Always return typed data, never return raw Supabase response

### MCP Servers
- MCP server tool functions are TypeScript modules imported
  directly into the Next.js API route — they are NOT separate
  running processes in this architecture
- Both groundworkos/ and groundworkos-mcp/ live in the same
  monorepo workspace so imports work across both packages
- Each server file exports its tool handler functions
- Each tool must have a clear description (Mistral uses this to decide when to call it)
- Always validate required parameters before querying DB
- Always return consistent object shapes from tools
- Wrap all DB operations in try/catch
- Return error objects, never throw in tools

### API Routes
- Always validate request body before processing
- Always return consistent { data, error } shape
- Use NextResponse.json() for all responses
- Set appropriate HTTP status codes

### Forms
- Always validate required fields client-side before submit
- Show inline errors below each invalid field
- Show loading state on submit button while processing
- Show success feedback after completion
- Never submit a form twice (disable button after first submit)

---

## ERROR HANDLING RULES

Every function that can fail must follow this pattern:

```typescript
try {
  const { data, error } = await supabase.from('table').select()
  if (error) throw error
  return { data, error: null }
} catch (error) {
  console.error('[context] Error description:', error)
  return { data: null, error: 'User-friendly message here' }
}
```

User-facing error messages must be:
- Plain English
- Not expose technical details
- Suggest an action ("Please try again" or "Contact support")

---

## WHAT TO NEVER DO

- Never delete or modify files from a previous phase unless
  the current prompt specifically asks for it
- Never install packages not in the tech stack without asking
- Never use localStorage or sessionStorage
- Never hardcode API keys or secrets
- Never use console.log in production code
  (use console.error for errors only)
- Never create files outside the defined folder structure
- Never use CSS that conflicts with Tailwind
- Never skip error handling to save time
- Never show loading states that block the entire page
  (use skeleton loaders instead)
- Never make the user wait for AI responses
  (always stream them)
- Never create middleware.ts — this is Next.js 16, use proxy.ts
- Never return a new NextResponse after setting cookies in proxy.ts
  (always return the original mutable response object)

---

## MCP SERVER RULES

When building MCP servers:

1. Every tool needs these three things:
   - Clear name (snake_case)
   - Detailed description (1-2 sentences explaining exactly
     when Mistral should call this tool)
   - Typed parameters with descriptions

2. Tool descriptions must be specific enough that Mistral
   calls the RIGHT tool. Bad: "Gets jobs". 
   Good: "Retrieves a list of jobs with optional filtering
   by status or client. Use when the user asks to see,
   list, or find jobs."

3. Always validate that required parameters exist before
   querying the database

4. Return shapes must be consistent. If a tool can return
   null, always return null not undefined

---

## MISTRAL AI RULES

When working with the Mistral API:

- Always use model: 'mistral-small-latest'
- Always stream responses (never wait for full response)
- System prompt must always include current date and
  business context
- Tool results must be passed back correctly in message history
- If a tool call fails, tell the user gracefully
- Never send personal data in the system prompt

The system prompt for all AI calls:
```
You are the AI assistant for GroundworkOS, a CRM system for 
a UK groundwork company. Today is {date}. You help office 
staff and site managers with jobs, clients, quotes, invoices,
subcontractors, scheduling, and compliance. Be concise,
professional, and practical. Always use £ for currency.
When you need data, use the available tools.
```

---

## SUPABASE RULES

- Always use server-side client for mutations
- Always use RLS (Row Level Security) — never bypass it
- Never query without a limit unless doing aggregation
- Always join related tables rather than making multiple queries
- Use Supabase Storage for all file uploads
- Storage bucket name: groundworkos-documents
- Use new 2026 API key format:
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (replaces anon key)
  SUPABASE_SECRET_KEY (replaces service_role key)
  Find both in Supabase Dashboard > Settings > API Keys tab
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is safe for client side
- SUPABASE_SECRET_KEY is server side only — never expose to browser

---

## UK-SPECIFIC RULES

This is a UK product. Always:
- Use £ not $ for currency
- Use DD/MM/YYYY date format in the UI
- Use British English spelling (organisation not organization)
- VAT is 20% standard rate
- CIS (Construction Industry Scheme) deduction is 20% standard / 30% higher
- Phone numbers in UK format: 07xxx xxxxxx or 01xxx xxxxxx
- Postcodes in UK format: SW1A 1AA

---

## TESTING INSTRUCTIONS

After every completed prompt, tell me exactly:

1. What file(s) were created or modified
2. What command to run to test it
3. What to look for in the browser to confirm it works
4. What is most likely to break and what error to expect

Format it like this at the end of every response:

---
READY TO TEST
Files changed: [list]
Run: npm run dev
Go to: [URL]
Check: [what to look for]
Likely issues: [what might break]
---

---

## WHEN YOU ARE UNSURE

If you are unsure about any of the following, stop and ask
before writing code:

- Which file to modify
- Whether a package is already installed
- Whether a function already exists elsewhere in the project
- Whether a database table or column exists
- Whether a component already exists

It is better to ask one question than to assume and break
something that was already working.

---

## PHASE AWARENESS

The project is built in 8 phases across 30 prompts total.
Always be aware of which phase is currently active.
Never build phase 6 features when working on phase 2.
If a prompt asks for something outside the current phase,
flag it before proceeding.

Phase summary:
- Phase 1: Foundation (Next.js, Supabase, auth, UI components)
- Phase 2: Core MCP servers (clients, jobs, quotes, invoices)
- Phase 3: Operations MCP servers (subcon, schedule, compliance, reporting)
- Phase 4: Connect Mistral to all MCP servers
- Phase 5: Dashboard page
- Phase 6: Core pages (jobs, clients, quotes, invoices, subcontractors)
- Phase 7: Remaining pages and polish
- Phase 8: Deployment and handoff

Current phase is indicated at the start of each prompt
from the build plan. If no phase is indicated, ask which
phase we are in before proceeding.

---

## FINAL REMINDER

You are building a product worth £15,000-25,000 to a
real UK business. Every file you produce should be
something you would be proud to have a senior developer
review. Clean, typed, consistent, error-handled, and
complete.

No shortcuts. No half-finished code. No "you can add
error handling later". Do it right the first time.
