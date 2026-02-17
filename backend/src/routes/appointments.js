const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', appointmentController.getAll);
router.get('/slots', appointmentController.getAvailableSlots);
router.post('/', appointmentController.create);
router.patch('/:id/status', appointmentController.updateStatus);

module.exports = router;
