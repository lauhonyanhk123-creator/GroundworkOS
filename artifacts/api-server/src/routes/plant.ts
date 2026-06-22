import { Router } from "express";
import { db, plantTable, jobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function enrichPlant(item: typeof plantTable.$inferSelect) {
  const [job] = item.currentJobId
    ? await db.select({ title: jobsTable.title }).from(jobsTable).where(eq(jobsTable.id, item.currentJobId))
    : [null];
  return { ...item, currentJobTitle: job?.title ?? null };
}

router.get("/plant", async (req, res) => {
  const items = await db.select().from(plantTable).orderBy(plantTable.name);
  const enriched = await Promise.all(items.map(enrichPlant));
  res.json(enriched);
});

router.post("/plant", async (req, res) => {
  const { currentJobTitle: _cjt, ...data } = req.body;
  const [item] = await db.insert(plantTable).values(data).returning();
  res.status(201).json(await enrichPlant(item));
});

router.patch("/plant/:id", async (req, res) => {
  const { currentJobTitle: _cjt, ...data } = req.body;
  const [item] = await db.update(plantTable).set(data).where(eq(plantTable.id, req.params.id)).returning();
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(await enrichPlant(item));
});

router.delete("/plant/:id", async (req, res) => {
  await db.delete(plantTable).where(eq(plantTable.id, req.params.id));
  res.status(204).send();
});

export default router;
