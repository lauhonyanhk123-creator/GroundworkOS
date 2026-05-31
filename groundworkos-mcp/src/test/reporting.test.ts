import { describe, it, expect } from 'vitest';

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
