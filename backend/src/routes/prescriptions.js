const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, prescriptionRules, uuidParam } = require('../middleware/validator');

router.use(authenticate);

/**
 * @swagger
 * /prescriptions:
 *   get:
 *     summary: Get all prescriptions
 *     tags: [Prescriptions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, received, dispensed] }
 */
router.get('/', prescriptionController.getAll);

/**
 * @swagger
 * /prescriptions/templates:
 *   get:
 *     summary: Get prescription templates
 *     tags: [Prescriptions]
 */
router.get('/templates', prescriptionController.getTemplates);

/**
 * @swagger
 * /prescriptions/{id}:
 *   get:
 *     summary: Get prescription by ID
 *     tags: [Prescriptions]
 */
router.get('/:id', ...uuidParam(), validate, prescriptionController.getById);

/**
 * @swagger
 * /prescriptions/{id}/pdf:
 *   get:
 *     summary: Download prescription as PDF
 *     tags: [Prescriptions]
 *     produces:
 *       - application/pdf
 */
router.get('/:id/pdf', ...uuidParam(), validate, prescriptionController.downloadPDF);

/**
 * @swagger
 * /prescriptions:
 *   post:
 *     summary: Create a new prescription (doctor/admin only)
 *     tags: [Prescriptions]
 */
router.post('/', authorize('doctor', 'admin'), prescriptionRules, validate, prescriptionController.create);

/**
 * @swagger
 * /prescriptions/{id}/status:
 *   patch:
 *     summary: Update prescription status (pharmacist/admin)
 *     tags: [Prescriptions]
 */
router.patch('/:id/status', authorize('pharmacist', 'admin'), ...uuidParam(), validate, prescriptionController.updateStatus);

router.post('/templates', authorize('doctor', 'admin'), prescriptionController.createTemplate);
router.put('/templates/:id', authorize('doctor', 'admin'), prescriptionController.updateTemplate);
router.delete('/templates/:id', authorize('doctor', 'admin'), prescriptionController.deleteTemplate);

module.exports = router;
