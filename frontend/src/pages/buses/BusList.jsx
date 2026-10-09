import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Bus, X, Heart, Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import RecordActions from '../../components/ui/RecordActions';
import { PROVINCES } from '../../utils/depots';
import api from '../../services/api';

const SAMPLE_BUSES = [
  { _id: '1', busNumber: 'B-001', registrationNumber: 'WP CAB 1234', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', year: 2019, capacity: 52, fuelType: 'diesel', status: 'active', depot: 'Colombo' },
  { _id: '2', busNumber: 'B-002', registrationNumber: 'WP KF 4521', model: 'Tata Starbus', manufacturer: 'Tata', year: 2020, capacity: 45, fuelType: 'diesel', status: 'active', depot: 'Kandy' },
  { _id: '3', busNumber: 'B-003', registrationNumber: 'SP CA 8893', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', year: 2018, capacity: 52, fuelType: 'diesel', status: 'maintenance', depot: 'Galle' },
  { _id: '4', busNumber: 'B-004', registrationNumber: 'NP LA 2210', model: 'Tata Marcopolo', manufacturer: 'Tata', year: 2021, capacity: 40, fuelType: 'cng', status: 'active', depot: 'Jaffna' },
  { _id: '5', busNumber: 'B-005', registrationNumber: 'WP CAB 5678', model: 'Ashok Leyland Lynx', manufacturer: 'Ashok Leyland', year: 2022, capacity: 35, fuelType: 'diesel', status: 'active', depot: 'Colombo' },
  { _id: '6', busNumber: 'B-006', registrationNumber: 'CP BA 3390', model: 'Tata Starbus', manufacturer: 'Tata', year: 2017, capacity: 45, fuelType: 'diesel', status: 'out_of_service', depot: 'Kurunegala' },
  { _id: '7', busNumber: 'B-007', registrationNumber: 'EP KE 7712', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', year: 2020, capacity: 52, fuelType: 'diesel', status: 'active', depot: 'Badulla' },
  { _id: '8', busNumber: 'B-008', registrationNumber: 'SG AG 1145', model: 'Volvo B8R', manufacturer: 'Volvo', year: 2023, capacity: 49, fuelType: 'diesel', status: 'idle', depot: 'Colombo' },
];


function HealthScore({ score }) {
  if (score == null) return <span className="text-gray-300 text-xs">—</span>;
  const color =
    score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
    score >= 60 ? 'text-blue-600 bg-blue-50 border-blue-200' :
    score >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                  'text-red-600 bg-red-50 border-red-200';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15" fill="none"
            stroke={score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={`${(score / 100) * 94.25} 94.25`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-gray-700">{score}</span>
      </div>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
    </div>
  );
}

export default function BusList() {
  const navigate = useNavigate();
  const [buses, setBuses] = useState(SAMPLE_BUSES);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ busNumber: '', registrationNumber: '', model: '', manufacturer: '', year: new Date().getFullYear(), capacity: 45, fuelType: 'diesel', depot: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const refreshBuses = async () => {
    const r = await api.get('/buses?limit=50');
    if (r.data?.buses) setBuses(r.data.buses);
  };

  useEffect(() => {
    refreshBuses().catch(() => {});
  }, []);

  const stats = {
    total: buses.length,
    active: buses.filter(b => b.status === 'active').length,
    maintenance: buses.filter(b => b.status === 'maintenance').length,
    outOfService: buses.filter(b => b.status === 'out_of_service').length,
    idle: buses.filter(b => b.status === 'idle').length,
  };

  const filtered = buses.filter(b => {
    const matchSearch = !search || b.busNumber?.toLowerCase().includes(search.toLowerCase()) || b.registrationNumber?.toLowerCase().includes(search.toLowerCase()) || b.model?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const validate = () => {
    const e = {};
    if (!form.busNumber.trim()) e.busNumber = 'Required';
    if (!form.registrationNumber.trim()) e.registrationNumber = 'Required';
    if (!form.model.trim()) e.model = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try { await api.post('/buses', { ...form }); } catch {}
    setBuses((prev) => [...prev, { _id: Date.now().toString(), ...form, status: 'active' }]);
    setShowModal(false);
    setForm({ busNumber: '', registrationNumber: '', model: '', manufacturer: '', year: new Date().getFullYear(), capacity: 45, fuelType: 'diesel', depot: '' });
    setSaving(false);
  };

  const handleDelete = async (busId) => {
    setDeletingId(busId);
    try {
      await api.delete(`/buses/${busId}`);
      setBuses((prev) => prev.filter((bus) => bus._id !== busId));
    } catch (err) {
      console.error('Failed to delete bus', err);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { key: 'busNumber', label: 'Bus #', accessor: 'busNumber', sortable: true, render: (v) => <span className="font-bold text-red-700">{v}</span> },
    { key: 'registrationNumber', label: 'Reg. No.', accessor: 'registrationNumber', render: (v) => <span className="text-gray-700">{v}</span> },
    { key: 'model', label: 'Model', accessor: 'model', render: (v, row) => <div><p className="font-medium text-gray-900">{v}</p><p className="text-xs text-gray-400">{row.manufacturer} · {row.year}</p></div> },
    { key: 'capacity', label: 'Capacity', accessor: 'capacity', render: (v) => <span className="text-gray-700">{v} seats</span> },
    { key: 'fuelType', label: 'Fuel', accessor: 'fuelType', render: (v) => <Badge variant="info" className="capitalize">{v}</Badge> },
    { key: 'status', label: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v} /> },
    { key: 'healthScore', label: 'Health', accessor: 'healthScore', render: (v) => <HealthScore score={v} /> },
    { key: 'depot', label: 'Depot', accessor: 'depot', render: (v) => v ? <span className="text-gray-600">{v}</span> : '—' },
    {
      key: 'actions',
      label: 'Actions',
      accessor: '_id',
      render: (val) => (
        <RecordActions
          onDetails={() => navigate(`/buses/${val}`)}
          onEdit={() => navigate(`/buses/${val}?edit=1`)}
          onDelete={() => handleDelete(val)}
          deleteLoading={deletingId === val}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Fleet Management</h2>
          <p className="text-sm text-gray-500">Manage your bus fleet</p>
        </div>
        <Button icon={Plus} onClick={() => setShowModal(true)}>Add Bus</Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-700' },
          { label: 'Active', value: stats.active, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Maintenance', value: stats.maintenance, color: 'bg-amber-50 text-amber-700' },
          { label: 'Out of Service', value: stats.outOfService, color: 'bg-red-50 text-red-700' },
          { label: 'Idle', value: stats.idle, color: 'bg-slate-100 text-slate-600' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-2xl px-4 py-3 text-center`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <Card padding="p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search buses..." className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input max-w-[160px]">
            <option value="">All Status</option>
            {['active', 'maintenance', 'delayed', 'out_of_service', 'idle'].map((s) => <option key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </Card>

      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Bus size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">All Buses</h3>
            <p className="text-xs text-gray-500">{filtered.length} vehicles</p>
          </div>
        </div>
        <div className="p-5">
          <Table columns={columns} data={filtered} loading={loading} emptyMessage="No buses found." onRowClick={(row) => navigate(`/buses/${row._id}`)} />
        </div>
      </Card>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-700 px-6 py-5 flex items-center justify-between">
                <div><h2 className="text-lg font-black text-white">Add New Bus</h2><p className="text-xs text-red-100">Register a bus to the fleet</p></div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Bus Number *</label>
                    <input value={form.busNumber} onChange={(e) => setForm({ ...form, busNumber: e.target.value })} placeholder="e.g. B-042" className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${errors.busNumber ? 'border-red-400' : 'border-gray-200'}`} />
                    {errors.busNumber && <p className="text-xs text-red-500 mt-1">{errors.busNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Registration No. *</label>
                    <input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} placeholder="e.g. WP CAB 1234" className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${errors.registrationNumber ? 'border-red-400' : 'border-gray-200'}`} />
                    {errors.registrationNumber && <p className="text-xs text-red-500 mt-1">{errors.registrationNumber}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Manufacturer</label>
                    <input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Ashok Leyland" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Model *</label>
                    <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="e.g. Viking 222" className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${errors.model ? 'border-red-400' : 'border-gray-200'}`} />
                    {errors.model && <p className="text-xs text-red-500 mt-1">{errors.model}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Year</label>
                    <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Capacity</label>
                    <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Fuel Type</label>
                    <select value={form.fuelType} onChange={(e) => setForm({ ...form, fuelType: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                      <option value="diesel">Diesel</option>
                      <option value="petrol">Petrol</option>
                      <option value="cng">CNG</option>
                      <option value="electric">Electric</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Depot</label>
                  <select value={form.depot} onChange={(e) => setForm({ ...form, depot: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                    <option value="">Select depot...</option>
                    {PROVINCES.map((province) => (
                      <optgroup key={province.name} label={province.name}>
                        {province.depots.map((d) => <option key={d} value={d}>{d}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} loading={saving} icon={Save}>Add Bus</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

