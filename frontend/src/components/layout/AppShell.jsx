import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-slate-50 flex">
      {/* Persistent Sidebar */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Dismiss navigation overlay"
          className="fixed inset-0 z-30 bg-slate-950/40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 xl:pl-64">
        <Topbar
          onMenuClick={() => setSidebarOpen((open) => !open)}
          isSidebarOpen={sidebarOpen}
        />
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
