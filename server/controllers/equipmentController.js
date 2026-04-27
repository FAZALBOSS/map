const { equipment, getAllEquipment, getEquipmentById, updateEquipment } = require('../data/equipment');
const {
  haversineKm,
  hasBookingOverlap,
  isCurrentlyBusy,
  getCurrentBooking,
  getNextAvailableAt,
  getEquipmentStats,
} = require('../services/equipmentService');

// GET /equipment
function listEquipment(req, res) {
  let results = [...equipment];

  // Filter by category
  if (req.query.category) {
    results = results.filter(
      (e) => e.category.toLowerCase() === req.query.category.toLowerCase()
    );
  }

  // Filter by status
  if (req.query.status) {
    results = results.filter(
      (e) => e.status.toLowerCase() === req.query.status.toLowerCase()
    );
  }

  const total = results.length;
  const available = results.filter((e) => e.status === 'available').length;
  const busy = results.filter((e) => e.status === 'busy').length;

  res.json({ equipment: results, total, available, busy });
}

// GET /equipment/stats
function getStats(req, res) {
  const stats = getEquipmentStats();
  res.json(stats);
}

// GET /equipment/nearby
function getNearby(req, res) {
  const { lat, lng, radius } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query params are required' });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radiusKm = parseFloat(radius) || 10;

  const results = equipment
    .map((e) => ({
      ...e,
      distanceKm: parseFloat(haversineKm(userLat, userLng, e.lat, e.lng).toFixed(2)),
    }))
    .filter((e) => e.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  res.json({
    equipment: results,
    userLocation: { lat: userLat, lng: userLng },
    radiusKm,
    count: results.length,
  });
}

// GET /equipment/:id
function getOneEquipment(req, res) {
  const equip = getEquipmentById(req.params.id);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });
  res.json(equip);
}

// POST /equipment/:id/book
function bookEquipment(req, res) {
  const equip = getEquipmentById(req.params.id);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });

  const { bookedBy, phone, startTime, endTime, purpose } = req.body;

  if (!bookedBy || !startTime || !endTime) {
    return res.status(400).json({ error: 'bookedBy, startTime, and endTime are required' });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return res.status(400).json({ error: 'endTime must be after startTime' });
  }

  const durationHours = (end - start) / 3600000;
  if (durationHours > 24) {
    return res.status(400).json({ error: 'Maximum booking duration is 24 hours' });
  }

  if (equip.status === 'maintenance' || equip.status === 'offline') {
    return res.status(400).json({ error: `Equipment is currently ${equip.status}` });
  }

  if (hasBookingOverlap(equip, startTime, endTime)) {
    return res.status(409).json({ error: 'Time slot conflicts with an existing booking' });
  }

  const bookingId = `BOOK-${Date.now().toString(36).toUpperCase()}`;
  const booking = {
    id: bookingId,
    bookedBy,
    phone: phone || '',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    purpose: purpose || '',
  };

  equip.bookings.push(booking);

  // Check if booking is happening now
  const now = new Date();
  if (now >= start && now < end) {
    equip.status = 'busy';
    equip.currentBooking = booking;
    equip.nextAvailableAt = end.toISOString();
  }

  equip.lastUpdated = new Date().toISOString();

  // Emit socket events
  req.io.emit('equipment:booked', equip);
  req.io.emit('equipment:update', equip);

  res.status(201).json({ success: true, booking, equipment: equip });
}

// DELETE /equipment/:id/book/:bookingId
function cancelBooking(req, res) {
  const equip = getEquipmentById(req.params.id);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });

  const bookingIdx = equip.bookings.findIndex((b) => b.id === req.params.bookingId);
  if (bookingIdx === -1) return res.status(404).json({ error: 'Booking not found' });

  equip.bookings.splice(bookingIdx, 1);

  // Re-evaluate status
  if (isCurrentlyBusy(equip)) {
    equip.status = 'busy';
    equip.currentBooking = getCurrentBooking(equip);
    equip.nextAvailableAt = getNextAvailableAt(equip);
  } else if (equip.status === 'busy') {
    equip.status = 'available';
    equip.currentBooking = null;
    equip.nextAvailableAt = null;
  }

  equip.lastUpdated = new Date().toISOString();

  req.io.emit('equipment:available', equip);
  req.io.emit('equipment:update', equip);

  res.json({ success: true, equipment: equip });
}

// POST /equipment/:id/location
function updateEquipmentLocation(req, res) {
  const equip = getEquipmentById(req.params.id);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });

  const { lat, lng, accuracy } = req.body;

  if (lat == null || lng == null) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  equip.lat = parseFloat(lat);
  equip.lng = parseFloat(lng);
  if (accuracy != null) equip.accuracy = parseFloat(accuracy);
  equip.lastUpdated = new Date().toISOString();

  req.io.emit('equipment:update', equip);

  res.json({ success: true, equipment: equip });
}

// PUT /equipment/:id/status
function updateEquipmentStatus(req, res) {
  const equip = getEquipmentById(req.params.id);
  if (!equip) return res.status(404).json({ error: 'Equipment not found' });

  const { status } = req.body;
  const validStatuses = ['available', 'busy', 'maintenance', 'offline'];

  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${validStatuses.join(', ')}`,
    });
  }

  equip.status = status;
  equip.lastUpdated = new Date().toISOString();

  // Clear booking info if set to available
  if (status === 'available' || status === 'maintenance' || status === 'offline') {
    equip.currentBooking = null;
    equip.nextAvailableAt = null;
  }

  req.io.emit('equipment:update', equip);

  res.json({ success: true, equipment: equip });
}

module.exports = {
  listEquipment,
  getStats,
  getNearby,
  getOneEquipment,
  bookEquipment,
  cancelBooking,
  updateEquipmentLocation,
  updateEquipmentStatus,
};
