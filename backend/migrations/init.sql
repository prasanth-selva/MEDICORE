-- MediCore HMS Database Schema
-- PostgreSQL 15 with pgcrypto

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM Types
CREATE TYPE user_role AS ENUM ('admin', 'doctor', 'pharmacist', 'receptionist', 'patient');
CREATE TYPE doctor_status AS ENUM ('available', 'with_patient', 'break', 'lunch', 'meeting', 'leave');
CREATE TYPE appointment_status AS ENUM ('booked', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE prescription_status AS ENUM ('pending', 'received', 'dispensed');
CREATE TYPE billing_status AS ENUM ('pending', 'paid', 'partial', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'upi', 'insurance');
CREATE TYPE sos_status AS ENUM ('pending', 'acknowledged', 'dispatched', 'resolved');
CREATE TYPE urgency_level AS ENUM ('critical', 'high', 'medium', 'low');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'patient',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    patient_code VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    age INTEGER,
    father_name VARCHAR(200),
    height_cm DECIMAL(5,2),
    weight_kg DECIMAL(5,2),
    blood_group VARCHAR(5),
    location TEXT,
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(10),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    allergies TEXT[] DEFAULT '{}',
    existing_conditions TEXT[] DEFAULT '{}',
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    consent_given BOOLEAN DEFAULT false,
    consent_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctors table
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    qualification VARCHAR(255),
    experience_years INTEGER,
    phone VARCHAR(20),
    email VARCHAR(255),
    status doctor_status DEFAULT 'available',
    status_updated_at TIMESTAMPTZ DEFAULT NOW(),
    consultation_fee DECIMAL(10,2) DEFAULT 0,
    room_number VARCHAR(20),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctor schedules
CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status appointment_status DEFAULT 'booked',
    triage_severity INTEGER CHECK (triage_severity >= 1 AND triage_severity <= 5),
    primary_symptom VARCHAR(255),
    symptoms_duration VARCHAR(100),
    is_walk_in BOOLEAN DEFAULT false,
    queue_position INTEGER,
    estimated_wait_minutes INTEGER,
    notes TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    rating DECIMAL(3,2) DEFAULT 0,
    delivery_days INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medicines table
CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100),
    manufacturer VARCHAR(255),
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    reorder_point INTEGER DEFAULT 100,
    current_stock INTEGER DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'tablets',
    description TEXT,
    requires_prescription BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory batches table (FEFO tracking)
CREATE TABLE inventory_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    initial_quantity INTEGER NOT NULL DEFAULT 0,
    purchase_price DECIMAL(10,2) DEFAULT 0,
    selling_price DECIMAL(10,2) DEFAULT 0,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    manufacture_date DATE,
    received_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescriptions table
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    items JSONB NOT NULL DEFAULT '[]',
    diagnosis TEXT,
    notes TEXT,
    follow_up_date DATE,
    status prescription_status DEFAULT 'pending',
    dispensed_at TIMESTAMPTZ,
    dispensed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prescription templates
CREATE TABLE prescription_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100),
    items JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing table
CREATE TABLE billing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    items JSONB DEFAULT '[]',
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    payment_method payment_method,
    status billing_status DEFAULT 'pending',
    invoice_number VARCHAR(50) UNIQUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disease records
CREATE TABLE disease_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    diagnosis_code VARCHAR(20),
    diagnosis_name VARCHAR(255) NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    recorded_date DATE DEFAULT CURRENT_DATE,
    region VARCHAR(100),
    severity INTEGER CHECK (severity >= 1 AND severity <= 5),
    symptoms TEXT[],
    outcome VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS Alerts
CREATE TABLE sos_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
    primary_symptom VARCHAR(255),
    symptoms TEXT,
    is_alone BOOLEAN,
    can_walk BOOLEAN,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status sos_status DEFAULT 'pending',
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs (immutable)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_role VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Predictions log
CREATE TABLE ai_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_type VARCHAR(50) NOT NULL,
    input_params JSONB,
    prediction_result JSONB,
    confidence_score DECIMAL(4,3),
    actual_outcome JSONB,
    was_accurate BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Restock recommendations
CREATE TABLE restock_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    medicine_id UUID REFERENCES medicines(id) ON DELETE CASCADE,
    current_stock INTEGER,
    predicted_demand_30d INTEGER,
    recommended_order_qty INTEGER,
    urgency urgency_level DEFAULT 'medium',
    estimated_days_remaining INTEGER,
    auto_generated BOOLEAN DEFAULT true,
    approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_patients_patient_code ON patients(patient_code);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_time);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status ON prescriptions(status);
CREATE INDEX idx_prescriptions_pending ON prescriptions(status) WHERE status = 'pending';
CREATE INDEX idx_medicines_name ON medicines(name);
CREATE INDEX idx_medicines_category ON medicines(category);
CREATE INDEX idx_inventory_expiry ON inventory_batches(expiry_date);
CREATE INDEX idx_inventory_medicine ON inventory_batches(medicine_id);
CREATE INDEX idx_billing_patient ON billing(patient_id);
CREATE INDEX idx_billing_status ON billing(status);
CREATE INDEX idx_disease_records_date ON disease_records(recorded_date);
CREATE INDEX idx_disease_records_region ON disease_records(region);
CREATE INDEX idx_disease_records_diagnosis ON disease_records(diagnosis_name);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (action, table_name, record_id, new_value)
        VALUES ('INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (action, table_name, record_id, old_value, new_value)
        VALUES ('UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (action, table_name, record_id, old_value)
        VALUES ('DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers
CREATE TRIGGER audit_patients AFTER INSERT OR UPDATE OR DELETE ON patients FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_prescriptions AFTER INSERT OR UPDATE OR DELETE ON prescriptions FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_medicines AFTER INSERT OR UPDATE OR DELETE ON medicines FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_billing AFTER INSERT OR UPDATE OR DELETE ON billing FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_appointments AFTER INSERT OR UPDATE OR DELETE ON appointments FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_sos_alerts AFTER INSERT OR UPDATE OR DELETE ON sos_alerts FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Insert default admin user (password: admin123)
INSERT INTO users (name, email, password_hash, role, phone)
VALUES ('System Admin', 'admin@medicore.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '9999999999');
