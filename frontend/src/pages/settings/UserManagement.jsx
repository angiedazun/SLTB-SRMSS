import { useState, useEffect } from 'react';
import { Plus, Search, Users, Shield, Edit, ToggleLeft, ToggleRight, Trash2, Copy, Eye, EyeOff, Lock, Building2, Crown, UserCheck } from 'lucide-react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { ConfirmDelete } from '../../components/ui/RecordActions';
import { formatDate, initials } from '../../utils/helpers';
import { PROVINCES } from '../../utils/depots';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const ROLE_VARIANTS = {
  super_admin:         'critical',
  depot_manager:       'high',
  scheduler_officer:   'info',
  driver:              'success',
  maintenance_officer: 'warning',
};

const ROLE_LABELS = {
  super_admin:         'Super Admin',
  depot_manager:       'Depot Manager',
  scheduler_officer:   'Scheduler Officer',
  driver:              'Driver',
  maintenance_officer: 'Maintenance Officer',
};

const ROLE_ICONS = {
  super_admin:         Crown,
  depot_manager:       Building2,
  scheduler_officer:   UserCheck,
  driver:              Users,
  maintenance_officer: Shield,
};

// Roles a depot_manager is allowed to assign
const DEPOT_MANAGER_ALLOWED_ROLES = ['depot_manager', 'scheduler_officer', 'driver', 'maintenance_officer'];
const ALL_ROLES = ['super_admin', 'depot_manager', 'scheduler_officer', 'driver', 'maintenance_officer'];

function DepotSelect({ value, onChange, required, label = 'Depot' }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 bg-white text-gray-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      >
        <option value="">— Select Depot —</option>
        {PROVINCES.map((province) => (
          <optgroup key={province.name} label={province.name}>
            {province.depots.map((depot) => (
              <option key={depot} value={depot}>{depot}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function RoleSelect({ value, onChange, allowedRoles, label = 'Role' }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <select
        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 bg-white text-gray-700"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {allowedRoles.map((r) => {
          const Icon = ROLE_ICONS[r];
          return <option key={r} value={r}>{ROLE_LABELS[r]}</option>;
        })}
      </select>
      <p className="text-[11px] text-gray-400 mt-1">
        {value === 'super_admin' && 'Full system access — all modules and settings.'}
        {value === 'depot_manager' && 'Manages users and operations within their assigned depot.'}
        {value === 'scheduler_officer' && 'Creates and manages schedules and routes.'}
        {value === 'driver' && 'Access to Driver Self-Service portal only.'}
        {value === 'maintenance_officer' && 'Manages fleet maintenance and fuel logs.'}
      </p>
    </div>
  );
}

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin   = currentUser?.role === 'super_admin';
  const isDepotManager = currentUser?.role === 'depot_manager';
  const allowedRoles   = isSuperAdmin ? ALL_ROLES : DEPOT_MANAGER_ALLOWED_ROLES;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');

  // Invite
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ name: '', email: '', role: 'scheduler_officer', depot: '', password: '', confirmPassword: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [showTempPwd, setShowTempPwd] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Delete confirm
  const [confirmUser, setConfirmUser] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, search, limit: 12 });
      if (roleFilter) params.set('role', roleFilter);
      const { data } = await api.get(`/users?${params}`);
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, search, roleFilter]);

  const openInvite = () => {
    setInviteData({ name: '', email: '', role: 'scheduler_officer', depot: isDepotManager ? (currentUser?.depot || '') : '', password: '', confirmPassword: '' });
    setInviteError('');
    setTempPassword('');
    setShowPwd(false);
    setShowConfirmPwd(false);
    setInviteModal(true);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (inviteData.password && inviteData.password !== inviteData.confirmPassword) {
      setInviteError('Passwords do not match.');
      return;
    }
    if (['depot_manager'].includes(inviteData.role) && !inviteData.depot) {
      setInviteError('Depot is required for Depot Manager role.');
      return;
    }
    setInviting(true); setInviteError('');
    try {
      const payload = { name: inviteData.name, email: inviteData.email, role: inviteData.role, depot: inviteData.depot };
      if (inviteData.password) payload.password = inviteData.password;
      const { data } = await api.post('/users/invite', payload);
      setTempPassword(data.tempPassword || inviteData.password || '');
      setShowTempPwd(true);
      fetchUsers();
    } catch (err) {
      setInviteError(err.response?.data?.error || err.response?.data?.message || 'Failed to invite user');
    } finally { setInviting(false); }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openEdit = (user) => {
    setEditData({ _id: user._id, name: user.name, email: user.email, role: user.role, depot: user.depot || '', phone: user.phone || '' });
    setEditError('');
    setEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditing(true); setEditError('');
    try {
      await api.put(`/users/${editData._id}`, editData);
      setEditModal(false);
      fetchUsers();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update user');
    } finally { setEditing(false); }
  };

  const handleDelete = async (user) => {
    try { await api.delete(`/users/${user._id}`); fetchUsers(); } catch { /* */ }
  };

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/users/${user._id}/status`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
    } catch { /* */ }
  };

  // Depot manager cannot edit/delete super_admins
  const canEdit   = (row) => isSuperAdmin || row.role !== 'super_admin';
  const canDelete = (row) => isSuperAdmin && row._id !== currentUser?._id;

  const columns = [
    { key: 'name', label: 'User', accessor: 'name', sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials(val)}
          </div>
          <div>
            <p className="font-semibold text-gray-900 flex items-center gap-1.5">
              {val}
              {row._id === currentUser?._id && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold">You</span>}
            </p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'role', label: 'Role', accessor: 'role',
      render: (val) => {
        const Icon = ROLE_ICONS[val] || Shield;
        return (
          <div className="flex items-center gap-1.5">
            <Icon size={13} className={val === 'super_admin' ? 'text-red-600' : val === 'depot_manager' ? 'text-orange-500' : 'text-gray-400'} />
            <Badge variant={ROLE_VARIANTS[val] || 'info'}>{ROLE_LABELS[val] || val}</Badge>
          </div>
        );
      }
    },
    { key: 'depot', label: 'Depot', accessor: 'depot', render: (val) => val || <span className="text-gray-300">—</span> },
    { key: 'lastLogin', label: 'Last Login', accessor: 'lastLogin', render: (val) => val ? formatDate(val) : <span className="text-gray-300">Never</span> },
    { key: 'isActive', label: 'Status', accessor: 'isActive',
      render: (val, row) => (
        <button onClick={(e) => { e.stopPropagation(); if (canEdit(row)) toggleStatus(row); }}
          disabled={!canEdit(row)}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${val ? 'text-emerald-600' : 'text-gray-400'} ${!canEdit(row) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'}`}>
          {val ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {val ? 'Active' : 'Inactive'}
        </button>
      )
    },
    { key: 'actions', label: '', accessor: '_id',
      render: (val, row) => (
        <div className="flex items-center gap-1">
          {canEdit(row) && (
            <button onClick={(e) => { e.stopPropagation(); openEdit(row); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
              <Edit size={13} />
            </button>
          )}
          {canDelete(row) && (
            <button onClick={(e) => { e.stopPropagation(); setConfirmUser(row); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 size={13} />
            </button>
          )}
          {!canEdit(row) && <Lock size={13} className="text-gray-300 mx-2" title="Super Admin — restricted" />}
        </div>
      )
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900">User Management</h2>
          <p className="text-sm text-gray-500">Manage system users and access permissions</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Access level badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${isSuperAdmin ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
            {isSuperAdmin ? <Crown size={13} /> : <Building2 size={13} />}
            {isSuperAdmin ? 'Super Admin' : `Depot Manager${currentUser?.depot ? ` · ${currentUser.depot}` : ''}`}
          </div>
          <Button icon={Plus} onClick={openInvite}>Add User</Button>
        </div>
      </div>

      {/* Access notice for depot managers */}
      {isDepotManager && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <Building2 size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p>As a <strong>Depot Manager</strong>, you can add and manage users but cannot modify Super Admins or assign the Super Admin role.</p>
        </div>
      )}

      {/* Filters */}
      <Card padding="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search users..." className="input pl-10 w-full" />
          </div>
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="input w-48">
            <option value="">All Roles</option>
            {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card padding="p-0">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">System Users</h3>
            {pagination && <p className="text-xs text-gray-500">{pagination.total} users</p>}
          </div>
        </div>
        <div className="p-5">
          <Table columns={columns} data={users} loading={loading} emptyMessage="No users found." pagination={pagination} onPageChange={setPage} />
        </div>
      </Card>

      {/* ── Invite Modal ── */}
      <Modal open={inviteModal} onClose={() => { setInviteModal(false); setTempPassword(''); setShowTempPwd(false); }}
        title="Add New User" subtitle="Create a new system user account" icon={Plus}
        footer={showTempPwd ? (
          <Button onClick={() => { setInviteModal(false); setShowTempPwd(false); setTempPassword(''); }}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setInviteModal(false)}>Cancel</Button>
            <Button loading={inviting} onClick={handleInvite} icon={Plus}>Create User</Button>
          </>
        )}>

        {showTempPwd ? (
          /* ── Success: show credentials ── */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <UserCheck size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-emerald-800">User created successfully!</p>
                <p className="text-sm text-emerald-700">Share the credentials below with the new user.</p>
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</p>
                <p className="text-sm font-bold text-gray-900">{inviteData.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Temporary Password</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-bold text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-100 tracking-widest">
                    {tempPassword}
                  </code>
                  <button onClick={copyPassword}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                    <Copy size={13} />{copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠ The user should change this password after their first login.
            </p>
          </div>
        ) : (
          /* ── Invite Form ── */
          <form onSubmit={handleInvite} className="space-y-4">
            <Input label="Full Name" required value={inviteData.name}
              onChange={(e) => setInviteData(p => ({ ...p, name: e.target.value }))} placeholder="Kamal Perera" />

            <Input label="Email Address" type="email" required value={inviteData.email}
              onChange={(e) => setInviteData(p => ({ ...p, email: e.target.value }))} placeholder="kamal@sltb.lk" />

            <RoleSelect
              value={inviteData.role}
              onChange={(role) => setInviteData(p => ({ ...p, role }))}
              allowedRoles={allowedRoles}
            />

            <DepotSelect
              label={`Depot${inviteData.role === 'depot_manager' ? ' (required)' : ' (optional)'}`}
              value={inviteData.depot}
              onChange={(depot) => setInviteData(p => ({ ...p, depot }))}
              required={inviteData.role === 'depot_manager'}
            />

            {/* Divider */}
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                <Lock size={12} /> Set Password <span className="font-normal text-gray-400">(leave blank to auto-generate)</span>
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <Input label="Password" type={showPwd ? 'text' : 'password'} value={inviteData.password}
                    onChange={(e) => setInviteData(p => ({ ...p, password: e.target.value }))}
                    placeholder="Min 8 characters" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {inviteData.password && (
                  <div className="relative">
                    <Input label="Confirm Password" type={showConfirmPwd ? 'text' : 'password'} value={inviteData.confirmPassword}
                      onChange={(e) => setInviteData(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Re-enter password" />
                    <button type="button" onClick={() => setShowConfirmPwd(v => !v)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                      {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {inviteError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{inviteError}</p>}
          </form>
        )}
      </Modal>

      {/* ── Edit Modal ── */}
      {editData && (
        <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit User" subtitle="Update user account details" icon={Edit} isEdit
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditModal(false)}>Cancel</Button>
              <Button loading={editing} onClick={handleEdit} icon={Edit}>Save Changes</Button>
            </>
          }>
          <form onSubmit={handleEdit} className="space-y-4">
            <Input label="Full Name" required value={editData.name}
              onChange={(e) => setEditData(p => ({ ...p, name: e.target.value }))} />
            <Input label="Email Address" type="email" required value={editData.email}
              onChange={(e) => setEditData(p => ({ ...p, email: e.target.value }))} />
            <Input label="Phone" value={editData.phone}
              onChange={(e) => setEditData(p => ({ ...p, phone: e.target.value }))} placeholder="+94 77 000 0000" />

            <DepotSelect
              value={editData.depot}
              onChange={(depot) => setEditData(p => ({ ...p, depot }))}
            />

            {/* Super admin can change role; depot manager can only change non-super_admin users */}
            {isSuperAdmin && (
              <RoleSelect
                value={editData.role}
                onChange={(role) => setEditData(p => ({ ...p, role }))}
                allowedRoles={ALL_ROLES}
              />
            )}
            {isDepotManager && editData.role !== 'super_admin' && (
              <RoleSelect
                value={editData.role}
                onChange={(role) => setEditData(p => ({ ...p, role }))}
                allowedRoles={DEPOT_MANAGER_ALLOWED_ROLES}
              />
            )}

            {editError && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
          </form>
        </Modal>
      )}

      {confirmUser && (
        <ConfirmDelete
          label={`user "${confirmUser.name}"`}
          onConfirm={() => { handleDelete(confirmUser); setConfirmUser(null); }}
          onCancel={() => setConfirmUser(null)}
        />
      )}
    </div>
  );
}
