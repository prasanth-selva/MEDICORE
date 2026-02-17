const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', patientController.getAll);
router.get('/search', patientController.search);
router.get('/:id', patientController.getById);
router.get('/:id/history', patientController.getHistory);
router.post('/', patientController.create);
router.put('/:id', patientController.update);

module.exports = router;
