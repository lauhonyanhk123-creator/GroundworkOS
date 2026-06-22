import { Router } from "express";
import { db, rateBookTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/rate-book", async (req, res) => {
  const entries = await db.select().from(rateBookTable).orderBy(rateBookTable.category, rateBookTable.description);
  res.json(entries);
});

router.post("/rate-book", async (req, res) => {
  const [entry] = await db.insert(rateBookTable).values(req.body).returning();
  res.status(201).json(entry);
});

router.patch("/rate-book/:id", async (req, res) => {
  const [entry] = await db.update(rateBookTable).set(req.body).where(eq(rateBookTable.id, req.params.id)).returning();
  if (!entry) return res.status(404).json({ error: "Not found" });
  res.json(entry);
});

router.delete("/rate-book/:id", async (req, res) => {
  await db.delete(rateBookTable).where(eq(rateBookTable.id, req.params.id));
  res.status(204).send();
});

export default router;
