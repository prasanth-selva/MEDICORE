const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sosRules, uuidParam } = require('../middleware/validator');

router.use(authenticate);

/**
 * @swagger
 * /sos:
 *   get:
 *     summary: Get all SOS alerts
 *     tags: [SOS]
 */
router.get('/', sosController.getAll);

/**
 * @swagger
 * /sos:
 *   post:
 *     summary: Create SOS emergency alert
 *     tags: [SOS]
 */
router.post('/', sosRules, validate, sosController.create);

/**
 * @swagger
 * /sos/{id}/acknowledge:
 *   patch:
 *     summary: Acknowledge SOS alert
 *     tags: [SOS]
 */
router.patch('/:id/acknowledge', authorize('doctor', 'admin', 'receptionist'), ...uuidParam(), validate, sosController.acknowledge);

/**
 * @swagger
 * /sos/{id}/resolve:
 *   patch:
 *     summary: Resolve SOS alert
 *     tags: [SOS]
 */
router.patch('/:id/resolve', authorize('doctor', 'admin'), ...uuidParam(), validate, sosController.resolve);

module.exports = router;
