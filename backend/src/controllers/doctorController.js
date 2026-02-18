const { Doctor, Appointment, Patient, User } = require('../models');
const { Op } = require('sequelize');
const Papa = require('papaparse');
const bcrypt = require('bcryptjs');

const doctorController = {
    // CSV Import for doctors
    async importCSV(req, res, next) {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            const csvText = req.file.buffer.toString('utf-8');
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

            const results = { imported: 0, errors: [], total: parsed.data.length };

            for (let i = 0; i < parsed.data.length; i++) {
                const row = parsed.data[i];
                const errors = [];

                if (!row.name) errors.push('Missing doctor name');
                if (!row.email) errors.push('Missing email');
                if (!row.specialty) errors.push('Missing specialty');

                // Check duplicate email
                if (row.email) {
                    const exists = await User.findOne({ where: { email: row.email.toLowerCase() } });
                    if (exists) errors.push(`Duplicate: "${row.email}" already exists`);
                }

                if (errors.length > 0) {
                    results.errors.push({ row: i + 1, data: row, errors });
                    continue;
                }

                try {
                    const password_hash = await bcrypt.hash(row.password || 'MediCore@2024', 12);
                    const user = await User.create({
                        name: row.name,
                        email: row.email.toLowerCase(),
                        password_hash,
                        role: 'doctor',
                        phone: row.phone || null,
                    });

                    await Doctor.create({
                        user_id: user.id,
                        name: row.name,
                        specialty: row.specialty,
                        qualification: row.qualification || null,
                        experience_years: parseInt(row.experience_years) || 0,
                        consultation_fee: parseFloat(row.consultation_fee) || 0,
                        room_number: row.room_number || null,
                        status: 'available',
                    });
                    results.imported++;
                } catch (err) {
                    results.errors.push({ row: i + 1, data: row, errors: [err.message] });
                }
            }

            res.json(results);
        } catch (err) { next(err); }
    },

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
            const { status, leave_reason, expected_return } = req.body;
            const doctor = await Doctor.findByPk(req.params.id);
            if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

            const updateData = { status, status_updated_at: new Date() };
            // Store leave info if setting to leave
            if (status === 'leave') {
                updateData.leave_reason = leave_reason || '';
                updateData.expected_return = expected_return || '';
            } else {
                updateData.leave_reason = '';
                updateData.expected_return = '';
            }
            await doctor.update(updateData);

            const io = req.app.get('io');
            if (io) {
                io.to('patients').to('admin').to('reception').to('pharmacy').emit('DOCTOR_STATUS_CHANGED', {
                    doctorId: doctor.id,
                    name: doctor.name,
                    specialty: doctor.specialty,
                    status: doctor.status,
                    updatedAt: doctor.status_updated_at,
                    leave_reason: doctor.leave_reason || '',
                    expected_return: doctor.expected_return || '',
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
