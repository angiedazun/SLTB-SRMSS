import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bus, Users, Map, Calendar, Wrench,
  Fuel, BarChart3, FileText, Settings, ChevronRight,
  TrendingUp, Bell, LogOut, Shield, Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { initials } from '../../utils/helpers';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
      { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/routes', icon: Map, label: 'Routes' },
      { to: '/schedules', icon: Calendar, label: 'Schedules' },
      { to: '/buses', icon: Bus, label: 'Fleet Management' },
      { to: '/drivers', icon: Users, label: 'Drivers' },
    ],
  },
  {
    label: 'Maintenance',
    items: [
      { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
      { to: '/maintenance/fuel', icon: Fuel, label: 'Fuel Logs' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Analytics Reports' },
      { to: '/reports/export', icon: FileText, label: 'Export Reports' },
    ],
  },
  {
    label: 'Notifications',
    items: [
      { to: '/notifications', icon: Bell, label: 'Notifications' },
    ],
  },
  {
    label: 'Driver Portal',
    roles: ['driver'],
    items: [
      { to: '/driver/me', icon: Clock, label: 'My Daily Routes' },
    ],
  },
  {
    label: 'System',
    roles: ['super_admin', 'depot_manager'],
    items: [
      { to: '/settings/users', icon: Shield, label: 'User Management' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const SidebarLink = ({ item }) => {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''}`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={18} className={isActive ? 'text-white' : 'text-gray-500'} />
          <span className="flex-1">{item.label}</span>
          {isActive && (
            <motion.div
              layoutId="active-dot"
              className="w-1.5 h-1.5 rounded-full bg-white/70"
            />
          )}
        </>
      )}
    </NavLink>
  );
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const isDriver = user?.role === 'driver';
  const visibleGroups = isDriver
    ? [
        {
          label: 'Driver Dashboard',
          items: [{ to: '/driver/me', icon: Clock, label: 'My Daily Routes' }],
        },
      ]
    : NAV_GROUPS.filter((group) => !group.roles || group.roles.includes(user?.role));

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-screen z-50 flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '2px solid #FED7D7',
        boxShadow: '4px 0 40px rgba(229,62,62,0.08)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100/80">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md flex-shrink-0">
          <Bus size={20} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden"
            >
              <p className="font-bold text-sm leading-tight text-gray-900">SLTB SRMSS</p>
              <p className="text-xs text-gray-500 leading-tight">Transport Management</p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={onToggle}
          className="ml-auto btn-icon flex-shrink-0"
        >
          <motion.div animate={{ rotate: collapsed ? 0 : 180 }}>
            <ChevronRight size={16} />
          </motion.div>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-2"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="space-y-0.5">
              {group.items.map((item) =>
                collapsed ? (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center justify-center w-10 h-10 rounded-xl mx-auto transition-all duration-150 ${
                        isActive
                          ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-md'
                          : 'text-gray-500 hover:bg-red-50 hover:text-red-600'
                      }`
                    }
                  >
                    <item.icon size={18} />
                  </NavLink>
                ) : (
                  <SidebarLink key={item.to} item={item} />
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-gray-100/80 p-3">
          <div className={`flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm">
            {initials(user?.name)}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden min-w-0"
              >
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{user?.role?.replace(/_/g, ' ')}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!collapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={logout}
                className="btn-icon text-gray-400 hover:text-red-500 hover:bg-red-50"
                title="Logout"
              >
                <LogOut size={15} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
