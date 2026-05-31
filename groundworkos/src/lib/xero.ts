import { XeroClient as XeroNodeClient, Invoice as XeroInvoice, Invoices } from 'xero-node';

export interface XeroTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO timestamp
  tenant_id: string;
  tenant_name: string | null;
}

export interface InvoiceData {
  invoice_number: string;
  client_name: string;
  client_email: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  due_date: string | null;
  notes: string | null;
}

function buildXeroClient(): XeroNodeClient {
  return new XeroNodeClient({
    clientId: process.env.XERO_CLIENT_ID ?? '',
    clientSecret: process.env.XERO_CLIENT_SECRET ?? '',
    redirectUris: [process.env.XERO_REDIRECT_URI ?? ''],
    scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'offline_access'],
  });
}

export class XeroClient {
  getAuthUrl(state: string): string {
    const client = buildXeroClient();
    const url = client.buildConsentUrl();
    // Append state param for CSRF protection
    return `${url}&state=${encodeURIComponent(state)}`;
  }

  async exchangeCodeForTokens(callbackUrl: string): Promise<XeroTokens> {
    const client = buildXeroClient();
    // apiCallback receives the full redirect URI including code query param
    const tokenSet = await client.apiCallback(callbackUrl);

    await client.updateTenants();
    const tenant = client.tenants[0];
    if (!tenant) throw new Error('No Xero tenant found after authorisation.');

    const expiresAt = tokenSet.expires_at
      ? new Date(tokenSet.expires_at * 1000).toISOString()
      : new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return {
      access_token: tokenSet.access_token ?? '',
      refresh_token: tokenSet.refresh_token ?? '',
      expires_at: expiresAt,
      tenant_id: tenant.tenantId,
      tenant_name: tenant.tenantName ?? null,
    };
  }

  async refreshTokens(refreshToken: string): Promise<XeroTokens> {
    const client = buildXeroClient();
    await client.refreshWithRefreshToken(
      process.env.XERO_CLIENT_ID ?? '',
      process.env.XERO_CLIENT_SECRET ?? '',
      refreshToken
    );
    const tokenSet = client.readTokenSet();

    await client.updateTenants();
    const tenant = client.tenants[0];
    if (!tenant) throw new Error('No Xero tenant found after token refresh.');

    const expiresAt = tokenSet.expires_at
      ? new Date(tokenSet.expires_at * 1000).toISOString()
      : new Date(Date.now() + 30 * 60 * 1000).toISOString();

    return {
      access_token: tokenSet.access_token ?? '',
      refresh_token: tokenSet.refresh_token ?? '',
      expires_at: expiresAt,
      tenant_id: tenant.tenantId,
      tenant_name: tenant.tenantName ?? null,
    };
  }

  async syncInvoice(tokens: XeroTokens, tenantId: string, invoice: InvoiceData): Promise<string> {
    const client = buildXeroClient();
    client.setTokenSet({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Math.floor(new Date(tokens.expires_at).getTime() / 1000),
      token_type: 'Bearer',
    });

    const today = new Date().toISOString().split('T')[0];

    const xeroInvoice: XeroInvoice = {
      type: XeroInvoice.TypeEnum.ACCREC,
      contact: {
        name: invoice.client_name,
        emailAddress: invoice.client_email ?? undefined,
      },
      lineItems: [
        {
          description: `Invoice ${invoice.invoice_number}`,
          quantity: 1.0,
          unitAmount: invoice.subtotal,
          taxType: 'OUTPUT2',
          accountCode: '200',
        },
      ],
      date: today,
      dueDate: invoice.due_date ?? undefined,
      invoiceNumber: invoice.invoice_number,
      reference: invoice.invoice_number,
      status: XeroInvoice.StatusEnum.AUTHORISED,
    };

    const invoicesBody: Invoices = { invoices: [xeroInvoice] };
    const { body } = await client.accountingApi.createInvoices(tenantId, invoicesBody);

    const created = body?.invoices?.[0];
    if (!created?.invoiceID) throw new Error('Xero did not return an invoice ID.');

    return created.invoiceID;
  }
}

export const xeroClient = new XeroClient();
