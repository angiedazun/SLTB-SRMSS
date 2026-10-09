import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-red-100/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-sm font-black" style={{ color: p.color }}>
          {currency ? `LKR ${p.value.toLocaleString()}` : `${p.value} L`}
        </p>
      ))}
    </div>
  );
};

export default function FuelChart({ data = [], currency = false }) {
  const key = currency ? 'cost' : 'quantity';
  const values = data.map((d) => Number(d[key]) || 0).filter((n) => n > 0);
  const total = values.reduce((sum, v) => sum + v, 0);
  const peak = values.length ? Math.max(...values) : 0;
  const avg = values.length ? Math.round(total / values.length) : 0;

  const formatValue = (val) => (currency ? `LKR ${val.toLocaleString()}` : `${val.toLocaleString()} L`);

  if (!data.length) {
    return (
      <div className="h-[220px] rounded-2xl border border-gray-100 bg-gray-50/70 grid place-items-center text-sm text-gray-400">
        No fuel trend data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Total</p>
          <p className="text-sm font-black text-red-700 truncate">{formatValue(total)}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Average</p>
          <p className="text-sm font-black text-amber-700 truncate">{formatValue(avg)}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Peak Day</p>
          <p className="text-sm font-black text-emerald-700 truncate">{formatValue(peak)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-red-50/30 to-white p-2">
        <ResponsiveContainer width="100%" height={230}>
          <AreaChart data={data} margin={{ top: 8, right: 10, left: -14, bottom: 4 }}>
            <defs>
              <linearGradient id="fuelGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.02} />
              </linearGradient>
              <filter id="fuelGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#EF4444" floodOpacity="0.25" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#F3F4F6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Area
              type="monotone"
              dataKey={key}
              stroke="#DC2626"
              strokeWidth={3}
              fill="url(#fuelGrad)"
              filter="url(#fuelGlow)"
              dot={{ r: 0 }}
              activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff', fill: '#DC2626' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
