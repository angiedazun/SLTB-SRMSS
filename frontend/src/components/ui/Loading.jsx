import { motion } from 'framer-motion';
import { Bus } from 'lucide-react';

export default function Loading({ fullScreen = false, size = 'md', text = 'Loading...' }) {
  const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-14 h-14' };

  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className={`${sizes[size]} rounded-full border-4 border-red-100 border-t-red-500 animate-spin`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Bus size={size === 'lg' ? 20 : size === 'md' ? 14 : 10} className="text-red-500" />
        </div>
      </div>
      {text && <p className="text-sm text-gray-500 font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-mesh flex items-center justify-center z-50">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="bg-white/90 backdrop-blur-xl rounded-4xl p-10 shadow-glass-lg border border-white/60">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
                <Bus size={28} className="text-white" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 text-lg">SLTB SRMSS</p>
                <p className="text-sm text-gray-500 mt-1">Loading system...</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-red-500"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return content;
}

export function Skeleton({ className = '', lines = 1 }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}
