const { body, param, query, validationResult } = require('express-validator');

// Generic validation error handler
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation Error',
            code: 'VAL_001',
            details: errors.array().map(e => ({
                field: e.path,
                message: e.msg,
                value: e.value,
            })),
        });
    }
    next();
};

// ─── Auth Validators ─────────────────────────────────────────
const loginRules = [
    body('email')
        .isEmail().withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
];

const registerRules = [
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email')
        .isEmail().withMessage('Valid email is required')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('role')
        .optional()
        .isIn(['admin', 'doctor', 'pharmacist', 'receptionist', 'patient'])
        .withMessage('Invalid role'),
    body('phone')
        .optional()
        .matches(/^[+]?[\d\s-]{7,20}$/).withMessage('Invalid phone number'),
];

const forgotPasswordRules = [
    body('email')
        .isEmail().withMessage('Valid email is required')
        .normalizeEmail(),
];

const resetPasswordRules = [
    body('token')
        .notEmpty().withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const changePasswordRules = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

// ─── Patient Validators ──────────────────────────────────────
const patientRules = [
    body('first_name')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('First name is required (max 100 chars)'),
    body('last_name')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Last name is required (max 100 chars)'),
    body('phone')
        .matches(/^[+]?[\d\s-]{7,20}$/).withMessage('Valid phone number is required'),
    body('date_of_birth')
        .optional()
        .isISO8601().withMessage('Date of birth must be a valid date (YYYY-MM-DD)'),
    body('blood_group')
        .optional()
        .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
        .withMessage('Invalid blood group'),
    body('gender')
        .optional()
        .isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('email')
        .optional()
        .isEmail().withMessage('Valid email required')
        .normalizeEmail(),
    body('pincode')
        .optional()
        .matches(/^[\d]{4,10}$/).withMessage('Invalid pincode'),
];

// ─── Appointment Validators ──────────────────────────────────
const appointmentRules = [
    body('doctor_id')
        .isUUID().withMessage('Valid doctor ID is required'),
    body('scheduled_time')
        .optional()
        .isISO8601().withMessage('Valid scheduled time is required')
        .custom((value) => {
            const scheduled = new Date(value);
            const now = new Date();
            // Allow same-day appointments — only reject if the date is before today
            const scheduledDate = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());
            const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            if (scheduledDate < todayDate) {
                throw new Error('Scheduled date must be today or in the future');
            }
            return true;
        }),
    body('triage_severity')
        .optional()
        .isInt({ min: 1, max: 5 }).withMessage('Severity must be 1-5'),
    body('primary_symptom')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Primary symptom max 255 chars'),
    body('reason')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Reason max 1000 chars'),
];

// ─── Prescription Validators ─────────────────────────────────
const prescriptionRules = [
    body('patient_id')
        .isUUID().withMessage('Valid patient ID is required'),
    body('doctor_id')
        .isUUID().withMessage('Valid doctor ID is required'),
    body('items')
        .isArray({ min: 1 }).withMessage('At least one prescription item is required'),
    body('items.*.medicine_name')
        .notEmpty().withMessage('Medicine name is required for each item'),
    body('items.*.dosage')
        .notEmpty().withMessage('Dosage is required for each item'),
    body('diagnosis')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Diagnosis max 2000 chars'),
];

// ─── Inventory Validators ────────────────────────────────────
const medicineRules = [
    body('name')
        .trim()
        .isLength({ min: 1, max: 255 }).withMessage('Medicine name is required'),
    body('unit_price')
        .isFloat({ min: 0 }).withMessage('Unit price must be a positive number'),
    body('category')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Category max 100 chars'),
    body('reorder_point')
        .optional()
        .isInt({ min: 0 }).withMessage('Reorder point must be a non-negative integer'),
];

const batchRules = [
    body('medicine_id')
        .isUUID().withMessage('Valid medicine ID is required'),
    body('batch_number')
        .trim()
        .notEmpty().withMessage('Batch number is required'),
    body('expiry_date')
        .isISO8601().withMessage('Valid expiry date is required')
        .custom((value) => {
            if (new Date(value) <= new Date()) {
                throw new Error('Expiry date must be in the future');
            }
            return true;
        }),
    body('quantity')
        .isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('purchase_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Purchase price must be positive'),
    body('selling_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Selling price must be positive'),
];

// ─── Billing Validators ──────────────────────────────────────
const billingRules = [
    body('patient_id')
        .isUUID().withMessage('Valid patient ID is required'),
    body('items')
        .isArray({ min: 1 }).withMessage('At least one billing item is required'),
    body('total_amount')
        .isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
    body('payment_method')
        .optional()
        .isIn(['cash', 'card', 'upi', 'insurance']).withMessage('Invalid payment method'),
];

// ─── SOS Validators ──────────────────────────────────────────
const sosRules = [
    body('severity')
        .isInt({ min: 1, max: 5 }).withMessage('Severity must be 1-5'),
    body('primary_symptom')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Primary symptom max 255 chars'),
    body('latitude')
        .optional()
        .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('longitude')
        .optional()
        .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

// ─── Common Param Validators ─────────────────────────────────
const uuidParam = (paramName = 'id') => [
    param(paramName).isUUID().withMessage(`Valid ${paramName} is required`),
];

const paginationQuery = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
];

module.exports = {
    validate,
    loginRules,
    registerRules,
    forgotPasswordRules,
    resetPasswordRules,
    changePasswordRules,
    patientRules,
    appointmentRules,
    prescriptionRules,
    medicineRules,
    batchRules,
    billingRules,
    sosRules,
    uuidParam,
    paginationQuery,
};
