const { Medicine, InventoryBatch, Supplier } = require('../models');
const { Op } = require('sequelize');
const Papa = require('papaparse');
const multer = require('multer');

const inventoryController = {
    // Medicines CRUD
    async getMedicines(req, res, next) {
        try {
            const { search, category, expiry_urgency, page = 1, limit = 50 } = req.query;
            const where = { is_active: true };
            if (search) {
                where[Op.or] = [
                    { name: { [Op.iLike]: `%${search}%` } },
                    { generic_name: { [Op.iLike]: `%${search}%` } },
                ];
            }
            if (category) where.category = category;

            const { count, rows } = await Medicine.findAndCountAll({
                where,
                include: [{
                    model: InventoryBatch,
                    where: { is_active: true },
                    required: false,
                    order: [['expiry_date', 'ASC']],
                }],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [['name', 'ASC']],
            });

            // Add computed fields
            const medicines = rows.map(m => {
                const batches = m.InventoryBatches || [];
                const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);
                const earliestExpiry = batches.length > 0 ? batches.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))[0]?.expiry_date : null;
                const daysToExpiry = earliestExpiry ? Math.ceil((new Date(earliestExpiry) - new Date()) / (1000 * 60 * 60 * 24)) : null;

                let expiryStatus = 'safe';
                if (daysToExpiry !== null) {
                    if (daysToExpiry < 30) expiryStatus = 'critical';
                    else if (daysToExpiry < 90) expiryStatus = 'warning';
                }

                const avgDailyConsumption = totalStock > 0 ? Math.max(1, Math.floor(totalStock / 30)) : 0;
                const daysRemaining = avgDailyConsumption > 0 ? Math.floor(totalStock / avgDailyConsumption) : 0;

                return {
                    ...m.toJSON(),
                    totalStock,
                    earliestExpiry,
                    daysToExpiry,
                    expiryStatus,
                    daysRemaining,
                    batchCount: batches.length,
                };
            });

            if (expiry_urgency) {
                const filtered = medicines.filter(m => m.expiryStatus === expiry_urgency);
                return res.json({ medicines: filtered, total: filtered.length, page: parseInt(page) });
            }

            res.json({ medicines, total: count, page: parseInt(page) });
        } catch (err) { next(err); }
    },

    async createMedicine(req, res, next) {
        try {
            const medicine = await Medicine.create(req.body);
            res.status(201).json(medicine);
        } catch (err) { next(err); }
    },

    async updateMedicine(req, res, next) {
        try {
            const medicine = await Medicine.findByPk(req.params.id);
            if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
            await medicine.update(req.body);
            res.json(medicine);
        } catch (err) { next(err); }
    },

    // Batch management
    async addBatch(req, res, next) {
        try {
            const batch = await InventoryBatch.create(req.body);
            // Update medicine total stock
            const medicine = await Medicine.findByPk(req.body.medicine_id);
            if (medicine) {
                await medicine.update({ current_stock: medicine.current_stock + batch.quantity });
            }
            res.status(201).json(batch);
        } catch (err) { next(err); }
    },

    async getBatches(req, res, next) {
        try {
            const batches = await InventoryBatch.findAll({
                where: { medicine_id: req.params.medicineId, is_active: true },
                include: [{ model: Supplier, attributes: ['name', 'phone'] }],
                order: [['expiry_date', 'ASC']],
            });
            res.json(batches);
        } catch (err) { next(err); }
    },

    // CSV Import
    async importCSV(req, res, next) {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            const csvText = req.file.buffer.toString('utf-8');
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

            const results = { imported: 0, errors: [], total: parsed.data.length };

            for (let i = 0; i < parsed.data.length; i++) {
                const row = parsed.data[i];
                const errors = [];

                if (!row.name) errors.push('Missing medicine name');
                if (!row.unit_price || isNaN(row.unit_price)) errors.push('Invalid unit price');
                if (row.unit_price && parseFloat(row.unit_price) > 10000) errors.push(`Price anomaly: ₹${row.unit_price} seems too high`);
                if (row.expiry_date && new Date(row.expiry_date) < new Date()) errors.push('Expiry date is in the past');

                // Check duplicate
                if (row.name) {
                    const exists = await Medicine.findOne({ where: { name: { [Op.iLike]: row.name } } });
                    if (exists) errors.push(`Duplicate: "${row.name}" already exists`);
                }

                if (errors.length > 0) {
                    results.errors.push({ row: i + 1, data: row, errors });
                    continue;
                }

                try {
                    await Medicine.create({
                        name: row.name,
                        generic_name: row.generic_name || null,
                        category: row.category || 'General',
                        manufacturer: row.manufacturer || null,
                        unit_price: parseFloat(row.unit_price),
                        reorder_point: parseInt(row.reorder_point) || 100,
                        current_stock: parseInt(row.current_stock) || 0,
                        unit: row.unit || 'tablets',
                    });
                    results.imported++;
                } catch (err) {
                    results.errors.push({ row: i + 1, data: row, errors: [err.message] });
                }
            }

            res.json(results);
        } catch (err) { next(err); }
    },

    // Suppliers
    async getSuppliers(req, res, next) {
        try {
            const suppliers = await Supplier.findAll({ where: { is_active: true }, order: [['rating', 'DESC']] });
            res.json(suppliers);
        } catch (err) { next(err); }
    },

    async createSupplier(req, res, next) {
        try {
            const supplier = await Supplier.create(req.body);
            res.status(201).json(supplier);
        } catch (err) { next(err); }
    },

    // Dashboard stats
    async getStats(req, res, next) {
        try {
            const totalMedicines = await Medicine.count({ where: { is_active: true } });
            const allMeds = await Medicine.findAll({ where: { is_active: true }, attributes: ['current_stock', 'unit_price', 'reorder_point'] });

            const totalStockValue = allMeds.reduce((sum, m) => sum + (parseFloat(m.current_stock) * parseFloat(m.unit_price)), 0);
            const lowStockCount = allMeds.filter(m => m.current_stock <= m.reorder_point).length;

            const expiringBatches = await InventoryBatch.count({
                where: {
                    is_active: true,
                    expiry_date: { [Op.lte]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
                    quantity: { [Op.gt]: 0 },
                },
            });

            res.json({ totalMedicines, totalStockValue, lowStockCount, expiringBatches });
        } catch (err) { next(err); }
    },

    // Categories
    async getCategories(req, res, next) {
        try {
            const categories = await Medicine.findAll({
                attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('category')), 'category']],
                where: { category: { [Op.ne]: null } },
                raw: true,
            });
            res.json(categories.map(c => c.category).filter(Boolean));
        } catch (err) { next(err); }
    },
};

module.exports = inventoryController;
