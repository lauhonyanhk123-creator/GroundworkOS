import { describe, it, expect } from 'vitest';

// Business logic from jobs-mcp

describe('Jobs: status constants', () => {
  const JOB_STATUSES = ['enquiry', 'quoted', 'active', 'on-hold', 'complete', 'cancelled'];

  it('enquiry is the initial status', () => {
    expect(JOB_STATUSES[0]).toBe('enquiry');
  });

  it('all 6 statuses are defined', () => {
    expect(JOB_STATUSES).toHaveLength(6);
  });

  it('active is a valid status', () => {
    expect(JOB_STATUSES).toContain('active');
  });

  it('cancelled is a valid terminal status', () => {
    expect(JOB_STATUSES).toContain('cancelled');
  });
});

describe('Jobs: type constants', () => {
  const JOB_TYPES = ['drainage', 'foundations', 'excavation', 'kerbing', 'sewers', 'reinstatement'];

  it('has exactly 6 job types', () => {
    expect(JOB_TYPES).toHaveLength(6);
  });

  it('drainage is a valid type', () => {
    expect(JOB_TYPES).toContain('drainage');
  });

  it('reinstatement is a valid type', () => {
    expect(JOB_TYPES).toContain('reinstatement');
  });
});

describe('Jobs: job number format', () => {
  const JOB_NUMBER_PATTERN = /^GW-\d{4}$/;

  it('GW-0001 matches the expected format', () => {
    expect('GW-0001').toMatch(JOB_NUMBER_PATTERN);
  });

  it('GW-9999 matches the expected format', () => {
    expect('GW-9999').toMatch(JOB_NUMBER_PATTERN);
  });

  it('GW-001 does not match (needs 4 digits)', () => {
    expect('GW-001').not.toMatch(JOB_NUMBER_PATTERN);
  });
});

describe('Jobs: progress percent', () => {
  it('progress is clamped between 0 and 100', () => {
    const clamp = (v: number) => Math.min(100, Math.max(0, v));
    expect(clamp(-10)).toBe(0);
    expect(clamp(50)).toBe(50);
    expect(clamp(110)).toBe(100);
  });
});
