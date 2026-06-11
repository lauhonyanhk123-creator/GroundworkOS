'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { callTool } from '@/lib/call-tool';
import type { LineItem } from '@/types';
import {
  buildRateBook,
  searchRateBook,
  type RateBookEntry,
} from 'groundworkos-mcp/servers/quotes-mcp/rate-book';

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
  const [rateBook, setRateBook] = useState<RateBookEntry[]>([]);
  const [suggestForId, setSuggestForId] = useState<string | null>(null);
  const supabase = useRef(createClient());

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase.current
        .from('clients').select('id, company_name').order('company_name');
      setClients(data ?? []);
    }
    async function loadRateBook() {
      // Rate suggestions are an enhancement — if history fails to load the
      // form still works, so log and carry on rather than surfacing an error.
      try {
        const { data, error } = await supabase.current
          .from('quotes')
          .select('status, created_at, line_items')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (error) throw error;
        setRateBook(buildRateBook(data ?? []));
      } catch (err) {
        console.error('[NewQuote] Failed to load rate book:', err);
      }
    }
    loadClients();
    loadRateBook();
  }, []);

  function applySuggestion(id: string, entry: RateBookEntry) {
    setLineItems(prev => prev.map(item =>
      item._id === id
        ? { ...item, description: entry.description, unit_price: entry.suggested_rate }
        : item
    ));
    setSuggestForId(null);
  }

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
      const items = lineItems.filter(i => i.description.trim()).map(item => ({
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const inserted = await callTool<{ id: string }>('create_quote', {
        client_id: clientId || undefined,
        title: title.trim(),
        line_items: items,
        notes: notes || undefined,
      });

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
              {lineItems.map((item) => {
                const suggestions = suggestForId === item._id
                  ? searchRateBook(rateBook, item.description).slice(0, 3)
                  : [];
                return (
                <div key={item._id} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-6 relative">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item._id, 'description', e.target.value)}
                      onFocus={() => setSuggestForId(item._id)}
                      onBlur={() => setSuggestForId(null)}
                      placeholder="Item description..."
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface-2 border border-border rounded shadow-lg overflow-hidden">
                        <div className="px-3 py-1 text-[10px] font-mono text-muted uppercase tracking-wider border-b border-border">
                          Rate Book
                        </div>
                        {suggestions.map((entry) => (
                          <button
                            key={entry.description}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); applySuggestion(item._id, entry); }}
                            className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-surface-3 transition-colors"
                          >
                            <span className="truncate">{entry.description}</span>
                            <span className="flex items-baseline gap-2 whitespace-nowrap">
                              <span className="text-[10px] font-mono text-muted">
                                {entry.win_rate !== null
                                  ? `${Math.round(entry.win_rate * 100)}% won`
                                  : `${entry.times_quoted}× quoted`}
                              </span>
                              <span className="font-mono text-yellow">{formatCurrency(entry.suggested_rate)}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
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
                );
              })}
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
