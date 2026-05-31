import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockXeroNodeInstance } = vi.hoisted(() => {
  const instance = {
    buildConsentUrl: vi.fn().mockReturnValue('https://login.xero.com/identity/connect/authorize?client_id=test'),
    apiCallback: vi.fn(),
    updateTenants: vi.fn(),
    tenants: [{ tenantId: 'tenant-123', tenantName: 'Test Groundworks Ltd' }] as { tenantId: string; tenantName: string }[],
    refreshWithRefreshToken: vi.fn(),
    readTokenSet: vi.fn(),
    setTokenSet: vi.fn(),
    accountingApi: {
      createInvoices: vi.fn(),
    },
  };
  return { mockXeroNodeInstance: instance };
});

vi.mock('xero-node', () => ({
  XeroClient: function XeroClientMock() { return mockXeroNodeInstance; },
  Invoice: {
    TypeEnum: { ACCREC: 'ACCREC' },
    StatusEnum: { AUTHORISED: 'AUTHORISED' },
  },
  Invoices: {},
}));

import { XeroClient, type InvoiceData, type XeroTokens } from '@/lib/xero';

const mockTokens: XeroTokens = {
  access_token: 'access-token-123',
  refresh_token: 'refresh-token-456',
  expires_at: new Date(Date.now() + 3600000).toISOString(),
  tenant_id: 'tenant-123',
  tenant_name: 'Test Groundworks Ltd',
};

const mockInvoice: InvoiceData = {
  invoice_number: 'INV-0001',
  client_name: 'Acme Construction',
  client_email: 'accounts@acme.com',
  subtotal: 1000,
  vat_amount: 200,
  total_amount: 1200,
  due_date: '2025-07-01',
  notes: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockXeroNodeInstance.buildConsentUrl.mockReturnValue(
    'https://login.xero.com/identity/connect/authorize?client_id=test'
  );
  mockXeroNodeInstance.tenants = [{ tenantId: 'tenant-123', tenantName: 'Test Groundworks Ltd' }];
});

describe('XeroClient.getAuthUrl', () => {
  it('returns a URL string', () => {
    const client = new XeroClient();
    const url = client.getAuthUrl('mystate');
    expect(typeof url).toBe('string');
  });

  it('appends the state param to the URL', () => {
    const client = new XeroClient();
    const url = client.getAuthUrl('csrf-state-token');
    expect(url).toContain('state=csrf-state-token');
  });

  it('URL-encodes the state param', () => {
    const client = new XeroClient();
    const url = client.getAuthUrl('state with spaces');
    expect(url).toContain('state=state%20with%20spaces');
  });

  it('calls buildConsentUrl on the xero-node client', () => {
    const client = new XeroClient();
    client.getAuthUrl('somestate');
    expect(mockXeroNodeInstance.buildConsentUrl).toHaveBeenCalledOnce();
  });
});

describe('XeroClient.exchangeCodeForTokens', () => {
  it('returns XeroTokens shape', async () => {
    mockXeroNodeInstance.apiCallback.mockResolvedValue({
      access_token: 'at-new',
      refresh_token: 'rt-new',
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    });

    const client = new XeroClient();
    const result = await client.exchangeCodeForTokens('https://callback.url?code=abc&state=xyz');

    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('refresh_token');
    expect(result).toHaveProperty('expires_at');
    expect(result).toHaveProperty('tenant_id', 'tenant-123');
    expect(result).toHaveProperty('tenant_name', 'Test Groundworks Ltd');
  });

  it('calls apiCallback with the full callback URL', async () => {
    mockXeroNodeInstance.apiCallback.mockResolvedValue({
      access_token: 'at',
      refresh_token: 'rt',
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    });

    const client = new XeroClient();
    const callbackUrl = 'https://app.example.com/api/xero/callback?code=auth123&state=state456';
    await client.exchangeCodeForTokens(callbackUrl);

    expect(mockXeroNodeInstance.apiCallback).toHaveBeenCalledWith(callbackUrl);
  });

  it('throws when no tenant is found', async () => {
    mockXeroNodeInstance.apiCallback.mockResolvedValue({ access_token: 'at', refresh_token: 'rt' });
    mockXeroNodeInstance.tenants = [];

    const client = new XeroClient();
    await expect(client.exchangeCodeForTokens('https://callback?code=x')).rejects.toThrow('No Xero tenant');
  });
});

describe('XeroClient.refreshTokens', () => {
  it('calls refreshWithRefreshToken with the refresh token', async () => {
    mockXeroNodeInstance.readTokenSet.mockReturnValue({
      access_token: 'new-at',
      refresh_token: 'new-rt',
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    });

    const client = new XeroClient();
    await client.refreshTokens('old-refresh-token');

    expect(mockXeroNodeInstance.refreshWithRefreshToken).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'old-refresh-token'
    );
  });

  it('returns updated tokens', async () => {
    mockXeroNodeInstance.readTokenSet.mockReturnValue({
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 1800,
    });

    const client = new XeroClient();
    const result = await client.refreshTokens('old-rt');

    expect(result.access_token).toBe('new-access-token');
    expect(result.refresh_token).toBe('new-refresh-token');
  });
});

describe('XeroClient.syncInvoice', () => {
  it('calls createInvoices on the Xero accounting API', async () => {
    mockXeroNodeInstance.accountingApi.createInvoices.mockResolvedValue({
      body: { invoices: [{ invoiceID: 'xero-id-001' }] },
    });

    const client = new XeroClient();
    await client.syncInvoice(mockTokens, 'tenant-123', mockInvoice);

    expect(mockXeroNodeInstance.accountingApi.createInvoices).toHaveBeenCalledOnce();
  });

  it('returns the Xero invoiceID', async () => {
    mockXeroNodeInstance.accountingApi.createInvoices.mockResolvedValue({
      body: { invoices: [{ invoiceID: 'xero-id-abc' }] },
    });

    const client = new XeroClient();
    const result = await client.syncInvoice(mockTokens, 'tenant-123', mockInvoice);

    expect(result).toBe('xero-id-abc');
  });

  it('sets the token set before calling the API', async () => {
    mockXeroNodeInstance.accountingApi.createInvoices.mockResolvedValue({
      body: { invoices: [{ invoiceID: 'xero-id-xyz' }] },
    });

    const client = new XeroClient();
    await client.syncInvoice(mockTokens, 'tenant-123', mockInvoice);

    expect(mockXeroNodeInstance.setTokenSet).toHaveBeenCalledWith(
      expect.objectContaining({ access_token: 'access-token-123' })
    );
  });

  it('throws when Xero does not return an invoiceID', async () => {
    mockXeroNodeInstance.accountingApi.createInvoices.mockResolvedValue({
      body: { invoices: [{}] },
    });

    const client = new XeroClient();
    await expect(client.syncInvoice(mockTokens, 'tenant-123', mockInvoice)).rejects.toThrow('invoice ID');
  });
});
