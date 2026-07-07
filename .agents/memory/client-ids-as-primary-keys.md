---
name: Client ids must not become DB primary keys
description: Why client-supplied row ids caused a "second create fails" bug in GroundworkOS quotes, and the rule to prevent it
---

**Rule**: Never persist a client-supplied id as a database primary key. For any create/edit endpoint that inserts child rows from a client payload, generate the id server-side and override whatever the client sent.

**Why**: GroundworkOS quote line items had a "creating the SECOND quote fails with 'Failed to create quote'" bug. Two compounding causes:
- Frontend: the "new quote" form's default line item id came from `crypto.randomUUID()` evaluated inside a **module-level** `emptyForm` constant — so it ran ONCE at import time, and every new-quote form reused the exact same line-item id.
- Backend: `line_items.id` is a `text` PRIMARY KEY with **no DB default**, and the POST/PATCH handlers inserted the client's line-item id verbatim (`...li`). The first quote consumed that id; the second quote's insert hit a PK collision, which rolled back the whole transaction — including the sequence-counter increment (so the quote number counter also silently stayed put).

This class of bug is invisible on the first create and only appears on the second, so it slips past manual smoke tests. It was caught by an e2e test that created two quotes in a row.

**How to apply**:
- Backend: when mapping client-sent child rows for insert, set `id: generateId()` (server-side randomUUID) rather than trusting the client id. Client temp ids are UI keys only.
- Frontend: build initial-form state from a factory (`makeEmptyForm()` called per open), never a shared module-level object literal that bakes in a random id at import time. Also use `useState(makeEmptyForm)` (lazy initializer) so the first mount gets a fresh id too.
- Regression coverage: test creating TWO of the same entity back-to-back, not just one.
