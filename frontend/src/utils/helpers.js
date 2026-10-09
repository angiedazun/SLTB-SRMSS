import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date, fmt = 'dd MMM yyyy') =>
  date ? format(new Date(date), fmt) : '—';

export const formatDateTime = (date) =>
  date ? format(new Date(date), 'dd MMM yyyy, HH:mm') : '—';

export const timeAgo = (date) =>
  date ? formatDistanceToNow(new Date(date), { addSuffix: true }) : '—';

export const formatCurrency = (amount, currency = 'LKR') =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency }).format(amount || 0);

export const formatNumber = (n) =>
  new Intl.NumberFormat('en-LK').format(n || 0);

export const getBusStatusColor = (status) => {
  const map = {
    active: 'badge-active',
    maintenance: 'badge-maintenance',
    delayed: 'badge-delayed',
    out_of_service: 'badge-danger',
    idle: 'badge-inactive',
  };
  return map[status] || 'badge-inactive';
};

export const getDriverStatusColor = (status) => {
  const map = {
    active: 'badge-active',
    on_leave: 'badge-info',
    suspended: 'badge-danger',
    inactive: 'badge-inactive',
  };
  return map[status] || 'badge-inactive';
};

export const getPriorityColor = (priority) => {
  const map = {
    low: 'text-gray-500 bg-gray-100',
    medium: 'text-blue-600 bg-blue-50',
    high: 'text-orange-600 bg-orange-50',
    critical: 'text-red-600 bg-red-50',
  };
  return map[priority] || 'text-gray-500 bg-gray-100';
};

export const getRoleLabel = (role) => {
  const map = {
    super_admin: 'Super Admin',
    depot_manager: 'Depot Manager',
    scheduler_officer: 'Scheduler',
    driver: 'Driver',
    maintenance_officer: 'Maintenance',
  };
  return map[role] || role;
};

export const truncate = (str, n = 30) =>
  str && str.length > n ? str.slice(0, n) + '...' : str || '';

export const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

export const statusLabel = (s) =>
  s ? s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';
