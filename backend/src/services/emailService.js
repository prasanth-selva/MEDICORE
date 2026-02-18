/**
 * Email Service using Nodemailer
 * Falls back to console logging when SMTP is not configured
 */
const nodemailer = require('nodemailer');
const { logger } = require('../middleware/logger');

let transporter = null;

const initializeTransporter = () => {
    if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        logger.info('✅ Email transporter initialized');
    } else {
        logger.warn('⚠️  SMTP not configured — emails will be logged to console');
    }
};

const sendEmail = async ({ to, subject, html, text }) => {
    const from = process.env.SMTP_FROM || 'MediCore HMS <noreply@medicore.com>';

    if (!transporter) {
        logger.info(`📧 [DEV EMAIL] To: ${to} | Subject: ${subject}`);
        logger.info(`📧 Body: ${text || 'See HTML'}`);
        return { success: true, mode: 'console' };
    }

    try {
        const result = await transporter.sendMail({ from, to, subject, html, text });
        logger.info(`📧 Email sent to ${to}: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (err) {
        logger.error(`📧 Email failed to ${to}: ${err.message}`);
        return { success: false, error: err.message };
    }
};

// ─── Email Templates ─────────────────────────────────────────

const sendAppointmentConfirmation = async (patient, appointment, doctor) => {
    return sendEmail({
        to: patient.email,
        subject: '✅ Appointment Confirmed — MediCore HMS',
        html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0D7377, #06A77D); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 20px;">🏥 MediCore HMS</h1>
                    <p style="margin: 4px 0 0; opacity: 0.9;">Appointment Confirmation</p>
                </div>
                <div style="background: #fff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                    <p>Dear <strong>${patient.first_name} ${patient.last_name}</strong>,</p>
                    <p>Your appointment has been confirmed:</p>
                    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                        <tr><td style="padding: 8px 0; color: #666;">Doctor</td><td style="padding: 8px 0; font-weight: 600;">Dr. ${doctor.name}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Specialty</td><td style="padding: 8px 0;">${doctor.specialty}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Date & Time</td><td style="padding: 8px 0; font-weight: 600;">${new Date(appointment.scheduled_time).toLocaleString()}</td></tr>
                        <tr><td style="padding: 8px 0; color: #666;">Room</td><td style="padding: 8px 0;">${doctor.room_number || 'TBA'}</td></tr>
                    </table>
                    <p style="color: #666; font-size: 13px;">Please arrive 15 minutes before your appointment.</p>
                </div>
            </div>
        `,
        text: `Appointment confirmed with Dr. ${doctor.name} on ${new Date(appointment.scheduled_time).toLocaleString()}`,
    });
};

const sendPrescriptionReady = async (patient, prescription) => {
    return sendEmail({
        to: patient.email,
        subject: '💊 Prescription Ready for Pickup — MediCore HMS',
        html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0D7377, #06A77D); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 20px;">🏥 MediCore HMS</h1>
                    <p style="margin: 4px 0 0; opacity: 0.9;">Prescription Ready</p>
                </div>
                <div style="background: #fff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                    <p>Dear <strong>${patient.first_name} ${patient.last_name}</strong>,</p>
                    <p>Your prescription is ready for pickup at the pharmacy.</p>
                    <p><strong>Prescription ID:</strong> ${prescription.id.slice(0, 8).toUpperCase()}</p>
                    <p style="color: #666; font-size: 13px;">Please bring your ID for verification.</p>
                </div>
            </div>
        `,
        text: `Your prescription ${prescription.id.slice(0, 8).toUpperCase()} is ready for pickup.`,
    });
};

const sendPasswordResetEmail = async (email, resetUrl) => {
    return sendEmail({
        to: email,
        subject: '🔑 Password Reset — MediCore HMS',
        html: `
            <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0D7377, #06A77D); color: white; padding: 24px; border-radius: 12px 12px 0 0;">
                    <h1 style="margin: 0; font-size: 20px;">🏥 MediCore HMS</h1>
                    <p style="margin: 4px 0 0; opacity: 0.9;">Password Reset Request</p>
                </div>
                <div style="background: #fff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                    <p>You requested a password reset for your MediCore HMS account.</p>
                    <p>Click the button below to reset your password. This link expires in 1 hour.</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${resetUrl}" style="display: inline-block; background: #0D7377; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
                    </div>
                    <p style="color: #666; font-size: 13px;">If you didn't request this, please ignore this email.</p>
                </div>
            </div>
        `,
        text: `Reset your password: ${resetUrl}`,
    });
};

module.exports = {
    initializeTransporter,
    sendEmail,
    sendAppointmentConfirmation,
    sendPrescriptionReady,
    sendPasswordResetEmail,
};
