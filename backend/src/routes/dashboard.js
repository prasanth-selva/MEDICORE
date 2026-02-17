const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/stats', authorize('admin', 'receptionist'), dashboardController.getAdminStats);
router.get('/diseases', dashboardController.getDiseaseAnalytics);
router.get('/notifications', dashboardController.getNotifications);
router.patch('/notifications/:id/read', dashboardController.markNotificationRead);

module.exports = router;
