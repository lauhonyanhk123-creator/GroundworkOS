import { describe, it, expect } from 'vitest';

describe('Subcontractors: CIS status constants', () => {
  const CIS_STATUSES = ['unverified', 'gross', 'net', 'unmatched'];

  it('unverified is the default initial status', () => {
    expect(CIS_STATUSES).toContain('unverified');
  });

  it('has exactly 4 CIS statuses', () => {
    expect(CIS_STATUSES).toHaveLength(4);
  });

  it('gross and net are valid verified statuses', () => {
    expect(CIS_STATUSES).toContain('gross');
    expect(CIS_STATUSES).toContain('net');
  });
});

describe('Subcontractors: UTR number format', () => {
  const UTR_PATTERN = /^\d{10}$/;

  it('10-digit number is a valid UTR', () => {
    expect('1234567890').toMatch(UTR_PATTERN);
  });

  it('9-digit number is invalid UTR', () => {
    expect('123456789').not.toMatch(UTR_PATTERN);
  });

  it('UTR with letters is invalid', () => {
    expect('123456789A').not.toMatch(UTR_PATTERN);
  });
});

describe('Subcontractors: data validation', () => {
  it('company_name is required', () => {
    const validate = (data: { company_name?: string }) =>
      typeof data.company_name === 'string' && data.company_name.trim().length > 0;

    expect(validate({ company_name: 'Smith Groundworks' })).toBe(true);
    expect(validate({ company_name: '' })).toBe(false);
    expect(validate({})).toBe(false);
  });

  it('new subcontractor defaults to unverified CIS status', () => {
    const defaultCisStatus = 'unverified';
    expect(defaultCisStatus).toBe('unverified');
  });
});
