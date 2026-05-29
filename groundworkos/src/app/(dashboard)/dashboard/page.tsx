'use client';

import { useEffect, useState } from 'react';
import { ChatPanel } from '@/components/ai/chat-panel';
import { StatCard } from '@/components/ui/stat-card';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CloudRain, Wind, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type WeatherRisk = {
  date: string;
  temperature: number;
  wind_speed: number;
  precipitation: number;
  risk_level: 'low' | 'medium' | 'high';
  description: string;
};

type JobSummary = {
  active_count: number;
  quoted_count: number;
  complete_count: number;
  total_pipeline_value: number;
};

type InvoiceSummary = {
  monthly_revenue: Array<{ month: string; total: number }>;
  total_outstanding: number;
  overdue_count: number;
};

type ComplianceStatus = {
  expired: Array<any>;
  expiring_soon: Array<any>;
  valid: Array<any>;
  overall_status: 'red' | 'amber' | 'green';
};

type ScheduleEntry = {
  id: string;
  job_id: string | null;
  title: string;
  start_datetime: string;
  end_datetime: string;
  crew_count: number | null;
  plant_assigned: string | null;
  notes: string | null;
  job?: {
    title: string;
  };
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [weatherRisk, setWeatherRisk] = useState<WeatherRisk | null>(null);
  const [jobSummary, setJobSummary] = useState<JobSummary | null>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, ScheduleEntry[]> | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<ScheduleEntry[]>([]);

  useEffect(() => {
    // Mock data for demo purposes
    const loadData = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setWeatherRisk({
        date: new Date().toISOString(),
        temperature: 15,
        wind_speed: 12,
        precipitation: 20,
        risk_level: 'low',
        description: 'Light rain expected'
      });

      setJobSummary({
        active_count: 5,
        quoted_count: 3,
        complete_count: 12,
        total_pipeline_value: 125000
      });

      setInvoiceSummary({
        monthly_revenue: [
          { month: 'Jan', total: 8500 },
          { month: 'Feb', total: 12000 },
          { month: 'Mar', total: 10500 },
          { month: 'Apr', total: 15000 },
          { month: 'May', total: 18000 },
          { month: 'Jun', total: 0 }
        ],
        total_outstanding: 28500,
        overdue_count: 2
      });

      setComplianceStatus({
        expired: [],
        expiring_soon: [
          { id: '1', name: 'Insurance - ABC Ltd', type: 'insurance' }
        ],
        valid: [
          { id: '2', name: 'CIS Certificate - XYZ Ltd', type: 'insurance' }
        ],
        overall_status: 'amber'
      });

      const today = new Date().toISOString().split('T')[0];
      const thisMonday = getMonday(new Date());

      const mockSchedule: ScheduleEntry[] = [
        {
          id: '1',
          job_id: 'job1',
          title: 'Site Preparation - Newbury',
          start_datetime: `${today}T08:00:00`,
          end_datetime: `${today}T12:00:00`,
          crew_count: 3,
          plant_assigned: 'Excavator',
          notes: null,
          job: { title: 'Newbury Site Prep' }
        },
        {
          id: '2',
          job_id: 'job2',
          title: 'Concrete Pour - Reading',
          start_datetime: `${today}T13:00:00`,
          end_datetime: `${today}T17:00:00`,
          crew_count: 4,
          plant_assigned: null,
          notes: 'Weather dependent',
          job: { title: 'Reading Foundations' }
        }
      ];

      setTodaySchedule(mockSchedule);

      setWeeklySchedule({
        monday: [],
        tuesday: mockSchedule,
        wednesday: [],
        thursday: [],
        friday: []
      });
    };

    loadData();
    setIsLoading(false);
  }, []);

  function getMonday(d: Date) {
    d = new Date(d);
    const day = d.getDay(),
      diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getWeekDayDates = () => {
    const monday = getMonday(new Date());
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    return days.map((day, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateNum = date.getDate();
      const isToday = date.toDateString() === new Date().toDateString();
      return { day, date: dateNum, isToday };
    });
  };

  return (
    <div className="space-y-6">
      {/* Weather Alert Banner */}
      {isLoading ? (
        <Skeleton className="h-24 rounded" />
      ) : weatherRisk && weatherRisk.risk_level !== 'low' ? (
        <div className={cn(
          'border rounded p-4 flex items-center gap-4',
          weatherRisk.risk_level === 'medium'
            ? 'border-amber-500 bg-amber-500/10'
            : 'border-danger bg-danger/10'
        )}>
          <AlertTriangle className={cn(
            'w-6 h-6',
            weatherRisk.risk_level === 'medium' ? 'text-amber-500' : 'text-danger'
          )} />
          <div className="flex-1">
            <h4 className="font-semibold">
              Weather Alert: {weatherRisk.risk_level.charAt(0).toUpperCase() + weatherRisk.risk_level.slice(1)} Risk
            </h4>
            <p className="text-sm text-muted">
              {weatherRisk.description} - Temp: {weatherRisk.temperature}°C, Wind: {weatherRisk.wind_speed}mph, Precipitation: {weatherRisk.precipitation}%
            </p>
          </div>
        </div>
      ) : null}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded" />
          ))
        ) : (
          <>
            <StatCard
              label="Active Jobs"
              value={jobSummary?.active_count || 0}
              barPercent={60}
            />
            <StatCard
              label="Monthly Revenue"
              value={formatCurrency(invoiceSummary?.monthly_revenue[4]?.total || 0)}
              change="+18%"
              changeType="up"
              barPercent={75}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(invoiceSummary?.total_outstanding || 0)}
              sub={`${invoiceSummary?.overdue_count || 0} overdue`}
              barPercent={40}
            />
            <StatCard
              label="Pending Quotes"
              value={jobSummary?.quoted_count || 0}
              barPercent={30}
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Jobs */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <Skeleton className="h-80 rounded" />
          ) : (
            <Panel title="Active Jobs" actions={<Button variant="ghost" size="sm">View All Jobs</Button>}>
              <div className="space-y-4">
                {[
                  { id: 'GW-0015', site: 'Newbury Site', client: 'Barrett Homes', type: 'Foundations', status: 'active', value: 45000, progress: 65 },
                  { id: 'GW-0016', site: 'Reading Retail', client: 'Weston Homes', type: 'Excavation', status: 'active', value: 32000, progress: 40 },
                  { id: 'GW-0014', site: 'Swindon Depot', client: 'Local Council', type: 'Drainage', status: 'on-hold', value: 18000, progress: 80 },
                  { id: 'GW-0013', site: 'Oxford Housing', client: 'Bloor Homes', type: 'Kerbing', status: 'active', value: 25000, progress: 95 },
                ].map(job => (
                  <div key={job.id} className="flex items-center gap-4 border-b border-border last:border-0 pb-3 last:pb-0">
                    <div className="font-mono text-sm text-muted w-20">{job.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{job.site}</div>
                      <div className="text-xs text-muted truncate">{job.client}</div>
                    </div>
                    <div className="text-xs text-muted uppercase tracking-wide w-28">{job.type}</div>
                    <Badge status={job.status as any} />
                    <div className="text-right w-24 font-mono">{formatCurrency(job.value)}</div>
                    <div className="w-32">
                      <div className="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-yellow h-full"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted text-right mt-1">{job.progress}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* This Week Schedule */}
          {isLoading ? (
            <Skeleton className="h-48 rounded mt-6" />
          ) : (
            <Panel title="This Week" className="mt-6">
              <div className="grid grid-cols-5 gap-2 border-b border-border pb-4">
                {getWeekDayDates().map((day) => (
                  <div
                    key={day.day}
                    className={cn(
                      'text-center',
                      day.isToday ? 'text-yellow' : 'text-muted'
                    )}
                  >
                    <div className="text-xs font-mono uppercase">{day.day}</div>
                    <div className="text-lg font-condensed font-bold">{day.date}</div>
                    <div className="flex justify-center gap-1 mt-1">
                      {(weeklySchedule?.[day.day.toLowerCase() as keyof typeof weeklySchedule]?.length || 0) > 0 && (
                        <span className="w-2 h-2 rounded-full bg-yellow" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {todaySchedule.length > 0 ? (
                  todaySchedule.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 bg-surface-2 rounded">
                      <div className="text-xs font-mono text-muted">
                        {entry.start_datetime.split('T')[1].substring(0, 5)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{entry.title}</div>
                        <div className="text-xs text-muted">
                          {entry.crew_count} crew
                          {entry.plant_assigned && ` • ${entry.plant_assigned}`}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted">
                    Nothing scheduled for today
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Assistant */}
          <ChatPanel />

          {/* Alerts Panel */}
          {isLoading ? (
            <Skeleton className="h-64 rounded" />
          ) : (
            <Panel title="Alerts">
              <div className="space-y-3">
                {complianceStatus?.expiring_soon.map((doc) => (
                  <div key={doc.id} className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{doc.name}</div>
                      <div className="text-xs text-muted">Expiring soon</div>
                    </div>
                  </div>
                ))}

                {invoiceSummary?.overdue_count && invoiceSummary.overdue_count > 0 ? (
                  <div className="flex items-start gap-3 p-3 bg-danger/10 border border-danger/30 rounded">
                    <AlertTriangle className="w-4 h-4 text-danger mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{invoiceSummary.overdue_count} Overdue Invoice(s)</div>
                      <div className="text-xs text-muted">Total: {formatCurrency(invoiceSummary.total_outstanding)}</div>
                    </div>
                  </div>
                ) : null}

                {(!complianceStatus?.expiring_soon.length && !invoiceSummary?.overdue_count) ? (
                  <div className="text-center py-8 text-muted">
                    No alerts!
                  </div>
                ) : null}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
