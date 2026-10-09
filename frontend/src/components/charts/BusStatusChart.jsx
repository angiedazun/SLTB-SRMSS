import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = {
  active: '#22C55E',
  maintenance: '#F59E0B',
  delayed: '#F97316',
  out_of_service: '#EF4444',
  idle: '#94A3B8',
};

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.08) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.58;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-red-100/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Fleet Segment</p>
      <p className="text-sm font-black capitalize" style={{ color: COLORS[payload[0].name] || '#E53E3E' }}>
        {payload[0].name?.replace(/_/g, ' ')}
      </p>
      <p className="text-sm text-gray-600 mt-0.5">{payload[0].value} buses</p>
    </div>
  );
};

export default function BusStatusChart({ data = [] }) {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0);
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const active = chartData.find((item) => item.name === 'active')?.value || 0;
  const activePct = total ? Math.round((active / total) * 100) : 0;

  if (!total) {
    return (
      <div className="h-[230px] rounded-2xl border border-gray-100 bg-gray-50/70 grid place-items-center text-sm text-gray-400">
        No fleet status data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-red-500">Total</p>
          <p className="text-xl font-black text-red-700">{total}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Active</p>
          <p className="text-xl font-black text-emerald-700">{active}</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Health</p>
          <p className="text-xl font-black text-blue-700">{activePct}%</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-red-50/30 to-white p-2">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              dataKey="value"
              paddingAngle={2}
              cornerRadius={8}
              labelLine={false}
              label={renderLabel}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={COLORS[entry.name] || '#E53E3E'} stroke="none" />
              ))}
            </Pie>
            <text x="50%" y="48%" textAnchor="middle" className="fill-gray-500 text-[11px] font-semibold uppercase tracking-wider">
              Fleet
            </text>
            <text x="50%" y="57%" textAnchor="middle" className="fill-gray-900 text-xl font-black">
              {total}
            </text>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-2">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1.5 border border-gray-100 flex-1 min-w-[120px]">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[item.name] || '#E53E3E' }} />
            <span className="text-[10px] font-bold text-gray-600 capitalize whitespace-nowrap">
              {item.name.replace(/_/g, ' ')}
            </span>
            <span className="ml-auto text-[11px] font-black text-gray-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
