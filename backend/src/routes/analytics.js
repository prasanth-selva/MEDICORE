const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authorize } = require('../middleware/auth');

// GET /api/analytics/disease-stats
router.get('/disease-stats', authorize('admin', 'doctor', 'pharmacist'), analyticsController.getDiseaseStats);

// GET /api/analytics/medicine-usage
router.get('/medicine-usage', authorize('admin', 'pharmacist'), analyticsController.getMedicineUsage);

module.exports = router;
