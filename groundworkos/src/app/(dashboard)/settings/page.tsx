'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building, Bell, Shield, Database, Key, Save, AlertTriangle, CheckCircle, Link2, Link2Off } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Company } from '@/types';

interface XeroConnection {
  tenant_name: string | null;
  connected_at: string;
}

interface ProfileForm {
  full_name: string;
  email: string;
  phone: string;
}

interface CompanyForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  vat_number: string;
  quote_validity: string;
  payment_terms: string;
}

interface NotificationPrefs {
  quote_accepted: boolean;
  invoice_overdue: boolean;
  document_expiring: boolean;
  weekly_summary: boolean;
  weather_alerts: boolean;
  compliance_alerts: boolean;
}

interface SecurityForm {
  new_password: string;
  confirm_password: string;
}

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  quote_accepted: true,
  invoice_overdue: true,
  document_expiring: true,
  weekly_summary: false,
  weather_alerts: true,
  compliance_alerts: true,
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileForm>({ full_name: '', email: '', phone: '' });
  const [companyForm, setCompanyForm] = useState<CompanyForm>({ name: '', email: '', phone: '', address: '', vat_number: '', quote_validity: '30', payment_terms: '30' });
  const [notifications, setNotifications] = useState<NotificationPrefs>(DEFAULT_NOTIFICATIONS);
  const [securityForm, setSecurityForm] = useState<SecurityForm>({ new_password: '', confirm_password: '' });
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [xeroConnection, setXeroConnection] = useState<XeroConnection | null>(null);
  const [xeroLoading, setXeroLoading] = useState(false);
  const [xeroToast, setXeroToast] = useState<string | null>(null);

  const supabase = useRef(createClient());

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.current.auth.getUser();
        if (!user) return;

        const meta = user.user_metadata ?? {};
        setProfileForm({
          full_name: meta.full_name ?? '',
          email: user.email ?? '',
          phone: meta.phone ?? '',
        });
        setNotifications({
          quote_accepted: meta.notifications?.quote_accepted ?? true,
          invoice_overdue: meta.notifications?.invoice_overdue ?? true,
          document_expiring: meta.notifications?.document_expiring ?? true,
          weekly_summary: meta.notifications?.weekly_summary ?? false,
          weather_alerts: meta.notifications?.weather_alerts ?? true,
          compliance_alerts: meta.notifications?.compliance_alerts ?? true,
        });

        const { data: uc } = await supabase.current
          .from('user_companies').select('company_id').eq('user_id', user.id).single();
        if (!uc?.company_id) return;
        setCompanyId(uc.company_id);

        const { data: company } = await supabase.current
          .from('companies').select('*').eq('id', uc.company_id).single();
        if (company) {
          const cs = meta.company_settings ?? {};
          setCompanyForm({
            name: company.name ?? '',
            email: company.email ?? '',
            phone: company.phone ?? '',
            address: company.address ?? '',
            vat_number: company.vat_number ?? '',
            quote_validity: cs.quote_validity ?? '30',
            payment_terms: cs.payment_terms ?? '30',
          });
        }

        // Load Xero connection status
        const { data: xeroConn } = await supabase.current
          .from('xero_connections')
          .select('tenant_name, connected_at')
          .eq('company_id', uc.company_id)
          .maybeSingle();
        if (xeroConn) {
          setXeroConnection({ tenant_name: xeroConn.tenant_name, connected_at: xeroConn.connected_at });
        }
      } catch (err) {
        console.error('[Settings] load error', err);
      }
    }
    load();

    // Handle Xero OAuth redirect result
    const xeroParam = searchParams.get('xero');
    if (xeroParam === 'connected') {
      setXeroToast('Xero connected successfully.');
      setActiveTab('integrations');
      setTimeout(() => setXeroToast(null), 4000);
    } else if (xeroParam === 'error') {
      setXeroToast('Failed to connect Xero. Please try again.');
      setActiveTab('integrations');
      setTimeout(() => setXeroToast(null), 4000);
    }
  }, [searchParams]);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      if (activeTab === 'profile') {
        const { error } = await supabase.current.auth.updateUser({
          data: { full_name: profileForm.full_name, phone: profileForm.phone },
        });
        if (error) throw error;
      }

      if (activeTab === 'company' && companyId) {
        const { error } = await supabase.current.from('companies').update({
          name: companyForm.name,
          email: companyForm.email || null,
          phone: companyForm.phone || null,
          address: companyForm.address || null,
          vat_number: companyForm.vat_number || null,
        }).eq('id', companyId);
        if (error) throw error;

        await supabase.current.auth.updateUser({
          data: { company_settings: { quote_validity: companyForm.quote_validity, payment_terms: companyForm.payment_terms } },
        });
      }

      if (activeTab === 'notifications') {
        const { error } = await supabase.current.auth.updateUser({
          data: { notifications },
        });
        if (error) throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword() {
    if (!securityForm.new_password) { setSaveError('New password is required.'); return; }
    if (securityForm.new_password !== securityForm.confirm_password) { setSaveError('Passwords do not match.'); return; }
    if (securityForm.new_password.length < 8) { setSaveError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.current.auth.updateUser({ password: securityForm.new_password });
      if (error) throw error;
      setSecurityForm({ new_password: '', confirm_password: '' });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const showSaveButton = activeTab !== 'security' && activeTab !== 'integrations';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Settings</h1>
          <p className="text-muted text-sm mt-1">Manage your account and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {saveError && <p className="text-danger text-sm">{saveError}</p>}
          {saved && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
          {showSaveButton && (
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSaveError(null); setSaved(false); }}>
        <TabsList>
          <TabsTrigger value="profile"><User className="w-4 h-4 mr-2" />Profile</TabsTrigger>
          <TabsTrigger value="company"><Building className="w-4 h-4 mr-2" />Company</TabsTrigger>
          <TabsTrigger value="integrations"><Database className="w-4 h-4 mr-2" />Integrations</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Shield className="w-4 h-4 mr-2" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Panel title="User Profile">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    disabled
                    className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm opacity-60"
                  />
                  <p className="text-xs text-muted mt-1">Email cannot be changed here.</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="07700 900123"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="company">
          <Panel title="Company Information">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Address</label>
                  <textarea
                    rows={3}
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Phone</label>
                    <input
                      type="tel"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">VAT Number</label>
                <input
                  type="text"
                  value={companyForm.vat_number}
                  onChange={(e) => setCompanyForm(f => ({ ...f, vat_number: e.target.value }))}
                  placeholder="GB 123 456 789"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
            </div>
          </Panel>

          <Panel title="Business Preferences" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Default Quote Validity (days)</label>
                  <input
                    type="number"
                    value={companyForm.quote_validity}
                    onChange={(e) => setCompanyForm(f => ({ ...f, quote_validity: e.target.value }))}
                    min="1"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Invoice Payment Terms (days)</label>
                  <input
                    type="number"
                    value={companyForm.payment_terms}
                    onChange={(e) => setCompanyForm(f => ({ ...f, payment_terms: e.target.value }))}
                    min="1"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-6">
            <Panel title="Supabase">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Database Connection</div>
                    <div className="text-sm text-muted">Connected to Supabase</div>
                  </div>
                  <Badge status="active" />
                </div>
              </div>
            </Panel>
            <Panel title="Mistral AI">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">AI Assistant</div>
                    <div className="text-sm text-muted">Powered by Mistral Small</div>
                  </div>
                  <Badge status="active" />
                </div>
              </div>
            </Panel>
            <Panel title="External Services">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-surface-2 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-blue-500/20 flex items-center justify-center">
                      <Database className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">Companies House</div>
                      <div className="text-sm text-muted">UK company lookup</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Configure</Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-surface-2 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-yellow/20 flex items-center justify-center">
                      <Key className="w-5 h-5 text-yellow" />
                    </div>
                    <div>
                      <div className="font-medium">Xero</div>
                      {xeroConnection ? (
                        <div className="text-sm text-muted">
                          Connected to {xeroConnection.tenant_name ?? 'Xero'} &mdash; since {new Date(xeroConnection.connected_at).toLocaleDateString('en-GB')}
                        </div>
                      ) : (
                        <div className="text-sm text-muted">Accounting integration</div>
                      )}
                    </div>
                  </div>
                  {xeroConnection ? (
                    <div className="flex items-center gap-2">
                      <Badge status="active" />
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={xeroLoading}
                        disabled={xeroLoading}
                        onClick={async () => {
                          if (!companyId) return;
                          setXeroLoading(true);
                          try {
                            const { error } = await supabase.current
                              .from('xero_connections')
                              .delete()
                              .eq('company_id', companyId);
                            if (error) throw error;
                            setXeroConnection(null);
                          } catch (err) {
                            console.error('[Settings] Xero disconnect error', err);
                          } finally {
                            setXeroLoading(false);
                          }
                        }}
                      >
                        <Link2Off className="w-4 h-4 mr-2" />Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { window.location.href = '/api/xero/connect'; }}
                    >
                      <Link2 className="w-4 h-4 mr-2" />Connect Xero
                    </Button>
                  )}
                </div>
                {xeroToast && (
                  <div className={`p-3 rounded text-sm ${xeroToast.includes('success') ? 'bg-success/10 border border-success/30 text-success' : 'bg-danger/10 border border-danger/30 text-danger'}`}>
                    {xeroToast}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Panel title="Email Notifications">
            <div className="space-y-4">
              {([
                { key: 'quote_accepted' as const, label: 'New Quote Accepted', desc: 'Email when a client accepts a quote' },
                { key: 'invoice_overdue' as const, label: 'Invoice Overdue', desc: 'Email when an invoice becomes overdue' },
                { key: 'document_expiring' as const, label: 'Document Expiring', desc: 'Email 30 days before document expiry' },
                { key: 'weekly_summary' as const, label: 'Weekly Summary', desc: "Email summary of week's activity" },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-surface-2 rounded">
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-muted">{desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) => setNotifications(n => ({ ...n, [key]: e.target.checked }))}
                    className="w-5 h-5"
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="In-App Notifications" className="mt-6">
            <div className="space-y-4">
              {([
                { key: 'weather_alerts' as const, label: 'Weather Alerts', desc: 'Show weather risk warnings on dashboard' },
                { key: 'compliance_alerts' as const, label: 'Compliance Alerts', desc: 'Show document expiry warnings' },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-surface-2 rounded">
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-sm text-muted">{desc}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications[key]}
                    onChange={(e) => setNotifications(n => ({ ...n, [key]: e.target.checked }))}
                    className="w-5 h-5"
                  />
                </div>
              ))}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="security">
          <Panel title="Change Password">
            <div className="space-y-4">
              {saveError && activeTab === 'security' && (
                <div className="p-3 rounded bg-danger/10 border border-danger text-danger text-sm">{saveError}</div>
              )}
              {saved && activeTab === 'security' && (
                <div className="flex items-center gap-2 text-success text-sm p-3 bg-success/10 border border-success rounded">
                  <CheckCircle className="w-4 h-4" />
                  Password updated successfully.
                </div>
              )}
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  value={securityForm.new_password}
                  onChange={(e) => setSecurityForm(f => ({ ...f, new_password: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={securityForm.confirm_password}
                  onChange={(e) => setSecurityForm(f => ({ ...f, confirm_password: e.target.value }))}
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <Button onClick={handleUpdatePassword} loading={saving} disabled={saving}>
                Update Password
              </Button>
            </div>
          </Panel>

          <Panel title="Two-Factor Authentication" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Enable 2FA</div>
                  <div className="text-sm text-muted">Add an extra layer of security</div>
                </div>
                <Button variant="ghost">Enable</Button>
              </div>
              <div className="p-4 bg-warning/10 border border-warning/30 rounded">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <div className="font-medium mb-1">2FA is not enabled</div>
                    <p className="text-muted">We strongly recommend enabling two-factor authentication to secure your account.</p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
