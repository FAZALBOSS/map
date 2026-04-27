import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, MapPin, Calendar, Fuel, Gauge, Wrench } from 'lucide-react';
import {
  CATEGORY_ICONS,
  STATUS_COLORS,
  STATUS_LABELS,
  STATUS_BG,
  STATUS_TEXT,
  STATUS_BORDER,
} from '../../utils/equipmentConfig';

function MiniMap({ lat, lng }) {
  const mapContainerRef = useRef(null);
  const miniMapRef = useRef(null);

  useEffect(() => {
    if (!window.L || !mapContainerRef.current) return;

    // Clean up any existing map
    if (miniMapRef.current) {
      miniMapRef.current.remove();
      miniMapRef.current = null;
    }

    const map = window.L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    }).setView([lat, lng], 14);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    window.L.circleMarker([lat, lng], {
      radius: 8,
      fillColor: '#2563eb',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    }).addTo(map);

    miniMapRef.current = map;

    return () => {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
      }
    };
  }, [lat, lng]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[120px] rounded-lg overflow-hidden border border-gray-200"
      style={{ zIndex: 0 }}
    />
  );
}

export default function EquipmentDetailDrawer({ equipment: equip, onClose, onBook, userLat, userLng }) {
  if (!equip) return null;

  const icon = CATEGORY_ICONS[equip.category] || '🔧';
  const statusColor = STATUS_COLORS[equip.status] || '#6b7280';
  const statusLabel = STATUS_LABELS[equip.status] || 'Unknown';

  // Calculate distance
  let distanceText = null;
  if (userLat != null && userLng != null) {
    const R = 6371;
    const dLat = ((equip.lat - userLat) * Math.PI) / 180;
    const dLng = ((equip.lng - userLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((userLat * Math.PI) / 180) *
        Math.cos((equip.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceText = dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`;
  }

  // Upcoming bookings today
  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const todayBookings = (equip.bookings || []).filter((b) => {
    const start = new Date(b.startTime);
    return start <= todayEnd && new Date(b.endTime) > now;
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed right-0 top-0 h-full w-[380px] bg-white shadow-2xl overflow-y-auto z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
            <span className="text-sm font-semibold text-gray-900">Equipment Details</span>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Equipment icon & name */}
            <div className="text-center">
              <div className="text-5xl mb-3">{icon}</div>
              <h3 className="text-lg font-bold text-gray-900">{equip.name}</h3>
              <p className="text-sm text-gray-500">{equip.category}</p>
              <div className="mt-2 inline-flex">
                <span
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${STATUS_BG[equip.status]} ${STATUS_TEXT[equip.status]} ${STATUS_BORDER[equip.status]}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
                  {statusLabel}
                </span>
              </div>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 gap-3">
              {equip.horsepower > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Horsepower</div>
                    <div className="text-sm font-semibold text-gray-900">{equip.horsepower} HP</div>
                  </div>
                </div>
              )}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Year</div>
                  <div className="text-sm font-semibold text-gray-900">{equip.yearOfMake}</div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                <Fuel className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Fuel</div>
                  <div className="text-sm font-semibold text-gray-900">{equip.fuelType}</div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                <span className="text-sm">💰</span>
                <div>
                  <div className="text-xs text-gray-500">Price</div>
                  <div className="text-sm font-semibold text-gray-900">₹{equip.pricePerHour}/hr</div>
                </div>
              </div>
            </div>

            {/* Owner info */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-2">Owner</div>
              <div className="text-sm font-medium text-gray-900">{equip.owner}</div>
              <a
                href={`tel:${equip.contact}`}
                className="flex items-center gap-1.5 mt-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                <Phone className="w-3.5 h-3.5" />
                {equip.contact}
              </a>
            </div>

            {/* Distance & Location */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Location</div>
                {distanceText && (
                  <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {distanceText} away
                  </span>
                )}
              </div>
              <MiniMap lat={equip.lat} lng={equip.lng} />
              <div className="text-xs text-gray-400 font-mono mt-1.5 text-center">
                {equip.lat.toFixed(6)}, {equip.lng.toFixed(6)}
              </div>
            </div>

            {/* Next Available */}
            {equip.nextAvailableAt && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-[11px] font-semibold text-amber-700 mb-1">Next Available</div>
                <div className="text-sm text-amber-800 font-medium">
                  {new Date(equip.nextAvailableAt).toLocaleString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            )}

            {/* Today's bookings */}
            {todayBookings.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Today's Bookings
                </div>
                <div className="space-y-2">
                  {todayBookings.map((b, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{b.bookedBy}</span>
                        <span className="text-[11px] text-gray-500">
                          {new Date(b.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {b.purpose && (
                        <p className="text-xs text-gray-500 mt-1">{b.purpose}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            {equip.status === 'available' && (
              <button
                onClick={() => onBook && onBook(equip)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition-colors active:scale-[0.98]"
              >
                Book This Equipment
              </button>
            )}

            {equip.status === 'busy' && (
              <div className="text-center text-sm text-gray-500">
                <Wrench className="w-4 h-4 inline mr-1" />
                This equipment is currently in use
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
