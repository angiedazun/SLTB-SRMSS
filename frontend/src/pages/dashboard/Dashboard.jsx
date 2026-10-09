import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bus, Users, Map, Calendar, Fuel, Wrench, TrendingUp, AlertTriangle, CheckCircle, Clock, Activity, Plus } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import StatsCard from '../../components/dashboard/StatsCard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import BusStatusChart from '../../components/charts/BusStatusChart';
import FuelChart from '../../components/charts/FuelChart';
import { StatusBadge } from '../../components/ui/Badge';
import { formatCurrency, formatNumber } from '../../utils/helpers';
import api from '../../services/api';

const SAMPLE_STATS = {
  buses: { total: 42, active: 32, inMaintenance: 6, byStatus: { active: 32, maintenance: 6, delayed: 2, out_of_service: 1, idle: 1 } },
  drivers: { total: 48, active: 41 },
  routes: { total: 18, active: 15 },
  schedules: { today: 26 },
  maintenance: { pending: 6, inProgress: 3, completedThisMonth: 14, totalCostThisMonth: 245000 },
};

const SAMPLE_FUEL = [
  { date: 'May 1', quantity: 420, cost: 84000 },
  { date: 'May 5', quantity: 380, cost: 76000 },
  { date: 'May 9', quantity: 460, cost: 92000 },
  { date: 'May 13', quantity: 390, cost: 78000 },
  { date: 'May 17', quantity: 510, cost: 102000 },
  { date: 'May 21', quantity: 445, cost: 89000 },
  { date: 'May 25', quantity: 480, cost: 96000 },
  { date: 'May 29', quantity: 500, cost: 100000 },
];

const SAMPLE_ACTIVITY = [
  { _id: '1', type: 'maintenance', message: 'Bus #B-042 completed oil change', createdAt: new Date(Date.now() - 1800000), user: { name: 'Anil Fernando' } },
  { _id: '2', type: 'schedule', message: 'Route 138 schedule updated for tomorrow', createdAt: new Date(Date.now() - 3600000), user: { name: 'Priya Karunarathna' } },
  { _id: '3', type: 'driver', message: 'New driver Suresh Silva added to Galle depot', createdAt: new Date(Date.now() - 7200000), user: { name: 'Admin' } },
  { _id: '4', type: 'fuel', message: 'Fuel log entry added — Bus #B-019 (45L)', createdAt: new Date(Date.now() - 10800000), user: { name: 'Kamal Bandara' } },
  { _id: '5', type: 'bus', message: 'Bus #B-027 status changed to active', createdAt: new Date(Date.now() - 18000000), user: { name: 'Manager' } },
];

const SAMPLE_RECENT_SCHEDULES = [
  { _id: '1', scheduleCode: 'SC-138', title: 'Colombo - Kandy Express', status: 'active', trips: 8 },
  { _id: '2', scheduleCode: 'SC-071', title: 'Colombo Fort - Galle', status: 'active', trips: 6 },
  { _id: '3', scheduleCode: 'SC-055', title: 'Kurunegala - Anuradhapura', status: 'active', trips: 5 },
  { _id: '4', scheduleCode: 'SC-198', title: 'Matara - Hambantota', status: 'delayed', trips: 4 },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [alerts, setAlerts] = useState({ expiringLicenses: [], upcomingMaintenance: [], outOfService: [] });
  const [fuelData, setFuelData] = useState([]);
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, activityRes, alertsRes, fuelRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recent-activity'),
          api.get('/dashboard/alerts'),
          api.get('/fuel/analytics'),
        ]);
        setStats(statsRes.data);
        setActivity(activityRes.data?.length ? activityRes.data : SAMPLE_ACTIVITY);
        setAlerts(alertsRes.data || {});
        setFuelData(fuelRes.data?.dailyData?.length ? fuelRes.data.dailyData : SAMPLE_FUEL);
        api.get('/schedules/today').then(({ data }) => {
          if (data?.schedules?.length) setTodaySchedules(data.schedules);
          else if (Array.isArray(data) && data.length) setTodaySchedules(data);
        }).catch(() => {});
      } catch {
        setStats(SAMPLE_STATS);
        setActivity(SAMPLE_ACTIVITY);
        setFuelData(SAMPLE_FUEL);
        setAlerts({ outOfService: [1], upcomingMaintenance: [1, 2], expiringLicenses: [1] });
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const displayStats = stats || SAMPLE_STATS;

  const statCards = [
    { title: 'Total Fleet', value: displayStats?.buses?.total, icon: Bus, gradient: 'bg-gradient-to-br from-red-500 to-red-700', trend: 0, trendLabel: 'vehicles registered' },
    { title: 'Active Drivers', value: displayStats?.drivers?.active, icon: Users, gradient: 'bg-gradient-to-br from-red-400 to-red-600', trend: 5, trendLabel: 'vs last month' },
    { title: 'Active Routes', value: displayStats?.routes?.active, icon: Map, gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700', trend: 0, trendLabel: 'operational' },
    { title: "Today's Schedules", value: displayStats?.schedules?.today, icon: Calendar, gradient: 'bg-gradient-to-br from-red-500 to-red-700', trend: 3, trendLabel: 'vs yesterday' },
  ];

  const activeFleet = displayStats?.buses?.active || 0;
  const totalFleet = displayStats?.buses?.total || 1;
  const fleetHealth = Math.round((activeFleet / totalFleet) * 100);

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-red-600 via-red-700 to-rose-700 px-6 py-6 sm:px-8"
      >
        <div className="absolute -right-14 -top-16 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-24 bottom-0 w-40 h-40 rounded-full bg-red-300/20 blur-2xl" />
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="lg:col-span-2">
            <p className="text-xs uppercase tracking-widest text-red-100 font-semibold">Operations Command</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">Fleet health is {fleetHealth}% today</h2>
            <p className="text-sm text-red-100 mt-1.5">Monitor route reliability, fuel performance, and maintenance from a single premium control center.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/15 rounded-2xl p-3 border border-white/20 min-w-0 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest text-red-100 font-bold opacity-80">Active Fleet</p>
              <p className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">{activeFleet}</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 border border-white/20 min-w-0 flex flex-col justify-center">
              <p className="text-[10px] uppercase tracking-widest text-red-100 font-bold opacity-80">Total Cost</p>
              <div className="flex items-baseline gap-1 mt-0.5 overflow-hidden">
                <span className="text-[10px] font-black text-red-200">LKR</span>
                <p className="text-lg sm:text-xl font-black text-white truncate tracking-tighter">
                  {formatNumber(displayStats?.maintenance?.totalCostThisMonth ?? SAMPLE_STATS.maintenance.totalCostThisMonth)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3 mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Add Bus', desc: 'Register a new vehicle', to: '/buses', icon: Bus },
            { label: 'Add Driver', desc: 'Onboard a new operator', to: '/drivers', icon: Users },
            { label: 'Add Schedule', desc: 'Create a route timetable', to: '/schedules/timetable', icon: Calendar },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="group flex items-center gap-3 rounded-2xl bg-white/12 border border-white/15 px-4 py-3 text-left hover:bg-white/18 hover:border-white/25 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-white/18 flex items-center justify-center text-white shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-white">{action.label}</p>
                    <Plus size={14} className="text-red-100 opacity-80" />
                  </div>
                  <p className="text-xs text-red-100 mt-0.5">{action.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <StatsCard key={card.title} {...card} delay={i * 0.08} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Fleet Status" subtitle="Current bus distribution" icon={Bus} gradient="bg-gradient-to-br from-red-500 to-red-700" />
          {loading ? (
            <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <BusStatusChart data={displayStats?.buses?.byStatus || SAMPLE_STATS.buses.byStatus} />
          )}
          {displayStats?.buses && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <p className="text-xs text-green-600 font-semibold">Active</p>
                <p className="text-2xl font-black text-green-700">{displayStats.buses.active}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                <p className="text-xs text-amber-600 font-semibold">Maintenance</p>
                <p className="text-2xl font-black text-amber-700">{displayStats.buses.inMaintenance}</p>
              </div>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Fuel Consumption" subtitle="Last 30 days trend" icon={Fuel} gradient="bg-gradient-to-br from-red-500 to-rose-700" />
          {loading ? (
            <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <FuelChart data={fuelData.length ? fuelData : SAMPLE_FUEL} />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="System Alerts" subtitle="Requires attention" icon={AlertTriangle} gradient="bg-gradient-to-br from-red-500 to-red-700" />
          <div className="space-y-2.5">
            {alerts.outOfService?.length > 0 && (
              <AlertItem icon={Bus} color="red" title={`${alerts.outOfService.length} bus(es) out of service`} desc="Requires immediate attention" />
            )}
            {alerts.upcomingMaintenance?.length > 0 && (
              <AlertItem icon={Wrench} color="amber" title={`${alerts.upcomingMaintenance.length} maintenance due`} desc="Scheduled in next 7 days" />
            )}
            {alerts.expiringLicenses?.length > 0 && (
              <AlertItem icon={Users} color="orange" title={`${alerts.expiringLicenses.length} license(s) expiring`} desc="Within 30 days" />
            )}
            {!alerts.outOfService?.length && !alerts.upcomingMaintenance?.length && !alerts.expiringLicenses?.length && (
              <div className="py-4 text-center">
                <CheckCircle size={28} className="text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">All systems operational</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Maintenance" subtitle="This month" icon={Wrench} gradient="bg-gradient-to-br from-red-500 to-red-700" />
          <div className="space-y-2">
            {[
              { label: 'Pending', value: (displayStats?.maintenance?.pending ?? SAMPLE_STATS.maintenance.pending), color: 'text-amber-700 bg-amber-50 border-amber-100' },
              { label: 'In Progress', value: (displayStats?.maintenance?.inProgress ?? SAMPLE_STATS.maintenance.inProgress), color: 'text-blue-700 bg-blue-50 border-blue-100' },
              { label: 'Completed', value: (displayStats?.maintenance?.completedThisMonth ?? SAMPLE_STATS.maintenance.completedThisMonth), color: 'text-green-700 bg-green-50 border-green-100' },
            ].map((item) => (
              <div key={item.label} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${item.color}`}>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-lg font-black">{item.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <span className="text-sm font-medium text-red-700">Cost this month</span>
              <span className="text-sm font-bold text-red-700">{formatCurrency(displayStats?.maintenance?.totalCostThisMonth ?? SAMPLE_STATS.maintenance.totalCostThisMonth)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Today's Schedules" subtitle="Active routes" icon={Calendar} gradient="bg-gradient-to-br from-red-500 to-rose-600" />
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {(todaySchedules.length ? todaySchedules : SAMPLE_RECENT_SCHEDULES).map((s) => (
              <div key={s._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-red-100 transition-colors">
                <div>
                  <p className="text-xs font-bold text-gray-900 truncate max-w-[140px]">
                    {s.scheduleCode || s.route?.routeNumber || 'Schedule'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-[140px] truncate">
                    {s.title || s.route?.name || `${s.route?.origin || ''}${s.route?.destination ? ` - ${s.route.destination}` : ''}` || 'Route schedule'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {Array.isArray(s.trips) ? s.trips.length : (s.trips || 0)} trips
                  </span>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent Activity" subtitle="Latest system events" icon={Activity} gradient="bg-gradient-to-br from-red-600 to-red-800" />
        <ActivityFeed activities={activity.length ? activity : SAMPLE_ACTIVITY} loading={loading} />
      </Card>
    </div>
  );
}

function AlertItem({ icon: Icon, color, title, desc }) {
  const colors = { red: 'bg-red-50 border-red-200 text-red-700', amber: 'bg-amber-50 border-amber-200 text-amber-700', orange: 'bg-orange-50 border-orange-200 text-orange-700' };
  const iconColors = { red: 'text-red-500', amber: 'text-amber-500', orange: 'text-orange-500' };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${colors[color]}`}>
      <Icon size={16} className={`${iconColors[color]} flex-shrink-0 mt-0.5`} />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs opacity-80 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}


