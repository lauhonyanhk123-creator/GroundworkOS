---
name: API server seed pattern
description: How to run the TypeScript seed script in the api-server artifact
---

The api-server uses esbuild (not tsx) to compile TypeScript. There is no tsx binary in this workspace.

**How to apply:** To run any one-off TypeScript script in the api-server:
1. Use esbuild to bundle to a temp dist file (e.g. `dist/seed.mjs`)
2. Run with `node dist/seed.mjs`

Example inline command:
```bash
cd artifacts/api-server && node -e "
import('./node_modules/esbuild/lib/main.js').then(async ({ build }) => {
  await build({
    entryPoints: ['src/seed.ts'],
    platform: 'node', bundle: true, format: 'esm',
    outfile: 'dist/seed.mjs', external: ['*.node', 'pg-native'],
    banner: { js: \"import { createRequire as __cr } from 'node:module'; globalThis.require = __cr(import.meta.url);\" },
  });
}).catch(e => { console.error(e); process.exit(1); })
" && node dist/seed.mjs
```

The seed file itself is at `artifacts/api-server/src/seed.ts` and uses `onConflictDoNothing()` so it's safe to re-run.
