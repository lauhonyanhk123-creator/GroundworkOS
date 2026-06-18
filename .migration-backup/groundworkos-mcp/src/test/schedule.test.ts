import { describe, it, expect } from 'vitest';

// Schedule availability check logic from schedule-mcp

interface ScheduleEntry {
  start_datetime: string;
  end_datetime: string;
}

function checkOverlap(a: ScheduleEntry, b: ScheduleEntry): boolean {
  const aStart = new Date(a.start_datetime).getTime();
  const aEnd = new Date(a.end_datetime).getTime();
  const bStart = new Date(b.start_datetime).getTime();
  const bEnd = new Date(b.end_datetime).getTime();
  return aStart < bEnd && aEnd > bStart;
}

describe('Schedule: overlap detection', () => {
  it('detects exact same times as overlapping', () => {
    const a = { start_datetime: '2025-06-01T08:00:00', end_datetime: '2025-06-01T17:00:00' };
    const b = { start_datetime: '2025-06-01T08:00:00', end_datetime: '2025-06-01T17:00:00' };
    expect(checkOverlap(a, b)).toBe(true);
  });

  it('detects partial overlap', () => {
    const a = { start_datetime: '2025-06-01T08:00:00', end_datetime: '2025-06-01T14:00:00' };
    const b = { start_datetime: '2025-06-01T12:00:00', end_datetime: '2025-06-01T18:00:00' };
    expect(checkOverlap(a, b)).toBe(true);
  });

  it('non-overlapping entries return false', () => {
    const a = { start_datetime: '2025-06-01T08:00:00', end_datetime: '2025-06-01T12:00:00' };
    const b = { start_datetime: '2025-06-01T13:00:00', end_datetime: '2025-06-01T17:00:00' };
    expect(checkOverlap(a, b)).toBe(false);
  });

  it('back-to-back entries do not overlap', () => {
    const a = { start_datetime: '2025-06-01T08:00:00', end_datetime: '2025-06-01T12:00:00' };
    const b = { start_datetime: '2025-06-01T12:00:00', end_datetime: '2025-06-01T17:00:00' };
    expect(checkOverlap(a, b)).toBe(false);
  });

  it('one entry completely inside another is overlapping', () => {
    const a = { start_datetime: '2025-06-01T08:00:00', end_datetime: '2025-06-01T18:00:00' };
    const b = { start_datetime: '2025-06-01T10:00:00', end_datetime: '2025-06-01T12:00:00' };
    expect(checkOverlap(a, b)).toBe(true);
  });
});

describe('Schedule: date parsing', () => {
  it('parses ISO datetime string to valid Date', () => {
    const date = new Date('2025-06-01T08:00:00');
    expect(isNaN(date.getTime())).toBe(false);
  });

  it('start_datetime must be before end_datetime', () => {
    const start = new Date('2025-06-01T08:00:00');
    const end = new Date('2025-06-01T17:00:00');
    expect(start < end).toBe(true);
  });
});
