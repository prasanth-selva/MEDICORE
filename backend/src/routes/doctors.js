const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, uuidParam } = require('../middleware/validator');
const { cache } = require('../middleware/cache');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

/**
 * @swagger
 * /doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Doctors]
 *     responses:
 *       200:
 *         description: List of doctors
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Doctor'
 */
router.get('/', cache(30), doctorController.getAll);

/**
 * @swagger
 * /doctors/{id}:
 *   get:
 *     summary: Get doctor by ID
 *     tags: [Doctors]
 */
router.get('/:id', ...uuidParam(), validate, doctorController.getById);

/**
 * @swagger
 * /doctors/{id}/queue:
 *   get:
 *     summary: Get doctor's patient queue
 *     tags: [Doctors]
 */
router.get('/:id/queue', ...uuidParam(), validate, doctorController.getQueue);

/**
 * @swagger
 * /doctors/{id}/stats:
 *   get:
 *     summary: Get doctor statistics
 *     tags: [Doctors]
 */
router.get('/:id/stats', ...uuidParam(), validate, doctorController.getStats);

/**
 * @swagger
 * /doctors/import:
 *   post:
 *     summary: Import doctors from CSV (admin only)
 *     tags: [Doctors]
 */
router.post('/import', authorize('admin'), upload.single('file'), doctorController.importCSV);

/**
 * @swagger
 * /doctors:
 *   post:
 *     summary: Add a new doctor (admin only)
 *     tags: [Doctors]
 */
router.post('/', authorize('admin'), doctorController.create);

/**
 * @swagger
 * /doctors/{id}:
 *   put:
 *     summary: Update doctor details
 *     tags: [Doctors]
 */
router.put('/:id', ...uuidParam(), validate, doctorController.update);

/**
 * @swagger
 * /doctors/{id}/status:
 *   patch:
 *     summary: Update doctor status (available, with_patient, break, etc.)
 *     tags: [Doctors]
 */
router.patch('/:id/status', authorize('doctor', 'admin'), ...uuidParam(), validate, doctorController.updateStatus);

module.exports = router;
