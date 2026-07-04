import type { Request, RequestHandler } from "express";
import { getAuth, clerkClient } from "@clerk/express";

export type Role = "foreman" | "manager" | "admin";

const ROLE_RANK: Record<Role, number> = {
  foreman: 0,
  manager: 1,
  admin: 2,
};

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "manager" || value === "foreman";
}

export async function getUserRole(req: Request): Promise<Role> {
  const cached = (req as any)._role as Role | undefined;
  if (cached) return cached;

  const auth = getAuth(req);
  const userId: string | undefined = (req as any).userId ?? (auth as any)?.userId;
  let role: Role = "foreman";
  if (userId) {
    try {
      const user = await clerkClient.users.getUser(userId);
      const claimed = user.publicMetadata?.role;
      if (isRole(claimed)) role = claimed;
    } catch {
      // fall back to least-privileged role if Clerk lookup fails
    }
  }
  (req as any)._role = role;
  return role;
}

/**
 * Express middleware factory: rejects the request with 403 unless the
 * caller's role is at least `minRole` (admin > manager > foreman).
 *
 * Generic over the route's param/body/query types so TypeScript unifies it
 * with the concrete handler it's paired with in `router.METHOD(path, requireRole(...), handler)`
 * instead of falling back to a broader default `ParamsDictionary`.
 */
export function requireRole<P = any, ResBody = any, ReqBody = any, ReqQuery = any>(
  minRole: Role
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return async (req, res, next) => {
    const role = await getUserRole(req as unknown as Request);
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
      (res.status(403) as any).json({ error: `Forbidden: ${minRole} role required` });
      return;
    }
    next();
  };
}
