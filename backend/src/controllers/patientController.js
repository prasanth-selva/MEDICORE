const { Patient, User, Appointment, Prescription, DiseaseRecord } = require('../models');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const Papa = require('papaparse');
const bcrypt = require('bcryptjs');

const patientController = {
    async importCSV(req, res, next) {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            const csvText = req.file.buffer.toString('utf-8');
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            const results = { imported: 0, errors: [], total: parsed.data.length };

            for (let i = 0; i < parsed.data.length; i++) {
                const row = parsed.data[i];
                const errors = [];
                if (!row.first_name) errors.push('Missing first_name');
                if (!row.phone) errors.push('Missing phone');
                if (errors.length > 0) { results.errors.push({ row: i + 1, data: row, errors }); continue; }

                try {
                    const patientCode = 'MC-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
                    let userId = null;
                    if (row.email) {
                        const existingUser = await User.findOne({ where: { email: row.email.toLowerCase() } });
                        if (!existingUser) {
                            const password_hash = await bcrypt.hash(row.password || 'MediCore@2024', 12);
                            const user = await User.create({ name: `${row.first_name} ${row.last_name || ''}`.trim(), email: row.email.toLowerCase(), password_hash, role: 'patient', phone: row.phone });
                            userId = user.id;
                        } else {
                            userId = existingUser.id;
                        }
                    }
                    await Patient.create({
                        user_id: userId,
                        patient_code: patientCode,
                        first_name: row.first_name,
                        last_name: row.last_name || '',
                        phone: row.phone,
                        email: row.email || null,
                        age: parseInt(row.age) || null,
                        gender: row.gender || null,
                        blood_group: row.blood_group || null,
                        address: row.address || null,
                        city: row.city || null,
                        consent_given: true,
                        consent_timestamp: new Date(),
                    });
                    results.imported++;
                } catch (err) {
                    results.errors.push({ row: i + 1, data: row, errors: [err.message] });
                }
            }
            res.json(results);
        } catch (err) { next(err); }
    },

    async create(req, res, next) {
        try {
            const patientCode = 'MC-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
            const patient = await Patient.create({ ...req.body, patient_code: patientCode });
            res.status(201).json(patient);
        } catch (err) { next(err); }
    },

    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 20, search, blood_group } = req.query;
            const where = {};
            if (search) {
                where[Op.or] = [
                    { first_name: { [Op.iLike]: `%${search}%` } },
                    { last_name: { [Op.iLike]: `%${search}%` } },
                    { patient_code: { [Op.iLike]: `%${search}%` } },
                    { phone: { [Op.iLike]: `%${search}%` } },
                ];
            }
            if (blood_group) where.blood_group = blood_group;

            const { count, rows } = await Patient.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [['created_at', 'DESC']],
            });
            res.json({ patients: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
        } catch (err) { next(err); }
    },

    async getById(req, res, next) {
        try {
            const patient = await Patient.findByPk(req.params.id, {
                include: [
                    { model: Appointment, order: [['scheduled_time', 'DESC']], limit: 10 },
                    { model: Prescription, order: [['created_at', 'DESC']], limit: 10 },
                ],
            });
            if (!patient) return res.status(404).json({ error: 'Patient not found' });
            res.json(patient);
        } catch (err) { next(err); }
    },

    async update(req, res, next) {
        try {
            const patient = await Patient.findByPk(req.params.id);
            if (!patient) return res.status(404).json({ error: 'Patient not found' });
            await patient.update(req.body);
            res.json(patient);
        } catch (err) { next(err); }
    },

    async getHistory(req, res, next) {
        try {
            const prescriptions = await Prescription.findAll({
                where: { patient_id: req.params.id },
                include: [{ model: require('../models').Doctor, attributes: ['name', 'specialty'] }],
                order: [['created_at', 'DESC']],
            });
            const diseases = await DiseaseRecord.findAll({
                where: { patient_id: req.params.id },
                order: [['recorded_date', 'DESC']],
            });
            res.json({ prescriptions, diseases });
        } catch (err) { next(err); }
    },

    async search(req, res, next) {
        try {
            const { q } = req.query;
            if (!q || q.length < 2) return res.json([]);
            const patients = await Patient.findAll({
                where: {
                    [Op.or]: [
                        { first_name: { [Op.iLike]: `%${q}%` } },
                        { last_name: { [Op.iLike]: `%${q}%` } },
                        { patient_code: { [Op.iLike]: `%${q}%` } },
                        { phone: { [Op.iLike]: `%${q}%` } },
                    ],
                },
                limit: 10,
                attributes: ['id', 'patient_code', 'first_name', 'last_name', 'phone', 'age', 'blood_group'],
            });
            res.json(patients);
        } catch (err) { next(err); }
    },
};

module.exports = patientController;
