import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, DollarSign, Pill, AlertTriangle, Stethoscope, TrendingUp, Activity, Clock, Package, Upload, Plus, X, FileText, UserPlus } from 'lucide-react';
import api from '../shared/utils/api';
import SOSPanel from '../shared/components/SOSPanel';

const COLORS = ['#0D7377', '#06A77D', '#457B9D', '#F4A261', '#E63946', '#2D6A4F'];

export default function AdminDashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        todayAppointments: 0, todayRevenue: 0,
        totalPatients: 0, activeDoctors: 0,
        pendingPrescriptions: 0, lowStockMeds: 0,
    });
    const [revenueData, setRevenueData] = useState([]);
    const [diseaseData, setDiseaseData] = useState([]);
    const [recentAppointments, setRecentAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [sosAlerts, setSosAlerts] = useState([]);

    // Modals
    const [showAddDoctor, setShowAddDoctor] = useState(false);
    const [showImportCSV, setShowImportCSV] = useState(false);
    const [showAddPatient, setShowAddPatient] = useState(false);
    const [importType, setImportType] = useState('doctor'); // 'doctor' or 'medicine'
    const [importResult, setImportResult] = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Doctor form state
    const [doctorForm, setDoctorForm] = useState({
        name: '', email: '', password: '', specialty: '', qualification: '',
        experience_years: '', consultation_fee: '', room_number: '', phone: '',
    });

    // Patient form state
    const [patientForm, setPatientForm] = useState({
        first_name: '', last_name: '', email: '', phone: '', age: '',
        gender: 'male', blood_group: '', address: '', emergency_contact_name: '',
        emergency_contact_phone: '', allergies: '',
    });

    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [statsRes, diseaseRes, revenueRes, appointmentsRes, doctorsRes] = await Promise.allSettled([
                api.get('/dashboard/stats'),
                api.get('/dashboard/diseases?days=30'),
                api.get('/billing/revenue?period=7'),
                api.get('/appointments?date=' + new Date().toISOString().split('T')[0] + '&limit=10'),
                api.get('/doctors'),
            ]);

            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (diseaseRes.status === 'fulfilled' && diseaseRes.value.data.topDiseases?.length > 0) {
                setDiseaseData(diseaseRes.value.data.topDiseases.map(d => ({ name: d.diagnosis_name, count: parseInt(d.count) })));
            }
            if (revenueRes.status === 'fulfilled' && revenueRes.value.data.daily?.length > 0) {
                setRevenueData(revenueRes.value.data.daily.map(d => ({
                    name: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
                    revenue: parseFloat(d.total) || 0,
                    count: parseInt(d.count) || 0,
                })));
            }
            if (appointmentsRes.status === 'fulfilled') {
                const appts = appointmentsRes.value.data.appointments || [];
                setRecentAppointments(appts.map(a => ({
                    id: a.id,
                    patient: a.Patient ? `${a.Patient.first_name} ${a.Patient.last_name}` : 'Unknown',
                    doctor: a.Doctor ? a.Doctor.name : 'Unknown',
                    time: new Date(a.scheduled_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    status: a.status,
                    severity: a.triage_severity || 1,
                })));
            }
            if (doctorsRes.status === 'fulfilled') {
                setDoctors(doctorsRes.value.data || []);
            }
        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    useEffect(() => {
        if (socket) {
            socket.on('SOS_ALERT', (data) => setSosAlerts(prev => [data, ...prev]));
            socket.on('QUEUE_UPDATED', () => loadDashboardData());
            socket.on('DOCTOR_STATUS_CHANGED', (data) => {
                setDoctors(prev => prev.map(d => d.id === data.doctorId ? { ...d, status: data.status } : d));
            });
            return () => {
                socket.off('SOS_ALERT');
                socket.off('QUEUE_UPDATED');
                socket.off('DOCTOR_STATUS_CHANGED');
            };
        }
    }, [socket]);

    // Add Doctor
    const handleAddDoctor = async (e) => {
        e.preventDefault();
        setFormError(''); setFormSuccess('');
        try {
            // First create user, then doctor record
            const userRes = await api.post('/auth/register', {
                name: doctorForm.name,
                email: doctorForm.email,
                password: doctorForm.password || 'MediCore@2024',
                role: 'doctor',
                phone: doctorForm.phone,
            });

            await api.post('/doctors', {
                user_id: userRes.data.user?.id,
                name: doctorForm.name,
                specialty: doctorForm.specialty,
                qualification: doctorForm.qualification,
                experience_years: parseInt(doctorForm.experience_years) || 0,
                consultation_fee: parseFloat(doctorForm.consultation_fee) || 0,
                room_number: doctorForm.room_number,
                status: 'available',
            });

            setFormSuccess('Doctor added successfully!');
            setDoctorForm({ name: '', email: '', password: '', specialty: '', qualification: '', experience_years: '', consultation_fee: '', room_number: '', phone: '' });
            loadDashboardData();
            setTimeout(() => { setShowAddDoctor(false); setFormSuccess(''); }, 1500);
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to add doctor');
        }
    };

    // Add Patient
    const handleAddPatient = async (e) => {
        e.preventDefault();
        setFormError(''); setFormSuccess('');
        try {
            await api.post('/patients', {
                ...patientForm,
                age: parseInt(patientForm.age) || 0,
                allergies: patientForm.allergies ? patientForm.allergies.split(',').map(a => a.trim()) : [],
            });
            setFormSuccess('Patient registered successfully!');
            setPatientForm({ first_name: '', last_name: '', email: '', phone: '', age: '', gender: 'male', blood_group: '', address: '', emergency_contact_name: '', emergency_contact_phone: '', allergies: '' });
            loadDashboardData();
            setTimeout(() => { setShowAddPatient(false); setFormSuccess(''); }, 1500);
        } catch (err) {
            setFormError(err.response?.data?.error || 'Failed to register patient');
        }
    };

    // CSV Import
    const handleCSVImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportLoading(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const endpoint = importType === 'doctor' ? '/doctors/import' : '/inventory/import';
            const { data } = await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportResult(data);
            loadDashboardData();
        } catch (err) {
            setImportResult({ error: err.response?.data?.error || 'Import failed' });
        } finally {
            setImportLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const statusLabel = { booked: 'Waiting', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Done' };
    const statusBadge = { booked: 'badge-warning', confirmed: 'badge-info', in_progress: 'badge-primary', completed: 'badge-success' };
    const doctorStatusEmoji = { available: '🟢', with_patient: '🔵', break: '🟡', lunch: '🟠', offline: '🔴' };

    return (
        <div className="animate-fade">
            {/* SOS Emergency Panel */}
            <SOSPanel compact />

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAddDoctor(true)}>
                    <Plus size={14} /> Add Doctor
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => { setImportType('doctor'); setShowImportCSV(true); setImportResult(null); }}>
                    <Upload size={14} /> Import Doctors CSV
                </button>
                <button className="btn btn-success btn-sm" onClick={() => setShowAddPatient(true)}>
                    <UserPlus size={14} /> Register Patient
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => { setImportType('medicine'); setShowImportCSV(true); setImportResult(null); }}>
                    <Upload size={14} /> Import Medicines CSV
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Calendar size={22} /></div>
                    <div>
                        <div className="stat-value">{stats.todayAppointments}</div>
                        <div className="stat-label">Today's Appointments</div>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success"><DollarSign size={22} /></div>
                    <div>
                        <div className="stat-value">₹{(stats.todayRevenue / 1000).toFixed(1)}K</div>
                        <div className="stat-label">Today's Revenue</div>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><Users size={22} /></div>
                    <div>
                        <div className="stat-value">{(stats.totalPatients || 0).toLocaleString()}</div>
                        <div className="stat-label">Total Patients</div>
                    </div>
                </div>
                <div className="stat-card danger">
                    <div className="stat-icon danger"><Package size={22} /></div>
                    <div>
                        <div className="stat-value">{stats.lowStockMeds}</div>
                        <div className="stat-label">Low Stock Alerts</div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid-2 mb-6">
                <div className="chart-container">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Revenue Overview</h3>
                            <p className="card-subtitle">Daily revenue (last 7 days)</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }} formatter={(val) => `₹${Number(val).toLocaleString()}`} />
                            <Bar dataKey="revenue" fill="#0D7377" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Disease Distribution</h3>
                            <p className="card-subtitle">Top diseases this month</p>
                        </div>
                    </div>
                    {diseaseData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={diseaseData} cx="50%" cy="50%" outerRadius={90} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                    {diseaseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No disease records yet
                        </div>
                    )}
                </div>
            </div>

            {/* Live Queue & Doctor Status */}
            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><span className="live-dot" style={{ marginRight: 8 }}></span>Live Patient Queue</h3>
                        <span className="badge badge-primary">{recentAppointments.length} today</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentAppointments.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No appointments today</div>
                        ) : recentAppointments.map(a => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `var(--primary-${a.severity > 3 ? '200' : '50'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                                    {a.patient.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.patient}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.doctor} · {a.time}</div>
                                </div>
                                {a.severity >= 4 && <span className="badge badge-danger">Urgent</span>}
                                <span className={`badge ${statusBadge[a.status]}`}>{statusLabel[a.status]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Doctor Status Board</h3>
                        <span className="badge badge-success badge-dot">{doctors.filter(d => d.status === 'available').length} Active</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {doctors.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No doctors registered yet</div>
                        ) : doctors.map((d) => (
                            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-50))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                                    {d.name?.split(' ').pop()?.charAt(0) || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.specialty} · Room {d.room_number || '—'}</div>
                                </div>
                                <span className={`badge badge-dot ${d.status === 'available' ? 'badge-success' : d.status === 'with_patient' ? 'badge-info' : d.status === 'lunch' ? 'badge-warning' : 'badge-neutral'}`}>
                                    {doctorStatusEmoji[d.status] || '⚪'} {(d.status || 'offline').replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ======= ADD DOCTOR MODAL ======= */}
            {showAddDoctor && (
                <div className="modal-overlay" onClick={() => setShowAddDoctor(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3><Plus size={18} /> Add New Doctor</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddDoctor(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddDoctor}>
                            {formError && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{formError}</div>}
                            {formSuccess && <div className="alert-banner success" style={{ marginBottom: 12 }}>{formSuccess}</div>}
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Full Name *</label>
                                    <input className="form-input" required value={doctorForm.name} onChange={e => setDoctorForm(p => ({ ...p, name: e.target.value }))} placeholder="Dr. Arun Sharma" />
                                </div>
                                <div className="form-group">
                                    <label>Email *</label>
                                    <input className="form-input" type="email" required value={doctorForm.email} onChange={e => setDoctorForm(p => ({ ...p, email: e.target.value }))} placeholder="dr.sharma@medicore.com" />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input className="form-input" type="password" value={doctorForm.password} onChange={e => setDoctorForm(p => ({ ...p, password: e.target.value }))} placeholder="Default: MediCore@2024" />
                                </div>
                                <div className="form-group">
                                    <label>Specialty *</label>
                                    <select className="form-input" required value={doctorForm.specialty} onChange={e => setDoctorForm(p => ({ ...p, specialty: e.target.value }))}>
                                        <option value="">Select...</option>
                                        {['General Medicine', 'Pediatrics', 'Orthopedics', 'Cardiology', 'Dermatology', 'Neurology', 'ENT', 'Gynecology', 'Ophthalmology', 'Psychiatry'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Qualification</label>
                                    <input className="form-input" value={doctorForm.qualification} onChange={e => setDoctorForm(p => ({ ...p, qualification: e.target.value }))} placeholder="MBBS, MD" />
                                </div>
                                <div className="form-group">
                                    <label>Experience (years)</label>
                                    <input className="form-input" type="number" value={doctorForm.experience_years} onChange={e => setDoctorForm(p => ({ ...p, experience_years: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Consultation Fee (₹)</label>
                                    <input className="form-input" type="number" value={doctorForm.consultation_fee} onChange={e => setDoctorForm(p => ({ ...p, consultation_fee: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Room Number</label>
                                    <input className="form-input" value={doctorForm.room_number} onChange={e => setDoctorForm(p => ({ ...p, room_number: e.target.value }))} placeholder="101" />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Phone</label>
                                    <input className="form-input" value={doctorForm.phone} onChange={e => setDoctorForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9876543210" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddDoctor(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Doctor</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======= REGISTER PATIENT MODAL ======= */}
            {showAddPatient && (
                <div className="modal-overlay" onClick={() => setShowAddPatient(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3><UserPlus size={18} /> Register New Patient</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddPatient(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddPatient}>
                            {formError && <div className="alert-banner danger" style={{ marginBottom: 12 }}>{formError}</div>}
                            {formSuccess && <div className="alert-banner success" style={{ marginBottom: 12 }}>{formSuccess}</div>}
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>First Name *</label>
                                    <input className="form-input" required value={patientForm.first_name} onChange={e => setPatientForm(p => ({ ...p, first_name: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Last Name *</label>
                                    <input className="form-input" required value={patientForm.last_name} onChange={e => setPatientForm(p => ({ ...p, last_name: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Phone *</label>
                                    <input className="form-input" required value={patientForm.phone} onChange={e => setPatientForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 9876543210" />
                                </div>
                                <div className="form-group">
                                    <label>Age</label>
                                    <input className="form-input" type="number" value={patientForm.age} onChange={e => setPatientForm(p => ({ ...p, age: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Gender</label>
                                    <select className="form-input" value={patientForm.gender} onChange={e => setPatientForm(p => ({ ...p, gender: e.target.value }))}>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Blood Group</label>
                                    <select className="form-input" value={patientForm.blood_group} onChange={e => setPatientForm(p => ({ ...p, blood_group: e.target.value }))}>
                                        <option value="">Select...</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Address</label>
                                    <input className="form-input" value={patientForm.address} onChange={e => setPatientForm(p => ({ ...p, address: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Emergency Contact Name</label>
                                    <input className="form-input" value={patientForm.emergency_contact_name} onChange={e => setPatientForm(p => ({ ...p, emergency_contact_name: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Emergency Contact Phone</label>
                                    <input className="form-input" value={patientForm.emergency_contact_phone} onChange={e => setPatientForm(p => ({ ...p, emergency_contact_phone: e.target.value }))} />
                                </div>
                                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                    <label>Allergies (comma-separated)</label>
                                    <input className="form-input" value={patientForm.allergies} onChange={e => setPatientForm(p => ({ ...p, allergies: e.target.value }))} placeholder="Penicillin, Sulfa" />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddPatient(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Register Patient</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ======= CSV IMPORT MODAL ======= */}
            {showImportCSV && (
                <div className="modal-overlay" onClick={() => setShowImportCSV(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3><Upload size={18} /> Import {importType === 'doctor' ? 'Doctors' : 'Medicines'} CSV</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowImportCSV(false)}><X size={18} /></button>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <h4 style={{ marginBottom: 8, fontSize: 13 }}>CSV Format Required:</h4>
                            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, fontSize: 12, fontFamily: 'monospace', overflowX: 'auto' }}>
                                {importType === 'doctor' ? (
                                    <>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Header row:</div>
                                        <div>name,email,password,specialty,qualification,experience_years,consultation_fee,room_number,phone</div>
                                        <div style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 4 }}>Example row:</div>
                                        <div>Dr. Arun Sharma,dr.sharma@medicore.com,SecurePass123,Cardiology,MBBS MD,12,500,101,+91 9876543210</div>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Header row:</div>
                                        <div>name,generic_name,category,manufacturer,unit_price,reorder_point,current_stock,unit</div>
                                        <div style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 4 }}>Example row:</div>
                                        <div>Paracetamol 500mg,Acetaminophen,Analgesic,Cipla,5.50,100,5000,tablets</div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleCSVImport}
                                className="form-input"
                                disabled={importLoading}
                            />
                        </div>
                        {importLoading && <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>Importing...</div>}
                        {importResult && (
                            <div style={{ marginTop: 12 }}>
                                {importResult.error ? (
                                    <div className="alert-banner danger">{importResult.error}</div>
                                ) : (
                                    <>
                                        <div className="alert-banner success" style={{ marginBottom: 8 }}>
                                            ✅ Imported {importResult.imported} of {importResult.total} records
                                        </div>
                                        {importResult.errors?.length > 0 && (
                                            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                                {importResult.errors.map((err, i) => (
                                                    <div key={i} className="alert-banner danger" style={{ marginBottom: 4, fontSize: 12 }}>
                                                        Row {err.row}: {err.errors.join(', ')}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
