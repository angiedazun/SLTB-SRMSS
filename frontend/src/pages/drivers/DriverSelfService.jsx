import { useEffect, useMemo, useState } from 'react';
import {
  User, CalendarDays, BadgeCheck, Phone, Building2, Timer,
  ExternalLink, Sparkles, AlertTriangle, CheckCircle2, MapPin,
  Clock, Navigation, Bus, Route as RouteIcon, ChevronRight, ArrowRight,
} from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Loading from '../../components/ui/Loading';
import { StatusBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { formatDate } from '../../utils/helpers';

// ── Stop Timeline ─────────────────────────────────────────
function StopTimeline({ stops = [] }) {
  if (!stops.length) return (
    <div className="text-center py-6 text-gray-400 text-sm">No stop data available for this route.</div>
  );

  const sorted = [...stops].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="relative pl-4">
      {/* Vertical line */}
      <div className="absolute left-[1.35rem] top-3 bottom-3 w-0.5 bg-gradient-to-b from-red-500 via-red-300 to-emerald-400" />

      {sorted.map((stop, i) => {
        const isFirst = i === 0;
        const isLast = i === sorted.length - 1;
        return (
          <div key={`${stop.name}-${i}`} className="relative flex gap-4 mb-0">
            {/* Dot */}
            <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 mt-1 ${
              isFirst ? 'bg-red-500 border-red-500 shadow-md shadow-red-200' :
              isLast  ? 'bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-200' :
                        'bg-white border-red-300'
            }`}>
              {isFirst
                ? <Navigation size={12} className="text-white" />
                : isLast
                  ? <MapPin size={12} className="text-white" />
                  : <div className="w-2 h-2 rounded-full bg-red-400" />
              }
            </div>

            {/* Content */}
            <div className={`flex-1 pb-5 ${isLast ? 'pb-0' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`font-bold text-sm ${isFirst ? 'text-red-700' : isLast ? 'text-emerald-700' : 'text-gray-800'}`}>
                    {stop.name}
                  </p>
                  {isFirst && <p className="text-[10px] font-semibold text-red-500 uppercase tracking-wider mt-0.5">Origin</p>}
                  {isLast && <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider mt-0.5">Destination</p>}
                </div>
                {(stop.distanceFromPrev || stop.timeFromPrev) && (
                  <div className="flex gap-2 text-right flex-shrink-0">
                    {stop.distanceFromPrev > 0 && (
                      <span className="text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg">
                        {stop.distanceFromPrev} km
                      </span>
                    )}
                    {stop.timeFromPrev > 0 && (
                      <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                        {stop.timeFromPrev} min
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────
export default function DriverSelfService() {
  const [driver, setDriver] = useState(null);
  const [allSchedules, setAllSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [driverRes, allSchedulesRes] = await Promise.all([
          api.get('/drivers/me'),
          api.get('/drivers/me/schedules'),
        ]);
        setDriver(driverRes.data?.driver || null);
        setAllSchedules(allSchedulesRes.data?.schedules || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Auto-select first active (non-completed) schedule
  useEffect(() => {
    if (selectedScheduleId || !allSchedules.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const active = allSchedules.find((s) => {
      const end = (s.effectiveTo || '').slice(0, 10);
      return !end || end >= today;
    });
    setSelectedScheduleId((active || allSchedules[0])?._id || '');
  }, [allSchedules, selectedScheduleId]);

  const scheduleStatus = (schedule) => {
    if (!schedule) return 'active';
    const today = new Date().toISOString().slice(0, 10);
    const end = (schedule.effectiveTo || '').slice(0, 10);
    if (end && today > end) return 'completed';
    const start = (schedule.effectiveFrom || '').slice(0, 10);
    if (start && today < start) return 'scheduled';
    return schedule.status || 'active';
  };

  const activeSchedule = useMemo(() =>
    allSchedules.find((s) => s._id === selectedScheduleId) || allSchedules[0] || null,
  [selectedScheduleId, allSchedules]);

  const activeRoute = activeSchedule?.route || driver?.assignedRoute || null;
  const stops = Array.isArray(activeRoute?.stops) ? [...activeRoute.stops].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];

  const googleDirectionsUrl = useMemo(() => {
    if (!activeRoute?.origin || !activeRoute?.destination) return '';
    const waypoints = stops.slice(1, stops.length - 1).map((s) => s.name).filter(Boolean).slice(0, 6).join('|');
    const params = new URLSearchParams({ api: '1', origin: activeRoute.origin, destination: activeRoute.destination, travelmode: 'driving' });
    if (waypoints) params.set('waypoints', waypoints);
    return `https://www.google.com/maps/dir/?${params}`;
  }, [activeRoute, stops]);

  const googleEmbedUrl = useMemo(() => {
    if (!activeRoute?.origin || !activeRoute?.destination) return '';
    const q = `${activeRoute.origin} to ${activeRoute.destination}, Sri Lanka`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  }, [activeRoute]);

  const stats = useMemo(() => ({
    total: allSchedules.length,
    active: allSchedules.filter((s) => scheduleStatus(s) === 'active').length,
    completed: allSchedules.filter((s) => scheduleStatus(s) === 'completed').length,
    trips: allSchedules.reduce((n, s) => n + (s.trips?.length || 0), 0),
  }), [allSchedules]);

  if (loading) return <Loading size="lg" text="Loading your driver panel..." />;

  if (!driver) {
    return (
      <div className="max-w-4xl mx-auto py-10">
        <Card>
          <p className="text-gray-600 font-medium">Driver profile not linked to this account. Please contact your administrator.</p>
        </Card>
      </div>
    );
  }

  const daysLeft = driver.licenseExpiry ? Math.ceil((new Date(driver.licenseExpiry) - Date.now()) / 86400000) : null;
  const licenseExpired = daysLeft !== null && daysLeft < 0;
  const licenseExpiring = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── Hero Header ── */}
      <Card className="overflow-hidden p-0 border-0 shadow-[0_20px_60px_rgba(136,19,55,0.25)]">
        <div className="relative bg-[radial-gradient(circle_at_15%_10%,#fb7185,transparent_45%),radial-gradient(circle_at_85%_80%,#be123c,transparent_45%),linear-gradient(120deg,#4c0519,#9f1239)] p-7 text-white">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,.2) 1px,transparent 1px),linear-gradient(rgba(255,255,255,.2) 1px,transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="uppercase text-[11px] tracking-[0.22em] font-bold text-white/70">Driver Command Deck</p>
              <h2 className="text-3xl md:text-4xl font-black mt-2">Hello, {driver.name}</h2>
              <p className="text-sm text-white/80 mt-2 max-w-xl">Your schedules, routes, and stop-by-stop navigation — all in one place.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-semibold">
                  <BadgeCheck size={14} /> Driver Portal Active
                </div>
                {driver.depot && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-semibold">
                    <Building2 size={13} /> {driver.depot} Depot
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Schedules', value: stats.total },
                { label: 'Active', value: stats.active },
                { label: 'Completed', value: stats.completed },
                { label: 'Trips', value: stats.trips },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/15 border border-white/20 p-3 text-center min-w-[64px]">
                  <p className="text-[10px] text-white/70">{s.label}</p>
                  <p className="text-2xl font-black mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── License Alerts ── */}
      {licenseExpired && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-red-50 border border-red-300 rounded-2xl">
          <AlertTriangle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-red-700">Your driving license has EXPIRED</p>
            <p className="text-xs text-red-600 mt-0.5">Expired on {formatDate(driver.licenseExpiry)}. Contact your depot manager immediately.</p>
          </div>
        </div>
      )}
      {licenseExpiring && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-amber-50 border border-amber-300 rounded-2xl">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-amber-800">License expiring soon — {daysLeft} day{daysLeft !== 1 ? 's' : ''} left</p>
            <p className="text-xs text-amber-700 mt-0.5">Expires on {formatDate(driver.licenseExpiry)}. Please renew before the expiry date.</p>
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Left: Profile + Schedule List ── */}
        <div className="space-y-5">

          {/* Profile card */}
          <Card>
            <CardHeader title="My Profile" icon={User} subtitle="Identity & license" />
            <div className="space-y-2 text-sm">
              {[
                { label: 'Employee ID', value: driver.employeeId },
                { label: 'NIC', value: driver.nic },
                { label: 'Phone', value: driver.phone, icon: Phone },
                { label: 'Depot', value: driver.depot, icon: Building2 },
                { label: 'Shift', value: driver.shift ? driver.shift.charAt(0).toUpperCase() + driver.shift.slice(1) : '—', icon: Timer },
                { label: 'License No', value: driver.licenseNumber },
                { label: 'License Expiry', value: driver.licenseExpiry ? formatDate(driver.licenseExpiry) : '—', icon: BadgeCheck, warn: licenseExpired || licenseExpiring },
              ].map((row) => (
                <div key={row.label} className={`flex items-center justify-between rounded-xl p-2.5 border ${row.warn ? (licenseExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200') : 'bg-gray-50 border-gray-100'}`}>
                  <span className="text-gray-500 flex items-center gap-1">
                    {row.icon && <row.icon size={12} />}{row.label}
                  </span>
                  <span className={`font-semibold ${row.warn ? (licenseExpired ? 'text-red-700' : 'text-amber-700') : 'text-gray-900'}`}>
                    {row.value || '—'}
                  </span>
                </div>
              ))}
              <div className="pt-1"><StatusBadge status={driver.status} /></div>
            </div>
          </Card>

          {/* Schedule list */}
          <Card>
            <CardHeader title="My Schedules" icon={CalendarDays} subtitle={`${allSchedules.length} schedule(s) assigned`} />
            {!allSchedules.length ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
                <CalendarDays size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500">No schedules assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allSchedules.map((schedule) => {
                  const status = scheduleStatus(schedule);
                  const isDone = status === 'completed';
                  const isSelected = selectedScheduleId === schedule._id;
                  return (
                    <button
                      key={schedule._id}
                      type="button"
                      onClick={() => setSelectedScheduleId(schedule._id)}
                      className={`w-full text-left rounded-2xl border p-3 transition-all relative overflow-hidden ${
                        isDone
                          ? 'border-emerald-100 bg-emerald-50/60 opacity-75'
                          : isSelected
                            ? 'border-red-400 bg-red-50 ring-2 ring-red-100'
                            : 'border-gray-100 bg-white hover:border-red-200 hover:bg-red-50/30'
                      }`}
                    >
                      {isDone && (
                        <span className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={9} /> DONE
                        </span>
                      )}
                      <p className="text-[10px] text-gray-400 font-mono">{schedule.scheduleCode}</p>
                      <p className={`font-bold text-sm mt-0.5 pr-12 ${isDone ? 'text-gray-500' : 'text-gray-900'}`}>{schedule.title}</p>
                      {schedule.route && (
                        <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                          <RouteIcon size={11} />
                          {schedule.route.routeNumber} · {schedule.route.name}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-[11px] text-gray-400">
                          {schedule.effectiveFrom ? formatDate(schedule.effectiveFrom) : '—'} → {schedule.effectiveTo ? formatDate(schedule.effectiveTo) : 'ongoing'}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDone ? 'bg-emerald-100 text-emerald-700' :
                          status === 'scheduled' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {isDone ? 'Completed' : status === 'scheduled' ? 'Upcoming' : 'Active'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right: Route + Stops + Map ── */}
        <div className="lg:col-span-2 space-y-5">

          {activeSchedule ? (
            <>
              {/* Schedule summary banner */}
              <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-800 p-5 text-white shadow-lg shadow-red-200">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-red-200">Selected Schedule</p>
                    <h3 className="text-xl font-black mt-1">{activeSchedule.title}</h3>
                    <p className="text-sm text-red-200 mt-0.5 font-mono">{activeSchedule.scheduleCode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-red-200 uppercase tracking-wider">Period</p>
                    <p className="text-sm font-bold mt-0.5">
                      {activeSchedule.effectiveFrom ? formatDate(activeSchedule.effectiveFrom) : '—'}
                    </p>
                    <p className="text-sm font-bold">
                      to {activeSchedule.effectiveTo ? formatDate(activeSchedule.effectiveTo) : 'Ongoing'}
                    </p>
                  </div>
                </div>

                {/* Trip times row */}
                {activeSchedule.trips?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {activeSchedule.trips.map((trip, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white/20 border border-white/30 rounded-xl px-3 py-2">
                        <Clock size={13} className="text-red-200" />
                        <span className="text-sm font-black">{trip.departureTime}</span>
                        <ArrowRight size={12} className="text-red-300" />
                        <span className="text-sm font-black">{trip.arrivalTime}</span>
                        {trip.bus && (
                          <span className="text-[11px] text-red-200 font-semibold border-l border-white/20 pl-2">
                            <Bus size={11} className="inline mr-1" />
                            {trip.bus.busNumber || trip.bus.registrationNumber}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Route Info */}
              {activeRoute ? (
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                          <RouteIcon size={16} className="text-white" />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Route</p>
                          <h4 className="font-black text-gray-900">{activeRoute.routeNumber} — {activeRoute.name}</h4>
                        </div>
                      </div>
                    </div>
                    {googleDirectionsUrl && (
                      <a href={googleDirectionsUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" icon={ExternalLink}>Open in Google Maps</Button>
                      </a>
                    )}
                  </div>

                  {/* Route stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                      <MapPin size={16} className="mx-auto text-red-500 mb-1" />
                      <p className="text-xs text-gray-500">Stops</p>
                      <p className="text-xl font-black text-gray-900">{stops.length}</p>
                    </div>
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-center">
                      <Navigation size={16} className="mx-auto text-blue-500 mb-1" />
                      <p className="text-xs text-gray-500">Distance</p>
                      <p className="text-xl font-black text-gray-900">{activeRoute.totalDistance ? `${activeRoute.totalDistance} km` : '—'}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                      <Clock size={16} className="mx-auto text-emerald-500 mb-1" />
                      <p className="text-xs text-gray-500">Duration</p>
                      <p className="text-xl font-black text-gray-900">{activeRoute.estimatedDuration ? `${activeRoute.estimatedDuration} min` : '—'}</p>
                    </div>
                  </div>

                  {/* Origin → Destination summary */}
                  <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                        <Navigation size={12} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase">From</p>
                        <p className="font-bold text-gray-900 text-sm truncate">{activeRoute.origin}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i % 2 === 0 ? 'bg-red-300' : 'bg-gray-200'}`} />
                      ))}
                      <ChevronRight size={16} className="text-red-400" />
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase">To</p>
                        <p className="font-bold text-gray-900 text-sm truncate">{activeRoute.destination}</p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <MapPin size={12} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Stop-by-stop timeline */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Stop-by-Stop Route</p>
                    <StopTimeline stops={stops} />
                  </div>
                </Card>
              ) : (
                <Card>
                  <div className="text-center py-8 text-gray-400">
                    <RouteIcon size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No route data attached to this schedule.</p>
                  </div>
                </Card>
              )}

              {/* Google Maps embed */}
              {googleEmbedUrl && (
                <Card className="overflow-hidden p-0">
                  <div className="px-4 pt-4 pb-3 flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <MapPin size={14} className="text-red-500" /> Route Map
                    </p>
                    {googleDirectionsUrl && (
                      <a href={googleDirectionsUrl} target="_blank" rel="noreferrer" className="text-xs text-red-600 font-semibold hover:underline flex items-center gap-1">
                        <ExternalLink size={12} /> Open full directions
                      </a>
                    )}
                  </div>
                  <iframe
                    title="Route map"
                    src={googleEmbedUrl}
                    className="w-full h-72 border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </Card>
              )}
            </>
          ) : (
            <Card>
              <div className="text-center py-16 text-gray-400">
                <CalendarDays size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-gray-500">No schedule selected</p>
                <p className="text-sm mt-1">Select a schedule from the list on the left to see route details and stops.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
