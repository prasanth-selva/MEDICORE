const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(authenticate);

router.get('/medicines', inventoryController.getMedicines);
router.get('/medicines/categories', inventoryController.getCategories);
router.get('/medicines/:medicineId/batches', inventoryController.getBatches);
router.post('/medicines', authorize('pharmacist', 'admin'), inventoryController.createMedicine);
router.put('/medicines/:id', authorize('pharmacist', 'admin'), inventoryController.updateMedicine);
router.post('/batches', authorize('pharmacist', 'admin'), inventoryController.addBatch);
router.post('/import', authorize('pharmacist', 'admin'), upload.single('file'), inventoryController.importCSV);

router.get('/suppliers', inventoryController.getSuppliers);
router.post('/suppliers', authorize('pharmacist', 'admin'), inventoryController.createSupplier);

router.get('/stats', inventoryController.getStats);

module.exports = router;
