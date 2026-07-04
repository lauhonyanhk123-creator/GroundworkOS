---
name: Express 5 typed middleware params
description: Why adding an untyped middleware factory before a route handler broke req.params typing across many route files
---

**Problem**: After adding a role-check middleware (e.g. `requireRole("manager")`) as the second argument in `router.delete("/x/:id", requireRole("manager"), async (req, res) => { ... eq(table.id, req.params.id) ... })`, TypeScript started reporting `req.params.id` as `string | string[]` instead of `string`, breaking drizzle `eq()` calls across every route file that got the new middleware.

**Why**: Express 5's typings infer route param types from the literal path string per-handler (`RouteParameters<Path>`). When one handler in the array is untyped (default generic `Request<ParamsDictionary, ...>`), TypeScript's overload resolution for `router.METHOD(path, ...handlers)` unifies across all handlers and falls back to the broader/generic `ParamsDictionary` overload for the whole chain, widening every handler's `req.params` type in that route registration.

**How to apply**: Any middleware factory meant to be composed with route handlers should be generic over the route's param/body/query types, not hardcoded to `Request`/`Response`/`NextFunction`:
```ts
export function requireRole<P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
  minRole: Role
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return async (req, res, next) => { ... };
}
```
This lets TS unify the generic with whatever the concrete handler's inferred param type is, instead of collapsing to the default. Also note `res.status(403).json(...)` inside such a generic handler needs a cast (`(res.status(403) as any).json(...)`) since `ResBody` is generic and TS can't confirm the literal error-object shape matches an arbitrary `ResBody`.
