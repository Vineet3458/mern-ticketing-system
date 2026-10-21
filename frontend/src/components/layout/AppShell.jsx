import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { EmailSimulatorModal } from '../simulator/EmailSimulatorModal.jsx';

export const AppShell = () => {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Persistent Sidebar */}
      <Sidebar onOpenSimulator={() => setIsSimulatorOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pl-64 min-w-0">
        <Topbar onOpenSimulator={() => setIsSimulatorOpen(true)} />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Inbound Email Simulator Modal */}
      <EmailSimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
      />
    </div>
  );
};
