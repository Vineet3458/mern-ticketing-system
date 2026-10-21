import React, { useEffect, useState } from 'react';
import { Search, UserCheck, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api.js';
import { RoleBadge } from '../../components/common/RoleBadge.jsx';
import { Modal } from '../../components/common/Modal.jsx';

export const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Role Edit Modal
  const [editUser, setEditUser] = useState(null);
  const [newRole, setNewRole] = useState('customer');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/users', {
        params: { search: search.trim(), role: roleFilter },
      });
      setUsers(res.data.data || []);
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
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await api.patch(`/users/${editUser._id}/role`, { role: newRole });
      setSuccessMsg(`User role updated to ${newRole}`);
      setEditUser(null);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">User Administration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage user roles, agent privileges, and authentication status.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 card-shadow flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        >
          <option value="">All Roles</option>
          <option value="customer">Customers</option>
          <option value="agent">Support Agents</option>
          <option value="admin">Administrators</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs font-semibold">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800">{u.name}</td>
                    <td className="py-3 px-4 text-slate-600">{u.email}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{u.phone}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Verified
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditUser(u);
                          setNewRole(u.role);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-colors"
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
      </div>

      {/* Role Change Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title="Update User Role">
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Select a new authorization role for <strong>{editUser?.name}</strong> ({editUser?.email}):
          </p>

          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full text-sm border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="customer">Customer (Standard User)</option>
            <option value="agent">Support Agent (Can handle and reply to tickets)</option>
            <option value="admin">Administrator (Full administrative access)</option>
          </select>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setEditUser(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleRoleUpdate}
              disabled={isUpdating}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
            >
              {isUpdating ? 'Saving...' : 'Confirm Role Change'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
