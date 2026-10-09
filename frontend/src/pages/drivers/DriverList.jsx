import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Users, Phone, Star, X, Save, AlertTriangle, UserCheck, UserMinus, UserX } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import RecordActions from '../../components/ui/RecordActions';
import { formatDate, initials } from '../../utils/helpers';
import { PROVINCES, ALL_DEPOTS } from '../../utils/depots';
import api from '../../services/api';

const SAMPLE_DRIVERS = [
  { _id: '1', name: 'Kamal Bandara', employeeId: 'D-0021', phone: '0771234567', licenseNumber: 'B123456', licenseExpiry: '2026-08-15', shift: 'morning', rating: 4.8, status: 'active', depot: 'Colombo Central' },
  { _id: '2', name: 'Suresh Silva', employeeId: 'D-0022', phone: '0719876543', licenseNumber: 'B234567', licenseExpiry: '2025-07-01', shift: 'afternoon', rating: 4.5, status: 'active', depot: 'Kandy Central' },
  { _id: '3', name: 'Priya Perera', employeeId: 'D-0023', phone: '0765552222', licenseNumber: 'B345678', licenseExpiry: '2025-09-20', shift: 'night', rating: 4.7, status: 'active', depot: 'Colombo Central' },
  { _id: '4', name: 'Anil Fernando', employeeId: 'D-0024', phone: '0703334444', licenseNumber: 'B456789', licenseExpiry: '2027-01-10', shift: 'morning', rating: 4.2, status: 'on_leave', depot: 'Galle' },
  { _id: '5', name: 'Ravi Wickrama', employeeId: 'D-0025', phone: '0787778888', licenseNumber: 'B567890', licenseExpiry: '2026-03-05', shift: 'afternoon', rating: 4.9, status: 'active', depot: 'Colombo Central' },
  { _id: '6', name: 'Chaminda Rajapaksa', employeeId: 'D-0026', phone: '0771112222', licenseNumber: 'B678901', licenseExpiry: '2025-06-30', shift: 'morning', rating: 4.0, status: 'active', depot: 'Kurunegala' },
  { _id: '7', name: 'Nimal Jayasena', employeeId: 'D-0027', phone: '0714445555', licenseNumber: 'B789012', licenseExpiry: '2025-05-12', shift: 'night', rating: 3.8, status: 'suspended', depot: 'Badulla' },
  { _id: '8', name: 'Samantha Kumara', employeeId: 'D-0028', phone: '0766667777', licenseNumber: 'B890123', licenseExpiry: '2028-02-28', shift: 'morning', rating: 4.6, status: 'active', depot: 'Jaffna' },
];

const genEmployeeId = () => `DRV-${Date.now().toString(36).toUpperCase()}`;

const BLANK_FORM = {
  name: '',
  nic: '',
  phone: '',
  email: '',
  assignedRoute: '',
  assignedBus: '',
  licenseNumber: '',
  licenseExpiry: '',
  licenseClass: 'D',
  shift: 'morning',
  depot: '',
  rating: 5,
  loginUsername: '',
  loginPassword: '',
};

const NIC_OLD = /^\d{9}[VvXx]$/;
const NIC_NEW = /^\d{12}$/;
const PHONE_RE = /^(?:\+94|0)[0-9]{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      <FieldError msg={error} />
    </div>
  );
}

function inputCls(hasError) {
  return `w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200'}`;
}

export default function DriverList() {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState(SAMPLE_DRIVERS);
  const [routeOptions, setRouteOptions] = useState([]);
  const [busOptions, setBusOptions] = useState([]);
  const [analytics, setAnalytics] = useState({ active: 0, onLeave: 0, suspended: 0, licenseWarnings: 0 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [depotFilter, setDepotFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [previewId, setPreviewId] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const refreshDrivers = async () => {
    const response = await api.get('/drivers?limit=200');
    if (response.data?.drivers) setDrivers(response.data.drivers);
  };

  useEffect(() => {
    refreshDrivers().catch(() => {});
    api.get('/drivers/analytics').then(({ data }) => setAnalytics(data)).catch(() => {});
    api.get('/routes/active').then(({ data }) => setRouteOptions(data.routes || [])).catch(() => {});
    api.get('/buses?limit=200').then(({ data }) => setBusOptions(data.buses || [])).catch(() => {});
  }, []);

  const filtered = drivers.filter((d) => {
    const matchSearch = !search || d.name?.toLowerCase().includes(search.toLowerCase()) || d.employeeId?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    const matchDepot = !depotFilter || d.depot === depotFilter;
    return matchSearch && matchStatus && matchDepot;
  });

  const validate = () => {
    const e = {};
    const today = new Date(); today.setHours(0, 0, 0, 0);

    if (!form.name.trim()) {
      e.name = 'Full name is required';
    } else if (form.name.trim().length < 2) {
      e.name = 'Name must be at least 2 characters';
    }

    if (!form.nic.trim()) {
      e.nic = 'NIC is required';
    } else if (!NIC_OLD.test(form.nic.trim()) && !NIC_NEW.test(form.nic.trim())) {
      e.nic = 'Invalid NIC — use 9 digits + V/X or 12 digits';
    }

    if (form.phone.trim() && !PHONE_RE.test(form.phone.replace(/[-\s]/g, ''))) {
      e.phone = 'Invalid phone — use 07XXXXXXXX or +947XXXXXXXX';
    }

    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) {
      e.email = 'Invalid email address';
    }

    if (!form.licenseNumber.trim()) {
      e.licenseNumber = 'License number is required';
    }

    if (!form.licenseExpiry) {
      e.licenseExpiry = 'License expiry date is required';
    } else if (new Date(form.licenseExpiry) <= today) {
      e.licenseExpiry = 'License must not be expired — enter a future date';
    }

    if (!form.depot) {
      e.depot = 'Depot is required';
    }

    if (!form.loginUsername.trim()) {
      e.loginUsername = 'Login username is required';
    } else if (form.loginUsername.trim().length < 3) {
      e.loginUsername = 'Username must be at least 3 characters';
    } else if (/\s/.test(form.loginUsername)) {
      e.loginUsername = 'Username must not contain spaces';
    }

    if (!form.loginPassword) {
      e.loginPassword = 'Password is required';
    } else if (form.loginPassword.length < 6) {
      e.loginPassword = 'Password must be at least 6 characters';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    setSubmitError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, loginEmail: form.email || undefined };
      if (!payload.assignedRoute) delete payload.assignedRoute;
      if (!payload.assignedBus) delete payload.assignedBus;
      if (!payload.email) delete payload.email;
      const { data } = await api.post('/drivers', payload);
      if (data?.driver) {
        setDrivers((prev) => [data.driver, ...prev.filter((d) => d._id !== data.driver._id)]);
      } else {
        await refreshDrivers();
      }
      setShowModal(false);
      setForm(BLANK_FORM);
      setErrors({});
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to save driver. Check the details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (driverId) => {
    setDeletingId(driverId);
    try {
      await api.delete(`/drivers/${driverId}`);
      setDrivers((prev) => prev.filter((d) => d._id !== driverId));
    } catch (err) {
      console.error('Failed to delete driver', err);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      key: 'name', label: 'Driver', accessor: 'name', sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{initials(val)}</div>
          <div>
            <p className="font-semibold text-gray-900">{val}</p>
            <p className="text-xs text-gray-500">{row.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'depot', label: 'Depot', accessor: 'depot',
      render: (v) => v ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">{v}</span> : '—',
    },
    {
      key: 'phone', label: 'Contact', accessor: 'phone',
      render: (v) => v ? <span className="flex items-center gap-1 text-gray-700 text-sm"><Phone size={12} className="text-gray-400" />{v}</span> : '—',
    },
    { key: 'licenseNumber', label: 'License #', accessor: 'licenseNumber' },
    {
      key: 'licenseExpiry', label: 'License Expiry', accessor: 'licenseExpiry',
      render: (v) => {
        if (!v) return '—';
        const daysLeft = Math.ceil((new Date(v) - Date.now()) / 86400000);
        const expired = daysLeft < 0;
        const expiring = daysLeft >= 0 && daysLeft <= 30;
        return (
          <div>
            <span className={`text-sm font-medium ${expired ? 'text-red-700 font-bold' : expiring ? 'text-amber-600 font-bold' : 'text-gray-700'}`}>{formatDate(v)}</span>
            {expired && <p className="text-[10px] text-red-600 font-bold">EXPIRED</p>}
            {expiring && <p className="text-[10px] text-amber-600 font-semibold">{daysLeft}d left</p>}
          </div>
        );
      },
    },
    {
      key: 'shift', label: 'Shift', accessor: 'shift',
      render: (v) => v ? <span className="capitalize text-gray-700">{v}</span> : '—',
    },
    {
      key: 'rating', label: 'Rating', accessor: 'rating',
      render: (v) => v ? <span className="flex items-center gap-1 text-amber-600 font-bold"><Star size={12} />{Number(v).toFixed(1)}</span> : '—',
    },
    {
      key: 'status', label: 'Status', accessor: 'status',
      render: (v, row) => {
        const daysLeft = row?.licenseExpiry ? Math.ceil((new Date(row.licenseExpiry) - Date.now()) / 86400000) : null;
        const licenseExpired = daysLeft !== null && daysLeft < 0;
        const licenseExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

        if (licenseExpired) {
          return (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
              ⚠ License Expired
            </span>
          );
        }
        if (licenseExpiring) {
          return (
            <div className="flex flex-col gap-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${v === 'active' ? 'bg-emerald-100 text-emerald-700' : v === 'on_leave' ? 'bg-amber-100 text-amber-700' : v === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                {v?.replace('_', ' ') || '—'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                ⚠ Expiring in {daysLeft}d
              </span>
            </div>
          );
        }
        const map = {
          active: 'bg-emerald-100 text-emerald-700',
          on_leave: 'bg-amber-100 text-amber-700',
          suspended: 'bg-red-100 text-red-700',
          inactive: 'bg-gray-100 text-gray-500',
        };
        return (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${map[v] || 'bg-gray-100 text-gray-500'}`}>
            {v?.replace('_', ' ') || '—'}
          </span>
        );
      },
    },
    {
      key: 'actions', label: 'Actions', accessor: '_id',
      render: (val) => (
        <RecordActions
          onDetails={() => navigate(`/drivers/${val}`)}
          onEdit={() => navigate(`/drivers/${val}?edit=1`)}
          onDelete={() => handleDelete(val)}
          deleteLoading={deletingId === val}
        />
      ),
    },
  ];

  const licenseWarningCount = analytics.licenseWarnings ?? drivers.filter((d) => d.licenseExpiry && new Date(d.licenseExpiry) <= new Date(Date.now() + 30 * 86400000)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Driver Management</h2>
          <p className="text-sm text-gray-500">Manage all drivers and assignments</p>
        </div>
        <Button icon={Plus} onClick={() => { setSubmitError(''); setErrors({}); setForm(BLANK_FORM); setPreviewId(genEmployeeId()); setShowModal(true); }}>Add Driver</Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Active', value: analytics.active || drivers.filter((d) => d.status === 'active').length, icon: UserCheck, color: 'from-emerald-400 to-green-600' },
          { label: 'On Leave', value: analytics.onLeave || drivers.filter((d) => d.status === 'on_leave').length, icon: UserMinus, color: 'from-amber-400 to-orange-500' },
          { label: 'Suspended', value: analytics.suspended || drivers.filter((d) => d.status === 'suspended').length, icon: UserX, color: 'from-rose-400 to-red-600' },
          { label: 'License Expiring', value: licenseWarningCount, icon: AlertTriangle, color: 'from-red-500 to-red-700' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card padding="p-4" className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                <s.icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-xl font-black text-gray-900">{s.value}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {licenseWarningCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-semibold">
            {licenseWarningCount} driver license(s) expiring within 30 days — review and renew promptly.
          </p>
        </div>
      )}

      <Card padding="p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search drivers..." className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input max-w-[160px]">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={depotFilter} onChange={(e) => setDepotFilter(e.target.value)} className="input max-w-[200px]">
            <option value="">All Depots</option>
            {PROVINCES.map((province) => (
              <optgroup key={province.name} label={province.name}>
                {province.depots.map((d) => <option key={d} value={d}>{d}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </Card>

      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">All Drivers</h3>
            <p className="text-xs text-gray-500">{filtered.length} drivers</p>
          </div>
        </div>
        <div className="p-5">
          <Table columns={columns} data={filtered} loading={loading} emptyMessage="No drivers found." onRowClick={(row) => navigate(`/drivers/${row._id}`)} />
        </div>
      </Card>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-red-500 to-red-700 px-6 py-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white">Add New Driver</h2>
                  <p className="text-xs text-red-100">Register a new driver to the system</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white"><X size={16} /></button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {submitError && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-semibold">{submitError}</p>
                  </div>
                )}

                {/* Personal Info */}
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Personal Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name" required error={errors.name}>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Kamal Bandara" className={inputCls(errors.name)} />
                  </Field>
                  <Field label="Employee ID">
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                      <span className="text-sm font-bold text-red-700 tracking-wide flex-1">{previewId}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 whitespace-nowrap">Auto-generated</span>
                    </div>
                  </Field>
                  <Field label="NIC" required error={errors.nic}>
                    <input value={form.nic} onChange={(e) => setForm({ ...form, nic: e.target.value })}
                      placeholder="199912345678 or 123456789V" className={inputCls(errors.nic)} />
                  </Field>
                  <Field label="Phone Number" error={errors.phone}>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="0771234567" className={inputCls(errors.phone)} />
                  </Field>
                  <div className="col-span-2">
                    <Field label="Email Address" error={errors.email}>
                      <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="driver@sltb.lk" className={inputCls(errors.email)} />
                    </Field>
                  </div>
                </div>

                {/* License Info */}
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pt-1">License Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="License Number" required error={errors.licenseNumber}>
                    <input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                      placeholder="e.g. B123456" className={inputCls(errors.licenseNumber)} />
                  </Field>
                  <Field label="License Class" error={errors.licenseClass}>
                    <select value={form.licenseClass} onChange={(e) => setForm({ ...form, licenseClass: e.target.value })}
                      className={inputCls(false)}>
                      {['A', 'B', 'C', 'D', 'E'].map((c) => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Field label="License Expiry Date" required error={errors.licenseExpiry}>
                      <input type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })}
                        min={new Date().toISOString().slice(0, 10)}
                        className={inputCls(errors.licenseExpiry)} />
                    </Field>
                  </div>
                </div>

                {/* Assignment */}
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pt-1">Assignment</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Depot" required error={errors.depot}>
                    <select value={form.depot} onChange={(e) => setForm({ ...form, depot: e.target.value })}
                      className={inputCls(errors.depot)}>
                      <option value="">Select depot...</option>
                      {PROVINCES.map((province) => (
                        <optgroup key={province.name} label={province.name}>
                          {province.depots.map((d) => <option key={d} value={d}>{d}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </Field>
                  <Field label="Shift">
                    <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })}
                      className={inputCls(false)}>
                      <option value="morning">Morning</option>
                      <option value="evening">Evening</option>
                      <option value="night">Night</option>
                      <option value="split">Split</option>
                    </select>
                  </Field>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Performance Rating</label>
                    <div className="flex items-center gap-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = star <= (hoverRating || form.rating);
                          return (
                            <button key={star} type="button"
                              onClick={() => setForm({ ...form, rating: star })}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="transition-transform hover:scale-125 focus:outline-none">
                              <Star size={28} className={filled ? 'text-amber-400' : 'text-gray-200'} fill={filled ? 'currentColor' : 'none'} />
                            </button>
                          );
                        })}
                      </div>
                      <div className="border-l border-amber-200 pl-4">
                        <p className="text-2xl font-black text-amber-600">{(hoverRating || form.rating).toFixed(1)}</p>
                        <p className="text-[10px] font-semibold text-amber-500">
                          {(hoverRating || form.rating) === 5 ? 'Excellent' : (hoverRating || form.rating) >= 4 ? 'Good' : (hoverRating || form.rating) >= 3 ? 'Average' : (hoverRating || form.rating) >= 2 ? 'Below Average' : 'Poor'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Field label="Assign Route">
                    <select value={form.assignedRoute} onChange={(e) => setForm({ ...form, assignedRoute: e.target.value })}
                      className={inputCls(false)}>
                      <option value="">No route</option>
                      {routeOptions.map((r) => <option key={r._id} value={r._id}>{r.routeNumber} — {r.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Assign Bus">
                    <select value={form.assignedBus} onChange={(e) => setForm({ ...form, assignedBus: e.target.value })}
                      className={inputCls(false)}>
                      <option value="">No bus</option>
                      {busOptions.map((b) => <option key={b._id} value={b._id}>{b.busNumber} ({b.registrationNumber})</option>)}
                    </select>
                  </Field>
                </div>

                {/* Login Credentials */}
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pt-1">Login Credentials</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Username" required error={errors.loginUsername}>
                    <input value={form.loginUsername} onChange={(e) => setForm({ ...form, loginUsername: e.target.value })}
                      placeholder="e.g. drv0021" className={inputCls(errors.loginUsername)} />
                  </Field>
                  <Field label="Password" required error={errors.loginPassword}>
                    <input type="password" value={form.loginPassword} onChange={(e) => setForm({ ...form, loginPassword: e.target.value })}
                      placeholder="min 6 characters" className={inputCls(errors.loginPassword)} />
                  </Field>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} loading={saving} icon={Save}>Add Driver</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
