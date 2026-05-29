import { supabase } from './db';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

export async function generateJobNumber(): Promise<string> {
  const { data, error } = await supabase
    .from('jobs')
    .select('job_number')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  let lastNumber = 0;
  if (data && data.length > 0) {
    const match = data[0].job_number.match(/^GW-(\d+)$/);
    if (match) {
      lastNumber = parseInt(match[1], 10);
    }
  }

  return `GW-${String(lastNumber + 1).padStart(4, '0')}`;
}

export async function generateQuoteNumber(): Promise<string> {
  const { data, error } = await supabase
    .from('quotes')
    .select('quote_number')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  let lastNumber = 0;
  if (data && data.length > 0) {
    const match = data[0].quote_number.match(/^QT-(\d+)$/);
    if (match) {
      lastNumber = parseInt(match[1], 10);
    }
  }

  return `QT-${String(lastNumber + 1).padStart(4, '0')}`;
}

export async function generateInvoiceNumber(): Promise<string> {
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;

  let lastNumber = 0;
  if (data && data.length > 0) {
    const match = data[0].invoice_number.match(/^INV-(\d+)$/);
    if (match) {
      lastNumber = parseInt(match[1], 10);
    }
  }

  return `INV-${String(lastNumber + 1).padStart(4, '0')}`;
}

export function calculateLineItemTotals(lineItems: { quantity: number; unit_price: number }[]): {
  subtotal: number;
  vat_amount: number;
  total_amount: number;
} {
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.quantity * item.unit_price);
  }, 0);

  const vat_amount = subtotal * 0.2;
  const total_amount = subtotal + vat_amount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vat_amount: Math.round(vat_amount * 100) / 100,
    total_amount: Math.round(total_amount * 100) / 100,
  };
}
