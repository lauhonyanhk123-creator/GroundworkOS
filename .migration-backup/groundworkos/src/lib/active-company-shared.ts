// Shared between the server resolver (active-company.ts, which imports
// next/headers) and the browser helper (active-company-client.ts). Keeping the
// constant here lets client code import it without pulling in server-only APIs.
export const ACTIVE_COMPANY_COOKIE = 'selected_company_id'
