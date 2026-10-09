import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const icons = { success: CheckCircle, warning: AlertTriangle, error: XCircle, info: Info };
const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};
const iconStyles = { success: 'text-emerald-500', warning: 'text-amber-500', error: 'text-red-500', info: 'text-blue-500' };

export default function Alert({ type = 'info', title, message, onClose, className = '' }) {
  const Icon = icons[type];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`flex items-start gap-3 p-4 rounded-2xl border ${styles[type]} ${className}`}
      >
        <Icon size={18} className={`${iconStyles[type]} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {title && <p className="font-semibold text-sm">{title}</p>}
          {message && <p className="text-sm mt-0.5 opacity-90">{message}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <X size={15} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Toast-style notification
export function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-soft-lg min-w-[280px] max-w-sm ${styles[t.type]}`}
          >
            {React.createElement(icons[t.type], { size: 16, className: iconStyles[t.type] })}
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100">
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
