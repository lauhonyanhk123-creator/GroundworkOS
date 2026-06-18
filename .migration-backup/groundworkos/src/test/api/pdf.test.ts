import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock puppeteer
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(),
  },
}));

// Mock PDF templates
vi.mock('@/lib/pdf-templates', () => ({
  buildQuoteHTML: vi.fn().mockReturnValue('<html><body>Quote HTML</body></html>'),
  buildInvoiceHTML: vi.fn().mockReturnValue('<html><body>Invoice HTML</body></html>'),
}));

import { POST } from '@/app/api/pdf/route';
import { createClient } from '@/lib/supabase/server';
import puppeteer from 'puppeteer';

const MOCK_PDF = new Uint8Array([37, 80, 68, 70]); // %PDF

function makeMockSupabase({
  user = { id: 'user-1' },
  data = null as unknown,
  error = null as null | { message: string },
} = {}) {
  const single = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  };
}

function makeMockPuppeteer() {
  const pdf = vi.fn().mockResolvedValue(MOCK_PDF);
  const setContent = vi.fn().mockResolvedValue(undefined);
  const newPage = vi.fn().mockResolvedValue({ setContent, pdf });
  const close = vi.fn().mockResolvedValue(undefined);
  (puppeteer.launch as ReturnType<typeof vi.fn>).mockResolvedValue({ newPage, close });
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/pdf', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  makeMockPuppeteer();
});

describe('POST /api/pdf', () => {
  it('returns 401 when unauthenticated', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({ user: null as unknown as { id: string } })
    );
    const res = await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing type', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({ user: { id: 'u-1' } })
    );
    const res = await POST(makeRequest({ id: 'q-1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid type', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({ user: { id: 'u-1' } })
    );
    const res = await POST(makeRequest({ type: 'unknown', id: 'q-1' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when quote not found', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({ user: { id: 'u-1' }, data: null, error: { message: 'Not found' } })
    );
    const res = await POST(makeRequest({ type: 'quote', id: 'missing' }));
    expect(res.status).toBe(404);
  });

  it('returns PDF binary for valid quote', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({
        user: { id: 'u-1' },
        data: { id: 'q-1', quote_number: 'QT-0001', status: 'draft', line_items: [], subtotal: 0, vat_amount: 0, total_amount: 0, created_at: '2025-01-01T00:00:00Z', company_id: 'c-1', client_id: null, job_id: null, title: null, sent_at: null, accepted_at: null, notes: null, client: null },
      })
    );
    const res = await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });

  it('returns correct Content-Disposition for quote', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({
        user: { id: 'u-1' },
        data: { id: 'q-1', quote_number: 'QT-0042', status: 'draft', line_items: [], subtotal: 0, vat_amount: 0, total_amount: 0, created_at: '2025-01-01T00:00:00Z', company_id: 'c-1', client_id: null, job_id: null, title: null, sent_at: null, accepted_at: null, notes: null, client: null },
      })
    );
    const res = await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    expect(res.headers.get('Content-Disposition')).toContain('QT-0042');
  });

  it('returns PDF binary for valid invoice', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeMockSupabase({
        user: { id: 'u-1' },
        data: { id: 'inv-1', invoice_number: 'INV-0001', status: 'sent', subtotal: 0, vat_amount: 0, total_amount: 0, created_at: '2025-01-01T00:00:00Z', company_id: 'c-1', client_id: null, job_id: null, quote_id: null, due_date: null, paid_at: null, notes: null, client: null, job: null },
      })
    );
    const res = await POST(makeRequest({ type: 'invoice', id: 'inv-1' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
  });
});
