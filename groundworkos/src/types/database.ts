export interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  vat_number: string | null;
  bank_details: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  companies_house_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  job_number: string;
  client_id: string | null;
  subcontractor_id: string | null;
  title: string;
  description: string | null;
  site_address: string | null;
  status: JobStatus;
  type: JobType | null;
  value: number | null;
  start_date: string | null;
  end_date: string | null;
  progress_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type JobStatus = 'enquiry' | 'quoted' | 'active' | 'on-hold' | 'complete' | 'cancelled';
export type JobType = 'drainage' | 'foundations' | 'excavation' | 'kerbing' | 'sewers' | 'reinstatement';

export interface Quote {
  id: string;
  company_id: string;
  quote_number: string;
  client_id: string | null;
  job_id: string | null;
  title: string | null;
  line_items: LineItem[];
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: QuoteStatus;
  sent_at: string | null;
  accepted_at: string | null;
  notes: string | null;
  created_at: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  client_id: string | null;
  job_id: string | null;
  quote_id: string | null;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'void';

export interface Subcontractor {
  id: string;
  company_id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  trade: string | null;
  utr_number: string | null;
  cis_status: CISStatus;
  cis_verified_at: string | null;
  notes: string | null;
  created_at: string;
}

export type CISStatus = 'unverified' | 'gross' | 'net' | 'unmatched';

export interface Document {
  id: string;
  company_id: string;
  name: string;
  type: DocumentType;
  related_to: DocumentRelatedTo | null;
  related_id: string | null;
  file_path: string | null;
  expiry_date: string | null;
  status: DocumentStatus;
  created_at: string;
}

export type DocumentType = 'insurance' | 'rams' | 'permit' | 'cscs' | 'other';
export type DocumentRelatedTo = 'job' | 'subcontractor' | 'company';
export type DocumentStatus = 'active' | 'expired' | 'expiring_soon';

export interface ScheduleEntry {
  id: string;
  company_id: string;
  job_id: string | null;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  crew_count: number;
  plant_assigned: string | null;
  notes: string | null;
  created_at: string;
}

export interface StatusHistory {
  id: string;
  company_id: string;
  entity_type: 'job' | 'quote' | 'invoice';
  entity_id: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  role: 'admin' | 'manager' | 'member';
  created_at: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
}

export interface ClientWithStats extends Client {
  job_count: number;
  total_invoiced: number;
}

export interface JobWithClient extends Job {
  client?: Client;
}

export interface QuoteWithClient extends Quote {
  client?: Client;
}

export interface InvoiceWithDetails extends Invoice {
  client?: Client;
  job?: Job;
  quote?: Quote;
}

export interface ScheduleEntryWithJob extends ScheduleEntry {
  job?: JobWithClient;
}
