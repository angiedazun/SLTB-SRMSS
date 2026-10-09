import api from '../services/api';

let _uid = 1;

export async function buildSystemNotifications() {
  const safe = (p) => p.catch(() => ({ data: {} }));
  const [dRes, bRes, mRes, sRes] = await Promise.all([
    safe(api.get('/drivers?limit=500')),
    safe(api.get('/buses?limit=500')),
    safe(api.get('/maintenance?limit=200')),
    safe(api.get('/dashboard/stats')),
  ]);

  const drivers = dRes.data?.drivers || [];
  const buses   = bRes.data?.buses   || [];
  const maints  = mRes.data?.records || [];
  const stats   = sRes.data          || {};
  const now     = Date.now();
  const notes   = [];

  const push = (obj) => notes.push({ _id: `sys-${_uid++}`, createdAt: new Date().toISOString(), readBy: [], ...obj });

  // Expired licenses
  drivers.filter(d => d.licenseExpiry && new Date(d.licenseExpiry) < now).forEach(d =>
    push({ title: `License Expired — ${d.name}`, message: `Driver ${d.name} (${d.employeeId || ''}) license expired on ${new Date(d.licenseExpiry).toLocaleDateString('en-GB')}. Immediate action required.`, type: 'danger', priority: 'critical' })
  );

  // Licenses expiring within 30 days
  drivers.forEach(d => {
    if (!d.licenseExpiry) return;
    const days = Math.ceil((new Date(d.licenseExpiry) - now) / 86400000);
    if (days > 0 && days <= 30)
      push({ title: `License Expiring Soon — ${d.name}`, message: `Driver ${d.name} license expires in ${days} day${days !== 1 ? 's' : ''} (${new Date(d.licenseExpiry).toLocaleDateString('en-GB')}). Please renew.`, type: 'warning', priority: days <= 7 ? 'high' : 'medium' });
  });

  // Buses in maintenance
  buses.filter(b => b.status === 'maintenance').forEach(b =>
    push({ title: `Bus in Maintenance — ${b.busNumber}`, message: `Bus ${b.busNumber} (${b.registrationNumber || ''}) is currently under maintenance at ${b.depot || 'depot'}.`, type: 'maintenance', priority: 'medium' })
  );

  // Buses out of service
  buses.filter(b => b.status === 'out_of_service').forEach(b =>
    push({ title: `Bus Out of Service — ${b.busNumber}`, message: `Bus ${b.busNumber} at ${b.depot || 'depot'} is marked out of service. Investigate before scheduling.`, type: 'danger', priority: 'high' })
  );

  // Overdue maintenance tasks
  maints.filter(m => m.status === 'overdue' || (m.scheduledDate && new Date(m.scheduledDate) < now && m.status !== 'completed')).forEach(m =>
    push({ title: `Overdue Maintenance — ${m.bus?.busNumber || 'Bus'}`, message: `Task "${m.title || m.maintenanceType}" scheduled for ${new Date(m.scheduledDate).toLocaleDateString('en-GB')} is overdue.`, type: 'maintenance', priority: 'high' })
  );

  // Fleet health summary
  const totalBuses  = buses.length;
  const activeBuses = buses.filter(b => b.status === 'active').length;
  if (totalBuses > 0) {
    const utilization = Math.round((activeBuses / totalBuses) * 100);
    push({ title: 'Fleet Health Summary', message: `${activeBuses}/${totalBuses} buses active (${utilization}%). ${buses.filter(b => b.status === 'maintenance').length} in maintenance, ${buses.filter(b => b.status === 'out_of_service').length} out of service.`, type: utilization >= 80 ? 'success' : 'warning', priority: 'low' });
  }

  // Pending maintenance
  const pendingMaint = stats?.maintenance?.pending || maints.filter(m => m.status === 'pending').length;
  if (pendingMaint > 0)
    push({ title: `${pendingMaint} Maintenance Tasks Pending`, message: `${pendingMaint} maintenance tasks awaiting completion. Review the schedule.`, type: 'maintenance', priority: pendingMaint >= 5 ? 'high' : 'medium' });

  // Schedules today
  const schedulesToday = stats?.schedules?.today || 0;
  if (schedulesToday > 0)
    push({ title: `${schedulesToday} Schedules Active Today`, message: `${schedulesToday} bus schedules are running today across all depots.`, type: 'schedule', priority: 'low' });

  return notes;
}
