import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getClient, updateClient } from '../../servers/clients-mcp/tools.js';
import { getJobDetails } from '../../servers/jobs-mcp/tools.js';
import { markInvoicePaid } from '../../servers/invoices-mcp/tools.js';
import { getCISMonthlyReturn } from '../../servers/reporting-mcp/tools.js';

const COMPANY = 'company-1';

interface QueryRecord {
  table: string;
  eqs: Record<string, unknown>;
}

// Minimal chainable Supabase mock that records which columns each query was
// filtered on. Every query resolves to a benign result so the tools complete.
function makeSupabaseMock(): { supabase: SupabaseClient; calls: QueryRecord[] } {
  const calls: QueryRecord[] = [];

  function makeBuilder(record: QueryRecord) {
    const chainMethods = ['select', 'insert', 'update', 'in', 'or', 'gte', 'lte', 'lt', 'gt', 'neq', 'order', 'limit'] as const;
    const single = () => Promise.resolve({ data: { id: 'x', client_id: 'c', company_id: COMPANY }, error: null });
    const terminal = { data: [] as unknown[], error: null, count: 0 };
    const builder: Record<string, unknown> = {
      single,
      // Make the builder awaitable for list-style queries.
      then: (resolve: (v: typeof terminal) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(terminal).then(resolve, reject),
      eq: (column: string, value: unknown) => {
        record.eqs[column] = value;
        return builder;
      },
    };
    for (const method of chainMethods) builder[method] = () => builder;
    return builder;
  }

  const supabase = {
    from: (table: string) => {
      const record: QueryRecord = { table, eqs: {} };
      calls.push(record);
      return makeBuilder(record);
    },
    rpc: () => Promise.resolve({ data: 'NUM-001', error: null }),
  } as unknown as SupabaseClient;

  return { supabase, calls };
}

describe('MCP tools enforce company scoping', () => {
  it('getClient filters the clients query by company_id', async () => {
    const { supabase, calls } = makeSupabaseMock();
    await getClient({ client_id: 'client-1' }, supabase, COMPANY);
    const clientsQuery = calls.find(c => c.table === 'clients');
    expect(clientsQuery?.eqs.company_id).toBe(COMPANY);
  });

  it('updateClient scopes the update to the company', async () => {
    const { supabase, calls } = makeSupabaseMock();
    await updateClient({ client_id: 'client-1', company_name: 'Acme' }, supabase, COMPANY);
    const clientsQuery = calls.find(c => c.table === 'clients');
    expect(clientsQuery?.eqs.company_id).toBe(COMPANY);
    expect(clientsQuery?.eqs.id).toBe('client-1');
  });

  it('getJobDetails scopes the job lookup to the company', async () => {
    const { supabase, calls } = makeSupabaseMock();
    await getJobDetails({ job_id: 'job-1' }, supabase, COMPANY);
    const jobsQuery = calls.find(c => c.table === 'jobs');
    expect(jobsQuery?.eqs.company_id).toBe(COMPANY);
  });

  it('markInvoicePaid scopes the update to the company', async () => {
    const { supabase, calls } = makeSupabaseMock();
    await markInvoicePaid({ invoice_id: 'inv-1' }, supabase, COMPANY);
    const invoicesQuery = calls.find(c => c.table === 'invoices');
    expect(invoicesQuery?.eqs.company_id).toBe(COMPANY);
  });

  it('getCISMonthlyReturn scopes both invoices and subcontractors by company_id', async () => {
    const { supabase, calls } = makeSupabaseMock();
    await getCISMonthlyReturn({ month: 6, year: 2026 }, supabase, COMPANY);
    const invoicesQuery = calls.find(c => c.table === 'invoices');
    const subsQuery = calls.find(c => c.table === 'subcontractors');
    expect(invoicesQuery?.eqs.company_id).toBe(COMPANY);
    expect(subsQuery?.eqs.company_id).toBe(COMPANY);
  });
});
