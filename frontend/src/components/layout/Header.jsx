import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, LogOut, Settings, User, ChevronDown, X, Menu, LayoutDashboard, Map, Calendar, Bus, Users, Wrench, Fuel, BarChart3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { initials, timeAgo } from '../../utils/helpers';
import api from '../../services/api';
import { buildSystemNotifications } from '../../utils/buildSystemNotifications';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/analytics': 'Analytics',
  '/routes': 'Route Management',
  '/routes/create': 'Create Route',
  '/schedules': 'Schedule Calendar',
  '/schedules/timetable': 'Timetable Management',
  '/buses': 'Fleet Management',
  '/drivers': 'Driver Management',
  '/driver/me': 'My Driver Panel',
  '/maintenance': 'Maintenance',
  '/maintenance/fuel': 'Fuel Logs',
  '/reports': 'Analytics Reports',
  '/reports/export': 'Export Reports',
  '/notifications': 'Notifications',
  '/settings/users': 'User Management',
  '/settings': 'System Settings',
};


const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/routes', label: 'Routes', icon: Map },
  { to: '/schedules', label: 'Schedules', icon: Calendar },
  { to: '/buses', label: 'Fleet', icon: Bus },
  { to: '/drivers', label: 'Drivers', icon: Users },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/maintenance/fuel', label: 'Fuel Logs', icon: Fuel },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
];

const DRIVER_NAV_ITEMS = [{ to: '/driver/me', label: 'My Daily Routes', icon: Calendar, exact: true }];

function isNavActive(pathname, item) {
  if (item.exact) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export default function Header({ sidebarCollapsed = false }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const mobileNavRef = useRef(null);

  const title = PAGE_TITLES[location.pathname] || 'SLTB SRMSS';
  const isDriver = user?.role === 'driver';
  const mobileNavItems = isDriver ? DRIVER_NAV_ITEMS : NAV_ITEMS;

  useEffect(() => {
    if (isDriver) { setNotifications([]); setUnread(0); return; }

    const dismissed = (() => { try { return JSON.parse(localStorage.getItem('sltb_notif_dismissed') || '[]'); } catch { return []; } })();
    const readLocal  = (() => { try { return JSON.parse(localStorage.getItem('sltb_notif_read')      || '[]'); } catch { return []; } })();

    const fetchNotifs = async () => {
      try {
        const [dbRes, sysNotes] = await Promise.all([
          api.get('/notifications?limit=5').catch(() => ({ data: { notifications: [] } })),
          buildSystemNotifications(),
        ]);
        const dbNotes  = dbRes.data?.notifications || [];
        const filtered = sysNotes.filter(n => !dismissed.includes(n._id));
        const all      = [...dbNotes, ...filtered].slice(0, 8);
        setNotifications(all);
        const unreadCount = all.filter(n =>
          !(n._isRead || (n.readBy && n.readBy.length > 0) || readLocal.includes(n._id))
        ).length;
        setUnread(unreadCount);
      } catch { /* */ }
    };
    fetchNotifs();
  }, [isDriver]);

  // Click outside to close
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target)) setShowMobileNav(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try { await api.put('/notifications/read-all').catch(() => {}); } catch { /* */ }
    const sysIds = notifications.filter(n => String(n._id).startsWith('sys-')).map(n => n._id);
    const prev = (() => { try { return JSON.parse(localStorage.getItem('sltb_notif_read') || '[]'); } catch { return []; } })();
    localStorage.setItem('sltb_notif_read', JSON.stringify([...new Set([...prev, ...sysIds])]));
    setUnread(0);
  };

  const notifTypeIcon = (type) => {
    const map = { warning: '⚠️', danger: '🚨', success: '✅', maintenance: '🔧', fuel: '⛽', schedule: '📅' };
    return map[type] || 'ℹ️';
  };

  return (
    <header
      className={`fixed top-0 right-0 z-40 transition-[left] duration-300 ease-in-out left-0 ${sidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-64'}`}
      style={{
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '2px solid #FED7D7',
        boxShadow: '0 2px 20px rgba(229,62,62,0.08)',
      }}
    >
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md flex-shrink-0">
            <span className="text-white font-black text-xs">SL</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{title}</h1>
            <p className="text-[11px] text-gray-400 leading-tight hidden sm:block">SLTB SRMSS · Smart Route Management</p>
          </div>
        </div>

        {!isDriver && <div className="hidden xl:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-72 focus-within:ring-2 focus-within:ring-red-300 focus-within:border-red-400 focus-within:bg-white transition-all duration-150">
          <Search size={14} className="text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routes, buses, drivers..."
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-xs"
          />
          {search && <button onClick={() => setSearch('')}><X size={12} className="text-gray-400 hover:text-gray-600" /></button>}
        </div>}

        <div className="flex items-center gap-1.5">
          {!isDriver && <span className="hidden md:flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>}

          {!isDriver && <button onClick={() => setShowSearch(!showSearch)} className="xl:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200">
            <Search size={16} />
          </button>}

          <div ref={mobileNavRef} className="relative xl:hidden">
            <button
              onClick={() => setShowMobileNav((prev) => !prev)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
              aria-label="Open navigation menu"
            >
              <Menu size={16} />
            </button>
            <AnimatePresence>
              {showMobileNav && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-[min(20rem,calc(100vw-1rem))] bg-white rounded-2xl border border-gray-100 overflow-hidden z-50 shadow-2xl"
                >
                  <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
                    <p className="text-xs font-bold text-gray-900">Navigation</p>
                    <p className="text-[11px] text-gray-500">Jump to any module</p>
                  </div>
                  <div className="p-2 grid grid-cols-1 gap-1">
                    {mobileNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        onClick={() => setShowMobileNav(false)}
                        className={({ isActive }) => {
                          const active = isActive || isNavActive(location.pathname, item);
                          return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-sm' : 'text-gray-700 hover:bg-red-50 hover:text-red-700'}`;
                        }}
                      >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isDriver && <div ref={notifRef} className="relative">
            <button
              onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }}
              className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-200"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotif && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-gray-100 overflow-hidden z-50"
                  style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
                    <div className="flex items-center gap-2">
                      <Bell size={14} className="text-red-500" />
                      <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                      {unread > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
                    </div>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs text-red-500 hover:text-red-700 font-semibold">Mark read</button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map((n, i) => (
                      <div key={n._id || i} className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${i < unread ? 'bg-red-50/50' : ''}`}>
                        <span className="text-base flex-shrink-0 leading-none mt-0.5">{notifTypeIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-snug">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-center">
                    <button onClick={() => { navigate('/notifications'); setShowNotif(false); }} className="text-xs text-red-500 font-semibold hover:text-red-700">View all notifications →</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>}

          <div ref={profileRef} className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 hover:border-red-300 hover:bg-red-50 transition-all duration-150"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials(user?.name)}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-gray-800 leading-tight max-w-[90px] truncate">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-gray-400 leading-tight capitalize">{user?.role?.replace(/_/g, ' ') || 'Administrator'}</p>
              </div>
              <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-60 bg-white rounded-2xl border border-gray-100 overflow-hidden z-50"
                  style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.14)' }}
                >
                  <div className="px-4 py-4 bg-gradient-to-br from-red-500 to-red-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold">
                        {initials(user?.name)}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{user?.name || 'Admin User'}</p>
                        <p className="text-xs text-red-100 capitalize">{user?.role?.replace(/_/g, ' ') || 'Administrator'}</p>
                        {user?.depot && <p className="text-[11px] text-red-200">{user.depot} Depot</p>}
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    {!isDriver && <button onClick={() => { navigate('/settings'); setShowProfile(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <Settings size={15} className="text-red-500" /> Settings
                    </button>}
                    {!isDriver && <button onClick={() => { navigate('/settings/users'); setShowProfile(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={15} className="text-red-500" /> User Management
                    </button>}
                    {isDriver && <button onClick={() => { navigate('/driver/me'); setShowProfile(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      <User size={15} className="text-red-500" /> My Driver Panel
                    </button>}
                    <div className="mx-3 my-1 border-t border-gray-100" />
                    <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold">
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSearch && !isDriver && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-full left-0 right-0 bg-white border-b-2 border-red-200 px-4 py-3 flex items-center gap-2 shadow-md xl:hidden"
          >
            <Search size={15} className="text-gray-400" />
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="flex-1 bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400" />
            <button onClick={() => setShowSearch(false)}><X size={15} className="text-gray-400" /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
