const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, uuidParam } = require('../middleware/validator');
const { cache } = require('../middleware/cache');

router.use(authenticate);

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Dashboard]
 */
router.get('/stats', authorize('admin', 'receptionist'), cache(30), dashboardController.getAdminStats);

/**
 * @swagger
 * /dashboard/diseases:
 *   get:
 *     summary: Get disease analytics
 *     tags: [Dashboard]
 */
router.get('/diseases', cache(60), dashboardController.getDiseaseAnalytics);

/**
 * @swagger
 * /dashboard/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Dashboard]
 */
router.get('/notifications', dashboardController.getNotifications);

/**
 * @swagger
 * /dashboard/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Dashboard]
 */
router.patch('/notifications/:id/read', ...uuidParam(), validate, dashboardController.markNotificationRead);

module.exports = router;
