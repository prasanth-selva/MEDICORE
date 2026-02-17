const { Billing, Patient, Prescription } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const billingController = {
    async create(req, res, next) {
        try {
            const { patient_id, prescription_id, appointment_id, items, subtotal, tax_amount, discount_amount, total_amount, payment_method, notes } = req.body;
            const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);

            const billing = await Billing.create({
                patient_id, prescription_id, appointment_id, items, subtotal, tax_amount, discount_amount, total_amount, payment_method, notes,
                invoice_number: invoiceNumber,
                status: payment_method ? 'paid' : 'pending',
                paid_amount: payment_method ? total_amount : 0,
            });

            res.status(201).json(billing);
        } catch (err) { next(err); }
    },

    async getAll(req, res, next) {
        try {
            const { status, patient_id, date, page = 1, limit = 20 } = req.query;
            const where = {};
            if (status) where.status = status;
            if (patient_id) where.patient_id = patient_id;
            if (date) {
                const d = new Date(date);
                const next = new Date(d);
                next.setDate(next.getDate() + 1);
                where.created_at = { [Op.between]: [d, next] };
            }

            const { count, rows } = await Billing.findAndCountAll({
                where,
                include: [
                    { model: Patient, attributes: ['id', 'patient_code', 'first_name', 'last_name', 'phone'] },
                    { model: Prescription },
                ],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [['created_at', 'DESC']],
            });

            res.json({ bills: rows, total: count, page: parseInt(page) });
        } catch (err) { next(err); }
    },

    async processPayment(req, res, next) {
        try {
            const bill = await Billing.findByPk(req.params.id);
            if (!bill) return res.status(404).json({ error: 'Bill not found' });

            const { payment_method, paid_amount } = req.body;
            const newPaid = parseFloat(bill.paid_amount) + parseFloat(paid_amount);
            const status = newPaid >= parseFloat(bill.total_amount) ? 'paid' : 'partial';

            await bill.update({ payment_method, paid_amount: newPaid, status });
            res.json(bill);
        } catch (err) { next(err); }
    },

    async getRevenue(req, res, next) {
        try {
            const { period = '30' } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(period));

            const revenue = await Billing.findAll({
                where: {
                    status: { [Op.in]: ['paid', 'partial'] },
                    created_at: { [Op.gte]: startDate },
                },
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('total_amount')), 'total'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                group: [sequelize.fn('DATE', sequelize.col('created_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
                raw: true,
            });

            const totalRevenue = await Billing.sum('paid_amount', {
                where: { status: { [Op.in]: ['paid', 'partial'] }, created_at: { [Op.gte]: startDate } },
            });

            const outstanding = await Billing.sum('total_amount', {
                where: { status: 'pending' },
            });

            res.json({ daily: revenue, totalRevenue: totalRevenue || 0, outstanding: outstanding || 0 });
        } catch (err) { next(err); }
    },
};

module.exports = billingController;
