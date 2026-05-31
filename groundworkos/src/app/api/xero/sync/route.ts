import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { xeroClient } from '@/lib/xero';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== 'object' || !('invoice_id' in body) || typeof (body as { invoice_id: unknown }).invoice_id !== 'string') {
      return NextResponse.json({ data: null, error: 'invoice_id is required.' }, { status: 400 });
    }

    const { invoice_id } = body as { invoice_id: string };

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ data: null, error: 'Unauthorised.' }, { status: 401 });
    }

    // Fetch invoice with client details
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select('*, clients:client_id(company_name, email), company_id')
      .eq('id', invoice_id)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ data: null, error: 'Invoice not found.' }, { status: 404 });
    }

    // Fetch Xero connection for this company
    const { data: xeroConn, error: connError } = await supabase
      .from('xero_connections')
      .select('*')
      .eq('company_id', invoice.company_id)
      .single();

    if (connError || !xeroConn) {
      return NextResponse.json({ data: null, error: 'No Xero connection found for this company.' }, { status: 404 });
    }

    // Refresh tokens if expired
    let tokens = {
      access_token: xeroConn.access_token as string,
      refresh_token: xeroConn.refresh_token as string,
      expires_at: xeroConn.expires_at as string,
      tenant_id: xeroConn.tenant_id as string,
      tenant_name: xeroConn.tenant_name as string | null,
    };

    const expiresAt = new Date(tokens.expires_at);
    if (expiresAt.getTime() < Date.now() + 60_000) {
      try {
        tokens = await xeroClient.refreshTokens(tokens.refresh_token);
        await supabase.from('xero_connections').update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
        }).eq('company_id', invoice.company_id);
      } catch (refreshErr) {
        console.error('[Xero Sync] Token refresh failed:', refreshErr);
        return NextResponse.json({ data: null, error: 'Xero token refresh failed. Please reconnect Xero.' }, { status: 401 });
      }
    }

    const clientData = invoice.clients as { company_name: string; email: string | null } | null;

    // Sync to Xero
    const xeroInvoiceId = await xeroClient.syncInvoice(tokens, tokens.tenant_id, {
      invoice_number: invoice.invoice_number as string,
      client_name: clientData?.company_name ?? 'Unknown Client',
      client_email: clientData?.email ?? null,
      subtotal: invoice.subtotal as number,
      vat_amount: invoice.vat_amount as number,
      total_amount: invoice.total_amount as number,
      due_date: invoice.due_date as string | null,
      notes: invoice.notes as string | null,
    });

    // Update invoice with xero_invoice_id
    await supabase
      .from('invoices')
      .update({ xero_invoice_id: xeroInvoiceId })
      .eq('id', invoice_id);

    return NextResponse.json({ data: { xero_invoice_id: xeroInvoiceId }, error: null });
  } catch (err) {
    console.error('[Xero Sync]', err);
    return NextResponse.json({ data: null, error: 'Failed to sync invoice to Xero. Please try again.' }, { status: 500 });
  }
}
