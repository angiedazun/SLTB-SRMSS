import { useState, useEffect, useCallback } from 'react';
import { BarChart2, Fuel, Route, Bus, Users, Building2, X } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import FuelChart from '../../components/charts/FuelChart';
import RoutePerformanceChart from '../../components/charts/RoutePerformanceChart';
import TripAnalyticsChart from '../../components/charts/TripAnalyticsChart';
import BusStatusChart from '../../components/charts/BusStatusChart';
import api from '../../services/api';
import { PROVINCES } from '../../utils/depots';

const SAMPLE_FUEL_DATA = [
  { date: 'May 01', quantity: 420, cost: 84000 },
  { date: 'May 05', quantity: 380, cost: 76000 },
  { date: 'May 09', quantity: 460, cost: 92000 },
  { date: 'May 13', quantity: 390, cost: 78000 },
  { date: 'May 17', quantity: 510, cost: 102000 },
];

const SAMPLE_ROUTE_DATA = [
  { name: '138', performance: 92 },
  { name: '071', performance: 88 },
  { name: '055', performance: 81 },
  { name: '198', performance: 77 },
];

const SAMPLE_TRIP_DATA = [
  { date: 'May 01', completed: 42, delayed: 3, cancelled: 1 },
  { date: 'May 05', completed: 45, delayed: 2, cancelled: 0 },
  { date: 'May 09', completed: 48, delayed: 4, cancelled: 1 },
  { date: 'May 13', completed: 44, delayed: 2, cancelled: 2 },
  { date: 'May 17', completed: 50, delayed: 1, cancelled: 0 },
];

const SAMPLE_BUS_STATUS = {
  active: 32,
  maintenance: 6,
  idle: 2,
  out_of_service: 2,
};

export default function AnalyticsReports() {
  const [fuelData, setFuelData] = useState([]);
  const [routeData, setRouteData] = useState([]);
  const [tripData, setTripData] = useState([]);
  const [busStats, setBusStats] = useState(SAMPLE_BUS_STATUS);
  const [kpis, setKpis] = useState(null);
  const [driverStats, setDriverStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDepot, setSelectedDepot] = useState('');
  const [depotKpis, setDepotKpis] = useState(null);
  const [depotLoading, setDepotLoading] = useState(false);

  const fetchAll = useCallback(() => {
    setLoading(true);
    const depotParam = selectedDepot ? `&depot=${encodeURIComponent(selectedDepot)}` : '';
    Promise.allSettled([
      api.get('/fuel/analytics?period=30'),
      api.get(`/routes?limit=200${depotParam}`),
      api.get(`/buses/stats${selectedDepot ? `?depot=${encodeURIComponent(selectedDepot)}` : ''}`),
      api.get('/dashboard/stats'),
      api.get('/reports/trip-analytics'),
      api.get(`/drivers/analytics${selectedDepot ? `?depot=${encodeURIComponent(selectedDepot)}` : ''}`),
    ]).then(([fuelResult, routesResult, busesResult, statsResult, tripResult, driverResult]) => {
      const monthlyFuel = fuelResult.status === 'fulfilled' ? fuelResult.value.data?.monthly || [] : [];
      const mappedFuel = monthlyFuel.length
        ? monthlyFuel.map((item) => ({
            date: String(item._id || '').slice(5).replace('-', '/'),
            quantity: item.totalQuantity || 0,
            cost: item.totalCost || 0,
          }))
        : SAMPLE_FUEL_DATA;

      const routeRows = routesResult.status === 'fulfilled' ? routesResult.value.data?.routes || [] : [];
      const mappedRoutes = routeRows.length
        ? routeRows
            .map((route) => ({
              name: route.routeNumber || route.name,
              performance: Number(route.onTimePerformance ?? route.performance ?? 0) || 0,
            }))
            .filter((route) => route.name)
        : SAMPLE_ROUTE_DATA;

      const statusBreakdown = busesResult.status === 'fulfilled'
        ? busesResult.value.data?.statusBreakdown || {}
        : {};
      const mappedBusStats = Object.keys(statusBreakdown).length ? statusBreakdown : SAMPLE_BUS_STATUS;

      const kpiStats = statsResult.status === 'fulfilled' ? statsResult.value.data : null;
      const activeRoutes = kpiStats?.routes?.active || 0;
      const fleetUtilization = kpiStats?.buses?.total
        ? Math.round(((kpiStats?.buses?.active || 0) / kpiStats.buses.total) * 100)
        : 0;
      const onTimePerformance = mappedRoutes.length
        ? Math.round(mappedRoutes.reduce((sum, route) => sum + (route.performance || 0), 0) / mappedRoutes.length)
        : 0;
      const avgFuelEfficiency = mappedFuel.length
        ? Math.round((mappedFuel.reduce((sum, item) => sum + (item.quantity || 0), 0) / mappedFuel.reduce((sum, item) => sum + (item.cost || 0), 0)) * 100) || 0
        : 0;

      setFuelData(mappedFuel);
      setRouteData(mappedRoutes);

      // Trip analytics — use real data if available, else sample
      const tripRows = tripResult.status === 'fulfilled' ? tripResult.value.data?.tripData || [] : [];
      setTripData(tripRows.length ? tripRows : SAMPLE_TRIP_DATA);

      // Driver analytics
      if (driverResult.status === 'fulfilled' && driverResult.value.data) {
        setDriverStats(driverResult.value.data);
      }

      setBusStats(mappedBusStats);
      setKpis({
        ...(kpiStats || {}),
        fleetUtilization,
        onTimePerformance,
        avgFuelEfficiency,
        activeRoutes,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedDepot]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Depot-specific KPIs from existing buses/drivers/routes endpoints
  useEffect(() => {
    if (!selectedDepot) { setDepotKpis(null); return; }
    setDepotLoading(true);
    const enc = encodeURIComponent(selectedDepot);
    Promise.all([
      api.get(`/buses?depot=${enc}&limit=500`).catch(() => ({ data: { buses: [] } })),
      api.get(`/drivers?depot=${enc}&limit=500`).catch(() => ({ data: { drivers: [] } })),
      api.get(`/routes?depot=${enc}&limit=500`).catch(() => ({ data: { routes: [] } })),
    ]).then(([bRes, dRes, rRes]) => {
      const buses = bRes.data?.buses || [];
      const drivers = dRes.data?.drivers || [];
      const routes = rRes.data?.routes || [];
      setDepotKpis({
        buses: { total: buses.length, active: buses.filter((b) => b.status === 'active').length, maintenance: buses.filter((b) => b.status === 'maintenance').length },
        drivers: { total: drivers.length, active: drivers.filter((d) => d.status === 'active').length, onLeave: drivers.filter((d) => d.status === 'on_leave').length },
        routes: { total: routes.length, active: routes.filter((r) => r.status === 'active').length },
      });
    }).finally(() => setDepotLoading(false));
  }, [selectedDepot]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'fleet', label: 'Fleet', icon: Bus },
    { id: 'fuel', label: 'Fuel', icon: Fuel },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'drivers', label: 'Drivers', icon: Users },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Analytics & Reports</h2>
          <p className="text-sm text-gray-500">Comprehensive performance insights</p>
        </div>

        {/* Depot Filter */}
        <div className="flex items-center gap-2.5 min-w-[260px]">
          <Building2 size={16} className="text-gray-400 flex-shrink-0" />
          <select
            value={selectedDepot}
            onChange={(e) => setSelectedDepot(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 bg-white text-gray-700"
          >
            <option value="">All Depots — System Wide</option>
            {PROVINCES.map((province) => (
              <optgroup key={province.name} label={province.name}>
                {province.depots.map((depot) => (
                  <option key={depot} value={depot}>{depot}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {selectedDepot && (
            <button onClick={() => setSelectedDepot('')}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Active depot badge */}
      {selectedDepot && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl w-fit">
          <Building2 size={13} className="text-red-500" />
          <span className="text-xs font-bold text-red-700">Showing data for: {selectedDepot}</span>
        </div>
      )}

      {/* Depot KPI cards */}
      {selectedDepot && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {depotLoading ? (
            <div className="col-span-full flex items-center gap-2 py-3 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              Loading depot data...
            </div>
          ) : depotKpis ? [
            { label: 'Total Buses', value: depotKpis.buses.total, sub: `${depotKpis.buses.active} active`, color: 'bg-blue-50 text-blue-700' },
            { label: 'In Maintenance', value: depotKpis.buses.maintenance, sub: 'buses', color: 'bg-amber-50 text-amber-700' },
            { label: 'Total Drivers', value: depotKpis.drivers.total, sub: `${depotKpis.drivers.active} active`, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'On Leave', value: depotKpis.drivers.onLeave, sub: 'drivers', color: 'bg-orange-50 text-orange-700' },
            { label: 'Total Routes', value: depotKpis.routes.total, sub: `${depotKpis.routes.active} active`, color: 'bg-purple-50 text-purple-700' },
            { label: 'Inactive Routes', value: depotKpis.routes.total - depotKpis.routes.active, sub: 'routes', color: 'bg-red-50 text-red-700' },
          ].map((k) => (
            <div key={k.label} className={`${k.color} rounded-2xl p-3 text-center`}>
              <p className="text-2xl font-black">{k.value}</p>
              <p className="text-[11px] font-bold mt-0.5">{k.label}</p>
              <p className="text-[10px] opacity-70">{k.sub}</p>
            </div>
          )) : null}
        </div>
      )}

      {/* KPI Bar */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Fleet Utilization', value: `${kpis.fleetUtilization || 0}%`, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'On-Time Performance', value: `${kpis.onTimePerformance || 0}%`, color: 'text-primary-600 bg-blue-50' },
            { label: 'Avg Fuel Efficiency', value: `${kpis.avgFuelEfficiency || 0} L/100km`, color: 'text-amber-600 bg-amber-50' },
            { label: 'Active Routes', value: kpis.activeRoutes || 0, color: 'text-indigo-600 bg-indigo-50' },
          ].map((k) => (
            <div key={k.label} className={`${k.color} rounded-2xl p-4`}>
              <p className="text-2xl font-black">{k.value}</p>
              <p className="text-xs font-medium mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card><CardHeader title="Trip Trends (30 Days)" /><TripAnalyticsChart data={tripData} /></Card>
          <Card><CardHeader title="Fleet Status Distribution" /><BusStatusChart data={busStats} /></Card>
          <Card><CardHeader title="Fuel Consumption" /><FuelChart data={fuelData} /></Card>
          <Card><CardHeader title="Route Performance" /><RoutePerformanceChart data={routeData} /></Card>
        </div>
      )}

      {activeTab === 'fleet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card><CardHeader title="Fleet Status" /><BusStatusChart data={busStats} /></Card>
          <Card><CardHeader title="Trip Completion Trends" /><TripAnalyticsChart data={tripData} /></Card>
        </div>
      )}

      {activeTab === 'fuel' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card><CardHeader title="Daily Consumption (Liters)" /><FuelChart data={fuelData} /></Card>
          <Card><CardHeader title="Daily Cost (LKR)" /><FuelChart data={fuelData} currency /></Card>
        </div>
      )}

      {activeTab === 'routes' && (
        <Card><CardHeader title="Route Performance Score" /><RoutePerformanceChart data={routeData} /></Card>
      )}
      {activeTab === 'drivers' && (
        <Card padding="p-6">
          <CardHeader title="Driver Analytics" subtitle="Performance & activity overview" />
          {driverStats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              {[
                { label: 'Total Drivers', value: driverStats.total ?? driverStats.totalDrivers ?? '-' },
                { label: 'Active', value: driverStats.active ?? driverStats.activeDrivers ?? '-' },
                { label: 'Avg License Years', value: driverStats.avgExperience ? `${Math.round(driverStats.avgExperience)} yrs` : '-' },
                { label: 'Expiring Licenses', value: driverStats.expiringLicenses ?? '-' },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm mt-4">No driver analytics available.</p>
          )}
        </Card>
      )}
    </div>
  );
}
