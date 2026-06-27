import { Router } from "express";
import { db, subcontractorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/subcontractors", async (req, res) => {
  const subs = await db.select().from(subcontractorsTable).orderBy(subcontractorsTable.companyName);
  res.json(subs);
});

router.post("/subcontractors", async (req, res) => {
  const { id: _id, ...data } = req.body;
  const { generateId } = await import("../lib/generateId.js");
  const id = generateId();
  const [sub] = await db.insert(subcontractorsTable).values({ id, ...data }).returning();
  res.status(201).json(sub);
});

router.get("/subcontractors/:id", async (req, res) => {
  const [sub] = await db.select().from(subcontractorsTable).where(eq(subcontractorsTable.id, req.params.id));
  if (!sub) return res.status(404).json({ error: "Not found" });
  return res.json(sub);
});

router.patch("/subcontractors/:id", async (req, res) => {
  const [sub] = await db.update(subcontractorsTable).set(req.body).where(eq(subcontractorsTable.id, req.params.id)).returning();
  if (!sub) return res.status(404).json({ error: "Not found" });
  return res.json(sub);
});

router.delete("/subcontractors/:id", async (req, res) => {
  await db.delete(subcontractorsTable).where(eq(subcontractorsTable.id, req.params.id));
  res.status(204).send();
});

export default router;
