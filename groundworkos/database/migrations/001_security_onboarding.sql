-- Migration 001 — security + onboarding fixes
-- Safe to run on a database already provisioned from an earlier schema.sql.
-- Run in Supabase Dashboard > SQL Editor. All statements are idempotent.

-- 1. Remove the privilege-escalation policy on user_companies.
--    Its FOR ALL USING clause doubled as the INSERT check, which let any
--    authenticated user insert themselves as an admin of ANY company.
--    Membership writes now happen only via server-side (service-role) routes.
DROP POLICY IF EXISTS "Admins can manage company memberships" ON user_companies;

-- 2. Remove client-side company creation. Companies are now created by the
--    onboarding API route (service role), together with the founding admin
--    membership, in one place that can be validated.
DROP POLICY IF EXISTS "Admins can insert companies" ON companies;

-- 3. Remove the unused helper whose local variables shadowed the column names
--    (user_id / company_id), making it return NULL or error under the default
--    plpgsql variable_conflict setting. No policy or app code references it.
DROP FUNCTION IF EXISTS get_user_company_id();

-- 4. Allow invoices to be voided (mistaken invoices keep their audit trail
--    instead of being deleted).
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'void'));

-- 5. CIS reporting (reports/cis page and the CIS reporting tools) attributes
--    paid invoices to a job's subcontractor via jobs.subcontractor_id, but the
--    column was never in the schema, so the feature errored at runtime.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS subcontractor_id UUID
    REFERENCES subcontractors(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_subcontractor_id ON jobs(subcontractor_id);
