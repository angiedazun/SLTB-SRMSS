import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatsCard({ title, value, trend, trendLabel, icon: Icon, gradient, delay = 0, suffix }) {
  const trendPositive = trend > 0;
  const trendNeutral = trend === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card-hover"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-red-700" />
      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-red-100/50 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{title}</p>
          <p className="mt-2 text-4xl font-black leading-none tracking-tight text-gray-900">
            {value !== undefined && value !== null ? value.toLocaleString() : '—'}
            {suffix && <span className="ml-1 text-xl font-semibold text-gray-400">{suffix}</span>}
          </p>
        </div>
        {Icon && (
          <div className="relative flex-shrink-0">
            <div className={`h-12 w-12 rounded-2xl ${gradient || 'bg-gradient-to-br from-red-500 to-red-700'} flex items-center justify-center text-white shadow-lg ring-4 ring-white`}>
              <Icon size={21} className="text-white" />
            </div>
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
          </div>
        )}
      </div>

      {trendLabel && (
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            trendNeutral ? 'text-gray-500 bg-gray-100' :
            trendPositive ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'
          }`}>
            {trendNeutral ? <Minus size={11} /> : trendPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(trend)}%
          </span>
          <span className="truncate text-xs font-medium text-gray-500">{trendLabel}</span>
        </div>
      )}
    </motion.div>
  );
}
