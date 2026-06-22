import { cn } from '../../lib/utils';
import type { JobStatus, QuoteStatus, InvoiceStatus, DocumentStatus, CISStatus, PlantStatus } from '../../types';

type BadgeStatus = JobStatus | QuoteStatus | InvoiceStatus | DocumentStatus | CISStatus | PlantStatus | string;

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  enquiry:      { label: 'Enquiry',   color: '#4d90d4', bg: 'rgba(77,144,212,0.08)' },
  quoted:       { label: 'Quoted',    color: '#c4a800', bg: 'rgba(255,214,0,0.07)' },
  active:       { label: 'Active',    color: '#3db56d', bg: 'rgba(61,181,109,0.08)' },
  on_hold:      { label: 'On Hold',   color: '#e07b39', bg: 'rgba(224,123,57,0.08)' },
  complete:     { label: 'Complete',  color: '#5a5a5a', bg: 'rgba(90,90,90,0.08)' },
  cancelled:    { label: 'Cancelled', color: '#e03a3a', bg: 'rgba(224,58,58,0.07)' },
  draft:        { label: 'Draft',     color: '#5a5a5a', bg: 'rgba(90,90,90,0.08)' },
  sent:         { label: 'Sent',      color: '#c4a800', bg: 'rgba(255,214,0,0.07)' },
  accepted:     { label: 'Accepted',  color: '#3db56d', bg: 'rgba(61,181,109,0.08)' },
  declined:     { label: 'Declined',  color: '#e03a3a', bg: 'rgba(224,58,58,0.07)' },
  expired:      { label: 'Expired',   color: '#e03a3a', bg: 'rgba(224,58,58,0.07)' },
  paid:         { label: 'Paid',      color: '#3db56d', bg: 'rgba(61,181,109,0.08)' },
  overdue:      { label: 'Overdue',   color: '#e03a3a', bg: 'rgba(224,58,58,0.07)' },
  credited:     { label: 'Credited',  color: '#5a5a5a', bg: 'rgba(90,90,90,0.08)' },
  valid:        { label: 'Valid',     color: '#3db56d', bg: 'rgba(61,181,109,0.08)' },
  expiring_soon:{ label: 'Expiring', color: '#e07b39', bg: 'rgba(224,123,57,0.08)' },
  pending:      { label: 'Pending',   color: '#5a5a5a', bg: 'rgba(90,90,90,0.08)' },
  gross:        { label: 'Gross',     color: '#3db56d', bg: 'rgba(61,181,109,0.08)' },
  net:          { label: 'Net 20%',   color: '#c4a800', bg: 'rgba(255,214,0,0.07)' },
  unmatched:    { label: 'Unmatched', color: '#e07b39', bg: 'rgba(224,123,57,0.08)' },
  unverified:   { label: 'Unverified',color: '#e03a3a', bg: 'rgba(224,58,58,0.07)' },
  available:    { label: 'Available', color: '#3db56d', bg: 'rgba(61,181,109,0.08)' },
  on_site:      { label: 'On Site',   color: '#c4a800', bg: 'rgba(255,214,0,0.07)' },
  maintenance:  { label: 'Workshop',  color: '#e07b39', bg: 'rgba(224,123,57,0.08)' },
  hired_in:     { label: 'Hired In',  color: '#4d90d4', bg: 'rgba(77,144,212,0.08)' },
  disposed:     { label: 'Disposed',  color: '#5a5a5a', bg: 'rgba(90,90,90,0.08)' },
};

interface BadgeProps {
  status: BadgeStatus;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  const config = statusConfig[status] ?? { label: status, color: '#5a5a5a', bg: 'rgba(90,90,90,0.08)' };
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider', className)}
      style={{ color: config.color, backgroundColor: config.bg, fontFamily: "'DM Mono', monospace", letterSpacing: '0.06em' }}
    >
      {config.label}
    </span>
  );
}
