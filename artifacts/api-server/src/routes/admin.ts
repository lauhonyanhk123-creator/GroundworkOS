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
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Failed to update role" });
  }
});

export default router;
