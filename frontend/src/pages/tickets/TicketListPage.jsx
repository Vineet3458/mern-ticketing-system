import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  PlusCircle,
  Inbox,
  User,
  Clock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react';
import { fetchTickets } from '../../features/tickets/ticketSlice.js';
import { fetchCategories } from '../../features/categories/categorySlice.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { PriorityBadge } from '../../components/common/PriorityBadge.jsx';

export const TicketListPage = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useSelector((state) => state.auth);
  const { tickets, meta, isLoading } = useSelector((state) => state.tickets);
  const { categories } = useSelector((state) => state.categories);

  const isCustomer = user?.role === 'customer';
  const isAgentOrAdmin = user?.role === 'agent' || user?.role === 'admin';

  // State from URL query params
  const currentView = searchParams.get('view') || 'all';
  const currentStatus = searchParams.get('status') || '';
  const currentPriority = searchParams.get('priority') || '';
  const currentCategory = searchParams.get('category') || '';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = Number(searchParams.get('page')) || 1;
  const currentSort = searchParams.get('sortBy') || 'newest';

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    dispatch(fetchCategories(false));
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchTickets({
        view: currentView,
        status: currentStatus,
        priority: currentPriority,
        category: currentCategory,
        search: currentSearch,
        sortBy: currentSort,
        page: currentPage,
        limit: 10,
      })
    );
  }, [dispatch, currentView, currentStatus, currentPriority, currentCategory, currentSearch, currentSort, currentPage]);

  const updateParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    if (val) {
      next.set(key, val);
    } else {
      next.delete(key);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Support Tickets</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage conversations, SLA resolution timers, and customer replies.
          </p>
        </div>

        <Link
          to="/tickets/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Ticket</span>
        </Link>
      </div>

      {/* View Tabs (All / My Tickets / Unassigned) */}
      {isAgentOrAdmin && (
        <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => updateParam('view', 'all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentView === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Tickets
          </button>
          <button
            onClick={() => updateParam('view', 'my')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentView === 'my'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Assigned to Me
          </button>
          <button
            onClick={() => updateParam('view', 'unassigned')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              currentView === 'unassigned'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unassigned Queue
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 card-shadow space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by TKT number or keyword..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </form>

          {/* Status Filter */}
          <div>
            <select
              value={currentStatus}
              onChange={(e) => updateParam('status', e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="reopened">Reopened</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <select
              value={currentPriority}
              onChange={(e) => updateParam('priority', e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={currentCategory}
              onChange={(e) => updateParam('category', e.target.value)}
              className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ticket Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 card-shadow overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-medium">Loading ticket queue...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No tickets found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No support requests matched the selected filters or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Assigned To</th>
                  <th className="py-3 px-4 text-right">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t) => (
                  <tr
                    key={t._id}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      <Link to={`/tickets/${t._id}`} className="hover:underline">
                        {t.ticketNumber}
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <Link
                        to={`/tickets/${t._id}`}
                        className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block truncate"
                      >
                        {t.subject}
                      </Link>
                      <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                        {t.description}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {t.category}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{t.requesterId?.name || t.requesterEmail}</div>
                      <div className="text-[11px] text-slate-400">{t.requesterEmail}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {t.assignedTo ? (
                        <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>{t.assignedTo.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap">
                      {new Date(t.lastMessageAt || t.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {meta && meta.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Showing page <strong className="text-slate-800">{meta.page}</strong> of{' '}
              <strong className="text-slate-800">{meta.totalPages}</strong> ({meta.total} tickets total)
            </div>

            <div className="flex gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => updateParam('page', String(meta.page - 1))}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => updateParam('page', String(meta.page + 1))}
                className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
