const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, billingRules, uuidParam } = require('../middleware/validator');

router.use(authenticate);

/**
 * @swagger
 * /billing:
 *   get:
 *     summary: Get all billing records
 *     tags: [Billing]
 */
router.get('/', billingController.getAll);

/**
 * @swagger
 * /billing/revenue:
 *   get:
 *     summary: Get revenue analytics
 *     tags: [Billing]
 */
router.get('/revenue', billingController.getRevenue);

/**
 * @swagger
 * /billing/{id}/invoice:
 *   get:
 *     summary: Download invoice as PDF
 *     tags: [Billing]
 *     produces:
 *       - application/pdf
 */
router.get('/:id/invoice', ...uuidParam(), validate, billingController.downloadInvoice);

/**
 * @swagger
 * /billing:
 *   post:
 *     summary: Create billing record (pharmacist/receptionist/admin)
 *     tags: [Billing]
 */
router.post('/', authorize('pharmacist', 'receptionist', 'admin'), billingRules, validate, billingController.create);

/**
 * @swagger
 * /billing/{id}/pay:
 *   patch:
 *     summary: Process payment
 *     tags: [Billing]
 */
router.patch('/:id/pay', authorize('pharmacist', 'receptionist', 'admin'), ...uuidParam(), validate, billingController.processPayment);

module.exports = router;
