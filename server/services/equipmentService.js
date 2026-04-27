const { equipment, updateEquipment } = require('../data/equipment');

/**
 * Haversine formula — returns distance in kilometers between two coordinates
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Format distance for display
 */
function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Check if equipment is currently busy based on booking times
 */
function isCurrentlyBusy(equip) {
  const now = new Date();
  if (!equip.bookings || equip.bookings.length === 0) return false;
  return equip.bookings.some((b) => {
    const start = new Date(b.startTime);
    const end = new Date(b.endTime);
    return now >= start && now < end;
  });
}

/**
 * Get the current active booking if any
 */
function getCurrentBooking(equip) {
  const now = new Date();
  if (!equip.bookings || equip.bookings.length === 0) return null;
  return (
    equip.bookings.find((b) => {
      const start = new Date(b.startTime);
      const end = new Date(b.endTime);
      return now >= start && now < end;
    }) || null
  );
}

/**
 * Get next available time for equipment
 */
function getNextAvailableAt(equip) {
  const now = new Date();
  if (!equip.bookings || equip.bookings.length === 0) return null;

  // Sort bookings by endTime
  const sortedBookings = [...equip.bookings]
    .filter((b) => new Date(b.endTime) > now)
    .sort((a, b) => new Date(a.endTime) - new Date(b.endTime));

  const currentBooking = getCurrentBooking(equip);
  if (currentBooking) {
    return currentBooking.endTime;
  }
  return null;
}

/**
 * Check for booking time overlaps
 */
function hasBookingOverlap(equip, startTime, endTime) {
  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  return equip.bookings.some((b) => {
    const existingStart = new Date(b.startTime);
    const existingEnd = new Date(b.endTime);
    return newStart < existingEnd && newEnd > existingStart;
  });
}

/**
 * Calculate equipment stats
 */
function getEquipmentStats() {
  const total = equipment.length;
  const available = equipment.filter((e) => e.status === 'available').length;
  const busy = equipment.filter((e) => e.status === 'busy').length;
  const maintenance = equipment.filter((e) => e.status === 'maintenance').length;
  const offline = equipment.filter((e) => e.status === 'offline').length;

  const byCategory = {};
  equipment.forEach((e) => {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
  });

  const utilization = total > 0 ? `${Math.round((busy / total) * 100)}%` : '0%';

  return { total, available, busy, maintenance, offline, byCategory, utilization };
}

/**
 * Auto-status updater — runs periodically and checks booking times
 * to automatically set status to "busy" or "available"
 */
let statusUpdaterInterval = null;

function autoStatusUpdater(io) {
  if (statusUpdaterInterval) clearInterval(statusUpdaterInterval);

  statusUpdaterInterval = setInterval(() => {
    let changed = false;

    equipment.forEach((equip) => {
      // Skip items in maintenance or offline — those are manual
      if (equip.status === 'maintenance' || equip.status === 'offline') return;

      const busy = isCurrentlyBusy(equip);
      const currentBooking = getCurrentBooking(equip);
      const nextAvailable = getNextAvailableAt(equip);

      if (busy && equip.status !== 'busy') {
        equip.status = 'busy';
        equip.currentBooking = currentBooking;
        equip.nextAvailableAt = nextAvailable;
        equip.lastUpdated = new Date().toISOString();
        changed = true;
      } else if (!busy && equip.status === 'busy') {
        equip.status = 'available';
        equip.currentBooking = null;
        equip.nextAvailableAt = null;
        equip.lastUpdated = new Date().toISOString();
        changed = true;
        if (io) {
          io.emit('equipment:available', equip);
        }
      }
    });

    if (changed && io) {
      io.emit('equipment:all', equipment);
    }
  }, 60000); // Every 60 seconds

  return () => clearInterval(statusUpdaterInterval);
}

module.exports = {
  haversineKm,
  formatDistance,
  isCurrentlyBusy,
  getCurrentBooking,
  getNextAvailableAt,
  hasBookingOverlap,
  getEquipmentStats,
  autoStatusUpdater,
};
