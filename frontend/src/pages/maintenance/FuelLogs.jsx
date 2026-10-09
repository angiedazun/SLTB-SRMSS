import { useState, useEffect, useContext } from 'react';
import { Plus, Search, Fuel, TrendingDown, BarChart2, Bus, Calendar, Gauge, DollarSign, Droplets, X, Save, Edit3 } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import RecordActions from '../../components/ui/RecordActions';
import FuelChart from '../../components/charts/FuelChart';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const SAMPLE_BUSES = [
  { _id: 'b1', busNumber: 'NB-4982' },
  { _id: 'b2', busNumber: 'NA-3211' },
  { _id: 'b3', busNumber: 'NC-8890' },
  { _id: 'b4', busNumber: 'ND-1148' },
];

const SAMPLE_LOGS = [
  { _id: 'f1', bus: { busNumber: 'NB-4982' }, date: new Date(), quantity: 96, pricePerLiter: 365, totalCost: 35040, currentMileage: 84510, fuelType: 'diesel' },
  { _id: 'f2', bus: { busNumber: 'NA-3211' }, date: new Date(Date.now() - 86400000), quantity: 84, pricePerLiter: 365, totalCost: 30660, currentMileage: 102300, fuelType: 'diesel' },
  { _id: 'f3', bus: { busNumber: 'NC-8890' }, date: new Date(Date.now() - 172800000), quantity: 72, pricePerLiter: 365, totalCost: 26280, currentMileage: 76490, fuelType: 'diesel' },
];

const DEFAULT_FORM = {
  busId: '',
  date: new Date().toISOString().slice(0, 10),
  quantity: '',
  pricePerLiter: '',
  fuelType: 'diesel',
};

export default function FuelLogs() {
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busFilter, setBusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [summary, setSummary] = useState(null);
  const [buses, setBuses] = useState(SAMPLE_BUSES);
  const [showModal, setShowModal] = useState(false);
  const [detailLog, setDetailLog] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const { user } = useContext(AuthContext) || {};

  const resolveBusLabel = (busValue) => {
    if (!busValue) return '—';
    if (typeof busValue === 'object') {
      return busValue.busNumber || busValue.registrationNumber || '—';
    }
    return buses.find((bus) => bus._id === busValue)?.busNumber || '—';
  };

  const normalizeLog = (log) => ({
    ...log,
    bus: log.bus,
  });

  const canDeleteLog = () => {
    return !!user;
  };

  const makeSummary = (items) => {
    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const totalCost = items.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    return {
      totalQuantity,
      totalCost,
      count: items.length,
      avgPerTrip: items.length ? totalQuantity / items.length : 0,
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, analyticsRes] = await Promise.all([
        api.get(`/fuel?page=${page}&search=${search}&limit=12${busFilter ? `&bus=${busFilter}` : ''}`),
        api.get('/fuel/analytics?period=30'),
      ]);
      const incomingLogs = logsRes.data.logs?.length ? logsRes.data.logs : SAMPLE_LOGS;
      setLogs(incomingLogs);
      setPagination(logsRes.data.pagination);
      setSummary(logsRes.data.summary || makeSummary(incomingLogs));
      setAnalytics(analyticsRes.data.daily || analyticsRes.data.dailyData || []);
    } catch {
      setLogs(SAMPLE_LOGS);
      setSummary(makeSummary(SAMPLE_LOGS));
      setAnalytics([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, search, busFilter]);

  useEffect(() => {
    api.get('/buses?limit=200')
      .then((res) => {
        if (res.data?.buses?.length) {
          setBuses(res.data.buses);
        }
      })
      .catch(() => {});
  }, []);

  const validate = () => {
    const next = {};
    if (!form.busId) next.busId = 'Select a bus';
    if (!form.date) next.date = 'Date is required';
    if (!form.quantity || Number(form.quantity) <= 0) next.quantity = 'Enter valid quantity';
    if (!form.pricePerLiter || Number(form.pricePerLiter) <= 0) next.pricePerLiter = 'Enter valid price';
    setErrors(next);
    return !Object.keys(next).length;
  };

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setErrors({});
    setEditingLogId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (log) => {
    const busId = typeof log.bus === 'object' ? log.bus?._id || '' : log.bus || '';
    setEditingLogId(log._id);
    setForm({
      busId,
      date: String(log.date || new Date()).slice(0, 10),
      quantity: String(log.quantity ?? ''),
      pricePerLiter: String(log.pricePerLiter ?? ''),
      fuelType: log.fuelType || 'diesel',
    });
    setShowModal(true);
  };

  const openDetails = (log) => {
    setDetailLog(log);
    setShowDetailModal(true);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/fuel/${id}`);
      setLogs((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      console.error('Failed to delete fuel log', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    const selectedBus = buses.find((b) => b._id === form.busId);
    const payload = {
      bus: form.busId,
      date: form.date,
      quantity: Number(form.quantity),
      pricePerLiter: Number(form.pricePerLiter),
      fuelType: form.fuelType,
    };

    try {
      const request = editingLogId ? api.put(`/fuel/${editingLogId}`, payload) : api.post('/fuel', payload);
      const res = await request;
      const created = normalizeLog(res.data?.log || {
        _id: Date.now().toString(),
        bus: { busNumber: selectedBus?.busNumber || 'Unknown', _id: form.busId },
        date: form.date,
        quantity: payload.quantity,
        pricePerLiter: payload.pricePerLiter,
        totalCost: payload.quantity * payload.pricePerLiter,
        currentMileage: payload.currentMileage,
        fuelType: payload.fuelType,
      });
      const updated = editingLogId
        ? logs.map((item) => (item._id === editingLogId ? created : item))
        : [created, ...logs];
      setLogs(updated);
      setSummary(makeSummary(updated));
      setShowModal(false);
      setEditingLogId(null);
      resetForm();
    } catch {
      const fallback = normalizeLog({
        _id: Date.now().toString(),
        bus: { busNumber: selectedBus?.busNumber || 'Unknown', _id: form.busId },
        date: form.date,
        quantity: payload.quantity,
        pricePerLiter: payload.pricePerLiter,
        totalCost: payload.quantity * payload.pricePerLiter,
        currentMileage: payload.currentMileage,
        fuelType: payload.fuelType,
      });
      const updated = editingLogId
        ? logs.map((item) => (item._id === editingLogId ? fallback : item))
        : [fallback, ...logs];
      setLogs(updated);
      setSummary(makeSummary(updated));
      setShowModal(false);
      setEditingLogId(null);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'bus', label: 'Bus', accessor: 'bus',
      render: (val) => <span className="font-bold text-gray-800">{val?.busNumber || '—'}</span>
    },
    { key: 'date', label: 'Date', accessor: 'date',
      render: (val) => formatDate(val)
    },
    { key: 'quantity', label: 'Quantity', accessor: 'quantity',
      render: (val) => <span className="font-medium text-gray-700">{val} L</span>
    },
    { key: 'pricePerLiter', label: 'Price/L', accessor: 'pricePerLiter',
      render: (val) => val ? `Rs. ${val.toFixed(2)}` : '—'
    },
    { key: 'totalCost', label: 'Total Cost', accessor: 'totalCost',
      render: (val) => <span className="font-semibold text-gray-800">{formatCurrency(val)}</span>
    },
    { key: 'currentMileage', label: 'Mileage', accessor: 'currentMileage',
      render: (val) => val ? `${val.toLocaleString()} km` : '—'
    },
    { key: 'fuelType', label: 'Type', accessor: 'fuelType',
      render: (val) => <span className="capitalize text-gray-600">{val || '—'}</span>
    },
    { key: 'efficiency', label: 'km/L', accessor: 'efficiency',
      render: (val, row) => {
        const eff = val ?? (row.currentMileage && row.previousMileage && row.quantity
          ? ((row.currentMileage - row.previousMileage) / row.quantity).toFixed(2)
          : null);
        return eff !== null && eff !== undefined ? <span className={`font-semibold text-sm ${Number(eff) >= 4 ? 'text-green-600' : Number(eff) >= 2.5 ? 'text-amber-600' : 'text-red-500'}`}>{Number(eff).toFixed(2)}</span> : <span className="text-gray-300">—</span>;
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      accessor: '_id',
      render: (val, row) => {
          const canDelete = !!user;
          return (
            <RecordActions
              onDetails={() => openDetails(row)}
              onEdit={() => openEditModal(row)}
              onDelete={canDelete ? () => handleDelete(val) : undefined}
              deleteLoading={deletingId === val}
            />
          );
        },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Fuel Logs</h2>
          <p className="text-sm text-gray-500">Track fuel consumption and costs</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>Log Fuel</Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Consumed', value: `${(summary.totalQuantity || 0).toFixed(0)} L`, icon: Fuel, color: 'from-red-500 to-red-700' },
            { label: 'Total Cost', value: formatCurrency(summary.totalCost), icon: TrendingDown, color: 'from-emerald-400 to-green-600' },
            { label: 'Avg Per Trip', value: `${(summary.avgPerTrip || 0).toFixed(1)} L`, icon: BarChart2, color: 'from-amber-400 to-orange-500' },
            { label: 'Records', value: summary.count || 0, icon: Search, color: 'from-red-400 to-rose-600' },
          ].map((s) => (
            <Card key={s.label} padding="p-4" className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                <s.icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className="text-lg font-black text-gray-900">{s.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {analytics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader title="Consumption (30 Days)" />
            <FuelChart data={analytics} />
          </Card>
          <Card>
            <CardHeader title="Cost (30 Days)" />
            <FuelChart data={analytics} currency />
          </Card>
        </div>
      )}

      {/* Table */}
      <Card padding="p-4">
        <div className="flex gap-3 flex-wrap mb-4">
          <div className="relative max-w-sm flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search logs..." className="input pl-10" />
          </div>
          <select value={busFilter} onChange={(e) => { setBusFilter(e.target.value); setPage(1); }} className="input max-w-[200px]">
            <option value="">All Buses</option>
            {buses.map((b) => <option key={b._id} value={b._id}>{b.busNumber || b.registrationNumber}</option>)}
          </select>
        </div>
        <Table columns={columns} data={logs} loading={loading} emptyMessage="No fuel logs." pagination={pagination} onPageChange={setPage} />
      </Card>

      {/* ── Fuel Log Form Modal (custom, no Modal wrapper) ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && !saving && (setShowModal(false), resetForm())}>
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">

            {/* Gradient header */}
            <div className="px-6 py-5 flex items-center justify-between bg-gradient-to-r from-red-500 to-red-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  {editingLogId ? <Edit3 size={18} className="text-white" /> : <Fuel size={18} className="text-white" />}
                </div>
                <div>
                  <h2 className="text-base font-black text-white">{editingLogId ? 'Edit Fuel Log' : 'Log Fuel Entry'}</h2>
                  <p className="text-xs text-white/70">{editingLogId ? 'Update fuel record details' : 'Record a new fuel fill-up'}</p>
                </div>
              </div>
              <button onClick={() => { if (!saving) { setShowModal(false); resetForm(); } }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                <X size={15} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Bus select */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Bus</label>
                <div className={`flex items-center gap-3 border rounded-2xl px-4 py-3 transition-all ${errors.busId ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-red-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100'}`}>
                  <Bus size={16} className="text-gray-400 flex-shrink-0" />
                  <select value={form.busId} onChange={(e) => setForm(p => ({ ...p, busId: e.target.value }))}
                    className="flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none appearance-none">
                    <option value="">Select bus...</option>
                    {buses.map((bus) => (
                      <option key={bus._id} value={bus._id}>{bus.busNumber || bus.registrationNumber}</option>
                    ))}
                  </select>
                </div>
                {errors.busId && <p className="text-xs text-red-500 mt-1 pl-1">{errors.busId}</p>}
              </div>

              {/* Fuel type toggle */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Fuel Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'diesel', label: 'Diesel', color: 'from-amber-500 to-orange-500', lightBg: 'bg-amber-50 border-amber-300 text-amber-800' },
                    { value: 'petrol', label: 'Petrol', color: 'from-blue-500 to-indigo-600', lightBg: 'bg-blue-50 border-blue-300 text-blue-800' },
                  ].map((ft) => (
                    <button key={ft.value} type="button"
                      onClick={() => setForm(p => ({ ...p, fuelType: ft.value }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                        form.fuelType === ft.value
                          ? `bg-gradient-to-r ${ft.color} text-white border-transparent shadow-md`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                      }`}>
                      <Droplets size={14} /> {ft.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Date</label>
                <div className={`flex items-center gap-3 border rounded-2xl px-4 py-3 transition-all ${errors.date ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-red-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100'}`}>
                  <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                  <input type="date" value={form.date}
                    onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))}
                    className="flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none" />
                </div>
                {errors.date && <p className="text-xs text-red-500 mt-1 pl-1">{errors.date}</p>}
              </div>

              {/* Quantity + Price side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Quantity</label>
                  <div className={`flex items-center gap-2 border rounded-2xl px-3 py-3 transition-all ${errors.quantity ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-red-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100'}`}>
                    <Droplets size={15} className="text-gray-400 flex-shrink-0" />
                    <input type="number" min="0" step="0.1" placeholder="0.0" value={form.quantity}
                      onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
                      className="flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none w-0 min-w-0" />
                    <span className="text-xs font-bold text-gray-400">L</span>
                  </div>
                  {errors.quantity && <p className="text-xs text-red-500 mt-1 pl-1">{errors.quantity}</p>}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Price / Liter</label>
                  <div className={`flex items-center gap-2 border rounded-2xl px-3 py-3 transition-all ${errors.pricePerLiter ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus-within:border-red-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-red-100'}`}>
                    <span className="text-xs font-black text-gray-400">Rs</span>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={form.pricePerLiter}
                      onChange={(e) => setForm(p => ({ ...p, pricePerLiter: e.target.value }))}
                      className="flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none w-0 min-w-0" />
                  </div>
                  {errors.pricePerLiter && <p className="text-xs text-red-500 mt-1 pl-1">{errors.pricePerLiter}</p>}
                </div>
              </div>

              {/* Live total cost */}
              {form.quantity && form.pricePerLiter && Number(form.quantity) > 0 && Number(form.pricePerLiter) > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <DollarSign size={15} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-800">Total Cost</span>
                  </div>
                  <span className="text-lg font-black text-emerald-700">
                    Rs. {(Number(form.quantity) * Number(form.pricePerLiter)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}


            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button onClick={() => { if (!saving) { setShowModal(false); resetForm(); } }}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all shadow-md disabled:opacity-60 bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 shadow-red-200">
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                ) : (
                  <><Save size={15} /> {editingLogId ? 'Save Changes' : 'Save Fuel Log'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Fuel Log Details" subtitle="Full fuel entry information" icon={Fuel}
        footer={(
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>
        )}
      >
        {detailLog && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Bus</p><p className="font-semibold text-gray-900">{resolveBusLabel(detailLog.bus)}</p></div>
            <div><p className="text-xs text-gray-400">Date</p><p className="font-semibold text-gray-900">{formatDate(detailLog.date)}</p></div>
            <div><p className="text-xs text-gray-400">Quantity</p><p className="font-semibold text-gray-900">{detailLog.quantity} L</p></div>
            <div><p className="text-xs text-gray-400">Price / Liter</p><p className="font-semibold text-gray-900">{formatCurrency(detailLog.pricePerLiter)}</p></div>
            <div><p className="text-xs text-gray-400">Total Cost</p><p className="font-semibold text-gray-900">{formatCurrency(detailLog.totalCost)}</p></div>
            <div><p className="text-xs text-gray-400">Mileage</p><p className="font-semibold text-gray-900">{detailLog.currentMileage?.toLocaleString?.() || detailLog.currentMileage || '—'} km</p></div>
            <div><p className="text-xs text-gray-400">Fuel Type</p><p className="font-semibold text-gray-900 capitalize">{detailLog.fuelType || '—'}</p></div>
            <div><p className="text-xs text-gray-400">Efficiency</p><p className="font-semibold text-gray-900">{detailLog.efficiency ? `${detailLog.efficiency} km/L` : '—'}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
