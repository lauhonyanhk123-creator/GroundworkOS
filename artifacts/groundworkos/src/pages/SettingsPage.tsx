import { Panel } from '../components/ui/Panel';
import { Btn } from '../components/ui/Btn';

const inputCls = 'w-full py-2 px-3 rounded-md text-sm focus:outline-none transition-colors';
const inputStyle = { backgroundColor: '#ffffff', border: '1px solid #d9d4ce', color: '#181410' };

function Inp({ defaultValue, placeholder, type = 'text' }: { defaultValue?: string; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      className={inputCls}
      style={inputStyle}
      onFocus={e => (e.target.style.borderColor = '#1b5e78')}
      onBlur={e => (e.target.style.borderColor = '#d9d4ce')}
    />
  );
}

function FieldRow({ label }: { label: string; children?: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium uppercase tracking-widest mb-1.5" style={{ color: '#7a7469', letterSpacing: '0.07em' }}>{label}</label>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: '#181410' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: '#7a7469' }}>Company configuration and preferences</p>
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
              <FieldRow label={label} />
              <Inp defaultValue={value} placeholder={placeholder} />
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
              <FieldRow label={label} />
              <Inp defaultValue={value} placeholder={placeholder} />
            </div>
          ))}
          <Btn size="sm">Save</Btn>
        </div>
      </Panel>

      <Panel title="CIS Settings">
        <div className="space-y-4">
          <div className="p-3 rounded-md text-xs leading-relaxed" style={{ backgroundColor: '#eeeae4', border: '1px solid #d9d4ce', color: '#7a7469' }}>
            <span className="font-medium" style={{ color: '#8a8377' }}>Construction Industry Scheme — </span>
            Configured as a <strong style={{ color: '#181410', fontWeight: 500 }}>CIS Contractor</strong>. Verify subcontractors with HMRC before payments; file monthly returns by the 19th.
          </div>
          {[
            { label: 'Tax Year Start', value: '6 April', placeholder: '' },
            { label: 'CIS Filing Reminder (days before)', value: '5', placeholder: '5' },
          ].map(({ label, value, placeholder }) => (
            <div key={label}>
              <FieldRow label={label} />
              <Inp defaultValue={value} placeholder={placeholder} />
            </div>
          ))}
          <Btn size="sm">Save</Btn>
        </div>
      </Panel>

      <Panel title="NRSWA / Street Works">
        <div className="space-y-4">
          <div className="p-3 rounded-md text-xs leading-relaxed" style={{ backgroundColor: '#eeeae4', border: '1px solid #d9d4ce', color: '#7a7469' }}>
            <span className="font-medium" style={{ color: '#8a8377' }}>New Roads and Street Works Act 1991 — </span>
            Company registered with relevant Highway Authority. Ensure all operatives carry valid NRSWA cards for works on the public highway.
          </div>
          {[
            { label: 'Street Works Licence Ref', value: 'SWL-2024-00123' },
            { label: 'Default Permit Authority', value: 'Transport for West Midlands' },
          ].map(({ label, value }) => (
            <div key={label}>
              <FieldRow label={label} />
              <Inp defaultValue={value} />
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
              <span className="text-sm" style={{ color: '#8a8377' }}>{label}</span>
              <input
                type="number"
                defaultValue={value}
                className="w-20 py-1.5 px-2 rounded-md text-sm text-center focus:outline-none"
                style={{ backgroundColor: '#f5f1ec', border: '1px solid #d9d4ce', color: '#181410' }}
                onFocus={e => (e.target.style.borderColor = '#e0dbd5')}
                onBlur={e => (e.target.style.borderColor = '#d9d4ce')}
              />
            </div>
          ))}
          <Btn size="sm">Save</Btn>
        </div>
      </Panel>
    </div>
  );
}
