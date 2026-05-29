import { Receipt } from 'lucide-react';

export function NoInvoices() {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
        <Receipt className="w-8 h-8 text-muted" />
      </div>
      <h3 className="text-lg font-condensed font-bold mb-2">No invoices yet</h3>
      <p className="text-sm text-muted">
        Invoices will appear here when you create them from completed jobs
      </p>
    </div>
  );
}
