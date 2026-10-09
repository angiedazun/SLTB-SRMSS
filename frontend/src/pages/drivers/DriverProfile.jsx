import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, User, Phone, Mail, Car, Star, Edit, Calendar, Shield, Activity, Map, Clock, FileText, AlertTriangle, CheckCircle, PauseCircle } from 'lucide-react';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/Badge';
import Loading from '../../components/ui/Loading';
import Modal from '../../components/ui/Modal';
import NotFoundCard from '../../components/ui/NotFoundCard';
import { formatDate, initials } from '../../utils/helpers';
import api from '../../services/api';

export default function DriverProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    depot: '',
    licenseNumber: '',
    licenseClass: '',
    licenseExpiry: '',
    shift: 'morning',
    rating: 5,
  });
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    api.get(`/drivers/${id}`)
      .then(({ data }) => setDriver(data.driver || data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (driver && new URLSearchParams(location.search).get('edit') === '1') {
      openEditModal();
      navigate(`/drivers/${id}`, { replace: true });
    }
  }, [driver, location.search, navigate, id]);

  if (loading) return <Loading size="lg" text="Loading driver profile..." />;
  if (!driver) return <NotFoundCard title="Driver Not Found" message="This driver profile may have been deleted or does not exist." backTo="/drivers" backLabel="Back to Drivers" />;

  const licenseExpiring = driver.licenseExpiry && new Date(driver.licenseExpiry) <= new Date(Date.now() + 30 * 86400000);

  const openEditModal = () => {
    setEditForm({
      name: driver.name || '',
      rating: driver.rating || 5,
      phone: driver.phone || '',
      email: driver.email || '',
      depot: driver.depot || '',
      licenseNumber: driver.licenseNumber || '',
      licenseClass: driver.licenseClass || '',
      licenseExpiry: driver.licenseExpiry ? String(driver.licenseExpiry).slice(0, 10) : '',
      shift: driver.shift || 'morning',
    });
    setEditModal(true);
  };

  const handleEditSave = async () => {
    setSavingEdit(true);
    try {
      const { data } = await api.put(`/drivers/${id}`, editForm);
      if (data?.driver) {
        setDriver(data.driver);
      }
    } catch {
      // keep UI functional in demo/offline states
    } finally {
      setSavingEdit(false);
      setEditModal(false);
    }
  };

  const handleStatusChange = async () => {
    if (!newStatus) return;
    setChangingStatus(true);
    try {
      const { data } = await api.patch(`/drivers/${id}/status`, { status: newStatus });
      if (data?.driver) setDriver(data.driver);
      else setDriver((prev) => ({ ...prev, status: newStatus }));
    } catch {
      setDriver((prev) => ({ ...prev, status: newStatus }));
    } finally {
      setChangingStatus(false);
      setStatusModal(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/drivers')} size="sm">Back</Button>
          <div>
            <h2 className="text-2xl font-black text-gray-900">{driver.name}</h2>
            <p className="text-sm text-gray-500">Employee ID: {driver.employeeId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setNewStatus(driver.status); setStatusModal(true); }}>Change Status</Button>
          <Button variant="secondary" icon={Edit} size="sm" onClick={openEditModal}>Edit Profile</Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-2xl font-black shadow-lg flex-shrink-0">
            {initials(driver.name)}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">{driver.name}</h3>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <StatusBadge status={driver.status} />
              {driver.rating && (
                <span className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                  <Star size={14} fill="currentColor" />{driver.rating.toFixed(1)} Rating
                </span>
              )}
              {driver.depot && <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">{driver.depot} Depot</span>}
            </div>
          </div>
        </div>
      </Card>

      {/* Performance Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Trips', value: driver.totalTrips || 0, icon: Activity, color: 'from-red-500 to-red-700' },
          { label: 'Total Mileage', value: `${(driver.totalMileage || 0).toLocaleString()} km`, icon: Map, color: 'from-emerald-400 to-green-600' },
          { label: 'Hours This Month', value: driver.workingHoursThisMonth || 0, icon: Clock, color: 'from-amber-400 to-orange-500' },
          { label: 'Rating', value: driver.rating ? driver.rating.toFixed(1) : '—', icon: Star, color: 'from-amber-500 to-yellow-600' },
        ].map((s) => (
          <Card key={s.label} padding="p-4" className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-base font-black text-gray-900">{s.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Contact Info */}
        <Card>
          <CardHeader title="Contact Information" icon={User} />
          <dl className="space-y-3">
            {[
              { icon: Phone, label: 'Phone', value: driver.phone },
              { icon: Mail, label: 'Email', value: driver.email },
              { icon: User, label: 'NIC', value: driver.nic },
              { icon: Car, label: 'Depot', value: driver.depot },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={14} className="text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-medium text-gray-400">{label}</p>
                  <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
                </div>
              </div>
            ))}
          </dl>
        </Card>

        {/* License Info */}
        <Card>
          <CardHeader title="License Details" icon={Shield} />
          <dl className="space-y-3">
            {[
              ['License Number', driver.licenseNumber],
              ['License Class', driver.licenseClass],
              ['Shift', driver.shift ? driver.shift.charAt(0).toUpperCase() + driver.shift.slice(1) : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-medium text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{value || '—'}</p>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-medium text-gray-400">License Expiry</p>
              <p className={`text-sm font-bold mt-0.5 ${licenseExpiring ? 'text-red-600' : 'text-gray-800'}`}>
                {driver.licenseExpiry ? formatDate(driver.licenseExpiry) : '—'}
                {licenseExpiring && <span className="text-xs ml-2 bg-red-50 text-red-600 px-2 py-0.5 rounded-lg">Expiring Soon</span>}
              </p>
            </div>
          </dl>
        </Card>
      </div>

      {/* Assignment Panel */}
      {(driver.assignedBus || driver.assignedRoute) && (
        <Card>
          <CardHeader title="Current Assignment" icon={Car} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {driver.assignedBus && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-400 mb-1">Assigned Bus</p>
                <button
                  onClick={() => navigate(`/buses/${typeof driver.assignedBus === 'object' ? driver.assignedBus._id : driver.assignedBus}`)}
                  className="font-bold text-red-600 hover:text-red-700 text-sm underline underline-offset-2"
                >
                  {typeof driver.assignedBus === 'object' ? driver.assignedBus.busNumber || driver.assignedBus.registrationNumber : driver.assignedBus}
                </button>
                {typeof driver.assignedBus === 'object' && driver.assignedBus.model && (
                  <p className="text-xs text-gray-400 mt-0.5">{driver.assignedBus.model}</p>
                )}
              </div>
            )}
            {driver.assignedRoute && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-medium text-gray-400 mb-1">Assigned Route</p>
                <button
                  onClick={() => navigate(`/routes/${typeof driver.assignedRoute === 'object' ? driver.assignedRoute._id : driver.assignedRoute}`)}
                  className="font-bold text-red-600 hover:text-red-700 text-sm underline underline-offset-2"
                >
                  {typeof driver.assignedRoute === 'object' ? `${driver.assignedRoute.routeNumber} — ${driver.assignedRoute.name}` : driver.assignedRoute}
                </button>
                {typeof driver.assignedRoute === 'object' && driver.assignedRoute.origin && (
                  <p className="text-xs text-gray-400 mt-0.5">{driver.assignedRoute.origin} → {driver.assignedRoute.destination}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Emergency Contact */}
      {driver.emergencyContact?.name && (
        <Card>
          <CardHeader title="Emergency Contact" icon={Phone} />
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-gray-400">Name</p>
              <p className="font-medium text-gray-800">{driver.emergencyContact.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Relationship</p>
              <p className="font-medium text-gray-800">{driver.emergencyContact.relationship || driver.emergencyContact.relation || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="font-medium text-gray-800">{driver.emergencyContact.phone || '—'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Notes */}
      {driver.notes && (
        <Card>
          <CardHeader title="Notes" icon={FileText} />
          <p className="text-sm text-gray-700 leading-relaxed">{driver.notes}</p>
        </Card>
      )}

      {/* Status Change Modal */}
      <Modal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        title="Change Driver Status" subtitle="Update availability status" icon={Activity} isEdit
        footer={
          <>
            <Button variant="ghost" onClick={() => setStatusModal(false)}>Cancel</Button>
            <Button loading={changingStatus} onClick={handleStatusChange}>Update Status</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Update status for <strong>{driver.name}</strong>:</p>
          {['active', 'on_leave', 'suspended', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setNewStatus(s)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${newStatus === s ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${s === 'active' ? 'bg-green-500' : s === 'on_leave' ? 'bg-amber-500' : s === 'suspended' ? 'bg-red-500' : 'bg-gray-400'}`} />
              <span className="capitalize text-sm font-semibold text-gray-800">{s.replace('_', ' ')}</span>
              {newStatus === s && <CheckCircle size={16} className="text-red-500 ml-auto" />}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={editModal}
        onClose={() => setEditModal(false)}
        title="Edit Driver Profile" subtitle="Update driver information" icon={Edit} isEdit
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button loading={savingEdit} onClick={handleEditSave}>Save Changes</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
            <input className="input w-full" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
            <input className="input w-full" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input type="email" className="input w-full" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Depot</label>
            <input className="input w-full" value={editForm.depot} onChange={(e) => setEditForm((p) => ({ ...p, depot: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">License Number</label>
            <input className="input w-full" value={editForm.licenseNumber} onChange={(e) => setEditForm((p) => ({ ...p, licenseNumber: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">License Class</label>
            <input className="input w-full" value={editForm.licenseClass} onChange={(e) => setEditForm((p) => ({ ...p, licenseClass: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">License Expiry</label>
            <input type="date" className="input w-full" value={editForm.licenseExpiry} onChange={(e) => setEditForm((p) => ({ ...p, licenseExpiry: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Shift</label>
            <select className="input w-full" value={editForm.shift} onChange={(e) => setEditForm((p) => ({ ...p, shift: e.target.value }))}>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="night">Night</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-600 mb-2">Performance Rating</label>
            <div className="flex items-center gap-4 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (hoverRating || editForm.rating);
                  return (
                    <button key={star} type="button"
                      onClick={() => setEditForm((p) => ({ ...p, rating: star }))}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-125 focus:outline-none">
                      <Star size={28} className={filled ? 'text-amber-400' : 'text-gray-200'} fill={filled ? 'currentColor' : 'none'} />
                    </button>
                  );
                })}
              </div>
              <div className="border-l border-amber-200 pl-4">
                <p className="text-2xl font-black text-amber-600">{(hoverRating || editForm.rating).toFixed(1)}</p>
                <p className="text-[10px] font-semibold text-amber-500">
                  {(hoverRating || editForm.rating) === 5 ? 'Excellent' : (hoverRating || editForm.rating) >= 4 ? 'Good' : (hoverRating || editForm.rating) >= 3 ? 'Average' : (hoverRating || editForm.rating) >= 2 ? 'Below Average' : 'Poor'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
