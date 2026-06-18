import { describe, it, expect } from 'vitest';
import { cisRateFor } from '../../servers/reporting-mcp/tools';

// Pipeline summary aggregation logic from reporting-mcp

interface Job { status: string; value: number | null; }

function buildPipelineSummary(jobs: Job[]) {
  const statusGroups: Record<string, { count: number; value: number }> = {};

  for (const job of jobs) {
    if (!statusGroups[job.status]) {
      statusGroups[job.status] = { count: 0, value: 0 };
    }
    statusGroups[job.status].count++;
    statusGroups[job.status].value += job.value ?? 0;
  }

  return Object.entries(statusGroups).map(([status, data]) => ({
    status,
    count: data.count,
    value: data.value,
  }));
}

describe('Reporting: pipeline summary', () => {
  it('groups jobs by status', () => {
    const jobs: Job[] = [
      { status: 'active', value: 5000 },
      { status: 'active', value: 8000 },
      { status: 'quoted', value: 12000 },
    ];
    const result = buildPipelineSummary(jobs);
    const active = result.find(r => r.status === 'active');
    const quoted = result.find(r => r.status === 'quoted');
    expect(active?.count).toBe(2);
    expect(quoted?.count).toBe(1);
  });

  it('sums values correctly per status', () => {
    const jobs: Job[] = [
      { status: 'active', value: 5000 },
      { status: 'active', value: 3000 },
    ];
    const result = buildPipelineSummary(jobs);
    const active = result.find(r => r.status === 'active');
    expect(active?.value).toBe(8000);
  });

  it('handles null job values as zero', () => {
    const jobs: Job[] = [
      { status: 'enquiry', value: null },
      { status: 'enquiry', value: null },
    ];
    const result = buildPipelineSummary(jobs);
    const enquiry = result.find(r => r.status === 'enquiry');
    expect(enquiry?.value).toBe(0);
  });

  it('returns empty array for no jobs', () => {
    expect(buildPipelineSummary([])).toHaveLength(0);
  });

  it('each result entry has status, count, and value', () => {
    const result = buildPipelineSummary([{ status: 'active', value: 1000 }]);
    expect(result[0]).toHaveProperty('status');
    expect(result[0]).toHaveProperty('count');
    expect(result[0]).toHaveProperty('value');
  });
});

describe('Reporting: month label format', () => {
  it('builds YYYY-MM format correctly', () => {
    const now = new Date(2025, 4, 1); // May 2025 (month is 0-indexed)
    const label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(label).toBe('2025-05');
  });

  it('pads single-digit months', () => {
    const now = new Date(2025, 0, 1); // January
    const label = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    expect(label).toBe('2025-01');
  });
});

// ─── Aged debtor bucketing logic ─────────────────────────────────────────────

type AgedBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';

function bucketInvoice(dueDateStr: string, nowStr: string): AgedBucket {
  const due = new Date(dueDateStr).getTime();
  const now = new Date(nowStr).getTime();
  const diffDays = Math.floor((now - due) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'current';
  if (diffDays <= 30) return '1-30';
  if (diffDays <= 60) return '31-60';
  if (diffDays <= 90) return '61-90';
  return '90+';
}

function grandTotal(buckets: { total: number }[]): number {
  return Math.round(buckets.reduce((sum, b) => sum + b.total, 0) * 100) / 100;
}

describe('Reporting: aged debtor bucketing', () => {
  const now = '2025-06-01';

  it('invoice not yet due → current', () => {
    expect(bucketInvoice('2025-06-15', now)).toBe('current');
  });

  it('invoice due today → current', () => {
    expect(bucketInvoice('2025-06-01', now)).toBe('current');
  });

  it('15 days overdue → 1-30', () => {
    expect(bucketInvoice('2025-05-17', now)).toBe('1-30');
  });

  it('30 days overdue → 1-30', () => {
    expect(bucketInvoice('2025-05-02', now)).toBe('1-30');
  });

  it('45 days overdue → 31-60', () => {
    expect(bucketInvoice('2025-04-17', now)).toBe('31-60');
  });

  it('75 days overdue → 61-90', () => {
    expect(bucketInvoice('2025-03-18', now)).toBe('61-90');
  });

  it('100 days overdue → 90+', () => {
    expect(bucketInvoice('2025-02-20', now)).toBe('90+');
  });

  it('grand total sums all bucket totals', () => {
    const buckets = [
      { total: 500 },
      { total: 1200 },
      { total: 300.50 },
    ];
    expect(grandTotal(buckets)).toBe(2000.50);
  });
});

// ─── CIS deduction logic ─────────────────────────────────────────────────────

function calculateCisDeduction(grossPayment: number, cisStatus: string): number {
  return Math.round(grossPayment * cisRateFor(cisStatus) * 100) / 100;
}

function calculateNetPayment(grossPayment: number, cisStatus: string): number {
  const deduction = calculateCisDeduction(grossPayment, cisStatus);
  return Math.round((grossPayment - deduction) * 100) / 100;
}

function buildMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' });
}

describe('Reporting: CIS deduction calculations', () => {
  it('applies HMRC rates per CIS status', () => {
    expect(cisRateFor('gross')).toBe(0);
    expect(cisRateFor('net')).toBe(0.2);
    expect(cisRateFor('unverified')).toBe(0.3);
    expect(cisRateFor('unmatched')).toBe(0.3);
    expect(cisRateFor(null)).toBe(0.3);
    expect(cisRateFor(undefined)).toBe(0.3);
  });

  it('calculates 20% CIS deduction for verified (net) subcontractors', () => {
    expect(calculateCisDeduction(1000, 'net')).toBe(200);
  });

  it('deducts nothing for gross payment status', () => {
    expect(calculateCisDeduction(1000, 'gross')).toBe(0);
    expect(calculateNetPayment(1000, 'gross')).toBe(1000);
  });

  it('deducts 30% for unverified subcontractors', () => {
    expect(calculateCisDeduction(1000, 'unverified')).toBe(300);
    expect(calculateNetPayment(1000, 'unverified')).toBe(700);
  });

  it('deduction on zero is zero', () => {
    expect(calculateCisDeduction(0, 'net')).toBe(0);
  });

  it('net payment is gross minus deduction', () => {
    expect(calculateNetPayment(1000, 'net')).toBe(800);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateCisDeduction(333.33, 'net')).toBe(66.67);
    expect(calculateNetPayment(333.33, 'net')).toBe(266.66);
  });

  it('totals sum correctly across multiple entries', () => {
    const payments = [1000, 2500, 750];
    const totalGross = payments.reduce((s, p) => s + p, 0);
    const totalDeductions = payments.reduce((s, p) => s + calculateCisDeduction(p, 'net'), 0);
    const totalNet = payments.reduce((s, p) => s + calculateNetPayment(p, 'net'), 0);
    expect(totalGross).toBe(4250);
    expect(totalDeductions).toBe(850);
    expect(totalNet).toBe(3400);
  });

  it('month=5, year=2025 → "May 2025"', () => {
    expect(buildMonthLabel(5, 2025)).toBe('May 2025');
  });

  it('month=1, year=2026 → "January 2026"', () => {
    expect(buildMonthLabel(1, 2026)).toBe('January 2026');
  });
});

// ─── UK tax year bounds logic ─────────────────────────────────────────────────

function getTaxYearBounds(taxYear: string): { start: Date; end: Date } {
  const [startYear] = taxYear.split('-').map(Number);
  return {
    start: new Date(startYear, 3, 6),    // April 6 (month 3 = April in 0-indexed)
    end: new Date(startYear + 1, 3, 5),  // April 5 of next year
  };
}

function isInTaxYear(dateStr: string, taxYear: string): boolean {
  const date = new Date(dateStr).getTime();
  const { start, end } = getTaxYearBounds(taxYear);
  return date >= start.getTime() && date <= end.getTime();
}

describe('Reporting: UK tax year bounds', () => {
  it('2025-26 starts on April 6 2025', () => {
    const { start } = getTaxYearBounds('2025-26');
    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(3); // April (0-indexed)
    expect(start.getDate()).toBe(6);
  });

  it('2025-26 ends on April 5 2026', () => {
    const { end } = getTaxYearBounds('2025-26');
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(3);
    expect(end.getDate()).toBe(5);
  });

  it('2024-25 starts on April 6 2024', () => {
    const { start } = getTaxYearBounds('2024-25');
    expect(start.getFullYear()).toBe(2024);
    expect(start.getDate()).toBe(6);
  });

  it('date within tax year is included', () => {
    expect(isInTaxYear('2025-09-15', '2025-26')).toBe(true);
  });

  it('date before tax year start is excluded', () => {
    expect(isInTaxYear('2025-04-05', '2025-26')).toBe(false);
  });

  it('date after tax year end is excluded', () => {
    expect(isInTaxYear('2026-04-06', '2025-26')).toBe(false);
  });

  it('tax year start date itself is included', () => {
    expect(isInTaxYear('2025-04-06', '2025-26')).toBe(true);
  });

  it('tax year end date itself is included', () => {
    expect(isInTaxYear('2026-04-05', '2025-26')).toBe(true);
  });
});
