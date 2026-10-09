import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle, Trash2, Filter, RefreshCw, BellOff, Info, AlertTriangle, CheckCircle2, Wrench, Fuel, Calendar } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { timeAgo } from '../../utils/helpers';
import api from '../../services/api';
import { buildSystemNotifications } from '../../utils/buildSystemNotifications';

const TYPE_CONFIG = {
  info:        { icon: Info,         color: 'text-blue-500',   bg: 'bg-blue-50',   label: 'Info' },
  warning:     { icon: AlertTriangle, color: 'text-amber-500',  bg: 'bg-amber-50',  label: 'Warning' },
  danger:      { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50',    label: 'Danger' },
  success:     { icon: CheckCircle2,  color: 'text-emerald-500', bg: 'bg-emerald-50', label: 'Success' },
  maintenance: { icon: Wrench,        color: 'text-purple-500', bg: 'bg-purple-50', label: 'Maintenance' },
  fuel:        { icon: Fuel,          color: 'text-orange-500', bg: 'bg-orange-50', label: 'Fuel' },
  schedule:    { icon: Calendar,      color: 'text-indigo-500', bg: 'bg-indigo-50', label: 'Schedule' },
};

const PRIORITY_BADGE = {
  critical: 'bg-red-100 text-red-700',
  high:     'bg-orange-100 text-orange-700',
  medium:   'bg-blue-100 text-blue-700',
  low:      'bg-gray-100 text-gray-500',
};

const TYPES = ['all', 'info', 'warning', 'danger', 'success', 'maintenance', 'fuel', 'schedule'];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [marking, setMarking] = useState(false);
  // track locally dismissed system notifications
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sltb_notif_dismissed') || '[]'); } catch { return []; }
  });
  const [readLocal, setReadLocal] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sltb_notif_read') || '[]'); } catch { return []; }
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);

      // Fetch DB notifications + system-generated ones in parallel
      const [notifRes, sysNotes] = await Promise.all([
        api.get(`/notifications?${params}`).catch(() => ({ data: { notifications: [] } })),
        buildSystemNotifications(),
      ]);

      const dbNotes = notifRes.data.notifications || [];

      // Merge: DB first, then system-generated ones not already dismissed
      const allNotes = [
        ...dbNotes,
        ...sysNotes.filter(n => !dismissed.includes(n._id)),
      ];

      // Apply type/priority filters to system notes (DB notes already filtered server-side)
      const filtered = allNotes.filter(n => {
        if (typeFilter !== 'all' && n.type !== typeFilter) return false;
        if (priorityFilter !== 'all' && n.priority !== priorityFilter) return false;
        return true;
      });

      setNotifications(filtered);
      const totalCount = allNotes.length;
      const unreadCount = allNotes.filter(n => !isReadFn(n, readLocal)).length;
      setStats({ total: totalCount, unreadCount });
    } catch { /* */ }
    finally { setLoading(false); }
  }, [typeFilter, priorityFilter, dismissed, readLocal]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // isRead helper used both inside and outside component
  const isReadFn = (n, readArr) =>
    n._isRead || (n.readBy && n.readBy.length > 0) || (readArr || readLocal).includes(n._id);

  const markAllRead = async () => {
    setMarking(true);
    try {
      await api.put('/notifications/read-all').catch(() => {});
      // mark all system notes as read locally
      const sysIds = notifications.filter(n => String(n._id).startsWith('sys-')).map(n => n._id);
      const newRead = [...new Set([...readLocal, ...sysIds])];
      setReadLocal(newRead);
      localStorage.setItem('sltb_notif_read', JSON.stringify(newRead));
      await fetchData();
    } catch { /* */ } finally { setMarking(false); }
  };

  const markRead = async (id) => {
    if (String(id).startsWith('sys-')) {
      const newRead = [...new Set([...readLocal, id])];
      setReadLocal(newRead);
      localStorage.setItem('sltb_notif_read', JSON.stringify(newRead));
      setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, _isRead: true } : n));
      setStats((s) => ({ ...s, unreadCount: Math.max(0, s.unreadCount - 1) }));
    } else {
      try {
        await api.put(`/notifications/${id}/read`);
        setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, _isRead: true } : n));
        setStats((s) => ({ ...s, unreadCount: Math.max(0, s.unreadCount - 1) }));
      } catch { /* */ }
    }
  };

  const deleteNotif = async (id) => {
    if (String(id).startsWith('sys-')) {
      const newDismissed = [...dismissed, id];
      setDismissed(newDismissed);
      localStorage.setItem('sltb_notif_dismissed', JSON.stringify(newDismissed));
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
    } else {
      try {
        await api.delete(`/notifications/${id}`);
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setStats((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
      } catch { /* */ }
    }
  };

  const isRead = (n) => isReadFn(n, readLocal);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Notifications</h2>
          <p className="text-sm text-gray-500">
            {stats.unreadCount > 0 ? <span className="text-red-600 font-semibold">{stats.unreadCount} unread</span> : 'All caught up'} · {stats.total} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={RefreshCw} onClick={fetchData} size="sm">Refresh</Button>
          {stats.unreadCount > 0 && (
            <Button icon={CheckCircle} loading={marking} onClick={markAllRead} size="sm">
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'from-gray-400 to-gray-600' },
          { label: 'Unread', value: stats.unreadCount, color: 'from-red-500 to-red-700' },
          { label: 'Read', value: stats.total - stats.unreadCount, color: 'from-emerald-500 to-green-600' },
          { label: 'Filtered', value: notifications.length, color: 'from-amber-400 to-orange-500' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
              <Bell size={13} className="text-white" />
            </div>
            <p className="text-xl font-black text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card padding="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <Filter size={14} className="text-red-500" /> Filters:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize ${typeFilter === t ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input text-xs py-1.5 w-36"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </Card>

      {/* Notification list */}
      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
              <Bell size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">All Notifications</h3>
              <p className="text-xs text-gray-500">{notifications.length} results</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <BellOff size={40} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No notifications found</p>
            <p className="text-gray-300 text-sm mt-1">Try changing your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence initial={false}>
              {notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info;
                const Icon = cfg.icon;
                const read = isRead(n);
                return (
                  <motion.div
                    key={n._id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group ${!read ? 'bg-red-50/30' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={18} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold text-gray-900 leading-snug ${!read ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                          {!read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                          {n.priority && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[n.priority] || PRIORITY_BADGE.low}`}>{n.priority}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          {!read && (
                            <button onClick={() => markRead(n._id)} title="Mark as read" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button onClick={() => deleteNotif(n._id)} title="Delete" className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Card>
    </div>
  );
}
