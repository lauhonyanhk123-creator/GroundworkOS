import { describe, it, expect } from 'vitest';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false, null, undefined, 'bar')).toBe('foo bar');
  });

  it('resolves tailwind conflicts (last wins)', () => {
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
  });

  it('returns empty string for no valid classes', () => {
    expect(cn(false, null, undefined)).toBe('');
  });
});

describe('formatCurrency', () => {
  it('formats whole pounds', () => {
    expect(formatCurrency(1000)).toBe('£1,000.00');
  });

  it('formats pence', () => {
    expect(formatCurrency(1234.56)).toBe('£1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('£0.00');
  });

  it('formats large values with commas', () => {
    expect(formatCurrency(1000000)).toBe('£1,000,000.00');
  });

  it('starts with £ symbol', () => {
    expect(formatCurrency(500)).toMatch(/^£/);
  });
});

describe('formatDate', () => {
  it('formats an ISO date string to UK format', () => {
    const result = formatDate('2025-06-15');
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
  });

  it('accepts a Date object', () => {
    const result = formatDate(new Date('2025-12-25'));
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/25/);
  });

  it('returns a non-empty string', () => {
    expect(formatDate('2025-01-01')).toBeTruthy();
  });
});

