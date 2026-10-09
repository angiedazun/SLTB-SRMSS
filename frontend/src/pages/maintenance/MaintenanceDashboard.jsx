import { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Wrench, Clock, AlertTriangle, CheckCircle, X, Save } from 'lucide-react';
import Card from '../../components/ui/Card';
import StatsCard from '../../components/dashboard/StatsCard';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import RecordActions from '../../components/ui/RecordActions';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const SAMPLE_RECORDS = [
  { _id: '1', bus: { busNumber: 'B-003' }, title: 'Engine Oil Change', category: 'preventive', priority: 'medium', scheduledDate: '2025-06-05', cost: 15000, status: 'completed' },
  { _id: '2', bus: { busNumber: 'B-006' }, title: 'Brake Pad Replacement', category: 'corrective', priority: 'high', scheduledDate: '2025-06-08', cost: 32000, status: 'in_progress' },
  { _id: '3', bus: { busNumber: 'B-001' }, title: 'AC System Repair', category: 'corrective', priority: 'medium', scheduledDate: '2025-06-12', cost: 48000, status: 'pending' },
  { _id: '4', bus: { busNumber: 'B-004' }, title: 'Tire Replacement (4x)', category: 'preventive', priority: 'high', scheduledDate: '2025-06-15', cost: 72000, status: 'pending' },
  { _id: '5', bus: { busNumber: 'B-007' }, title: 'Transmission Service', category: 'preventive', priority: 'critical', scheduledDate: '2025-06-03', cost: 95000, status: 'in_progress' },
  { _id: '6', bus: { busNumber: 'B-002' }, title: 'Windshield Crack Repair', category: 'corrective', priority: 'low', scheduledDate: '2025-06-18', cost: 12000, status: 'pending' },
];

const PRIORITY_COLORS = { critical: 'critical', high: 'high', medium: 'medium', low: 'low' };
const STATUS_STEPS = ['pending', 'in_progress', 'completed'];

const UI_TO_BACKEND_STATUS = {
  pending: 'scheduled',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

const BACKEND_TO_UI_STATUS = {
  scheduled: 'pending',
  pending: 'pending',
  in_progress: 'in_progress',
  completed: 'completed',
  cancelled: 'cancelled',
};

const UI_TO_BACKEND_TYPE = {
  preventive: 'preventive',
  corrective: 'repair',
  emergency: 'emergency',
};

const STATUS_LABEL = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
};

const STATUS_NEXT = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: null,
};

const STATUS_ACTION_LABEL = {
  in_progress: 'Move to In Progress',
  completed: 'Mark Completed',
};

export default function MaintenanceDashboard() {
  const [records, setRecords] = useState(SAMPLE_RECORDS);
  const [stats, setStats] = useState({ pending: 3, inProgress: 2, completed: 14, critical: 1 });
  const [loading, setLoading] = useState(false);
  const [buses, setBuses] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [costTrends, setCostTrends] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailRecord, setDetailRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [form, setForm] = useState({ busId: '', title: '', category: 'preventive', priority: 'medium', scheduledDate: '', description: '', estimatedCost: '' });
  const [errors, setErrors] = useState({});

  const { user } = useContext(AuthContext) || {};

  const resolveBusLabel = (busValue) => {
    if (!busValue) return '—';
    if (typeof busValue === 'string') {
      return buses.find((bus) => bus._id === busValue)?.busNumber || buses.find((bus) => bus.busNumber === busValue)?.busNumber || '—';
    }
    return busValue.busNumber || busValue.registrationNumber || buses.find((bus) => bus._id === busValue._id)?.busNumber || '—';
  };

  const canDeleteRecord = () => !!user;

  const normalizeRecord = (record) => ({
    ...record,
    bus: record.bus || record.busId || record.busNumber || null,
    status: BACKEND_TO_UI_STATUS[record.status] || record.status || 'pending',
    type: record.type || record.category || 'preventive',
    cost: record.cost ?? record.totalCost ?? 0,
  });

  const openCreateModal = () => {
    setEditingRecordId(null);
    setForm({ busId: '', title: '', category: 'preventive', priority: 'medium', scheduledDate: '', description: '', estimatedCost: '' });
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (record) => {
    const busId = typeof record.bus === 'object' ? record.bus?._id || '' : record.bus || '';
    setEditingRecordId(record._id);
    setForm({
      busId,
      title: record.title || '',
      category: record.type || record.category || 'preventive',
      priority: record.priority || 'medium',
      scheduledDate: record.scheduledDate ? String(record.scheduledDate).slice(0, 10) : '',
      description: record.description || '',
      estimatedCost: String(record.cost ?? ''),
    });
    setErrors({});
    setShowModal(true);
  };

  const openDetails = (record) => {
    setDetailRecord(record);
    setShowDetailModal(true);
  };

  const normalizeStats = (payload) => ({
    pending:
      payload?.pending ??
      payload?.statusBreakdown?.find((item) => item._id === 'scheduled')?.count ??
      payload?.statusBreakdown?.find((item) => item._id === 'pending')?.count ??
      0,
    inProgress: payload?.inProgress ?? payload?.statusBreakdown?.find((item) => item._id === 'in_progress')?.count ?? 0,
    completed: payload?.completed ?? payload?.statusBreakdown?.find((item) => item._id === 'completed')?.count ?? 0,
    critical: payload?.critical ?? 0,
  });

  const calculateStatsFromRecords = (list) => ({
    pending: list.filter((r) => r.status === 'pending').length,
    inProgress: list.filter((r) => r.status === 'in_progress').length,
    completed: list.filter((r) => r.status === 'completed').length,
    critical: list.filter((r) => r.priority === 'critical' && r.status !== 'completed' && r.status !== 'cancelled').length,
  });

  const getStatusMeta = (status) => {
    const nextStatus = STATUS_NEXT[status] || null;
    return {
      nextStatus,
      actionLabel: nextStatus ? STATUS_ACTION_LABEL[nextStatus] : 'Completed',
      actionTone: nextStatus === 'completed' ? 'from-emerald-500 to-green-600' : 'from-amber-400 to-orange-500',
    };
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get('/maintenance?limit=50'), api.get('/maintenance/stats'), api.get('/buses?limit=200')])
      .then(([recRes, statsRes, busesRes]) => {
        const loadedRecords = (recRes.data?.records || []).map(normalizeRecord);
        if (loadedRecords.length) setRecords(loadedRecords);
        if (statsRes.data) setStats(normalizeStats(statsRes.data));
        if (busesRes.data?.buses?.length) setBuses(busesRes.data.buses);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    api.get('/maintenance/cost-trends').then(({ data }) => setCostTrends(data)).catch(() => {});
  }, []);

  const handleStatusChange = async (recordId, newStatus) => {
    const target = records.find((r) => r._id === recordId);
    if (!target || target.status === newStatus) return;

    setUpdatingStatusId(recordId);

    try {
      await api.put(`/maintenance/${recordId}`, { status: UI_TO_BACKEND_STATUS[newStatus] || newStatus });
      setRecords((prev) => {
        const updated = prev.map((r) => (r._id === recordId ? { ...r, status: newStatus } : r));
        setStats(calculateStatsFromRecords(updated));
        return updated;
      });
    } catch (err) {
      console.error('Failed to update maintenance status', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const isRealId = (id) => /^[0-9a-fA-F]{24}$/.test(String(id));

  const handleDelete = async (recordId) => {
    setDeleteError('');
    if (!isRealId(recordId)) {
      // Sample/demo record — just remove from local state
      setRecords((prev) => {
        const updated = prev.filter((r) => r._id !== recordId);
        setStats(calculateStatsFromRecords(updated));
        return updated;
      });
      return;
    }
    setDeletingId(recordId);
    try {
      await api.delete(`/maintenance/${recordId}`);
      setRecords((prev) => {
        const updated = prev.filter((record) => record._id !== recordId);
        setStats(calculateStatsFromRecords(updated));
        return updated;
      });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to delete record. Please try again.';
      setDeleteError(msg);
      console.error('Failed to delete maintenance record', err);
    } finally {
      setDeletingId(null);
    }
  };

  const today = new Date(); today.setHours(0,0,0,0);
  const filtered = records.filter(r => {
    const busLabel = resolveBusLabel(r.bus);
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || busLabel.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || r.status === statusFilter;
    const matchPriority = !priorityFilter || r.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const validate = () => {
    const e = {};
    if (!form.busId) e.busId = 'Required';
    if (!form.title.trim()) e.title = 'Required';
    if (!form.scheduledDate) e.scheduledDate = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        bus: form.busId,
        title: form.title.trim(),
        type: UI_TO_BACKEND_TYPE[form.category] || form.category,
        priority: form.priority,
        scheduledDate: form.scheduledDate,
        description: form.description.trim(),
        cost: parseFloat(form.estimatedCost) || 0,
      };
      const response = editingRecordId
        ? await api.put(`/maintenance/${editingRecordId}`, payload)
        : await api.post('/maintenance', { ...payload, status: 'scheduled' });

      const created = response.data?.record;
      if (created) {
        const normalized = normalizeRecord(created);
        setRecords((prev) => {
          const updated = editingRecordId
            ? prev.map((record) => (record._id === editingRecordId ? normalized : record))
            : [normalized, ...prev];
          setStats(calculateStatsFromRecords(updated));
          return updated;
        });
      }

      setShowModal(false);
      setEditingRecordId(null);
      setForm({ busId: '', title: '', category: 'preventive', priority: 'medium', scheduledDate: '', description: '', estimatedCost: '' });
    } catch (err) {
      console.error('Failed to create maintenance record', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Maintenance Dashboard</h2>
          <p className="text-sm text-gray-500">Track fleet maintenance and repairs</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>New Record</Button>
      </div>

      {deleteError && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-semibold">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError('')} className="text-red-400 hover:text-red-600 font-black text-base leading-none">×</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard title="Pending" value={stats.pending} icon={Clock} gradient="bg-gradient-to-br from-amber-400 to-orange-500" delay={0} />
        <StatsCard title="In Progress" value={stats.inProgress} icon={Wrench} gradient="bg-gradient-to-br from-red-400 to-red-600" delay={0.08} />
        <StatsCard title="Completed" value={stats.completed} icon={CheckCircle} gradient="bg-gradient-to-br from-emerald-400 to-green-600" delay={0.16} />
        <StatsCard title="Critical" value={stats.critical} icon={AlertTriangle} gradient="bg-gradient-to-br from-rose-500 to-red-700" delay={0.24} />
      </div>

      {/* Cost Analytics */}
      {costTrends?.categoryBreakdown?.length > 0 && (
        <Card padding="p-5">
          <h3 className="font-bold text-gray-800 mb-3 text-sm">Cost Breakdown by Category</h3>
          <div className="flex flex-wrap gap-3">
            {costTrends.categoryBreakdown.map((cat) => (
              <div key={cat._id} className="bg-gray-50 rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[140px]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-gray-400 capitalize">{cat._id?.replace(/_/g, ' ') || 'Other'}</p>
                  <p className="font-black text-sm text-gray-900">LKR {(cat.totalCost || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400">{cat.count} records</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card padding="p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative max-w-xs flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search records..." className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input max-w-[160px]">
            <option value="">All Status</option>
            {['pending', 'in_progress', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="input max-w-[150px]">
            <option value="">All Priority</option>
            {['critical', 'high', 'medium', 'low'].map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
        </div>
      </Card>

      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-gradient-to-r from-white via-red-50/30 to-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 via-rose-600 to-red-700 flex items-center justify-center shadow-sm shadow-red-200/50 flex-shrink-0">
              <Wrench size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 leading-tight">Maintenance Records</h3>
              <p className="text-xs text-gray-500">{filtered.length} records · compact premium cards</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold">Modern</span>
            <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold">Premium</span>
          </div>
        </div>
          <div className="p-5">
            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-[1.75rem] border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
                    <div className="h-2 w-20 bg-red-100 rounded-full mb-4" />
                    <div className="h-5 w-48 bg-gray-100 rounded mb-4" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Array.from({ length: 3 }).map((__, j) => <div key={j} className="h-14 bg-gray-100 rounded-2xl" />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No maintenance records.</div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((record) => {
                  const canDelete = canDeleteRecord();
                  const isOverdue = record.scheduledDate && record.status !== 'completed' && record.status !== 'cancelled' && new Date(record.scheduledDate) < today;
                  return (
                  <div key={record._id} className={`group relative overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.08)] ${isOverdue ? 'border-red-400 ring-1 ring-red-400' : 'border-gray-100'}`}>
                    <div className={`absolute inset-x-0 top-0 h-1 ${record.status === 'completed' ? 'bg-emerald-500' : record.status === 'in_progress' ? 'bg-amber-500' : 'bg-red-500'}`} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 flex items-center justify-center text-gray-700 font-black flex-shrink-0">
                              {String(record.title || '').slice(0, 1).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-lg font-black text-gray-900 truncate">{record.title}</p>
                              <p className="text-sm text-gray-500 truncate">Bus {resolveBusLabel(record.bus)} · {record.type || record.category || 'preventive'}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <StatusBadge status={record.status} />
                            <Badge variant={PRIORITY_COLORS[record.priority] || 'info'} className="capitalize">{record.priority}</Badge>
                            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold">{record.scheduledDate ? formatDate(record.scheduledDate) : 'No date'}</span>
                          </div>
                        </div>

                        <RecordActions
                          onDetails={() => openDetails(record)}
                          onEdit={() => openEditModal(record)}
                          onDelete={canDelete ? () => handleDelete(record._id) : undefined}
                          deleteLoading={deletingId === record._id}
                        />
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-2xl border border-gray-100 bg-slate-50/70 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 font-semibold">Bus</p>
                          <p className="font-semibold text-gray-900 mt-1">{resolveBusLabel(record.bus)}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-slate-50/70 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 font-semibold">Cost</p>
                          <p className="font-semibold text-gray-900 mt-1">{formatCurrency(record.cost || 0)}</p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-slate-50/70 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-gray-400 font-semibold">Status Flow</p>
                          <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                            {STATUS_STEPS.map((step) => {
                              const isActive = record.status === step;
                              const isDone = STATUS_STEPS.indexOf(step) < STATUS_STEPS.indexOf(record.status);
                              return (
                                <div key={step} className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${isActive ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-sm' : isDone ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-white text-gray-400 border border-gray-200'}`}>
                                    {STATUS_STEPS.indexOf(step) + 1}
                                  </div>
                                  {step !== 'completed' && <span className="text-gray-300 text-xs">→</span>}
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3">
                            {(() => {
                              const { nextStatus, actionLabel, actionTone } = getStatusMeta(record.status);
                              return nextStatus ? (
                                <button
                                  type="button"
                                  disabled={updatingStatusId === record._id}
                                  onClick={() => handleStatusChange(record._id, nextStatus)}
                                  className={`w-full inline-flex items-center justify-center rounded-xl px-3 py-2 text-xs font-bold text-white bg-gradient-to-r ${actionTone} shadow-sm disabled:opacity-60`}
                                >
                                  {updatingStatusId === record._id ? 'Updating...' : actionLabel}
                                </button>
                              ) : (
                                <div className="w-full rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 text-center">
                                  Maintenance completed
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {record.description && (
                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/50 px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-red-400 font-semibold">Description</p>
                          <p className="text-sm text-gray-700 mt-1.5 leading-6">{record.description}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
        </div>
      </Card>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className={`${editingRecordId ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-700'} px-6 py-5 flex items-center justify-between`}>
                <div><h2 className="text-lg font-black text-white">{editingRecordId ? 'Edit Maintenance Record' : 'New Maintenance Record'}</h2><p className={`text-xs ${editingRecordId ? 'text-amber-100' : 'text-red-100'}`}>{editingRecordId ? 'Update the selected maintenance task' : 'Log a maintenance or repair task'}</p></div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Bus *</label>
                    <select value={form.busId} onChange={(e) => setForm({ ...form, busId: e.target.value })} className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white ${errors.busId ? 'border-red-400' : 'border-gray-200'}`}>
                      <option value="">Select bus...</option>
                      {buses.map((bus) => <option key={bus._id} value={bus._id}>{bus.busNumber}</option>)}
                    </select>
                    {errors.busId && <p className="text-xs text-red-500 mt-1">{errors.busId}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Title *</label>
                    <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Oil Change" className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${errors.title ? 'border-red-400' : 'border-gray-200'}`} />
                    {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                      <option value="preventive">Preventive</option>
                      <option value="corrective">Corrective</option>
                      <option value="emergency">Emergency</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Scheduled *</label>
                    <input type="date" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 ${errors.scheduledDate ? 'border-red-400' : 'border-gray-200'}`} />
                    {errors.scheduledDate && <p className="text-xs text-red-500 mt-1">{errors.scheduledDate}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Estimated Cost (LKR)</label>
                  <input type="number" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} placeholder="e.g. 25000" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the maintenance work..." rows={3} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} loading={saving} icon={Save}>{editingRecordId ? 'Save Changes' : 'Create Record'}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Maintenance Record Details" subtitle="Full record information" icon={Wrench}
        footer={<Button variant="secondary" onClick={() => setShowDetailModal(false)}>Close</Button>}
      >
        {detailRecord && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Bus</p><p className="font-semibold text-gray-900">{resolveBusLabel(detailRecord.bus)}</p></div>
            <div><p className="text-xs text-gray-400">Title</p><p className="font-semibold text-gray-900">{detailRecord.title}</p></div>
            <div><p className="text-xs text-gray-400">Type</p><p className="font-semibold text-gray-900 capitalize">{detailRecord.type || detailRecord.category || '—'}</p></div>
            <div><p className="text-xs text-gray-400">Priority</p><p className="font-semibold text-gray-900 capitalize">{detailRecord.priority || '—'}</p></div>
            <div><p className="text-xs text-gray-400">Status</p><p className="font-semibold text-gray-900 capitalize">{detailRecord.status || '—'}</p></div>
            <div><p className="text-xs text-gray-400">Scheduled Date</p><p className="font-semibold text-gray-900">{detailRecord.scheduledDate ? formatDate(detailRecord.scheduledDate) : '—'}</p></div>
            <div><p className="text-xs text-gray-400">Cost</p><p className="font-semibold text-gray-900">{formatCurrency(detailRecord.cost || 0)}</p></div>
            <div><p className="text-xs text-gray-400">Description</p><p className="font-semibold text-gray-900">{detailRecord.description || '—'}</p></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

