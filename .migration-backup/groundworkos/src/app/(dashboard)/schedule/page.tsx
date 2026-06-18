'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { ScheduleEntry } from '@/types';

type ScheduleEntryWithJob = ScheduleEntry & {
  job: {
    job_number: string;
    title: string;
    client: { company_name: string } | null;
  } | null;
};

interface NewEntryForm {
  job_id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  crew_count: string;
  plant_assigned: string;
  notes: string;
}

const EMPTY_FORM: NewEntryForm = {
  job_id: '', title: '', start_datetime: '', end_datetime: '', crew_count: '', plant_assigned: '', notes: '',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SchedulePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntryWithJob[]>([]);
  const [jobs, setJobs] = useState<{ id: string; job_number: string; title: string }[]>([]);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [form, setForm] = useState<NewEntryForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  // ─── Date helpers ────────────────────────────────────────────────────────────

  function getWeekBounds(date: Date): { start: Date; end: Date } {
    const monday = new Date(date);
    const day = monday.getDay();
    monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    return { start: monday, end: friday };
  }

  function getMonthBounds(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  function getWeekDays(date: Date): Date[] {
    const { start } = getWeekBounds(date);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  function getMonthDays(date: Date): (Date | null)[] {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: (Date | null)[] = [];
    // Pad to Monday start (Sun=0 → pad 6, Mon=1 → pad 0, etc.)
    const paddingBefore = firstDay === 0 ? 6 : firstDay - 1;
    for (let i = 0; i < paddingBefore; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) result.push(new Date(year, month, d));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }

  function formatDateStr(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function formatTime(datetime: string): string {
    return datetime.split('T')[1]?.substring(0, 5) ?? '';
  }

  function isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  function getEntriesForDay(date: Date): ScheduleEntryWithJob[] {
    const dateStr = formatDateStr(date);
    return scheduleEntries.filter(e => e.start_datetime.startsWith(dateStr));
  }

  // ─── Data loading ─────────────────────────────────────────────────────────

  async function loadSchedule(date: Date, viewMode: 'week' | 'month') {
    setIsLoading(true);
    try {
      const { start, end } = viewMode === 'week' ? getWeekBounds(date) : getMonthBounds(date);
      const { data, error: fetchError } = await supabase.current
        .from('schedule_entries')
        .select('*, job:jobs(job_number, title, client:clients(company_name))')
        .gte('start_datetime', start.toISOString())
        .lte('start_datetime', end.toISOString())
        .order('start_datetime');
      if (fetchError) throw fetchError;
      setScheduleEntries((data ?? []) as ScheduleEntryWithJob[]);
    } catch (err) {
      console.error('[Schedule]', err);
      setError('Failed to load schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function loadJobs() {
      const { data } = await supabase.current
        .from('jobs')
        .select('id, job_number, title')
        .in('status', ['enquiry', 'quoted', 'active', 'on-hold'])
        .order('job_number');
      setJobs(data ?? []);
    }
    loadJobs();
  }, []);

  useEffect(() => {
    loadSchedule(currentDate, view);
  }, [currentDate, view]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function handleCreateEntry() {
    if (!form.title.trim()) { setFormError('Title is required.'); return; }
    if (!form.start_datetime) { setFormError('Start time is required.'); return; }
    if (!form.end_datetime) { setFormError('End time is required.'); return; }
    setSubmitting(true);
    setFormError(null);
    try {
      const { data: { user } } = await supabase.current.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data: uc } = await supabase.current
        .from('user_companies').select('company_id').eq('user_id', user.id).single();
      if (!uc?.company_id) throw new Error('No company found');

      const { error: insertError } = await supabase.current.from('schedule_entries').insert({
        company_id: uc.company_id,
        job_id: form.job_id || null,
        title: form.title.trim(),
        start_datetime: form.start_datetime,
        end_datetime: form.end_datetime,
        crew_count: form.crew_count ? parseInt(form.crew_count, 10) : 1,
        plant_assigned: form.plant_assigned || null,
        notes: form.notes || null,
      });
      if (insertError) throw insertError;
      setShowNewEntryModal(false);
      setForm(EMPTY_FORM);
      await loadSchedule(currentDate, view);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function navigate(direction: 'prev' | 'next') {
    const newDate = new Date(currentDate);
    if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  }

  // ─── Computed ─────────────────────────────────────────────────────────────

  const weekDays = getWeekDays(currentDate);
  const { start: weekStart, end: weekEnd } = getWeekBounds(currentDate);
  const monthDays = view === 'month' ? getMonthDays(currentDate) : [];

  const headerLabel = view === 'week'
    ? `${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} – ${weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : currentDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-danger mb-2">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => { setError(null); loadSchedule(currentDate, view); }}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Schedule</h1>
          <p className="text-muted text-sm mt-1">Manage your weekly schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0 bg-surface border border-border rounded overflow-hidden">
            <button
              onClick={() => setView('week')}
              className={cn('px-3 py-2 text-sm font-medium transition-colors', view === 'week' ? 'bg-yellow text-black' : 'text-muted hover:text-text')}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={cn('px-3 py-2 text-sm font-medium transition-colors', view === 'month' ? 'bg-yellow text-black' : 'text-muted hover:text-text')}
            >
              Month
            </button>
          </div>
          <Button onClick={() => setShowNewEntryModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <Panel>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <div className="text-lg font-condensed font-bold">{headerLabel}</div>
          </div>
          <Button variant="ghost" onClick={() => navigate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Panel>

      {/* ── Week View ── */}
      {view === 'week' && (
        <Panel>
          {isLoading ? (
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-96 rounded" />)}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {weekDays.map((date) => {
                const dateStr = formatDateStr(date);
                const entries = getEntriesForDay(date);
                const todayClass = isToday(date);
                return (
                  <div key={dateStr} className="space-y-3">
                    <div className={cn('text-center p-3 rounded', todayClass ? 'bg-yellow text-black' : 'bg-surface-2')}>
                      <div className="text-xs font-mono uppercase tracking-wider">
                        {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                      </div>
                      <div className="text-2xl font-condensed font-bold">{date.getDate()}</div>
                    </div>
                    <div className="space-y-2">
                      {entries.length > 0 ? (
                        entries.map((entry) => (
                          <div key={entry.id} className="p-3 bg-surface-2 rounded border-l-2 border-yellow">
                            <div className="text-xs font-mono text-muted mb-1">
                              {formatTime(entry.start_datetime)} – {formatTime(entry.end_datetime)}
                            </div>
                            <div className="font-medium text-sm mb-1">{entry.title}</div>
                            <div className="text-xs text-muted mb-1">
                              {entry.job?.client?.company_name ?? entry.job?.title ?? '—'}
                            </div>
                            <div className="text-xs text-muted">
                              {entry.crew_count} crew{entry.plant_assigned && ` • ${entry.plant_assigned}`}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="h-32 border border-dashed border-border rounded flex items-center justify-center text-muted text-sm">
                          No entries
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {/* ── Month View ── */}
      {view === 'month' && (
        <Panel>
          {isLoading ? (
            <Skeleton className="h-96 rounded" />
          ) : (
            <div>
              <div className="grid grid-cols-7 border-b border-border mb-px">
                {DAY_LABELS.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-mono text-muted uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border">
                {monthDays.map((date, i) => {
                  if (!date) {
                    return <div key={`pad-${i}`} className="bg-surface min-h-24 p-2" />;
                  }
                  const entries = getEntriesForDay(date);
                  const today = isToday(date);
                  return (
                    <div key={date.toISOString()} className="bg-surface min-h-24 p-2">
                      <div className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 mx-auto',
                        today ? 'bg-yellow text-black font-bold' : 'text-text'
                      )}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {entries.slice(0, 3).map(entry => (
                          <div
                            key={entry.id}
                            className="text-xs bg-yellow/20 border-l-2 border-yellow rounded px-1 py-0.5 truncate leading-tight"
                            title={entry.title}
                          >
                            {entry.title}
                          </div>
                        ))}
                        {entries.length > 3 && (
                          <div className="text-xs text-muted font-mono">+{entries.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* ── New Entry Modal ── */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Add Schedule Entry</h2>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-danger/10 border border-danger text-danger text-sm">{formError}</div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Job</label>
                <select
                  value={form.job_id}
                  onChange={(e) => setForm(f => ({ ...f, job_id: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                >
                  <option value="">No job (standalone entry)</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.job_number} – {j.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g., Site Preparation"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={form.start_datetime}
                    onChange={(e) => setForm(f => ({ ...f, start_datetime: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    value={form.end_datetime}
                    onChange={(e) => setForm(f => ({ ...f, end_datetime: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Crew Count</label>
                  <input
                    type="number"
                    placeholder="1"
                    min="1"
                    value={form.crew_count}
                    onChange={(e) => setForm(f => ({ ...f, crew_count: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Plant</label>
                  <select
                    value={form.plant_assigned}
                    onChange={(e) => setForm(f => ({ ...f, plant_assigned: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  >
                    <option value="">None</option>
                    <option value="Excavator">Excavator</option>
                    <option value="Dumper">Dumper</option>
                    <option value="Roller">Roller</option>
                    <option value="Concrete Mixer">Concrete Mixer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Notes</label>
                <textarea
                  placeholder="Additional notes..."
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => { setShowNewEntryModal(false); setForm(EMPTY_FORM); setFormError(null); }}>Cancel</Button>
              <Button onClick={handleCreateEntry} loading={submitting} disabled={submitting}>Add Entry</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
