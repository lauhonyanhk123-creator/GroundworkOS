-- GroundworkOS CRM Database Schema
-- Multi-tenant CRM for UK Groundworks Companies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COMPANIES TABLE (Tenant/Multi-company support)
-- ============================================
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    vat_number TEXT,
    bank_details TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTS TABLE
-- ============================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
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

-- ============================================
-- JOBS TABLE
-- ============================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    site_address TEXT,
    status TEXT DEFAULT 'enquiry' CHECK (status IN ('enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled')),
    type TEXT CHECK (type IN ('drainage', 'foundations', 'excavation', 'kerbing', 'sewers', 'reinstatement')),
    value DECIMAL(12, 2),
    start_date DATE,
    end_date DATE,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUOTES TABLE
-- ============================================
CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    quote_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    title TEXT,
    line_items JSONB DEFAULT '[]'::JSONB,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    vat_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    subtotal DECIMAL(12, 2) DEFAULT 0,
    vat_amount DECIMAL(12, 2) DEFAULT 0,
    total_amount DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void')),
    due_date DATE,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SUBCONTRACTORS TABLE
-- ============================================
CREATE TABLE subcontractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    trade TEXT,
    utr_number TEXT,
    cis_status TEXT DEFAULT 'unverified' CHECK (cis_status IN ('unverified', 'gross', 'net', 'unmatched')),
    cis_verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('insurance', 'rams', 'permit', 'cscs', 'other')),
    related_to TEXT CHECK (related_to IN ('job', 'subcontractor', 'company')),
    related_id UUID,
    file_path TEXT,
    expiry_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'expiring_soon')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEDULE_ENTRIES TABLE
-- ============================================
CREATE TABLE schedule_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    crew_count INTEGER DEFAULT 1,
    plant_assigned TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STATUS_HISTORY TABLE (for tracking job status changes)
-- ============================================
CREATE TABLE status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('job', 'quote', 'invoice')),
    entity_id UUID NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================
-- HELPER FUNCTIONS FOR GENERATING UNIQUE NUMBERS
-- ============================================

-- Function to generate next job number (GW-0001, GW-0002, etc.)
CREATE OR REPLACE FUNCTION generate_job_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    last_number INTEGER := 0;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(job_number FROM 4) AS INTEGER)), 0)
    INTO last_number
    FROM jobs
    WHERE job_number ~ '^GW-[0-9]+$';
    
    new_number := 'GW-' || LPAD((last_number + 1)::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next quote number (QT-0001, QT-0002, etc.)
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    last_number INTEGER := 0;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 4) AS INTEGER)), 0)
    INTO last_number
    FROM quotes
    WHERE quote_number ~ '^QT-[0-9]+$';
    
    new_number := 'QT-' || LPAD((last_number + 1)::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate next invoice number (INV-0001, INV-0002, etc.)
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    last_number INTEGER := 0;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0)
    INTO last_number
    FROM invoices
    WHERE invoice_number ~ '^INV-[0-9]+$';
    
    new_number := 'INV-' || LPAD((last_number + 1)::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate quote totals from line items
CREATE OR REPLACE FUNCTION calculate_quote_totals(
    p_line_items JSONB
) RETURNS JSONB AS $$
DECLARE
    subtotal DECIMAL(12, 2) := 0;
    vat_amount DECIMAL(12, 2) := 0;
    total_amount DECIMAL(12, 2) := 0;
    item JSONB;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_line_items)
    LOOP
        subtotal := subtotal + (COALESCE((item->>'quantity')::DECIMAL, 1) * COALESCE((item->>'unit_price')::DECIMAL, 0));
    END LOOP;
    
    vat_amount := subtotal * 0.20;
    total_amount := subtotal + vat_amount;
    
    RETURN jsonb_build_object(
        'subtotal', subtotal,
        'vat_amount', vat_amount,
        'total_amount', total_amount
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER_COMPANIES TABLE (links auth.users to companies)
-- ============================================
CREATE TABLE user_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, company_id)
);

-- Enable RLS on user_companies
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_companies
-- SELECT only: users may see their own memberships. All writes (creating a
-- company's first admin, inviting/removing members, changing roles) go through
-- server-side API routes using the service-role key, which validate that the
-- requester is an admin of the target company. A client-side INSERT policy
-- here would let any authenticated user grant themselves membership of an
-- arbitrary company, so none is defined.
CREATE POLICY "Users can view their own company memberships"
    ON user_companies FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES FOR COMPANIES
-- ============================================

CREATE POLICY "Users can view their own companies"
    ON companies FOR SELECT
    USING (
        id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

-- Companies are created only by the server-side onboarding route (service-role
-- key), which also creates the founding admin membership atomically. No
-- client-side INSERT policy is defined.

CREATE POLICY "Admins can update companies"
    ON companies FOR UPDATE
    USING (
        id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR CLIENTS
-- ============================================

CREATE POLICY "Users can view clients in their company"
    ON clients FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clients in their company"
    ON clients FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update clients in their company"
    ON clients FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete clients in their company"
    ON clients FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR JOBS
-- ============================================

CREATE POLICY "Users can view jobs in their company"
    ON jobs FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert jobs in their company"
    ON jobs FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update jobs in their company"
    ON jobs FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete jobs in their company"
    ON jobs FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR QUOTES
-- ============================================

CREATE POLICY "Users can view quotes in their company"
    ON quotes FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert quotes in their company"
    ON quotes FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update quotes in their company"
    ON quotes FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete quotes in their company"
    ON quotes FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR INVOICES
-- ============================================

CREATE POLICY "Users can view invoices in their company"
    ON invoices FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert invoices in their company"
    ON invoices FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update invoices in their company"
    ON invoices FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete invoices in their company"
    ON invoices FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR SUBCONTRACTORS
-- ============================================

CREATE POLICY "Users can view subcontractors in their company"
    ON subcontractors FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert subcontractors in their company"
    ON subcontractors FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update subcontractors in their company"
    ON subcontractors FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete subcontractors in their company"
    ON subcontractors FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR DOCUMENTS
-- ============================================

CREATE POLICY "Users can view documents in their company"
    ON documents FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert documents in their company"
    ON documents FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update documents in their company"
    ON documents FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete documents in their company"
    ON documents FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- RLS POLICIES FOR SCHEDULE_ENTRIES
-- ============================================

CREATE POLICY "Users can view schedule entries in their company"
    ON schedule_entries FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert schedule entries in their company"
    ON schedule_entries FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update schedule entries in their company"
    ON schedule_entries FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete schedule entries in their company"
    ON schedule_entries FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- RLS POLICIES FOR STATUS_HISTORY
-- ============================================

CREATE POLICY "Users can view status history in their company"
    ON status_history FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert status history in their company"
    ON status_history FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_clients_company_id ON clients(company_id);
CREATE INDEX idx_clients_company_name ON clients(company_name);
CREATE INDEX idx_jobs_company_id ON jobs(company_id);
CREATE INDEX idx_jobs_client_id ON jobs(client_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_quotes_company_id ON quotes(company_id);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_subcontractors_company_id ON subcontractors(company_id);
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_related ON documents(related_to, related_id);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);
CREATE INDEX idx_schedule_entries_company_id ON schedule_entries(company_id);
CREATE INDEX idx_schedule_entries_job_id ON schedule_entries(job_id);
CREATE INDEX idx_schedule_entries_start ON schedule_entries(start_datetime);
CREATE INDEX idx_status_history_entity ON status_history(entity_type, entity_id);

-- ============================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DOCUMENT STATUS UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_document_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expiry_date < CURRENT_DATE THEN
        NEW.status := 'expired';
    ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
        NEW.status := 'expiring_soon';
    ELSE
        NEW.status := 'active';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_document_status_trigger
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_document_status();

-- ============================================
-- INVOICE OVERDUE CHECK TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION check_invoice_overdue()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sent' AND NEW.due_date < CURRENT_DATE THEN
        NEW.status := 'overdue';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_invoice_overdue_trigger
    BEFORE INSERT OR UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION check_invoice_overdue();

-- ============================================
-- STATUS HISTORY TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO status_history (company_id, entity_type, entity_id, old_status, new_status, created_by)
        VALUES (
            NEW.company_id,
            TG_ARGV[0],
            NEW.id,
            OLD.status,
            NEW.status,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER log_job_status_change
    AFTER UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION log_status_change('job');

CREATE TRIGGER log_quote_status_change
    AFTER UPDATE ON quotes
    FOR EACH ROW EXECUTE FUNCTION log_status_change('quote');

CREATE TRIGGER log_invoice_status_change
    AFTER UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_status_change('invoice');


-- Xero integration support
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS xero_invoice_id TEXT;

CREATE TABLE IF NOT EXISTS xero_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  tenant_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)
);

-- xero_connections holds per-company OAuth tokens, so it must be company-scoped
-- like every other tenant table. Without RLS, the publishable-key client could
-- read another company's Xero access and refresh tokens.
ALTER TABLE xero_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view xero connections in their company"
    ON xero_connections FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert xero connections in their company"
    ON xero_connections FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update xero connections in their company"
    ON xero_connections FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete xero connections in their company"
    ON xero_connections FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM user_companies
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
