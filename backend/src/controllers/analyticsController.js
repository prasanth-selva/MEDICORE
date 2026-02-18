const { Prescription, Medicine, sequelize } = require('../models');
const { Op } = require('sequelize');

const analyticsController = {
    // Get disease stats from prescriptions
    async getDiseaseStats(req, res, next) {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            // Fetch prescriptions created in last N days with a diagnosis
            const prescriptions = await Prescription.findAll({
                where: {
                    created_at: { [Op.gte]: startDate },
                    diagnosis: { [Op.ne]: null }
                },
                attributes: ['diagnosis', 'created_at']
            });

            // Process data: Group by diagnosis and count
            const stats = {};
            prescriptions.forEach(p => {
                if (!p.diagnosis) return;
                // Simple normalization: lowercase and trim
                const diagnosis = p.diagnosis.toLowerCase().trim();
                if (!stats[diagnosis]) stats[diagnosis] = 0;
                stats[diagnosis]++;
            });

            // Format for AI service
            const result = Object.entries(stats)
                .map(([name, count]) => ({
                    disease: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize
                    count
                }))
                .sort((a, b) => b.count - a.count);

            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    // Get medicine usage from dispensed prescriptions
    async getMedicineUsage(req, res, next) {
        try {
            const { days = 30 } = req.query;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(days));

            const prescriptions = await Prescription.findAll({
                where: {
                    created_at: { [Op.gte]: startDate },
                    status: 'dispensed'
                },
                attributes: ['items']
            });

            const usage = {};
            prescriptions.forEach(p => {
                const items = p.items || [];
                items.forEach(item => {
                    const name = item.medicine || item.medicine_name || 'Unknown';
                    const qty = parseInt(item.quantity) || 0;
                    if (!usage[name]) usage[name] = 0;
                    usage[name] += qty;
                });
            });

            const result = Object.entries(usage)
                .map(([name, quantity]) => ({ name, quantity }))
                .sort((a, b) => b.quantity - a.quantity);

            res.json(result);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = analyticsController;
