import { Router } from "express";
import { db, timesheetsTable, jobsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/timesheets", async (req, res) => {
  const rows = await db.select().from(timesheetsTable).orderBy(desc(timesheetsTable.workDate), desc(timesheetsTable.createdAt));
  const jobIds = [...new Set(rows.map((r) => r.jobId).filter(Boolean))] as string[];
  const jobs = jobIds.length
    ? await db.select({ id: jobsTable.id, jobNumber: jobsTable.jobNumber, title: jobsTable.title }).from(jobsTable)
    : [];
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  res.json(rows.map((r) => ({
    ...r,
    jobNumber: r.jobId ? (jobMap.get(r.jobId)?.jobNumber ?? null) : null,
    jobTitle: r.jobId ? (jobMap.get(r.jobId)?.title ?? null) : null,
  })));
});

router.post("/timesheets", async (req, res) => {
  const { id: _id, jobNumber: _jn, jobTitle: _jt, ...data } = req.body;
  const { generateId } = await import("../lib/generateId.js");
  const id = generateId();
  const hoursWorked = Number(data.hoursWorked ?? 8);
  const dayRate = data.dayRate ? Number(data.dayRate) : null;
  const cost = dayRate != null ? Math.round(((hoursWorked / 8) * dayRate) * 100) / 100 : null;
  const [row] = await db.insert(timesheetsTable).values({ id, ...data, hoursWorked, dayRate, cost }).returning();
  res.status(201).json({ ...row, jobNumber: null, jobTitle: null });
});

router.patch("/timesheets/:id", async (req, res) => {
  const { jobNumber: _jn, jobTitle: _jt, ...data } = req.body;
  const hoursWorked = data.hoursWorked != null ? Number(data.hoursWorked) : undefined;
  const dayRate = data.dayRate != null ? Number(data.dayRate) : undefined;
  const updates: any = { ...data };
  if (hoursWorked !== undefined) updates.hoursWorked = hoursWorked;
  if (dayRate !== undefined) updates.dayRate = dayRate;
  if (updates.hoursWorked !== undefined || updates.dayRate !== undefined) {
    const [existing] = await db.select().from(timesheetsTable).where(eq(timesheetsTable.id, req.params.id));
    const h = updates.hoursWorked ?? existing?.hoursWorked ?? 8;
    const d = updates.dayRate ?? existing?.dayRate ?? null;
    updates.cost = d != null ? Math.round(((h / 8) * d) * 100) / 100 : null;
  }
  const [row] = await db.update(timesheetsTable).set(updates).where(eq(timesheetsTable.id, req.params.id)).returning();
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json({ ...row, jobNumber: null, jobTitle: null });
});

router.delete("/timesheets/:id", async (req, res) => {
  await db.delete(timesheetsTable).where(eq(timesheetsTable.id, req.params.id));
  res.status(204).send();
});

export default router;
