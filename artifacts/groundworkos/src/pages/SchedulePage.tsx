import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Btn } from '../components/ui/Btn';
import { cn } from '../lib/utils';
import { SCHEDULE } from '../data/mock';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TYPE_COLORS: Record<string, string> = {
  site_work: '#FFD600',
  delivery: '#60a5fa',
  inspection: '#fb923c',
  meeting: '#a78bfa',
  other: '#888888',
};

export function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');

  function getWeekBounds(date: Date) {
    const mon = new Date(date);
    const day = mon.getDay();
    mon.setDate(mon.getDate() - day + (day === 0 ? -6 : 1));
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    return { start: mon, end: sun };
  }

  function getWeekDays(date: Date): Date[] {
    const { start } = getWeekBounds(date);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }

  const weekDays = getWeekDays(currentDate);
  const today = new Date().toISOString().split('T')[0];
  const { start, end } = getWeekBounds(currentDate);

  const weekEntries = SCHEDULE.filter(e => {
    const d = new Date(e.start_datetime);
    return d >= start && d <= end;
  });

  function prevWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  }

  function nextWeek() {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  }

  const weekLabel = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Schedule</h1>
          <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Crew & plant allocation</p>
        </div>
        <Btn><Plus className="w-4 h-4" /> Add Entry</Btn>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1.5 rounded hover:bg-[#1c1c1c] transition-colors" style={{ color: '#666666' }}><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-mono" style={{ color: '#e8e8e8' }}>{weekLabel}</span>
          <button onClick={nextWeek} className="p-1.5 rounded hover:bg-[#1c1c1c] transition-colors" style={{ color: '#666666' }}><ChevronRight className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-xs font-mono rounded" style={{ backgroundColor: '#1c1c1c', color: '#666666', border: '1px solid #2a2a2a' }}>Today</button>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded" style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a' }}>
          {(['week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className="px-3 py-1 rounded text-xs font-mono uppercase transition-colors" style={view === v ? { backgroundColor: '#FFD600', color: '#0c0c0c' } : { color: '#666666' }}>{v}</button>
          ))}
        </div>
      </div>

      <div className="rounded overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
        <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)', backgroundColor: '#1c1c1c', borderBottom: '1px solid #2a2a2a' }}>
          <div className="p-2" />
          {weekDays.map((day, i) => {
            const dateStr = day.toISOString().split('T')[0];
            const isToday = dateStr === today;
            const dayEntries = weekEntries.filter(e => e.start_datetime.startsWith(dateStr));
            return (
              <div key={i} className="p-2 text-center" style={{ borderLeft: '1px solid #2a2a2a' }}>
                <div className="text-xs font-mono uppercase" style={{ color: isToday ? '#FFD600' : '#444444' }}>{DAY_LABELS[i]}</div>
                <div className="text-lg font-bold" style={{ fontFamily: "'Barlow Condensed', sans-serif", color: isToday ? '#FFD600' : '#888888' }}>{day.getDate()}</div>
                {dayEntries.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {dayEntries.slice(0,3).map((_, j) => <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FFD600' }} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {weekDays.map((day, dayIdx) => {
          const dateStr = day.toISOString().split('T')[0];
          const dayEntries = weekEntries.filter(e => e.start_datetime.startsWith(dateStr));
          if (dayEntries.length === 0 && dayIdx !== weekDays.findIndex(d => d.toISOString().split('T')[0] === today)) return null;

          return (
            <div key={dayIdx} className="grid" style={{ gridTemplateColumns: '80px 1fr', borderBottom: '1px solid #1c1c1c' }}>
              <div className="p-3 flex items-start justify-end" style={{ borderRight: '1px solid #2a2a2a' }}>
                <span className="text-xs font-mono" style={{ color: day.toISOString().split('T')[0] === today ? '#FFD600' : '#444444' }}>
                  {DAY_LABELS[(dayIdx + 6) % 7 < 5 ? (dayIdx + 6) % 7 : dayIdx]}
                </span>
              </div>
              <div className="p-2 space-y-1.5">
                {dayEntries.length === 0 ? (
                  <div className="text-xs py-2 text-center" style={{ color: '#2a2a2a' }}>—</div>
                ) : dayEntries.map(entry => (
                  <div key={entry.id} className="flex items-start gap-3 p-2.5 rounded" style={{ backgroundColor: '#1c1c1c', borderLeft: `3px solid ${TYPE_COLORS[entry.type] ?? '#888888'}` }}>
                    <span className="text-xs font-mono flex-shrink-0 mt-0.5" style={{ color: '#444444' }}>
                      {new Date(entry.start_datetime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: '#e8e8e8' }}>{entry.title}</div>
                      <div className="text-xs mt-0.5 flex flex-wrap gap-x-2" style={{ color: '#666666' }}>
                        {entry.job && <span>{entry.job.job_number}</span>}
                        <span>{entry.crew_count} crew</span>
                        {entry.plant_assigned && <span>{entry.plant_assigned}</span>}
                        {entry.foreman && <span>FM: {entry.foreman}</span>}
                      </div>
                      {entry.notes && <div className="text-xs mt-0.5" style={{ color: '#444444' }}>{entry.notes}</div>}
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded font-mono uppercase flex-shrink-0" style={{ backgroundColor: '#0c0c0c', color: TYPE_COLORS[entry.type] ?? '#888888' }}>{entry.type.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 text-xs font-mono">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
            <span style={{ color: '#666666' }}>{type.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
