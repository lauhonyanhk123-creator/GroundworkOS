import { describe, it, expect } from 'vitest';

describe('Clients: data validation', () => {
  it('company_name is required', () => {
    const validate = (data: { company_name?: string }) =>
      typeof data.company_name === 'string' && data.company_name.trim().length > 0;

    expect(validate({ company_name: 'Acme Ltd' })).toBe(true);
    expect(validate({ company_name: '' })).toBe(false);
    expect(validate({})).toBe(false);
  });

  it('optional fields can be null', () => {
    const client = {
      company_name: 'Acme Ltd',
      contact_name: null,
      email: null,
      phone: null,
      address: null,
      companies_house_number: null,
      notes: null,
    };
    expect(client.company_name).toBeTruthy();
    expect(client.contact_name).toBeNull();
  });
});

describe('Clients: search logic', () => {
  const clients = [
    { company_name: 'Acme Construction', contact_name: 'John Smith' },
    { company_name: 'Builder Corp', contact_name: 'Jane Doe' },
    { company_name: 'Groundwork Ltd', contact_name: null },
  ];

  function searchClients(query: string) {
    const q = query.toLowerCase();
    return clients.filter(c =>
      c.company_name.toLowerCase().includes(q) ||
      (c.contact_name?.toLowerCase().includes(q) ?? false)
    );
  }

  it('finds clients by company name', () => {
    expect(searchClients('acme')).toHaveLength(1);
    expect(searchClients('acme')[0].company_name).toBe('Acme Construction');
  });

  it('finds clients by contact name', () => {
    expect(searchClients('jane')).toHaveLength(1);
  });

  it('returns empty array for no match', () => {
    expect(searchClients('zzznomatch')).toHaveLength(0);
  });

  it('returns all matching clients', () => {
    expect(searchClients('ground')).toHaveLength(1);
  });

  it('search is case-insensitive', () => {
    expect(searchClients('ACME')).toHaveLength(1);
  });
});
