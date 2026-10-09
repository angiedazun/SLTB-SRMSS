import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bus, Wrench, Fuel, Edit, Trash2, MapPin, Gauge, Heart, Navigation, RefreshCw, CheckCircle } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import Loading from '../../components/ui/Loading';
import Modal from '../../components/ui/Modal';
import NotFoundCard from '../../components/ui/NotFoundCard';
import { formatDate, formatCurrency } from '../../utils/helpers';
import api from '../../services/api';

export default function BusDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [bus, setBus] = useState(null);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Fuel update
  const [fuelModal, setFuelModal] = useState(false);
  const [fuelInput, setFuelInput] = useState('');
  const [savingFuel, setSavingFuel] = useState(false);

  // Location update
  const [locationModal, setLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState({ lat: '', lng: '' });
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');

  // Mileage update
  const [mileageModal, setMileageModal] = useState(false);
  const [mileageInput, setMileageInput] = useState('');
  const [savingMileage, setSavingMileage] = useState(false);

  const [editForm, setEditForm] = useState({
    registrationNumber: '',
    model: '',
    manufacturer: '',
    year: '',
    capacity: '',
    fuelType: 'diesel',
    depot: '',
    insuranceExpiry: '',
    licenseExpiry: '',
    fuelCapacity: '',
    nextServiceMileage: '',
    engineNumber: '',
    chassisNumber: '',
    notes: '',
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [busRes, mainRes, fuelRes] = await Promise.all([
          api.get(`/buses/${id}`),
          api.get(`/maintenance?bus=${id}&limit=5`),
          api.get(`/fuel?bus=${id}&limit=5`),
        ]);
        setBus(busRes.data.bus || busRes.data);
        setMaintenance(mainRes.data.records || []);
        setFuelLogs(fuelRes.data.logs || []);
      } catch { /* */ } finally { setLoading(false); }
    };
    fetchAll();
  }, [id]);

  useEffect(() => {
    if (bus && new URLSearchParams(location.search).get('edit') === '1') {
      openEditModal();
      navigate(`/buses/${id}`, { replace: true });
    }
  }, [bus, location.search, navigate, id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/buses/${id}`);
      navigate('/buses');
    } catch { setDeleting(false); }
  };

  const openEditModal = () => {
    setEditForm({
      registrationNumber: bus.registrationNumber || '',
      model: bus.model || '',
      manufacturer: bus.manufacturer || '',
      year: bus.year || '',
      capacity: bus.capacity || '',
      fuelType: bus.fuelType || 'diesel',
      depot: bus.depot || '',
      insuranceExpiry: bus.insuranceExpiry ? bus.insuranceExpiry.slice(0, 10) : '',
      licenseExpiry: bus.licenseExpiry ? bus.licenseExpiry.slice(0, 10) : '',
      fuelCapacity: bus.fuelCapacity || '',
      nextServiceMileage: bus.nextServiceMileage || '',
      engineNumber: bus.engineNumber || '',
      chassisNumber: bus.chassisNumber || '',
      notes: bus.notes || '',
    });
    setEditModal(true);
  };

  const handleEditSave = async () => {
    setSavingEdit(true);
    try {
      const res = await api.put(`/buses/${id}`, editForm);
      setBus((prev) => ({ ...prev, ...(res.data.bus || editForm) }));
    } catch {
      setBus((prev) => ({ ...prev, ...editForm }));
    } finally {
      setSavingEdit(false);
      setEditModal(false);
    }
  };

  const handleFuelSave = async () => {
    const level = parseFloat(fuelInput);
    if (isNaN(level) || level < 0) return;
    setSavingFuel(true);
    try {
      const res = await api.patch(`/buses/${id}/fuel`, { currentFuelLevel: level });
      setBus((prev) => ({ ...prev, currentFuelLevel: res.data.currentFuelLevel ?? level }));
    } catch {
      setBus((prev) => ({ ...prev, currentFuelLevel: level }));
    } finally {
      setSavingFuel(false);
      setFuelModal(false);
    }
  };

  const handleLocationSave = async () => {
    setLocationError('');
    const lat = parseFloat(locationInput.lat);
    const lng = parseFloat(locationInput.lng);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setLocationError('Enter valid coordinates (lat: -90 to 90, lng: -180 to 180).');
      return;
    }
    setSavingLocation(true);
    try {
      const res = await api.patch(`/buses/${id}/location`, { lat, lng });
      setBus((prev) => ({ ...prev, lastLocation: res.data.lastLocation || { lat, lng, updatedAt: new Date() } }));
    } catch {
      setBus((prev) => ({ ...prev, lastLocation: { lat, lng, updatedAt: new Date() } }));
    } finally {
      setSavingLocation(false);
      setLocationModal(false);
    }
  };

  const handleMileageSave = async () => {
    const km = parseFloat(mileageInput);
    if (isNaN(km) || km < 0) return;
    setSavingMileage(true);
    try {
      const res = await api.patch(`/buses/${id}/mileage`, { currentMileage: km });
      setBus((prev) => ({ ...prev, currentMileage: res.data.currentMileage ?? km, healthScore: res.data.healthScore ?? prev.healthScore }));
    } catch {
      setBus((prev) => ({ ...prev, currentMileage: km }));
    } finally {
      setSavingMileage(false);
      setMileageModal(false);
    }
  };

  if (loading) return <Loading size="lg" text="Loading bus details..." />;
  if (!bus) return <NotFoundCard title="Bus Not Found" message="This bus record may have been deleted or does not exist." backTo="/buses" backLabel="Back to Fleet" />;

  const fuelPct = bus.fuelCapacity > 0 ? Math.round(((bus.currentFuelLevel || 0) / bus.fuelCapacity) * 100) : 0;
  const healthScore = bus.healthScore ?? null;
  const healthColor = healthScore == null ? 'gray' : healthScore >= 80 ? 'emerald' : healthScore >= 60 ? 'blue' : healthScore >= 40 ? 'amber' : 'red';
  const healthLabel = healthScore == null ? '—' : healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Good' : healthScore >= 40 ? 'Fair' : 'Poor';

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/buses')} size="sm">Back</Button>
          <div>
            <h2 className="text-2xl font-black text-gray-900">Bus {bus.busNumber}</h2>
            <p className="text-sm text-gray-500">{bus.manufacturer} {bus.model} · {bus.year}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={Edit} size="sm" onClick={openEditModal}>Edit</Button>
          <Button variant="danger" icon={Trash2} size="sm" onClick={() => setDeleteModal(true)}>Delete</Button>
        </div>
      </div>

      {/* Status banner */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md">
            <Bus size={26} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{bus.registrationNumber}</p>
            <StatusBadge status={bus.status} />
          </div>
        </div>
        <div className="flex gap-6 flex-wrap">
          <StatPill icon={Gauge} label="Mileage" value={`${(bus.currentMileage || 0).toLocaleString()} km`} onClick={() => { setMileageInput(bus.currentMileage || ''); setMileageModal(true); }} />
          <StatPill icon={Fuel} label="Fuel Level" value={`${bus.currentFuelLevel || 0} / ${bus.fuelCapacity || '—'} L`} onClick={() => { setFuelInput(bus.currentFuelLevel || ''); setFuelModal(true); }} />
          <StatPill icon={MapPin} label="Depot" value={bus.depot || '—'} />
        </div>
      </div>

      {/* Health + Fuel + Location row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Health Score */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Heart size={16} className={`text-${healthColor}-500`} />
            <h4 className="font-bold text-gray-800 text-sm">Fleet Health Score</h4>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke={healthColor === 'emerald' ? '#10b981' : healthColor === 'blue' ? '#3b82f6' : healthColor === 'amber' ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${((healthScore || 0) / 100) * 94.25} 94.25`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-gray-800">
                {healthScore ?? '—'}
              </span>
            </div>
            <div>
              <p className={`text-lg font-black text-${healthColor}-600`}>{healthLabel}</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Based on mileage, service schedule, document expiry, vehicle age, and fuel level.
              </p>
            </div>
          </div>
        </div>

        {/* Fuel Level */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Fuel size={16} className="text-blue-500" />
              <h4 className="font-bold text-gray-800 text-sm">Fuel Level</h4>
            </div>
            <button
              onClick={() => { setFuelInput(bus.currentFuelLevel || ''); setFuelModal(true); }}
              className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
            >
              Update
            </button>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-black text-gray-900">{bus.currentFuelLevel || 0}</span>
            <span className="text-sm text-gray-400 mb-1">/ {bus.fuelCapacity || '—'} L</span>
            <span className={`ml-auto text-sm font-bold ${fuelPct < 20 ? 'text-red-500' : fuelPct < 40 ? 'text-amber-500' : 'text-emerald-600'}`}>{fuelPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${fuelPct < 20 ? 'bg-red-500' : fuelPct < 40 ? 'bg-amber-400' : 'bg-emerald-500'}`}
              style={{ width: `${Math.max(fuelPct, 2)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {fuelPct < 20 ? '⚠️ Low fuel — refill recommended' : fuelPct < 40 ? 'Moderate — plan refill soon' : 'Sufficient fuel level'}
          </p>
        </div>

        {/* GPS Location */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Navigation size={16} className="text-indigo-500" />
              <h4 className="font-bold text-gray-800 text-sm">Last Known Location</h4>
            </div>
            <button
              onClick={() => {
                setLocationInput({ lat: bus.lastLocation?.lat || '', lng: bus.lastLocation?.lng || '' });
                setLocationError('');
                setLocationModal(true);
              }}
              className="text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
            >
              Update
            </button>
          </div>
          {bus.lastLocation?.lat != null ? (
            <>
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">Latitude</span>
                  <span className="font-mono font-bold text-gray-800">{bus.lastLocation.lat.toFixed(6)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-medium">Longitude</span>
                  <span className="font-mono font-bold text-gray-800">{bus.lastLocation.lng.toFixed(6)}</span>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps?q=${bus.lastLocation.lat},${bus.lastLocation.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <MapPin size={12} /> View on Google Maps
              </a>
              {bus.lastLocation.updatedAt && (
                <p className="text-xs text-gray-400 mt-2">Updated: {formatDate(bus.lastLocation.updatedAt)}</p>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <MapPin size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No location recorded</p>
              <button
                onClick={() => { setLocationInput({ lat: '', lng: '' }); setLocationError(''); setLocationModal(true); }}
                className="mt-2 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
              >
                Set location
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Bus Details */}
        <Card>
          <CardHeader title="Vehicle Info" icon={Bus} />
          <dl className="space-y-2.5">
            {[
              ['Bus Number', bus.busNumber],
              ['Registration', bus.registrationNumber],
              ['Model', bus.model],
              ['Manufacturer', bus.manufacturer],
              ['Year', bus.year],
              ['Capacity', `${bus.capacity} seats`],
              ['Fuel Type', bus.fuelType],
              ['Engine No.', bus.engineNumber || '—'],
              ['Chassis No.', bus.chassisNumber || '—'],
              ['Insurance Expiry', bus.insuranceExpiry ? formatDate(bus.insuranceExpiry) : '—'],
              ['License Expiry', bus.licenseExpiry ? formatDate(bus.licenseExpiry) : '—'],
              ['Next Service at', bus.nextServiceMileage ? `${bus.nextServiceMileage.toLocaleString()} km` : '—'],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
                <dt className="text-xs font-medium text-gray-400">{label}</dt>
                <dd className="text-sm font-medium text-gray-800">{value}</dd>
              </div>
            ))}
            {bus.notes && (
              <div className="pt-2">
                <dt className="text-xs font-medium text-gray-400 mb-1">Notes</dt>
                <dd className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{bus.notes}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Assignment + Recent Maintenance */}
        <div className="space-y-5">
          {(bus.assignedRoute || bus.assignedDriver) && (
            <Card>
              <CardHeader title="Current Assignment" icon={MapPin} />
              <dl className="space-y-2.5">
                {bus.assignedRoute && (
                  <div className="flex justify-between py-1.5 border-b border-gray-50">
                    <dt className="text-xs font-medium text-gray-400">Route</dt>
                    <dd className="text-sm font-semibold text-red-700">{bus.assignedRoute.routeNumber} – {bus.assignedRoute.name}</dd>
                  </div>
                )}
                {bus.assignedDriver && (
                  <div className="flex justify-between py-1.5">
                    <dt className="text-xs font-medium text-gray-400">Driver</dt>
                    <dd className="text-sm font-medium text-gray-800">{bus.assignedDriver.name} ({bus.assignedDriver.employeeId})</dd>
                  </div>
                )}
              </dl>
            </Card>
          )}

          <Card>
            <CardHeader title="Recent Maintenance" icon={Wrench} />
            {maintenance.length === 0 ? (
              <p className="text-sm text-gray-400">No maintenance records.</p>
            ) : (
              <div className="space-y-2.5">
                {maintenance.map((m) => (
                  <div key={m._id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{m.title}</p>
                      <p className="text-xs text-gray-500">{formatDate(m.scheduledDate)} · {formatCurrency(m.cost)}</p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Recent Fuel Logs" icon={Fuel} />
            {fuelLogs.length === 0 ? (
              <p className="text-sm text-gray-400">No fuel logs.</p>
            ) : (
              <div className="space-y-2.5">
                {fuelLogs.map((f) => (
                  <div key={f._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{f.quantity} L · {formatCurrency(f.totalCost)}</p>
                      <p className="text-xs text-gray-500">{formatDate(f.date)} {f.efficiency ? `· ${f.efficiency} km/L` : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title={`Edit Bus ${bus.busNumber}`} subtitle="Update bus details and specifications" icon={Bus} isEdit
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button loading={savingEdit} onClick={handleEditSave}>Save Changes</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
          {[
            { label: 'Registration', key: 'registrationNumber' },
            { label: 'Model', key: 'model' },
            { label: 'Manufacturer', key: 'manufacturer' },
            { label: 'Engine No.', key: 'engineNumber' },
            { label: 'Chassis No.', key: 'chassisNumber' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
              <input className="input w-full" value={editForm[key]} onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
            <input type="number" className="input w-full" value={editForm.year} onChange={(e) => setEditForm((p) => ({ ...p, year: Number(e.target.value) || '' }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Capacity</label>
            <input type="number" className="input w-full" value={editForm.capacity} onChange={(e) => setEditForm((p) => ({ ...p, capacity: Number(e.target.value) || '' }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fuel Type</label>
            <select className="input w-full" value={editForm.fuelType} onChange={(e) => setEditForm((p) => ({ ...p, fuelType: e.target.value }))}>
              {['diesel', 'petrol', 'electric', 'hybrid'].map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Fuel Capacity (L)</label>
            <input type="number" className="input w-full" value={editForm.fuelCapacity} onChange={(e) => setEditForm((p) => ({ ...p, fuelCapacity: Number(e.target.value) || '' }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Insurance Expiry</label>
            <input type="date" className="input w-full" value={editForm.insuranceExpiry} onChange={(e) => setEditForm((p) => ({ ...p, insuranceExpiry: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">License Expiry</label>
            <input type="date" className="input w-full" value={editForm.licenseExpiry} onChange={(e) => setEditForm((p) => ({ ...p, licenseExpiry: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Next Service (km)</label>
            <input type="number" className="input w-full" value={editForm.nextServiceMileage} onChange={(e) => setEditForm((p) => ({ ...p, nextServiceMileage: Number(e.target.value) || '' }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Depot</label>
            <input className="input w-full" value={editForm.depot} onChange={(e) => setEditForm((p) => ({ ...p, depot: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
            <textarea className="input w-full resize-none" rows={3} value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Fuel Update Modal */}
      <Modal
        open={fuelModal}
        onClose={() => setFuelModal(false)}
        title="Update Fuel Level" subtitle="Enter current fuel reading" icon={Fuel} isEdit
        footer={
          <>
            <Button variant="ghost" onClick={() => setFuelModal(false)}>Cancel</Button>
            <Button loading={savingFuel} icon={CheckCircle} onClick={handleFuelSave}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Enter current fuel level. Capacity: <strong>{bus.fuelCapacity || '—'} L</strong></p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Current Fuel Level (L)</label>
            <input
              type="number"
              min="0"
              max={bus.fuelCapacity || undefined}
              step="0.5"
              className="input w-full"
              value={fuelInput}
              onChange={(e) => setFuelInput(e.target.value)}
              placeholder={`0 – ${bus.fuelCapacity || '?'}`}
            />
          </div>
        </div>
      </Modal>

      {/* Location Update Modal */}
      <Modal
        open={locationModal}
        onClose={() => setLocationModal(false)}
        title="Update GPS Location" subtitle="Set current bus coordinates" icon={MapPin} isEdit
        footer={
          <>
            <Button variant="ghost" onClick={() => setLocationModal(false)}>Cancel</Button>
            <Button loading={savingLocation} icon={Navigation} onClick={handleLocationSave}>Save Location</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Enter the current GPS coordinates for this bus.</p>
          {locationError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{locationError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Latitude</label>
              <input type="number" step="any" className="input w-full" value={locationInput.lat} onChange={(e) => setLocationInput((p) => ({ ...p, lat: e.target.value }))} placeholder="e.g. 6.9271" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Longitude</label>
              <input type="number" step="any" className="input w-full" value={locationInput.lng} onChange={(e) => setLocationInput((p) => ({ ...p, lng: e.target.value }))} placeholder="e.g. 79.8612" />
            </div>
          </div>
          <p className="text-xs text-gray-400">Sri Lanka bounding box: lat 5.9–9.9, lng 79.6–81.9</p>
        </div>
      </Modal>

      {/* Mileage Update Modal */}
      <Modal
        open={mileageModal}
        onClose={() => setMileageModal(false)}
        title="Update Mileage" subtitle="Record current odometer reading" icon={Gauge} isEdit
        footer={
          <>
            <Button variant="ghost" onClick={() => setMileageModal(false)}>Cancel</Button>
            <Button loading={savingMileage} icon={CheckCircle} onClick={handleMileageSave}>Save</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Update the current odometer reading for this bus.</p>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Current Mileage (km)</label>
            <input
              type="number"
              min="0"
              step="1"
              className="input w-full"
              value={mileageInput}
              onChange={(e) => setMileageInput(e.target.value)}
              placeholder="e.g. 125000"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Bus" subtitle="This action cannot be undone" icon={Trash2}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Delete Bus</Button>
          </>
        }
      >
        <p className="text-gray-600">Are you sure you want to delete bus <strong>{bus.busNumber}</strong>? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}

function StatPill({ icon: Icon, label, value, onClick }) {
  const base = "text-center";
  return onClick ? (
    <button onClick={onClick} className={`${base} hover:opacity-70 transition-opacity`}>
      <Icon size={16} className="text-gray-400 mx-auto mb-1" />
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value}</p>
    </button>
  ) : (
    <div className={base}>
      <Icon size={16} className="text-gray-400 mx-auto mb-1" />
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-800">{value}</p>
    </div>
  );
}
