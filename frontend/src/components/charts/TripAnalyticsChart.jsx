import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';

const BAR_COLORS = ['#DC2626', '#EF4444', '#F87171', '#FDA4AF', '#FECDD3', '#FFE4E6'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-xl min-w-[140px]">
      <p className="text-xs font-bold text-gray-500 mb-2">Route {label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600 font-medium">{p.name}:</span>
          <span className="font-black text-gray-900">
            {p.dataKey === 'performance' ? `${p.value}%` : (p.value || 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

function PerformanceBadge({ value }) {
  if (!value) return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border bg-gray-50 text-gray-400 border-gray-200">N/A</span>;
  const color =
    value >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
    value >= 75 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-600 border-red-200';
  return (
    <span className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${color}`}>
      {value}%
    </span>
  );
}

export default function TripAnalyticsChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-300">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-2 opacity-40">
          <rect x="4" y="28" width="8" height="16" rx="2" fill="#CBD5E1" />
          <rect x="14" y="18" width="8" height="26" rx="2" fill="#CBD5E1" />
          <rect x="24" y="22" width="8" height="22" rx="2" fill="#CBD5E1" />
          <rect x="34" y="10" width="8" height="34" rx="2" fill="#CBD5E1" />
        </svg>
        <p className="text-sm font-semibold">No route data available</p>
      </div>
    );
  }

  // Normalise: guarantee every entry has a display name
  const chartData = data.map((r, i) => ({
    ...r,
    name: r.name && String(r.name).trim() ? String(r.name).trim() : `#${i + 1}`,
    performance: Number(r.performance) || 0,
    totalTripsCompleted: Number(r.totalTripsCompleted) || 0,
  }));

  const allZero = chartData.every(r => r.performance === 0 && r.totalTripsCompleted === 0);
  const maxTrips = Math.max(...chartData.map(d => d.totalTripsCompleted), 1);
  const sorted = [...chartData].sort((a, b) => b.performance - a.performance || b.totalTripsCompleted - a.totalTripsCompleted);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-1 pb-3">
      {/* Chart — 3 cols */}
      <div className="lg:col-span-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
          Trips Completed &amp; On-Time Rate
        </p>

        {allZero ? (
          <div className="h-[220px] flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="mb-2 opacity-30">
              <rect x="4" y="22" width="6" height="14" rx="2" fill="#94A3B8" />
              <rect x="12" y="14" width="6" height="22" rx="2" fill="#94A3B8" />
              <rect x="20" y="18" width="6" height="18" rx="2" fill="#94A3B8" />
              <rect x="28" y="8" width="6" height="28" rx="2" fill="#94A3B8" />
            </svg>
            <p className="text-sm font-bold text-gray-400">No trip data recorded yet</p>
            <p className="text-xs text-gray-300 mt-1">{chartData.length} route{chartData.length !== 1 ? 's' : ''} registered</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 24, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#DC2626" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.45} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v && v.length > 6 ? v.slice(0, 6) : v}
              />
              <YAxis yAxisId="trips" orientation="left" tick={{ fontSize: 10, fill: '#CBD5E1' }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="perf" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: '#CBD5E1' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="trips" dataKey="totalTripsCompleted" name="Trips" radius={[6, 6, 0, 0]} maxBarSize={44}>
                {chartData.map((_, i) => <Cell key={i} fill="url(#barGrad)" />)}
              </Bar>
              <Line yAxisId="perf" type="monotone" dataKey="performance" name="On-Time %" stroke="#0EA5E9" strokeWidth={2.5} dot={{ r: 4, fill: '#0EA5E9', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#0369A1', strokeWidth: 0 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}

        <div className="flex items-center gap-5 justify-center mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-b from-red-500 to-red-400" />
            <span className="text-[11px] text-gray-500 font-medium">Trips Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-sky-500 rounded" />
            <span className="text-[11px] text-gray-500 font-medium">On-Time Rate %</span>
          </div>
        </div>
      </div>

      {/* Ranking — 2 cols */}
      <div className="lg:col-span-2 flex flex-col gap-1.5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
          Route Performance Ranking
        </p>
        {sorted.slice(0, 6).map((route, i) => {
          const pct = allZero ? 0 : Math.min(100, Math.round((route.totalTripsCompleted / maxTrips) * 100));
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          return (
            <div
              key={`${route.name}-${i}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-red-50/60 transition-colors group"
            >
              <span className="text-sm font-black text-gray-300 w-5 text-center flex-shrink-0">
                {medal || `#${i + 1}`}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="text-xs font-black text-gray-800 group-hover:text-red-700 transition-colors truncate">
                    Route {route.name}
                  </span>
                  <PerformanceBadge value={route.performance} />
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: allZero ? '0%' : `${Math.max(pct, route.performance > 0 ? 8 : 0)}%`,
                      background: `linear-gradient(90deg, ${BAR_COLORS[i] || '#94A3B8'}, ${BAR_COLORS[Math.min(i + 1, BAR_COLORS.length - 1)] || '#CBD5E1'})`,
                    }}
                  />
                </div>
              </div>
              <span className="text-[11px] font-bold text-gray-400 w-14 text-right flex-shrink-0">
                {route.totalTripsCompleted > 0 ? route.totalTripsCompleted.toLocaleString() : '—'}{' '}
                <span className="font-normal">{route.totalTripsCompleted > 0 ? 'trips' : ''}</span>
              </span>
            </div>
          );
        })}

        {allZero && (
          <p className="text-[11px] text-gray-400 text-center mt-1 px-2">
            Trip performance data will appear once schedules complete
          </p>
        )}
      </div>
    </div>
  );
}
