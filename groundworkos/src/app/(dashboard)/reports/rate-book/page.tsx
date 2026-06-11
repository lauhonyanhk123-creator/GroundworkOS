'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import {
  buildRateBook,
  searchRateBook,
  type RateBookEntry,
} from 'groundworkos-mcp/servers/quotes-mcp/rate-book';

export default function RateBookPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [entries, setEntries] = useState<RateBookEntry[]>([]);
  const [quotesAnalysed, setQuotesAnalysed] = useState(0);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  async function loadRateBook() {
    try {
      const { data, error: quotesError } = await supabase.current
        .from('quotes')
        .select('status, created_at, line_items')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (quotesError) throw quotesError;
      setQuotesAnalysed((data ?? []).length);
      setEntries(buildRateBook(data ?? []));
    } catch (err) {
      console.error('[RateBook]', err);
      setError('Failed to load the rate book. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadRateBook(); }, []);

  const visibleEntries = searchRateBook(entries, search);
  const totalWon = entries.reduce((sum, e) => sum + e.times_won, 0);
  const totalDecided = entries.reduce((sum, e) => sum + e.times_won + e.times_lost, 0);
  const overallWinRate = totalDecided > 0 ? totalWon / totalDecided : null;

  function winRateColour(winRate: number | null): string {
    if (winRate === null) return 'text-muted';
    if (winRate >= 0.6) return 'text-success';
    if (winRate >= 0.3) return 'text-warning';
    return 'text-danger';
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <button
            onClick={() => { setError(null); setIsLoading(true); loadRateBook(); }}
            className="text-sm text-muted hover:text-text underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/reports')}>
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <div>
          <h1 className="text-2xl font-condensed font-bold">Rate Book</h1>
          <p className="text-muted text-sm mt-1">
            Pricing intelligence built from every quote you have ever priced
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded" />)
        ) : (
          <>
            <StatCard label="Work Items Tracked" value={entries.length} barPercent={70} />
            <StatCard label="Quotes Analysed" value={quotesAnalysed} barPercent={50} />
            <StatCard
              label="Overall Win Rate"
              value={overallWinRate !== null ? `${Math.round(overallWinRate * 100)}%` : '—'}
              barPercent={overallWinRate !== null ? Math.round(overallWinRate * 100) : 0}
            />
          </>
        )}
      </div>

      <Panel title="Historical Rates">
        {isLoading ? (
          <Skeleton className="h-64 rounded" />
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-8 h-8 text-muted mx-auto mb-3" />
            <p className="text-sm text-muted mb-1">No rate history yet.</p>
            <p className="text-sm text-muted mb-4">
              The rate book builds itself as you price quotes — every line item becomes part of your pricing intelligence.
            </p>
            <Link
              href="/quotes/new"
              className="inline-block px-4 py-2 text-sm font-mono border border-border text-muted hover:text-text hover:border-yellow transition-colors"
            >
              Create a Quote
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search work items..."
              className="w-full md:w-80 bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
            />
            {visibleEntries.length === 0 ? (
              <p className="text-sm text-muted py-4">No work items match your search.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-mono text-muted uppercase tracking-wider border-b border-border">
                      <th className="text-left py-2 px-3">Work Item</th>
                      <th className="text-right py-2 px-3">Quoted</th>
                      <th className="text-right py-2 px-3">Won</th>
                      <th className="text-right py-2 px-3">Win Rate</th>
                      <th className="text-right py-2 px-3">Min</th>
                      <th className="text-right py-2 px-3">Suggested</th>
                      <th className="text-right py-2 px-3">Max</th>
                      <th className="text-right py-2 px-3">Last Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEntries.map((entry) => (
                      <tr
                        key={entry.description}
                        className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                      >
                        <td className="py-2 px-3 text-sm">{entry.description}</td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-muted">{entry.times_quoted}</td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-muted">{entry.times_won}</td>
                        <td className={cn('py-2 px-3 text-right font-mono text-sm', winRateColour(entry.win_rate))}>
                          {entry.win_rate !== null ? `${Math.round(entry.win_rate * 100)}%` : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-muted">{formatCurrency(entry.min_rate)}</td>
                        <td className="py-2 px-3 text-right font-mono text-sm font-medium text-yellow">{formatCurrency(entry.suggested_rate)}</td>
                        <td className="py-2 px-3 text-right font-mono text-sm text-muted">{formatCurrency(entry.max_rate)}</td>
                        <td className="py-2 px-3 text-right text-sm text-muted">{formatDate(entry.last_used)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
