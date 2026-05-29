'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { LineItem } from '@/types';

interface FormLineItem extends LineItem {
  _id: string;
}

export default function NewQuotePage() {
  const router = useRouter();
  const [clients, setClients] = useState<{ id: string; company_name: string }[]>([]);
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    { _id: '1', description: '', quantity: 1, unit_price: 0 },
  ]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase.current
        .from('clients').select('id, company_name').order('company_name');
      setClients(data ?? []);
    }
    loadClients();
  }, []);

  function addLineItem() {
    setLineItems(prev => [
      ...prev,
      { _id: Date.now().toString(), description: '', quantity: 1, unit_price: 0 },
    ]);
  }

  function removeLineItem(id: string) {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter(item => item._id !== id));
    }
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map(item =>
      item._id === id ? { ...item, [field]: value } : item
    ));
  }

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const vatAmount = subtotal * 0.2;
  const total = subtotal + vatAmount;

  async function handleSubmit() {
    if (!title.trim()) { setFormError('Quote title is required.'); return; }
    if (lineItems.every(item => !item.description.trim())) {
      setFormError('At least one line item with a description is required.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const { data: { user } } = await supabase.current.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: uc } = await supabase.current
        .from('user_companies').select('company_id').eq('user_id', user.id).single();
      if (!uc?.company_id) throw new Error('No company found');

      const { data: quoteNumber } = await supabase.current.rpc('generate_quote_number');

      const items = lineItems.filter(i => i.description.trim()).map(({ _id, ...rest }) => ({
        description: rest.description,
        quantity: rest.quantity,
        unit_price: rest.unit_price,
        total: rest.quantity * rest.unit_price,
      }));

      const { data: inserted, error: insertError } = await supabase.current
        .from('quotes')
        .insert({
          company_id: uc.company_id,
          quote_number: quoteNumber,
          client_id: clientId || null,
          title: title.trim(),
          line_items: items,
          subtotal,
          vat_amount: vatAmount,
          total_amount: total,
          status: 'draft',
          notes: notes || null,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      router.push(`/quotes/${inserted.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/quotes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">Create New Quote</h1>
            <p className="text-muted text-sm mt-1">Build a quote with line items</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => router.push('/quotes')}>Cancel</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={submitting}>Create Quote</Button>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded bg-danger/10 border border-danger text-danger text-sm">{formError}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Quote Details">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Quote Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Site Preparation – Newbury"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
            </div>
          </Panel>

          <Panel
            title="Line Items"
            actions={
              <Button variant="ghost" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-1" />Add Item
              </Button>
            }
          >
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 text-xs font-mono text-muted uppercase tracking-wider px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1" />
              </div>
              {lineItems.map((item) => (
                <div key={item._id} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item._id, 'description', e.target.value)}
                      placeholder="Item description..."
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item._id, 'quantity', Number(e.target.value))}
                      min="1"
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item._id, 'unit_price', Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center font-mono text-sm py-2">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeLineItem(item._id)}
                      className="p-2 text-muted hover:text-danger transition-colors"
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or terms..."
              rows={4}
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
            />
          </Panel>
        </div>

        <div>
          <Panel title="Quote Summary">
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-mono">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">VAT (20%)</span>
                <span className="font-mono">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-condensed font-bold text-yellow">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
