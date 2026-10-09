import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl px-4 py-3 shadow-soft-lg">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold text-primary-400">{payload[0]?.value}% on-time</p>
    </div>
  );
};

export default function RoutePerformanceChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} unit="%" />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(79,156,249,0.06)', radius: 8 }} />
        <Bar dataKey="performance" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={index}
              fill={entry.performance >= 80 ? '#22C55E' : entry.performance >= 60 ? '#F59E0B' : '#EF4444'}
              opacity={0.9}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
