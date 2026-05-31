import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

const { mockXeroClient } = vi.hoisted(() => ({
  mockXeroClient: {
    getAuthUrl: vi.fn(),
    exchangeCodeForTokens: vi.fn(),
    refreshTokens: vi.fn(),
    syncInvoice: vi.fn(),
  },
}));

vi.mock('@/lib/xero', () => ({ xeroClient: mockXeroClient }));

import { GET as connectGET } from '@/app/api/xero/connect/route';
import { GET as callbackGET } from '@/app/api/xero/callback/route';
import { POST as syncPOST } from '@/app/api/xero/sync/route';
import { createClient } from '@/lib/supabase/server';

function makeAuthSupabase(user: { id: string } | null = { id: 'u-1' }) {
  const single = vi.fn().mockResolvedValue({ data: { company_id: 'co-1' }, error: null });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from,
  };
}

beforeEach(() => vi.clearAllMocks());

// ─── /api/xero/connect ────────────────────────────────────────────────────────

describe('GET /api/xero/connect', () => {
  it('redirects to Xero auth URL when authenticated', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAuthSupabase());
    mockXeroClient.getAuthUrl.mockReturnValue('https://login.xero.com/auth?client_id=x&state=abc');

    const res = await connectGET();

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('login.xero.com');
  });

  it('sets xero_oauth_state cookie on redirect', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAuthSupabase());
    mockXeroClient.getAuthUrl.mockReturnValue('https://login.xero.com/auth?state=teststate');

    const res = await connectGET();

    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('xero_oauth_state');
  });

  it('redirects to login when unauthenticated', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAuthSupabase(null));

    const res = await connectGET();

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });
});

// ─── /api/xero/callback ───────────────────────────────────────────────────────

function makeCallbackRequest(params: Record<string, string>, cookieState?: string) {
  const url = new URL('http://localhost/api/xero/callback');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const headers: HeadersInit = {};
  if (cookieState) headers['cookie'] = `xero_oauth_state=${cookieState}`;
  return new NextRequest(url.toString(), { headers });
}

describe('GET /api/xero/callback', () => {
  it('redirects to /settings?xero=connected on success', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } } }) },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { company_id: 'co-1' }, error: null }),
          }),
        }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
    });
    mockXeroClient.exchangeCodeForTokens.mockResolvedValue({
      access_token: 'at',
      refresh_token: 'rt',
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      tenant_id: 'tenant-1',
      tenant_name: 'Test Org',
    });

    const req = makeCallbackRequest({ code: 'auth-code', state: 'mystate' }, 'mystate');
    const res = await callbackGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('xero=connected');
  });

  it('redirects to error when state does not match cookie', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAuthSupabase());

    const req = makeCallbackRequest({ code: 'auth-code', state: 'wrong-state' }, 'correct-state');
    const res = await callbackGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('xero=error');
  });

  it('redirects to error when state cookie is missing', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAuthSupabase());

    const req = makeCallbackRequest({ code: 'auth-code', state: 'mystate' });
    const res = await callbackGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('xero=error');
  });

  it('redirects to login when unauthenticated', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAuthSupabase(null));

    const req = makeCallbackRequest({ code: 'auth-code', state: 'mystate' }, 'mystate');
    const res = await callbackGET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });
});

// ─── /api/xero/sync ───────────────────────────────────────────────────────────

function makeSyncRequest(body: unknown) {
  return new NextRequest('http://localhost/api/xero/sync', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeSupabaseWithInvoice() {
  const futureExpiry = new Date(Date.now() + 3600000).toISOString();
  const xeroConn = {
    access_token: 'at',
    refresh_token: 'rt',
    expires_at: futureExpiry,
    tenant_id: 'tenant-1',
    tenant_name: 'Test Org',
    company_id: 'co-1',
  };
  const invoice = {
    id: 'inv-1',
    invoice_number: 'INV-0001',
    subtotal: 1000,
    vat_amount: 200,
    total_amount: 1200,
    due_date: '2025-07-01',
    notes: null,
    company_id: 'co-1',
    clients: { company_name: 'Acme Ltd', email: 'acme@test.com' },
  };

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1' } } }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'invoices') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: invoice, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'xero_connections') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: xeroConn, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
    }),
  };
}

describe('POST /api/xero/sync', () => {
  it('returns 401 when unauthenticated', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAuthSupabase(null));
    const res = await syncPOST(makeSyncRequest({ invoice_id: 'inv-1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when invoice_id is missing', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeAuthSupabase());
    const res = await syncPOST(makeSyncRequest({}));
    expect(res.status).toBe(400);
  });

  it('syncs invoice to Xero and returns xero_invoice_id', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabaseWithInvoice());
    mockXeroClient.syncInvoice.mockResolvedValue('xero-inv-abc123');

    const res = await syncPOST(makeSyncRequest({ invoice_id: 'inv-1' }));
    const body = await res.json() as { data: { xero_invoice_id: string }; error: null };

    expect(res.status).toBe(200);
    expect(body.data.xero_invoice_id).toBe('xero-inv-abc123');
  });

  it('calls syncInvoice with correct tenant_id and invoice data', async () => {
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeSupabaseWithInvoice());
    mockXeroClient.syncInvoice.mockResolvedValue('xero-inv-abc123');

    await syncPOST(makeSyncRequest({ invoice_id: 'inv-1' }));

    expect(mockXeroClient.syncInvoice).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: 'tenant-1' }),
      'tenant-1',
      expect.objectContaining({ invoice_number: 'INV-0001', total_amount: 1200 })
    );
  });
});
