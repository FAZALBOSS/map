import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Phone } from 'lucide-react';
import {
  CATEGORY_ICONS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_BG,
  STATUS_TEXT,
  STATUS_BORDER,
} from '../../utils/equipmentConfig';

function CountdownTimer({ endTime }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end - now;
      if (diff <= 0) {
        setRemaining('Ending soon');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${hours}h ${mins}m left`);
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [endTime]);

  return <span>{remaining}</span>;
}

function DistanceBadge({ distanceKm }) {
  if (distanceKm == null) return null;
  const display = distanceKm < 1
    ? `${Math.round(distanceKm * 1000)} m away`
    : `${distanceKm.toFixed(1)} km away`;

  return (
    <span className="flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
      <MapPin className="w-3 h-3" />
      {display}
    </span>
  );
}

export default function EquipmentCard({
  equipment: equip,
  distanceKm,
  onViewOnMap,
  onBookNow,
  onViewDetails,
}) {
  const icon = CATEGORY_ICONS[equip.category] || '🔧';
  const statusColor = STATUS_COLORS[equip.status] || STATUS_COLORS.offline;
  const statusLabel = STATUS_LABELS[equip.status] || 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className="group relative p-4 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onViewDetails && onViewDetails(equip)}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-50 border border-gray-100 text-xl">
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 leading-tight">{equip.name}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-xs text-gray-500">{equip.category}</p>
              <span className="text-gray-300">·</span>
              <p className="text-xs text-gray-400">{equip.owner}</p>
            </div>
          </div>
        </div>

        {/* Status badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${STATUS_BG[equip.status]} ${STATUS_TEXT[equip.status]} ${STATUS_BORDER[equip.status]}`}
        >
          <div className="relative">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: statusColor }}
            />
            {equip.status === 'busy' && (
              <div
                className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                style={{ background: statusColor, opacity: 0.4 }}
              />
            )}
          </div>
          {statusLabel}
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <DistanceBadge distanceKm={distanceKm} />
        <span className="text-[11px] font-semibold text-gray-700 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
          ₹{equip.pricePerHour}/hr
        </span>
        {equip.horsepower > 0 && (
          <span className="text-[11px] text-gray-500">{equip.horsepower} HP</span>
        )}
      </div>

      {/* Busy info */}
      {equip.status === 'busy' && equip.currentBooking && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5">
          <Clock className="w-3 h-3" />
          <span>Busy until {new Date(equip.currentBooking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-red-400">·</span>
          <CountdownTimer endTime={equip.currentBooking.endTime} />
        </div>
      )}

      {/* Available info */}
      {equip.status === 'available' && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600">
          <span>✓ Available Now</span>
        </div>
      )}

      {/* Next available */}
      {equip.nextAvailableAt && equip.status !== 'available' && (
        <div className="mt-1 text-[11px] text-gray-500">
          Next available: {new Date(equip.nextAvailableAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
        <button
          onClick={(e) => { e.stopPropagation(); onViewOnMap && onViewOnMap(equip); }}
          className="flex-1 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200 transition-colors"
        >
          📍 View on Map
        </button>
        {equip.status === 'available' && (
          <button
            onClick={(e) => { e.stopPropagation(); onBookNow && onBookNow(equip); }}
            className="flex-1 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-md transition-colors"
          >
            Book Now
          </button>
        )}
      </div>
    </motion.div>
  );
}
