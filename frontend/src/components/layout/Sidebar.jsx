import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Ticket,
  Inbox,
  PlusCircle,
  Users,
  Tags,
  MailCheck,
  LifeBuoy,
} from 'lucide-react';

export const Sidebar = ({ onOpenSimulator }) => {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'customer';
  const isAgentOrAdmin = role === 'agent' || role === 'admin';
  const isAdmin = role === 'admin';

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 tracking-tight text-base leading-none">
            BitMax<span className="text-blue-600">.</span>Desk
          </h1>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Ticketing & Email
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Workspace
        </div>

        <NavLink to="/dashboard" className={linkClass}>
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink to="/tickets" end className={linkClass}>
          <Ticket className="w-4 h-4" />
          <span>{isAgentOrAdmin ? 'All Tickets' : 'My Tickets'}</span>
        </NavLink>

        {isAgentOrAdmin && (
          <NavLink to="/tickets?view=my" className={linkClass}>
            <Inbox className="w-4 h-4" />
            <span>Assigned to Me</span>
          </NavLink>
        )}

        <NavLink to="/tickets/create" className={linkClass}>
          <PlusCircle className="w-4 h-4 text-emerald-500" />
          <span>Create Ticket</span>
        </NavLink>

        {isAdmin && (
          <>
            <div className="pt-6 px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Administration
            </div>

            <NavLink to="/admin/users" className={linkClass}>
              <Users className="w-4 h-4" />
              <span>User Management</span>
            </NavLink>

            <NavLink to="/admin/categories" className={linkClass}>
              <Tags className="w-4 h-4" />
              <span>Categories</span>
            </NavLink>
          </>
        )}
      </div>

      {/* Simulator Shortcut & Footer */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        <button
          onClick={onOpenSimulator}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-blue-700 font-semibold text-xs transition-colors"
        >
          <MailCheck className="w-4 h-4 text-blue-600" />
          <span>Simulate Email Reply</span>
        </button>

        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 live-indicator" />
            <span>Real-time Engine Live</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Socket.IO & Email Sync</p>
        </div>
      </div>
    </aside>
  );
};
