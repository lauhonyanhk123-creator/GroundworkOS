import { useState, useEffect } from 'react';
import { ShieldCheck, Info, Link2, RefreshCw, CheckCircle, AlertCircle, Unlink, Download } from 'lucide-react';
import { Panel } from '../components/ui/Panel';
import { Btn } from '../components/ui/Btn';

const inputCls = 'w-full py-2 px-3 rounded-md text-sm focus:outline-none transition-colors';
const inputStyle = { backgroundColor: '#ffffff', border: '1px solid #d9d4ce', color: '#181410' };

function Inp({ defaultValue, placeholder, type = 'text', isMono = false }: { defaultValue?: string; placeholder?: string; type?: string; isMono?: boolean }) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={`${inputCls} ${isMono ? 'font-mono tnum' : ''}`}
      style={inputStyle}
      onFocus={e => (e.target.style.borderColor = '#1b5e78')}
      onBlur={e => (e.target.style.borderColor = '#d9d4ce')}
    />
  );
}

function SettingsRow({ label, description, children, isLast }: { label: string; description?: string; children: React.ReactNode; isLast?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 transition-colors hover:bg-[#fafaf8]" style={{ borderBottom: isLast ? 'none' : '1px solid #d9d4ce' }}>
      <div className="sm:w-1/3 flex-shrink-0">
        <label className="block text-[11px] font-bold uppercase tracking-widest" style={{ color: '#4a4540', fontFamily: "'Space Grotesk', sans-serif" }}>{label}</label>
        {description && <p className="text-xs mt-1" style={{ color: '#7a7469' }}>{description}</p>}
      </div>
      <div className="sm:w-2/3">
        {children}
      </div>
    </div>
  );
}

// ─── Xero Integration Panel ───────────────────────────────────────────────────

type XeroStatus = { connected: false } | { connected: true; tenantName: string | null; connectedAt: string; updatedAt: string };
type SyncResult = { synced: number; failed: number } | null;

function XeroPanel() {
  const [status, setStatus] = useState<XeroStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResults, setSyncResults] = useState<Record<string, SyncResult>>({});
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  async function fetchStatus() {
    try {
      const r = await fetch('/api/xero/status');
      const data = await r.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();

    // Handle OAuth callback result from URL params
    const params = new URLSearchParams(window.location.search);
    const xeroParam = params.get('xero');
    const msg = params.get('msg');

    if (xeroParam === 'connected') {
      setBanner({ type: 'success', message: 'Xero connected successfully.' });
      // Clean URL without full reload
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
      fetchStatus();
    } else if (xeroParam === 'error') {
      setBanner({ type: 'error', message: msg ?? 'Failed to connect to Xero.' });
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  async function runSync(key: string, path: string) {
    setSyncing(key);
    setSyncResults(r => ({ ...r, [key]: null }));
    try {
      const r = await fetch(path, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Sync failed');
      setSyncResults(prev => ({ ...prev, [key]: data }));
    } catch (e) {
      setBanner({ type: 'error', message: String(e) });
    } finally {
      setSyncing(null);
    }
  }

  async function handleDisconnect() {
    if (!confirm('This will remove the Xero connection and all sync mapping data. Continue?')) return;
    setDisconnecting(true);
    try {
      await fetch('/api/xero/disconnect', { method: 'DELETE' });
      setSyncResults({});
      setBanner({ type: 'success', message: 'Xero disconnected.' });
      fetchStatus();
    } catch (e) {
      setBanner({ type: 'error', message: String(e) });
    } finally {
      setDisconnecting(false);
    }
  }

  function SyncBtn({ label, syncKey, path, icon }: { label: string; syncKey: string; path: string; icon: React.ReactNode }) {
    const res = syncResults[syncKey];
    const busy = syncing === syncKey;
    return (
      <div className="flex items-center gap-3">
        <Btn variant="outline" size="sm" onClick={() => runSync(syncKey, path)} disabled={!!syncing}>
          {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : icon}
          {busy ? 'Syncing…' : label}
        </Btn>
        {res && (
          <span className="text-xs font-mono tnum" style={{ color: res.failed > 0 ? '#b56918' : '#2a6e45' }}>
            {res.synced} synced{res.failed > 0 ? `, ${res.failed} failed` : ''}
          </span>
        )}
      </div>
    );
  }

  const connected = status?.connected === true;
  const tenant = connected ? (status as { connected: true; tenantName: string | null }).tenantName : null;
  const connectedAt = connected ? (status as { connected: true; connectedAt: string }).connectedAt : null;

  return (
    <Panel
      title="Xero Integration"
      badge={connected ? { label: 'Connected', variant: 'success' } : undefined}
      noPad
    >
      {banner && (
        <div
          className="flex items-center gap-3 px-5 py-3 text-sm"
          style={{
            backgroundColor: banner.type === 'success' ? '#e8f3f7' : '#fdf2f2',
            borderBottom: '1px solid #d9d4ce',
            color: banner.type === 'success' ? '#1b5e78' : '#c13a2a',
          }}
        >
          {banner.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{banner.message}</span>
          <button className="ml-auto text-xs opacity-60 hover:opacity-100" onClick={() => setBanner(null)}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="px-5 py-6 text-sm" style={{ color: '#7a7469' }}>Checking connection…</div>
      ) : !connected ? (
        <div className="px-5 py-6">
          <p className="text-sm mb-4" style={{ color: '#4a4540' }}>
            Connect to Xero to automatically sync your invoices, quotes, and client contacts — no more double-entry.
          </p>
          <Btn onClick={() => { window.location.href = '/api/xero/auth'; }}>
            <Link2 className="w-3.5 h-3.5" />
            Connect to Xero
          </Btn>
          <p className="text-xs mt-3" style={{ color: '#7a7469' }}>
            You'll be redirected to Xero to authorise access. Make sure your Xero credentials are configured first.
          </p>
        </div>
      ) : (
        <>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #d9d4ce' }}>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#2a6e45' }} />
              <span className="text-sm font-medium" style={{ color: '#181410', fontFamily: "'Space Grotesk', sans-serif" }}>
                {tenant ?? 'Xero Organisation'}
              </span>
            </div>
            {connectedAt && (
              <p className="text-xs" style={{ color: '#7a7469' }}>
                Connected {new Date(connectedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          <div className="px-5 py-4 space-y-4" style={{ borderBottom: '1px solid #d9d4ce' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#7a7469', fontFamily: "'Space Grotesk', sans-serif" }}>Push to Xero</p>
            <SyncBtn label="Sync Clients" syncKey="contacts" path="/api/xero/sync/contacts" icon={<RefreshCw className="w-3.5 h-3.5" />} />
            <SyncBtn label="Sync Invoices" syncKey="invoices" path="/api/xero/sync/invoices" icon={<RefreshCw className="w-3.5 h-3.5" />} />
            <SyncBtn label="Sync Quotes" syncKey="quotes" path="/api/xero/sync/quotes" icon={<RefreshCw className="w-3.5 h-3.5" />} />
          </div>

          <div className="px-5 py-4" style={{ borderBottom: '1px solid #d9d4ce' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#7a7469', fontFamily: "'Space Grotesk', sans-serif" }}>Pull from Xero</p>
            <SyncBtn label="Pull Payment Status" syncKey="payments" path="/api/xero/pull/payments" icon={<Download className="w-3.5 h-3.5" />} />
            <p className="text-xs mt-2" style={{ color: '#7a7469' }}>
              Marks invoices as paid in GroundworkOS when they're marked paid in Xero.
            </p>
          </div>

          <div className="px-5 py-4" style={{ backgroundColor: '#f0ede8' }}>
            <Btn variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
              <Unlink className="w-3.5 h-3.5" />
              {disconnecting ? 'Disconnecting…' : 'Disconnect Xero'}
            </Btn>
          </div>
        </>
      )}
    </Panel>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: '#181410', fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '-0.01em' }}>Settings</h1>
        <p className="text-sm mt-1" style={{ color: '#7a7469' }}>Company configuration, compliance, and preferences</p>
      </div>

      <Panel title="Company Details" noPad>
        <SettingsRow label="Company Name">
          <Inp defaultValue="GroundworkOS Ltd" placeholder="Company name" />
        </SettingsRow>
        <SettingsRow label="Company Number">
          <Inp defaultValue="12345678" placeholder="Companies House number" isMono />
        </SettingsRow>
        <SettingsRow label="VAT Number">
          <Inp defaultValue="GB 234 5678 90" placeholder="VAT registration number" isMono />
        </SettingsRow>
        <SettingsRow label="UTR Number" description="Unique Taxpayer Reference">
          <Inp defaultValue="1234 56789 01" placeholder="Unique Taxpayer Reference" isMono />
        </SettingsRow>
        <SettingsRow label="CIS Reference" description="Contractor reference">
          <Inp defaultValue="CIS-234-5678-90" placeholder="CIS contractor reference" isMono />
        </SettingsRow>
        <SettingsRow label="Registered Address" isLast>
          <Inp defaultValue="Unit 3, Anvil Works, Birmingham, B12 0PQ" placeholder="Address" />
        </SettingsRow>
        <div className="px-5 py-4" style={{ backgroundColor: '#f0ede8', borderTop: '1px solid #d9d4ce' }}>
          <Btn size="sm">Save Company Details</Btn>
        </div>
      </Panel>

      <Panel title="Invoice Settings" noPad>
        <SettingsRow label="Invoice Prefix">
          <Inp defaultValue="INV" placeholder="INV" isMono />
        </SettingsRow>
        <SettingsRow label="Quote Prefix">
          <Inp defaultValue="QT" placeholder="QT" isMono />
        </SettingsRow>
        <SettingsRow label="Job Number Prefix">
          <Inp defaultValue="GW" placeholder="GW" isMono />
        </SettingsRow>
        <SettingsRow label="Default Payment Terms" isLast>
          <Inp defaultValue="30 days" placeholder="e.g. 30 days" />
        </SettingsRow>
        <div className="px-5 py-4" style={{ backgroundColor: '#f0ede8', borderTop: '1px solid #d9d4ce' }}>
          <Btn size="sm">Save Invoice Settings</Btn>
        </div>
      </Panel>

      <Panel title="CIS Settings" noPad>
        <div className="px-5 py-4" style={{ backgroundColor: '#e8f3f7', borderBottom: '1px solid #d9d4ce' }}>
          <div className="flex gap-3">
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1b5e78' }} />
            <div className="text-sm leading-relaxed" style={{ color: '#181410' }}>
              <strong className="font-semibold">Construction Industry Scheme</strong> — Configured as a CIS Contractor. Verify subcontractors with HMRC before payments; file monthly returns by the 19th.
            </div>
          </div>
        </div>
        <SettingsRow label="Tax Year Start">
          <Inp defaultValue="6 April" placeholder="" />
        </SettingsRow>
        <SettingsRow label="Filing Reminder" description="Days before the 19th" isLast>
          <Inp defaultValue="5" placeholder="5" type="number" isMono />
        </SettingsRow>
        <div className="px-5 py-4" style={{ backgroundColor: '#f0ede8', borderTop: '1px solid #d9d4ce' }}>
          <Btn size="sm">Save CIS Settings</Btn>
        </div>
      </Panel>

      <Panel title="NRSWA / Street Works" noPad>
        <div className="px-5 py-4" style={{ backgroundColor: '#eeeae4', borderBottom: '1px solid #d9d4ce' }}>
          <div className="flex gap-3">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#7a7469' }} />
            <div className="text-sm leading-relaxed" style={{ color: '#4a4540' }}>
              <strong className="font-semibold text-[#181410]">New Roads and Street Works Act 1991</strong> — Company registered with relevant Highway Authority. Ensure all operatives carry valid NRSWA cards for works on the public highway.
            </div>
          </div>
        </div>
        <SettingsRow label="Street Works Licence Ref">
          <Inp defaultValue="SWL-2024-00123" isMono />
        </SettingsRow>
        <SettingsRow label="Default Permit Authority" isLast>
          <Inp defaultValue="Transport for West Midlands" />
        </SettingsRow>
        <div className="px-5 py-4" style={{ backgroundColor: '#f0ede8', borderTop: '1px solid #d9d4ce' }}>
          <Btn size="sm">Save Street Works</Btn>
        </div>
      </Panel>

      <Panel title="Notification Preferences" noPad>
        {[
          { label: 'Document expiry warnings', desc: 'Days before expiry', value: '30' },
          { label: 'Invoice overdue alert', desc: 'Days after due date', value: '3' },
          { label: 'CIS filing reminder', desc: 'Days before 19th', value: '5' },
          { label: 'LOLER exam reminder', desc: 'Days before exam due', value: '28' },
        ].map((item, i, arr) => (
          <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-[#fafaf8]" style={{ borderBottom: i === arr.length - 1 ? 'none' : '1px solid #d9d4ce' }}>
            <div>
              <div className="text-sm font-medium" style={{ color: '#181410' }}>{item.label}</div>
              <div className="text-xs mt-0.5" style={{ color: '#7a7469' }}>{item.desc}</div>
            </div>
            <input
              type="number"
              defaultValue={item.value}
              className="w-20 py-1.5 px-2 rounded-md text-sm text-center font-mono tnum focus:outline-none transition-colors"
              style={{ backgroundColor: '#ffffff', border: '1px solid #d9d4ce', color: '#181410' }}
              onFocus={e => (e.target.style.borderColor = '#1b5e78')}
              onBlur={e => (e.target.style.borderColor = '#d9d4ce')}
            />
          </div>
        ))}
        <div className="px-5 py-4" style={{ backgroundColor: '#f0ede8', borderTop: '1px solid #d9d4ce' }}>
          <Btn size="sm">Save Preferences</Btn>
        </div>
      </Panel>

      <XeroPanel />
    </div>
  );
}
