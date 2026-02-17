const bcrypt = require('bcryptjs');
const { User, Patient, Doctor } = require('../models');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');

const authController = {
    async register(req, res, next) {
        try {
            const { name, email, password, role, phone } = req.body;
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(409).json({ error: 'Email already registered' });
            }
            const password_hash = await bcrypt.hash(password, 12);
            const user = await User.create({ name, email, password_hash, role: role || 'patient', phone });
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
            const user = await User.findOne({ where: { email } });
            if (!user || !user.is_active) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            const validPw = await bcrypt.compare(password, user.password_hash);
            if (!validPw) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            await user.update({ last_login: new Date() });
            const tokens = generateTokens(user);

            let profile = null;
            if (user.role === 'doctor') {
                profile = await Doctor.findOne({ where: { user_id: user.id } });
            } else if (user.role === 'patient') {
                profile = await Patient.findOne({ where: { user_id: user.id } });
            }

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
            if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });
            const decoded = verifyRefreshToken(refreshToken);
            const user = await User.findByPk(decoded.id);
            if (!user || !user.is_active) return res.status(403).json({ error: 'User not found or inactive' });
            const tokens = generateTokens(user);
            res.json(tokens);
        } catch (err) {
            res.status(403).json({ error: 'Invalid refresh token' });
        }
    },

    async getProfile(req, res, next) {
        try {
            const user = await User.findByPk(req.user.id, {
                attributes: { exclude: ['password_hash'] },
            });
            if (!user) return res.status(404).json({ error: 'User not found' });

            let profile = null;
            if (user.role === 'doctor') {
                profile = await Doctor.findOne({ where: { user_id: user.id } });
            } else if (user.role === 'patient') {
                profile = await Patient.findOne({ where: { user_id: user.id } });
            }

            res.json({ user, profile });
        } catch (err) { next(err); }
    },
};

module.exports = authController;
