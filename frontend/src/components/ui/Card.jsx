import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = true, padding = 'p-6', glass = false, onClick }) {
  return (
    <motion.div
      whileHover={hover && !onClick ? { y: -2 } : undefined}
      onClick={onClick}
      className={`${glass ? 'card-glass' : 'card'} ${padding} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ title, subtitle, action, icon: Icon, gradient }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${gradient || 'bg-gradient-to-br from-red-500 to-red-700'} shadow-sm`}>
            <Icon size={18} className="text-white" />
          </div>
        )}
        <div>
          <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
