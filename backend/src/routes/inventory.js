const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, medicineRules, batchRules, paginationQuery } = require('../middleware/validator');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { cache } = require('../middleware/cache');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

/**
 * @swagger
 * /inventory/medicines:
 *   get:
 *     summary: Get all medicines with stock info
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 */
router.get('/medicines', cache(30), paginationQuery, validate, inventoryController.getMedicines);

/**
 * @swagger
 * /inventory/medicines/categories:
 *   get:
 *     summary: Get all medicine categories
 *     tags: [Inventory]
 */
router.get('/medicines/categories', cache(120), inventoryController.getCategories);

router.get('/medicines/:medicineId/batches', inventoryController.getBatches);

/**
 * @swagger
 * /inventory/medicines:
 *   post:
 *     summary: Add a new medicine (pharmacist/admin)
 *     tags: [Inventory]
 */
router.post('/medicines', authorize('pharmacist', 'admin'), medicineRules, validate, inventoryController.createMedicine);

router.put('/medicines/:id', authorize('pharmacist', 'admin'), inventoryController.updateMedicine);

/**
 * @swagger
 * /inventory/batches:
 *   post:
 *     summary: Add new batch (pharmacist/admin)
 *     tags: [Inventory]
 */
router.post('/batches', authorize('pharmacist', 'admin'), batchRules, validate, inventoryController.addBatch);

/**
 * @swagger
 * /inventory/import:
 *   post:
 *     summary: Import medicines from CSV (pharmacist/admin)
 *     tags: [Inventory]
 */
router.post('/import', authorize('pharmacist', 'admin'), uploadLimiter, upload.single('file'), inventoryController.importCSV);

router.get('/suppliers', inventoryController.getSuppliers);
router.post('/suppliers', authorize('pharmacist', 'admin'), inventoryController.createSupplier);

/**
 * @swagger
 * /inventory/stats:
 *   get:
 *     summary: Get inventory statistics
 *     tags: [Inventory]
 */
router.get('/stats', cache(60), inventoryController.getStats);

module.exports = router;
