'use client';

import { useCallback } from 'react';

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookieValue(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

interface UseCompanyResult {
  companyId: string | null;
  setCompany: (id: string) => void;
}

export function useCompany(): UseCompanyResult {
  const companyId = getCookieValue('selected_company_id');

  const setCompany = useCallback((id: string) => {
    setCookieValue('selected_company_id', id);
    window.location.reload();
  }, []);

  return { companyId, setCompany };
}
