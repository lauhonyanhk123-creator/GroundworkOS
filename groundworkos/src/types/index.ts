export type {
  Company,
  Client,
  ClientWithStats,
  Job,
  JobWithClient,
  JobStatus,
  JobType,
  Quote,
  QuoteWithClient,
  QuoteStatus,
  Invoice,
  InvoiceWithDetails,
  InvoiceStatus,
  Subcontractor,
  CISStatus,
  Document,
  DocumentType,
  DocumentRelatedTo,
  DocumentStatus,
  ScheduleEntry,
  ScheduleEntryWithJob,
  StatusHistory,
  UserCompany,
  LineItem,
} from './database';

import type { JobStatus, Invoice, Document, ScheduleEntry, Job } from './database';

export type UserRole = 'admin' | 'manager' | 'member';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface WeatherRisk {
  date: string;
  temperature: number;
  wind_speed: number;
  precipitation: number;
  risk_level: 'low' | 'medium' | 'high';
  description: string;
}

export interface DashboardStats {
  active_jobs_count: number;
  quoted_jobs_count: number;
  complete_jobs_count: number;
  total_pipeline_value: number;
  monthly_revenue: number;
  total_outstanding: number;
  overdue_count: number;
  pending_quotes_count: number;
  pending_quotes_value: number;
}

export interface PipelineSummary {
  by_status: {
    status: JobStatus;
    count: number;
    value: number;
  }[];
  pending_quotes: {
    count: number;
    value: number;
  };
  monthly_revenue: number;
  last_month_revenue: number;
}

export interface ComplianceSummary {
  expired: Document[];
  expiring_soon: Document[];
  valid: Document[];
  overall_status: 'green' | 'amber' | 'red';
}

export interface DailyBriefing {
  outstanding_invoices: Invoice[];
  today_schedule: ScheduleEntry[];
  compliance_alerts: Document[];
  active_job_count: number;
  weather_risks: WeatherRisk[];
}

export interface OverdueSummary {
  invoices: (Invoice & { days_overdue: number })[];
  jobs: Job[];
  documents: Document[];
}

export interface MonthlyRevenue {
  month_label: string;
  total: number;
  invoice_count: number;
}

export interface AvailabilityCheck {
  date: string;
  is_available: boolean;
  conflicts: ScheduleEntry[];
}
