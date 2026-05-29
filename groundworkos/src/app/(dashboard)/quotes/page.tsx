'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Quote } from '@/types';

type QuoteRow = Quote & { client: { company_name: string } | null };

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'sent', label: 'Sent' },
  { id: 'accepted', label: 'Accepted' },
];

export default function QuotesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.current
          .from('quotes')
          .select('*, client:clients(company_name)')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setQuotes((data ?? []) as QuoteRow[]);
      } catch (err) {
        console.error('[Quotes]', err);
        setError('Failed to load quotes. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredQuotes = quotes.filter(q => {
    const matchesTab = activeTab === 'all' || q.status === activeTab;
    const clientName = q.client?.company_name ?? '';
    const matchesSearch = searchQuery === '' ||
      (q.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.quote_number.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const acceptedCount = quotes.filter(q => q.status === 'accepted').length;
  const acceptedRate = quotes.length > 0 ? Math.round((acceptedCount / quotes.length) * 100) : 0;
  const totalValue = filteredQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Quotes</h1>
          <p className="text-muted text-sm mt-1">Create and manage your quotes</p>
        </div>
        <Link href="/quotes/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel className="!p-4">
          <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Total Quotes</div>
          <div className="text-3xl font-condensed font-bold">{quotes.length}</div>
        </Panel>
        <Panel className="!p-4">
          <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Total Value</div>
          <div className="text-3xl font-condensed font-bold">{formatCurrency(totalValue)}</div>
        </Panel>
        <Panel className="!p-4">
          <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Accepted Rate</div>
          <div className="text-3xl font-condensed font-bold">{acceptedRate}%</div>
        </Panel>
      </div>

      <div className="flex items-center gap-2 bg-surface border border-border rounded p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded text-sm font-medium transition-colors',
              activeTab === tab.id ? 'bg-yellow text-black' : 'text-muted hover:text-text'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search quotes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-border rounded pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-yellow"
        />
      </div>

      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded" />)}
          </div>
        ) : filteredQuotes.length > 0 ? (
          <div className="space-y-3">
            {filteredQuotes.map(quote => (
              <Link key={quote.id} href={`/quotes/${quote.id}`} className="block">
                <div className="flex items-center gap-4 p-4 bg-surface-2 rounded hover:bg-surface-3 transition-colors">
                  <div className="font-mono text-sm text-muted w-20">{quote.quote_number}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{quote.title ?? '—'}</div>
                    <div className="text-xs text-muted">{quote.client?.company_name ?? '—'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-medium">{formatCurrency(quote.total_amount)}</div>
                    <div className="text-xs text-muted">{formatDate(quote.created_at)}</div>
                  </div>
                  <Badge status={quote.status} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>No quotes found</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
