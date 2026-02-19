const { Prescription, PrescriptionTemplate, Patient, Doctor, Medicine, Notification, Appointment, Billing } = require('../models');
const { Op } = require('sequelize');
const { generatePrescriptionPDF } = require('../services/pdfService');
const { logger } = require('../middleware/logger');

const prescriptionController = {
    async downloadPDF(req, res, next) {
        try {
            const prescription = await Prescription.findByPk(req.params.id, {
                include: [
                    { model: Patient },
                    { model: Doctor },
                ],
            });
            if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

            const pdfBuffer = await generatePrescriptionPDF({
                prescription: prescription.toJSON(),
                patient: prescription.Patient.toJSON(),
                doctor: prescription.Doctor.toJSON(),
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=prescription-${prescription.id.slice(0, 8)}.pdf`);
            res.send(pdfBuffer);
        } catch (err) {
            logger.error(`PDF generation failed: ${err.message}`);
            next(err);
        }
    },

    async create(req, res, next) {
        try {
            const { patient_id, doctor_id, appointment_id, items, diagnosis, notes, follow_up_date } = req.body;
            const prescription = await Prescription.create({
                patient_id, doctor_id, appointment_id, items, diagnosis, notes, follow_up_date,
            });

            const full = await Prescription.findByPk(prescription.id, {
                include: [
                    { model: Patient, attributes: ['id', 'patient_code', 'first_name', 'last_name', 'allergies', 'phone'] },
                    { model: Doctor, attributes: ['id', 'name', 'specialty'] },
                ],
            });

            // Push to pharmacy via Socket.IO
            const io = req.app.get('io');
            if (io) {
                io.to('pharmacy').emit('PRESCRIPTION_SENT', full);
                io.to('admin').emit('PRESCRIPTION_SENT', full);
            }

            // Create notification for pharmacy staff
            await Notification.create({
                user_id: null,
                title: 'New Prescription',
                message: `Dr. ${full.Doctor.name} sent prescription for ${full.Patient.first_name} ${full.Patient.last_name}`,
                type: 'prescription',
            });

            // Auto-create a pending billing record for this consultation
            try {
                const doctor = await Doctor.findByPk(doctor_id);
                const consultationFee = parseFloat(doctor?.consultation_fee) || 0;

                // Calculate medicine costs from prescription items
                let medicineCost = 0;
                const billingItems = [];
                if (items && Array.isArray(items)) {
                    for (const item of items) {
                        const medName = item.medicine_name || item.medicine || item.name || '';
                        const med = await Medicine.findOne({ where: { name: { [Op.iLike]: `%${medName}%` } } });
                        const price = med ? parseFloat(med.unit_price) : 0;
                        const qty = parseInt(item.quantity) || 1;
                        medicineCost += price * qty;
                        billingItems.push({ name: medName, quantity: qty, amount: price * qty });
                    }
                }

                // Add consultation fee as a billing item
                if (consultationFee > 0) {
                    billingItems.unshift({ name: 'Consultation Fee', quantity: 1, amount: consultationFee });
                }

                const totalAmount = consultationFee + medicineCost;
                const invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);

                await Billing.create({
                    patient_id,
                    prescription_id: prescription.id,
                    appointment_id: appointment_id || null,
                    items: billingItems,
                    subtotal: totalAmount,
                    tax_amount: 0,
                    discount_amount: 0,
                    total_amount: totalAmount,
                    paid_amount: 0,
                    status: 'pending',
                    invoice_number: invoiceNumber,
                    notes: `Consultation with ${full.Doctor.name} — ${diagnosis || 'General consultation'}`,
                });
                logger.info(`Auto-created billing record ${invoiceNumber} for prescription ${prescription.id}`);
            } catch (billingErr) {
                logger.error(`Auto-billing creation failed: ${billingErr.message}`);
                // Don't fail the prescription creation if billing fails
            }

            res.status(201).json(full);
        } catch (err) { next(err); }
    },

    async getAll(req, res, next) {
        try {
            const { status, doctor_id, patient_id, page = 1, limit = 20, date } = req.query;
            const where = {};
            if (status) where.status = status;
            if (doctor_id) where.doctor_id = doctor_id;
            if (patient_id) where.patient_id = patient_id;
            if (date) {
                const d = new Date(date);
                const next = new Date(d);
                next.setDate(next.getDate() + 1);
                where.created_at = { [Op.between]: [d, next] };
            }

            const { count, rows } = await Prescription.findAndCountAll({
                where,
                include: [
                    { model: Patient, attributes: ['id', 'patient_code', 'first_name', 'last_name', 'phone'] },
                    { model: Doctor, attributes: ['id', 'name', 'specialty'] },
                ],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit),
                order: [['created_at', 'DESC']],
            });
            res.json({ prescriptions: rows, total: count, page: parseInt(page) });
        } catch (err) { next(err); }
    },

    async getById(req, res, next) {
        try {
            const prescription = await Prescription.findByPk(req.params.id, {
                include: [
                    { model: Patient },
                    { model: Doctor, attributes: ['id', 'name', 'specialty'] },
                    { model: Appointment },
                ],
            });
            if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
            res.json(prescription);
        } catch (err) { next(err); }
    },

    async updateStatus(req, res, next) {
        try {
            const prescription = await Prescription.findByPk(req.params.id, {
                include: [{ model: Patient }, { model: Doctor }],
            });
            if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

            const updateData = { status: req.body.status };
            if (req.body.status === 'received') {
                // Pharmacy received - notify doctor
                const io = req.app.get('io');
                if (io) io.to('doctors').emit('PRESCRIPTION_RECEIVED', { prescriptionId: prescription.id, doctorId: prescription.doctor_id });
            }
            if (req.body.status === 'dispensed') {
                updateData.dispensed_at = new Date();
                updateData.dispensed_by = req.user.id;

                // Deduct stock (FEFO)
                if (prescription.items && Array.isArray(prescription.items)) {
                    for (const item of prescription.items) {
                        if (item.medicine_id) {
                            const medicine = await Medicine.findByPk(item.medicine_id);
                            if (medicine) {
                                await medicine.update({ current_stock: Math.max(0, medicine.current_stock - (item.quantity || 1)) });
                            }
                        }
                    }
                }

                // Notify patient
                const io = req.app.get('io');
                if (io) {
                    io.to('patients').emit('PRESCRIPTION_DISPENSED', {
                        prescriptionId: prescription.id,
                        patientId: prescription.patient_id,
                        message: 'Your medicines are ready for pickup!',
                    });
                }
            }

            await prescription.update(updateData);
            res.json(prescription);
        } catch (err) { next(err); }
    },

    // Templates
    async getTemplates(req, res, next) {
        try {
            const where = {};
            if (req.query.doctor_id) where.doctor_id = req.query.doctor_id;
            const templates = await PrescriptionTemplate.findAll({ where, order: [['name', 'ASC']] });
            res.json(templates);
        } catch (err) { next(err); }
    },

    async createTemplate(req, res, next) {
        try {
            const template = await PrescriptionTemplate.create(req.body);
            res.status(201).json(template);
        } catch (err) { next(err); }
    },

    async updateTemplate(req, res, next) {
        try {
            const template = await PrescriptionTemplate.findByPk(req.params.id);
            if (!template) return res.status(404).json({ error: 'Template not found' });
            await template.update(req.body);
            res.json(template);
        } catch (err) { next(err); }
    },

    async deleteTemplate(req, res, next) {
        try {
            const template = await PrescriptionTemplate.findByPk(req.params.id);
            if (!template) return res.status(404).json({ error: 'Template not found' });
            await template.destroy();
            res.json({ message: 'Template deleted' });
        } catch (err) { next(err); }
    },
};

module.exports = prescriptionController;
