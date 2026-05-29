'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Briefcase, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';

type Client = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  companies_house_number: string;
  notes: string;
  created_at: string;
  jobs: Array<{
    id: string;
    job_number: string;
    title: string;
    status: string;
    value: number;
    progress_percent: number;
  }>;
  invoices: Array<{
    id: string;
    invoice_number: string;
    total_amount: number;
    status: string;
    due_date: string;
  }>;
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: Building2 },
  { id: 'jobs', label: 'Jobs', icon: Briefcase },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
];

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [client, setClient] = useState<Client | null>(null);

  useEffect(() => {
    const loadClient = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setClient({
        id: clientId,
        company_name: 'Barrett Homes',
        contact_name: 'John Smith',
        email: 'john@barretthomes.co.uk',
        phone: '01234 567890',
        address: '12 Business Park, Reading RG1 2LP',
        companies_house_number: '01234567',
        notes: 'Preferred client. Priority service on all jobs.',
        created_at: '2023-06-15',
        jobs: [
          { id: '1', job_number: 'GW-0015', title: 'Newbury Site Preparation', status: 'active', value: 45000, progress_percent: 65 },
          { id: '2', job_number: 'GW-0012', title: 'Reading Foundations', status: 'complete', value: 32000, progress_percent: 100 },
          { id: '3', job_number: 'GW-0018', title: 'Bracknell Drainage', status: 'quoted', value: 18000, progress_percent: 0 },
        ],
        invoices: [
          { id: '1', invoice_number: 'INV-0025', total_amount: 32000, status: 'paid', due_date: '2024-01-01' },
          { id: '2', invoice_number: 'INV-0028', total_amount: 22500, status: 'overdue', due_date: '2024-01-15' },
        ],
      });
      setIsLoading(false);
    };
    loadClient();
  }, [clientId]);

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-48 rounded" />
        <Skeleton className="h-64 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-condensed font-bold">{client!.company_name}</h1>
            <p className="text-muted text-sm mt-1">{client!.contact_name}</p>
          </div>
        </div>
        <Button>Edit Client</Button>
      </div>

      {/* Contact Info Card */}
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-yellow" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Company</div>
              <div className="font-medium">{client!.company_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Email</div>
              <div className="font-medium">{client!.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Phone</div>
              <div className="font-medium">{client!.phone}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Address</div>
              <div className="font-medium truncate">{client!.address}</div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Tab Bar */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded p-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-yellow text-black'
                  : 'text-muted hover:text-text'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Panel>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Notes</h4>
              <p className="text-sm">{client!.notes}</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Companies House</h4>
                <p className="font-mono text-sm">{client!.companies_house_number || 'Not registered'}</p>
              </div>
              <div>
                <h4 className="text-xs font-mono text-muted uppercase tracking-wider mb-2">Client Since</h4>
                <p className="font-mono text-sm">{formatDate(client!.created_at)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-condensed font-bold">{client!.jobs.length}</div>
                <div className="text-xs text-muted mt-1">Total Jobs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-condensed font-bold">
                  {formatCurrency(client!.jobs.reduce((sum, job) => sum + job.value, 0))}
                </div>
                <div className="text-xs text-muted mt-1">Total Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-condensed font-bold">
                  {client!.invoices.filter(inv => inv.status === 'paid').length}/{client!.invoices.length}
                </div>
                <div className="text-xs text-muted mt-1">Paid Invoices</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-3">
            {client!.jobs.map(job => (
              <div key={job.id} className="flex items-center gap-4 p-4 bg-surface-2 rounded">
                <div className="font-mono text-sm text-muted w-20">{job.job_number}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{job.title}</div>
                  <div className="text-xs text-muted">{formatCurrency(job.value)}</div>
                </div>
                <div className="w-24">
                  <div className="w-full bg-surface-3 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-yellow" style={{ width: `${job.progress_percent}%` }} />
                  </div>
                  <div className="text-xs text-muted text-right mt-1">{job.progress_percent}%</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-3">
            {client!.invoices.map(invoice => (
              <div key={invoice.id} className="flex items-center gap-4 p-4 bg-surface-2 rounded">
                <div className="font-mono text-sm text-muted w-24">{invoice.invoice_number}</div>
                <div className="flex-1" />
                <div className="text-right">
                  <div className="font-mono font-medium">{formatCurrency(invoice.total_amount)}</div>
                  <div className="text-xs text-muted">{formatDate(invoice.due_date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
