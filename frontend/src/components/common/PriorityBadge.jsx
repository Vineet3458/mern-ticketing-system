import React from 'react';

const priorityConfig = {
  urgent: {
    label: 'Urgent',
    bg: 'bg-red-50 text-red-700 border-red-200',
    iconColor: 'text-red-500',
  },
  high: {
    label: 'High',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    iconColor: 'text-orange-500',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-500',
  },
  low: {
    label: 'Low',
    bg: 'bg-slate-100 text-slate-600 border-slate-200',
    iconColor: 'text-slate-400',
  },
};

export const PriorityBadge = ({ priority = 'medium', size = 'sm' }) => {
  const cfg = priorityConfig[priority] || priorityConfig.medium;
  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${cfg.bg} ${sizeClasses}`}
    >
      <span className="capitalize">{cfg.label}</span>
    </span>
  );
};
