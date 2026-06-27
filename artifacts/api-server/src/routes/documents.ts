import { Router } from "express";
import { db, documentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/documents", async (req, res) => {
  const docs = await db.select().from(documentsTable).orderBy(documentsTable.createdAt);
  res.json(docs);
});

router.post("/documents", async (req, res) => {
  const { id: _id, ...data } = req.body;
  const { generateId } = await import("../lib/generateId.js");
  const id = generateId();
  const [doc] = await db.insert(documentsTable).values({ id, ...data }).returning();
  res.status(201).json(doc);
});

router.patch("/documents/:id", async (req, res) => {
  const [doc] = await db.update(documentsTable).set(req.body).where(eq(documentsTable.id, req.params.id)).returning();
  if (!doc) return res.status(404).json({ error: "Not found" });
  res.json(doc);
});

router.delete("/documents/:id", async (req, res) => {
  await db.delete(documentsTable).where(eq(documentsTable.id, req.params.id));
  res.status(204).send();
});

export default router;
