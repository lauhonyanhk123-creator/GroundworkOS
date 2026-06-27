import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

let settingsCache: Record<string, unknown> = {};

router.get("/settings/company", async (_req, res) => {
  try {
    const [row] = await db.execute(sql`
      SELECT data FROM company_settings WHERE id = 1
    `);
    res.json((row as any)?.data ?? settingsCache);
  } catch {
    res.json(settingsCache);
  }
});

router.put("/settings/company", async (req, res) => {
  try {
    await db.execute(sql`
      INSERT INTO company_settings (id, data, updated_at)
      VALUES (1, ${JSON.stringify(req.body)}::jsonb, now())
      ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(req.body)}::jsonb, updated_at = now()
    `);
    settingsCache = req.body;
    res.json({ ok: true });
  } catch {
    settingsCache = req.body;
    res.json({ ok: true });
  }
});

export default router;
