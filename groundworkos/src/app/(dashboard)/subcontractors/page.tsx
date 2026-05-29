'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Subcontractor = {
  id: string;
  company_name: string;
  contact_name: string;
  trade: string;
  cis_status: string;
  utr_number: string;
  document_count: number;
  has_expiring_documents: boolean;
};

export default function SubcontractorsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const loadSubcontractors = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      const subs = [
        {
          id: '1',
          company_name: 'ABC Excavations Ltd',
          contact_name: 'Mike Johnson',
          trade: 'Excavation',
          cis_status: 'verified',
          utr_number: '12345678901',
          document_count: 4,
          has_expiring_documents: false,
        },
        {
          id: '2',
          company_name: 'XYZ Drainage Co',
          contact_name: 'Sarah Brown',
          trade: 'Drainage',
          cis_status: 'unverified',
          utr_number: '98765432109',
          document_count: 2,
          has_expiring_documents: true,
        },
        {
          id: '3',
          company_name: 'Quick Concrete Services',
          contact_name: 'Tom Wilson',
          trade: 'Concrete',
          cis_status: 'gross',
          utr_number: '56789123456',
          document_count: 3,
          has_expiring_documents: false,
        },
      ];
      setSubcontractors(subs);
      setShowWarning(subs.some(sub => sub.cis_status === 'unverified' || sub.has_expiring_documents));
      setIsLoading(false);
    };
    loadSubcontractors();
  }, []);

  const getCISIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'net':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'unverified':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'gross':
        return <XCircle className="w-4 h-4 text-danger" />;
      default:
        return null;
    }
  };

  const getCISLabel = (status: string) => {
    switch (status) {
      case 'verified':
        return 'CIS Verified';
      case 'net':
        return 'Net Status';
      case 'gross':
        return 'Gross Status';
      case 'unverified':
        return 'Unverified';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Subcontractors</h1>
          <p className="text-muted text-sm mt-1">Manage your subbies and CIS compliance</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Subcontractor
        </Button>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-warning/10 border border-warning/30 rounded p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <div>
            <div className="font-semibold">Action Required</div>
            <p className="text-sm text-muted">
              One or more subcontractors need attention - unverified CIS status or expiring documents.
            </p>
          </div>
        </div>
      )}

      {/* Subcontractors Table */}
      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded" />
            ))}
          </div>
        ) : subcontractors.length > 0 ? (
          <div className="space-y-3">
            {subcontractors.map(sub => (
              <div
                key={sub.id}
                className="flex items-center gap-4 p-4 bg-surface-2 rounded hover:bg-surface-3 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{sub.company_name}</h3>
                    {sub.has_expiring_documents && (
                      <AlertTriangle className="w-4 h-4 text-warning" />
                    )}
                  </div>
                  <div className="text-sm text-muted">{sub.contact_name}</div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-muted uppercase tracking-wide">Trade</div>
                  <div>{sub.trade}</div>
                </div>
                <div className="text-sm min-w-[120px]">
                  <div className="text-xs text-muted uppercase tracking-wide">UTR Number</div>
                  <div className="font-mono">{sub.utr_number}</div>
                </div>
                <div className="text-sm min-w-[140px]">
                  <div className="text-xs text-muted uppercase tracking-wide">CIS Status</div>
                  <div className="flex items-center gap-2">
                    {getCISIcon(sub.cis_status)}
                    <span>{getCISLabel(sub.cis_status)}</span>
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-xs text-muted uppercase tracking-wide">Documents</div>
                  <div>{sub.document_count} files</div>
                </div>
                <div className="flex gap-2">
                  {sub.cis_status === 'unverified' && (
                    <Button variant="ghost" size="sm">
                      Verify CIS
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <p>No subcontractors found</p>
          </div>
        )}
      </Panel>

      {/* CIS Legend */}
      <Panel title="CIS Status Guide">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Verified (Net)</div>
              <div className="text-muted">20% CIS deduction applied</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Gross</div>
              <div className="text-muted">30% CIS deduction applied</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Unverified</div>
              <div className="text-muted">Verify with HMRC before use</div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-muted flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium">Matched</div>
              <div className="text-muted">UTR verified in HMRC system</div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
