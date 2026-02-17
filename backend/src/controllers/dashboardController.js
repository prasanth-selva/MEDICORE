const { Notification } = require('../models');
const { DiseaseRecord, Appointment, Patient, Doctor, Medicine, Billing, Prescription } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const dashboardController = {
    async getAdminStats(req, res, next) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const [todayAppointments, todayRevenue, totalPatients, activeDoctors, pendingPrescriptions, lowStockMeds] = await Promise.all([
                Appointment.count({ where: { scheduled_time: { [Op.between]: [today, tomorrow] } } }),
                Billing.sum('paid_amount', { where: { created_at: { [Op.between]: [today, tomorrow] }, status: 'paid' } }),
                Patient.count(),
                Doctor.count({ where: { status: 'available' } }),
                Prescription.count({ where: { status: 'pending' } }),
                Medicine.count({ where: { current_stock: { [Op.lte]: sequelize.col('reorder_point') } } }),
            ]);

            res.json({
                todayAppointments,
                todayRevenue: todayRevenue || 0,
                totalPatients,
                activeDoctors,
                pendingPrescriptions,
                lowStockMeds,
            });
        } catch (err) { next(err); }
    },

    async getDiseaseAnalytics(req, res, next) {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            const diseaseStats = await DiseaseRecord.findAll({
                where: { recorded_date: { [Op.gte]: startDate } },
                attributes: [
                    'diagnosis_name',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('DATE', sequelize.col('recorded_date')), 'date'],
                ],
                group: ['diagnosis_name', sequelize.fn('DATE', sequelize.col('recorded_date'))],
                order: [[sequelize.fn('DATE', sequelize.col('recorded_date')), 'ASC']],
                raw: true,
            });

            const topDiseases = await DiseaseRecord.findAll({
                where: { recorded_date: { [Op.gte]: startDate } },
                attributes: [
                    'diagnosis_name',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                group: ['diagnosis_name'],
                order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                limit: 10,
                raw: true,
            });

            const regionStats = await DiseaseRecord.findAll({
                where: { recorded_date: { [Op.gte]: startDate }, region: { [Op.ne]: null } },
                attributes: [
                    'region',
                    'diagnosis_name',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                group: ['region', 'diagnosis_name'],
                raw: true,
            });

            res.json({ trends: diseaseStats, topDiseases, regionStats });
        } catch (err) { next(err); }
    },

    async getNotifications(req, res, next) {
        try {
            const notifications = await Notification.findAll({
                where: { user_id: req.user.id },
                order: [['created_at', 'DESC']],
                limit: 50,
            });
            const unreadCount = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
            res.json({ notifications, unreadCount });
        } catch (err) { next(err); }
    },

    async markNotificationRead(req, res, next) {
        try {
            await Notification.update({ is_read: true }, { where: { id: req.params.id, user_id: req.user.id } });
            res.json({ message: 'Marked as read' });
        } catch (err) { next(err); }
    },
};

module.exports = dashboardController;
