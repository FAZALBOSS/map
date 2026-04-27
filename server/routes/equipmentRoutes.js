const { Router } = require('express');
const {
  listEquipment,
  getStats,
  getNearby,
  getOneEquipment,
  bookEquipment,
  cancelBooking,
  updateEquipmentLocation,
  updateEquipmentStatus,
} = require('../controllers/equipmentController');

const router = Router();

// Static routes first (before :id param routes)
router.get('/stats', getStats);
router.get('/nearby', getNearby);

// CRUD routes
router.get('/', listEquipment);
router.get('/:id', getOneEquipment);

// Booking routes
router.post('/:id/book', bookEquipment);
router.delete('/:id/book/:bookingId', cancelBooking);

// Location update
router.post('/:id/location', updateEquipmentLocation);

// Status update (admin)
router.put('/:id/status', updateEquipmentStatus);

module.exports = router;
