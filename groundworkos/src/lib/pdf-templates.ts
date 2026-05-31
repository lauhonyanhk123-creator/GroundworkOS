import type { QuoteWithClient, InvoiceWithDetails, LineItem } from '@/types';

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function buildQuoteHTML(quote: QuoteWithClient): string {
  const items = (quote.line_items ?? []) as LineItem[];
  const statusLabel = quote.status.charAt(0).toUpperCase() + quote.status.slice(1);
  const rowsHtml = items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td class="right">${item.quantity}</td>
      <td class="right">£${item.unit_price.toFixed(2)}</td>
      <td class="right">£${(item.quantity * item.unit_price).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Quote ${quote.quote_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company-name { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${quote.status === 'accepted' ? '#d1fae5' : quote.status === 'rejected' ? '#fee2e2' : '#fef9c3'}; color: ${quote.status === 'accepted' ? '#065f46' : quote.status === 'rejected' ? '#991b1b' : '#713f12'}; }
    .quote-number { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; margin-top: 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .address { line-height: 1.6; color: #333; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    .right { text-align: right; }
    .totals { max-width: 260px; margin-left: auto; margin-top: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-total { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #111; font-size: 18px; font-weight: 800; }
    .notes-box { margin-top: 16px; padding: 16px; background: #f9fafb; border-radius: 4px; line-height: 1.6; }
    @media print { body { padding: 32px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">GroundworkOS</div>
    </div>
    <div style="text-align:right">
      <div class="quote-number">${quote.quote_number}</div>
      <span class="badge">${statusLabel}</span>
    </div>
  </div>

  <div class="grid">
    <div>
      <h2>Prepared For</h2>
      <div class="address">
        <strong>${quote.client?.company_name ?? '—'}</strong><br/>
        ${quote.client?.contact_name ? `${quote.client.contact_name}<br/>` : ''}
        ${quote.client?.email ? `${quote.client.email}` : ''}
      </div>
    </div>
    <div>
      <h2>Quote Details</h2>
      <div class="address">
        <strong>Created:</strong> ${formatDate(quote.created_at)}<br/>
        ${quote.sent_at ? `<strong>Sent:</strong> ${formatDate(quote.sent_at)}<br/>` : ''}
        ${quote.accepted_at ? `<strong>Accepted:</strong> ${formatDate(quote.accepted_at)}<br/>` : ''}
      </div>
    </div>
  </div>

  <h2 style="margin-top:0">Quote Items</h2>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="right" style="text-align:right">Qty</th>
        <th class="right" style="text-align:right">Unit Price</th>
        <th class="right" style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span style="color:#666">Subtotal</span><span>£${(quote.subtotal ?? 0).toFixed(2)}</span></div>
    <div class="totals-row"><span style="color:#666">VAT (20%)</span><span>£${(quote.vat_amount ?? 0).toFixed(2)}</span></div>
    <div class="totals-total"><span>Total</span><span>£${(quote.total_amount ?? 0).toFixed(2)}</span></div>
  </div>

  ${quote.notes ? `<h2 style="margin-top:32px">Notes</h2><div class="notes-box">${quote.notes}</div>` : ''}
</body>
</html>`;
}

export function buildInvoiceHTML(invoice: InvoiceWithDetails): string {
  const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 48px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .company-name { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background: ${invoice.status === 'paid' ? '#d1fae5' : invoice.status === 'overdue' ? '#fee2e2' : '#fef9c3'}; color: ${invoice.status === 'paid' ? '#065f46' : invoice.status === 'overdue' ? '#991b1b' : '#713f12'}; }
    .invoice-number { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; margin-top: 32px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .address { line-height: 1.6; color: #333; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; padding: 8px 12px; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    .right { text-align: right; }
    .totals { max-width: 260px; margin-left: auto; margin-top: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
    .totals-total { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #111; font-size: 18px; font-weight: 800; }
    .paid-note { margin-top: 24px; padding: 12px 16px; background: #d1fae5; color: #065f46; border-radius: 4px; font-weight: 600; }
    .notes-box { margin-top: 32px; padding: 16px; background: #f9fafb; border-radius: 4px; line-height: 1.6; }
    @media print { body { padding: 32px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">GroundworkOS</div>
    </div>
    <div style="text-align:right">
      <div class="invoice-number">${invoice.invoice_number}</div>
      <span class="badge">${statusLabel}</span>
    </div>
  </div>

  <div class="grid">
    <div>
      <h2>Billed To</h2>
      <div class="address">
        <strong>${invoice.client?.company_name ?? '—'}</strong><br/>
        ${invoice.client?.contact_name ? `${invoice.client.contact_name}<br/>` : ''}
        ${invoice.client?.email ? `${invoice.client.email}<br/>` : ''}
        ${invoice.client?.address ? `${invoice.client.address.replace(/\n/g, '<br/>')}` : ''}
      </div>
    </div>
    <div>
      <h2>Invoice Details</h2>
      <div class="address">
        <strong>Issued:</strong> ${formatDate(invoice.created_at)}<br/>
        <strong>Due:</strong> ${invoice.due_date ? formatDate(invoice.due_date) : '—'}<br/>
        ${invoice.job ? `<strong>Job:</strong> ${invoice.job.job_number} — ${invoice.job.title}<br/>` : ''}
        ${invoice.paid_at ? `<strong>Paid:</strong> ${formatDate(invoice.paid_at)}<br/>` : ''}
      </div>
    </div>
  </div>

  <hr class="divider"/>

  <div class="totals">
    <div class="totals-row"><span style="color:#666">Subtotal</span><span>£${(invoice.subtotal ?? 0).toFixed(2)}</span></div>
    <div class="totals-row"><span style="color:#666">VAT (20%)</span><span>£${(invoice.vat_amount ?? 0).toFixed(2)}</span></div>
    <div class="totals-total"><span>Total</span><span>£${(invoice.total_amount ?? 0).toFixed(2)}</span></div>
  </div>

  ${invoice.status === 'paid' ? `<div class="paid-note">Payment received — thank you.</div>` : ''}
  ${invoice.notes ? `<h2 style="margin-top:32px">Notes</h2><div class="notes-box">${invoice.notes}</div>` : ''}
</body>
</html>`;
}
