import type {
  Client,
  Job,
  Quote,
  Invoice,
  Subcontractor,
  Document,
  ScheduleEntry,
  Company,
} from '@/types';

export function mockCompany(overrides?: Partial<Company>): Company {
  return {
    id: 'company-1',
    name: 'Test Groundworks Ltd',
    email: 'info@testgroundworks.co.uk',
    phone: '01234 567890',
    address: '1 Test Street, London, SW1A 1AA',
    vat_number: 'GB123456789',
    bank_details: null,
    logo_url: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockClient(overrides?: Partial<Client>): Client {
  return {
    id: 'client-1',
    company_id: 'company-1',
    company_name: 'Acme Construction Ltd',
    contact_name: 'John Smith',
    email: 'john.smith@acme.co.uk',
    phone: '07700 900000',
    address: '10 Builder Street, London, EC1A 1BB',
    companies_house_number: '12345678',
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockJob(overrides?: Partial<Job>): Job {
  return {
    id: 'job-1',
    company_id: 'company-1',
    job_number: 'GW-0001',
    client_id: 'client-1',
    subcontractor_id: null,
    title: 'Drainage Installation — High Street',
    description: 'Install new drainage system',
    site_address: '20 High Street, London, W1A 1AA',
    status: 'active',
    type: 'drainage',
    value: 15000,
    start_date: '2025-06-01',
    end_date: '2025-06-30',
    progress_percent: 50,
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockQuote(overrides?: Partial<Quote>): Quote {
  return {
    id: 'quote-1',
    company_id: 'company-1',
    quote_number: 'QT-0001',
    client_id: 'client-1',
    job_id: null,
    title: 'Drainage Installation Quote',
    line_items: [
      { description: 'Excavation works', quantity: 1, unit_price: 5000 },
      { description: 'Drainage pipe supply and fit', quantity: 1, unit_price: 8000 },
    ],
    subtotal: 13000,
    vat_amount: 2600,
    total_amount: 15600,
    status: 'draft',
    sent_at: null,
    accepted_at: null,
    notes: 'Valid for 30 days',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockInvoice(overrides?: Partial<Invoice>): Invoice {
  return {
    id: 'invoice-1',
    company_id: 'company-1',
    invoice_number: 'INV-0001',
    client_id: 'client-1',
    job_id: 'job-1',
    quote_id: null,
    subtotal: 13000,
    vat_amount: 2600,
    total_amount: 15600,
    status: 'sent',
    due_date: '2025-07-01',
    paid_at: null,
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockSubcontractor(overrides?: Partial<Subcontractor>): Subcontractor {
  return {
    id: 'subcon-1',
    company_id: 'company-1',
    company_name: 'Smith Groundworks',
    contact_name: 'Bob Smith',
    email: 'bob@smithgroundworks.co.uk',
    phone: '07700 900001',
    trade: 'Drainage',
    utr_number: '1234567890',
    cis_status: 'net',
    cis_verified_at: '2025-01-01T00:00:00Z',
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockDocument(overrides?: Partial<Document>): Document {
  return {
    id: 'doc-1',
    company_id: 'company-1',
    name: 'Public Liability Insurance',
    type: 'insurance',
    related_to: 'company',
    related_id: 'company-1',
    file_path: null,
    expiry_date: '2026-01-01',
    status: 'active',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

export function mockScheduleEntry(overrides?: Partial<ScheduleEntry>): ScheduleEntry {
  return {
    id: 'entry-1',
    company_id: 'company-1',
    job_id: 'job-1',
    title: 'Site excavation day 1',
    description: 'Initial excavation works',
    start_datetime: '2025-06-01T08:00:00',
    end_datetime: '2025-06-01T17:00:00',
    crew_count: 3,
    plant_assigned: 'Excavator',
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}
