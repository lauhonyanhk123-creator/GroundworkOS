'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Upload, FileText, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Document = {
  id: string;
  name: string;
  type: string;
  related_to: string;
  related_name: string;
  expiry_date: string;
  status: string;
};

export default function DocumentsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<'green' | 'amber' | 'red'>('amber');
  const [filter, setFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    const loadDocuments = async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      setDocuments([
        {
          id: '1',
          name: 'Public Liability Insurance',
          type: 'insurance',
          related_to: 'company',
          related_name: 'GroundworkOS Ltd',
          expiry_date: '2024-12-31',
          status: 'valid',
        },
        {
          id: '2',
          name: 'Employers Liability Insurance',
          type: 'insurance',
          related_to: 'company',
          related_name: 'GroundworkOS Ltd',
          expiry_date: '2024-06-30',
          status: 'expiring_soon',
        },
        {
          id: '3',
          name: 'CIS Certificate',
          type: 'cis',
          related_to: 'company',
          related_name: 'GroundworkOS Ltd',
          expiry_date: '2025-03-15',
          status: 'valid',
        },
        {
          id: '4',
          name: 'RAMS Document - Newbury',
          type: 'rams',
          related_to: 'job',
          related_name: 'GW-0015',
          expiry_date: '2024-08-01',
          status: 'expiring_soon',
        },
        {
          id: '5',
          name: 'CSCS Card - John Smith',
          type: 'cscs',
          related_to: 'subcontractor',
          related_name: 'ABC Excavations',
          expiry_date: '2023-01-15',
          status: 'expired',
        },
      ]);
      setComplianceStatus('amber');
      setIsLoading(false);
    };
    loadDocuments();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'text-success';
      case 'expiring_soon':
        return 'text-warning';
      case 'expired':
        return 'text-danger';
      default:
        return 'text-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'expiring_soon':
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'expired':
        return <AlertTriangle className="w-4 h-4 text-danger" />;
      default:
        return null;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (filter === 'all') return true;
    if (filter === 'expiring') return doc.status === 'expiring_soon';
    if (filter === 'expired') return doc.status === 'expired';
    return doc.type === filter;
  });

  const expiredCount = documents.filter(d => d.status === 'expired').length;
  const expiringCount = documents.filter(d => d.status === 'expiring_soon').length;
  const validCount = documents.filter(d => d.status === 'valid').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Documents</h1>
          <p className="text-muted text-sm mt-1">Manage compliance documents and certificates</p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Compliance Status */}
      <Panel>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center',
              complianceStatus === 'green' && 'bg-success/20',
              complianceStatus === 'amber' && 'bg-warning/20',
              complianceStatus === 'red' && 'bg-danger/20'
            )}>
              <Shield className={cn(
                'w-8 h-8',
                complianceStatus === 'green' && 'text-success',
                complianceStatus === 'amber' && 'text-warning',
                complianceStatus === 'red' && 'text-danger'
              )} />
            </div>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wider mb-1">Compliance Status</div>
              <h3 className={cn(
                'text-2xl font-condensed font-bold',
                complianceStatus === 'green' && 'text-success',
                complianceStatus === 'amber' && 'text-warning',
                complianceStatus === 'red' && 'text-danger'
              )}>
                {complianceStatus === 'green' && 'All Clear'}
                {complianceStatus === 'amber' && 'Needs Attention'}
                {complianceStatus === 'red' && 'Non-Compliant'}
              </h3>
            </div>
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <div className="text-3xl font-condensed font-bold text-success">{validCount}</div>
              <div className="text-xs text-muted mt-1">Valid</div>
            </div>
            <div>
              <div className="text-3xl font-condensed font-bold text-warning">{expiringCount}</div>
              <div className="text-xs text-muted mt-1">Expiring Soon</div>
            </div>
            <div>
              <div className="text-3xl font-condensed font-bold text-danger">{expiredCount}</div>
              <div className="text-xs text-muted mt-1">Expired</div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Filters */}
      <div className="flex items-center gap-2 bg-surface border border-border rounded p-1">
        {['all', 'insurance', 'rams', 'cis', 'cscs', 'expiring', 'expired'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded text-sm font-medium transition-colors capitalize',
              filter === f
                ? 'bg-yellow text-black'
                : 'text-muted hover:text-text'
            )}
          >
            {f === 'expiring' ? 'Expiring Soon' : f === 'expired' ? 'Expired' : f}
          </button>
        ))}
      </div>

      {/* Documents Table */}
      <Panel>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded" />
            ))}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map(doc => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 bg-surface-2 rounded hover:bg-surface-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-surface-3 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{doc.name}</div>
                  <div className="text-xs text-muted">
                    {doc.type.toUpperCase()} • {doc.related_to === 'company' ? 'Company' : doc.related_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono">Expires: {formatDate(doc.expiry_date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.status)}
                  <Badge status={doc.status} />
                </div>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No documents found</p>
          </div>
        )}
      </Panel>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded w-full max-w-lg">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-condensed font-bold">Upload Document</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Document Name</label>
                <input
                  type="text"
                  placeholder="e.g., Public Liability Insurance"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Document Type</label>
                <select className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow">
                  <option value="">Select type...</option>
                  <option value="insurance">Insurance</option>
                  <option value="rams">RAMS</option>
                  <option value="cis">CIS Certificate</option>
                  <option value="cscs">CSCS Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Related To</label>
                <select className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow">
                  <option value="company">Company</option>
                  <option value="job">Job</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Expiry Date</label>
                <input
                  type="date"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">File Upload</label>
                <div className="border-2 border-dashed border-border rounded p-8 text-center">
                  <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted">Drop file here or click to browse</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowUploadModal(false)}>Cancel</Button>
              <Button onClick={() => setShowUploadModal(false)}>Upload</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
