const express = require('express');
const router = express.Router();
const sosController = require('../controllers/sosController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', sosController.getAll);
router.post('/', sosController.create);
router.patch('/:id/acknowledge', authorize('doctor', 'admin', 'receptionist'), sosController.acknowledge);
router.patch('/:id/resolve', authorize('doctor', 'admin'), sosController.resolve);

module.exports = router;
