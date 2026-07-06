import { useUser } from "@clerk/react";

export type Role = "admin" | "manager" | "foreman";

const ROLE_RANKS: Record<Role, number> = { admin: 2, manager: 1, foreman: 0 };

export function useRole(): Role {
  const { user } = useUser();
  // New users have no role set yet: default them to admin so the first
  // person(s) to sign up have full access out of the box.
  const raw = (user?.publicMetadata?.role as string) ?? "admin";
  if (raw === "admin" || raw === "manager" || raw === "foreman") return raw;
  return "admin";
}

export function isAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANKS[role] >= ROLE_RANKS[min];
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  foreman: "Foreman",
};
