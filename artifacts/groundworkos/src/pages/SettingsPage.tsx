import { Panel } from '../components/ui/Panel';
import { Btn } from '../components/ui/Btn';

export function SettingsPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold uppercase" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: '#666666' }}>Company configuration and preferences</p>
      </div>

      <Panel title="Company Details">
        <div className="space-y-4">
          {[
            { label: 'Company Name', value: 'GroundworkOS Ltd', placeholder: 'Company name' },
            { label: 'Company Number', value: '12345678', placeholder: 'Companies House number' },
            { label: 'VAT Number', value: 'GB 234 5678 90', placeholder: 'VAT registration number' },
            { label: 'UTR Number', value: '1234 56789 01', placeholder: 'Unique Taxpayer Reference' },
            { label: 'CIS Reference', value: 'CIS-234-5678-90', placeholder: 'CIS contractor reference' },
            { label: 'Registered Address', value: 'Unit 3, Anvil Works, Birmingham, B12 0PQ', placeholder: 'Address' },
          ].map(({ label, value, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-mono uppercase tracking-wider mb-1.5" style={{ color: '#444444' }}>{label}</label>
              <input type="text" defaultValue={value} placeholder={placeholder} className="w-full py-2 px-3 rounded text-sm focus:outline-none" style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
            </div>
          ))}
          <Btn size="sm">Save Changes</Btn>
        </div>
      </Panel>

      <Panel title="Invoice Settings">
        <div className="space-y-4">
          {[
            { label: 'Invoice Prefix', value: 'INV', placeholder: 'INV' },
            { label: 'Quote Prefix', value: 'QT', placeholder: 'QT' },
            { label: 'Job Number Prefix', value: 'GW', placeholder: 'GW' },
            { label: 'Default Payment Terms', value: '30 days', placeholder: 'e.g. 30 days' },
          ].map(({ label, value, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-mono uppercase tracking-wider mb-1.5" style={{ color: '#444444' }}>{label}</label>
              <input type="text" defaultValue={value} placeholder={placeholder} className="w-full py-2 px-3 rounded text-sm focus:outline-none" style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
            </div>
          ))}
          <Btn size="sm">Save</Btn>
        </div>
      </Panel>

      <Panel title="CIS Settings">
        <div className="space-y-4">
          <div className="p-3 rounded text-xs" style={{ backgroundColor: '#1a1400', border: '1px solid rgba(255,214,0,0.2)', color: '#888888' }}>
            <div className="font-bold mb-1" style={{ color: '#FFD600' }}>Construction Industry Scheme</div>
            Configured as a <strong style={{ color: '#e8e8e8' }}>CIS Contractor</strong>. You must verify subcontractors with HMRC before making payments and file monthly returns by the 19th of each month.
          </div>
          {[
            { label: 'Tax Year Start', value: '6 April', placeholder: '' },
            { label: 'CIS Filing Reminder (days before)', value: '5', placeholder: '5' },
          ].map(({ label, value, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-mono uppercase tracking-wider mb-1.5" style={{ color: '#444444' }}>{label}</label>
              <input type="text" defaultValue={value} placeholder={placeholder} className="w-full py-2 px-3 rounded text-sm focus:outline-none" style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
            </div>
          ))}
          <Btn size="sm">Save</Btn>
        </div>
      </Panel>

      <Panel title="NRSWA / Street Works">
        <div className="space-y-4">
          <div className="p-3 rounded text-xs" style={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(96,165,250,0.2)', color: '#888888' }}>
            <div className="font-bold mb-1" style={{ color: '#60a5fa' }}>New Roads and Street Works Act 1991</div>
            Company registered with relevant Highway Authority. Ensure all operatives carry valid NRSWA cards for works on the public highway.
          </div>
          {[
            { label: 'Street Works Licence Ref', value: 'SWL-2024-00123' },
            { label: 'Default Permit Authority', value: 'Transport for West Midlands' },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block text-xs font-mono uppercase tracking-wider mb-1.5" style={{ color: '#444444' }}>{label}</label>
              <input type="text" defaultValue={value} className="w-full py-2 px-3 rounded text-sm focus:outline-none" style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
            </div>
          ))}
          <Btn size="sm">Save</Btn>
        </div>
      </Panel>

      <Panel title="Notification Preferences">
        <div className="space-y-3">
          {[
            { label: 'Document expiry warnings (days before)', value: '30' },
            { label: 'Invoice overdue alert (days after due)', value: '3' },
            { label: 'CIS filing reminder (days before 19th)', value: '5' },
            { label: 'LOLER exam reminder (days before)', value: '28' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <label className="text-sm" style={{ color: '#888888' }}>{label}</label>
              <input type="number" defaultValue={value} className="w-20 py-1.5 px-2 rounded text-sm text-center focus:outline-none" style={{ backgroundColor: '#1c1c1c', border: '1px solid #2a2a2a', color: '#e8e8e8', fontFamily: "'DM Mono', monospace" }} onFocus={e => (e.target.style.borderColor = '#FFD600')} onBlur={e => (e.target.style.borderColor = '#2a2a2a')} />
            </div>
          ))}
          <Btn size="sm">Save</Btn>
        </div>
      </Panel>
    </div>
  );
}
