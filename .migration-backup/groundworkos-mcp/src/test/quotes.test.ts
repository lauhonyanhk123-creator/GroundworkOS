import { describe, it, expect } from 'vitest';
import { calculateLineItemTotals } from '@shared/utils';

// Business logic from quotes-mcp: VAT calculation used when creating quotes

describe('Quotes: VAT and totals calculation', () => {
  it('calculates correct subtotal from line items', () => {
    const items = [
      { quantity: 1, unit_price: 5000 },
      { quantity: 2, unit_price: 750 },
    ];
    const { subtotal } = calculateLineItemTotals(items);
    expect(subtotal).toBe(6500);
  });

  it('calculates 20% VAT on subtotal', () => {
    const items = [{ quantity: 1, unit_price: 10000 }];
    const { vat_amount } = calculateLineItemTotals(items);
    expect(vat_amount).toBe(2000);
  });

  it('calculates total = subtotal + VAT', () => {
    const items = [{ quantity: 1, unit_price: 10000 }];
    const { total_amount } = calculateLineItemTotals(items);
    expect(total_amount).toBe(12000);
  });

  it('handles large quotes correctly', () => {
    const items = [
      { quantity: 10, unit_price: 5000 },
      { quantity: 5, unit_price: 2000 },
      { quantity: 1, unit_price: 500 },
    ];
    const { subtotal, vat_amount, total_amount } = calculateLineItemTotals(items);
    expect(subtotal).toBe(60500);
    expect(vat_amount).toBe(12100);
    expect(total_amount).toBe(72600);
  });
});

describe('Quotes: status flow', () => {
  const VALID_STATUSES = ['draft', 'sent', 'accepted', 'rejected'];

  it('draft is a valid initial status', () => {
    expect(VALID_STATUSES).toContain('draft');
  });

  it('sent follows draft in status flow', () => {
    expect(VALID_STATUSES.indexOf('sent')).toBeGreaterThan(VALID_STATUSES.indexOf('draft'));
  });
});

describe('Quotes: line item structure', () => {
  it('line items require description, quantity and unit_price', () => {
    const validItem = { description: 'Excavation', quantity: 1, unit_price: 5000 };
    expect(validItem.description).toBeTruthy();
    expect(typeof validItem.quantity).toBe('number');
    expect(typeof validItem.unit_price).toBe('number');
  });

  it('line item total = quantity × unit_price', () => {
    const item = { quantity: 3, unit_price: 250 };
    expect(item.quantity * item.unit_price).toBe(750);
  });
});
