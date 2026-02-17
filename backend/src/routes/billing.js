const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', billingController.getAll);
router.get('/revenue', billingController.getRevenue);
router.post('/', authorize('pharmacist', 'receptionist', 'admin'), billingController.create);
router.patch('/:id/pay', authorize('pharmacist', 'receptionist', 'admin'), billingController.processPayment);

module.exports = router;
