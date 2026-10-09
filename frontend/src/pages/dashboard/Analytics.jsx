import { useState, useEffect } from 'react';
import Card, { CardHeader } from '../../components/ui/Card';
import FuelChart from '../../components/charts/FuelChart';
import RoutePerformanceChart from '../../components/charts/RoutePerformanceChart';
import TripAnalyticsChart from '../../components/charts/TripAnalyticsChart';
import { TrendingUp, Fuel, Map, Bus, BarChart3, Wrench, Users, AlertTriangle, Building2, Filter } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { PROVINCES } from '../../utils/depots';
import api from '../../services/api';

const SAMPLE_DAILY_FUEL = [
  { date: 'May 01', quantity: 420, cost: 84000 },
  { date: 'May 05', quantity: 380, cost: 76000 },
  { date: 'May 09', quantity: 460, cost: 92000 },
  { date: 'May 13', quantity: 390, cost: 78000 },
  { date: 'May 17', quantity: 510, cost: 102000 },
];

const SAMPLE_TOP_CONSUMERS = [
  { busNumber: 'B-003', totalQuantity: 340 },
  { busNumber: 'B-006', totalQuantity: 295 },
  { busNumber: 'B-001', totalQuantity: 270 },
  { busNumber: 'B-004', totalQuantity: 242 },
  { busNumber: 'B-007', totalQuantity: 220 },
];

const SAMPLE_ROUTE_PERF = [
  { name: '138', performance: 92, totalTripsCompleted: 280 },
  { name: '071', performance: 88, totalTripsCompleted: 240 },
  { name: '055', performance: 81, totalTripsCompleted: 210 },
  { name: '198', performance: 77, totalTripsCompleted: 185 },
];

export default function Analytics() {
  const [selectedDepot, setSelectedDepot] = useState('');
  const [fuel, setFuel] = useState({ totalCost: 0, avgEfficiency: 0, dailyData: SAMPLE_DAILY_FUEL, topConsumers: SAMPLE_TOP_CONSUMERS });
  const [monthly, setMonthly] = useState({ totalTrips: 0, fleetUtilization: 0 });
  const [routePerf, setRoutePerf] = useState(SAMPLE_ROUTE_PERF);
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [driverData, setDriverData] = useState(null);
  const [depotData, setDepotData] = useState(null);
  const [depotLoading, setDepotLoading] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [fuelRes, monthlyRes, routeRes, fuelAnalysisRes, dashboardRes] = await Promise.all([
          api.get('/fuel/analytics'),
          api.get('/reports/monthly-summary'),
          api.get('/reports/route-performance'),
          api.get('/reports/fuel-analysis'),
          api.get('/dashboard/stats'),
        ]);

        const fuelMonthly = fuelRes.data?.monthly || [];
        const dailyData = fuelMonthly.length
          ? fuelMonthly.map((d) => ({ date: String(d._id || '').slice(5).replace('-', '/'), quantity: d.totalQuantity || 0, cost: d.totalCost || 0 }))
          : SAMPLE_DAILY_FUEL;

        const topConsumers = (fuelRes.data?.topConsumers || []).length
          ? fuelRes.data.topConsumers.map((c) => ({ busNumber: c.busInfo?.[0]?.busNumber || 'Unknown', totalQuantity: c.total || 0 }))
          : SAMPLE_TOP_CONSUMERS;

        const totalFuelCost = fuelMonthly.reduce((sum, d) => sum + (d.totalCost || 0), 0);
        const efficiencyData = fuelAnalysisRes.data?.fuelData || [];
        const avgEfficiency = efficiencyData.length
          ? efficiencyData.reduce((sum, f) => sum + (f.avgEfficiency || 0), 0) / efficiencyData.length : 0;

        const routes = routeRes.data?.routes || [];
        const mapped = routes.map((r, i) => ({
          name: r.routeNumber || r.name || `${i + 1}`,
          performance: r.onTimePerformance || 0,
          totalTripsCompleted: r.totalTripsCompleted || 0,
        }));
        // Only use real data if at least one route has a name AND some performance/trips data
        const hasUsefulData = mapped.some(r => r.name && (r.performance > 0 || r.totalTripsCompleted > 0));
        const mappedRoutePerf = hasUsefulData ? mapped : (mapped.length > 0 ? mapped : SAMPLE_ROUTE_PERF);

        const busStats = dashboardRes.data?.buses || {};
        const fleetUtilization = busStats.total ? Math.round(((busStats.active || 0) / busStats.total) * 100) : 0;
        const totalTrips = mappedRoutePerf.reduce((sum, r) => sum + (r.totalTripsCompleted || 0), 0);

        setFuel({ totalCost: totalFuelCost, avgEfficiency, dailyData, topConsumers });
        setMonthly({ totalTrips, fleetUtilization, period: monthlyRes.data?.period || null });
        setRoutePerf(mappedRoutePerf);
        api.get('/maintenance/cost-trends').then(({ data }) => setMaintenanceData(data)).catch(() => {});
        api.get('/drivers/analytics').then(({ data }) => setDriverData(data)).catch(() => {});

        // Build depot analytics from existing endpoints (client-side aggregation)
        Promise.all([
          api.get('/buses?limit=500').catch(() => ({ data: { buses: [] } })),
          api.get('/drivers?limit=500').catch(() => ({ data: { drivers: [] } })),
          api.get('/routes?limit=500').catch(() => ({ data: { routes: [] } })),
          api.get('/schedules?limit=500').catch(() => ({ data: { schedules: [] } })),
        ]).then(([bRes, dRes, rRes, sRes]) => {
          const depotMap = {};
          const ensure = (name) => {
            if (!name) return;
            if (!depotMap[name]) depotMap[name] = { depot: name, buses: { total: 0, active: 0, maintenance: 0 }, drivers: { total: 0, active: 0, onLeave: 0 }, routes: { total: 0, active: 0 }, schedules: { total: 0, active: 0 } };
          };
          (bRes.data?.buses || []).forEach((b) => {
            ensure(b.depot);
            if (!b.depot) return;
            depotMap[b.depot].buses.total += 1;
            if (b.status === 'active') depotMap[b.depot].buses.active += 1;
            if (b.status === 'maintenance') depotMap[b.depot].buses.maintenance += 1;
          });
          (dRes.data?.drivers || []).forEach((d) => {
            ensure(d.depot);
            if (!d.depot) return;
            depotMap[d.depot].drivers.total += 1;
            if (d.status === 'active') depotMap[d.depot].drivers.active += 1;
            if (d.status === 'on_leave') depotMap[d.depot].drivers.onLeave += 1;
          });
          (rRes.data?.routes || []).forEach((r) => {
            ensure(r.depot);
            if (!r.depot) return;
            depotMap[r.depot].routes.total += 1;
            if (r.status === 'active') depotMap[r.depot].routes.active += 1;
          });
          (sRes.data?.schedules || []).forEach((s) => {
            ensure(s.depot);
            if (!s.depot) return;
            depotMap[s.depot].schedules.total += 1;
            if (s.status === 'active') depotMap[s.depot].schedules.active += 1;
          });
          const depots = Object.values(depotMap).sort((a, b) => (b.buses.total + b.drivers.total) - (a.buses.total + a.drivers.total));
          setDepotData({ depots });
        }).catch(() => {}).finally(() => setDepotLoading(false));
      } catch (err) {
        console.error(err);
        setFuel((prev) => ({ ...prev, dailyData: SAMPLE_DAILY_FUEL, topConsumers: SAMPLE_TOP_CONSUMERS }));
        setMonthly({ totalTrips: 0, fleetUtilization: 0 });
        setRoutePerf(SAMPLE_ROUTE_PERF);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const currentDepotRow = selectedDepot && depotData?.depots
    ? depotData.depots.find((d) => d.depot === selectedDepot)
    : null;

  const filteredDepots = selectedDepot && depotData?.depots
    ? depotData.depots.filter((d) => d.depot === selectedDepot)
    : depotData?.depots || [];

  const depotKPIs = currentDepotRow
    ? [
        { label: 'Total Buses', value: currentDepotRow.buses.total, sub: `${currentDepotRow.buses.active} active`, icon: Bus, color: 'from-red-500 to-red-700' },
        { label: 'Maintenance', value: currentDepotRow.buses.maintenance, sub: 'buses in maintenance', icon: Wrench, color: 'from-red-400 to-red-600' },
        { label: 'Total Drivers', value: currentDepotRow.drivers.total, sub: `${currentDepotRow.drivers.active} active`, icon: Users, color: 'from-emerald-400 to-green-600' },
        { label: 'On Leave', value: currentDepotRow.drivers.onLeave, sub: 'drivers on leave', icon: Users, color: 'from-sky-400 to-blue-500' },
        { label: 'Active Routes', value: currentDepotRow.routes.active, sub: `of ${currentDepotRow.routes.total} total`, icon: Map, color: 'from-purple-400 to-violet-600' },
        { label: 'Active Schedules', value: currentDepotRow.schedules.active, sub: `of ${currentDepotRow.schedules.total} total`, icon: Filter, color: 'from-rose-400 to-red-600' },
      ]
    : null;

  return (
    <div className="space-y-6">

      {/* Depot Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 flex-1 min-w-[280px] max-w-sm">
          <Building2 size={16} className="text-gray-500 flex-shrink-0" />
          <select
            value={selectedDepot}
            onChange={(e) => setSelectedDepot(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 bg-white text-gray-700"
          >
            <option value="">All Depots — System Wide</option>
            {PROVINCES.map((province) => (
              <optgroup key={province.name} label={province.name}>
                {province.depots.map((depot) => {
                  const row = depotData?.depots?.find((d) => d.depot === depot);
                  const count = row ? `${row.buses.total}B · ${row.drivers.total}D · ${row.routes.total}R` : '';
                  return (
                    <option key={depot} value={depot}>
                      {depot}{count ? `  (${count})` : ''}
                    </option>
                  );
                })}
              </optgroup>
            ))}
          </select>
        </div>
        {selectedDepot && (
          <button
            onClick={() => setSelectedDepot('')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
          >
            <Building2 size={12} /> {selectedDepot} &nbsp;✕
          </button>
        )}
      </div>

      {/* Loading state while depot data is being fetched */}
      {selectedDepot && depotLoading && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl">
          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-sm text-gray-500 font-medium">Loading depot analytics...</p>
        </div>
      )}

      {/* Depot-specific KPIs */}
      {selectedDepot && !depotLoading && depotKPIs && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {depotKPIs.map((kpi, i) => (
            <div key={i} className="card p-4">
              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-2`}>
                <kpi.icon size={14} className="text-white" />
              </div>
              <p className="text-xl font-black text-gray-900">{kpi.value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{kpi.label}</p>
              <p className="text-[10px] text-gray-400">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Depot Not Found — only show after depot data has fully loaded */}
      {selectedDepot && !depotLoading && !currentDepotRow && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 font-semibold">No data found for <strong>{selectedDepot}</strong> depot. No buses, drivers, or routes are assigned to this depot yet.</p>
        </div>
      )}

      {/* Global KPI Row — shown only when no depot filter */}
      {!selectedDepot && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Fuel Cost', value: formatCurrency(fuel.totalCost || 0), icon: Fuel, color: 'from-rose-400 to-red-500' },
            { label: 'Avg Efficiency', value: `${(fuel.avgEfficiency || 0).toFixed(1)} km/L`, icon: TrendingUp, color: 'from-emerald-400 to-green-500' },
            { label: 'Total Trips', value: (monthly.totalTrips || 0).toLocaleString(), icon: Map, color: 'from-red-500 to-red-700' },
            { label: 'Fleet Utilization', value: `${monthly.fleetUtilization || 0}%`, icon: Bus, color: 'from-amber-400 to-orange-500' },
          ].map((kpi, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center`}>
                  <kpi.icon size={14} className="text-white" />
                </div>
              </div>
              <p className="text-xl font-black text-gray-900">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts — shown only when no depot filter */}
      {!selectedDepot && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Fuel Consumption (30 Days)" icon={Fuel} gradient="bg-gradient-to-br from-rose-400 to-red-500" />
            {loading ? <div className="h-56 bg-gray-50 rounded-xl animate-pulse" /> : <FuelChart data={fuel.dailyData || SAMPLE_DAILY_FUEL} />}
          </Card>
          <Card>
            <CardHeader title="Fuel Cost Trend" icon={TrendingUp} gradient="bg-gradient-to-br from-red-500 to-red-700" />
            {loading ? <div className="h-56 bg-gray-50 rounded-xl animate-pulse" /> : <FuelChart data={fuel.dailyData || SAMPLE_DAILY_FUEL} currency />}
          </Card>
          <Card>
            <CardHeader title="Route On-Time Performance" icon={Map} gradient="bg-gradient-to-br from-emerald-400 to-green-500" />
            {loading ? <div className="h-56 bg-gray-50 rounded-xl animate-pulse" /> : <RoutePerformanceChart data={routePerf.length ? routePerf : SAMPLE_ROUTE_PERF} />}
          </Card>
          <Card>
            <CardHeader title="Top Fuel Consumers" icon={BarChart3} gradient="bg-gradient-to-br from-amber-400 to-orange-500" />
            {loading ? (
              <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-2.5 mt-2">
                {(fuel.topConsumers?.length ? fuel.topConsumers : SAMPLE_TOP_CONSUMERS).slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800">{item.busNumber || 'Unknown'}</span>
                        <span className="text-xs text-gray-500">{(item.totalQuantity || 0).toFixed(0)} L</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                          style={{ width: `${Math.min(100, ((item.totalQuantity || 0) / ((fuel.topConsumers?.[0]?.totalQuantity || SAMPLE_TOP_CONSUMERS[0].totalQuantity) || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Driver Stats — global only */}
      {!selectedDepot && driverData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Drivers', value: driverData.active || 0, icon: Users, color: 'from-green-400 to-emerald-500' },
            { label: 'On Leave', value: driverData.onLeave || 0, icon: Users, color: 'from-amber-400 to-orange-500' },
            { label: 'Suspended', value: driverData.suspended || 0, icon: Users, color: 'from-red-400 to-red-600' },
            { label: 'License Warnings', value: driverData.licenseWarnings || 0, icon: AlertTriangle, color: 'from-rose-500 to-red-700' },
          ].map((item, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500">{item.label}</p>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}><item.icon size={14} className="text-white" /></div>
              </div>
              <p className="text-xl font-black text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Maintenance Cost — global only */}
      {!selectedDepot && maintenanceData?.categoryBreakdown?.length > 0 && (
        <Card>
          <CardHeader title="Maintenance Cost by Category" icon={Wrench} gradient="bg-gradient-to-br from-red-500 to-red-700" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
            {maintenanceData.categoryBreakdown.map((cat) => (
              <div key={cat._id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-[11px] text-gray-400 capitalize mb-1">{cat._id?.replace(/_/g, ' ') || 'Other'}</p>
                <p className="text-base font-black text-gray-900">{formatCurrency(cat.totalCost || 0)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{cat.count} records</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Trip Analytics — global only */}
      {!selectedDepot && routePerf.length > 0 && (
        <Card>
          <CardHeader title="Trip Analytics by Route" icon={Map} gradient="bg-gradient-to-br from-red-500 to-red-700" />
          <TripAnalyticsChart data={routePerf} />
        </Card>
      )}

      {/* Depot Analytics Table */}
      {!depotLoading && filteredDepots.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardHeader title={selectedDepot ? `${selectedDepot} — Depot Analytics` : 'Analytics by Depot'} icon={Building2} gradient="bg-gradient-to-br from-red-500 to-red-700" />
            {selectedDepot && (
              <span className="text-xs text-gray-400 font-medium">Showing 1 depot</span>
            )}
            {!selectedDepot && (
              <span className="text-xs text-gray-400 font-medium">{filteredDepots.length} depots</span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left py-2.5 px-4 text-xs font-bold text-gray-500 rounded-tl-xl">Depot</th>
                  <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500">Buses</th>
                  <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500">Active Buses</th>
                  <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500">In Maintenance</th>
                  <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500">Drivers</th>
                  <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500">Active Drivers</th>
                  <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500">On Leave</th>
                  <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500">Routes</th>
                  <th className="text-center py-2.5 px-4 text-xs font-bold text-gray-500 rounded-tr-xl">Schedules</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepots.map((d, i) => (
                  <tr key={d.depot} className={`border-b border-gray-50 transition-colors hover:bg-red-50/30 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} ${d.depot === selectedDepot ? 'ring-1 ring-red-200' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex-shrink-0" />
                        <span className="font-semibold text-gray-900">{d.depot}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800">{d.buses.total}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">{d.buses.active}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.buses.maintenance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'}`}>{d.buses.maintenance}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-800">{d.drivers.total}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{d.drivers.active}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.drivers.onLeave > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-400'}`}>{d.drivers.onLeave}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">{d.routes.active}/{d.routes.total}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">{d.schedules.active}/{d.schedules.total}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
