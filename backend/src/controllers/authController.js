const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Patient, Doctor } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const { logger, auditLog } = require('../middleware/logger');

// In-memory store for password reset tokens (use Redis in production)
const resetTokens = new Map();

// Track failed login attempts
const failedAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const authController = {
    async register(req, res, next) {
        try {
            const { name, email, password, role, phone } = req.body;
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(409).json({ error: 'Email already registered', code: 'AUTH_005' });
            }
            const password_hash = await bcrypt.hash(password, 12);
            const user = await User.create({ name, email, password_hash, role: role || 'patient', phone });

            auditLog('USER_REGISTERED', { userId: user.id, email: user.email, role: user.role });

            const tokens = generateTokens(user);
            res.status(201).json({
                user: { id: user.id, name: user.name, email: user.email, role: user.role },
                ...tokens,
            });
        } catch (err) { next(err); }
    },

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            // Check account lockout
            const attempts = failedAttempts.get(email);
            if (attempts && attempts.count >= MAX_ATTEMPTS) {
                const elapsed = Date.now() - attempts.lastAttempt;
                if (elapsed < LOCKOUT_MINUTES * 60 * 1000) {
                    const remainingMin = Math.ceil((LOCKOUT_MINUTES * 60 * 1000 - elapsed) / 60000);
                    logger.warn(`Account locked: ${email} — ${remainingMin} min remaining`);
                    return res.status(429).json({
                        error: `Account temporarily locked. Try again in ${remainingMin} minutes.`,
                        code: 'AUTH_006',
                    });
                }
                failedAttempts.delete(email);
            }

            const user = await User.findOne({ where: { email } });
            if (!user || !user.is_active) {
                trackFailedAttempt(email);
                return res.status(401).json({ error: 'Invalid email or password', code: 'AUTH_007' });
            }
            const validPw = await bcrypt.compare(password, user.password_hash);
            if (!validPw) {
                trackFailedAttempt(email);
                return res.status(401).json({ error: 'Invalid email or password', code: 'AUTH_007' });
            }

            // Reset failed attempts on success
            failedAttempts.delete(email);

            await user.update({ last_login: new Date() });
            const tokens = generateTokens(user);

            let profile = null;
            if (user.role === 'doctor') {
                profile = await Doctor.findOne({ where: { user_id: user.id } });
            } else if (user.role === 'patient') {
                profile = await Patient.findOne({ where: { user_id: user.id } });
            }

            auditLog('USER_LOGIN', { userId: user.id, email: user.email, ip: req.ip });

            res.json({
                user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone },
                profile,
                ...tokens,
            });
        } catch (err) { next(err); }
    },

    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) return res.status(401).json({ error: 'Refresh token required', code: 'AUTH_008' });
            const decoded = verifyRefreshToken(refreshToken);
            const user = await User.findByPk(decoded.id);
            if (!user || !user.is_active) return res.status(403).json({ error: 'User not found or inactive', code: 'AUTH_009' });
            const tokens = generateTokens(user);
            res.json(tokens);
        } catch (err) {
            res.status(403).json({ error: 'Invalid refresh token', code: 'AUTH_010' });
        }
    },

    async getProfile(req, res, next) {
        try {
            const user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['password_hash'] },
            });
            if (!user) return res.status(404).json({ error: 'User not found', code: 'AUTH_011' });

            let profile = null;
            if (user.role === 'doctor') {
                profile = await Doctor.findOne({ where: { user_id: user.id } });
            } else if (user.role === 'patient') {
                profile = await Patient.findOne({ where: { user_id: user.id } });
            }

            res.json({ user, profile });
        } catch (err) { next(err); }
    },

    // ─── Password Reset Flow ─────────────────────────────────
    async forgotPassword(req, res, next) {
        try {
            const { email } = req.body;
            const user = await User.findOne({ where: { email } });

            // Always respond with success (don't reveal if email exists)
            if (!user) {
                return res.json({ message: 'If the email exists, a reset link has been sent.' });
            }

            // Generate reset token
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

            resetTokens.set(tokenHash, { userId: user.id, expiresAt });

            // In production, send email. In dev, log the link.
            const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

            if (process.env.SMTP_HOST) {
                // Email service integration (implemented in Phase 3)
                logger.info(`Password reset email would be sent to ${email}`);
            } else {
                logger.info(`🔑 Password reset link for ${email}: ${resetUrl}`);
            }

            auditLog('PASSWORD_RESET_REQUESTED', { email, ip: req.ip });

            res.json({ message: 'If the email exists, a reset link has been sent.' });
        } catch (err) { next(err); }
    },

    async resetPassword(req, res, next) {
        try {
            const { token, password } = req.body;

            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            const stored = resetTokens.get(tokenHash);

            if (!stored || stored.expiresAt < Date.now()) {
                return res.status(400).json({ error: 'Invalid or expired reset token', code: 'AUTH_012' });
            }

            const user = await User.findByPk(stored.userId);
            if (!user) return res.status(404).json({ error: 'User not found', code: 'AUTH_011' });

            const password_hash = await bcrypt.hash(password, 12);
            await user.update({ password_hash });

            // Invalidate token
            resetTokens.delete(tokenHash);

            auditLog('PASSWORD_RESET_COMPLETED', { userId: user.id, ip: req.ip });

            res.json({ message: 'Password has been reset successfully.' });
        } catch (err) { next(err); }
    },

    async changePassword(req, res, next) {
        try {
            const { currentPassword, newPassword } = req.body;
            const user = await User.findByPk(req.user.id);

            if (!user) return res.status(404).json({ error: 'User not found', code: 'AUTH_011' });

            const validPw = await bcrypt.compare(currentPassword, user.password_hash);
            if (!validPw) {
                return res.status(401).json({ error: 'Current password is incorrect', code: 'AUTH_013' });
            }

            const password_hash = await bcrypt.hash(newPassword, 12);
            await user.update({ password_hash });

            auditLog('PASSWORD_CHANGED', { userId: user.id, ip: req.ip });

            res.json({ message: 'Password changed successfully.' });
        } catch (err) { next(err); }
    },

    async logout(req, res, next) {
        try {
            auditLog('USER_LOGOUT', { userId: req.user.id, ip: req.ip });
            res.json({ message: 'Logged out successfully.' });
        } catch (err) { next(err); }
    },
};

function trackFailedAttempt(email) {
    const existing = failedAttempts.get(email) || { count: 0, lastAttempt: 0 };
    failedAttempts.set(email, { count: existing.count + 1, lastAttempt: Date.now() });
    logger.warn(`Failed login attempt for ${email}: ${existing.count + 1}/${MAX_ATTEMPTS}`);
}

module.exports = authController;
