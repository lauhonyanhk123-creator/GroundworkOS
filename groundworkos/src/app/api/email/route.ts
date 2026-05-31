import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildQuoteHTML, buildInvoiceHTML, formatDate as formatDateLong } from '@/lib/pdf-templates';
import type { LineItem, QuoteWithClient, InvoiceWithDetails } from '@/types';
import puppeteer from 'puppeteer';

if (!process.env.SENDGRID_API_KEY) {
  console.error('[Email] SENDGRID_API_KEY is not set');
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@groundworkos.com';
const FROM_NAME = 'GroundworkOS';

function formatGBP(amount: number | null): string {
  return `£${(amount ?? 0).toFixed(2)}`;
}


function emailWrapper(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
        <tr>
          <td style="background:#0c0c0c;padding:24px 32px;">
            <span style="font-size:22px;font-weight:800;color:#FFD600;letter-spacing:-0.5px;">GroundworkOS</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;background:#f4f4f5;border-top:1px solid #e5e7eb;">
            <p style="margin:0;font-size:12px;color:#666;">This email was sent by GroundworkOS on behalf of your contractor. Please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function generatePDFBuffer(html: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    return await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });
  } finally {
    await browser.close();
  }
}

async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
  attachment?: { content: string; filename: string }
): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error('SENDGRID_API_KEY is not configured.');

  const payload: Record<string, unknown> = {
    personalizations: [{ to: [{ email: to }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [{ type: 'text/html', value: html }],
  };

  if (attachment) {
    payload.attachments = [{
      content: attachment.content,
      filename: attachment.filename,
      type: 'application/pdf',
      disposition: 'attachment',
    }];
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`SendGrid error ${res.status}: ${body}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const body = await request.json() as { type?: string; id?: string };
    const { type, id } = body;

    if (!type || !id || (type !== 'invoice' && type !== 'quote')) {
      return NextResponse.json({ error: 'Invalid request. Provide type (invoice|quote) and id.' }, { status: 400 });
    }

    if (type === 'invoice') {
      const { data: invoice, error: fetchError } = await supabase
        .from('invoices')
        .select('*, client:clients(company_name, contact_name, email), job:jobs(title)')
        .eq('id', id)
        .single();

      if (fetchError || !invoice) {
        return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
      }

      const clientEmail = (invoice.client as { email?: string } | null)?.email;
      if (!clientEmail) {
        return NextResponse.json({ error: 'Client has no email address on file.' }, { status: 400 });
      }

      const client = invoice.client as { company_name: string; contact_name?: string } | null;
      const job = invoice.job as { title: string } | null;

      const subject = `Invoice ${invoice.invoice_number} — Payment Due ${formatDateLong(invoice.due_date)}`;

      const bodyHtml = `
        <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0c0c0c;">Invoice ${invoice.invoice_number}</h2>
        <p style="margin:0 0 24px;color:#666;font-size:13px;">Please find your invoice details below.</p>

        ${client ? `<p style="margin:0 0 4px;font-weight:700;font-size:16px;">${client.company_name}</p>` : ''}
        ${client?.contact_name ? `<p style="margin:0 0 16px;color:#666;">${client.contact_name}</p>` : ''}
        ${job ? `<p style="margin:0 0 24px;color:#666;font-size:13px;">Job: ${job.title}</p>` : ''}

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 16px;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;letter-spacing:0.5px;">Description</td>
            <td style="padding:10px 16px;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;text-align:right;">Amount</td>
          </tr>
          <tr><td style="padding:12px 16px;border-top:1px solid #e5e7eb;">Subtotal</td><td style="padding:12px 16px;border-top:1px solid #e5e7eb;text-align:right;font-family:monospace;">${formatGBP(invoice.subtotal)}</td></tr>
          <tr><td style="padding:12px 16px;border-top:1px solid #e5e7eb;">VAT (20%)</td><td style="padding:12px 16px;border-top:1px solid #e5e7eb;text-align:right;font-family:monospace;">${formatGBP(invoice.vat_amount)}</td></tr>
          <tr style="background:#0c0c0c;color:#fff;">
            <td style="padding:14px 16px;font-weight:800;font-size:16px;">Total Due</td>
            <td style="padding:14px 16px;text-align:right;font-weight:800;font-size:16px;font-family:monospace;color:#FFD600;">${formatGBP(invoice.total_amount)}</td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding:8px 0;color:#666;font-size:13px;">Due Date</td>
            <td style="padding:8px 0;text-align:right;font-weight:700;">${formatDateLong(invoice.due_date)}</td>
          </tr>
          ${invoice.status === 'paid' ? `<tr><td style="padding:8px 0;color:#666;font-size:13px;">Status</td><td style="padding:8px 0;text-align:right;"><span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">PAID</span></td></tr>` : ''}
        </table>

        ${invoice.notes ? `<div style="background:#f9fafb;border-left:4px solid #e5e7eb;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#444;">${invoice.notes}</div>` : ''}

        <p style="margin:0;font-size:13px;color:#666;">If you have any questions about this invoice, please contact us directly.</p>
      `;

      let attachment: { content: string; filename: string } | undefined;
      try {
        const pdfHtml = buildInvoiceHTML(invoice as InvoiceWithDetails);
        const pdfBuffer = await generatePDFBuffer(pdfHtml);
        attachment = {
          content: Buffer.from(pdfBuffer).toString('base64'),
          filename: `invoice-${invoice.invoice_number}.pdf`,
        };
      } catch (pdfErr) {
        console.error('[Email] PDF generation failed, sending without attachment:', pdfErr);
      }

      await sendViaSendGrid(clientEmail, subject, emailWrapper(subject, bodyHtml), attachment);
      return NextResponse.json({ success: true, pdf_attached: !!attachment });
    }

    // Quote
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*, client:clients(company_name, contact_name, email)')
      .eq('id', id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
    }

    const clientEmail = (quote.client as { email?: string } | null)?.email;
    if (!clientEmail) {
      return NextResponse.json({ error: 'Client has no email address on file.' }, { status: 400 });
    }

    const client = quote.client as { company_name: string; contact_name?: string } | null;
    const lineItems = (quote.line_items ?? []) as LineItem[];

    const subject = `Quote ${quote.quote_number} from GroundworkOS`;

    const lineItemRows = lineItems.map(item => `
      <tr>
        <td style="padding:10px 16px;border-top:1px solid #e5e7eb;">${item.description}</td>
        <td style="padding:10px 16px;border-top:1px solid #e5e7eb;text-align:right;font-family:monospace;">${item.quantity}</td>
        <td style="padding:10px 16px;border-top:1px solid #e5e7eb;text-align:right;font-family:monospace;">${formatGBP(item.unit_price)}</td>
        <td style="padding:10px 16px;border-top:1px solid #e5e7eb;text-align:right;font-family:monospace;">${formatGBP(item.quantity * item.unit_price)}</td>
      </tr>
    `).join('');

    const bodyHtml = `
      <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0c0c0c;">Quote ${quote.quote_number}</h2>
      ${quote.title ? `<p style="margin:0 0 24px;font-size:16px;color:#444;">${quote.title}</p>` : '<p style="margin:0 0 24px;"></p>'}

      ${client ? `<p style="margin:0 0 4px;font-weight:700;font-size:16px;">Prepared for: ${client.company_name}</p>` : ''}
      ${client?.contact_name ? `<p style="margin:0 0 24px;color:#666;">${client.contact_name}</p>` : '<div style="margin-bottom:24px;"></div>'}

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 16px;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;">Description</td>
          <td style="padding:10px 16px;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;text-align:right;">Qty</td>
          <td style="padding:10px 16px;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;text-align:right;">Unit Price</td>
          <td style="padding:10px 16px;font-size:12px;font-weight:700;text-transform:uppercase;color:#666;text-align:right;">Total</td>
        </tr>
        ${lineItemRows}
        <tr><td colspan="3" style="padding:12px 16px;border-top:1px solid #e5e7eb;color:#666;">Subtotal</td><td style="padding:12px 16px;border-top:1px solid #e5e7eb;text-align:right;font-family:monospace;">${formatGBP(quote.subtotal)}</td></tr>
        <tr><td colspan="3" style="padding:12px 16px;border-top:1px solid #e5e7eb;color:#666;">VAT (20%)</td><td style="padding:12px 16px;border-top:1px solid #e5e7eb;text-align:right;font-family:monospace;">${formatGBP(quote.vat_amount)}</td></tr>
        <tr style="background:#0c0c0c;color:#fff;">
          <td colspan="3" style="padding:14px 16px;font-weight:800;font-size:16px;">Total</td>
          <td style="padding:14px 16px;text-align:right;font-weight:800;font-size:16px;font-family:monospace;color:#FFD600;">${formatGBP(quote.total_amount)}</td>
        </tr>
      </table>

      ${quote.notes ? `<div style="background:#f9fafb;border-left:4px solid #e5e7eb;padding:12px 16px;margin-bottom:24px;font-size:13px;color:#444;">${quote.notes}</div>` : ''}

      <p style="margin:0;font-size:13px;color:#666;">Please review this quote and get in touch if you have any questions or would like to proceed.</p>
    `;

    let attachment: { content: string; filename: string } | undefined;
    try {
      const pdfHtml = buildQuoteHTML(quote as QuoteWithClient);
      const pdfBuffer = await generatePDFBuffer(pdfHtml);
      attachment = {
        content: Buffer.from(pdfBuffer).toString('base64'),
        filename: `quote-${quote.quote_number}.pdf`,
      };
    } catch (pdfErr) {
      console.error('[Email] PDF generation failed, sending without attachment:', pdfErr);
    }

    await sendViaSendGrid(clientEmail, subject, emailWrapper(subject, bodyHtml), attachment);
    return NextResponse.json({ success: true, pdf_attached: !!attachment });

  } catch (err) {
    console.error('[Email] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send email. Please try again.' },
      { status: 500 }
    );
  }
}
