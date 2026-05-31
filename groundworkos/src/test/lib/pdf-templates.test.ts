import { describe, it, expect } from 'vitest';
import { buildQuoteHTML, buildInvoiceHTML } from '@/lib/pdf-templates';
import { mockQuote, mockInvoice, mockClient, mockJob } from '../factories';
import type { QuoteWithClient, InvoiceWithDetails } from '@/types';

const quote: QuoteWithClient = {
  ...mockQuote(),
  client: mockClient(),
};

const quoteNoClient: QuoteWithClient = {
  ...mockQuote({ id: 'q-null-client', client_id: null }),
  client: undefined,
};

const invoice: InvoiceWithDetails = {
  ...mockInvoice(),
  client: mockClient(),
  job: mockJob(),
};

describe('buildQuoteHTML', () => {
  it('returns valid HTML with DOCTYPE', () => {
    const html = buildQuoteHTML(quote);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
  });

  it('includes the quote number', () => {
    const html = buildQuoteHTML(quote);
    expect(html).toContain('QT-0001');
  });

  it('includes the client company name', () => {
    const html = buildQuoteHTML(quote);
    expect(html).toContain('Acme Construction Ltd');
  });

  it('includes line item descriptions', () => {
    const html = buildQuoteHTML(quote);
    expect(html).toContain('Excavation works');
    expect(html).toContain('Drainage pipe supply and fit');
  });

  it('includes subtotal and VAT total', () => {
    const html = buildQuoteHTML(quote);
    expect(html).toContain('13000.00');
    expect(html).toContain('2600.00');
    expect(html).toContain('15600.00');
  });

  it('does NOT contain window.print() — server safe', () => {
    const html = buildQuoteHTML(quote);
    expect(html).not.toContain('window.print');
  });

  it('handles null client gracefully — shows em dash', () => {
    const html = buildQuoteHTML(quoteNoClient);
    expect(html).toContain('—');
    expect(html).not.toContain('undefined');
  });

  it('includes notes when present', () => {
    const html = buildQuoteHTML(quote);
    expect(html).toContain('Valid for 30 days');
  });
});

describe('buildInvoiceHTML', () => {
  it('returns valid HTML with DOCTYPE', () => {
    const html = buildInvoiceHTML(invoice);
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('includes the invoice number', () => {
    const html = buildInvoiceHTML(invoice);
    expect(html).toContain('INV-0001');
  });

  it('includes the billed-to client name', () => {
    const html = buildInvoiceHTML(invoice);
    expect(html).toContain('Acme Construction Ltd');
  });

  it('includes totals', () => {
    const html = buildInvoiceHTML(invoice);
    expect(html).toContain('13000.00');
    expect(html).toContain('15600.00');
  });

  it('includes job reference when present', () => {
    const html = buildInvoiceHTML(invoice);
    expect(html).toContain('GW-0001');
  });

  it('does NOT contain window.print() — server safe', () => {
    const html = buildInvoiceHTML(invoice);
    expect(html).not.toContain('window.print');
  });

  it('shows paid note when status is paid', () => {
    const paidInvoice: InvoiceWithDetails = {
      ...invoice,
      status: 'paid',
      paid_at: '2025-06-01T00:00:00Z',
    };
    const html = buildInvoiceHTML(paidInvoice);
    expect(html).toContain('Payment received');
  });

  it('handles null client gracefully', () => {
    const noClientInvoice: InvoiceWithDetails = {
      ...mockInvoice(),
      client: undefined,
      job: undefined,
    };
    const html = buildInvoiceHTML(noClientInvoice);
    expect(html).toContain('—');
    expect(html).not.toContain('undefined');
  });
});
