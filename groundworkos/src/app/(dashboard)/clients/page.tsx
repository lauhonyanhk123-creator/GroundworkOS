'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Building2, Mail, Phone, MapPin } from 'lucide-react';

type Client = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  companies_house_number: string;
  job_count: number;
  total_invoiced: number;
};

export default function ClientsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showCompaniesHouseSearch, setShowCompaniesHouseSearch] = useState(false);
  const [companiesHouseResults, setCompaniesHouseResults] = useState<any[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    const loadClients = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setClients([
        {
          id: '1',
          company_name: 'Barrett Homes',
          contact_name: 'John Smith',
          email: 'john@barretthomes.co.uk',
          phone: '01234 567890',
          address: '12 Business Park, Reading RG1 2LP',
          companies_house_number: '01234567',
          job_count: 5,
          total_invoiced: 125000,
        },
        {
          id: '2',
          company_name: 'Weston Homes',
          contact_name: 'Sarah Jones',
          email: 'sarah@westonhomes.co.uk',
          phone: '01865 432100',
          address: '45 High Street, Oxford OX1 1AA',
          companies_house_number: '09876543',
          job_count: 3,
          total_invoiced: 85000,
        },
        {
          id: '3',
          company_name: 'Local Council',
          contact_name: 'David Brown',
          email: 'd.brown@localcouncil.gov.uk',
          phone: '01793 654321',
          address: 'Council Offices, Swindon SN1 1AB',
          companies_house_number: '',
          job_count: 2,
          total_invoiced: 45000,
        },
        {
          id: '4',
          company_name: 'Bloor Homes',
          contact_name: 'Emma Wilson',
          email: 'emma@bloorhomes.co.uk',
          phone: '01684 987654',
          address: '78 Industrial Estate, Worcester WR1 2YZ',
          companies_house_number: '02468135',
          job_count: 4,
          total_invoiced: 98000,
        },
      ]);
      setIsLoading(false);
    };
    loadClients();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 2 && showCompaniesHouseSearch) {
      const fetchCompaniesHouse = async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        setCompaniesHouseResults([
          { company_name: searchQuery + ' Construction Ltd', company_number: '12345678', address: 'London' },
          { company_name: searchQuery + ' Developments PLC', company_number: '87654321', address: 'Birmingham' },
        ]);
      };
      fetchCompaniesHouse();
    } else {
      setCompaniesHouseResults([]);
    }
  }, [searchQuery, showCompaniesHouseSearch]);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
  };

  const filteredClients = clients.filter(client =>
    client.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCompanySelect = (company: any) => {
    setShowNewClientModal(true);
    setShowCompaniesHouseSearch(false);
    setCompaniesHouseResults([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Clients</h1>
          <p className="text-muted text-sm mt-1">Manage your client database</p>
        </div>
        <Button onClick={() => setShowNewClientModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Client
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Search clients or search Companies House..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface border border-border rounded pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-yellow"
        />
        <button
          onClick={() => setShowCompaniesHouseSearch(!showCompaniesHouseSearch)}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-mono bg-surface-2 border border-border rounded"
        >
          {showCompaniesHouseSearch ? 'Local' : 'CH'}
        </button>

        {/* Companies House Results */}
        {showCompaniesHouseSearch && companiesHouseResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border rounded shadow-lg z-10">
            {companiesHouseResults.map((company, index) => (
              <button
                key={index}
                onClick={() => handleCompanySelect(company)}
                className="w-full p-3 text-left hover:bg-surface-2 transition-colors border-b border-border last:border-0"
              >
                <div className="font-medium">{company.company_name}</div>
                <div className="text-xs text-muted">Company No: {company.company_number}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded" />
          ))
        ) : filteredClients.length > 0 ? (
          filteredClients.map(client => (
            <div
              key={client.id}
              className="bg-surface border border-border rounded p-4 hover:border-yellow transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-yellow" />
                  <h3 className="font-medium">{client.company_name}</h3>
                </div>
                {client.companies_house_number && (
                  <span className="text-xs font-mono text-muted">{client.companies_house_number}</span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <span className="font-medium">{client.contact_name}</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Phone className="w-3 h-3" />
                  <span className="truncate">{client.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted">
                  <Mail className="w-3 h-3" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-start gap-2 text-muted">
                  <MapPin className="w-3 h-3 mt-0.5" />
                  <span className="truncate text-xs">{client.address}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="text-xs">
                  <span className="text-muted">{client.job_count} jobs</span>
                </div>
                <div className="text-xs font-mono">
                  <span className="text-muted">Total: </span>
                  <span>{formatCurrency(client.total_invoiced)}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-muted">
            <p>No clients found matching your criteria</p>
          </div>
        )}
      </div>

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Create New Client</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="Enter company name..."
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Contact Name</label>
                <input
                  type="text"
                  placeholder="Enter contact name..."
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="tel"
                    placeholder="01234 567890"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Address</label>
                <textarea
                  placeholder="Enter address..."
                  rows={3}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-1">Companies House Number</label>
                <input
                  type="text"
                  placeholder="Optional"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowNewClientModal(false)}>Cancel</Button>
              <Button onClick={() => setShowNewClientModal(false)}>Create Client</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
