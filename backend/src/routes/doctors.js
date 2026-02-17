const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', doctorController.getAll);
router.get('/:id', doctorController.getById);
router.get('/:id/queue', doctorController.getQueue);
router.get('/:id/stats', doctorController.getStats);
router.post('/', authorize('admin'), doctorController.create);
router.put('/:id', doctorController.update);
router.patch('/:id/status', authorize('doctor', 'admin'), doctorController.updateStatus);

module.exports = router;
