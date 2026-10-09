import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Bus, Edit, Trash2, TrendingUp, Users, Palette, FileText, CalendarDays, Plus, X } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import Loading from '../../components/ui/Loading';
import Modal from '../../components/ui/Modal';
import NotFoundCard from '../../components/ui/NotFoundCard';
import RouteMap from '../../components/routes/RouteMap';
import { Textarea } from '../../components/ui/Input';
import api from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function RouteDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busOptions, setBusOptions] = useState([]);
  const [driverOptions, setDriverOptions] = useState([]);
  const [editForm, setEditForm] = useState({
    routeNumber: '',
    name: '',
    origin: '',
    destination: '',
    depot: '',
    type: 'local',
    totalDistance: '',
    estimatedDuration: '',
    fareBase: '',
    farePerKm: '',
    status: 'active',
    color: '#4F9CF9',
    notes: '',
    operatingDays: [],
    assignedBuses: [],
    assignedDrivers: [],
    peakHours: [{ start: '', end: '' }],
  });

  const normalizeRoute = (doc) => {
    if (!doc) return null;
    const normalizedStops = Array.isArray(doc.stops) ? doc.stops : [];
    const fareValue = typeof doc.fare === 'number'
      ? doc.fare
      : typeof doc.fare?.base === 'number'
        ? doc.fare.base
        : '';
    const farePerKm = typeof doc.fare?.perKm === 'number' ? doc.fare.perKm : '';

    const operatingDays = Array.isArray(doc.operatingDays)
      ? doc.operatingDays
      : doc.operatingDays && typeof doc.operatingDays === 'object'
        ? Object.entries(doc.operatingDays)
            .filter(([, enabled]) => Boolean(enabled))
            .map(([day]) => day)
        : [];

    return {
      ...doc,
      stops: normalizedStops,
      fare: fareValue,
      farePerKm,
      operatingDays,
      peakHours: Array.isArray(doc.peakHours) && doc.peakHours.length ? doc.peakHours : [],
    };
  };

  useEffect(() => {
    Promise.all([
      api.get(`/routes/${id}`),
      api.get('/buses?limit=300'),
      api.get('/drivers?limit=300'),
    ])
      .then(([routeRes, busRes, driverRes]) => {
        setRoute(normalizeRoute(routeRes.data.route || routeRes.data));
        setBusOptions(busRes.data?.buses || []);
        setDriverOptions(driverRes.data?.drivers || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (route && new URLSearchParams(location.search).get('edit') === '1') {
      openEditModal();
      navigate(`/routes/${id}`, { replace: true });
    }
  }, [route, location.search, navigate, id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/routes/${id}`);
      navigate('/routes');
    } catch { setDeleting(false); }
  };

  const openEditModal = () => {
    setEditForm({
      routeNumber: route.routeNumber || '',
      name: route.name || '',
      origin: route.origin || '',
      destination: route.destination || '',
      depot: route.depot || '',
      type: route.type || 'local',
      totalDistance: route.totalDistance || '',
      estimatedDuration: route.estimatedDuration || '',
      fareBase: route.fare ?? '',
      farePerKm: route.farePerKm ?? '',
      status: route.status || 'active',
      color: route.color || '#4F9CF9',
      notes: route.notes || '',
      operatingDays: route.operatingDays || [],
      assignedBuses: (route.assignedBuses || []).map((bus) => (typeof bus === 'object' ? bus._id : bus)),
      assignedDrivers: (route.assignedDrivers || []).map((driver) => (typeof driver === 'object' ? driver._id : driver)),
      peakHours: route.peakHours?.length ? route.peakHours.map((slot) => ({ start: slot.start || '', end: slot.end || '' })) : [{ start: '', end: '' }],
    });
    setEditModal(true);
  };

  const handleEditSave = async () => {
    setSavingEdit(true);
    try {
      const payload = {
        routeNumber: editForm.routeNumber,
        name: editForm.name,
        origin: editForm.origin,
        destination: editForm.destination,
        depot: editForm.depot,
        type: editForm.type,
        totalDistance: editForm.totalDistance ? Number(editForm.totalDistance) : 0,
        estimatedDuration: editForm.estimatedDuration ? Number(editForm.estimatedDuration) : 0,
        fare: {
          base: editForm.fareBase ? Number(editForm.fareBase) : 0,
          perKm: editForm.farePerKm ? Number(editForm.farePerKm) : 0,
        },
        status: editForm.status,
        color: editForm.color,
        notes: editForm.notes,
        operatingDays: DAYS.reduce((acc, day) => {
          acc[day.toLowerCase()] = editForm.operatingDays.includes(day);
          return acc;
        }, {}),
        assignedBuses: editForm.assignedBuses,
        assignedDrivers: editForm.assignedDrivers,
        peakHours: editForm.peakHours.filter((slot) => slot.start && slot.end),
      };

      const { data } = await api.put(`/routes/${id}`, payload);
      if (data?.route) {
        setRoute(normalizeRoute(data.route));
      }
    } catch {
      // fallback for demo mode
    } finally {
      setRoute((prev) => normalizeRoute({
        ...prev,
        ...editForm,
        fare: editForm.fareBase,
        farePerKm: editForm.farePerKm,
      }));
      setSavingEdit(false);
      setEditModal(false);
    }
  };

  const toggleDay = (day) => {
    setEditForm((prev) => ({
      ...prev,
      operatingDays: prev.operatingDays.includes(day)
        ? prev.operatingDays.filter((item) => item !== day)
        : [...prev.operatingDays, day],
    }));
  };

  const toggleAssignment = (key, value) => {
    setEditForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }));
  };

  const updatePeakHour = (index, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      peakHours: prev.peakHours.map((slot, slotIndex) => (slotIndex === index ? { ...slot, [field]: value } : slot)),
    }));
  };

  const addPeakHour = () => {
    setEditForm((prev) => ({ ...prev, peakHours: [...prev.peakHours, { start: '', end: '' }] }));
  };

  const removePeakHour = (index) => {
    setEditForm((prev) => ({
      ...prev,
      peakHours: prev.peakHours.filter((_, slotIndex) => slotIndex !== index),
    }));
  };

  if (loading) return <Loading size="lg" text="Loading route..." />;
  if (!route) return <div className="text-center py-20 text-gray-400">Route not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/routes')} size="sm">Back</Button>
          <div>
            <h2 className="text-2xl font-black text-gray-900">{route.routeNumber} — {route.name}</h2>
            <p className="text-sm text-gray-500">{route.origin} → {route.destination}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Edit} size="sm" onClick={openEditModal}>Edit</Button>
          <Button variant="danger" icon={Trash2} size="sm" onClick={() => setDeleteModal(true)}>Delete</Button>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Route Number', value: route.routeNumber || '—' },
            { label: 'Status', value: <StatusBadge status={route.status} /> },
            { label: 'Type', value: <span className="capitalize font-medium text-gray-800">{route.type?.replace(/_/g, ' ')}</span> },
            { label: 'Distance', value: route.totalDistance ? `${route.totalDistance} km` : '—' },
            { label: 'Duration', value: route.estimatedDuration ? `${route.estimatedDuration} min` : '—' },
            { label: 'Fare', value: route.fare !== '' && route.fare !== null && route.fare !== undefined ? `LKR ${route.fare}` : '—' },
            { label: 'Depot', value: route.depot || '—' },
            { label: 'Fare / km', value: route.farePerKm !== '' && route.farePerKm !== null && route.farePerKm !== undefined ? `LKR ${route.farePerKm}` : '—' },
            { label: 'Created By', value: route.createdBy?.name || '—' },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-2xl p-3.5">
              <p className="text-xs font-medium text-gray-400 mb-1">{item.label}</p>
              <div className="text-sm">{item.value}</div>
            </div>
          ))}
          <div className="bg-gray-50 rounded-2xl p-3.5">
            <p className="text-xs font-medium text-gray-400 mb-2">Operating Days</p>
            <div className="flex flex-wrap gap-1.5">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                const active = route.operatingDays?.some((d) => d.toLowerCase().startsWith(day.toLowerCase().slice(0, 3)));
                return (
                  <span key={day} className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${active ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{day}</span>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Peak Hours" icon={Clock} subtitle="High-demand service windows" />
          {!route.peakHours?.length ? (
            <p className="text-sm text-gray-400">No peak hours defined for this route.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {route.peakHours.map((slot, index) => (
                <div key={`${slot.start}-${slot.end}-${index}`} className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
                  {slot.start} - {slot.end}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Route Notes" icon={FileText} subtitle="Operational guidance and instructions" />
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: route.color || '#4F9CF9' }} />
              <span className="text-sm text-gray-600">Route Color: <span className="font-semibold text-gray-900">{route.color || '—'}</span></span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{route.notes || 'No notes added for this route.'}</p>
          </div>
        </Card>
      </div>

      {/* Performance Metrics */}
      {(route.onTimePerformance !== undefined || route.totalTripsCompleted !== undefined || route.avgPassengersPerTrip !== undefined) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'On-Time Performance', value: route.onTimePerformance !== undefined ? `${Math.round(route.onTimePerformance)}%` : '—', icon: TrendingUp, color: 'from-green-400 to-emerald-600' },
            { label: 'Trips Completed', value: route.totalTripsCompleted || 0, icon: Bus, color: 'from-blue-400 to-indigo-500' },
            { label: 'Avg Passengers/Trip', value: route.avgPassengersPerTrip ? Math.round(route.avgPassengersPerTrip) : '—', icon: Users, color: 'from-purple-400 to-indigo-500' },
          ].map((m) => (
            <Card key={m.label} padding="p-4" className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center flex-shrink-0`}>
                <m.icon size={16} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400">{m.label}</p>
                <p className="text-base font-black text-gray-900">{m.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Assigned Buses */}
      {route.assignedBuses?.length > 0 && (
        <Card>
          <CardHeader title="Assigned Buses" icon={Bus} />
          <div className="flex flex-wrap gap-2">
            {route.assignedBuses.map((bus) => (
              <button
                key={typeof bus === 'object' ? bus._id : bus}
                onClick={() => navigate(`/buses/${typeof bus === 'object' ? bus._id : bus}`)}
                className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
              >
                {typeof bus === 'object' ? (bus.busNumber || bus.registrationNumber) : bus}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Assigned Drivers */}
      {route.assignedDrivers?.length > 0 && (
        <Card>
          <CardHeader title="Assigned Drivers" icon={Users} />
          <div className="flex flex-wrap gap-2">
            {route.assignedDrivers.map((driver) => (
              <button
                key={typeof driver === 'object' ? driver._id : driver}
                onClick={() => navigate(`/drivers/${typeof driver === 'object' ? driver._id : driver}`)}
                className="bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-colors"
              >
                {typeof driver === 'object' ? `${driver.name} (${driver.employeeId})` : driver}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Route Map" icon={MapPin} subtitle="Visual path from stop coordinates" />
        <RouteMap stops={route.stops || []} height={360} />
      </Card>

      {/* Stops */}
      <Card>
        <CardHeader title={`Stops (${route.stops?.length || 0})`} icon={MapPin} />
        {!route.stops?.length ? (
          <p className="text-sm text-gray-400">No stops defined for this route.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gray-200" />
            <div className="space-y-3">
              {[...route.stops].sort((a, b) => (a.order || 0) - (b.order || 0)).map((stop, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 shadow-sm ${i === 0 || i === route.stops.length - 1 ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-white border-2 border-primary-200'}`}>
                    {i === 0 || i === route.stops.length - 1 ? (
                      <MapPin size={16} className="text-white" />
                    ) : (
                      <span className="text-xs font-bold text-primary-400">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-2xl p-3 min-h-[44px]">
                    <p className="font-semibold text-gray-900 text-sm">{stop.name}</p>
                    <div className="flex gap-4 mt-0.5">
                      {stop.distanceFromPrev > 0 && <span className="text-xs text-gray-400">{stop.distanceFromPrev} km from prev</span>}
                      {stop.timeFromPrev > 0 && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{stop.timeFromPrev} min</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Delete Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title={`Edit Route ${route.routeNumber}`} subtitle="Update route details" icon={Edit} isEdit
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button loading={savingEdit} onClick={handleEditSave}>Save Changes</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Route Number</label>
            <input className="input w-full" value={editForm.routeNumber} onChange={(e) => setEditForm((p) => ({ ...p, routeNumber: e.target.value.toUpperCase() }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Route Name</label>
            <input className="input w-full" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Origin</label>
            <input className="input w-full" value={editForm.origin} onChange={(e) => setEditForm((p) => ({ ...p, origin: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Destination</label>
            <input className="input w-full" value={editForm.destination} onChange={(e) => setEditForm((p) => ({ ...p, destination: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Depot</label>
            <input className="input w-full" value={editForm.depot} onChange={(e) => setEditForm((p) => ({ ...p, depot: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
            <select className="input w-full" value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}>
              <option value="local">Local</option>
              <option value="express">Express</option>
              <option value="inter_city">Inter City</option>
              <option value="rural">Rural</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select className="input w-full" value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="under_review">Under Review</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Distance (km)</label>
            <input type="number" className="input w-full" value={editForm.totalDistance} onChange={(e) => setEditForm((p) => ({ ...p, totalDistance: Number(e.target.value) || '' }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Duration (min)</label>
            <input type="number" className="input w-full" value={editForm.estimatedDuration} onChange={(e) => setEditForm((p) => ({ ...p, estimatedDuration: Number(e.target.value) || '' }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fare Base (LKR)</label>
            <input type="number" className="input w-full" value={editForm.fareBase} onChange={(e) => setEditForm((p) => ({ ...p, fareBase: Number(e.target.value) || '' }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fare per Km (LKR)</label>
            <input type="number" className="input w-full" value={editForm.farePerKm} onChange={(e) => setEditForm((p) => ({ ...p, farePerKm: Number(e.target.value) || '' }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Route Color</label>
            <div className="flex items-center gap-3">
              <input type="color" className="h-11 w-16 rounded-xl border border-gray-200 bg-white p-1" value={editForm.color} onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))} />
              <div className="text-sm text-gray-500">Use this color for dashboards and map identity.</div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Operating Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${editForm.operatingDays.includes(day) ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Assigned Buses</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-2xl border border-gray-100 p-3 bg-gray-50">
              {busOptions.map((bus) => (
                <label key={bus._id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editForm.assignedBuses.includes(bus._id)} onChange={() => toggleAssignment('assignedBuses', bus._id)} className="accent-red-600" />
                  <span>{bus.busNumber || bus.registrationNumber}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Assigned Drivers</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto rounded-2xl border border-gray-100 p-3 bg-gray-50">
              {driverOptions.map((driver) => (
                <label key={driver._id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={editForm.assignedDrivers.includes(driver._id)} onChange={() => toggleAssignment('assignedDrivers', driver._id)} className="accent-red-600" />
                  <span>{driver.name} ({driver.employeeId})</span>
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-600" />
                <label className="text-xs font-bold text-gray-700">Peak Hours</label>
                <span className="text-[10px] text-gray-400 font-medium">High-demand time windows</span>
              </div>
              <button type="button" onClick={addPeakHour}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                <Plus size={12} /> Add Peak Hour
              </button>
            </div>

            {editForm.peakHours.length === 0 ? (
              <div className="py-5 text-center border-2 border-dashed border-gray-200 rounded-2xl">
                <Clock size={22} className="text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400 font-medium">No peak hours defined</p>
                <p className="text-[11px] text-gray-300 mt-0.5">Click "Add Peak Hour" to define busy windows</p>
              </div>
            ) : (
              <div className="space-y-2">
                {editForm.peakHours.map((slot, index) => {
                  const label = index === 0 ? 'Morning Peak' : index === 1 ? 'Evening Peak' : `Period ${index + 1}`;
                  const hasError = slot.start && slot.end && slot.start >= slot.end;
                  return (
                    <div key={`peak-${index}`} className={`flex items-end gap-3 p-3 rounded-2xl border ${hasError ? 'bg-red-50 border-red-200' : 'bg-amber-50/60 border-amber-100'}`}>
                      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
                        <Clock size={14} />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-amber-700 mb-1.5">{label}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">Start Time</label>
                            <input type="time" value={slot.start}
                              onChange={(e) => updatePeakHour(index, 'start', e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-300 bg-white font-semibold text-gray-800" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-500 mb-1">End Time</label>
                            <input type="time" value={slot.end}
                              onChange={(e) => updatePeakHour(index, 'end', e.target.value)}
                              className={`w-full px-3 py-2 text-sm border rounded-xl outline-none focus:ring-2 focus:ring-amber-300 bg-white font-semibold text-gray-800 ${hasError ? 'border-red-400' : 'border-amber-200'}`} />
                          </div>
                        </div>
                        {hasError && <p className="text-[10px] text-red-600 font-semibold mt-1">End time must be after start time</p>}
                        {slot.start && slot.end && !hasError && (
                          <p className="text-[10px] text-amber-600 font-semibold mt-1">
                            {slot.start} — {slot.end}
                            {' · '}
                            {(() => {
                              const [sh, sm] = slot.start.split(':').map(Number);
                              const [eh, em] = slot.end.split(':').map(Number);
                              const mins = (eh * 60 + em) - (sh * 60 + sm);
                              return `${Math.floor(mins / 60)}h ${mins % 60}m`;
                            })()}
                          </p>
                        )}
                      </div>
                      <button type="button" onClick={() => removePeakHour(index)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="sm:col-span-2">
            <Textarea label="Route Notes" rows={4} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Route" subtitle="This action cannot be undone" icon={Trash2}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete Route</Button>
          </>
        }
      >
        <p className="text-gray-600">Are you sure you want to delete route <strong>{route.routeNumber} — {route.name}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
