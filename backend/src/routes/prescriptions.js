const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', prescriptionController.getAll);
router.get('/templates', prescriptionController.getTemplates);
router.get('/:id', prescriptionController.getById);
router.post('/', authorize('doctor', 'admin'), prescriptionController.create);
router.patch('/:id/status', authorize('pharmacist', 'admin'), prescriptionController.updateStatus);

router.post('/templates', authorize('doctor', 'admin'), prescriptionController.createTemplate);
router.put('/templates/:id', authorize('doctor', 'admin'), prescriptionController.updateTemplate);
router.delete('/templates/:id', authorize('doctor', 'admin'), prescriptionController.deleteTemplate);

module.exports = router;
