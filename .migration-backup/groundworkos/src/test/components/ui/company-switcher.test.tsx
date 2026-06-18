import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompanySwitcher } from '@/components/ui/company-switcher';

// Mock the useCompany hook so we control setCompany without cookie/reload side-effects
const mockSetCompany = vi.fn();
vi.mock('@/hooks/useCompany', () => ({
  useCompany: () => ({ companyId: 'co-1', setCompany: mockSetCompany }),
}));

const companies = [
  { id: 'co-1', name: 'Smith Groundworks Ltd' },
  { id: 'co-2', name: 'Jones Drainage Ltd' },
];

describe('CompanySwitcher', () => {
  it('does not render when only one company is provided', () => {
    const { container } = render(
      <CompanySwitcher companies={[companies[0]]} currentCompanyId="co-1" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a select element when two or more companies are provided', () => {
    render(<CompanySwitcher companies={companies} currentCompanyId="co-1" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders all company names as options', () => {
    render(<CompanySwitcher companies={companies} currentCompanyId="co-1" />);
    expect(screen.getByRole('option', { name: 'Smith Groundworks Ltd' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Jones Drainage Ltd' })).toBeInTheDocument();
  });

  it('marks the current company as selected', () => {
    render(<CompanySwitcher companies={companies} currentCompanyId="co-2" />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('co-2');
  });

  it('calls setCompany with the new id when selection changes', () => {
    render(<CompanySwitcher companies={companies} currentCompanyId="co-1" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'co-2' } });
    expect(mockSetCompany).toHaveBeenCalledWith('co-2');
  });
});
