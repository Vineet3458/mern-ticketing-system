import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  UserCheck,
  PlusCircle,
  MailCheck,
  Flame,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { fetchDashboardSummary } from '../../features/dashboard/dashboardSlice.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { PriorityBadge } from '../../components/common/PriorityBadge.jsx';
import { EmailSimulatorModal } from '../../components/simulator/EmailSimulatorModal.jsx';

export const DashboardPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { metrics, byPriority, byCategory, recentActivity, isLoading } = useSelector(
    (state) => state.dashboard
  );

  const [simulatorOpen, setSimulatorOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchDashboardSummary());
  }, [dispatch]);

  const isCustomer = user?.role === 'customer';

  const statCards = [
    {
      title: 'Total Tickets',
      value: metrics.total,
      icon: Ticket,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      title: 'Open Requests',
      value: metrics.open,
      icon: FolderOpen,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-100',
    },
    {
      title: 'In Progress / Pending',
      value: (metrics.inProgress || 0) + (metrics.pending || 0),
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
    {
      title: 'Resolved',
      value: metrics.resolved,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      title: 'Reopened',
      value: metrics.reopened,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
    ...(!isCustomer
      ? [
          {
            title: 'Assigned to Me',
            value: metrics.assignedToMe,
            icon: UserCheck,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            border: 'border-indigo-100',
          },
          {
            title: 'Unassigned Pool',
            value: metrics.unassigned,
            icon: AlertTriangle,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            border: 'border-purple-100',
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900 to-indigo-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Welcome back, {user?.name}
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Support Operations Center</h1>
          <p className="text-xs text-blue-200/80 mt-1">
            Real-time ticket lifecycle management, bidirectional email synchronization, and SLA analytics.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/20 transition-all shadow-sm"
          >
            <MailCheck className="w-4 h-4 text-emerald-300" />
            <span>Simulate Inbound Email</span>
          </button>

          <Link
            to="/tickets/create"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/30"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Ticket</span>
          </Link>
        </div>
      </div>

      {/* Metrics Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`bg-white p-5 rounded-2xl border ${c.border} card-shadow card-shadow-hover flex flex-col justify-between`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{c.title}</span>
                <div className={`p-2 rounded-xl ${c.bg} ${c.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{c.value || 0}</div>
            </div>
          );
        })}
      </div>

      {/* Charts & Categorization Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 card-shadow">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Priority Distribution</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">By Urgency</span>
          </div>

          <div className="space-y-3">
            {[
              { level: 'urgent', label: 'Urgent (SLA 4h)', color: 'bg-red-500', count: byPriority?.urgent || 0 },
              { level: 'high', label: 'High (SLA 12h)', color: 'bg-orange-500', count: byPriority?.high || 0 },
              { level: 'medium', label: 'Medium (SLA 24h)', color: 'bg-blue-500', count: byPriority?.medium || 0 },
              { level: 'low', label: 'Low (SLA 48h)', color: 'bg-slate-400', count: byPriority?.low || 0 },
            ].map((p, idx) => {
              const total = metrics.total || 1;
              const percent = Math.round((p.count / total) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700 capitalize">{p.label}</span>
                    <span className="font-bold text-slate-900">
                      {p.count} <span className="text-slate-400 font-normal">({percent}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${p.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 card-shadow">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Top Categories</span>
            </h3>
            <Link to="/tickets" className="text-xs font-semibold text-blue-600 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {byCategory && byCategory.length > 0 ? (
              byCategory.map((cat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <span className="font-semibold text-slate-800">{cat.category}</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-bold text-slate-700">
                    {cat.count} tickets
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No categories recorded yet.</p>
            )}
          </div>
        </div>

        {/* Quick Ticket Status Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 card-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Resolution Rate</h3>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Healthy
              </span>
            </div>

            <div className="text-center py-4">
              <div className="text-4xl font-black text-slate-900 mb-1">
                {metrics.total ? Math.round(((metrics.resolved + metrics.closed) / metrics.total) * 100) : 100}%
              </div>
              <p className="text-xs text-slate-400 font-medium">Completed Ticket Rate</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs mt-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Resolved</span>
                <span className="font-bold text-emerald-600 text-base">{metrics.resolved}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Pending Work</span>
                <span className="font-bold text-amber-600 text-base">
                  {metrics.open + metrics.inProgress + metrics.pending}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/tickets"
            className="w-full mt-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>Browse Ticket Queue</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Recent Activity Timeline Stream */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Ticket Activity Stream</h3>
            <p className="text-xs text-slate-400 mt-0.5">Chronological audit log across ticket lifecycles</p>
          </div>
          <Link to="/tickets" className="text-xs font-semibold text-blue-600 hover:underline">
            View All Tickets
          </Link>
        </div>

        <div className="space-y-3">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.map((act) => {
              const ticketNum = act.ticketId?.ticketNumber || 'Ticket';
              const ticketSubject = act.ticketId?.subject || '';
              return (
                <div
                  key={act._id}
                  className="flex items-start justify-between p-3.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-800">
                        <strong className="font-bold">{act.actorName}</strong>{' '}
                        <span className="text-slate-500">performed</span>{' '}
                        <span className="font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {act.action.replace('_', ' ')}
                        </span>{' '}
                        on{' '}
                        {act.ticketId ? (
                          <Link
                            to={`/tickets/${act.ticketId._id || act.ticketId}`}
                            className="font-bold text-slate-900 hover:text-blue-600 underline font-mono"
                          >
                            {ticketNum}
                          </Link>
                        ) : (
                          <span className="font-mono">{ticketNum}</span>
                        )}
                        {ticketSubject && <span className="text-slate-400 ml-1.5 truncate">({ticketSubject})</span>}
                      </div>
                      {act.newValue && (
                        <p className="text-[11px] text-slate-500 mt-1 bg-slate-50 px-2 py-1 rounded border border-slate-100 inline-block font-mono">
                          {act.oldValue ? `${act.oldValue} → ` : ''}
                          {act.newValue}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap ml-4">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">No recent activity recorded yet.</p>
          )}
        </div>
      </div>

      <EmailSimulatorModal
        isOpen={simulatorOpen}
        onClose={() => setSimulatorOpen(false)}
        onEmailProcessed={() => dispatch(fetchDashboardSummary())}
      />
    </div>
  );
};
