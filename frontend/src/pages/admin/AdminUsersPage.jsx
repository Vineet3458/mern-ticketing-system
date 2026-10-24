import React, { useEffect, useState } from 'react';
import {
  Search, UserCheck, Shield, AlertCircle, CheckCircle2,
  UserPlus, Phone, Mail, Lock, Users, ChevronDown,
  RefreshCw, Eye, EyeOff, Crown, User, Zap, X
} from 'lucide-react';
import api from '../../services/api.js';
import { RoleBadge } from '../../components/common/RoleBadge.jsx';
import { Modal } from '../../components/common/Modal.jsx';
import { PhoneInput } from '../../components/common/PhoneInput.jsx';

const ROLE_BADGES = {
  admin: { bg: 'bg-purple-100 text-purple-800 border-purple-200', icon: Crown, label: 'Admin' },
  agent: { bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: Zap, label: 'Agent' },
  customer: { bg: 'bg-slate-100 text-slate-700 border-slate-200', icon: User, label: 'Customer' },
};

const UserAvatar = ({ name, role }) => {
  const colors = {
    admin: 'from-purple-600 to-purple-500',
    agent: 'from-blue-600 to-blue-500',
    customer: 'from-slate-700 to-slate-600',
  };
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${colors[role] || colors.customer} flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0`}>
      {name ? name.charAt(0).toUpperCase() : 'U'}
    </div>
  );
};

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Role Edit Modal
  const [editUser, setEditUser] = useState(null);
  const [newRole, setNewRole] = useState('customer');
  const [isUpdating, setIsUpdating] = useState(false);

  // Create Admin Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', password: '', role: 'admin' });
  const [createLoading, setCreateLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Global feedback
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const showSuccess = (msg) => { setSuccessMsg(msg); setErrorMsg(''); setTimeout(() => setSuccessMsg(''), 4000); };
  const showError = (msg) => { setErrorMsg(msg); setSuccessMsg(''); setTimeout(() => setErrorMsg(''), 6000); };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/users', {
        params: { search: search.trim(), role: roleFilter },
      });
      setUsers(res.data.data || []);
    } catch {
      showError('Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const handleRoleUpdate = async () => {
    if (!editUser) return;
    setIsUpdating(true);
    try {
      await api.patch(`/users/${editUser._id}/role`, { role: newRole });
      showSuccess(`✓ ${editUser.name}'s role updated to ${newRole}`);
      setEditUser(null);
      loadUsers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.post('/users/create-admin', createForm);
      showSuccess(`✓ ${createForm.role === 'admin' ? 'Administrator' : 'Agent'} "${createForm.name}" created successfully!`);
      setShowCreateModal(false);
      setCreateForm({ name: '', email: '', phone: '', password: '', role: 'admin' });
      loadUsers();
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setCreateLoading(false);
    }
  };

  const totalAdmins = users.filter(u => u.role === 'admin').length;
  const totalAgents = users.filter(u => u.role === 'agent').length;
  const totalCustomers = users.filter(u => u.role === 'customer').length;
  const verifiedCount = users.filter(u => u.isVerified).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            User Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage platform users, roles, and create privileged accounts.
          </p>
        </div>
        <button
          id="create-admin-btn"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-100 whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Create Admin / Agent
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users', value: users.length, color: 'from-slate-700 to-slate-600', icon: Users },
          { label: 'Administrators', value: totalAdmins, color: 'from-purple-600 to-purple-500', icon: Crown },
          { label: 'Support Agents', value: totalAgents, color: 'from-blue-600 to-blue-500', icon: Zap },
          { label: 'Customers', value: totalCustomers, color: 'from-emerald-600 to-emerald-500', icon: User },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-3 card-shadow">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${color} flex items-center justify-center shadow-sm flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900">{value}</div>
              <div className="text-[11px] text-slate-500 font-medium">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 card-shadow flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
        >
          <option value="">All Roles</option>
          <option value="customer">Customers</option>
          <option value="agent">Support Agents</option>
          <option value="admin">Administrators</option>
        </select>

        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-14 text-center text-slate-400">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-14 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-semibold text-slate-500">No users found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Joined</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} role={u.role} />
                        <div>
                          <div className="font-bold text-slate-800 text-sm leading-tight">{u.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">{u.phone || '—'}</td>
                    <td className="py-3.5 px-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        {u.isVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            Email Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 w-fit">
                            <AlertCircle className="w-3 h-3" />
                            Unverified
                          </span>
                        )}
                        {u.isPhoneVerified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 w-fit">
                            <Phone className="w-3 h-3" />
                            Phone ✓
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] hidden md:table-cell">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditUser(u);
                          setNewRole(u.role);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 font-bold text-[11px] rounded-lg transition-colors"
                      >
                        Change Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {!isLoading && users.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Showing {users.length} user{users.length !== 1 ? 's' : ''}</span>
            <span>{verifiedCount} email-verified</span>
          </div>
        )}
      </div>

      {/* ─── Role Change Modal ─── */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Change User Role">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <UserAvatar name={editUser?.name} role={editUser?.role} />
            <div>
              <p className="text-sm font-bold text-slate-800">{editUser?.name}</p>
              <p className="text-xs text-slate-500">{editUser?.email}</p>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Select the new authorization role. This change takes effect immediately.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {['customer', 'agent', 'admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setNewRole(r)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 font-bold text-xs transition-all ${
                  newRole === r
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                {r === 'admin' && <Crown className={`w-5 h-5 ${newRole === r ? 'text-blue-600' : 'text-slate-400'}`} />}
                {r === 'agent' && <Zap className={`w-5 h-5 ${newRole === r ? 'text-blue-600' : 'text-slate-400'}`} />}
                {r === 'customer' && <User className={`w-5 h-5 ${newRole === r ? 'text-blue-600' : 'text-slate-400'}`} />}
                <span className="capitalize">{r}</span>
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
              Cancel
            </button>
            <button
              onClick={handleRoleUpdate}
              disabled={isUpdating || newRole === editUser?.role}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Confirm Change'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Create Admin / Agent Modal ─── */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Privileged Account">
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          {/* Role Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'admin', label: 'Administrator', icon: Crown, desc: 'Full platform access' },
                { value: 'agent', label: 'Support Agent', icon: Zap, desc: 'Handle & resolve tickets' },
              ].map(({ value, label, icon: Icon, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCreateForm(f => ({ ...f, role: value }))}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                    createForm.role === value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${createForm.role === value ? 'text-purple-600' : 'text-slate-400'}`} />
                  <span className={`text-xs font-bold ${createForm.role === value ? 'text-purple-800' : 'text-slate-700'}`}>{label}</span>
                  <span className="text-[10px] text-slate-500">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                minLength={2}
                placeholder="Jane Smith"
                value={createForm.name}
                onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="jane.smith@company.com"
                value={createForm.email}
                onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
            <PhoneInput
              id="create-admin-phone"
              value={createForm.phone}
              onChange={(val) => setCreateForm(f => ({ ...f, phone: val }))}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                value={createForm.password}
                onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Account will be pre-verified. No OTP required.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {createLoading ? 'Creating...' : `Create ${createForm.role === 'admin' ? 'Admin' : 'Agent'}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
