import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireRole } from "../lib/auth.js";
import { logAudit } from "./audit.js";
import { adminExists } from "./admin.js";

const router = Router();

// GET is intentionally open to any authenticated user (not manager-gated):
// the onboarding-wizard check in App.tsx reads this for every role,
// including foreman, before any role-gated UI has loaded.
router.get("/settings/company", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT data FROM company_settings WHERE id = 1
    `);
    const row = (result as any).rows?.[0] ?? (result as any)[0];
    res.json((row as any)?.data ?? {});
  } catch (err) {
    console.error("Failed to load company settings:", err);
    res.status(500).json({ error: "Failed to load company settings" });
  }
});

// PUT is normally manager+, but a brand-new deployment has no manager/admin
// yet, so — mirroring the admin bootstrap flow — we also allow it for a
// foreman while no admin exists, so the very first user can complete the
// onboarding wizard and set up the company.
router.put("/settings/company", async (req, res, next) => {
  if (!(await adminExists())) return next();
  return requireRole("manager")(req, res, next);
}, async (req, res) => {
  try {
    await db.execute(sql`
      INSERT INTO company_settings (id, data, updated_at)
      VALUES (1, ${JSON.stringify(req.body)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(req.body)}::jsonb, updated_at = now()
    `);
    await logAudit("settings", "company", "update", req.body, req);
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to save company settings:", err);
    res.status(500).json({ error: "Failed to save company settings" });
  }
});

export default router;
