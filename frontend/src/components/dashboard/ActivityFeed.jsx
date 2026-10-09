import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bus,
  User,
  MapPin,
  Wrench,
  Fuel,
  Calendar,
  Bell,
  Activity,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { timeAgo } from '../../utils/helpers';

const typeIcons = {
  bus: { icon: Bus, gradient: 'from-red-500 to-red-700' },
  driver: { icon: User, gradient: 'from-red-400 to-rose-600' },
  route: { icon: MapPin, gradient: 'from-emerald-500 to-emerald-700' },
  maintenance: { icon: Wrench, gradient: 'from-amber-400 to-orange-500' },
  fuel: { icon: Fuel, gradient: 'from-rose-400 to-red-500' },
  schedule: { icon: Calendar, gradient: 'from-red-500 to-orange-600' },
  default: { icon: Bell, gradient: 'from-gray-400 to-gray-500' },
};

const FILTERS = [
  { key: 'all', label: 'All', icon: Activity },
  { key: 'operations', label: 'Operations', icon: Bus },
  { key: 'alerts', label: 'Alerts', icon: AlertTriangle },
];

function normalizeType(type = '') {
  const t = String(type).toLowerCase();
  if (['bus', 'driver', 'route', 'schedule', 'fuel', 'maintenance'].includes(t)) return t;
  return 'default';
}

function normalizeActivity(activity = {}, index = 0) {
  const type = normalizeType(activity.type);
  const title = activity.title || activity.message || 'System update';
  const actor = activity.user?.name || activity.actor || activity.performedBy || '';
  const description = activity.description || (actor ? `Updated by ${actor}` : 'Latest system event');
  const createdAt = activity.createdAt || activity.timestamp || Date.now();

  return {
    id: activity._id || activity.id || `activity-${index}`,
    type,
    title,
    description,
    createdAt,
  };
}

function matchFilter(item, filter) {
  if (filter === 'all') return true;
  if (filter === 'alerts') return ['maintenance', 'default'].includes(item.type);
  if (filter === 'operations') return ['bus', 'driver', 'route', 'schedule', 'fuel'].includes(item.type);
  return true;
}

export default function ActivityFeed({ activities = [], loading = false }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);

  const normalized = useMemo(() => {
    return activities
      .map((item, i) => normalizeActivity(item, i))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activities]);

  const counts = useMemo(() => {
    const operations = normalized.filter((item) => ['bus', 'driver', 'route', 'schedule', 'fuel'].includes(item.type)).length;
    const alerts = normalized.filter((item) => ['maintenance', 'default'].includes(item.type)).length;
    return { total: normalized.length, operations, alerts };
  }, [normalized]);

  const filtered = useMemo(() => normalized.filter((item) => matchFilter(item, filter)), [normalized, filter]);
  const visible = expanded ? filtered : filtered.slice(0, 6);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3.5 w-3/4 rounded bg-gray-100 animate-pulse" />
              <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!normalized.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-10 text-center text-sm text-gray-400">
        No recent activity available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Total</p>
          <p className="text-xl font-black text-red-700">{counts.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Operations</p>
          <p className="text-xl font-black text-emerald-700">{counts.operations}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Alerts</p>
          <p className="text-xl font-black text-amber-700">{counts.alerts}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const Icon = item.icon;
          const active = filter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setFilter(item.key)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-600'
              }`}
            >
              <Icon size={12} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <AnimatePresence initial={false}>
          {visible.map((activity, i) => {
            const { icon: Icon, gradient } = typeIcons[activity.type] || typeIcons.default;
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: i * 0.03 }}
                className="group flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-3 hover:border-red-100 hover:bg-red-50/20 transition-colors"
              >
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                  <Icon size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{activity.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{activity.description}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-400">
                    <span className="capitalize font-medium text-gray-500">{activity.type.replace(/_/g, ' ')}</span>
                    <span>•</span>
                    <span>{timeAgo(activity.createdAt)}</span>
                  </div>
                </div>
                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500/80 group-hover:bg-emerald-500 flex-shrink-0" />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {!filtered.length && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 py-6 text-center text-sm text-gray-400">
            No activity for this filter
          </div>
        )}
      </div>

      {filtered.length > 6 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 transition-colors"
        >
          {expanded ? 'Show Less' : `Show More (${filtered.length - 6})`}
          <ChevronDown size={12} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      )}
    </div>
  );
}
