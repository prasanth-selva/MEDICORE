const { Appointment, Patient, Doctor } = require('../models');
const { Op } = require('sequelize');

const appointmentController = {
    async create(req, res, next) {
        try {
            const { patient_id, doctor_id, scheduled_time, triage_severity, primary_symptom, reason, is_walk_in } = req.body;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const queueCount = await Appointment.count({
                where: {
                    doctor_id,
                    scheduled_time: { [Op.between]: [today, tomorrow] },
                    status: { [Op.in]: ['booked', 'confirmed', 'in_progress'] },
                },
            });

            const appointment = await Appointment.create({
                patient_id, doctor_id,
                scheduled_time: scheduled_time || new Date(),
                triage_severity, primary_symptom, reason,
                is_walk_in: is_walk_in || false,
                queue_position: queueCount + 1,
                estimated_wait_minutes: queueCount * 15,
            });

            const fullAppt = await Appointment.findByPk(appointment.id, {
                include: [
                    { model: Patient, attributes: ['id', 'patient_code', 'first_name', 'last_name', 'phone'] },
                    { model: Doctor, attributes: ['id', 'name', 'specialty', 'room_number'] },
                ],
            });

            const io = req.app.get('io');
            if (io) {
                io.to('doctors').to('admin').emit('QUEUE_UPDATED', { appointment: fullAppt });
            }

            res.status(201).json(fullAppt);
        } catch (err) { next(err); }
    },

    async getAll(req, res, next) {
        try {
            const { date, doctor_id, status, page = 1, limit = 20 } = req.query;
            const where = {};
            if (doctor_id) where.doctor_id = doctor_id;
            if (status) where.status = status;
            if (date) {
                const d = new Date(date);
                const next = new Date(d);
                next.setDate(next.getDate() + 1);
                where.scheduled_time = { [Op.between]: [d, next] };
            }

            const { count, rows } = await Appointment.findAndCountAll({
                where,
                include: [
                    { model: Patient, attributes: ['id', 'patient_code', 'first_name', 'last_name', 'phone', 'age'] },
                    { model: Doctor, attributes: ['id', 'name', 'specialty', 'room_number'] },
                ],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [['scheduled_time', 'ASC']],
            });
            res.json({ appointments: rows, total: count, page: parseInt(page) });
        } catch (err) { next(err); }
    },

    async updateStatus(req, res, next) {
        try {
            const appt = await Appointment.findByPk(req.params.id);
            if (!appt) return res.status(404).json({ error: 'Appointment not found' });
            await appt.update({ status: req.body.status });

            if (req.body.status === 'in_progress') {
                await Doctor.update({ status: 'with_patient', status_updated_at: new Date() }, { where: { id: appt.doctor_id } });
            } else if (req.body.status === 'completed') {
                const pendingCount = await Appointment.count({
                    where: { doctor_id: appt.doctor_id, status: { [Op.in]: ['booked', 'confirmed'] } },
                });
                if (pendingCount === 0) {
                    await Doctor.update({ status: 'available', status_updated_at: new Date() }, { where: { id: appt.doctor_id } });
                }
            }

            const io = req.app.get('io');
            if (io) io.to('admin').to('patients').emit('QUEUE_UPDATED', { appointmentId: appt.id, status: req.body.status });

            res.json(appt);
        } catch (err) { next(err); }
    },

    async getAvailableSlots(req, res, next) {
        try {
            const { doctor_id, date } = req.query;
            if (!doctor_id || !date) return res.status(400).json({ error: 'doctor_id and date are required' });

            const d = new Date(date);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);

            const booked = await Appointment.findAll({
                where: {
                    doctor_id,
                    scheduled_time: { [Op.between]: [d, next] },
                    status: { [Op.ne]: 'cancelled' },
                },
                attributes: ['scheduled_time'],
            });

            const bookedTimes = booked.map(a => new Date(a.scheduled_time).getHours() + ':' + new Date(a.scheduled_time).getMinutes());
            const allSlots = [];
            for (let h = 9; h <= 17; h++) {
                for (let m = 0; m < 60; m += 30) {
                    const timeStr = `${h}:${m}`;
                    allSlots.push({ time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, available: !bookedTimes.includes(timeStr) });
                }
            }
            res.json(allSlots);
        } catch (err) { next(err); }
    },
};

module.exports = appointmentController;
