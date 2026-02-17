const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { body } = require('express-validator');

router.post('/register', [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['admin', 'doctor', 'pharmacist', 'receptionist', 'patient']),
], authController.register);

router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
], authController.login);

router.post('/refresh', authController.refreshToken);
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
