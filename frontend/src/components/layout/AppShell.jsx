import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

export const AppShell = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Persistent Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-64 min-w-0">
        <Topbar />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
