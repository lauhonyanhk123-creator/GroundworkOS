import { Router } from "express";
import { db, quotesTable, lineItemsTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logAudit } from "./audit.js";
import { requireRole } from "../lib/auth.js";

const router = Router();

const VAT_RATE = 0.2;

async function enrichQuote(quote: typeof quotesTable.$inferSelect) {
  const lineItems = await db.select().from(lineItemsTable).where(eq(lineItemsTable.quoteId, quote.id));
  const [client] = quote.clientId
    ? await db.select({ companyName: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.id, quote.clientId))
    : [null];
  return { ...quote, lineItems, clientName: client?.companyName ?? null };
}

/** Recompute subtotal/VAT/total server-side from line items — never trust client totals. */
function computeTotalsFromLineItems(lineItems: Array<{ quantity?: number; unitPrice?: number; total?: number }>) {
  const subtotal = Math.round(
    lineItems.reduce((sum, li) => sum + (Number(li.quantity) || 0) * (Number(li.unitPrice) || 0), 0) * 100
  ) / 100;
  const vatAmount = Math.round(subtotal * VAT_RATE * 100) / 100;
  const totalAmount = Math.round((subtotal + vatAmount) * 100) / 100;
  return { subtotal, vatAmount, totalAmount };
}

router.get("/quotes", async (req, res) => {
  const quotes = await db.select().from(quotesTable).orderBy(quotesTable.createdAt);
  const enriched = await Promise.all(quotes.map(enrichQuote));
  res.json(enriched);
});

router.post("/quotes", async (req, res) => {
  const { lineItems, clientName: _cn, id: _id, quoteNumber: _qn, subtotal: _st, vatAmount: _va, totalAmount: _ta, ...data } = req.body;
  const totals = lineItems?.length ? computeTotalsFromLineItems(lineItems) : { subtotal: 0, vatAmount: 0, totalAmount: 0 };
  const { generateId, nextSeqNumber } = await import("../lib/generateId.js");
  const id = generateId();
  const quoteNumber = await nextSeqNumber("quotes", "QT");
  const [quote] = await db.insert(quotesTable).values({ id, quoteNumber, ...data, ...totals }).returning();
  if (lineItems?.length) {
    await db.insert(lineItemsTable).values(
      lineItems.map((li: typeof lineItemsTable.$inferInsert) => ({
        ...li,
        quoteId: quote.id,
        total: Math.round((Number(li.quantity) || 0) * (Number(li.unitPrice) || 0) * 100) / 100,
      }))
    );
  }
  await logAudit("quote", id, "create", { quoteNumber, status: data.status }, req);
  res.status(201).json(await enrichQuote(quote));
});

router.get("/quotes/:id", async (req, res) => {
  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
  if (!quote) return res.status(404).json({ error: "Not found" });
  return res.json(await enrichQuote(quote));
});

router.patch("/quotes/:id", async (req, res) => {
  const { lineItems, clientName: _cn, subtotal: _st, vatAmount: _va, totalAmount: _ta, ...data } = req.body;
  const totals = lineItems !== undefined
    ? (lineItems.length ? computeTotalsFromLineItems(lineItems) : { subtotal: 0, vatAmount: 0, totalAmount: 0 })
    : {};
  const [quote] = await db.update(quotesTable).set({ ...data, ...totals }).where(eq(quotesTable.id, req.params.id)).returning();
  if (!quote) return res.status(404).json({ error: "Not found" });
  if (lineItems !== undefined) {
    await db.delete(lineItemsTable).where(eq(lineItemsTable.quoteId, quote.id));
    if (lineItems.length) {
      await db.insert(lineItemsTable).values(
        lineItems.map((li: typeof lineItemsTable.$inferInsert) => ({
          ...li,
          quoteId: quote.id,
          total: Math.round((Number(li.quantity) || 0) * (Number(li.unitPrice) || 0) * 100) / 100,
        }))
      );
    }
  }
  await logAudit("quote", req.params.id, "update", data, req);
  return res.json(await enrichQuote(quote));
});

router.delete("/quotes/:id", requireRole("manager"), async (req, res) => {
  await logAudit("quote", req.params.id, "delete", null, req);
  await db.delete(lineItemsTable).where(eq(lineItemsTable.quoteId, req.params.id));
  await db.delete(quotesTable).where(eq(quotesTable.id, req.params.id));
  res.status(204).send();
});

export default router;
