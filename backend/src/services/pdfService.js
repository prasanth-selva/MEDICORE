/**
 * PDF Generation Service using PDFKit
 * Generates prescription and billing invoice PDFs
 */
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { logger } = require('../middleware/logger');

// ─── Colors ──────────────────────────────────────────────────
const BRAND_COLOR = '#0D7377';
const TEXT_DARK = '#0F172A';
const TEXT_MUTED = '#64748B';
const BORDER_COLOR = '#E2E8F0';

// ─── Prescription PDF ────────────────────────────────────────
const generatePrescriptionPDF = async ({ prescription, patient, doctor, hospitalName = 'MediCore Hospital' }) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // Header
            doc.rect(0, 0, doc.page.width, 100).fill(BRAND_COLOR);
            doc.fontSize(22).fillColor('white').text(hospitalName, 50, 30);
            doc.fontSize(10).fillColor('rgba(255,255,255,0.8)').text('AI-Powered Hospital Management System', 50, 55);
            doc.fontSize(10).text(`Prescription · ${new Date().toLocaleDateString('en-IN')}`, 50, 72);

            // Doctor Details
            doc.fillColor(TEXT_DARK);
            doc.fontSize(14).text(`Dr. ${doctor.name}`, 50, 120);
            doc.fontSize(10).fillColor(TEXT_MUTED)
                .text(`${doctor.specialty} · ${doctor.qualification || ''}`, 50, 140)
                .text(`Room: ${doctor.room_number || 'N/A'}`, 50, 155);

            // Patient Details
            doc.fontSize(10).fillColor(TEXT_MUTED).text('Patient:', 350, 120);
            doc.fillColor(TEXT_DARK).fontSize(12).text(`${patient.first_name} ${patient.last_name}`, 350, 135);
            doc.fontSize(10).fillColor(TEXT_MUTED)
                .text(`Code: ${patient.patient_code}`, 350, 152)
                .text(`Age: ${patient.age || 'N/A'} | Blood: ${patient.blood_group || 'N/A'}`, 350, 167);

            // Separator
            doc.moveTo(50, 190).lineTo(doc.page.width - 50, 190).stroke(BORDER_COLOR);

            // Diagnosis
            if (prescription.diagnosis) {
                doc.fontSize(11).fillColor(BRAND_COLOR).text('Diagnosis:', 50, 205);
                doc.fontSize(10).fillColor(TEXT_DARK).text(prescription.diagnosis, 50, 222, { width: 495 });
            }

            // Rx Symbol
            let yPos = prescription.diagnosis ? 260 : 205;
            doc.fontSize(24).fillColor(BRAND_COLOR).text('℞', 50, yPos);
            yPos += 35;

            // Medication Table Header
            const colX = { sno: 55, name: 80, dosage: 250, freq: 340, dur: 430, qty: 490 };
            doc.rect(50, yPos, 495, 25).fill('#F1F5F9');
            doc.fontSize(9).fillColor(TEXT_MUTED);
            doc.text('#', colX.sno, yPos + 7);
            doc.text('Medication', colX.name, yPos + 7);
            doc.text('Dosage', colX.dosage, yPos + 7);
            doc.text('Frequency', colX.freq, yPos + 7);
            doc.text('Duration', colX.dur, yPos + 7);
            doc.text('Qty', colX.qty, yPos + 7);
            yPos += 30;

            // Medication Rows
            const items = prescription.items || [];
            items.forEach((item, i) => {
                if (yPos > 700) {
                    doc.addPage();
                    yPos = 50;
                }
                doc.fontSize(10).fillColor(TEXT_DARK);
                doc.text(`${i + 1}`, colX.sno, yPos);
                doc.text(item.medicine_name || item.name || '', colX.name, yPos, { width: 160 });
                doc.text(item.dosage || '', colX.dosage, yPos, { width: 80 });
                doc.text(item.frequency || '', colX.freq, yPos, { width: 80 });
                doc.text(item.duration || '', colX.dur, yPos, { width: 55 });
                doc.text(`${item.quantity || ''}`, colX.qty, yPos);
                yPos += 22;
                doc.moveTo(50, yPos - 3).lineTo(545, yPos - 3).stroke(BORDER_COLOR);
            });

            // Notes
            if (prescription.notes) {
                yPos += 15;
                doc.fontSize(10).fillColor(BRAND_COLOR).text('Notes:', 50, yPos);
                yPos += 15;
                doc.fontSize(10).fillColor(TEXT_DARK).text(prescription.notes, 50, yPos, { width: 495 });
                yPos += 30;
            }

            // Follow-up
            if (prescription.follow_up_date) {
                yPos += 10;
                doc.fontSize(10).fillColor(TEXT_MUTED).text(
                    `Follow-up: ${new Date(prescription.follow_up_date).toLocaleDateString('en-IN')}`,
                    50, yPos
                );
            }

            // Signature Line
            yPos = Math.max(yPos + 50, 650);
            doc.moveTo(350, yPos).lineTo(545, yPos).stroke(TEXT_MUTED);
            doc.fontSize(10).fillColor(TEXT_MUTED).text("Doctor's Signature", 350, yPos + 5);

            // Footer
            doc.fontSize(8).fillColor(TEXT_MUTED).text(
                `Generated by MediCore HMS · ${new Date().toISOString()} · Prescription ID: ${prescription.id.slice(0, 8).toUpperCase()}`,
                50, doc.page.height - 50,
                { align: 'center', width: 495 }
            );

            doc.end();
        } catch (err) {
            logger.error(`PDF generation failed: ${err.message}`);
            reject(err);
        }
    });
};

// ─── Billing Invoice PDF ─────────────────────────────────────
const generateInvoicePDF = async ({ billing, patient, hospitalName = 'MediCore Hospital' }) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const chunks = [];

            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // Header
            doc.rect(0, 0, doc.page.width, 90).fill(BRAND_COLOR);
            doc.fontSize(22).fillColor('white').text(hospitalName, 50, 25);
            doc.fontSize(10).fillColor('rgba(255,255,255,0.8)').text('TAX INVOICE', 50, 52);
            doc.fontSize(10).text(`Invoice #: ${billing.invoice_number || billing.id.slice(0, 8).toUpperCase()}`, 50, 67);

            // Generate QR code
            try {
                const qrData = JSON.stringify({
                    invoice: billing.invoice_number || billing.id.slice(0, 8),
                    amount: billing.total_amount,
                    date: new Date().toISOString().split('T')[0],
                });
                const qrImage = await QRCode.toDataURL(qrData, { width: 80 });
                doc.image(qrImage, 460, 100, { width: 80 });
            } catch (qrErr) {
                logger.warn(`QR code generation failed: ${qrErr.message}`);
            }

            // Invoice Details
            doc.fillColor(TEXT_DARK);
            doc.fontSize(9).fillColor(TEXT_MUTED).text('Date:', 50, 110);
            doc.fontSize(10).fillColor(TEXT_DARK).text(new Date().toLocaleDateString('en-IN'), 130, 110);
            doc.fontSize(9).fillColor(TEXT_MUTED).text('Status:', 50, 127);
            doc.fontSize(10).fillColor(billing.status === 'paid' ? '#06A77D' : '#E63946')
                .text((billing.status || 'pending').toUpperCase(), 130, 127);

            // Patient
            doc.fontSize(9).fillColor(TEXT_MUTED).text('Bill To:', 50, 155);
            doc.fontSize(12).fillColor(TEXT_DARK).text(`${patient.first_name} ${patient.last_name}`, 50, 170);
            doc.fontSize(9).fillColor(TEXT_MUTED)
                .text(`Code: ${patient.patient_code}`, 50, 187)
                .text(`Phone: ${patient.phone}`, 50, 200);

            // Items Table
            let yPos = 230;
            doc.rect(50, yPos, 495, 25).fill('#F1F5F9');
            doc.fontSize(9).fillColor(TEXT_MUTED);
            doc.text('#', 55, yPos + 7);
            doc.text('Item', 75, yPos + 7);
            doc.text('Qty', 330, yPos + 7);
            doc.text('Rate', 380, yPos + 7);
            doc.text('Amount', 460, yPos + 7);
            yPos += 30;

            const items = billing.items || [];
            items.forEach((item, i) => {
                doc.fontSize(10).fillColor(TEXT_DARK);
                doc.text(`${i + 1}`, 55, yPos);
                doc.text(item.name || item.medicine_name || '', 75, yPos, { width: 245 });
                doc.text(`${item.quantity || 1}`, 330, yPos);
                doc.text(`₹${parseFloat(item.price || item.rate || 0).toFixed(2)}`, 380, yPos);
                doc.text(`₹${(parseFloat(item.price || item.rate || 0) * (item.quantity || 1)).toFixed(2)}`, 460, yPos);
                yPos += 20;
                doc.moveTo(50, yPos - 2).lineTo(545, yPos - 2).stroke(BORDER_COLOR);
            });

            // Totals
            yPos += 15;
            const totalX = 380;
            doc.fontSize(10).fillColor(TEXT_MUTED).text('Subtotal:', totalX, yPos);
            doc.fillColor(TEXT_DARK).text(`₹${parseFloat(billing.subtotal || 0).toFixed(2)}`, 460, yPos);
            yPos += 18;

            if (parseFloat(billing.tax_amount) > 0) {
                doc.fillColor(TEXT_MUTED).text('Tax:', totalX, yPos);
                doc.fillColor(TEXT_DARK).text(`₹${parseFloat(billing.tax_amount).toFixed(2)}`, 460, yPos);
                yPos += 18;
            }

            if (parseFloat(billing.discount_amount) > 0) {
                doc.fillColor(TEXT_MUTED).text('Discount:', totalX, yPos);
                doc.fillColor('#06A77D').text(`-₹${parseFloat(billing.discount_amount).toFixed(2)}`, 460, yPos);
                yPos += 18;
            }

            doc.rect(totalX - 10, yPos, 175, 25).fill(BRAND_COLOR);
            doc.fontSize(12).fillColor('white').text('Total:', totalX, yPos + 6);
            doc.text(`₹${parseFloat(billing.total_amount || 0).toFixed(2)}`, 460, yPos + 6);

            yPos += 40;
            if (billing.payment_method) {
                doc.fontSize(10).fillColor(TEXT_MUTED).text(`Payment Method: ${billing.payment_method.toUpperCase()}`, 50, yPos);
            }

            // Footer
            doc.fontSize(8).fillColor(TEXT_MUTED).text(
                `Generated by MediCore HMS · ${new Date().toISOString()}`,
                50, doc.page.height - 50,
                { align: 'center', width: 495 }
            );

            doc.end();
        } catch (err) {
            logger.error(`Invoice PDF generation failed: ${err.message}`);
            reject(err);
        }
    });
};

module.exports = { generatePrescriptionPDF, generateInvoicePDF };
