const express = require('express');
const router = express.Router();
const bookingsController = require('../controllers/bookingsController');

// Route to get all doctors
router.get('/doctors', bookingsController.getDoctors);

// Route to get available slots for a doctor
router.get('/doctors/:clinicianId/slots', bookingsController.getSlots);

// Route to get all slots across all doctors (for calendar view)
router.get('/allbookings', bookingsController.getAllBookings);

// Route to get detailed information for a specific slot
router.get('/slots/:slotId', bookingsController.getSlotDetails);

module.exports = router;