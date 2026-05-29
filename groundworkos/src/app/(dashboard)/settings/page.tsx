'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, User, Building, Bell, Shield, Palette, 
  Database, Key, Save, AlertTriangle, CheckCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-condensed font-bold">Settings</h1>
          <p className="text-muted text-sm mt-1">Manage your account and preferences</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 text-success text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Saved</span>
            </div>
          )}
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <Database className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <Panel title="User Profile">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    defaultValue="John Smith"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue="john@groundworkos.co.uk"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Phone</label>
                <input
                  type="tel"
                  defaultValue="07700 900123"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Role</label>
                <div className="flex items-center gap-2">
                  <Badge status="active">Admin</Badge>
                  <span className="text-sm text-muted">Full access to all features</span>
                </div>
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* Company Settings */}
        <TabsContent value="company">
          <Panel title="Company Information">
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Company Name</label>
                <input
                  type="text"
                  defaultValue="GroundworkOS Ltd"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Address</label>
                  <textarea
                    rows={3}
                    defaultValue="GroundworkOS HQ&#10;123 Industrial Estate&#10;Reading, RG1 1AB"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow resize-none"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Phone</label>
                    <input
                      type="tel"
                      defaultValue="01189 000000"
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      defaultValue="info@groundworkos.co.uk"
                      className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Companies House Number</label>
                <input
                  type="text"
                  defaultValue="12345678"
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
                    defaultValue="30"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">VAT Rate (%)</label>
                  <input
                    type="number"
                    defaultValue="20"
                    className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Invoice Payment Terms (days)</label>
                <input
                  type="number"
                  defaultValue="30"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations">
          <div className="space-y-6">
            <Panel title="Supabase">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Database Connection</div>
                    <div className="text-sm text-muted">Connected to Supabase</div>
                  </div>
                  <Badge status="active">Connected</Badge>
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Project URL</label>
                  <input
                    type="text"
                    defaultValue="https://xxxxx.supabase.co"
                    disabled
                    className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm opacity-60"
                  />
                </div>
              </div>
            </Panel>

            <Panel title="Mistral AI">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">AI Assistant</div>
                    <div className="text-sm text-muted">Powered by Mistral Large</div>
                  </div>
                  <Badge status="active">Active</Badge>
                </div>
                <div>
                  <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">API Key</label>
                  <div className="relative">
                    <input
                      type="password"
                      defaultValue="xxxxxxxxxxxx"
                      disabled
                      className="w-full bg-surface-3 border border-border rounded px-3 py-2 text-sm opacity-60"
                    />
                    <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 -translate-y-1/2">
                      Update
                    </Button>
                  </div>
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
                    <div className="w-10 h-10 rounded bg-yellow-500/20 flex items-center justify-center">
                      <Key className="w-5 h-5 text-yellow-500" />
                    </div>
                    <div>
                      <div className="font-medium">Xero</div>
                      <div className="text-sm text-muted">Accounting integration</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">Configure</Button>
                </div>
              </div>
            </Panel>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Panel title="Email Notifications">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded">
                <div>
                  <div className="font-medium">New Quote Accepted</div>
                  <div className="text-sm text-muted">Email when a client accepts a quote</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded">
                <div>
                  <div className="font-medium">Invoice Overdue</div>
                  <div className="text-sm text-muted">Email when an invoice becomes overdue</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded">
                <div>
                  <div className="font-medium">Document Expiring</div>
                  <div className="text-sm text-muted">Email 30 days before document expiry</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded">
                <div>
                  <div className="font-medium">Weekly Summary</div>
                  <div className="text-sm text-muted">Email summary of week's activity</div>
                </div>
                <input type="checkbox" className="w-5 h-5" />
              </div>
            </div>
          </Panel>

          <Panel title="In-App Notifications" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded">
                <div>
                  <div className="font-medium">Weather Alerts</div>
                  <div className="text-sm text-muted">Show weather risk warnings on dashboard</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between p-4 bg-surface-2 rounded">
                <div>
                  <div className="font-medium">Compliance Alerts</div>
                  <div className="text-sm text-muted">Show document expiry warnings</div>
                </div>
                <input type="checkbox" defaultChecked className="w-5 h-5" />
              </div>
            </div>
          </Panel>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Panel title="Password">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Current Password</label>
                <input
                  type="password"
                  placeholder="Enter current password"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-muted uppercase tracking-wider mb-2">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-yellow"
                />
              </div>
              <Button>Update Password</Button>
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

          <Panel title="Active Sessions" className="mt-6">
            <div className="space-y-4">
              <div className="p-4 bg-surface-2 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Current Session</div>
                  <Badge status="active">Active</Badge>
                </div>
                <div className="text-sm text-muted">
                  Chrome on MacOS • Reading, UK • Last active now
                </div>
              </div>
              <Button variant="ghost" className="text-danger hover:text-danger">
                Sign Out All Other Sessions
              </Button>
            </div>
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
