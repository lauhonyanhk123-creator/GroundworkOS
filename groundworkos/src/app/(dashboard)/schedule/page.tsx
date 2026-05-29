'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Plus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

type ScheduleEntry = {
  id: string;
  job_id: string;
  job_number: string;
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  crew_count: number;
  plant_assigned: string;
  notes: string;
  client_name: string;
};

type WeatherData = {
  date: string;
  temperature: number;
  risk_level: 'low' | 'medium' | 'high';
  description: string;
};

export default function SchedulePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);

  useEffect(() => {
    const loadSchedule = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const today = new Date().toISOString().split('T')[0];
      
      setScheduleEntries([
        {
          id: '1',
          job_id: '1',
          job_number: 'GW-0015',
          title: 'Site Preparation',
          description: 'Excavation and ground preparation',
          start_datetime: `${today}T08:00:00`,
          end_datetime: `${today}T12:00:00`,
          crew_count: 4,
          plant_assigned: 'Excavator',
          notes: 'Weather dependent',
          client_name: 'Barrett Homes',
        },
        {
          id: '2',
          job_id: '2',
          job_number: 'GW-0016',
          title: 'Concrete Pour',
          description: 'Foundation concrete pour',
          start_datetime: `${today}T13:00:00`,
          end_datetime: `${today}T17:00:00`,
          crew_count: 3,
          plant_assigned: '',
          notes: '',
          client_name: 'Weston Homes',
        },
      ]);

      setWeatherData({
        [today]: {
          date: today,
          temperature: 15,
          risk_level: 'low',
          description: 'Clear skies',
        },
      });

      setIsLoading(false);
    };

    loadSchedule();
  }, [currentDate]);

  const getWeekDays = () => {
    const monday = new Date(currentDate);
    const day = monday.getDay();
    const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
    monday.setDate(diff);

    const days = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatDayNumber = (date: Date) => {
    return date.getDate();
  };

  const formatDayName = (date: Date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getEntriesForDay = (date: Date) => {
    const dateStr = formatDate(date);
    return scheduleEntries.filter(entry => entry.start_datetime.startsWith(dateStr));
  };

  const getWeatherRisk = (date: Date) => {
    const dateStr = formatDate(date);
    return weatherData[dateStr] || null;
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high' | null) => {
    switch (risk) {
      case 'low':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'high':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  };

  const formatTime = (datetime: string) => {
    const time = datetime.split('T')[1];
    return time.substring(0, 5);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Schedule</h1>
          <p className="text-muted text-sm mt-1">Manage your weekly and monthly schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface border border-border rounded">
            <button
              onClick={() => setView('week')}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                view === 'week' ? 'bg-yellow text-black' : 'text-muted hover:text-text'
              )}
            >
              Week
            </button>
            <button
              onClick={() => setView('month')}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                view === 'month' ? 'bg-yellow text-black' : 'text-muted hover:text-text'
              )}
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

      {/* Week Navigation */}
      <Panel>
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <div className="text-lg font-condensed font-bold">
              {weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })} -{' '}
              {weekDays[4].toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <Button variant="ghost" onClick={() => navigateWeek('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Panel>

      {/* Week View */}
      {view === 'week' && (
        <Panel>
          {isLoading ? (
            <div className="grid grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {weekDays.map((date) => {
                const dateStr = formatDate(date);
                const entries = getEntriesForDay(date);
                const weather = getWeatherRisk(date);
                const todayClass = isToday(date);

                return (
                  <div key={dateStr} className="space-y-3">
                    {/* Day Header */}
                    <div className={cn(
                      'text-center p-3 rounded',
                      todayClass ? 'bg-yellow text-black' : 'bg-surface-2'
                    )}>
                      <div className="text-xs font-mono uppercase tracking-wider">
                        {formatDayName(date)}
                      </div>
                      <div className="text-2xl font-condensed font-bold">
                        {formatDayNumber(date)}
                      </div>
                      {weather && (
                        <div className={cn('text-xs mt-1', getRiskColor(weather.risk_level))}>
                          {weather.temperature}°C
                        </div>
                      )}
                    </div>

                    {/* Entries */}
                    <div className="space-y-2">
                      {entries.length > 0 ? (
                        entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="p-3 bg-surface-2 rounded border-l-2 border-yellow"
                          >
                            <div className="text-xs font-mono text-muted mb-1">
                              {formatTime(entry.start_datetime)} - {formatTime(entry.end_datetime)}
                            </div>
                            <div className="font-medium text-sm mb-1">{entry.title}</div>
                            <div className="text-xs text-muted mb-1">{entry.client_name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted">
                              <span>{entry.crew_count} crew</span>
                              {entry.plant_assigned && (
                                <>
                                  <span>•</span>
                                  <span>{entry.plant_assigned}</span>
                                </>
                              )}
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

      {/* Month View Placeholder */}
      {view === 'month' && (
        <Panel>
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">Month view coming soon</p>
          </div>
        </Panel>
      )}

      {/* New Entry Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Add Schedule Entry</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Job</label>
                <select className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow">
                  <option value="">Select job...</option>
                  <option value="1">GW-0015 - Barrett Homes</option>
                  <option value="2">GW-0016 - Weston Homes</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  placeholder="e.g., Site Preparation"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Crew Count</label>
                  <input
                    type="number"
                    placeholder="3"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Plant</label>
                  <select className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow">
                    <option value="">None</option>
                    <option value="excavator">Excavator</option>
                    <option value="dumper">Dumper</option>
                    <option value=" Roller">Roller</option>
                    <option value="concrete-mixer">Concrete Mixer</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes</label>
                <textarea
                  placeholder="Additional notes..."
                  rows={3}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowNewEntryModal(false)}>Cancel</Button>
              <Button onClick={() => setShowNewEntryModal(false)}>Add Entry</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
