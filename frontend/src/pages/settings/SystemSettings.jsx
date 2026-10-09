import { useState, useEffect } from 'react';
import { Save, Settings, Bell, Shield, Database, Globe } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import api from '../../services/api';

export default function SystemSettings() {
  const [settings, setSettings] = useState({
    depotName: '',
    depotCode: '',
    timezone: 'Asia/Colombo',
    currency: 'LKR',
    dateFormat: 'DD/MM/YYYY',
    notifyMaintenance: true,
    notifyLicenseExpiry: true,
    notifyFuelThreshold: true,
    fuelThreshold: 20,
    maintenanceLeadDays: 7,
    licenseExpiryDays: 30,
    autoBackup: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then(({ data }) => setSettings((prev) => ({ ...prev, ...data }))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* */ } finally { setSaving(false); }
  };

  const set = (key, val) => setSettings((p) => ({ ...p, [key]: val }));

  const Toggle = ({ label, desc, value, onChange }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-400 mt-0.5">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)} className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-primary-500' : 'bg-gray-200'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );

  if (loading) return null;

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-black text-gray-900">System Settings</h2>
        <p className="text-sm text-gray-500">Configure depot and system preferences</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Depot Info */}
        <Card>
          <CardHeader title="Depot Information" icon={Database} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Depot Name" value={settings.depotName} onChange={(e) => set('depotName', e.target.value)} placeholder="Colombo Central Depot" />
            <Input label="Depot Code" value={settings.depotCode} onChange={(e) => set('depotCode', e.target.value)} placeholder="CMB-01" />
          </div>
        </Card>

        {/* Regional */}
        <Card>
          <CardHeader title="Regional" icon={Globe} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Timezone</label>
              <select className="input w-full" value={settings.timezone} onChange={(e) => set('timezone', e.target.value)}>
                <option value="Asia/Colombo">Asia/Colombo (UTC+5:30)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Currency</label>
              <select className="input w-full" value={settings.currency} onChange={(e) => set('currency', e.target.value)}>
                <option value="LKR">LKR - Sri Lankan Rupee</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader title="Notifications" icon={Bell} />
          <Toggle label="Maintenance Reminders" desc="Alert before scheduled maintenance" value={settings.notifyMaintenance} onChange={(v) => set('notifyMaintenance', v)} />
          <Toggle label="License Expiry Alerts" desc="Alert when driver/bus licenses near expiry" value={settings.notifyLicenseExpiry} onChange={(v) => set('notifyLicenseExpiry', v)} />
          <Toggle label="Low Fuel Alerts" desc="Alert when bus fuel falls below threshold" value={settings.notifyFuelThreshold} onChange={(v) => set('notifyFuelThreshold', v)} />
          <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Fuel Alert Threshold (%)" type="number" min="5" max="50" value={settings.fuelThreshold} onChange={(e) => set('fuelThreshold', +e.target.value)} />
            <Input label="Maintenance Lead Days" type="number" min="1" max="30" value={settings.maintenanceLeadDays} onChange={(e) => set('maintenanceLeadDays', +e.target.value)} />
            <Input label="License Expiry Days" type="number" min="7" max="90" value={settings.licenseExpiryDays} onChange={(e) => set('licenseExpiryDays', +e.target.value)} />
          </div>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader title="Data & Security" icon={Shield} />
          <Toggle label="Auto Backup" desc="Automatically backup data daily" value={settings.autoBackup} onChange={(v) => set('autoBackup', v)} />
        </Card>

        <div className="flex justify-end">
          <Button type="submit" icon={Save} loading={saving}>
            {saved ? 'Saved!' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
