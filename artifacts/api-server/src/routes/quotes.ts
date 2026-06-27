import { Router } from "express";
import { db, quotesTable, lineItemsTable, clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function enrichQuote(quote: typeof quotesTable.$inferSelect) {
  const lineItems = await db.select().from(lineItemsTable).where(eq(lineItemsTable.quoteId, quote.id));
  const [client] = quote.clientId
    ? await db.select({ companyName: clientsTable.companyName }).from(clientsTable).where(eq(clientsTable.id, quote.clientId))
    : [null];
  return { ...quote, lineItems, clientName: client?.companyName ?? null };
}

router.get("/quotes", async (req, res) => {
  const quotes = await db.select().from(quotesTable).orderBy(quotesTable.createdAt);
  const enriched = await Promise.all(quotes.map(enrichQuote));
  res.json(enriched);
});

router.post("/quotes", async (req, res) => {
  const { lineItems, clientName: _cn, id: _id, quoteNumber: _qn, ...data } = req.body;
  const { generateId, nextSeqNumber } = await import("../lib/generateId.js");
  const id = generateId();
  const quoteNumber = await nextSeqNumber("quotes", "QT");
  const [quote] = await db.insert(quotesTable).values({ id, quoteNumber, ...data }).returning();
  if (lineItems?.length) {
    await db.insert(lineItemsTable).values(lineItems.map((li: typeof lineItemsTable.$inferInsert) => ({ ...li, quoteId: quote.id })));
  }
  res.status(201).json(await enrichQuote(quote));
});

router.get("/quotes/:id", async (req, res) => {
  const [quote] = await db.select().from(quotesTable).where(eq(quotesTable.id, req.params.id));
  if (!quote) return res.status(404).json({ error: "Not found" });
  res.json(await enrichQuote(quote));
});

router.patch("/quotes/:id", async (req, res) => {
  const { lineItems, clientName: _cn, ...data } = req.body;
  const [quote] = await db.update(quotesTable).set(data).where(eq(quotesTable.id, req.params.id)).returning();
  if (!quote) return res.status(404).json({ error: "Not found" });
  if (lineItems !== undefined) {
    await db.delete(lineItemsTable).where(eq(lineItemsTable.quoteId, quote.id));
    if (lineItems.length) {
      await db.insert(lineItemsTable).values(lineItems.map((li: typeof lineItemsTable.$inferInsert) => ({ ...li, quoteId: quote.id })));
    }
  }
  res.json(await enrichQuote(quote));
});

router.delete("/quotes/:id", async (req, res) => {
  await db.delete(lineItemsTable).where(eq(lineItemsTable.quoteId, req.params.id));
  await db.delete(quotesTable).where(eq(quotesTable.id, req.params.id));
  res.status(204).send();
});

export default router;
