---
name: GroundworkOS DB migrations
description: How to apply schema changes when drizzle-kit push fails due to TTY requirement
---

**Problem**: `pnpm --filter @workspace/db run push` sometimes fails with:
> "Interactive prompts require a TTY terminal"

This happens when drizzle-kit needs confirmation for destructive changes (e.g., adding a UNIQUE constraint to a table with existing rows).

**Solution**: Apply the change directly via `executeSql` in the code_execution sandbox:
```js
await executeSql({ sqlQuery: `
  ALTER TABLE quotes ADD COLUMN IF NOT EXISTS share_token text;
  CREATE UNIQUE INDEX IF NOT EXISTS quotes_share_token_unique 
    ON quotes(share_token) WHERE share_token IS NOT NULL;
` });
```

Using a partial unique index (`WHERE col IS NOT NULL`) avoids conflicts on existing NULL rows.

**Why**: The TTY check is baked into drizzle-kit's interactive prompt; there's no `--force` flag that bypasses it cleanly. Direct SQL is faster and avoids the issue entirely.

**How to apply**: Use `code_execution` tool with `executeSql` callback; changes are applied to the dev Postgres DB immediately.
