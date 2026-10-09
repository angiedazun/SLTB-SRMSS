export default function Badge({ children, variant = 'info', dot = false, className = '' }) {
  const variants = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    maintenance: 'bg-amber-50 text-amber-700 border-amber-200',
    delayed: 'bg-orange-50 text-orange-700 border-orange-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-light text-indigo-brand border-indigo-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
    low: 'bg-gray-100 text-gray-600 border-gray-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  const dotColors = {
    active: 'bg-emerald-500',
    inactive: 'bg-gray-400',
    maintenance: 'bg-amber-500',
    delayed: 'bg-orange-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
  };

  return (
    <span className={`badge border ${variants[variant] || variants.info} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-blue-500'}`} />
      )}
      {children}
    </span>
  );
}

export const StatusBadge = ({ status }) => {
  const config = {
    active: { label: 'Active', variant: 'active' },
    idle: { label: 'Idle', variant: 'inactive' },
    maintenance: { label: 'Maintenance', variant: 'maintenance' },
    delayed: { label: 'Delayed', variant: 'delayed' },
    out_of_service: { label: 'Out of Service', variant: 'danger' },
    on_leave: { label: 'On Leave', variant: 'info' },
    suspended: { label: 'Suspended', variant: 'danger' },
    inactive: { label: 'Inactive', variant: 'inactive' },
    in_progress: { label: 'In Progress', variant: 'info' },
    scheduled: { label: 'Scheduled', variant: 'indigo' },
    completed: { label: 'Completed', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
    draft: { label: 'Draft', variant: 'inactive' },
  };
  const c = config[status] || { label: status, variant: 'info' };
  return <Badge variant={c.variant} dot>{c.label}</Badge>;
};
