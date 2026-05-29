'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Mail, Phone, FileText, Calendar, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Subcontractor = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  trade: string;
  utr_number: string;
  cis_status: string;
  cis_verified_at: string | null;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    expiry_date: string;
    status: string;
  }>;
  jobs: Array<{
    id: string;
    job_number: string;
    title: string;
  }>;
};

export default function SubcontractorDetailPage() {
  const params = useParams();
  const subcontractorId = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null);

  useEffect(() => {
    const loadSubcontractor = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setSubcontractor({
        id: subcontractorId,
        company_name: 'ABC Excavations Ltd',
        contact_name: 'Mike Johnson',
        email: 'mike@abcexcavations.co.uk',
        phone: '07700 900123',
        trade: 'Excavation',
        utr_number: '12345678901',
        cis_status: 'verified',
        cis_verified_at: '2024-01-05',
        documents: [
          { id: '1', name: 'Public Liability Insurance', type: 'insurance', expiry_date: '2024-12-31', status: 'valid' },
          { id: '2', name: 'Employers Liability Insurance', type: 'insurance', expiry_date: '2024-06-30', status: 'expiring_soon' },
          { id: '3', name: 'CSCS Card', type: 'cscs', expiry_date: '2025-03-15', status: 'valid' },
        ],
        jobs: [
          { id: '1', job_number: 'GW-0015', title: 'Newbury Site Preparation' },
          { id: '2', job_number: 'GW-0014', title: 'Swindon Depot Upgrade' },
        ],
      });
      setIsLoading(false);
    };
    loadSubcontractor();
  }, [subcontractorId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    return <Badge status={status} />;
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
            <h1 className="text-2xl font-condensed font-bold">{subcontractor!.company_name}</h1>
            <p className="text-muted text-sm mt-1">{subcontractor!.trade}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost">
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-verify CIS
          </Button>
          <Button>Edit Subcontractor</Button>
        </div>
      </div>

      {/* Info Card */}
      <Panel>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <span className="text-lg font-bold">{subcontractor!.contact_name.charAt(0)}</span>
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Contact</div>
              <div className="font-medium">{subcontractor!.contact_name}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <Mail className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Email</div>
              <div className="font-medium">{subcontractor!.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center">
              <Phone className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider">Phone</div>
              <div className="font-medium">{subcontractor!.phone}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-mono text-muted uppercase tracking-wider">UTR Number</div>
            <div className="font-mono font-medium">{subcontractor!.utr_number}</div>
          </div>
        </div>
      </Panel>

      {/* CIS Status Card */}
      <Panel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-yellow/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-yellow">CIS</span>
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Construction Industry Scheme</div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-condensed font-bold">
                  {subcontractor!.cis_status === 'verified' ? 'CIS Verified' : 'CIS ' + subcontractor!.cis_status.charAt(0).toUpperCase() + subcontractor!.cis_status.slice(1)}
                </h3>
                {getStatusBadge(subcontractor!.cis_status)}
              </div>
              {subcontractor!.cis_verified_at && (
                <p className="text-sm text-muted mt-1">
                  Last verified: {formatDate(subcontractor!.cis_verified_at)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Deduction Rate</p>
            <p className="text-3xl font-condensed font-bold">
              {subcontractor!.cis_status === 'gross' ? '30%' : '20%'}
            </p>
          </div>
        </div>
      </Panel>

      {/* Documents & Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents */}
        <Panel title="Documents">
          <div className="space-y-3">
            {subcontractor!.documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-surface-2 rounded">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted" />
                  <div>
                    <div className="font-medium text-sm">{doc.name}</div>
                    <div className="text-xs text-muted uppercase">{doc.type}</div>
                  </div>
                </div>
                <div className="text-right">
                  {doc.expiry_date && (
                    <div className="text-xs font-mono text-muted">
                      Exp: {formatDate(doc.expiry_date)}
                    </div>
                  )}
                  {getStatusBadge(doc.status)}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Jobs */}
        <Panel title="Jobs">
          <div className="space-y-3">
            {subcontractor!.jobs.map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-surface-2 rounded">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted" />
                  <div>
                    <div className="font-mono text-sm text-muted">{job.job_number}</div>
                    <div className="font-medium text-sm">{job.title}</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
