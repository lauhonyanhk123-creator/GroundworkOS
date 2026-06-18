import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildQuoteHTML, buildInvoiceHTML } from '@/lib/pdf-templates';
import type { QuoteWithClient, InvoiceWithDetails } from '@/types';
import puppeteer from 'puppeteer';

async function generatePDF(html: string): Promise<Uint8Array> {
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const body = await request.json() as { type?: string; id?: string };
    const { type, id } = body;

    if (!type || !id || (type !== 'quote' && type !== 'invoice')) {
      return NextResponse.json({ error: 'Invalid request. Provide type (quote|invoice) and id.' }, { status: 400 });
    }

    if (type === 'quote') {
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('*, client:clients(id, company_name, contact_name, email, address, phone)')
        .eq('id', id)
        .single();

      if (fetchError || !quote) {
        return NextResponse.json({ error: 'Quote not found.' }, { status: 404 });
      }

      const html = buildQuoteHTML(quote as QuoteWithClient);
      const pdf = await generatePDF(html);
      const filename = `quote-${(quote as QuoteWithClient).quote_number}.pdf`;

      return new NextResponse(pdf.buffer as ArrayBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, client:clients(id, company_name, contact_name, email, address, phone), job:jobs(id, job_number, title)')
      .eq('id', id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }

    const html = buildInvoiceHTML(invoice as InvoiceWithDetails);
    const pdf = await generatePDF(html);
    const filename = `invoice-${(invoice as InvoiceWithDetails).invoice_number}.pdf`;

    return new NextResponse(pdf.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (err) {
    console.error('[PDF] Error generating PDF:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate PDF. Please try again.' },
      { status: 500 }
    );
  }
}
