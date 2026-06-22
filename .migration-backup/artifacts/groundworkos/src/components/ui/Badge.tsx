import { cn } from '../../lib/utils';
import type { JobStatus, QuoteStatus, InvoiceStatus, DocumentStatus, CISStatus, PlantStatus } from '../../types';

type BadgeStatus = JobStatus | QuoteStatus | InvoiceStatus | DocumentStatus | CISStatus | PlantStatus | string;

const statusConfig: Record<string, { label: string; className: string }> = {
  enquiry: { label: 'Enquiry', className: 'bg-[#1a1a2e] text-[#60a5fa] border border-[#60a5fa]/30' },
  quoted: { label: 'Quoted', className: 'bg-[#1a1400] text-[#FFD600] border border-[#FFD600]/30' },
  active: { label: 'Active', className: 'bg-[#0d1f0d] text-[#4ade80] border border-[#4ade80]/30' },
  on_hold: { label: 'On Hold', className: 'bg-[#1f1500] text-[#fb923c] border border-[#fb923c]/30' },
  complete: { label: 'Complete', className: 'bg-[#141414] text-[#888888] border border-[#2a2a2a]' },
  cancelled: { label: 'Cancelled', className: 'bg-[#1a0000] text-[#ff4444] border border-[#ff4444]/20' },
  draft: { label: 'Draft', className: 'bg-[#1c1c1c] text-[#888888] border border-[#2a2a2a]' },
  sent: { label: 'Sent', className: 'bg-[#1a1400] text-[#FFD600] border border-[#FFD600]/30' },
  accepted: { label: 'Accepted', className: 'bg-[#0d1f0d] text-[#4ade80] border border-[#4ade80]/30' },
  declined: { label: 'Declined', className: 'bg-[#1a0000] text-[#ff4444] border border-[#ff4444]/20' },
  expired: { label: 'Expired', className: 'bg-[#1a0000] text-[#ff4444] border border-[#ff4444]/20' },
  paid: { label: 'Paid', className: 'bg-[#0d1f0d] text-[#4ade80] border border-[#4ade80]/30' },
  overdue: { label: 'Overdue', className: 'bg-[#1a0000] text-[#ff4444] border border-[#ff4444]/30' },
  credited: { label: 'Credited', className: 'bg-[#1c1c1c] text-[#888888] border border-[#2a2a2a]' },
  valid: { label: 'Valid', className: 'bg-[#0d1f0d] text-[#4ade80] border border-[#4ade80]/30' },
  expiring_soon: { label: 'Expiring', className: 'bg-[#1f1500] text-[#fb923c] border border-[#fb923c]/30' },
  pending: { label: 'Pending', className: 'bg-[#1c1c1c] text-[#888888] border border-[#2a2a2a]' },
  gross: { label: 'Gross', className: 'bg-[#0d1f0d] text-[#4ade80] border border-[#4ade80]/30' },
  net: { label: 'Net 20%', className: 'bg-[#1a1400] text-[#FFD600] border border-[#FFD600]/30' },
  unmatched: { label: 'Unmatched', className: 'bg-[#1f1500] text-[#fb923c] border border-[#fb923c]/30' },
  unverified: { label: 'Unverified', className: 'bg-[#1a0000] text-[#ff4444] border border-[#ff4444]/30' },
  available: { label: 'Available', className: 'bg-[#0d1f0d] text-[#4ade80] border border-[#4ade80]/30' },
  on_site: { label: 'On Site', className: 'bg-[#1a1400] text-[#FFD600] border border-[#FFD600]/30' },
  maintenance: { label: 'Workshop', className: 'bg-[#1f1500] text-[#fb923c] border border-[#fb923c]/30' },
  hired_in: { label: 'Hired In', className: 'bg-[#1a1a2e] text-[#60a5fa] border border-[#60a5fa]/30' },
  disposed: { label: 'Disposed', className: 'bg-[#141414] text-[#666666] border border-[#2a2a2a]' },
};

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-[#1c1c1c] text-[#888888] border border-[#2a2a2a]' };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wider font-medium', config.className, className)}>
      {config.label}
    </span>
  );
}
