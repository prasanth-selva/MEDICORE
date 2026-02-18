import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { Users, Clock, CheckCircle, AlertTriangle, X, Search, User, Phone, MapPin, Activity, Volume2, Bell, BellRing, Send } from 'lucide-react';
import api from '../shared/utils/api';

const STATUS_INFO = {
    available: { label: 'Available', color: 'var(--success)', dot: '🟢' },
    with_patient: { label: 'With Patient', color: 'var(--info)', dot: '🔵' },
    break: { label: 'Break', color: 'var(--warning)', dot: '🟡' },
    lunch: { label: 'Lunch', color: '#F97316', dot: '🟠' },
    meeting: { label: 'Meeting', color: 'var(--text-muted)', dot: '⚪' },
    leave: { label: 'Leave', color: 'var(--danger)', dot: '🔴' },
};

export default function ReceptionDashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [stats, setStats] = useState({ checkedIn: 0, waiting: 0, completed: 0 });
    const [doctors, setDoctors] = useState([]);
    const [queue, setQueue] = useState([]);
    const [sosAlerts, setSosAlerts] = useState([]);
    const [callAlerts, setCallAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [patientSearch, setPatientSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [toasts, setToasts] = useState([]);
    const [checkInForm, setCheckInForm] = useState({
        first_name: '', last_name: '', phone: '', age: '', gender: 'Male',
        blood_group: '', allergies: '', primary_symptom: '', doctor_id: '',
        weight: '', pulse: '', spo2: '',
    });
    const audioRef = useRef(null);

    // Create alert audio for notifications
    useEffect(() => {
        audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgiKOzq5RjNjNUgJ20tqBpOCg9bJattbR+TTg2X4ulrq+EUC4kSHaforS6k18wIkhwjJ+0vodMJxxBa5GlvJlbJRY7cZuyxKJkJRQ5dpq0x6ZlIhA2dp25wahtJA83eJ+8y69uKA87faS8yrJxKxNBg6q/');
        return () => { audioRef.current = null; };
    }, []);

    const playAlertSound = () => {
        try { audioRef.current?.play().catch(() => { }); } catch { }
    };

    const addToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
    };

    // Load initial data
    const loadData = async () => {
        try {
            const [doctorsRes, queueRes] = await Promise.allSettled([
                api.get('/doctors'),
                api.get('/appointments?status=waiting&date=today'),
            ]);
            if (doctorsRes.status === 'fulfilled') setDoctors(doctorsRes.value.data || []);
            if (queueRes.status === 'fulfilled') {
                const q = queueRes.value.data?.appointments || queueRes.value.data || [];
                setQueue(q);
                setStats({
                    checkedIn: q.filter(a => a.status === 'checked_in').length,
                    waiting: q.filter(a => a.status === 'waiting').length,
                    completed: q.filter(a => a.status === 'completed').length,
                });
            }
        } catch (err) {
            console.error('Load failed', err);
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        const handleSOS = (data) => {
            setSosAlerts(prev => [{
                id: Date.now(),
                patient: `${data.Patient?.first_name || 'Patient'} ${data.Patient?.last_name || ''}`,
                severity: data.severity || 3,
                symptom: data.primary_symptom || 'Emergency',
                time: new Date(),
                ...data,
            }, ...prev]);
            playAlertSound();
            addToast(`🚨 SOS Alert from ${data.Patient?.first_name || 'Patient'}!`, 'danger');
        };

        const handleCallNext = (data) => {
            setCallAlerts(prev => [{
                id: Date.now(),
                doctorName: data.doctorName || 'Doctor',
                patientName: data.patientName || 'Next Patient',
                patientCode: data.patientCode || '',
                time: new Date(),
            }, ...prev]);
            playAlertSound();
            addToast(`📢 Dr. ${data.doctorName} is calling ${data.patientName || 'next patient'}!`, 'warning');
        };

        const handleStatusChange = (data) => {
            setDoctors(prev => prev.map(doc =>
                doc.id === data.doctorId ? { ...doc, status: data.status, leave_reason: data.leave_reason, expected_return: data.expected_return } : doc
            ));
        };

        const handleQueueUpdate = () => { loadData(); };

        socket.on('SOS_ALERT', handleSOS);
        socket.on('CALL_NEXT_PATIENT', handleCallNext);
        socket.on('DOCTOR_STATUS_CHANGED', handleStatusChange);
        socket.on('QUEUE_UPDATED', handleQueueUpdate);
        socket.on('PATIENT_CHECKED_IN', handleQueueUpdate);

        return () => {
            socket.off('SOS_ALERT', handleSOS);
            socket.off('CALL_NEXT_PATIENT', handleCallNext);
            socket.off('DOCTOR_STATUS_CHANGED', handleStatusChange);
            socket.off('QUEUE_UPDATED', handleQueueUpdate);
            socket.off('PATIENT_CHECKED_IN', handleQueueUpdate);
        };
    }, [socket]);

    // Patient search
    const searchPatient = async (query) => {
        setPatientSearch(query);
        if (query.length < 2) { setSearchResults([]); return; }
        setSearching(true);
        try {
            const res = await api.get(`/patients/search?q=${encodeURIComponent(query)}`);
            setSearchResults(res.data || []);
        } catch {
            setSearchResults([]);
        }
        setSearching(false);
    };

    const selectExistingPatient = (patient) => {
        setCheckInForm({
            ...checkInForm,
            first_name: patient.first_name || '',
            last_name: patient.last_name || '',
            phone: patient.phone || '',
            age: patient.age || '',
            gender: patient.gender || 'Male',
            blood_group: patient.blood_group || '',
            allergies: patient.allergies?.join(', ') || '',
            patient_id: patient.id,
        });
        setSearchResults([]);
        setPatientSearch('');
    };

    const handleCheckIn = async () => {
        try {
            const data = {
                ...checkInForm,
                allergies: checkInForm.allergies ? checkInForm.allergies.split(',').map(a => a.trim()) : [],
                vitals: {
                    weight: checkInForm.weight,
                    pulse: checkInForm.pulse,
                    spo2: checkInForm.spo2,
                },
            };
            await api.post('/appointments/checkin', data);
            if (socket) {
                socket.emit('PATIENT_CHECKED_IN', {
                    patientName: `${checkInForm.first_name} ${checkInForm.last_name}`,
                    doctorId: checkInForm.doctor_id,
                    symptom: checkInForm.primary_symptom,
                });
            }
            addToast(`${checkInForm.first_name} ${checkInForm.last_name} checked in successfully!`, 'success');
            setShowCheckIn(false);
            setCheckInForm({ first_name: '', last_name: '', phone: '', age: '', gender: 'Male', blood_group: '', allergies: '', primary_symptom: '', doctor_id: '', weight: '', pulse: '', spo2: '' });
            loadData();
        } catch (err) {
            addToast('Check-in failed. Please try again.', 'danger');
        }
    };

    const sendPatientReady = (appointment) => {
        if (!socket) return;
        socket.emit('PATIENT_READY', {
            doctorId: appointment.doctor_id,
            patientName: `${appointment.Patient?.first_name} ${appointment.Patient?.last_name}`,
            appointmentId: appointment.id,
        });
        addToast(`Notified doctor that ${appointment.Patient?.first_name} is ready`, 'success');
    };

    return (
        <div className="animate-fade">
            {/* Toast Notifications */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        {t.message}
                        <button className="btn btn-ghost btn-icon" onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} style={{ marginLeft: 'auto', padding: 2 }}>
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* SOS Alerts (top priority) */}
            {sosAlerts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    {sosAlerts.slice(0, 3).map(sos => (
                        <div key={sos.id} className="alert-banner danger" style={{ animation: 'pulse 1s ease-in-out infinite', fontWeight: 600 }}>
                            <AlertTriangle size={18} />
                            <div style={{ flex: 1 }}>
                                <div>🚨 <strong>SOS:</strong> {sos.patient} needs emergency help!</div>
                                <div style={{ fontSize: 11, opacity: 0.8 }}>Severity: {sos.severity}/5 · {sos.symptom} · {new Date(sos.time).toLocaleTimeString()}</div>
                            </div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setSosAlerts(prev => prev.filter(s => s.id !== sos.id))}>
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Call Next Patient Alerts */}
            {callAlerts.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    {callAlerts.slice(0, 3).map(alert => (
                        <div key={alert.id} className="alert-banner warning" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                            <BellRing size={18} />
                            <div style={{ flex: 1 }}>
                                <div>📢 <strong>Dr. {alert.doctorName}</strong> is calling <strong>{alert.patientName}</strong></div>
                                {alert.patientCode && <div style={{ fontSize: 11, opacity: 0.8 }}>Patient Code: {alert.patientCode} · {new Date(alert.time).toLocaleTimeString()}</div>}
                            </div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setCallAlerts(prev => prev.filter(a => a.id !== alert.id))}>
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary), #457B9D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={22} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Reception Dashboard</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Patient check-in, queue management & doctor alerts</p>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCheckIn(true)}>
                    <User size={14} /> Check-in Patient
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Users size={22} /></div>
                    <div><div className="stat-value">{stats.checkedIn + stats.waiting}</div><div className="stat-label">Checked In</div></div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><Clock size={22} /></div>
                    <div><div className="stat-value">{stats.waiting}</div><div className="stat-label">Waiting</div></div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success"><CheckCircle size={22} /></div>
                    <div><div className="stat-value">{stats.completed}</div><div className="stat-label">Completed</div></div>
                </div>
            </div>

            {/* Doctor Status Board */}
            <div className="card mb-4">
                <div className="card-header">
                    <h3 className="card-title">Doctor Status Board</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                    {doctors.map(doc => {
                        const st = STATUS_INFO[doc.status] || STATUS_INFO.available;
                        return (
                            <div key={doc.id} style={{
                                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                                background: 'var(--bg-primary)', border: '1px solid var(--border)',
                                borderLeft: `4px solid ${st.color}`,
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 700 }}>{doc.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{doc.specialty}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                    <span className="live-dot" style={{ background: st.color, width: 6, height: 6 }}></span>
                                    <span style={{ color: st.color, fontWeight: 600 }}>{st.label}</span>
                                </div>
                                {doc.status === 'leave' && doc.expected_return && (
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Back at {doc.expected_return}</div>
                                )}
                            </div>
                        );
                    })}
                    {doctors.length === 0 && (
                        <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>No doctors loaded yet.</div>
                    )}
                </div>
            </div>

            {/* Patient Queue */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title"><span className="live-dot" style={{ marginRight: 8 }}></span>Today's Queue</h3>
                    <span className="badge badge-primary">{queue.length} patients</span>
                </div>
                {queue.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {loading ? 'Loading...' : 'No patients in queue today'}
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Patient</th>
                                    <th>Doctor</th>
                                    <th>Symptom</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {queue.map((appt, idx) => (
                                    <tr key={appt.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{idx + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{appt.Patient?.first_name} {appt.Patient?.last_name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{appt.Patient?.patient_code} · {appt.Patient?.age}y</div>
                                        </td>
                                        <td style={{ fontSize: 13 }}>{appt.Doctor?.name || 'Unassigned'}</td>
                                        <td style={{ fontSize: 13 }}>{appt.primary_symptom || 'General'}</td>
                                        <td>
                                            <span className={`badge badge-dot ${appt.status === 'completed' ? 'badge-success' : appt.status === 'in_progress' ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: 11 }}>
                                                {appt.status || 'waiting'}
                                            </span>
                                        </td>
                                        <td>
                                            {appt.status !== 'completed' && (
                                                <button className="btn btn-outline btn-sm" onClick={() => sendPatientReady(appt)} title="Notify doctor patient is ready">
                                                    <Send size={12} /> Ready
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Check-In Modal */}
            {showCheckIn && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCheckIn(false); }}>
                    <div className="modal" style={{ maxWidth: 560, maxHeight: '90vh' }}>
                        <div className="modal-header">
                            <div className="modal-title">Patient Check-in</div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCheckIn(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '65vh', overflow: 'auto' }}>
                            {/* Search Existing */}
                            <div className="input-group">
                                <label className="input-label">Search Existing Patient</label>
                                <div className="search-box">
                                    <Search size={16} />
                                    <input className="input" placeholder="Search by name or phone..." value={patientSearch} onChange={e => searchPatient(e.target.value)} />
                                </div>
                                {searchResults.length > 0 && (
                                    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginTop: 6, maxHeight: 150, overflow: 'auto' }}>
                                        {searchResults.map(p => (
                                            <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)' }}
                                                onClick={() => selectExistingPatient(p)}>
                                                <strong>{p.first_name} {p.last_name}</strong> · {p.phone} · {p.age}y
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Patient Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="input-group">
                                    <label className="input-label">First Name</label>
                                    <input className="input" value={checkInForm.first_name} onChange={e => setCheckInForm({ ...checkInForm, first_name: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Last Name</label>
                                    <input className="input" value={checkInForm.last_name} onChange={e => setCheckInForm({ ...checkInForm, last_name: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Phone</label>
                                    <input className="input" value={checkInForm.phone} onChange={e => setCheckInForm({ ...checkInForm, phone: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Age</label>
                                    <input className="input" type="number" value={checkInForm.age} onChange={e => setCheckInForm({ ...checkInForm, age: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Gender</label>
                                    <select className="input" value={checkInForm.gender} onChange={e => setCheckInForm({ ...checkInForm, gender: e.target.value })}>
                                        <option>Male</option><option>Female</option><option>Other</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Blood Group</label>
                                    <select className="input" value={checkInForm.blood_group} onChange={e => setCheckInForm({ ...checkInForm, blood_group: e.target.value })}>
                                        <option value="">Select</option>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Vitals Section */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
                                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Activity size={14} /> Vitals
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                    <div className="input-group">
                                        <label className="input-label" style={{ fontSize: 11 }}>Weight (kg)</label>
                                        <input className="input" type="number" placeholder="e.g. 65" value={checkInForm.weight} onChange={e => setCheckInForm({ ...checkInForm, weight: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" style={{ fontSize: 11 }}>Pulse (bpm)</label>
                                        <input className="input" type="number" placeholder="e.g. 72" value={checkInForm.pulse} onChange={e => setCheckInForm({ ...checkInForm, pulse: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" style={{ fontSize: 11 }}>SpO₂ (%)</label>
                                        <input className="input" type="number" placeholder="e.g. 98" value={checkInForm.spo2} onChange={e => setCheckInForm({ ...checkInForm, spo2: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Allergies (comma-separated)</label>
                                <input className="input" placeholder="e.g. Penicillin, Aspirin" value={checkInForm.allergies} onChange={e => setCheckInForm({ ...checkInForm, allergies: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Primary Symptom / Reason</label>
                                <input className="input" placeholder="e.g. Fever, Headache" value={checkInForm.primary_symptom} onChange={e => setCheckInForm({ ...checkInForm, primary_symptom: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Assign Doctor</label>
                                <select className="input" value={checkInForm.doctor_id} onChange={e => setCheckInForm({ ...checkInForm, doctor_id: e.target.value })}>
                                    <option value="">Select Doctor</option>
                                    {doctors.filter(d => d.status !== 'leave').map(d => (
                                        <option key={d.id} value={d.id}>{d.name} — {d.specialty} {d.status === 'available' ? '🟢' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowCheckIn(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleCheckIn}
                                disabled={!checkInForm.first_name || !checkInForm.last_name}>
                                <CheckCircle size={14} /> Check In
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
