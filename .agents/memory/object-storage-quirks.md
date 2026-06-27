---
name: Object storage setup quirks
description: Gotchas when adding Replit object storage to this pnpm monorepo
---

**1. api-server needs zod installed explicitly**
The storage.ts template imports `zod` but the api-server package.json does not include it as a dependency. esbuild will fail with "Could not resolve zod". Fix: `pnpm --filter @workspace/api-server add zod`.

**2. pnpm overrides with $react shorthand don't work in root package.json**
The skill says to add `"pnpm": { "overrides": { "react": "$react" } }` to the root package.json, but this fails with "Cannot resolve version $react" because react is not a direct dependency of the root package. The overrides in pnpm-workspace.yaml use a different format. However, this project uses React 19.1.0 which already satisfies Uppy v5's peer dep of `react>=19`, so no override is needed at all.

**3. Storage route: inline Zod schemas instead of api-zod codegen**
The template imports `RequestUploadUrlBody` and `RequestUploadUrlResponse` from `@workspace/api-zod`, but those don't exist there. Fastest fix: define them inline in storage.ts using zod directly. Avoids needing to update openapi.yaml + run codegen.

**4. toDocument transform: use `(r as any).filePath`**
The generated `DocumentRecord` type doesn't include `filePath` since the OpenAPI spec wasn't regenerated. Cast with `(r as any).filePath` in apiTransforms.ts to pick up the new column.

**Why:** Captures the specific failures encountered during object storage integration to avoid repeating the debugging steps.
