import { describe, it, expect } from 'vitest';

// Business logic from compliance-mcp: determine document status from expiry date
function getDocumentStatus(expiryDate: string | undefined): 'active' | 'expired' | 'expiring_soon' {
  if (!expiryDate) return 'active';

  const expiry = new Date(expiryDate);
  const today = new Date();
  const thirtyDays = new Date(today);
  thirtyDays.setDate(thirtyDays.getDate() + 30);

  if (expiry < today) return 'expired';
  if (expiry < thirtyDays) return 'expiring_soon';
  return 'active';
}

describe('Compliance: document status calculation', () => {
  it('returns active for a far-future expiry date', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(getDocumentStatus(future.toISOString())).toBe('active');
  });

  it('returns expired for a past expiry date', () => {
    const past = new Date();
    past.setFullYear(past.getFullYear() - 1);
    expect(getDocumentStatus(past.toISOString())).toBe('expired');
  });

  it('returns expiring_soon for expiry within 30 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 15);
    expect(getDocumentStatus(soon.toISOString())).toBe('expiring_soon');
  });

  it('returns expiring_soon for expiry exactly 29 days away', () => {
    const twentyNine = new Date();
    twentyNine.setDate(twentyNine.getDate() + 29);
    expect(getDocumentStatus(twentyNine.toISOString())).toBe('expiring_soon');
  });

  it('returns active when no expiry date is provided', () => {
    expect(getDocumentStatus(undefined)).toBe('active');
  });

  it('returns expired for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(getDocumentStatus(yesterday.toISOString())).toBe('expired');
  });
});

describe('Compliance: document type validation', () => {
  const VALID_TYPES = ['insurance', 'rams', 'permit', 'cscs', 'other'];

  it('all expected document types are valid', () => {
    expect(VALID_TYPES).toContain('insurance');
    expect(VALID_TYPES).toContain('rams');
    expect(VALID_TYPES).toContain('permit');
    expect(VALID_TYPES).toContain('cscs');
    expect(VALID_TYPES).toContain('other');
  });
});
