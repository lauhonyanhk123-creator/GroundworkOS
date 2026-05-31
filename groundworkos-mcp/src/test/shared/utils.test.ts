import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase db module before importing utils
vi.mock('@shared/db', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { calculateLineItemTotals, generateJobNumber, generateQuoteNumber, generateInvoiceNumber, formatCurrency } from '@shared/utils';
import { supabase } from '@shared/db';

describe('calculateLineItemTotals', () => {
  it('returns zeros for empty line items', () => {
    const result = calculateLineItemTotals([]);
    expect(result.subtotal).toBe(0);
    expect(result.vat_amount).toBe(0);
    expect(result.total_amount).toBe(0);
  });

  it('calculates subtotal correctly', () => {
    const result = calculateLineItemTotals([
      { quantity: 2, unit_price: 100 },
    ]);
    expect(result.subtotal).toBe(200);
  });

  it('calculates 20% VAT', () => {
    const result = calculateLineItemTotals([
      { quantity: 1, unit_price: 1000 },
    ]);
    expect(result.vat_amount).toBe(200);
  });

  it('calculates total as subtotal + VAT', () => {
    const result = calculateLineItemTotals([
      { quantity: 1, unit_price: 1000 },
    ]);
    expect(result.total_amount).toBe(1200);
  });

  it('handles multiple line items', () => {
    const result = calculateLineItemTotals([
      { quantity: 2, unit_price: 500 },
      { quantity: 1, unit_price: 300 },
    ]);
    expect(result.subtotal).toBe(1300);
    expect(result.vat_amount).toBe(260);
    expect(result.total_amount).toBe(1560);
  });

  it('rounds to 2 decimal places', () => {
    const result = calculateLineItemTotals([
      { quantity: 1, unit_price: 333.33 },
    ]);
    expect(result.subtotal).toBe(333.33);
    expect(result.vat_amount).toBe(66.67);
    expect(result.total_amount).toBe(400.00);
  });
});

describe('formatCurrency', () => {
  it('formats a number as GBP', () => {
    expect(formatCurrency(1000)).toBe('£1,000.00');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('£0.00');
  });

  it('formats pence', () => {
    expect(formatCurrency(9.99)).toBe('£9.99');
  });
});

describe('generateJobNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns GW-0001 when no jobs exist', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
    const result = await generateJobNumber();
    expect(result).toBe('GW-0001');
  });

  it('increments from the last job number', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ job_number: 'GW-0005' }],
            error: null,
          }),
        }),
      }),
    });
    const result = await generateJobNumber();
    expect(result).toBe('GW-0006');
  });

  it('pads the number to 4 digits', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ job_number: 'GW-0099' }],
            error: null,
          }),
        }),
      }),
    });
    const result = await generateJobNumber();
    expect(result).toBe('GW-0100');
  });
});

describe('generateQuoteNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns QT-0001 when no quotes exist', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
    const result = await generateQuoteNumber();
    expect(result).toBe('QT-0001');
  });

  it('increments from the last quote number', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ quote_number: 'QT-0010' }],
            error: null,
          }),
        }),
      }),
    });
    const result = await generateQuoteNumber();
    expect(result).toBe('QT-0011');
  });
});

describe('generateInvoiceNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns INV-0001 when no invoices exist', async () => {
    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });
    const result = await generateInvoiceNumber();
    expect(result).toBe('INV-0001');
  });
});
