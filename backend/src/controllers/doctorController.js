const { Doctor, Appointment, Patient } = require('../models');
const { Op } = require('sequelize');

const doctorController = {
    async getAll(req, res, next) {
        try {
            const { specialty, status } = req.query;
            const where = {};
            if (specialty) where.specialty = specialty;
            if (status) where.status = status;

            const doctors = await Doctor.findAll({ where, order: [['name', 'ASC']] });
            res.json(doctors);
        } catch (err) { next(err); }
    },

    async getById(req, res, next) {
        try {
            const doctor = await Doctor.findByPk(req.params.id);
            if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
            res.json(doctor);
        } catch (err) { next(err); }
    },

    async create(req, res, next) {
        try {
            const doctor = await Doctor.create(req.body);
            res.status(201).json(doctor);
        } catch (err) { next(err); }
    },

    async update(req, res, next) {
        try {
            const doctor = await Doctor.findByPk(req.params.id);
            if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
            await doctor.update(req.body);
            res.json(doctor);
        } catch (err) { next(err); }
    },

    async updateStatus(req, res, next) {
        try {
            const { status } = req.body;
            const doctor = await Doctor.findByPk(req.params.id);
            if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
            await doctor.update({ status, status_updated_at: new Date() });

            const io = req.app.get('io');
            if (io) {
                io.to('patients').to('admin').emit('DOCTOR_STATUS_CHANGED', {
                    doctorId: doctor.id,
                    name: doctor.name,
                    specialty: doctor.specialty,
                    status: doctor.status,
                    updatedAt: doctor.status_updated_at,
                });
            }

            res.json(doctor);
        } catch (err) { next(err); }
    },

    async getQueue(req, res, next) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const appointments = await Appointment.findAll({
                where: {
                    doctor_id: req.params.id,
                    scheduled_time: { [Op.between]: [today, tomorrow] },
                    status: { [Op.in]: ['booked', 'confirmed', 'in_progress'] },
                },
                include: [{ model: Patient, attributes: ['id', 'patient_code', 'first_name', 'last_name', 'age', 'blood_group', 'allergies', 'phone'] }],
                order: [['queue_position', 'ASC'], ['scheduled_time', 'ASC']],
            });
            res.json(appointments);
        } catch (err) { next(err); }
    },

    async getStats(req, res, next) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const doctorId = req.params.id;
            const todayCompleted = await Appointment.count({
                where: { doctor_id: doctorId, status: 'completed', scheduled_time: { [Op.between]: [today, tomorrow] } },
            });
            const todayPending = await Appointment.count({
                where: { doctor_id: doctorId, status: { [Op.in]: ['booked', 'confirmed'] }, scheduled_time: { [Op.between]: [today, tomorrow] } },
            });
            const totalPatients = await Appointment.count({
                where: { doctor_id: doctorId, scheduled_time: { [Op.between]: [today, tomorrow] } },
            });
            res.json({ todayCompleted, todayPending, totalPatients });
        } catch (err) { next(err); }
    },
};

module.exports = doctorController;
