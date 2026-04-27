import React from 'react';
import { motion } from 'framer-motion';
import { STATUS_COLORS } from '../../utils/equipmentConfig';

function DonutChart({ available, busy, maintenance, offline, total }) {
  if (total === 0) return null;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const segments = [
    { value: available, color: STATUS_COLORS.available, label: 'Available' },
    { value: busy, color: STATUS_COLORS.busy, label: 'Busy' },
    { value: maintenance, color: STATUS_COLORS.maintenance, label: 'Maintenance' },
    { value: offline, color: STATUS_COLORS.offline, label: 'Offline' },
  ].filter((s) => s.value > 0);

  let offset = 0;
  const utilization = total > 0 ? Math.round((busy / total) * 100) : 0;

  return (
    <div className="flex items-center justify-center gap-4">
      <div className="relative">
        <svg width="100" height="100" viewBox="0 0 100 100">
          {segments.map((seg, i) => {
            const strokeLen = (seg.value / total) * circumference;
            const gap = circumference - strokeLen;
            const currentOffset = offset;
            offset += strokeLen;
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="10"
                strokeDasharray={`${strokeLen} ${gap}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{utilization}%</span>
          <span className="text-[9px] text-gray-500 uppercase tracking-wider">Utilization</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: seg.color }} />
            <span>{seg.label}: {seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EquipmentStats({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: '🚜' },
    { label: 'Available', value: stats.available, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: '✅' },
    { label: 'Busy', value: stats.busy, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: '🔴' },
    { label: 'Maintenance', value: stats.maintenance, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: '🔧' },
  ];

  return (
    <div className="mb-4">
      <div className="grid grid-cols-4 gap-2 mb-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${card.bg} p-2.5 rounded-lg border ${card.border} text-center`}
          >
            <div className="text-base mb-0.5">{card.icon}</div>
            <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
            <div className="text-[9px] font-medium text-gray-500 uppercase tracking-wider">{card.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
        <DonutChart
          available={stats.available || 0}
          busy={stats.busy || 0}
          maintenance={stats.maintenance || 0}
          offline={stats.offline || 0}
          total={stats.total || 0}
        />
      </div>
    </div>
  );
}
