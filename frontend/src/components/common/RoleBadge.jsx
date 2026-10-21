import React from 'react';

const roleConfig = {
  admin: {
    label: 'Admin',
    bg: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  agent: {
    label: 'Support Agent',
    bg: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  customer: {
    label: 'Customer',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

export const RoleBadge = ({ role = 'customer' }) => {
  const cfg = roleConfig[role] || roleConfig.customer;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
};
