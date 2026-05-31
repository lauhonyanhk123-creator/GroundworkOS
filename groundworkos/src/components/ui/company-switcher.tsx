'use client';

import { useCompany } from '@/hooks/useCompany';

interface CompanyOption {
  id: string;
  name: string;
}

interface CompanySwitcherProps {
  companies: CompanyOption[];
  currentCompanyId: string;
}

export function CompanySwitcher({ companies, currentCompanyId }: CompanySwitcherProps) {
  const { setCompany } = useCompany();

  if (companies.length <= 1) return null;

  return (
    <div className="px-2 pb-3">
      <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2 px-1">
        Company
      </label>
      <select
        value={currentCompanyId}
        onChange={(e) => setCompany(e.target.value)}
        className="w-full bg-surface-2 border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-yellow"
      >
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.name}
          </option>
        ))}
      </select>
    </div>
  );
}
