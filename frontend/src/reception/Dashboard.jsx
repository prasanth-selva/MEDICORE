import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../shared/context/SocketContext';
import { useAuth } from '../shared/context/AuthContext';
import {
    Users, Calendar, UserPlus, Clock, CheckCircle, AlertTriangle,
    Search, Phone, X, ChevronRight, Activity, Bell
} from 'lucide-react';
import api from '../shared/utils/api';
import toast from 'react-hot-toast';
import SOSPanel from '../shared/components/SOSPanel';

export default function ReceptionDashboard() {
    const { socket } = useSocket();
    const { user } = useAuth();
    const [tab, setTab] = useState('queue');
    const [queue, setQueue] = useState([]);
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [stats, setStats] = useState({ total: 0, waiting: 0, inProgress: 0, completed: 0 });
    const [loading, setLoading] = useState(true);
    const [showWalkIn, setShowWalkIn] = useState(false);
    const [walkInForm, setWalkInForm] = useState({
        first_name: '', last_name: '', phone: '', age: '', gender: 'male',
        blood_group: '', primary_symptom: '', doctor_id: '', triage_severity: 3
    });
    const [doctors, setDoctors] = useState([]);
    const [importing, setImporting] = useState(false);
    const fileRef = useRef(null);

    const fetchQueue = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/appointments?date=${today}&limit=50`);
            const appts = res.data?.appointments || [];
            setQueue(appts);
            setStats({
                total: appts.length,
                waiting: appts.filter(a => ['booked', 'confirmed'].includes(a.status)).length,
                inProgress: appts.filter(a => a.status === 'in_progress').length,
                completed: appts.filter(a => a.status === 'completed').length,
            });
        } catch { setQueue([]); }
        setLoading(false);
    };

    const fetchDoctors = async () => {
        try {
            const res = await api.get('/doctors');
            setDoctors(res.data || []);
        } catch { setDoctors([]); }
    };

    useEffect(() => {
        fetchQueue();
        fetchDoctors();
        const interval = setInterval(fetchQueue, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on('QUEUE_UPDATED', fetchQueue);
        socket.on('PATIENT_CHECKED_IN', fetchQueue);
        return () => { socket.off('QUEUE_UPDATED', fetchQueue); socket.off('PATIENT_CHECKED_IN', fetchQueue); };
    }, [socket]);

    const searchPatients = async (q) => {
        setSearch(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            const res = await api.get(`/patients/search?q=${q}`);
            setSearchResults(res.data || []);
        } catch { setSearchResults([]); }
    };

    const checkIn = async (apptId) => {
        try {
            await api.patch(`/appointments/${apptId}/status`, { status: 'confirmed' });
            if (socket) socket.emit('PATIENT_CHECKED_IN', { appointmentId: apptId });
            toast.success('Patient checked in!');
            fetchQueue();
        } catch { toast.error('Check-in failed'); }
    };

    const markReady = async (apptId) => {
        try {
            await api.patch(`/appointments/${apptId}/status`, { status: 'in_progress' });
            if (socket) socket.emit('PATIENT_READY', { appointmentId: apptId });
            toast.success('Patient marked as ready for doctor');
            fetchQueue();
        } catch { toast.error('Failed to update status'); }
    };

    const handleWalkIn = async () => {
        const { first_name, phone, doctor_id } = walkInForm;
        if (!first_name || !phone || !doctor_id) {
            toast.error('Name, phone, and doctor are required');
            return;
        }
        try {
            // Create patient record
            const patientCode = 'MC-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
            const patRes = await api.post('/patients', {
                patient_code: patientCode,
                first_name: walkInForm.first_name,
                last_name: walkInForm.last_name || '',
                phone: walkInForm.phone,
                age: parseInt(walkInForm.age) || null,
                gender: walkInForm.gender,
                blood_group: walkInForm.blood_group || null,
                consent_given: true,
                consent_timestamp: new Date().toISOString(),
            });
            // Create walk-in appointment
            await api.post('/appointments', {
                patient_id: patRes.data.id,
                doctor_id: walkInForm.doctor_id,
                scheduled_time: new Date().toISOString(),
                primary_symptom: walkInForm.primary_symptom,
                triage_severity: parseInt(walkInForm.triage_severity),
                is_walk_in: true,
            });
            toast.success(`Walk-in registered: ${first_name}`);
            setShowWalkIn(false);
            setWalkInForm({ first_name: '', last_name: '', phone: '', age: '', gender: 'male', blood_group: '', primary_symptom: '', doctor_id: '', triage_severity: 3 });
            fetchQueue();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registration failed');
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/patients/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`Imported ${res.data.imported}/${res.data.total} patients`);
            if (res.data.errors?.length > 0) toast.error(`${res.data.errors.length} rows had errors`);
        } catch { toast.error('Import failed'); }
        setImporting(false);
        e.target.value = '';
    };

    const STATUS_COLORS = { booked: '#F59E0B', confirmed: '#3B82F6', in_progress: '#06A77D', completed: '#6B7280', cancelled: '#EF4444' };
    const STATUS_LABELS = { booked: 'Waiting', confirmed: 'Checked In', in_progress: 'With Doctor', completed: 'Done', cancelled: 'Cancelled' };

    return (
        <div className="animate-fade">
            {/* Stats Row */}
            <div className="grid-4" style={{ marginBottom: 20 }}>
                {[
                    { label: 'Total Today', value: stats.total, icon: Calendar, color: 'var(--primary)' },
                    { label: 'Waiting', value: stats.waiting, icon: Clock, color: '#F59E0B' },
                    { label: 'With Doctor', value: stats.inProgress, icon: Activity, color: '#06A77D' },
                    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: '#6B7280' },
                ].map(s => (
                    <div key={s.label} className="stat-card">
                        <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>
                            <s.icon size={20} />
                        </div>
                        <div className="stat-value">{s.value}</div>
                        <div className="stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* SOS Panel */}
            <SOSPanel compact />

            {/* Tabs */}
            <div className="flex gap-2 mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
                {[
                    { id: 'queue', label: 'Today\'s Queue', icon: Calendar },
                    { id: 'walkin', label: 'Walk-in Registration', icon: UserPlus },
                    { id: 'search', label: 'Find Patient', icon: Search },
                    { id: 'import', label: 'Import Patients', icon: Users },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ borderRadius: '8px 8px 0 0', marginBottom: -1 }}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            {/* Queue Tab */}
            {tab === 'queue' && (
                <div>
                    {loading ? <div className="loading-pulse" /> : queue.length === 0 ? (
                        <div className="empty-state"><Calendar size={40} /><h3>No appointments today</h3></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {queue.map(appt => {
                                const p = appt.Patient || {};
                                const d = appt.Doctor || {};
                                const color = STATUS_COLORS[appt.status] || '#6B7280';
                                return (
                                    <div key={appt.id} className="card" style={{ borderLeft: `4px solid ${color}`, padding: '12px 16px' }}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color }}>
                                                    {appt.queue_position || '#'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {p.patient_code} · {d.name} ({d.specialty})
                                                    </div>
                                                    {appt.primary_symptom && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{appt.primary_symptom}</div>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span style={{ background: `${color}20`, color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                                    {STATUS_LABELS[appt.status] || appt.status}
                                                </span>
                                                {appt.status === 'booked' && (
                                                    <button className="btn btn-sm btn-primary" onClick={() => checkIn(appt.id)}>
                                                        <CheckCircle size={13} /> Check In
                                                    </button>
                                                )}
                                                {appt.status === 'confirmed' && (
                                                    <button className="btn btn-sm btn-success" onClick={() => markReady(appt.id)}>
                                                        <ChevronRight size={13} /> Send to Doctor
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Walk-in Registration Tab */}
            {tab === 'walkin' && (
                <div className="card" style={{ maxWidth: 600 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Register Walk-in Patient</h3>
                    <div className="grid-2" style={{ gap: 12 }}>
                        <div className="input-group">
                            <label className="input-label">First Name *</label>
                            <input className="input" placeholder="First name" value={walkInForm.first_name}
                                onChange={e => setWalkInForm({ ...walkInForm, first_name: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Last Name</label>
                            <input className="input" placeholder="Last name" value={walkInForm.last_name}
                                onChange={e => setWalkInForm({ ...walkInForm, last_name: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Phone *</label>
                            <input className="input" placeholder="Phone number" value={walkInForm.phone}
                                onChange={e => setWalkInForm({ ...walkInForm, phone: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Age</label>
                            <input className="input" type="number" placeholder="Age" value={walkInForm.age}
                                onChange={e => setWalkInForm({ ...walkInForm, age: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label className="input-label">Gender</label>
                            <select className="input" value={walkInForm.gender}
                                onChange={e => setWalkInForm({ ...walkInForm, gender: e.target.value })}>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Blood Group</label>
                            <select className="input" value={walkInForm.blood_group}
                                onChange={e => setWalkInForm({ ...walkInForm, blood_group: e.target.value })}>
                                <option value="">Unknown</option>
                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => <option key={bg}>{bg}</option>)}
                            </select>
                        </div>
                        <div className="input-group" style={{ gridColumn: '1/-1' }}>
                            <label className="input-label">Assign Doctor *</label>
                            <select className="input" value={walkInForm.doctor_id}
                                onChange={e => setWalkInForm({ ...walkInForm, doctor_id: e.target.value })}>
                                <option value="">Select doctor...</option>
                                {doctors.filter(d => d.status !== 'leave').map(d => (
                                    <option key={d.id} value={d.id}>{d.name} — {d.specialty} ({d.status})</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group" style={{ gridColumn: '1/-1' }}>
                            <label className="input-label">Primary Symptom</label>
                            <input className="input" placeholder="Chief complaint..." value={walkInForm.primary_symptom}
                                onChange={e => setWalkInForm({ ...walkInForm, primary_symptom: e.target.value })} />
                        </div>
                        <div className="input-group" style={{ gridColumn: '1/-1' }}>
                            <label className="input-label">Triage Severity (1=Minor, 5=Critical)</label>
                            <input className="input" type="range" min={1} max={5} value={walkInForm.triage_severity}
                                onChange={e => setWalkInForm({ ...walkInForm, triage_severity: e.target.value })} />
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                Level {walkInForm.triage_severity}: {['', 'Minor', 'Moderate', 'Serious', 'Critical', 'Life-Threatening'][walkInForm.triage_severity]}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button className="btn btn-primary" onClick={handleWalkIn}>
                            <UserPlus size={15} /> Register & Add to Queue
                        </button>
                        <button className="btn btn-outline" onClick={() => setWalkInForm({ first_name: '', last_name: '', phone: '', age: '', gender: 'male', blood_group: '', primary_symptom: '', doctor_id: '', triage_severity: 3 })}>
                            Clear
                        </button>
                    </div>
                </div>
            )}

            {/* Search Patient Tab */}
            {tab === 'search' && (
                <div>
                    <div className="search-box" style={{ marginBottom: 16, maxWidth: 400 }}>
                        <Search size={16} />
                        <input className="input" placeholder="Search by name, code, or phone..."
                            value={search} onChange={e => searchPatients(e.target.value)} />
                    </div>
                    {searchResults.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {searchResults.map(p => (
                                <div key={p.id} className="card" style={{ padding: '12px 16px' }}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                {p.patient_code} · {p.phone} · Age {p.age} · {p.blood_group}
                                            </div>
                                        </div>
                                        <a href={`tel:${p.phone}`} className="btn btn-sm btn-outline">
                                            <Phone size={13} /> Call
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {search.length >= 2 && searchResults.length === 0 && (
                        <div className="empty-state"><Users size={32} /><h3>No patients found</h3></div>
                    )}
                </div>
            )}

            {/* Import Tab */}
            {tab === 'import' && (
                <div className="card" style={{ maxWidth: 500 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Import Patients from CSV</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                        CSV must have columns: <code>first_name, phone</code> (required) + optional: <code>last_name, email, age, gender, blood_group, address, city, password</code>
                    </p>
                    <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleImport} />
                    <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={importing}>
                        <Users size={15} /> {importing ? 'Importing...' : 'Choose CSV/XLSX File'}
                    </button>
                    <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
                        <strong>Sample CSV format:</strong>
                        <pre style={{ background: 'var(--bg-secondary)', padding: 8, borderRadius: 6, marginTop: 6, overflow: 'auto' }}>
                            {`first_name,last_name,phone,email,age,gender,blood_group
Ravi,Kumar,9876543210,ravi@email.com,35,male,O+
Priya,Sharma,9876543211,priya@email.com,28,female,A+`}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
