-- GroundworkOS Database Schema
-- Version: 1.0.0
-- Last Updated: 2026-05-29

-- ===========================================
-- ENUM TYPES
-- ===========================================

CREATE TYPE job_status AS ENUM ('enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE cis_status AS ENUM ('verified', 'net', 'gross', 'unverified');
CREATE TYPE document_status AS ENUM ('valid', 'expiring_soon', 'expired');
CREATE TYPE document_related_type AS ENUM ('company', 'job', 'client', 'subcontractor');

-- ===========================================
-- CLIENTS TABLE
-- ===========================================

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  companies_house_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);

-- ===========================================
-- JOBS TABLE
-- ===========================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  site_address TEXT,
  status job_status DEFAULT 'enquiry',
  type TEXT NOT NULL,
  value NUMERIC(12, 2) DEFAULT 0,
  progress_percent INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_job_number ON jobs(job_number);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);

-- ===========================================
-- QUOTES TABLE
-- ===========================================

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status quote_status DEFAULT 'draft',
  subtotal NUMERIC(12, 2) DEFAULT 0,
  vat_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);

-- ===========================================
-- QUOTE LINE ITEMS TABLE
-- ===========================================

CREATE TABLE quote_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_line_items_quote_id ON quote_line_items(quote_id);

-- ===========================================
-- INVOICES TABLE
-- ===========================================

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  status invoice_status DEFAULT 'draft',
  subtotal NUMERIC(12, 2) DEFAULT 0,
  vat_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) DEFAULT 0,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_job_id ON invoices(job_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- ===========================================
-- SUBCONTRACTORS TABLE
-- ===========================================

CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  trade TEXT,
  cis_status cis_status DEFAULT 'unverified',
  utr_number TEXT,
  cis_verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subcontractors_company_name ON subcontractors(company_name);
CREATE INDEX idx_subcontractors_trade ON subcontractors(trade);
CREATE INDEX idx_subcontractors_cis_status ON subcontractors(cis_status);

-- ===========================================
-- DOCUMENTS TABLE
-- ===========================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  related_type document_related_type,
  related_id UUID,
  expiry_date DATE,
  status document_status DEFAULT 'valid',
  file_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_related ON documents(related_type, related_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_expiry_date ON documents(expiry_date);

-- ===========================================
-- SCHEDULE ENTRIES TABLE
-- ===========================================

CREATE TABLE schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  crew_count INTEGER,
  plant_assigned TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedule_entries_job_id ON schedule_entries(job_id);
CREATE INDEX idx_schedule_entries_start ON schedule_entries(start_datetime);

-- ===========================================
-- JOB HISTORY TABLE
-- ===========================================

CREATE TABLE job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  status job_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_history_job_id ON job_history(job_id);

-- ===========================================
-- TRIGGER FUNCTIONS
-- ===========================================

-- Function to update job_number automatically
CREATE OR REPLACE FUNCTION set_job_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.job_number IS NULL THEN
    NEW.job_number := 'GW-' || LPAD(CAST(COALESCE((SELECT COUNT(*) + 1 FROM jobs), 1) AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_job_number_trigger
BEFORE INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION set_job_number();

-- Function to update quote_number automatically
CREATE OR REPLACE FUNCTION set_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quote_number IS NULL THEN
    NEW.quote_number := 'QT-' || LPAD(CAST(COALESCE((SELECT COUNT(*) + 1 FROM quotes), 1) AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number_trigger
BEFORE INSERT ON quotes
FOR EACH ROW
EXECUTE FUNCTION set_quote_number();

-- Function to update invoice_number automatically
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || LPAD(CAST(COALESCE((SELECT COUNT(*) + 1 FROM invoices), 1) AS TEXT), 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number_trigger
BEFORE INSERT ON invoices
FOR EACH ROW
EXECUTE FUNCTION set_invoice_number();

-- Function to update document status based on expiry date
CREATE OR REPLACE FUNCTION update_document_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    IF NEW.expiry_date < CURRENT_DATE THEN
      NEW.status := 'expired';
    ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
      NEW.status := 'expiring_soon';
    ELSE
      NEW.status := 'valid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_status_trigger
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_status();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at
BEFORE UPDATE ON quotes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subcontractors_updated_at
BEFORE UPDATE ON subcontractors
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_entries_updated_at
BEFORE UPDATE ON schedule_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

-- Policies (allow all operations for authenticated users - customize as needed)
CREATE POLICY "Allow all for authenticated users" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON jobs FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON quotes FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON quote_line_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON subcontractors FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON documents FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON schedule_entries FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated users" ON job_history FOR ALL TO authenticated USING (true);
