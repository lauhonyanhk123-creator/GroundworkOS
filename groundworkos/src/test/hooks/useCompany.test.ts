import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompany } from '@/hooks/useCompany';

// jsdom doesn't implement location.reload — define it as a mock
const reloadMock = vi.fn();

beforeEach(() => {
  // Clear all cookies
  document.cookie.split(';').forEach((c) => {
    const key = c.split('=')[0].trim();
    document.cookie = `${key}=;expires=${new Date(0).toUTCString()};path=/`;
  });

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: reloadMock },
  });
  reloadMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useCompany', () => {
  it('returns null when no cookie is set', () => {
    const { result } = renderHook(() => useCompany());
    expect(result.current.companyId).toBeNull();
  });

  it('returns the companyId when cookie is set', () => {
    document.cookie = 'selected_company_id=co-abc123; path=/';
    const { result } = renderHook(() => useCompany());
    expect(result.current.companyId).toBe('co-abc123');
  });

  it('setCompany writes the company id to the cookie', () => {
    const { result } = renderHook(() => useCompany());
    act(() => {
      result.current.setCompany('co-new-456');
    });
    expect(document.cookie).toContain('selected_company_id');
  });

  it('setCompany calls window.location.reload', () => {
    const { result } = renderHook(() => useCompany());
    act(() => {
      result.current.setCompany('co-xyz');
    });
    expect(reloadMock).toHaveBeenCalledOnce();
  });

  it('exposes setCompany as a stable callback reference', () => {
    const { result, rerender } = renderHook(() => useCompany());
    const first = result.current.setCompany;
    rerender();
    expect(result.current.setCompany).toBe(first);
  });
});
