import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Clock, X, Save, Edit, Trash2, CalendarCheck, CalendarX, AlertTriangle } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import { ConfirmDelete } from '../../components/ui/RecordActions';
import { formatDate } from '../../utils/helpers';
import api from '../../services/api';

const todayDate = () => new Date().toISOString().slice(0, 10);

const BLANK_FORM = {
  route: '',
  type: 'daily',
  effectiveFrom: todayDate(),
  effectiveTo: todayDate(),
  trips: [{ departureTime: '', arrivalTime: '', bus: '', driver: '' }],
};

const normalizeOperatingDays = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1));
  }
  return [];
};

function timeToMinutes(hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function daysUntilExpiry(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
}

export default function TimetableManagement() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [routesList, setRoutesList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [busesList, setBusesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busyDriverIds, setBusyDriverIds] = useState(new Set());
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const fetchSchedules = () => {
    setLoading(true);
    api.get(`/schedules?limit=100&search=${encodeURIComponent(search)}`)
      .then((r) => setSchedules((r.data?.schedules || []).map((s) => ({
        ...s,
        operatingDays: normalizeOperatingDays(s.operatingDays),
      }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSchedules(); }, [search]);

  useEffect(() => {
    api.get('/schedules/stats').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/routes?limit=300').then(({ data }) => setRoutesList(data?.routes || [])).catch(() => {});
    api.get('/drivers?status=active&limit=300').then(({ data }) => setDriversList((data?.drivers || []).filter((d) => d.status === 'active'))).catch(() => {});
    api.get('/buses?limit=300').then(({ data }) => setBusesList(data?.buses || [])).catch(() => {});
  }, []);

  const checkDriverAvailability = useCallback(async (fromDate, toDate, excludeId) => {
    if (!fromDate) { setBusyDriverIds(new Set()); return; }
    setCheckingAvailability(true);
    try {
      const { data } = await api.get('/schedules?status=active&limit=500');
      const all = data?.schedules || [];
      const from = new Date(fromDate); from.setHours(0, 0, 0, 0);
      const to = toDate ? new Date(toDate) : new Date(fromDate); to.setHours(23, 59, 59, 999);
      const busy = new Set();
      all.forEach((s) => {
        if (excludeId && String(s._id) === String(excludeId)) return;
        const sf = new Date(s.effectiveFrom); sf.setHours(0, 0, 0, 0);
        const st = s.effectiveTo ? new Date(s.effectiveTo) : new Date(s.effectiveFrom); st.setHours(23, 59, 59, 999);
        if (sf <= to && st >= from) {
          (s.trips || []).forEach((trip) => {
            const did = trip.driver?._id || trip.driver;
            if (did) busy.add(String(did));
          });
        }
      });
      setBusyDriverIds(busy);
    } catch {
      setBusyDriverIds(new Set());
    } finally {
      setCheckingAvailability(false);
    }
  }, []);

  useEffect(() => {
    if (showModal) checkDriverAvailability(form.effectiveFrom, form.effectiveTo, editingId);
  }, [form.effectiveFrom, form.effectiveTo, showModal, editingId, checkDriverAvailability]);

  const filtered = schedules.filter((s) =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase()) || s.scheduleCode?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedRouteName = (routeId) => {
    const r = routesList.find((r) => r._id === routeId);
    return r ? `${r.routeNumber} — ${r.name}` : '';
  };

  const validate = () => {
    const e = {};
    if (!form.route) e.route = 'Route is required';
    if (!form.effectiveFrom) e.effectiveFrom = 'Start date is required';
    if (form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom) {
      e.effectiveTo = 'End date cannot be before start date';
    }

    const tripErrors = [];
    form.trips.forEach((trip, i) => {
      const te = {};
      if (!trip.departureTime) te.departureTime = 'Required';
      if (!trip.arrivalTime) te.arrivalTime = 'Required';
      if (trip.departureTime && trip.arrivalTime) {
        if (timeToMinutes(trip.arrivalTime) <= timeToMinutes(trip.departureTime)) {
          te.arrivalTime = 'Arrival must be after departure';
        }
      }
      if (!trip.driver) te.driver = 'Driver is required';
      else if (busyDriverIds.has(String(trip.driver))) te.driver = 'Driver already scheduled during this period';
      if (Object.keys(te).length) tripErrors[i] = te;
    });
    if (tripErrors.length) e.tripErrors = tripErrors;

    const hasValid = form.trips.some((t) => t.departureTime && t.arrivalTime && t.driver);
    if (!hasValid && !tripErrors.length) e.trips = 'Add at least one trip with driver and times';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toPayload = () => {
    const routeName = selectedRouteName(form.route);
    return {
      title: `${routeName} — ${form.type} (${form.effectiveFrom})`,
      scheduleCode: '',
      route: form.route,
      type: form.type,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || form.effectiveFrom,
      trips: form.trips
        .filter((t) => t.departureTime && t.arrivalTime)
        .map((t) => ({
          departureTime: t.departureTime,
          arrivalTime: t.arrivalTime,
          bus: t.bus || undefined,
          driver: t.driver || undefined,
        })),
    };
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/schedules/${editingId}`, toPayload());
      } else {
        await api.post('/schedules', toPayload());
      }
      fetchSchedules();
      api.get('/schedules/stats').then(({ data }) => setStats(data)).catch(() => {});
      setShowModal(false);
      setEditingId(null);
      setForm(BLANK_FORM);
      setErrors({});
      setBusyDriverIds(new Set());
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: err.response?.data?.error || 'Failed to save schedule. Please check the details and try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setEditingId(row._id);
    setForm({
      route: row.route?._id || row.route || '',
      type: row.type || 'daily',
      effectiveFrom: row.effectiveFrom ? row.effectiveFrom.slice(0, 10) : '',
      effectiveTo: row.effectiveTo ? row.effectiveTo.slice(0, 10) : '',
      trips: row.trips?.length
        ? row.trips.map((t) => ({ departureTime: t.departureTime || '', arrivalTime: t.arrivalTime || '', bus: t.bus?._id || t.bus || '', driver: t.driver?._id || t.driver || '' }))
        : [{ departureTime: '', arrivalTime: '', bus: '', driver: '' }],
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try { await api.delete(`/schedules/${id}`); } catch {}
    setSchedules((prev) => prev.filter((s) => s._id !== id));
    setDeletingId(null);
  };

  const updateTrip = (index, key, value) => {
    setForm((prev) => ({ ...prev, trips: prev.trips.map((t, i) => (i === index ? { ...t, [key]: value } : t)) }));
  };

  const getDriverInfo = (driverId) => driversList.find((d) => String(d._id) === String(driverId));

  const columns = [
    { key: 'scheduleCode', label: 'Code', accessor: 'scheduleCode', sortable: true, render: (v) => <span className="font-bold text-red-700">{v}</span> },
    {
      key: 'title', label: 'Title / Route', accessor: 'title', sortable: true,
      render: (v, row) => (
        <div>
          <p className="font-semibold text-gray-900 max-w-[200px] truncate">{v}</p>
          <p className="text-xs text-gray-400 capitalize">{row.type}</p>
        </div>
      ),
    },
    { key: 'route', label: 'Route', accessor: 'route', render: (v) => <span className="text-sm text-gray-700">{v?.routeNumber ? `${v.routeNumber} — ${v.name}` : '—'}</span> },
    {
      key: 'drivers', label: 'Drivers', accessor: 'trips',
      render: (v) => {
        const drivers = [...new Map((v || []).filter((t) => t.driver).map((t) => [t.driver._id || t.driver, t.driver])).values()];
        if (!drivers.length) return <span className="text-gray-400">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {drivers.map((d) => (
              <button key={d._id || d} onClick={(e) => { e.stopPropagation(); navigate(`/drivers/${d._id || d}`); }}
                className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100">
                {d.name || d}
              </button>
            ))}
          </div>
        );
      },
    },
    { key: 'effectiveFrom', label: 'Start Date', accessor: 'effectiveFrom', render: (v) => v ? formatDate(v) : '—' },
    { key: 'effectiveTo', label: 'End Date', accessor: 'effectiveTo', render: (v) => v ? formatDate(v) : <span className="text-xs text-green-600 font-semibold">Same Day</span> },
    { key: 'trips', label: 'Trips', accessor: 'trips', render: (v) => <span className="font-medium text-gray-700">{v?.length || 0}</span> },
    { key: 'status', label: 'Status', accessor: 'status', render: (v) => <StatusBadge status={v || 'active'} /> },
    {
      key: 'actions', label: 'Actions', accessor: '_id',
      render: (val, row) => (
        <div className="flex gap-2">
          <button onClick={(e) => { e.stopPropagation(); handleEdit(row); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors">
            <Edit size={12} /> Edit
          </button>
          <button disabled={deletingId === val} onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(val); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-40">
            {deletingId === val ? <div className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={12} />} Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Timetable Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage schedule timetables and trips</p>
        </div>
        <Button icon={Plus} onClick={() => { setEditingId(null); setForm(BLANK_FORM); setErrors({}); setBusyDriverIds(new Set()); setShowModal(true); }}>New Schedule</Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Schedules', value: stats.total || filtered.length, icon: Clock, color: 'from-red-500 to-red-700' },
          { label: 'Active', value: stats.active || filtered.filter((s) => s.status === 'active').length, icon: CalendarCheck, color: 'from-emerald-400 to-green-600' },
          { label: 'Inactive / Draft', value: (stats.inactive || 0) + (stats.draft || 0), icon: CalendarX, color: 'from-amber-400 to-orange-500' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
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

      <Card padding="p-4">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search schedules..." className="input pl-10" />
        </div>
      </Card>

      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Clock size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">All Schedules</h3>
            <p className="text-xs text-gray-500">{filtered.length} records</p>
          </div>
        </div>
        <div className="p-5">
          <Table columns={columns} data={filtered} loading={loading} emptyMessage="No schedules found." />
        </div>
      </Card>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
              <div className={`${editingId ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-700'} px-6 py-5 flex items-center justify-between`}>
                <div>
                  <h2 className="text-lg font-black text-white">{editingId ? 'Edit Schedule' : 'New Schedule'}</h2>
                  <p className={`text-xs ${editingId ? 'text-amber-100' : 'text-red-100'}`}>{editingId ? 'Update schedule details' : 'Add a new bus schedule'}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white"><X size={16} /></button>
              </div>

              <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
                {errors.form && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 font-semibold">{errors.form}</p>
                  </div>
                )}

                {busyDriverIds.size > 0 && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 font-semibold">
                      {busyDriverIds.size} driver(s) already scheduled during this period — shown as &quot;Busy&quot; below.
                    </p>
                  </div>
                )}

                {/* Route */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Route <span className="text-red-500">*</span></label>
                  <select value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white ${errors.route ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                    <option value="">Select route...</option>
                    {routesList.map((r) => <option key={r._id} value={r._id}>{r.routeNumber} — {r.name}</option>)}
                  </select>
                  {errors.route && <p className="text-xs text-red-500 mt-1">{errors.route}</p>}
                </div>

                {/* Type + Dates */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                      {['daily', 'weekly', 'monthly', 'special'].map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                    <input type="date" value={form.effectiveFrom}
                      onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                      className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${errors.effectiveFrom ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                    {errors.effectiveFrom && <p className="text-xs text-red-500 mt-1">{errors.effectiveFrom}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">End Date</label>
                    <input type="date" value={form.effectiveTo} min={form.effectiveFrom}
                      onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                      className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${errors.effectiveTo ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                    {errors.effectiveTo && <p className="text-xs text-red-500 mt-1">{errors.effectiveTo}</p>}
                  </div>
                </div>

                {/* Trips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Trips, Drivers &amp; Buses <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {checkingAvailability && <span className="text-[10px] text-gray-400 animate-pulse">Checking availability...</span>}
                      <Button type="button" size="sm" variant="secondary" onClick={() => setForm((p) => ({ ...p, trips: [...p.trips, { departureTime: '', arrivalTime: '', bus: '', driver: '' }] }))}>Add Trip</Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {form.trips.map((trip, index) => {
                      const te = errors.tripErrors?.[index] || {};
                      const selectedDriver = trip.driver ? getDriverInfo(trip.driver) : null;
                      const driverDaysLeft = selectedDriver?.licenseExpiry ? daysUntilExpiry(selectedDriver.licenseExpiry) : null;
                      const licenseExpired = driverDaysLeft !== null && driverDaysLeft < 0;
                      const licenseExpiring = driverDaysLeft !== null && driverDaysLeft >= 0 && driverDaysLeft <= 30;

                      return (
                        <div key={`trip-${index}`} className="rounded-2xl border border-gray-200 p-3 bg-gray-50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500">TRIP {index + 1}</span>
                            {form.trips.length > 1 && (
                              <Button type="button" size="sm" variant="ghost" onClick={() => setForm((p) => ({ ...p, trips: p.trips.filter((_, i) => i !== index) }))}>Remove</Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">Departure <span className="text-red-500">*</span></label>
                              <input type="time" value={trip.departureTime} onChange={(e) => updateTrip(index, 'departureTime', e.target.value)}
                                className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${te.departureTime ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                              {te.departureTime && <p className="text-[11px] text-red-500 mt-1">{te.departureTime}</p>}
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">Arrival <span className="text-red-500">*</span></label>
                              <input type="time" value={trip.arrivalTime} onChange={(e) => updateTrip(index, 'arrivalTime', e.target.value)}
                                className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${te.arrivalTime ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                              {te.arrivalTime && <p className="text-[11px] text-red-500 mt-1">{te.arrivalTime}</p>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">Driver <span className="text-red-500">*</span></label>
                              <select value={trip.driver} onChange={(e) => updateTrip(index, 'driver', e.target.value)}
                                className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white ${te.driver ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                                <option value="">Select active driver...</option>
                                {driversList.map((d) => {
                                  const busy = busyDriverIds.has(String(d._id));
                                  const days = d.licenseExpiry ? daysUntilExpiry(d.licenseExpiry) : null;
                                  const expiredLic = days !== null && days < 0;
                                  const expiringLic = days !== null && days >= 0 && days <= 30;
                                  let suffix = '';
                                  if (busy) suffix = ' — Busy';
                                  else if (expiredLic) suffix = ' ⚠ License EXPIRED';
                                  else if (expiringLic) suffix = ` ⚠ License expires in ${days}d`;
                                  return (
                                    <option key={d._id} value={d._id} disabled={busy || expiredLic}>
                                      {d.name} ({d.employeeId}){suffix}
                                    </option>
                                  );
                                })}
                              </select>
                              {te.driver && <p className="text-[11px] text-red-500 mt-1">{te.driver}</p>}
                              {/* License warning for selected driver */}
                              {selectedDriver && licenseExpired && (
                                <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                                  <AlertTriangle size={12} className="text-red-600 flex-shrink-0" />
                                  <p className="text-[11px] text-red-700 font-semibold">
                                    License EXPIRED — {formatDate(selectedDriver.licenseExpiry)}. Cannot schedule this driver.
                                  </p>
                                </div>
                              )}
                              {selectedDriver && licenseExpiring && !licenseExpired && (
                                <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                  <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
                                  <p className="text-[11px] text-amber-800 font-semibold">
                                    License expiring in {driverDaysLeft} day(s) — {formatDate(selectedDriver.licenseExpiry)}. Renew before scheduling.
                                  </p>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1">Bus</label>
                              <select value={trip.bus} onChange={(e) => updateTrip(index, 'bus', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                                <option value="">Select bus...</option>
                                {busesList.map((bus) => <option key={bus._id} value={bus._id}>{bus.busNumber || bus.registrationNumber}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {errors.trips && <p className="text-xs text-red-500 mt-1">{errors.trips}</p>}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} loading={saving} icon={Save}>{editingId ? 'Save Changes' : 'Create Schedule'}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmDeleteId && (
        <ConfirmDelete
          label="this schedule"
          onConfirm={() => { handleDelete(confirmDeleteId); setConfirmDeleteId(null); }}
          onCancel={() => setConfirmDeleteId(null)}
          loading={deletingId === confirmDeleteId}
        />
      )}
    </div>
  );
}
