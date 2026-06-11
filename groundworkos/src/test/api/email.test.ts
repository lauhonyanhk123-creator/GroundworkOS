import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('puppeteer', () => ({
  default: { launch: vi.fn() },
}));

vi.mock('@/lib/pdf-templates', () => ({
  buildQuoteHTML: vi.fn().mockReturnValue('<html>Quote</html>'),
  buildInvoiceHTML: vi.fn().mockReturnValue('<html>Invoice</html>'),
  formatDate: vi.fn().mockReturnValue('01 January 2025'),
}));

import { POST } from '@/app/api/email/route';
import { createClient } from '@/lib/supabase/server';
import puppeteer from 'puppeteer';

const MOCK_PDF = new Uint8Array([37, 80, 68, 70]);

function makePuppeteerMock() {
  const pdf = vi.fn().mockResolvedValue(MOCK_PDF);
  const setContent = vi.fn().mockResolvedValue(undefined);
  const newPage = vi.fn().mockResolvedValue({ setContent, pdf });
  const close = vi.fn().mockResolvedValue(undefined);
  (puppeteer.launch as ReturnType<typeof vi.fn>).mockResolvedValue({ newPage, close });
}

function makeSupabaseMock(data: unknown, error: unknown = null) {
  // resolveActiveCompany awaits .select().eq() directly, so the builder must
  // be thenable as well as chainable; record fetches end in .single().
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'user_companies') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => unknown) =>
          resolve({ data: [{ company_id: 'c-1', role: 'admin' }], error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error }),
    };
  });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } } }) },
    from,
  };
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/email', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  makePuppeteerMock();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue('') }));
});

const mockQuoteData = {
  id: 'q-1',
  quote_number: 'QT-0001',
  status: 'sent',
  line_items: [{ description: 'Excavation', quantity: 1, unit_price: 5000 }],
  subtotal: 5000,
  vat_amount: 1000,
  total_amount: 6000,
  notes: null,
  title: 'Test Quote',
  created_at: '2025-01-01T00:00:00Z',
  company_id: 'c-1',
  client_id: 'client-1',
  job_id: null,
  sent_at: null,
  accepted_at: null,
  client: { company_name: 'Acme Ltd', contact_name: 'John', email: 'john@acme.co.uk' },
};

const mockInvoiceData = {
  id: 'inv-1',
  invoice_number: 'INV-0001',
  status: 'sent',
  subtotal: 5000,
  vat_amount: 1000,
  total_amount: 6000,
  due_date: '2025-07-01',
  paid_at: null,
  notes: null,
  created_at: '2025-01-01T00:00:00Z',
  company_id: 'c-1',
  client_id: 'client-1',
  job_id: null,
  quote_id: null,
  client: { company_name: 'Acme Ltd', contact_name: 'John', email: 'john@acme.co.uk' },
  job: { title: 'Drainage works' },
};

describe('POST /api/email', () => {
  it('returns 401 when unauthenticated', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const res = await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid type', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(null)
    );
    const res = await POST(makeRequest({ type: 'bad', id: 'q-1' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when client has no email', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock({
        ...mockQuoteData,
        client: { company_name: 'Acme', contact_name: null, email: null },
      })
    );
    const res = await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    expect(res.status).toBe(400);
  });

  it('calls SendGrid API when sending a quote', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(mockQuoteData)
    );
    await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const sendgridCall = fetchCalls.find((c: string[]) => c[0].includes('sendgrid'));
    expect(sendgridCall).toBeDefined();
  });

  it('quote email contains PDF attachment', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(mockQuoteData)
    );
    await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const sendgridCall = fetchCalls.find((c: string[]) => c[0].includes('sendgrid'));
    const body = JSON.parse(sendgridCall![1].body);
    expect(body.attachments).toBeDefined();
    expect(body.attachments[0].type).toBe('application/pdf');
  });

  it('sends email without attachment if Puppeteer fails, pdf_attached=false', async () => {
    (puppeteer.launch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Puppeteer unavailable'));
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(mockQuoteData)
    );
    const res = await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.pdf_attached).toBe(false);
  });

  it('calls SendGrid when sending an invoice', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(mockInvoiceData)
    );
    await POST(makeRequest({ type: 'invoice', id: 'inv-1' }));
    const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const sendgridCall = fetchCalls.find((c: string[]) => c[0].includes('sendgrid'));
    expect(sendgridCall).toBeDefined();
  });

  it('returns success:true on successful send', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeSupabaseMock(mockQuoteData)
    );
    const res = await POST(makeRequest({ type: 'quote', id: 'q-1' }));
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
