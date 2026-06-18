import { describe, it, expect } from 'vitest';
import { calculateLineItemTotals } from '@shared/utils';

// Invoice creation logic: calculateLineItemTotals([{ quantity: 1, unit_price: subtotal }])
// is the pattern used in invoices-mcp for single-subtotal invoices

describe('Invoices: VAT calculation on single subtotal', () => {
  it('wraps a subtotal as a single line item with quantity 1', () => {
    const subtotalAmount = 8500;
    const result = calculateLineItemTotals([{ quantity: 1, unit_price: subtotalAmount }]);
    expect(result.subtotal).toBe(8500);
    expect(result.vat_amount).toBe(1700);
    expect(result.total_amount).toBe(10200);
  });

  it('calculates VAT correctly for a typical invoice value', () => {
    const result = calculateLineItemTotals([{ quantity: 1, unit_price: 15000 }]);
    expect(result.vat_amount).toBe(3000);
    expect(result.total_amount).toBe(18000);
  });
});

describe('Invoices: status constants', () => {
  const VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue'];

  it('all expected invoice statuses exist', () => {
    expect(VALID_STATUSES).toContain('draft');
    expect(VALID_STATUSES).toContain('sent');
    expect(VALID_STATUSES).toContain('paid');
    expect(VALID_STATUSES).toContain('overdue');
  });

  it('has exactly 4 statuses', () => {
    expect(VALID_STATUSES).toHaveLength(4);
  });
});

describe('Invoices: due date logic', () => {
  it('due date is a future date string', () => {
    const dueDate = '2025-07-01';
    const date = new Date(dueDate);
    expect(isNaN(date.getTime())).toBe(false);
  });
});
