const { SOSAlert, Patient, User, Notification } = require('../models');
const { Op } = require('sequelize');

const sosController = {
    async create(req, res, next) {
        try {
            const { patient_id, severity, primary_symptom, symptoms, is_alone, can_walk, latitude, longitude } = req.body;
            const alert = await SOSAlert.create({
                patient_id, severity, primary_symptom, symptoms, is_alone, can_walk, latitude, longitude,
            });

            const patient = await Patient.findByPk(patient_id, {
                attributes: ['id', 'patient_code', 'first_name', 'last_name', 'phone', 'blood_group', 'allergies'],
            });

            const fullAlert = { ...alert.toJSON(), Patient: patient };

            // Broadcast to ALL staff portals
            const io = req.app.get('io');
            if (io) {
                io.to('doctors').to('pharmacy').to('admin').emit('SOS_ALERT', fullAlert);
            }

            // Create notifications for all active staff
            const staff = await User.findAll({ where: { role: { [Op.in]: ['admin', 'doctor', 'receptionist'] }, is_active: true } });
            for (const s of staff) {
                await Notification.create({
                    user_id: s.id,
                    title: '🚨 SOS Emergency Alert',
                    message: `${patient.first_name} ${patient.last_name} - Severity: ${severity}/5 - ${primary_symptom || 'Emergency'}`,
                    type: 'sos',
                });
            }

            res.status(201).json(fullAlert);
        } catch (err) { next(err); }
    },

    async getAll(req, res, next) {
        try {
            const { status } = req.query;
            const where = {};
            if (status) where.status = status;

            const alerts = await SOSAlert.findAll({
                where,
                include: [{ model: Patient, attributes: ['id', 'patient_code', 'first_name', 'last_name', 'phone', 'blood_group'] }],
                order: [['created_at', 'DESC']],
                limit: 50,
            });
            res.json(alerts);
        } catch (err) { next(err); }
    },

    async acknowledge(req, res, next) {
        try {
            const alert = await SOSAlert.findByPk(req.params.id);
            if (!alert) return res.status(404).json({ error: 'Alert not found' });

            await alert.update({
                status: 'acknowledged',
                acknowledged_by: req.user.id,
                acknowledged_at: new Date(),
            });

            const io = req.app.get('io');
            if (io) {
                io.to('patients').emit('SOS_ACKNOWLEDGED', {
                    alertId: alert.id,
                    patientId: alert.patient_id,
                    acknowledgedBy: req.user.name,
                });
            }

            res.json(alert);
        } catch (err) { next(err); }
    },

    async resolve(req, res, next) {
        try {
            const alert = await SOSAlert.findByPk(req.params.id);
            if (!alert) return res.status(404).json({ error: 'Alert not found' });
            await alert.update({ status: 'resolved', resolved_at: new Date(), notes: req.body.notes });
            res.json(alert);
        } catch (err) { next(err); }
    },
};

module.exports = sosController;
