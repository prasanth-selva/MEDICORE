const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, patientRules, uuidParam, paginationQuery } = require('../middleware/validator');

router.use(authenticate);

/**
 * @swagger
 * /patients:
 *   get:
 *     summary: Get all patients
 *     tags: [Patients]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of patients
 */
router.get('/', paginationQuery, validate, patientController.getAll);

/**
 * @swagger
 * /patients/search:
 *   get:
 *     summary: Search patients by name, code, or phone
 *     tags: [Patients]
 */
router.get('/search', patientController.search);

/**
 * @swagger
 * /patients/{id}:
 *   get:
 *     summary: Get patient by ID
 *     tags: [Patients]
 */
router.get('/:id', ...uuidParam(), validate, patientController.getById);

/**
 * @swagger
 * /patients/{id}/history:
 *   get:
 *     summary: Get patient medical history
 *     tags: [Patients]
 */
router.get('/:id/history', ...uuidParam(), validate, patientController.getHistory);

/**
 * @swagger
 * /patients:
 *   post:
 *     summary: Register a new patient
 *     tags: [Patients]
 */
router.post('/', patientRules, validate, patientController.create);

/**
 * @swagger
 * /patients/{id}:
 *   put:
 *     summary: Update patient details
 *     tags: [Patients]
 */
router.put('/:id', ...uuidParam(), validate, patientController.update);

module.exports = router;
