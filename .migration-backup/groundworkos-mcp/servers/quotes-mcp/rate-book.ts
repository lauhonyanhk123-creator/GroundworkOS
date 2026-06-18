// Rate book engine: aggregates historical quote line items into per-item
// pricing intelligence (suggested rates, ranges, win rates). Pure functions
// only — no database or environment dependencies — so the same module can be
// imported by the MCP tool handlers (server) and the Next.js UI (browser).

export interface RateBookSourceQuote {
  status: string;
  created_at: string;
  line_items: unknown;
}

export interface RateBookEntry {
  description: string;
  times_quoted: number;
  times_won: number;
  times_lost: number;
  /** Share of decided outcomes (accepted/rejected) that were won. Null when no quote containing this item has been decided yet. */
  win_rate: number | null;
  /** Median unit price from accepted quotes, falling back to all quotes when nothing has been won yet. */
  suggested_rate: number;
  min_rate: number;
  max_rate: number;
  last_rate: number;
  last_used: string;
}

interface RateAccumulator {
  description: string;
  rates: number[];
  acceptedRates: number[];
  timesWon: number;
  timesLost: number;
  lastRate: number;
  lastUsedMs: number;
  lastUsedIso: string;
}

function normaliseDescription(description: string): string {
  return description.trim().replace(/\s+/g, ' ').toLowerCase();
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return roundMoney(sorted[mid]);
  return roundMoney((sorted[mid - 1] + sorted[mid]) / 2);
}

function parseLineItems(raw: unknown): { description: string; unit_price: number }[] {
  if (!Array.isArray(raw)) return [];
  const items: { description: string; unit_price: number }[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const record = item as Record<string, unknown>;
    const description = typeof record.description === 'string' ? record.description.trim() : '';
    const unitPrice = typeof record.unit_price === 'number' ? record.unit_price : NaN;
    // Zero or negative prices are placeholder rows, not real rates — skip them
    // so they cannot drag suggested rates down.
    if (!description || !Number.isFinite(unitPrice) || unitPrice <= 0) continue;
    items.push({ description, unit_price: unitPrice });
  }
  return items;
}

export function buildRateBook(quotes: RateBookSourceQuote[]): RateBookEntry[] {
  const accumulators = new Map<string, RateAccumulator>();

  for (const quote of quotes) {
    const items = parseLineItems(quote.line_items);
    if (items.length === 0) continue;

    const createdMs = Date.parse(quote.created_at);
    const safeCreatedMs = Number.isFinite(createdMs) ? createdMs : 0;
    const isAccepted = quote.status === 'accepted';
    const isRejected = quote.status === 'rejected';

    for (const item of items) {
      const key = normaliseDescription(item.description);
      let acc = accumulators.get(key);
      if (!acc) {
        acc = {
          description: item.description,
          rates: [],
          acceptedRates: [],
          timesWon: 0,
          timesLost: 0,
          lastRate: item.unit_price,
          lastUsedMs: safeCreatedMs,
          lastUsedIso: quote.created_at,
        };
        accumulators.set(key, acc);
      }

      acc.rates.push(item.unit_price);
      if (isAccepted) {
        acc.acceptedRates.push(item.unit_price);
        acc.timesWon += 1;
      } else if (isRejected) {
        acc.timesLost += 1;
      }

      if (safeCreatedMs >= acc.lastUsedMs) {
        acc.lastUsedMs = safeCreatedMs;
        acc.lastUsedIso = quote.created_at;
        acc.lastRate = item.unit_price;
        acc.description = item.description;
      }
    }
  }

  const entries: RateBookEntry[] = [];
  for (const acc of accumulators.values()) {
    const decided = acc.timesWon + acc.timesLost;
    entries.push({
      description: acc.description,
      times_quoted: acc.rates.length,
      times_won: acc.timesWon,
      times_lost: acc.timesLost,
      win_rate: decided > 0 ? Math.round((acc.timesWon / decided) * 100) / 100 : null,
      suggested_rate: median(acc.acceptedRates.length > 0 ? acc.acceptedRates : acc.rates),
      min_rate: roundMoney(Math.min(...acc.rates)),
      max_rate: roundMoney(Math.max(...acc.rates)),
      last_rate: roundMoney(acc.lastRate),
      last_used: acc.lastUsedIso,
    });
  }

  entries.sort((a, b) => {
    if (b.times_quoted !== a.times_quoted) return b.times_quoted - a.times_quoted;
    return a.description.localeCompare(b.description);
  });

  return entries;
}

export function searchRateBook(entries: RateBookEntry[], query: string): RateBookEntry[] {
  const needle = normaliseDescription(query);
  if (!needle) return [...entries];

  const startsWith: RateBookEntry[] = [];
  const contains: RateBookEntry[] = [];
  for (const entry of entries) {
    const haystack = normaliseDescription(entry.description);
    if (haystack.startsWith(needle)) startsWith.push(entry);
    else if (haystack.includes(needle)) contains.push(entry);
  }
  return [...startsWith, ...contains];
}
