import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../hooks/useAuth';

export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { user, sessionWarning, extendSession, logout } = useAuth();

  useEffect(() => {
    if (user?.role === 'driver' && location.pathname !== '/driver/me') {
      navigate('/driver/me', { replace: true });
    }
  }, [user?.role, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-mesh">
      {/* Session Timeout Warning Modal */}
      <AnimatePresence>
        {sessionWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-7 text-center"
            >
              <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
                <Clock size={26} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Session Expiring Soon</h3>
              <p className="text-sm text-gray-500 mb-6">
                You've been inactive for a while. Your session will automatically end in <strong>2 minutes</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={logout}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <LogOut size={15} /> Sign Out
                </button>
                <button
                  onClick={extendSession}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-500 to-red-700 py-2.5 text-sm font-bold text-white shadow hover:brightness-105 transition-all"
                >
                  <RefreshCw size={15} /> Stay Signed In
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Sidebar: always visible on lg+, hidden on mobile ── */}
      <div className="hidden lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {/* ── Top header: shifts right to clear sidebar on lg+ ── */}
      <Header sidebarCollapsed={collapsed} />

      {/* ── Page content: pushed right by sidebar, padded below header ── */}
      <main
        className={`min-h-screen pb-12 px-4 sm:px-6 lg:px-8 pt-[88px] transition-[margin-left] duration-300 ease-in-out ${
          collapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
        }`}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
