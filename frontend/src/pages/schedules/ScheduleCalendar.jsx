import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, ChevronLeft, ChevronRight, X, Save, Edit, Trash2, AlertTriangle, Clock, Bus, User, MapPin } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import api from '../../services/api';

const DAY_ALIASES = {
  sun: 'Sunday',
  sunday: 'Sunday',
  mon: 'Monday',
  monday: 'Monday',
  tue: 'Tuesday',
  tues: 'Tuesday',
  tuesday: 'Tuesday',
  wed: 'Wednesday',
  wednesday: 'Wednesday',
  thu: 'Thursday',
  thur: 'Thursday',
  thurs: 'Thursday',
  thursday: 'Thursday',
  fri: 'Friday',
  friday: 'Friday',
  sat: 'Saturday',
  saturday: 'Saturday',
};

const SAMPLE_SCHEDULES = [
  { _id: '1', scheduleCode: 'SC-138', title: 'Colombo - Kandy Express', status: 'active', operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], trips: [1, 2] },
  { _id: '2', scheduleCode: 'SC-071', title: 'Colombo Fort - Galle', status: 'active', operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], trips: [1] },
  { _id: '3', scheduleCode: 'SC-055', title: 'Kurunegala - Anuradhapura', status: 'active', operatingDays: ['Monday', 'Wednesday', 'Friday', 'Sunday'], trips: [1, 2] },
  { _id: '4', scheduleCode: 'SC-198', title: 'Matara - Hambantota', status: 'delayed', operatingDays: ['Tuesday', 'Thursday', 'Saturday'], trips: [1] },
  { _id: '5', scheduleCode: 'SC-210', title: 'Colombo - Jaffna Night Service', status: 'active', operatingDays: ['Wednesday', 'Saturday', 'Sunday'], trips: [1] },
  { _id: '6', scheduleCode: 'SC-044', title: 'Kandy - Nuwara Eliya', status: 'active', operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], trips: [1, 2] },
  { _id: '7', scheduleCode: 'SC-009', title: 'Negombo - Kurunegala', status: 'active', operatingDays: ['Monday', 'Thursday', 'Sunday'], trips: [1] },
];

const todayDate = () => new Date().toISOString().slice(0, 10);

/** Convert "HH:MM" to total minutes */
function toMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

/** Returns true if the two time windows [dep1,arr1] and [dep2,arr2] overlap.
 *  Handles overnight trips (arrival < departure = next-day wrap).
 *  A grace period of 15 minutes is used so back-to-back trips are allowed. */
function timesOverlap(dep1, arr1, dep2, arr2) {
  const d1 = toMinutes(dep1);
  const d2 = toMinutes(dep2);
  if (d1 === null || d2 === null) return false;

  const GRACE = 15; // minutes — allow 15-min turnover gap
  let a1 = toMinutes(arr1);
  let a2 = toMinutes(arr2);

  // If no arrival given, assume 90-min trip
  if (a1 === null) a1 = d1 + 90;
  if (a2 === null) a2 = d2 + 90;

  // Midnight wrap: if arrival is before departure it's next-day
  if (a1 <= d1) a1 += 1440;
  if (a2 <= d2) a2 += 1440;

  // Overlap: trip1 starts before trip2 ends AND trip2 starts before trip1 ends
  // with grace period subtracted from end times
  return d1 < (a2 - GRACE) && d2 < (a1 - GRACE);
}

/** Extract YYYY-MM-DD string safely regardless of how the date is stored */
function toDateStr(value) {
  if (!value) return null;
  const s = typeof value === 'string' ? value : new Date(value).toISOString();
  return s.slice(0, 10); // always "YYYY-MM-DD"
}

/** Returns true if dateStr (YYYY-MM-DD) falls within schedule's effective range.
 *  Uses pure string comparison to avoid all timezone issues. */
function scheduleCoversDate(schedule, dateStr) {
  if (!dateStr) return false;
  const day   = toDateStr(dateStr);
  const start = toDateStr(schedule.effectiveFrom);
  const end   = toDateStr(schedule.effectiveTo) || start;
  if (!start) return false;
  return day >= start && day <= end;
}

const daysUntilExpiry = (dateStr) => Math.ceil((new Date(dateStr) - Date.now()) / 86400000);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Routes loaded dynamically from API

function normalizeOperatingDays(value) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : [];

  const mapped = raw
    .map((d) => DAY_ALIASES[String(d || '').trim().toLowerCase()])
    .filter(Boolean);

  return mapped.length ? [...new Set(mapped)] : [];
}

function normalizeSchedule(schedule) {
  return {
    ...schedule,
    operatingDays: normalizeOperatingDays(schedule.operatingDays),
  };
}

const BLANK_FORM = {
  route: '',
  type: 'daily',
  effectiveFrom: todayDate(),
  effectiveTo: todayDate(),
  trips: [{ departureTime: '', arrivalTime: '', bus: '', driver: '' }],
};

export default function ScheduleCalendar() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date());
  const [schedules, setSchedules] = useState(SAMPLE_SCHEDULES);
  const [routesList, setRoutesList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [busesList, setBusesList] = useState([]);
  const [selected, setSelected] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [quickSearch, setQuickSearch] = useState('');
  const [form, setForm] = useState(BLANK_FORM);
  const [errors, setErrors] = useState({});

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const startDow = startOfMonth(month).getDay();

  useEffect(() => {
    api.get('/schedules?limit=100')
      .then((r) => {
        if (r.data?.schedules?.length) {
          setSchedules(r.data.schedules.map(normalizeSchedule));
        }
      })
      .catch(() => {});
    api.get('/routes?limit=300').then(({ data }) => setRoutesList(data?.routes || [])).catch(() => {});
    api.get('/drivers?limit=300').then(({ data }) => setDriversList(data?.drivers || [])).catch(() => {});
    api.get('/buses?limit=300').then(({ data }) => setBusesList(data?.buses || [])).catch(() => {});
  }, []);

  const getSchedulesForDay = (day) => {
    return schedules.filter((s) => {
      const dayValue = new Date(day);
      const start = s.effectiveFrom ? new Date(s.effectiveFrom) : null;
      const end = s.effectiveTo ? new Date(s.effectiveTo) : start;
      const inRange = start && end && dayValue >= new Date(start.setHours(0, 0, 0, 0)) && dayValue <= new Date(end.setHours(23, 59, 59, 999));
      if (!inRange) return false;
      if (!quickSearch.trim()) return true;
      const q = quickSearch.toLowerCase();
      return (
        String(s.scheduleCode || '').toLowerCase().includes(q)
        || String(s.title || '').toLowerCase().includes(q)
        || String(s.route || '').toLowerCase().includes(q)
      );
    });
  };

  const validate = () => {
    const e = {};
    if (!form.route) e.route = 'Route is required';
    if (!form.effectiveFrom) e.effectiveFrom = 'Schedule date is required';
    const hasValidTrip = form.trips.some((trip) => trip.departureTime && trip.arrivalTime && trip.driver);
    if (!hasValidTrip) e.trips = 'Add at least one trip with driver and times';

    // ── Driver conflict detection ──
    // For each new trip that has a driver, check all OTHER existing schedules
    // that cover the same date — if the same driver appears in a trip whose
    // time window overlaps, it is a conflict.
    const conflicts = [];
    const otherSchedules = schedules.filter((s) => s._id !== editingId);

    form.trips.forEach((newTrip, idx) => {
      if (!newTrip.driver || !newTrip.departureTime) return;

      otherSchedules.forEach((existSched) => {
        if (!scheduleCoversDate(existSched, form.effectiveFrom)) return;

        (existSched.trips || []).forEach((existTrip) => {
          const existDriverId = existTrip.driver?._id || existTrip.driver;
          if (!existDriverId || String(existDriverId) !== String(newTrip.driver)) return;

          if (timesOverlap(newTrip.departureTime, newTrip.arrivalTime, existTrip.departureTime, existTrip.arrivalTime)) {
            const driverObj = driversList.find((d) => String(d._id) === String(newTrip.driver));
            const driverName = driverObj?.name || existTrip.driver?.name || 'Driver';
            conflicts.push(
              `Trip ${idx + 1}: "${driverName}" is already scheduled on ${existSched.scheduleCode || existSched.title || 'another schedule'} at ${existTrip.departureTime}–${existTrip.arrivalTime || '?'} on ${form.effectiveFrom}.`
            );
          }
        });
      });
    });

    if (conflicts.length) e.conflicts = conflicts;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const toPayload = () => {
    const routeObj = routesList.find((r) => r._id === form.route);
    const routeName = routeObj ? `${routeObj.routeNumber} — ${routeObj.name}` : 'Schedule';
    return {
      ...form,
      title: `${routeName} — ${form.type} (${form.effectiveFrom})`,
      scheduleCode: '',
      trips: form.trips.filter((trip) => trip.departureTime && trip.arrivalTime).map((trip) => ({
        departureTime: trip.departureTime,
        arrivalTime: trip.arrivalTime,
        driver: trip.driver || undefined,
        bus: trip.bus || undefined,
      })),
    };
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = toPayload();
    try {
      const res = editingId
        ? await api.put(`/schedules/${editingId}`, payload)
        : await api.post('/schedules', payload);
      const saved = res.data?.schedule ? normalizeSchedule(res.data.schedule) : null;
      if (saved) {
        setSchedules((prev) => (
          editingId
            ? prev.map((schedule) => (schedule._id === editingId ? saved : schedule))
            : [saved, ...prev]
        ));
      }
      setShowModal(false);
      setEditingId(null);
      setForm(BLANK_FORM);
      setErrors({});
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err.response?.data?.error || 'Failed to save schedule. Please check the details and try again.',
      }));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (schedule) => {
    setEditingId(schedule._id);
    setForm({
      route: schedule.route?._id || schedule.route || '',
      type: schedule.type || 'daily',
      effectiveFrom: schedule.effectiveFrom ? schedule.effectiveFrom.slice(0, 10) : todayDate(),
      effectiveTo: schedule.effectiveTo ? schedule.effectiveTo.slice(0, 10) : (schedule.effectiveFrom ? schedule.effectiveFrom.slice(0, 10) : todayDate()),
      trips: schedule.trips?.length
        ? schedule.trips.map((trip) => ({
            departureTime: trip.departureTime || '',
            arrivalTime: trip.arrivalTime || '',
            bus: trip.bus?._id || trip.bus || '',
            driver: trip.driver?._id || trip.driver || '',
          }))
        : [{ departureTime: '', arrivalTime: '', bus: '', driver: '' }],
    });
    setErrors({});
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/schedules/${id}`);
      setSchedules((prev) => prev.filter((schedule) => schedule._id !== id));
    } catch {
      setErrors((prev) => ({
        ...prev,
        form: 'Failed to delete schedule. Please try again.',
      }));
    } finally {
      setDeletingId(null);
    }
  };

  const updateTrip = (index, key, value) => {
    setForm((prev) => ({
      ...prev,
      trips: prev.trips.map((trip, tripIndex) => (tripIndex === index ? { ...trip, [key]: value } : trip)),
    }));
  };

  const addTrip = () => {
    setForm((prev) => ({ ...prev, trips: [...prev.trips, { departureTime: '', arrivalTime: '', bus: '', driver: '' }] }));
  };

  const removeTrip = (index) => {
    setForm((prev) => ({
      ...prev,
      trips: prev.trips.filter((_, tripIndex) => tripIndex !== index),
    }));
  };

  const selectedDaySchedules = selected ? getSchedulesForDay(selected) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Schedule Calendar</h2>
          <p className="text-sm text-gray-500 mt-0.5">View and manage bus schedules</p>
        </div>
        <Button icon={Plus} onClick={() => { setEditingId(null); setShowModal(true); setForm(BLANK_FORM); setErrors({}); }}>New Schedule</Button>
      </div>

      <Card padding="p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">Smart Calendar</p>
            <p className="text-xs text-gray-500">Filter by code, title, or route to focus schedules quickly.</p>
          </div>
          <input
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Search schedule..."
            className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900 text-lg">{format(month, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={() => setMonth(subMonths(month, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => { setMonth(new Date()); setSelected(new Date()); }} className="px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">
                Today
              </button>
              <button onClick={() => setMonth(addMonths(month, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="text-xs font-bold text-gray-400 text-center py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array(startDow).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {days.map((day) => {
              const dayScheds = getSchedulesForDay(day);
              const todayFlag = isToday(day);
              const selFlag = selected && isSameDay(day, selected);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={`relative min-h-[64px] p-1.5 rounded-xl text-left transition-all duration-150 ${
                    selFlag ? 'bg-gradient-to-br from-red-500 to-red-700 shadow-md' :
                    todayFlag ? 'bg-red-50 border-2 border-red-300' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <span className={`text-xs font-bold block mb-1 ${selFlag ? 'text-white' : todayFlag ? 'text-red-600' : 'text-gray-700'}`}>
                    {format(day, 'd')}
                  </span>
                  {dayScheds.slice(0, 2).map((s, i) => (
                    <div key={i} className={`text-[9px] font-medium px-1 py-0.5 rounded mb-0.5 truncate ${selFlag ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                      {s.scheduleCode}
                    </div>
                  ))}
                  {dayScheds.length > 2 && (
                    <span className={`text-[9px] font-medium ${selFlag ? 'text-white/70' : 'text-gray-400'}`}>+{dayScheds.length - 2} more</span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Date header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Selected Day</p>
              <h3 className="text-lg font-black text-gray-900">{selected ? format(selected, 'EEEE, MMM d') : "Today"}</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-red-700">{selectedDaySchedules.length} schedule{selectedDaySchedules.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-0.5">
            {selectedDaySchedules.length ? selectedDaySchedules.map((s) => {
              const statusColor = s.status === 'active' ? 'bg-emerald-500' : s.status === 'delayed' ? 'bg-amber-500' : s.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-400';
              const trips = s.trips || [];
              const firstTrip = trips[0];
              const uniqueDrivers = [...new Map(trips.filter(t => t.driver).map(t => [t.driver._id || t.driver, t.driver])).values()];
              const uniqueBuses  = [...new Map(trips.filter(t => t.bus).map(t => [t.bus._id || t.bus, t.bus])).values()];

              return (
                <div key={s._id} className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 transition-all duration-200 overflow-hidden">
                  {/* Status accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusColor}`} />

                  <div className="pl-4 pr-3 pt-3 pb-2">
                    {/* Top row: code + type badge + status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">{s.scheduleCode || 'SCH'}</span>
                        {s.type && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 capitalize border border-indigo-100">{s.type}</span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        s.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                        s.status === 'delayed' ? 'bg-amber-50 text-amber-700' :
                        s.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>{s.status || 'active'}</span>
                    </div>

                    {/* Route / title */}
                    <p className="text-sm font-bold text-gray-900 leading-snug mb-2.5 line-clamp-2">{s.title || '—'}</p>

                    {/* Trip times */}
                    {firstTrip && (firstTrip.departureTime || firstTrip.arrivalTime) && (
                      <div className="flex items-center gap-2 mb-2.5">
                        <Clock size={11} className="text-gray-400 flex-shrink-0" />
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg">{firstTrip.departureTime || '—'}</span>
                          <span className="text-gray-300">→</span>
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg">{firstTrip.arrivalTime || '—'}</span>
                          {trips.length > 1 && <span className="text-[10px] text-gray-400">+{trips.length - 1} more</span>}
                        </div>
                      </div>
                    )}

                    {/* Drivers */}
                    {uniqueDrivers.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <User size={11} className="text-gray-400 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {uniqueDrivers.map((driver) => (
                            <button
                              key={driver._id || driver}
                              onClick={() => navigate(`/drivers/${driver._id || driver}`)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100 transition-colors"
                            >
                              <span className="w-3.5 h-3.5 rounded-full bg-blue-200 text-blue-800 text-[8px] font-black flex items-center justify-center">
                                {(driver.name || 'D')[0]}
                              </span>
                              {driver.name || driver}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Buses */}
                    {uniqueBuses.length > 0 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bus size={11} className="text-gray-400 flex-shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {uniqueBuses.map((bus) => (
                            <span key={bus._id || bus} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold">
                              {bus.busNumber || bus.registrationNumber || bus}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400 font-medium">{trips.length} trip{trips.length !== 1 ? 's' : ''}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(s)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 text-[11px] font-bold hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                      >
                        <Edit size={11} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(s._id)}
                        disabled={deletingId === s._id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 text-[11px] font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={11} /> {deletingId === s._id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Calendar size={22} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-400">No schedules</p>
                <p className="text-xs text-gray-300 mt-0.5">Nothing scheduled for this day</p>
                <button onClick={() => { setEditingId(null); setForm(BLANK_FORM); setShowModal(true); }}
                  className="mt-3 text-xs text-red-500 font-bold hover:text-red-700 flex items-center gap-1 mx-auto">
                  <Plus size={12} /> Add schedule
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Schedule Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              <div className={`${editingId ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-red-500 to-red-700'} px-6 py-5 flex items-center justify-between`}>
                <div>
                  <h2 className="text-lg font-black text-white">{editingId ? 'Edit Schedule' : 'New Schedule'}</h2>
                  <p className={`text-xs ${editingId ? 'text-amber-100' : 'text-red-100'}`}>{editingId ? 'Update schedule details' : 'Add a new bus schedule'}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Route *</label>
                  <select value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 bg-white ${errors.route ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
                    <option value="">Select route...</option>
                    {routesList.length ? routesList.map((r) => <option key={r._id} value={r._id}>{r.routeNumber} - {r.name}</option>) : <option disabled>Loading routes...</option>}
                  </select>
                  {errors.route && <p className="text-xs text-red-500 mt-1">{errors.route}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Schedule Type</label>
                    <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="special">Special</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Schedule Date *</label>
                    <input type="date" value={form.effectiveFrom} onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" />
                    {errors.effectiveFrom && <p className="text-xs text-red-500 mt-1">{errors.effectiveFrom}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">End Date</label>
                  <input type="date" value={form.effectiveTo} onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" />
                  <p className="text-[11px] text-gray-400 mt-1">Use the same date for a one-day schedule.</p>
                </div>

                {errors.form && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{errors.form}</p>}

                {/* Driver conflict warnings */}
                {errors.conflicts?.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
                      <p className="text-xs font-black text-red-700">Driver Conflict Detected — Cannot Save</p>
                    </div>
                    {errors.conflicts.map((msg, i) => (
                      <p key={i} className="text-xs text-red-700 pl-5 leading-snug">• {msg}</p>
                    ))}
                    <p className="text-[11px] text-red-500 pl-5 mt-1">A driver cannot be assigned to two schedules at the same time. Please choose a different driver or adjust the trip times.</p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700">Trips, Drivers & Buses *</label>
                    <Button type="button" size="sm" variant="secondary" onClick={addTrip}>Add Trip</Button>
                  </div>
                  <div className="space-y-3">
                    {form.trips.map((trip, index) => {
                      const selectedDriver = trip.driver ? driversList.find((d) => String(d._id) === String(trip.driver)) : null;
                      const driverDaysLeft = selectedDriver?.licenseExpiry ? daysUntilExpiry(selectedDriver.licenseExpiry) : null;
                      const licenseExpired = driverDaysLeft !== null && driverDaysLeft < 0;
                      const licenseExpiring = driverDaysLeft !== null && driverDaysLeft >= 0 && driverDaysLeft <= 30;

                      // Live conflict check for this trip
                      const driverConflict = trip.driver && trip.departureTime
                        ? schedules.filter(s => s._id !== editingId && scheduleCoversDate(s, form.effectiveFrom))
                            .flatMap(s => (s.trips || []).map(t => ({ sched: s, trip: t })))
                            .find(({ trip: t }) => {
                              const eid = t.driver?._id || t.driver;
                              return eid && String(eid) === String(trip.driver) &&
                                timesOverlap(trip.departureTime, trip.arrivalTime, t.departureTime, t.arrivalTime);
                            })
                        : null;

                      return (
                        <div key={`trip-${index}`} className="rounded-2xl border border-gray-200 p-3 bg-gray-50 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1.5">Departure</label>
                              <input type="time" value={trip.departureTime} onChange={(e) => updateTrip(index, 'departureTime', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1.5">Arrival</label>
                              <input type="time" value={trip.arrivalTime} onChange={(e) => updateTrip(index, 'arrivalTime', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1.5">Driver</label>
                              <select
                                value={trip.driver}
                                onChange={(e) => updateTrip(index, 'driver', e.target.value)}
                                className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white ${licenseExpired || driverConflict ? 'border-red-400 bg-red-50' : licenseExpiring ? 'border-amber-400 bg-amber-50' : 'border-gray-200'}`}
                              >
                                <option value="">Select driver...</option>
                                {driversList.filter((d) => d.status === 'active').map((driver) => {
                                  const days = driver.licenseExpiry ? daysUntilExpiry(driver.licenseExpiry) : null;
                                  const expired = days !== null && days < 0;
                                  const expiring = days !== null && days >= 0 && days <= 30;
                                  // Check if this driver is busy at the current trip's time on this date
                                  const busy = trip.departureTime
                                    ? schedules.filter(s => s._id !== editingId && scheduleCoversDate(s, form.effectiveFrom))
                                        .flatMap(s => (s.trips || []).map(t => ({ s, t })))
                                        .some(({ t }) => {
                                          const eid = t.driver?._id || t.driver;
                                          return eid && String(eid) === String(driver._id) &&
                                            timesOverlap(trip.departureTime, trip.arrivalTime, t.departureTime, t.arrivalTime);
                                        })
                                    : false;
                                  const suffix = expired ? '  ⚠ License EXPIRED'
                                    : busy ? '  🚫 Already scheduled'
                                    : expiring ? `  ⚠ Expires in ${days}d`
                                    : '';
                                  return (
                                    <option key={driver._id} value={driver._id} disabled={expired || busy}>
                                      {driver.name} ({driver.employeeId}){suffix}
                                    </option>
                                  );
                                })}
                              </select>
                              {licenseExpired && selectedDriver && (
                                <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                                  <AlertTriangle size={12} className="text-red-600 flex-shrink-0" />
                                  <p className="text-[11px] text-red-700 font-semibold">
                                    License EXPIRED — {formatDate(selectedDriver.licenseExpiry)}. Cannot assign this driver.
                                  </p>
                                </div>
                              )}
                              {licenseExpiring && selectedDriver && (
                                <div className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                                  <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
                                  <p className="text-[11px] text-amber-800 font-semibold">
                                    License expires in <strong>{driverDaysLeft}d</strong> ({formatDate(selectedDriver.licenseExpiry)}).
                                  </p>
                                </div>
                              )}
                              {driverConflict && (
                                <div className="mt-1.5 flex items-start gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-300 rounded-lg">
                                  <AlertTriangle size={12} className="text-red-600 flex-shrink-0 mt-0.5" />
                                  <p className="text-[11px] text-red-700 font-semibold leading-snug">
                                    <strong>{selectedDriver?.name}</strong> is already assigned to <strong>{driverConflict.sched.scheduleCode || driverConflict.sched.title}</strong> at {driverConflict.trip.departureTime}–{driverConflict.trip.arrivalTime || '?'} on this date. Choose a different driver.
                                  </p>
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-gray-700 mb-1.5">Bus</label>
                              <select value={trip.bus} onChange={(e) => updateTrip(index, 'bus', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                                <option value="">Select bus...</option>
                                {busesList.map((bus) => <option key={bus._id} value={bus._id}>{bus.busNumber || bus.registrationNumber}</option>)}
                              </select>
                            </div>
                          </div>
                          {form.trips.length > 1 && <div className="flex justify-end"><Button type="button" size="sm" variant="ghost" onClick={() => removeTrip(index)}>Remove Trip</Button></div>}
                        </div>
                      );
                    })}
                  </div>
                  {errors.trips && <p className="text-xs text-red-500 mt-1">{errors.trips}</p>}
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} loading={saving} icon={Save}>{editingId ? 'Save Changes' : 'Create Schedule'}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


