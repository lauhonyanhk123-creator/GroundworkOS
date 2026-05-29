'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

export default function NewQuotePage() {
  const router = useRouter();
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0 },
  ]);
  const [notes, setNotes] = useState('');

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0 },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const vatAmount = subtotal * 0.2;
  const total = subtotal + vatAmount;

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  const handleSubmit = () => {
    console.log('Creating quote:', { clientId, title, lineItems, notes });
    router.push('/quotes');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/quotes')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">Create New Quote</h1>
            <p className="text-muted text-sm mt-1">Build a quote with line items</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => router.push('/quotes')}>Cancel</Button>
          <Button onClick={handleSubmit}>Create Quote</Button>
        </div>
      </div>

      {/* Quote Details */}
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
                  <option value="1">Barrett Homes</option>
                  <option value="2">Weston Homes</option>
                  <option value="3">Bloor Homes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Quote Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Site Preparation - Newbury"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
            </div>
          </Panel>

          <Panel 
            title="Line Items" 
            actions={
              <Button variant="ghost" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            }
          >
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-12 gap-3 text-xs font-mono text-muted uppercase tracking-wider px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1"></div>
              </div>

              {/* Line Items */}
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-6">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Item description..."
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                      min="1"
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item.id, 'unit_price', Number(e.target.value))}
                      min="0"
                      step="0.01"
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-center font-mono text-sm">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      onClick={() => removeLineItem(item.id)}
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

        {/* Summary */}
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
