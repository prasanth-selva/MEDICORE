/**
 * MediCore HMS — Database Seed Script
 * Seeds the database with demo data for all portals
 * Run: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/database');
const { User, Patient, Doctor, Medicine, Supplier, Appointment, Prescription, Billing, DiseaseRecord, SOSAlert, Notification } = require('../src/models');

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        // Sync models (force: true drops and recreates — only for seeding!)
        await sequelize.sync({ force: true });
        console.log('🔄 Tables recreated');

        // ── USERS ────────────────────────────────────────
        const passwordHash = await bcrypt.hash('admin123', 12);

        const adminUser = await User.create({ name: 'Admin MediCore', email: 'admin@medicore.com', password_hash: passwordHash, role: 'admin', phone: '+91 9000000001' });

        const drSharmaUser = await User.create({ name: 'Dr. Arun Sharma', email: 'dr.sharma@medicore.com', password_hash: passwordHash, role: 'doctor', phone: '+91 9000000002' });
        const drGuptaUser = await User.create({ name: 'Dr. Priya Gupta', email: 'dr.gupta@medicore.com', password_hash: passwordHash, role: 'doctor', phone: '+91 9000000003' });
        const drReddyUser = await User.create({ name: 'Dr. Rajesh Reddy', email: 'dr.reddy@medicore.com', password_hash: passwordHash, role: 'doctor', phone: '+91 9000000004' });
        const drShahUser = await User.create({ name: 'Dr. Meera Shah', email: 'dr.shah@medicore.com', password_hash: passwordHash, role: 'doctor', phone: '+91 9000000005' });
        const drDesaiUser = await User.create({ name: 'Dr. Vikram Desai', email: 'dr.desai@medicore.com', password_hash: passwordHash, role: 'doctor', phone: '+91 9000000006' });

        const pharmacistUser = await User.create({ name: 'Rahul Pharma', email: 'pharmacy@medicore.com', password_hash: passwordHash, role: 'pharmacist', phone: '+91 9000000007' });
        const receptionUser = await User.create({ name: 'Anita Reception', email: 'reception@medicore.com', password_hash: passwordHash, role: 'receptionist', phone: '+91 9000000008' });

        const patientUser1 = await User.create({ name: 'Ravi Kumar', email: 'patient@medicore.com', password_hash: passwordHash, role: 'patient', phone: '+91 9000000010' });
        const patientUser2 = await User.create({ name: 'Priya Patel', email: 'priya@medicore.com', password_hash: passwordHash, role: 'patient', phone: '+91 9000000011' });
        const patientUser3 = await User.create({ name: 'Arjun Singh', email: 'arjun@medicore.com', password_hash: passwordHash, role: 'patient', phone: '+91 9000000012' });
        const patientUser4 = await User.create({ name: 'Sneha Iyer', email: 'sneha@medicore.com', password_hash: passwordHash, role: 'patient', phone: '+91 9000000013' });
        const patientUser5 = await User.create({ name: 'Amit Verma', email: 'amit@medicore.com', password_hash: passwordHash, role: 'patient', phone: '+91 9000000014' });

        console.log('👤 Users created');

        // ── DOCTORS ──────────────────────────────────────
        // Model fields: user_id, name, specialty, qualification, experience_years, consultation_fee, status, phone, email, room_number
        const doctorData = [
            { user_id: drSharmaUser.id, name: 'Dr. Arun Sharma', specialty: 'General Medicine', qualification: 'MBBS, MD', experience_years: 15, consultation_fee: 500, status: 'available', phone: '+91 9000000002', email: 'dr.sharma@medicore.com', room_number: 'R-101' },
            { user_id: drGuptaUser.id, name: 'Dr. Priya Gupta', specialty: 'Pediatrics', qualification: 'MBBS, DCH', experience_years: 12, consultation_fee: 600, status: 'with_patient', phone: '+91 9000000003', email: 'dr.gupta@medicore.com', room_number: 'R-102' },
            { user_id: drReddyUser.id, name: 'Dr. Rajesh Reddy', specialty: 'Orthopedics', qualification: 'MBBS, MS Ortho', experience_years: 20, consultation_fee: 800, status: 'available', phone: '+91 9000000004', email: 'dr.reddy@medicore.com', room_number: 'R-103' },
            { user_id: drShahUser.id, name: 'Dr. Meera Shah', specialty: 'Cardiology', qualification: 'MBBS, DM Cardiology', experience_years: 18, consultation_fee: 1000, status: 'available', phone: '+91 9000000005', email: 'dr.shah@medicore.com', room_number: 'R-201' },
            { user_id: drDesaiUser.id, name: 'Dr. Vikram Desai', specialty: 'Dermatology', qualification: 'MBBS, MD Derm', experience_years: 10, consultation_fee: 700, status: 'break', phone: '+91 9000000006', email: 'dr.desai@medicore.com', room_number: 'R-202' },
        ];
        const doctors = await Doctor.bulkCreate(doctorData);
        console.log('🩺 Doctors created');

        // ── PATIENTS ─────────────────────────────────────
        // Model fields: user_id, patient_code, first_name, last_name, date_of_birth, gender, blood_group, phone, email, address, allergies, emergency_contact_name, emergency_contact_phone
        const patientData = [
            { user_id: patientUser1.id, patient_code: 'MC-2024-1001', first_name: 'Ravi', last_name: 'Kumar', date_of_birth: '1990-05-15', gender: 'male', blood_group: 'O+', phone: '+91 9000000010', email: 'patient@medicore.com', address: '123 MG Road, Mumbai', city: 'Mumbai', emergency_contact_name: 'Sunita Kumar', emergency_contact_phone: '+91 8000000001', allergies: ['Penicillin'] },
            { user_id: patientUser2.id, patient_code: 'MC-2024-1002', first_name: 'Priya', last_name: 'Patel', date_of_birth: '1996-08-22', gender: 'female', blood_group: 'A+', phone: '+91 9000000011', email: 'priya@medicore.com', address: '45 Link Road, Mumbai', city: 'Mumbai', emergency_contact_name: 'Raj Patel', emergency_contact_phone: '+91 8000000002', allergies: [] },
            { user_id: patientUser3.id, patient_code: 'MC-2024-1003', first_name: 'Arjun', last_name: 'Singh', date_of_birth: '1979-02-10', gender: 'male', blood_group: 'B-', phone: '+91 9000000012', email: 'arjun@medicore.com', address: '78 Hill Road, Mumbai', city: 'Mumbai', emergency_contact_name: 'Kavita Singh', emergency_contact_phone: '+91 8000000003', allergies: ['Aspirin', 'Sulfa'] },
            { user_id: patientUser4.id, patient_code: 'MC-2024-1004', first_name: 'Sneha', last_name: 'Iyer', date_of_birth: '1972-11-30', gender: 'female', blood_group: 'AB+', phone: '+91 9000000013', email: 'sneha@medicore.com', address: '22 Bandra West, Mumbai', city: 'Mumbai', emergency_contact_name: 'Ramesh Iyer', emergency_contact_phone: '+91 8000000004', allergies: [] },
            { user_id: patientUser5.id, patient_code: 'MC-2024-1005', first_name: 'Amit', last_name: 'Verma', date_of_birth: '1985-06-18', gender: 'male', blood_group: 'A-', phone: '+91 9000000014', email: 'amit@medicore.com', address: '56 Andheri East, Mumbai', city: 'Mumbai', emergency_contact_name: 'Neha Verma', emergency_contact_phone: '+91 8000000005', allergies: ['Codeine'] },
        ];
        const patients = await Patient.bulkCreate(patientData);
        console.log('🏥 Patients created');

        // ── SUPPLIERS ────────────────────────────────────
        // Model fields: name, contact_person, phone, email, address, rating, delivery_days
        const suppliers = await Supplier.bulkCreate([
            { name: 'MedPharma Ltd', contact_person: 'Vikash Shah', phone: '+91 22 2345 6789', email: 'orders@medpharma.com', address: 'Andheri Industrial Area, Mumbai', rating: 4.5, delivery_days: 2 },
            { name: 'CureAll Inc', contact_person: 'Aarti Desai', phone: '+91 22 3456 7890', email: 'supply@cureall.com', address: 'Worli, Mumbai', rating: 4.2, delivery_days: 3 },
            { name: 'HealthFirst Pharma', contact_person: 'Rajiv Menon', phone: '+91 22 4567 8901', email: 'orders@healthfirst.com', address: 'Powai, Mumbai', rating: 4.8, delivery_days: 1 },
        ]);
        console.log('📦 Suppliers created');

        // ── MEDICINES ────────────────────────────────────
        // Model fields: name, generic_name, category, current_stock, reorder_point, unit_price
        const medicineData = [
            { name: 'Paracetamol 500mg', generic_name: 'Acetaminophen', category: 'Analgesic', current_stock: 5200, reorder_point: 1000, unit_price: 2.50 },
            { name: 'Azithromycin 500mg', generic_name: 'Azithromycin', category: 'Antibiotic', current_stock: 180, reorder_point: 500, unit_price: 45.00 },
            { name: 'Cetirizine 10mg', generic_name: 'Cetirizine', category: 'Antihistamine', current_stock: 3200, reorder_point: 800, unit_price: 3.00 },
            { name: 'Metformin 500mg', generic_name: 'Metformin', category: 'Antidiabetic', current_stock: 4100, reorder_point: 1500, unit_price: 5.50 },
            { name: 'Amlodipine 5mg', generic_name: 'Amlodipine', category: 'Antihypertensive', current_stock: 2800, reorder_point: 600, unit_price: 8.00 },
            { name: 'Omeprazole 20mg', generic_name: 'Omeprazole', category: 'Antacid', current_stock: 2000, reorder_point: 500, unit_price: 6.00 },
            { name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin', category: 'Antibiotic', current_stock: 90, reorder_point: 400, unit_price: 12.00 },
            { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', category: 'Analgesic', current_stock: 3500, reorder_point: 800, unit_price: 4.00 },
            { name: 'Ciprofloxacin 500mg', generic_name: 'Ciprofloxacin', category: 'Antibiotic', current_stock: 1500, reorder_point: 600, unit_price: 18.00 },
            { name: 'Diclofenac 50mg', generic_name: 'Diclofenac', category: 'NSAID', current_stock: 2200, reorder_point: 500, unit_price: 5.00 },
            { name: 'Pantoprazole 40mg', generic_name: 'Pantoprazole', category: 'Antacid', current_stock: 1800, reorder_point: 400, unit_price: 7.00 },
            { name: 'Losartan 50mg', generic_name: 'Losartan', category: 'Antihypertensive', current_stock: 2100, reorder_point: 500, unit_price: 9.50 },
        ];
        const medicines = await Medicine.bulkCreate(medicineData);
        console.log('💊 Medicines created');

        // ── APPOINTMENTS ────────────────────────────────
        const now = new Date();
        const makeTime = (h, m) => {
            const d = new Date(now);
            d.setHours(h, m, 0, 0);
            return d;
        };
        const appointmentData = [
            { patient_id: patients[0].id, doctor_id: doctors[0].id, scheduled_time: makeTime(10, 30), status: 'in_progress', queue_position: 1, triage_severity: 2, primary_symptom: 'Fever & Headache' },
            { patient_id: patients[1].id, doctor_id: doctors[1].id, scheduled_time: makeTime(11, 0), status: 'booked', queue_position: 2, triage_severity: 1, primary_symptom: 'Regular Checkup' },
            { patient_id: patients[2].id, doctor_id: doctors[2].id, scheduled_time: makeTime(11, 30), status: 'booked', queue_position: 1, triage_severity: 4, primary_symptom: 'Knee Pain' },
            { patient_id: patients[3].id, doctor_id: doctors[0].id, scheduled_time: makeTime(12, 0), status: 'booked', queue_position: 2, triage_severity: 2, primary_symptom: 'Chronic Cough' },
            { patient_id: patients[4].id, doctor_id: doctors[3].id, scheduled_time: makeTime(12, 30), status: 'confirmed', queue_position: 1, triage_severity: 3, primary_symptom: 'Chest Discomfort' },
        ];
        await Appointment.bulkCreate(appointmentData);
        console.log('📅 Appointments created');

        // ── PRESCRIPTIONS ───────────────────────────────
        await Prescription.bulkCreate([
            {
                patient_id: patients[0].id, doctor_id: doctors[0].id,
                items: [
                    { medicine: 'Paracetamol 500mg', medicine_id: medicines[0].id, dosage: '500mg', frequency: 'TID', duration: '5 days', route: 'Oral', quantity: 15 },
                    { medicine: 'Cetirizine 10mg', medicine_id: medicines[2].id, dosage: '10mg', frequency: 'HS', duration: '5 days', route: 'Oral', quantity: 5 },
                ],
                diagnosis: 'Viral Fever', notes: 'Patient allergic to Penicillin. Advised rest.', status: 'dispensed',
            },
            {
                patient_id: patients[1].id, doctor_id: doctors[1].id,
                items: [
                    { medicine: 'Ciprofloxacin 500mg', medicine_id: medicines[8].id, dosage: '500mg', frequency: 'BD', duration: '7 days', route: 'Oral', quantity: 14 },
                ],
                diagnosis: 'UTI', status: 'pending',
            },
            {
                patient_id: patients[2].id, doctor_id: doctors[2].id,
                items: [
                    { medicine: 'Diclofenac 50mg', medicine_id: medicines[9].id, dosage: '50mg', frequency: 'BD', duration: '7 days', route: 'Oral', quantity: 14 },
                    { medicine: 'Pantoprazole 40mg', medicine_id: medicines[10].id, dosage: '40mg', frequency: 'OD', duration: '7 days', route: 'Oral', quantity: 7 },
                ],
                diagnosis: 'Knee Osteoarthritis', status: 'dispensed',
            },
        ]);
        console.log('📝 Prescriptions created');

        // ── BILLING ─────────────────────────────────────
        await Billing.bulkCreate([
            { patient_id: patients[0].id, invoice_number: 'INV-2024-000001', items: [{ desc: 'Consultation', amount: 500 }, { desc: 'Medicines', amount: 125 }], total_amount: 625, paid_amount: 625, payment_method: 'upi', status: 'paid' },
            { patient_id: patients[1].id, invoice_number: 'INV-2024-000002', items: [{ desc: 'Consultation', amount: 600 }, { desc: 'Medicines', amount: 252 }], total_amount: 852, paid_amount: 0, payment_method: null, status: 'pending' },
            { patient_id: patients[2].id, invoice_number: 'INV-2024-000003', items: [{ desc: 'Consultation', amount: 800 }, { desc: 'Medicines', amount: 119 }, { desc: 'X-Ray', amount: 500 }], total_amount: 1419, paid_amount: 1419, payment_method: 'card', status: 'paid' },
            { patient_id: patients[3].id, invoice_number: 'INV-2024-000004', items: [{ desc: 'Consultation', amount: 500 }], total_amount: 500, paid_amount: 500, payment_method: 'cash', status: 'paid' },
            { patient_id: patients[4].id, invoice_number: 'INV-2024-000005', items: [{ desc: 'Emergency', amount: 2000 }, { desc: 'ECG', amount: 800 }, { desc: 'Medicines', amount: 450 }], total_amount: 3250, paid_amount: 0, payment_method: null, status: 'pending' },
        ]);
        console.log('💰 Billing records created');

        // ── DISEASE RECORDS ─────────────────────────────
        // Model field: recorded_date (not reported_date)
        const diseases = ['Influenza', 'Dengue Fever', 'Hypertension', 'Type 2 Diabetes', 'Gastroenteritis', 'Bronchitis', 'UTI', 'Common Cold'];
        const regions = ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune', 'Bangalore'];
        const diseaseRecords = [];
        for (let i = 0; i < 60; i++) {
            const daysAgo = Math.floor(Math.random() * 90);
            diseaseRecords.push({
                patient_id: patients[Math.floor(Math.random() * patients.length)].id,
                diagnosis_name: diseases[Math.floor(Math.random() * diseases.length)],
                diagnosis_code: `ICD-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
                region: regions[Math.floor(Math.random() * regions.length)],
                recorded_date: new Date(Date.now() - daysAgo * 86400000),
            });
        }
        await DiseaseRecord.bulkCreate(diseaseRecords);
        console.log('🦠 Disease records created');

        // ── NOTIFICATIONS ───────────────────────────────
        // Model field: is_read (not read)
        await Notification.bulkCreate([
            { user_id: pharmacistUser.id, type: 'prescription', title: 'New Prescription', message: 'Dr. Sharma sent a prescription for Ravi Kumar', is_read: false },
            { user_id: pharmacistUser.id, type: 'inventory', title: 'Low Stock Alert', message: 'Amoxicillin 500mg stock is critically low (90 units)', is_read: false },
            { user_id: adminUser.id, type: 'system', title: 'System Started', message: 'MediCore HMS v1.0.0 initialized successfully', is_read: true },
        ]);
        console.log('🔔 Notifications created');

        console.log('\n🎉 ═══════════════════════════════════════');
        console.log('   MediCore HMS — Seed Complete!');
        console.log('   ═══════════════════════════════════════');
        console.log('');
        console.log('   Demo Accounts (password: admin123):');
        console.log('   🔑 admin@medicore.com       (Admin)');
        console.log('   🔑 dr.sharma@medicore.com   (Doctor)');
        console.log('   🔑 pharmacy@medicore.com    (Pharmacist)');
        console.log('   🔑 reception@medicore.com   (Receptionist)');
        console.log('   🔑 patient@medicore.com     (Patient)');
        console.log('');
        console.log('   ═══════════════════════════════════════\n');

        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    }
};

seed();
