import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function computeDocStatus(expiryDate?: string | null): string {
  if (!expiryDate) return "valid";
  const expiry = new Date(expiryDate);
  const now = new Date();
  if (expiry < now) return "expired";
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntil <= 30) return "expiring_soon";
  return "valid";
}

router.get("/documents", async (req, res) => {
  const docs = await db.select().from(documentsTable).orderBy(documentsTable.createdAt);
  res.json(docs);
});

router.post("/documents", async (req, res) => {
  const { id: _id, ...data } = req.body;
  const { generateId } = await import("../lib/generateId.js");
  const id = generateId();
  const status = computeDocStatus(data.expiry_date ?? data.expiryDate);
  const [doc] = await db
    .insert(documentsTable)
    .values({ id, ...data, status })
    .returning();
  res.status(201).json(doc);
});

router.patch("/documents/:id", async (req, res) => {
  const updates = { ...req.body };
  const expiryDate = updates.expiry_date ?? updates.expiryDate;
  if (expiryDate !== undefined) {
    updates.status = computeDocStatus(expiryDate);
  }
  const [doc] = await db
    .update(documentsTable)
    .set(updates)
    .where(eq(documentsTable.id, req.params.id))
    .returning();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.delete("/documents/:id", async (req, res) => {
  await db.delete(documentsTable).where(eq(documentsTable.id, req.params.id));
  res.status(204).send();
});

export default router;
