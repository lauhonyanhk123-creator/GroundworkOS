import { Router } from "express";
import { clerkClient } from "@clerk/express";

const router = Router();

async function requireAdmin(req: any, res: any): Promise<boolean> {
  const userId: string | undefined = req.userId ?? req.auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const user = await clerkClient.users.getUser(userId);
  if ((user.publicMetadata?.role as string) !== "admin") {
    res.status(403).json({ error: "Forbidden: admin role required" });
    return false;
  }
  return true;
}

router.get("/admin/users", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    const response = await clerkClient.users.getUserList({ limit: 100 });
    const users = response.data.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.emailAddresses[0]?.emailAddress ?? null,
      role: (u.publicMetadata?.role as string) ?? "foreman",
      imageUrl: u.imageUrl,
      createdAt: new Date(u.createdAt).toISOString(),
      lastSignInAt: u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : null,
    }));
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to fetch users" });
  }
});

router.get("/admin/bootstrap-status", async (req, res) => {
  const userId: string | undefined = (req as any).userId ?? (req as any).auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const response = await clerkClient.users.getUserList({ limit: 500 });
    const adminExists = response.data.some(
      (u) => (u.publicMetadata?.role as string) === "admin",
    );
    return res.json({ adminExists });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Failed to check admin status" });
  }
});

router.post("/admin/bootstrap", async (req, res) => {
  const userId: string | undefined = (req as any).userId ?? (req as any).auth?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const response = await clerkClient.users.getUserList({ limit: 500 });
    const anyAdminExists = response.data.some(
      (u) => (u.publicMetadata?.role as string) === "admin",
    );
    if (anyAdminExists) {
      return res
        .status(409)
        .json({ error: "An admin already exists. Ask them to promote you from Settings > Users." });
    }
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { role: "admin" },
    });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Failed to bootstrap admin" });
  }
});

router.patch("/admin/users/:id/role", async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const { role } = req.body;
  if (!["admin", "manager", "foreman"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  try {
    await clerkClient.users.updateUserMetadata(req.params.id, {
      publicMetadata: { role },
    });
    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message ?? "Failed to update role" });
  }
});

export default router;
