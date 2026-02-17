const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'doctor', 'pharmacist', 'receptionist', 'patient'), defaultValue: 'patient' },
    phone: { type: DataTypes.STRING(20) },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    last_login: { type: DataTypes.DATE },
}, { tableName: 'users' });

const Patient = sequelize.define('Patient', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
    patient_code: { type: DataTypes.STRING(20), unique: true, allowNull: false },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    date_of_birth: DataTypes.DATEONLY,
    gender: DataTypes.STRING(10),
    age: DataTypes.INTEGER,
    father_name: DataTypes.STRING(200),
    height_cm: DataTypes.DECIMAL(5, 2),
    weight_kg: DataTypes.DECIMAL(5, 2),
    blood_group: DataTypes.STRING(5),
    location: DataTypes.TEXT,
    address: DataTypes.TEXT,
    city: DataTypes.STRING(100),
    pincode: DataTypes.STRING(10),
    phone: { type: DataTypes.STRING(20), allowNull: false },
    email: DataTypes.STRING,
    allergies: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    existing_conditions: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    emergency_contact_name: DataTypes.STRING(200),
    emergency_contact_phone: DataTypes.STRING(20),
    consent_given: { type: DataTypes.BOOLEAN, defaultValue: false },
    consent_timestamp: DataTypes.DATE,
}, { tableName: 'patients' });

const Doctor = sequelize.define('Doctor', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
    name: { type: DataTypes.STRING, allowNull: false },
    specialty: { type: DataTypes.STRING(100), allowNull: false },
    qualification: DataTypes.STRING,
    experience_years: DataTypes.INTEGER,
    phone: DataTypes.STRING(20),
    email: DataTypes.STRING,
    status: { type: DataTypes.ENUM('available', 'with_patient', 'break', 'lunch', 'meeting', 'leave'), defaultValue: 'available' },
    status_updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    consultation_fee: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    room_number: DataTypes.STRING(20),
    avatar_url: DataTypes.TEXT,
}, { tableName: 'doctors' });

const Appointment = sequelize.define('Appointment', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, references: { model: 'patients', key: 'id' } },
    doctor_id: { type: DataTypes.UUID, references: { model: 'doctors', key: 'id' } },
    scheduled_time: { type: DataTypes.DATE, allowNull: false },
    end_time: DataTypes.DATE,
    status: { type: DataTypes.ENUM('booked', 'confirmed', 'in_progress', 'completed', 'cancelled'), defaultValue: 'booked' },
    triage_severity: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
    primary_symptom: DataTypes.STRING,
    symptoms_duration: DataTypes.STRING(100),
    is_walk_in: { type: DataTypes.BOOLEAN, defaultValue: false },
    queue_position: DataTypes.INTEGER,
    estimated_wait_minutes: DataTypes.INTEGER,
    notes: DataTypes.TEXT,
    reason: DataTypes.TEXT,
}, { tableName: 'appointments' });

const Medicine = sequelize.define('Medicine', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    generic_name: DataTypes.STRING,
    category: DataTypes.STRING(100),
    manufacturer: DataTypes.STRING,
    unit_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    reorder_point: { type: DataTypes.INTEGER, defaultValue: 100 },
    current_stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    unit: { type: DataTypes.STRING(50), defaultValue: 'tablets' },
    description: DataTypes.TEXT,
    requires_prescription: { type: DataTypes.BOOLEAN, defaultValue: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'medicines' });

const InventoryBatch = sequelize.define('InventoryBatch', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    medicine_id: { type: DataTypes.UUID, references: { model: 'medicines', key: 'id' } },
    batch_number: { type: DataTypes.STRING(100), allowNull: false },
    expiry_date: { type: DataTypes.DATEONLY, allowNull: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    initial_quantity: { type: DataTypes.INTEGER, defaultValue: 0 },
    purchase_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    selling_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    supplier_id: { type: DataTypes.UUID, references: { model: 'suppliers', key: 'id' } },
    manufacture_date: DataTypes.DATEONLY,
    received_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'inventory_batches', updatedAt: false });

const Supplier = sequelize.define('Supplier', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    contact_person: DataTypes.STRING,
    phone: DataTypes.STRING(20),
    email: DataTypes.STRING,
    address: DataTypes.TEXT,
    rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
    delivery_days: { type: DataTypes.INTEGER, defaultValue: 3 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'suppliers' });

const Prescription = sequelize.define('Prescription', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, references: { model: 'patients', key: 'id' } },
    doctor_id: { type: DataTypes.UUID, references: { model: 'doctors', key: 'id' } },
    appointment_id: { type: DataTypes.UUID, references: { model: 'appointments', key: 'id' } },
    items: { type: DataTypes.JSONB, defaultValue: [] },
    diagnosis: DataTypes.TEXT,
    notes: DataTypes.TEXT,
    follow_up_date: DataTypes.DATEONLY,
    status: { type: DataTypes.ENUM('pending', 'received', 'dispensed'), defaultValue: 'pending' },
    dispensed_at: DataTypes.DATE,
    dispensed_by: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
}, { tableName: 'prescriptions' });

const PrescriptionTemplate = sequelize.define('PrescriptionTemplate', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    doctor_id: { type: DataTypes.UUID, references: { model: 'doctors', key: 'id' } },
    name: { type: DataTypes.STRING, allowNull: false },
    specialty: DataTypes.STRING(100),
    items: { type: DataTypes.JSONB, defaultValue: [] },
    notes: DataTypes.TEXT,
}, { tableName: 'prescription_templates' });

const Billing = sequelize.define('Billing', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, references: { model: 'patients', key: 'id' } },
    prescription_id: { type: DataTypes.UUID, references: { model: 'prescriptions', key: 'id' } },
    appointment_id: { type: DataTypes.UUID, references: { model: 'appointments', key: 'id' } },
    items: { type: DataTypes.JSONB, defaultValue: [] },
    subtotal: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    discount_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    total_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    paid_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    payment_method: DataTypes.ENUM('cash', 'card', 'upi', 'insurance'),
    status: { type: DataTypes.ENUM('pending', 'paid', 'partial', 'cancelled'), defaultValue: 'pending' },
    invoice_number: { type: DataTypes.STRING(50), unique: true },
    notes: DataTypes.TEXT,
}, { tableName: 'billing' });

const DiseaseRecord = sequelize.define('DiseaseRecord', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    diagnosis_code: DataTypes.STRING(20),
    diagnosis_name: { type: DataTypes.STRING, allowNull: false },
    patient_id: { type: DataTypes.UUID, references: { model: 'patients', key: 'id' } },
    doctor_id: { type: DataTypes.UUID, references: { model: 'doctors', key: 'id' } },
    recorded_date: { type: DataTypes.DATEONLY, defaultValue: DataTypes.NOW },
    region: DataTypes.STRING(100),
    severity: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
    symptoms: { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
    outcome: DataTypes.STRING(50),
}, { tableName: 'disease_records', updatedAt: false });

const SOSAlert = sequelize.define('SOSAlert', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    patient_id: { type: DataTypes.UUID, references: { model: 'patients', key: 'id' } },
    severity: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 5 } },
    primary_symptom: DataTypes.STRING,
    symptoms: DataTypes.TEXT,
    is_alone: DataTypes.BOOLEAN,
    can_walk: DataTypes.BOOLEAN,
    latitude: DataTypes.DECIMAL(10, 8),
    longitude: DataTypes.DECIMAL(11, 8),
    status: { type: DataTypes.ENUM('pending', 'acknowledged', 'dispatched', 'resolved'), defaultValue: 'pending' },
    acknowledged_by: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
    acknowledged_at: DataTypes.DATE,
    resolved_at: DataTypes.DATE,
    notes: DataTypes.TEXT,
}, { tableName: 'sos_alerts' });

const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: DataTypes.UUID,
    user_role: DataTypes.STRING(50),
    action: { type: DataTypes.STRING(50), allowNull: false },
    table_name: { type: DataTypes.STRING(100), allowNull: false },
    record_id: DataTypes.UUID,
    old_value: DataTypes.JSONB,
    new_value: DataTypes.JSONB,
    ip_address: DataTypes.STRING,
    user_agent: DataTypes.TEXT,
}, { tableName: 'audit_logs', timestamps: true, updatedAt: false, createdAt: 'created_at' });

const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, references: { model: 'users', key: 'id' } },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.STRING(50), defaultValue: 'info' },
    is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
    link: DataTypes.TEXT,
}, { tableName: 'notifications', updatedAt: false });

// Associations
User.hasOne(Patient, { foreignKey: 'user_id' });
Patient.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(Doctor, { foreignKey: 'user_id' });
Doctor.belongsTo(User, { foreignKey: 'user_id' });

Patient.hasMany(Appointment, { foreignKey: 'patient_id' });
Appointment.belongsTo(Patient, { foreignKey: 'patient_id' });

Doctor.hasMany(Appointment, { foreignKey: 'doctor_id' });
Appointment.belongsTo(Doctor, { foreignKey: 'doctor_id' });

Patient.hasMany(Prescription, { foreignKey: 'patient_id' });
Prescription.belongsTo(Patient, { foreignKey: 'patient_id' });

Doctor.hasMany(Prescription, { foreignKey: 'doctor_id' });
Prescription.belongsTo(Doctor, { foreignKey: 'doctor_id' });

Appointment.hasOne(Prescription, { foreignKey: 'appointment_id' });
Prescription.belongsTo(Appointment, { foreignKey: 'appointment_id' });

Doctor.hasMany(PrescriptionTemplate, { foreignKey: 'doctor_id' });
PrescriptionTemplate.belongsTo(Doctor, { foreignKey: 'doctor_id' });

Medicine.hasMany(InventoryBatch, { foreignKey: 'medicine_id' });
InventoryBatch.belongsTo(Medicine, { foreignKey: 'medicine_id' });

Supplier.hasMany(InventoryBatch, { foreignKey: 'supplier_id' });
InventoryBatch.belongsTo(Supplier, { foreignKey: 'supplier_id' });

Patient.hasMany(Billing, { foreignKey: 'patient_id' });
Billing.belongsTo(Patient, { foreignKey: 'patient_id' });

Prescription.hasOne(Billing, { foreignKey: 'prescription_id' });
Billing.belongsTo(Prescription, { foreignKey: 'prescription_id' });

Patient.hasMany(DiseaseRecord, { foreignKey: 'patient_id' });
DiseaseRecord.belongsTo(Patient, { foreignKey: 'patient_id' });

Patient.hasMany(SOSAlert, { foreignKey: 'patient_id' });
SOSAlert.belongsTo(Patient, { foreignKey: 'patient_id' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id' });

module.exports = {
    sequelize,
    User, Patient, Doctor, Appointment, Medicine,
    InventoryBatch, Supplier, Prescription, PrescriptionTemplate,
    Billing, DiseaseRecord, SOSAlert, AuditLog, Notification,
};
