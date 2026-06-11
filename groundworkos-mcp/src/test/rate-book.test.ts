import { describe, it, expect } from 'vitest';
import { buildRateBook, searchRateBook, type RateBookSourceQuote } from '../../servers/quotes-mcp/rate-book';

function quote(status: string, createdAt: string, lineItems: unknown): RateBookSourceQuote {
  return { status, created_at: createdAt, line_items: lineItems };
}

describe('Rate book: grouping and counts', () => {
  it('groups line items by normalised description', () => {
    const entries = buildRateBook([
      quote('draft', '2026-01-01T00:00:00Z', [
        { description: 'Trench excavation', quantity: 1, unit_price: 100 },
      ]),
      quote('draft', '2026-01-02T00:00:00Z', [
        { description: '  trench   EXCAVATION ', quantity: 2, unit_price: 120 },
      ]),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].times_quoted).toBe(2);
  });

  it('uses the most recent description casing for display', () => {
    const entries = buildRateBook([
      quote('draft', '2026-01-01T00:00:00Z', [
        { description: 'trench excavation', quantity: 1, unit_price: 100 },
      ]),
      quote('draft', '2026-03-01T00:00:00Z', [
        { description: 'Trench Excavation', quantity: 1, unit_price: 110 },
      ]),
    ]);
    expect(entries[0].description).toBe('Trench Excavation');
    expect(entries[0].last_rate).toBe(110);
    expect(entries[0].last_used).toBe('2026-03-01T00:00:00Z');
  });

  it('sorts entries by times quoted, then description', () => {
    const entries = buildRateBook([
      quote('draft', '2026-01-01T00:00:00Z', [
        { description: 'Kerbing', quantity: 1, unit_price: 40 },
        { description: 'Drainage run', quantity: 1, unit_price: 80 },
      ]),
      quote('draft', '2026-01-02T00:00:00Z', [
        { description: 'Kerbing', quantity: 1, unit_price: 45 },
      ]),
    ]);
    expect(entries.map(e => e.description)).toEqual(['Kerbing', 'Drainage run']);
  });
});

describe('Rate book: suggested rate', () => {
  it('uses the median of accepted rates when wins exist', () => {
    const entries = buildRateBook([
      quote('accepted', '2026-01-01T00:00:00Z', [
        { description: 'Foundations', quantity: 1, unit_price: 100 },
      ]),
      quote('accepted', '2026-01-02T00:00:00Z', [
        { description: 'Foundations', quantity: 1, unit_price: 200 },
      ]),
      quote('rejected', '2026-01-03T00:00:00Z', [
        { description: 'Foundations', quantity: 1, unit_price: 999 },
      ]),
    ]);
    expect(entries[0].suggested_rate).toBe(150);
  });

  it('falls back to the median across all quotes when nothing is won yet', () => {
    const entries = buildRateBook([
      quote('draft', '2026-01-01T00:00:00Z', [
        { description: 'Sewers', quantity: 1, unit_price: 50 },
      ]),
      quote('sent', '2026-01-02T00:00:00Z', [
        { description: 'Sewers', quantity: 1, unit_price: 70 },
      ]),
      quote('rejected', '2026-01-03T00:00:00Z', [
        { description: 'Sewers', quantity: 1, unit_price: 90 },
      ]),
    ]);
    expect(entries[0].suggested_rate).toBe(70);
  });

  it('tracks min and max rates across all quotes', () => {
    const entries = buildRateBook([
      quote('draft', '2026-01-01T00:00:00Z', [
        { description: 'Reinstatement', quantity: 1, unit_price: 25.5 },
      ]),
      quote('draft', '2026-01-02T00:00:00Z', [
        { description: 'Reinstatement', quantity: 1, unit_price: 60 },
      ]),
    ]);
    expect(entries[0].min_rate).toBe(25.5);
    expect(entries[0].max_rate).toBe(60);
  });
});

describe('Rate book: win rate', () => {
  it('computes win rate from decided quotes only', () => {
    const entries = buildRateBook([
      quote('accepted', '2026-01-01T00:00:00Z', [
        { description: 'Excavation', quantity: 1, unit_price: 100 },
      ]),
      quote('rejected', '2026-01-02T00:00:00Z', [
        { description: 'Excavation', quantity: 1, unit_price: 100 },
      ]),
      quote('sent', '2026-01-03T00:00:00Z', [
        { description: 'Excavation', quantity: 1, unit_price: 100 },
      ]),
    ]);
    expect(entries[0].times_won).toBe(1);
    expect(entries[0].times_lost).toBe(1);
    expect(entries[0].win_rate).toBe(0.5);
  });

  it('returns null win rate when no quote has been decided', () => {
    const entries = buildRateBook([
      quote('draft', '2026-01-01T00:00:00Z', [
        { description: 'Excavation', quantity: 1, unit_price: 100 },
      ]),
    ]);
    expect(entries[0].win_rate).toBeNull();
  });
});

describe('Rate book: malformed data resilience', () => {
  it('ignores quotes whose line_items is not an array', () => {
    const entries = buildRateBook([
      quote('draft', '2026-01-01T00:00:00Z', null),
      quote('draft', '2026-01-02T00:00:00Z', 'not-an-array'),
      quote('draft', '2026-01-03T00:00:00Z', { description: 'x', unit_price: 1 }),
    ]);
    expect(entries).toHaveLength(0);
  });

  it('skips items with missing descriptions or non-positive prices', () => {
    const entries = buildRateBook([
      quote('draft', '2026-01-01T00:00:00Z', [
        { description: '', quantity: 1, unit_price: 100 },
        { description: 'Valid item', quantity: 1, unit_price: 0 },
        { description: 'Valid item', quantity: 1, unit_price: -5 },
        { description: 'Valid item', quantity: 1, unit_price: 80 },
        { quantity: 1, unit_price: 50 },
        null,
      ]),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].times_quoted).toBe(1);
    expect(entries[0].suggested_rate).toBe(80);
  });

  it('handles unparseable created_at without crashing', () => {
    const entries = buildRateBook([
      quote('draft', 'not-a-date', [
        { description: 'Kerbing', quantity: 1, unit_price: 40 },
      ]),
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0].last_rate).toBe(40);
  });
});

describe('Rate book: search', () => {
  const entries = buildRateBook([
    quote('draft', '2026-01-01T00:00:00Z', [
      { description: 'Trench excavation', quantity: 1, unit_price: 100 },
      { description: 'Deep trench shoring', quantity: 1, unit_price: 200 },
      { description: 'Kerbing', quantity: 1, unit_price: 40 },
    ]),
  ]);

  it('returns all entries for an empty query', () => {
    expect(searchRateBook(entries, '')).toHaveLength(3);
    expect(searchRateBook(entries, '   ')).toHaveLength(3);
  });

  it('ranks prefix matches before substring matches', () => {
    const results = searchRateBook(entries, 'trench');
    expect(results.map(e => e.description)).toEqual(['Trench excavation', 'Deep trench shoring']);
  });

  it('matches case-insensitively', () => {
    expect(searchRateBook(entries, 'KERB')).toHaveLength(1);
  });

  it('returns nothing when no entry matches', () => {
    expect(searchRateBook(entries, 'piling')).toHaveLength(0);
  });
});
