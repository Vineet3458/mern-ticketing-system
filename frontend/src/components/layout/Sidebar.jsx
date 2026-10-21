import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  LayoutDashboard,
  Ticket,
  Inbox,
  PlusCircle,
  Tags,
  LifeBuoy,
  Users,
  UserPlus,
  Crown,
  Zap,
} from 'lucide-react';

const NavItem = ({ to, icon: Icon, children, color = 'text-slate-500', isActive = false }) => (
  <Link
    to={to}
    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-[13px] transition-all duration-150 group ${
      isActive
        ? 'bg-blue-600 text-white shadow-md nav-active-glow'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
    }`}
  >
    <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-white' : color}`} />
    <span>{children}</span>
  </Link>
);

const SectionLabel = ({ children, className = '' }) => (
  <div className={`px-3 pb-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest ${className}`}>
    {children}
  </div>
);

export const Sidebar = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentView = searchParams.get('view');
  const pathname = location.pathname;

  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'customer';
  const isAgentOrAdmin = role === 'agent' || role === 'admin';
  const isAdmin = role === 'admin';

  // Accurate active state logic
  const isDashboardActive = pathname === '/dashboard' || pathname === '/';
  
  // "All Tickets" / "My Tickets"
  // Active on /tickets only when not in 'my' or 'unassigned' view
  const isAllTicketsActive = pathname === '/tickets' && (!isAgentOrAdmin || !currentView || currentView === 'all');
  
  // "Assigned to Me"
  // Active ONLY when on /tickets AND view query parameter is explicitly 'my'
  const isAssignedToMeActive = pathname === '/tickets' && currentView === 'my';
  
  // "New Ticket"
  // Active ONLY on /tickets/create
  const isNewTicketActive = pathname === '/tickets/create';
  
  const isCategoriesActive = pathname.startsWith('/categories');
  const isAdminUsersActive = pathname.startsWith('/admin/users');

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100/80">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/25 flex-shrink-0">
          <LifeBuoy className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 tracking-tight text-base leading-none">
            BitMax<span className="text-blue-600">.</span>Desk
          </h1>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Ticketing & Email
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3.5 py-5 space-y-0.5 overflow-y-auto">
        <SectionLabel className="mb-1">Workspace</SectionLabel>

        <NavItem to="/dashboard" icon={LayoutDashboard} color="text-blue-500" isActive={isDashboardActive}>
          Dashboard
        </NavItem>

        <NavItem to="/tickets" icon={Ticket} color="text-indigo-500" isActive={isAllTicketsActive}>
          {isAgentOrAdmin ? 'All Tickets' : 'My Tickets'}
        </NavItem>

        {isAgentOrAdmin && (
          <NavItem to="/tickets?view=my" icon={Inbox} color="text-violet-500" isActive={isAssignedToMeActive}>
            Assigned to Me
          </NavItem>
        )}

        <NavItem to="/tickets/create" icon={PlusCircle} color="text-emerald-500" isActive={isNewTicketActive}>
          New Ticket
        </NavItem>

        <NavItem to="/categories" icon={Tags} color="text-sky-500" isActive={isCategoriesActive}>
          Categories
        </NavItem>

        {isAdmin && (
          <>
            <div className="pt-4">
              <SectionLabel>Administration</SectionLabel>
            </div>

            <NavItem to="/admin/users" icon={Users} color="text-purple-500" isActive={isAdminUsersActive}>
              User Management
            </NavItem>

            <div
              className="flex items-center gap-3 px-3.5 py-2 rounded-xl font-medium text-[13px] text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 cursor-pointer transition-all group"
              onClick={() => {
                // Navigate to admin users page and signal to open create modal
                window.dispatchEvent(new CustomEvent('open-create-admin-modal'));
                window.location.hash = 'create-admin';
                // Programmatic click on the create admin button if on that page
                const btn = document.getElementById('create-admin-btn');
                if (btn) btn.click();
              }}
            >
              <UserPlus className="w-4 h-4 text-purple-500 flex-shrink-0" />
              <span>Create Admin/Agent</span>
            </div>
          </>
        )}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-100">

        {/* User Identity Footer */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm ${
            role === 'admin' ? 'bg-gradient-to-tr from-purple-600 to-purple-500' :
            role === 'agent' ? 'bg-gradient-to-tr from-blue-600 to-blue-500' :
            'bg-gradient-to-tr from-slate-700 to-slate-600'
          }`}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate leading-tight">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
          </div>
          {role === 'admin' && <Crown className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
          {role === 'agent' && <Zap className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
        </div>
      </div>
    </aside>
  );
};
