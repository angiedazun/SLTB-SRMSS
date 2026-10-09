import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, subtitle, icon: Icon, isEdit = false, children, size = 'md', footer }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl', full: 'max-w-6xl' };
  const headerGradient = isEdit
    ? 'bg-gradient-to-r from-amber-500 to-orange-600'
    : 'bg-gradient-to-r from-red-500 to-red-700';
  const subtitleColor = isEdit ? 'text-amber-100' : 'text-red-100';

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative w-full ${sizes[size]} bg-white rounded-3xl shadow-2xl overflow-hidden z-10`}
          >
            {title && (
              <div className={`${headerGradient} px-6 py-5 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  {Icon && (
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-black text-white leading-tight">{title}</h2>
                    {subtitle && <p className={`text-xs ${subtitleColor} mt-0.5`}>{subtitle}</p>}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors flex-shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
