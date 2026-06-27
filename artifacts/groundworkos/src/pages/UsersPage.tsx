import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/react";
import { toast } from "sonner";
import { useRole, isAtLeast, ROLE_LABELS, type Role } from "../hooks/useRole";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: Role;
  imageUrl: string;
  createdAt: string;
  lastSignInAt: string | null;
}

const ROLE_COLORS: Record<Role, { bg: string; text: string; border: string }> = {
  admin: { bg: "#fef3c7", text: "#92400e", border: "rgba(146,64,14,0.2)" },
  manager: { bg: "#e8f3f7", text: "#1b5e78", border: "rgba(27,94,120,0.2)" },
  foreman: { bg: "#f3f4f6", text: "#4a4540", border: "rgba(74,69,64,0.2)" },
};

export function UsersPage() {
  const { user: currentUser } = useUser();
  const role = useRole();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`${BASE}/api/admin/users`);
      if (!r.ok) throw new Error();
      const data: ClerkUser[] = await r.json();
      setUsers(data);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRole: Role) {
    if (userId === currentUser?.id && newRole !== "admin") {
      toast.error("You cannot demote yourself");
      return;
    }
    setUpdating(userId);
    try {
      const r = await fetch(`${BASE}/api/admin/users/${userId}/role`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: newRole }) });
      if (!r.ok) throw new Error();
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success("Role updated");
    } catch {
      toast.error("Failed to update role");
    } finally {
      setUpdating(null);
    }
  }

  if (!isAtLeast(role, "admin")) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <p style={{ color: "#7a7469", fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Admin access required</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="mb-6">
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: "#181410", letterSpacing: "-0.02em", marginBottom: 4 }}>
          Users
        </h1>
        <p style={{ color: "#7a7469", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
          Manage team access and roles. Changes take effect on next sign-in.
        </p>
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 8, backgroundColor: "#eeeae4", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : (
        <div style={{ border: "1px solid #d9d4ce", borderRadius: 10, backgroundColor: "#fafaf8", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: "1px solid #ece8e3", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: "#7a7469", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {users.length} member{users.length !== 1 ? "s" : ""}
            </span>
          </div>
          {users.map((u, idx) => {
            const name = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || "Unknown";
            const initials = (u.firstName?.[0] ?? u.email?.[0] ?? "?").toUpperCase();
            const isSelf = u.id === currentUser?.id;
            const colors = ROLE_COLORS[u.role];
            return (
              <div
                key={u.id}
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: idx < users.length - 1 ? "1px solid #ece8e3" : "none",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#1b5e78", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "'Space Grotesk', sans-serif" }}>{initials}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: "#181410" }}>{name}</span>
                    {isSelf && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#a8a099" }}>you</span>}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#7a7469" }}>{u.email}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                  <select
                    value={u.role}
                    disabled={updating === u.id}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: 12,
                      padding: "5px 8px",
                      borderRadius: 6,
                      border: "1px solid #d9d4ce",
                      backgroundColor: "#ffffff",
                      color: "#181410",
                      cursor: "pointer",
                      opacity: updating === u.id ? 0.5 : 1,
                    }}
                  >
                    <option value="foreman">Foreman</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, padding: 16, borderRadius: 8, backgroundColor: "#fafaf8", border: "1px solid #d9d4ce" }}>
        <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: "#181410", marginBottom: 8 }}>Role permissions</p>
        <div style={{ display: "grid", gap: 6 }}>
          {([["Admin", "Full access — users, settings, all modules"], ["Manager", "All modules, reports and settings (no user management)"], ["Foreman", "Jobs and Schedule only"]] as const).map(([r, desc]) => (
            <div key={r} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: "#7a7469", minWidth: 64 }}>{r}</span>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: "#7a7469", lineHeight: 1.5 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
