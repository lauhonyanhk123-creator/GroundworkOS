import { Router } from "express";
import { db, scheduleEntriesTable, jobsTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function enrichEntry(entry: typeof scheduleEntriesTable.$inferSelect) {
  const [job] = entry.jobId
    ? await db
        .select({ jobNumber: jobsTable.jobNumber, title: jobsTable.title, clientId: jobsTable.clientId })
        .from(jobsTable)
        .where(eq(jobsTable.id, entry.jobId))
    : [null];
  const [client] = job?.clientId
    ? await db.select({ companyName: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.id, job.clientId))
    : [null];
  return {
    ...entry,
    startDatetime: entry.startDatetime instanceof Date ? entry.startDatetime.toISOString() : entry.startDatetime,
    endDatetime: entry.endDatetime instanceof Date ? entry.endDatetime.toISOString() : entry.endDatetime,
    jobNumber: job?.jobNumber ?? null,
    jobTitle: job?.title ?? null,
    clientName: client?.companyName ?? null,
  };
}

router.get("/schedule", async (req, res) => {
  const entries = await db.select().from(scheduleEntriesTable).orderBy(scheduleEntriesTable.startDatetime);
  const enriched = await Promise.all(entries.map(enrichEntry));
  res.json(enriched);
});

router.post("/schedule", async (req, res) => {
  const { jobNumber: _jn, jobTitle: _jt, clientName: _cn, ...data } = req.body;
  const [entry] = await db.insert(scheduleEntriesTable).values(data).returning();
  res.status(201).json(await enrichEntry(entry));
});

router.patch("/schedule/:id", async (req, res) => {
  const { jobNumber: _jn, jobTitle: _jt, clientName: _cn, ...data } = req.body;
  const [entry] = await db.update(scheduleEntriesTable).set(data).where(eq(scheduleEntriesTable.id, req.params.id)).returning();
  if (!entry) return res.status(404).json({ error: "Not found" });
  res.json(await enrichEntry(entry));
});

router.delete("/schedule/:id", async (req, res) => {
  await db.delete(scheduleEntriesTable).where(eq(scheduleEntriesTable.id, req.params.id));
  res.status(204).send();
});

export default router;
