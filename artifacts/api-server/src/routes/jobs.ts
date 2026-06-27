import { Router } from "express";
import { db, jobsTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function withClient(job: typeof jobsTable.$inferSelect) {
  const [client] = job.clientId
    ? await db.select({ companyName: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.id, job.clientId))
    : [null];
  return { ...job, clientName: client?.companyName ?? null };
}

router.get("/jobs", async (req, res) => {
  const jobs = await db.select().from(jobsTable).orderBy(jobsTable.createdAt);
  const clientIds = [...new Set(jobs.map((j) => j.clientId).filter(Boolean))] as string[];
  const clients = clientIds.length
    ? await db.select({ id: clientsTable.id, companyName: clientsTable.companyName }).from(clientsTable)
    : [];
  const clientMap = new Map(clients.map((c) => [c.id, c.companyName]));
  res.json(jobs.map((j) => ({ ...j, clientName: clientMap.get(j.clientId ?? "") ?? null })));
});

router.post("/jobs", async (req, res) => {
  const { clientName: _cn, id: _id, jobNumber: _jn, ...data } = req.body;
  const { generateId, nextSeqNumber } = await import("../lib/generateId.js");
  const id = generateId();
  const jobNumber = await nextSeqNumber("jobs", "GW");
  const [job] = await db.insert(jobsTable).values({ id, jobNumber, ...data }).returning();
  res.status(201).json(await withClient(job));
});

router.get("/jobs/:id", async (req, res) => {
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, req.params.id));
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json(await withClient(job));
});

router.patch("/jobs/:id", async (req, res) => {
  const { clientName: _cn, ...data } = req.body;
  const [job] = await db.update(jobsTable).set(data).where(eq(jobsTable.id, req.params.id)).returning();
  if (!job) return res.status(404).json({ error: "Not found" });
  res.json(await withClient(job));
});

router.delete("/jobs/:id", async (req, res) => {
  await db.delete(jobsTable).where(eq(jobsTable.id, req.params.id));
  res.status(204).send();
});

export default router;
