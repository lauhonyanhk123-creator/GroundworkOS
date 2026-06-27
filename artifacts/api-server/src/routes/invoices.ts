import { Router } from "express";
import { db, invoicesTable, clientsTable, jobsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logAudit } from "./audit.js";

const router = Router();

async function enrichInvoice(inv: typeof invoicesTable.$inferSelect) {
  const [client] = inv.clientId
    ? await db.select({ companyName: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.id, inv.clientId))
    : [null];
  const [job] = inv.jobId
    ? await db.select({ title: jobsTable.title }).from(jobsTable).where(eq(jobsTable.id, inv.jobId))
    : [null];
  return { ...inv, clientName: client?.companyName ?? null, jobTitle: job?.title ?? null };
}

router.get("/invoices", async (req, res) => {
  const invoices = await db.select().from(invoicesTable).orderBy(invoicesTable.createdAt);
  const enriched = await Promise.all(invoices.map(enrichInvoice));
  res.json(enriched);
});

router.post("/invoices", async (req, res) => {
  const { clientName: _cn, jobTitle: _jt, id: _id, invoiceNumber: _in, ...data } = req.body;
  const { generateId, nextSeqNumber } = await import("../lib/generateId.js");
  const id = generateId();
  const invoiceNumber = await nextSeqNumber("invoices", "INV");
  const [inv] = await db.insert(invoicesTable).values({ id, invoiceNumber, ...data }).returning();
  await logAudit("invoice", id, "create", { invoiceNumber, status: data.status }, req);
  res.status(201).json(await enrichInvoice(inv));
});

router.get("/invoices/:id", async (req, res) => {
  const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, req.params.id));
  if (!inv) return res.status(404).json({ error: "Not found" });
  res.json(await enrichInvoice(inv));
});

router.patch("/invoices/:id", async (req, res) => {
  const { clientName: _cn, jobTitle: _jt, ...data } = req.body;
  const [inv] = await db.update(invoicesTable).set(data).where(eq(invoicesTable.id, req.params.id)).returning();
  if (!inv) return res.status(404).json({ error: "Not found" });
  await logAudit("invoice", req.params.id, "update", data, req);
  res.json(await enrichInvoice(inv));
});

router.delete("/invoices/:id", async (req, res) => {
  await logAudit("invoice", req.params.id, "delete", null, req);
  await db.delete(invoicesTable).where(eq(invoicesTable.id, req.params.id));
  res.status(204).send();
});

export default router;
