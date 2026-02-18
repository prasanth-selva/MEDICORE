const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { authenticate } = require('../middleware/auth');
const { validate, appointmentRules, uuidParam } = require('../middleware/validator');

router.use(authenticate);

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: Get all appointments
 *     tags: [Appointments]
 */
router.get('/', appointmentController.getAll);

/**
 * @swagger
 * /appointments/slots:
 *   get:
 *     summary: Get available appointment slots
 *     tags: [Appointments]
 */
router.get('/slots', appointmentController.getAvailableSlots);

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Book a new appointment
 *     tags: [Appointments]
 */
router.post('/', appointmentRules, validate, appointmentController.create);

/**
 * @swagger
 * /appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status
 *     tags: [Appointments]
 */
router.patch('/:id/status', ...uuidParam(), validate, appointmentController.updateStatus);

module.exports = router;
