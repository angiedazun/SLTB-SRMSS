import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Search, Map, Clock, TrendingUp, CheckCircle, XCircle, Bus, Users, Route as RouteIcon } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import RecordActions from '../../components/ui/RecordActions';
import api from '../../services/api';

export default function RouteList() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [analytics, setAnalytics] = useState({ total: 0, active: 0, inactive: 0, avgOnTimePerformance: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, search });
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const { data } = await api.get(`/routes?${params}`);
      setRoutes(data.routes || []);
      setPagination(data.pagination || { total: data.total, page: data.page, pages: data.pages });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, [page, search, typeFilter, statusFilter]);
  useEffect(() => {
    api.get('/routes/analytics').then(({ data }) => setAnalytics(data)).catch(() => {});
  }, []);

  const handleDelete = async (routeId) => {
    setDeletingId(routeId);
    try {
      await api.delete(`/routes/${routeId}`);
      setRoutes((prev) => prev.filter((route) => route._id !== routeId));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    { key: 'routeNumber', label: 'Route #', accessor: 'routeNumber', sortable: true, width: '100px' },
    { key: 'name', label: 'Route Name', accessor: 'name', sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-semibold text-gray-900">{val}</p>
          <p className="text-xs text-gray-500 mt-0.5">{row.origin} → {row.destination}</p>
        </div>
      )
    },
    { key: 'type', label: 'Type', accessor: 'type',
      render: (val) => <Badge variant={val === 'express' ? 'indigo' : val === 'inter_city' ? 'purple' : 'info'} className="capitalize">{val?.replace(/_/g, ' ')}</Badge>
    },
    { key: 'stops', label: 'Stops', accessor: 'stops',
      render: (val) => <span className="font-medium text-gray-700">{val?.length || 0}</span>
    },
    {
      key: 'resources',
      label: 'Assignments',
      accessor: 'assignedBuses',
      render: (_val, row) => (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600 inline-flex items-center gap-1"><Bus size={12} className="text-red-500" />{row.assignedBuses?.length || 0} buses</span>
          <span className="text-xs text-gray-600 inline-flex items-center gap-1"><Users size={12} className="text-blue-500" />{row.assignedDrivers?.length || 0} drivers</span>
        </div>
      )
    },
    { key: 'totalDistance', label: 'Distance', accessor: 'totalDistance',
      render: (val) => val ? <span className="text-gray-700">{val} km</span> : '—'
    },
    { key: 'estimatedDuration', label: 'Duration', accessor: 'estimatedDuration',
      render: (val) => val ? (
        <span className="flex items-center gap-1 text-gray-700"><Clock size={12} className="text-gray-400" />{val} min</span>
      ) : '—'
    },
    { key: 'onTimePerformance', label: 'On-Time %', accessor: 'onTimePerformance',
      render: (val) => val !== undefined && val !== null ? (
        <span className={`font-semibold text-sm ${val >= 80 ? 'text-green-600' : val >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{Math.round(val)}%</span>
      ) : <span className="text-gray-300">—</span>
    },
    { key: 'status', label: 'Status', accessor: 'status',
      render: (val) => <StatusBadge status={val} />
    },
    {
      key: 'actions',
      label: 'Actions',
      accessor: '_id',
      render: (val) => (
        <RecordActions
          onDetails={() => navigate(`/routes/${val}`)}
          onEdit={() => navigate(`/routes/${val}?edit=1`)}
          onDelete={() => handleDelete(val)}
          deleteLoading={deletingId === val}
        />
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Route Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage all bus routes and stops</p>
        </div>
        <Button icon={Plus} onClick={() => navigate('/routes/create')}>
          Add Route
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Routes', value: analytics.total || routes.length, icon: Map, color: 'from-red-500 to-red-700' },
          { label: 'Active', value: analytics.active || routes.filter(r => r.status === 'active').length, icon: CheckCircle, color: 'from-emerald-400 to-green-600' },
          { label: 'Inactive', value: analytics.inactive || routes.filter(r => r.status !== 'active').length, icon: XCircle, color: 'from-amber-400 to-orange-500' },
          { label: 'Avg On-Time', value: `${analytics.avgOnTimePerformance || 0}%`, icon: TrendingUp, color: 'from-blue-400 to-indigo-500' },
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

      <div className="relative overflow-hidden rounded-3xl bg-white border border-red-100 shadow-sm">
        {/* Decorative background blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-red-50 to-transparent rounded-full translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="absolute bottom-0 right-24 w-32 h-32 bg-rose-50 rounded-full translate-y-10 pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-stretch">
          {/* Left accent bar */}
          <div className="w-full sm:w-1.5 h-1.5 sm:h-auto bg-gradient-to-b from-red-500 to-red-700 rounded-t-3xl sm:rounded-l-3xl sm:rounded-tr-none flex-shrink-0" />

          {/* Icon column */}
          <div className="flex items-center justify-center px-6 py-5 sm:py-0 sm:pl-7 sm:pr-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-200 flex-shrink-0">
              <RouteIcon size={24} className="text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-black text-gray-900">Planning Module</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Route Studio</span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xl">
                  Create, modify, and monitor route plans with stop-level structure and resource assignments.
                </p>
                {/* Quick stats chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {[
                    { label: 'Total Routes', value: analytics.total || routes.length, icon: Map },
                    { label: 'Active', value: analytics.active || routes.filter(r => r.status === 'active').length, icon: CheckCircle },
                    { label: 'On-Time Avg', value: `${analytics.avgOnTimePerformance || 0}%`, icon: TrendingUp },
                  ].map((chip) => (
                    <div key={chip.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100">
                      <chip.icon size={12} className="text-red-500" />
                      <span className="text-[11px] font-semibold text-gray-500">{chip.label}:</span>
                      <span className="text-[11px] font-black text-gray-900">{chip.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0">
                <button
                  onClick={() => navigate('/routes/create')}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-500 to-red-700 text-white text-sm font-black shadow-lg shadow-red-200 hover:from-red-600 hover:to-red-800 transition-all hover:shadow-red-300 hover:shadow-xl active:scale-95"
                >
                  <Plus size={16} />
                  Open Planning Studio
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card padding="p-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search routes..."
              className="input pl-10"
            />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="input max-w-[150px]">
            <option value="">All Types</option>
            <option value="normal">Normal</option>
            <option value="express">Express</option>
            <option value="inter_city">Inter City</option>
            <option value="local">Local</option>
            <option value="rural">Rural</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input max-w-[150px]">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Map size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">All Routes</h3>
            {pagination && <p className="text-xs text-gray-500">{pagination.total} routes found</p>}
          </div>
        </div>
        <div className="p-5">
          <Table
            columns={columns}
            data={routes}
            loading={loading}
            emptyMessage="No routes found. Add your first route."
            pagination={pagination}
            onPageChange={setPage}
          />
        </div>
      </Card>
    </div>
  );
}
