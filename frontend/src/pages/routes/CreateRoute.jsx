import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Map, Save, Bus, Users, Gauge, Route as RouteIcon, ChevronUp, ChevronDown, MapPin, Clock, Navigation } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import RouteMap from '../../components/routes/RouteMap';
import { PROVINCES } from '../../utils/depots';
import api from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SL_TOWNS = [
  'Colombo Fort','Pettah','Maradana','Borella','Kirulapone','Nugegoda','Maharagama','Homagama','Avissawella',
  'Panadura','Moratuwa','Ratmalana','Dehiwala','Mount Lavinia','Piliyandala','Kesbewa','Battaramulla',
  'Kaduwela','Malabe','Sri Jayawardenepura','Ja-Ela','Wattala','Ragama','Kiribathgoda','Kadawatha',
  'Gampaha','Nittambuwa','Veyangoda','Mirigama','Negombo','Katunayake','Minuwangoda',
  'Kandy','Peradeniya','Katugastota','Gampola','Nawalapitiya','Pilimathalawa','Uda Eriyagama',
  'Matale','Dambulla','Sigiriya','Habarana','Polonnaruwa','Kaduruwela',
  'Nuwara Eliya','Hatton','Talawakele','Ginigathena','Norwood','Ragala',
  'Badulla','Bandarawela','Haputale','Ella','Wellawaya','Monaragala',
  'Ratnapura','Balangoda','Embilipitiya','Pelmadulla','Kegalle','Mawanella','Alawwa',
  'Galle','Hikkaduwa','Ambalangoda','Bentota','Kalutara','Aluthgama','Beruwala',
  'Matara','Weligama','Mirissa','Tangalle','Beliatta','Ambalantota','Hambantota',
  'Tissamaharama','Kataragama','Wellawaya',
  'Kurunegala','Kuliyapitiya','Chilaw','Puttalam','Wariyapola','Nikaweratiya',
  'Anuradhapura','Mihintale','Medawachchiya','Kekirawa','Tambuttegama','Nochchiyagama',
  'Vavuniya','Mannar','Kilinochchi','Mullaitivu',
  'Jaffna','Chavakachcheri','Point Pedro','Nallur',
  'Trincomalee','Kinniya','Mutur',
  'Batticaloa','Kalmunai','Ampara','Akkaraipattu',
];

export default function CreateRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [error, setError] = useState('');
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    routeNumber: '',
    name: '',
    origin: '',
    destination: '',
    depot: '',
    type: 'local',
    status: 'active',
    totalDistance: '',
    estimatedDuration: '',
    fare: '',
    operatingDays: [],
    stops: [],
    assignedBuses: [],
    assignedDrivers: [],
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleDay = (day) => {
    set('operatingDays', form.operatingDays.includes(day)
      ? form.operatingDays.filter((d) => d !== day)
      : [...form.operatingDays, day]
    );
  };

  const addStop = () => {
    set('stops', [...form.stops, { name: '', order: form.stops.length + 1, distanceFromPrev: '', timeFromPrev: '', landmark: '', lat: '', lng: '' }]);
  };

  const updateStop = (i, key, val) => {
    const stops = [...form.stops];
    stops[i] = { ...stops[i], [key]: val };
    set('stops', stops);
  };

  const removeStop = (i) => {
    set('stops', form.stops.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const moveStop = (i, dir) => {
    const stops = [...form.stops];
    const target = i + dir;
    if (target < 0 || target >= stops.length) return;
    [stops[i], stops[target]] = [stops[target], stops[i]];
    set('stops', stops.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const totalStopTime = form.stops.reduce((s, st) => s + (Number(st.timeFromPrev) || 0), 0);
  const totalStopDist = form.stops.reduce((s, st) => s + (Number(st.distanceFromPrev) || 0), 0);

  useEffect(() => {
    let mounted = true;

    const loadAssets = async () => {
      setAssetsLoading(true);
      try {
        const [busRes, driverRes] = await Promise.all([
          api.get('/buses?limit=300'),
          api.get('/drivers?limit=300'),
        ]);
        if (!mounted) return;
        setBuses(busRes.data?.buses || []);
        setDrivers(driverRes.data?.drivers || []);
      } catch {
        if (!mounted) return;
        setError('Could not load buses and drivers for assignment. You can still create the route.');
      } finally {
        if (mounted) setAssetsLoading(false);
      }
    };

    loadAssets();
    return () => { mounted = false; };
  }, []);

  const busRecommendations = useMemo(() => {
    const eligible = buses.filter((bus) => ['active', 'idle'].includes(bus.status));
    return eligible
      .map((bus) => {
        let score = 0;
        if (bus.status === 'active') score += 2;
        if (form.type === 'express' || form.type === 'inter_city') {
          if ((bus.capacity || 0) >= 50) score += 3;
          else score += 1;
        } else if ((bus.capacity || 0) >= 40) {
          score += 2;
        }
        return { ...bus, score };
      })
      .sort((a, b) => b.score - a.score || (b.capacity || 0) - (a.capacity || 0));
  }, [buses, form.type]);

  const driverRecommendations = useMemo(() => {
    return drivers
      .filter((driver) => driver.status === 'active' && !driver.assignedRoute)
      .sort((a, b) => {
        const ratingA = typeof a.rating === 'number' ? a.rating : 0;
        const ratingB = typeof b.rating === 'number' ? b.rating : 0;
        return ratingB - ratingA;
      });
  }, [drivers]);

  const toggleBusAssignment = (busId) => {
    set('assignedBuses', form.assignedBuses.includes(busId)
      ? form.assignedBuses.filter((id) => id !== busId)
      : [...form.assignedBuses, busId]);
  };

  const toggleDriverAssignment = (driverId) => {
    set('assignedDrivers', form.assignedDrivers.includes(driverId)
      ? form.assignedDrivers.filter((id) => id !== driverId)
      : [...form.assignedDrivers, driverId]);
  };

  const selectedBusCapacity = form.assignedBuses.reduce((sum, id) => {
    const match = buses.find((bus) => bus._id === id);
    return sum + (match?.capacity || 0);
  }, 0);

  const operatingDaysPayload = DAYS.reduce((acc, day) => {
    acc[day.toLowerCase()] = form.operatingDays.includes(day);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        operatingDays: operatingDaysPayload,
        totalDistance: form.totalDistance ? Number(form.totalDistance) : undefined,
        estimatedDuration: form.estimatedDuration ? Number(form.estimatedDuration) : undefined,
        fare: form.fare ? { base: Number(form.fare), perKm: 0 } : undefined,
        stops: form.stops
          .filter((s) => s.name && s.name.trim() !== '')
          .map((s, idx) => ({
            name: s.name.trim(),
            order: idx + 1,
            distanceFromPrev: s.distanceFromPrev ? Number(s.distanceFromPrev) : 0,
            timeFromPrev: s.timeFromPrev ? Number(s.timeFromPrev) : 0,
            landmark: s.landmark || undefined,
            lat: s.lat ? Number(s.lat) : undefined,
            lng: s.lng ? Number(s.lng) : undefined,
          })),
      };
      await api.post('/routes', payload);
      navigate('/routes');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create route. Please check the details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/routes')} size="sm">Back</Button>
        <div>
          <h2 className="text-3xl font-black text-gray-900">Route Planning Studio</h2>
          <p className="text-sm text-gray-500 mt-0.5">Design route paths, assign fleet and drivers, then publish operations-ready plans.</p>
        </div>
      </div>

      <Card className="overflow-hidden p-0 border-red-100">
        <div className="bg-gradient-to-r from-red-700 via-rose-600 to-red-500 p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="uppercase text-[11px] tracking-[0.18em] font-bold text-white/80">Planning Overview</p>
              <h3 className="text-2xl font-black mt-1">Build Intelligent Route Plans</h3>
              <p className="text-sm text-white/90 mt-1">Use availability, capacity targets, and service type to assign resources with clarity.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/15 rounded-xl px-3 py-2 text-center min-w-[90px]">
                <p className="text-[11px] text-white/70">Stops</p>
                <p className="text-lg font-black">{form.stops.length}</p>
              </div>
              <div className="bg-white/15 rounded-xl px-3 py-2 text-center min-w-[90px]">
                <p className="text-[11px] text-white/70">Buses</p>
                <p className="text-lg font-black">{form.assignedBuses.length}</p>
              </div>
              <div className="bg-white/15 rounded-xl px-3 py-2 text-center min-w-[90px]">
                <p className="text-[11px] text-white/70">Drivers</p>
                <p className="text-lg font-black">{form.assignedDrivers.length}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <Card>
          <CardHeader title="Route Details" icon={Map} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Route Number" required value={form.routeNumber} onChange={(e) => set('routeNumber', e.target.value)} placeholder="e.g. 138" />
            <Input label="Route Name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Colombo - Kandy" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Depot <span className="text-red-500">*</span></label>
              <select value={form.depot} onChange={(e) => set('depot', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 bg-white">
                <option value="">Select depot...</option>
                {PROVINCES.map((province) => (
                  <optgroup key={province.name} label={province.name}>
                    {province.depots.map((depot) => (
                      <option key={depot} value={depot}>{depot}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <Input label="Origin" required value={form.origin} onChange={(e) => set('origin', e.target.value)} placeholder="Starting point" />
            <Input label="Destination" required value={form.destination} onChange={(e) => set('destination', e.target.value)} placeholder="End point" />
            <Select label="Type" value={form.type} onChange={(e) => set('type', e.target.value)} options={[
              { value: 'local', label: 'Local' },
              { value: 'express', label: 'Express' },
              { value: 'inter_city', label: 'Inter City' },
              { value: 'rural', label: 'Rural' },
            ]} />
            <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)} options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]} />
            <Input label="Total Distance (km)" type="number" value={form.totalDistance} onChange={(e) => set('totalDistance', e.target.value)} placeholder="e.g. 115" />
            <Input label="Estimated Duration (min)" type="number" value={form.estimatedDuration} onChange={(e) => set('estimatedDuration', e.target.value)} placeholder="e.g. 180" />
            <Input label="Fare (LKR)" type="number" value={form.fare} onChange={(e) => set('fare', e.target.value)} placeholder="e.g. 250" />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Operating Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    form.operatingDays.includes(day)
                   ? 'bg-gradient-to-r from-red-500 to-red-700 text-white border-transparent shadow-sm'
                     : 'bg-white border-gray-200 text-gray-600 hover:border-primary-400'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
            </Card>

            <Card>
              <CardHeader title="Visual Route Map" icon={RouteIcon} subtitle="Map updates when stop coordinates are filled." />
              <RouteMap stops={form.stops} height={340} title="route preview" />
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                <Badge variant="info">Map Source: OpenStreetMap</Badge>
                <Badge variant="warning">Tip: use lat/lng for each stop to draw the path</Badge>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Assignment Summary" icon={Gauge} />
              <div className="rounded-2xl bg-red-50 border border-red-100 p-3">
                <p className="text-xs font-semibold text-red-700">Total Assigned Capacity</p>
                <p className="text-2xl font-black text-red-800 mt-0.5">{selectedBusCapacity} seats</p>
                <p className="text-xs text-gray-500 mt-1">{form.assignedBuses.length} bus(es) · {form.assignedDrivers.length} driver(s) selected</p>
              </div>
            </Card>

            <Card>
              <CardHeader title="Recommended Buses" icon={Bus} subtitle="Filtered by availability and capacity" />
              {assetsLoading ? (
                <p className="text-sm text-gray-500">Loading buses...</p>
              ) : busRecommendations.length === 0 ? (
                <p className="text-sm text-gray-500">No eligible buses found for current capacity and status filters.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {busRecommendations.slice(0, 10).map((bus) => (
                    <label key={bus._id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:border-red-300 bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={form.assignedBuses.includes(bus._id)}
                        onChange={() => toggleBusAssignment(bus._id)}
                        className="h-4 w-4 accent-red-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{bus.busNumber} <span className="text-gray-500 font-medium">({bus.capacity} seats)</span></p>
                        <p className="text-xs text-gray-500">{bus.model} • {bus.status}</p>
                      </div>
                      <Badge variant={bus.score >= 4 ? 'success' : 'info'}>{bus.score >= 4 ? 'Best Fit' : 'Match'}</Badge>
                    </label>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Available Drivers" icon={Users} subtitle="Active and unassigned drivers" />
              {assetsLoading ? (
                <p className="text-sm text-gray-500">Loading drivers...</p>
              ) : driverRecommendations.length === 0 ? (
                <p className="text-sm text-gray-500">No unassigned active drivers available right now.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {driverRecommendations.slice(0, 10).map((driver) => (
                    <label key={driver._id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-200 hover:border-red-300 bg-white cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={form.assignedDrivers.includes(driver._id)}
                        onChange={() => toggleDriverAssignment(driver._id)}
                        className="h-4 w-4 accent-red-600"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.employeeId} • {driver.shift || 'shift n/a'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Stops */}
        <Card>
          {/* datalist for Sri Lanka town autocomplete */}
          <datalist id="sl-towns">
            {SL_TOWNS.map((t) => <option key={t} value={t} />)}
          </datalist>

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  <Navigation size={15} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Route Stops</h3>
                  <p className="text-xs text-gray-400">{form.stops.length} stop{form.stops.length !== 1 ? 's' : ''}{totalStopDist > 0 ? ` · ${totalStopDist.toFixed(1)} km` : ''}{totalStopTime > 0 ? ` · ${totalStopTime} min` : ''}</p>
                </div>
              </div>
            </div>
            <Button variant="secondary" icon={Plus} size="sm" type="button" onClick={addStop}>Add Stop</Button>
          </div>

          {form.stops.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-gray-200 rounded-2xl">
              <Navigation size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-400">No stops added yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add Stop" to build the route path</p>
            </div>
          ) : (
            <div className="relative">
              {/* vertical timeline line */}
              <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-red-300 via-red-200 to-red-300 z-0" />
              <div className="space-y-2">
                {form.stops.map((stop, i) => {
                  const isFirst = i === 0;
                  const isLast = i === form.stops.length - 1;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="relative flex gap-3">
                      {/* timeline dot */}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black shadow-sm border-2 ${isFirst ? 'bg-emerald-500 border-emerald-400 text-white' : isLast ? 'bg-red-600 border-red-500 text-white' : 'bg-white border-red-300 text-red-700'}`}>
                        {isFirst ? <MapPin size={14} /> : isLast ? <MapPin size={14} /> : i + 1}
                      </div>
                      {/* stop card */}
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isFirst && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ORIGIN</span>}
                            {isLast && !isFirst && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">DESTINATION</span>}
                            {!isFirst && !isLast && <span className="text-[10px] font-bold text-gray-400">STOP {i + 1}</span>}
                          </div>
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => moveStop(i, -1)} disabled={i === 0}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                              <ChevronUp size={13} />
                            </button>
                            <button type="button" onClick={() => moveStop(i, 1)} disabled={i === form.stops.length - 1}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition-colors">
                              <ChevronDown size={13} />
                            </button>
                            <button type="button" onClick={() => removeStop(i)}
                              className="w-6 h-6 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* stop name */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Stop Name <span className="text-red-500">*</span></label>
                          <input
                            list="sl-towns"
                            value={stop.name}
                            onChange={(e) => updateStop(i, 'name', e.target.value)}
                            placeholder={isFirst ? 'Origin stop name...' : isLast ? 'Destination stop name...' : 'Town or landmark name...'}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 bg-white"
                          />
                        </div>

                        {/* time + distance */}
                        {!isFirst && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1 flex items-center gap-1"><Clock size={10} /> Time from prev (min)</label>
                              <input
                                type="number" min="0"
                                value={stop.timeFromPrev}
                                onChange={(e) => updateStop(i, 'timeFromPrev', e.target.value)}
                                placeholder="e.g. 25"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-gray-500 mb-1">Distance from prev (km)</label>
                              <input
                                type="number" min="0"
                                value={stop.distanceFromPrev}
                                onChange={(e) => updateStop(i, 'distanceFromPrev', e.target.value)}
                                placeholder="e.g. 18"
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 bg-white"
                              />
                            </div>
                          </div>
                        )}

                        {/* landmark */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 mb-1">Landmark / Note <span className="text-gray-300">(optional)</span></label>
                          <input
                            value={stop.landmark || ''}
                            onChange={(e) => updateStop(i, 'landmark', e.target.value)}
                            placeholder="e.g. Near bus terminal, opposite hospital..."
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 bg-white"
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* totals footer */}
              {form.stops.length >= 2 && (totalStopTime > 0 || totalStopDist > 0) && (
                <div className="mt-3 flex items-center gap-4 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl ml-13">
                  {totalStopDist > 0 && <span className="text-xs font-bold text-red-700">Total distance: {totalStopDist.toFixed(1)} km</span>}
                  {totalStopTime > 0 && <span className="text-xs font-bold text-red-700">Total travel time: {totalStopTime} min ({Math.floor(totalStopTime / 60)}h {totalStopTime % 60}m)</span>}
                </div>
              )}
            </div>
          )}
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => navigate('/routes')}>Cancel</Button>
          <Button type="submit" loading={loading} icon={Save}>Create Route</Button>
        </div>
      </form>
    </div>
  );
}
