import { useState, useEffect } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, CheckCircle, AlertCircle, Mic, Send, Plus, X, Search, FileText, Volume2, History, Repeat, AlertTriangle, LogOut } from 'lucide-react';
import api from '../shared/utils/api';
import SOSPanel from '../shared/components/SOSPanel';

const DISEASE_SUGGESTIONS = {
    'fever': { name: 'Viral Fever', items: [{ medicine: 'Paracetamol', dosage: '500mg', frequency: 'TID', duration: '3 days', route: 'Oral' }, { medicine: 'Cetirizine', dosage: '10mg', frequency: 'HS', duration: '3 days', route: 'Oral' }] },
    'cold': { name: 'Common Cold', items: [{ medicine: 'Cetirizine', dosage: '10mg', frequency: 'HS', duration: '5 days', route: 'Oral' }, { medicine: 'Steam Inhalation', dosage: '-', frequency: 'BD', duration: '5 days', route: 'Inhalation' }] },
    'headache': { name: 'Tension Headache', items: [{ medicine: 'Ibuprofen', dosage: '400mg', frequency: 'SOS', duration: '2 days', route: 'Oral' }] },
    'stomach': { name: 'Gastritis', items: [{ medicine: 'Omeprazole', dosage: '20mg', frequency: 'BD', duration: '5 days', route: 'Oral' }, { medicine: 'Antacid Gel', dosage: '10ml', frequency: 'TID', duration: '3 days', route: 'Oral' }] },
    'cough': { name: 'Bronchitis', items: [{ medicine: 'Ambroxol', dosage: '30mg', frequency: 'BD', duration: '5 days', route: 'Oral' }, { medicine: 'Dextromethorphan', dosage: '10ml', frequency: 'TID', duration: '3 days', route: 'Oral' }] },
    'throat': { name: 'Pharyngitis', items: [{ medicine: 'Azithromycin', dosage: '500mg', frequency: 'OD', duration: '3 days', route: 'Oral' }, { medicine: 'Ibuprofen', dosage: '400mg', frequency: 'TID', duration: '3 days', route: 'Oral' }] },
    'diabetes': { name: 'Type 2 Diabetes', items: [{ medicine: 'Metformin', dosage: '500mg', frequency: 'BD', duration: '30 days', route: 'Oral' }] },
    'hypertension': { name: 'Hypertension', items: [{ medicine: 'Amlodipine', dosage: '5mg', frequency: 'OD', duration: '30 days', route: 'Oral' }] },
    'diarrhea': { name: 'Acute Diarrhea', items: [{ medicine: 'ORS', dosage: '1 sachet', frequency: 'TID', duration: '3 days', route: 'Oral' }, { medicine: 'Loperamide', dosage: '2mg', frequency: 'SOS', duration: '2 days', route: 'Oral' }] },
    'skin': { name: 'Dermatitis', items: [{ medicine: 'Betamethasone Cream', dosage: 'Apply thin layer', frequency: 'BD', duration: '7 days', route: 'Topical' }, { medicine: 'Cetirizine', dosage: '10mg', frequency: 'HS', duration: '5 days', route: 'Oral' }] },
    'allergy': { name: 'Allergic Reaction', items: [{ medicine: 'Cetirizine', dosage: '10mg', frequency: 'OD', duration: '5 days', route: 'Oral' }, { medicine: 'Montelukast', dosage: '10mg', frequency: 'HS', duration: '7 days', route: 'Oral' }] },
    'infection': { name: 'Bacterial Infection', items: [{ medicine: 'Amoxicillin', dosage: '500mg', frequency: 'TID', duration: '7 days', route: 'Oral' }, { medicine: 'Paracetamol', dosage: '500mg', frequency: 'TID', duration: '3 days', route: 'Oral' }] },
};

const STATUSES = [
    { key: 'available', label: 'Available', emoji: '🟢' },
    { key: 'with_patient', label: 'With Patient', emoji: '🔵' },
    { key: 'break', label: 'Short Break', emoji: '🟡' },
    { key: 'lunch', label: 'Lunch', emoji: '🟠' },
    { key: 'meeting', label: 'Meeting', emoji: '⚪' },
    { key: 'leave', label: 'Leave', emoji: '🔴' },
];

const FREQUENCIES = ['OD (Once daily)', 'BD (Twice daily)', 'TID (Thrice daily)', 'QID (Four times)', 'SOS (As needed)', 'HS (At bedtime)'];
const ROUTES = ['Oral', 'IV', 'IM', 'Topical', 'Sublingual', 'Inhaled'];

export default function DoctorDashboard() {
    const { user, profile } = useAuth();
    const { socket } = useSocket();
    const navigate = useNavigate();
    const [status, setStatus] = useState('available');
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ todayCompleted: 0, todayPending: 0, totalPatients: 0 });
    const [loading, setLoading] = useState(true);
    const [showPrescription, setShowPrescription] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [rxItems, setRxItems] = useState([]);
    const [diagnosis, setDiagnosis] = useState('');
    const [rxNotes, setRxNotes] = useState('');
    const [templates, setTemplates] = useState([]);
    const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [suggestedTemplates, setSuggestedTemplates] = useState([]);
    const [patientHistory, setPatientHistory] = useState([]);
    const [callingNext, setCallingNext] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [leaveReason, setLeaveReason] = useState('');
    const [expectedReturn, setExpectedReturn] = useState('');

    const doctorId = profile?.id;

    const loadDashboardData = async () => {
        if (!doctorId) return;
        setLoading(true);
        try {
            const [queueRes, statsRes, templatesRes, doctorRes] = await Promise.allSettled([
                api.get(`/doctors/${doctorId}/queue`),
                api.get(`/doctors/${doctorId}/stats`),
                api.get(`/prescriptions/templates?doctor_id=${doctorId}`),
                api.get(`/doctors/${doctorId}`),
            ]);

            if (queueRes.status === 'fulfilled') setQueue(queueRes.value.data || []);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (templatesRes.status === 'fulfilled') {
                const tpls = templatesRes.value.data || [];
                setTemplates(tpls.map(t => ({ id: t.id, name: t.name, items: t.items || [] })));
            }
            // Load the doctor's current status from the database
            if (doctorRes.status === 'fulfilled' && doctorRes.value.data?.status) {
                setStatus(doctorRes.value.data.status);
            }
        } catch (err) {
            console.error('Doctor dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [doctorId]);

    useEffect(() => {
        if (socket) {
            socket.on('PRESCRIPTION_RECEIVED', () => { setDeliveryConfirmed(true); setTimeout(() => setDeliveryConfirmed(false), 5000); });
            socket.on('QUEUE_UPDATED', () => loadDashboardData());
            socket.on('PATIENT_CHECKED_IN', () => loadDashboardData());
            return () => {
                socket.off('PRESCRIPTION_RECEIVED');
                socket.off('QUEUE_UPDATED');
                socket.off('PATIENT_CHECKED_IN');
            };
        }
    }, [socket]);

    const handleStatusChange = async (newStatus) => {
        // Show confirmation dialog for leave
        if (newStatus === 'leave') {
            setShowLeaveConfirm(true);
            return;
        }
        applyStatus(newStatus);
    };

    const applyStatus = async (newStatus, extra = {}) => {
        setStatus(newStatus);
        if (doctorId) {
            try {
                await api.patch(`/doctors/${doctorId}/status`, { status: newStatus, ...extra });
            } catch (err) {
                console.error('Status update failed:', err);
            }
        }
    };

    const confirmLeave = () => {
        applyStatus('leave', { leave_reason: leaveReason, expected_return: expectedReturn });
        setShowLeaveConfirm(false);
        setLeaveReason('');
        setExpectedReturn('');
    };

    const startConsultation = async (patient) => {
        setSelectedPatient(patient);
        setShowPrescription(true);
        setRxItems([]);
        setDiagnosis('');
        setRxNotes('');
        setDeliveryConfirmed(false);
        handleStatusChange('with_patient');

        // Load history
        try {
            const res = await api.get(`/prescriptions?patient_id=${patient.Patient.id}`);
            setPatientHistory(res.data?.prescriptions || res.data || []);
        } catch (err) {
            console.error('Failed to load history', err);
        }
    };

    const callNextPatient = () => {
        if (!socket || !doctorId) return;
        setCallingNext(true);
        const nextPatient = queue[0];
        socket.emit('CALL_NEXT_PATIENT', {
            doctorId,
            doctorName: profile ? `${profile.first_name} ${profile.last_name}` : 'Doctor',
            patientName: nextPatient ? `${nextPatient.Patient?.first_name || ''} ${nextPatient.Patient?.last_name || ''}` : 'Next Patient',
            patientCode: nextPatient?.Patient?.patient_code || '',
            queuePosition: nextPatient?.queue_position || 1,
        });
        setTimeout(() => setCallingNext(false), 3000);
    };

    const handleDiagnosisChange = (val) => {
        setDiagnosis(val);
        const lower = val.toLowerCase();
        const suggestions = [];
        Object.keys(DISEASE_SUGGESTIONS).forEach(key => {
            if (lower.includes(key)) suggestions.push(DISEASE_SUGGESTIONS[key]);
        });
        // Also fuzzy match patient history
        if (patientHistory.length > 0) {
            const histMatch = patientHistory.filter(p => p.diagnosis && p.diagnosis.toLowerCase().includes(lower));
            histMatch.forEach(h => {
                if (h.items?.length > 0) {
                    suggestions.push({ name: `Previous: ${h.diagnosis}`, items: h.items });
                }
            });
        }
        setSuggestedTemplates(suggestions.slice(0, 5));
    };

    const goToConsultation = (patientId) => {
        navigate(`/doctor/consultation/${patientId}`);
    };

    const addMedicine = () => {
        setRxItems([...rxItems, { medicine: '', dosage: '', frequency: 'BD (Twice daily)', duration: '5 days', route: 'Oral' }]);
    };

    const updateRxItem = (idx, field, value) => {
        const updated = [...rxItems];
        updated[idx] = { ...updated[idx], [field]: value };
        setRxItems(updated);
    };

    const removeRxItem = (idx) => { setRxItems(rxItems.filter((_, i) => i !== idx)); };

    const loadTemplate = (template) => { setRxItems([...template.items]); };

    const quickPrescribe = (historyItem) => {
        if (historyItem.items?.length > 0) setRxItems([...historyItem.items]);
        if (historyItem.diagnosis) setDiagnosis(historyItem.diagnosis);
        if (historyItem.notes) setRxNotes(historyItem.notes);
    };

    const sendPrescription = async () => {
        if (rxItems.length === 0) return;
        const prescriptionData = {
            patient_id: selectedPatient?.Patient?.id,
            doctor_id: doctorId || user.id,
            appointment_id: selectedPatient?.id,
            items: rxItems,
            diagnosis,
            notes: rxNotes,
        };

        try {
            await api.post('/prescriptions', prescriptionData);
            if (selectedPatient?.id) {
                await api.patch(`/appointments/${selectedPatient.id}/status`, { status: 'completed' });
            }
        } catch (err) {
            console.error('Prescription send error:', err);
        }

        setDeliveryConfirmed(true);
        loadDashboardData();
        setTimeout(() => { setShowPrescription(false); applyStatus('available'); }, 3000);
    };

    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Voice input not supported in this browser');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-IN';
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const words = transcript.split(' ');
            const medicine = words.slice(0, 2).join(' ');
            setRxItems([...rxItems, { medicine, dosage: words[2] || '', frequency: 'BD (Twice daily)', duration: '5 days', route: 'Oral' }]);
        };
        recognition.start();
    };

    const sevColors = { 1: 'var(--success)', 2: 'var(--info)', 3: 'var(--warning)', 4: 'var(--danger)', 5: '#7C3AED' };

    return (
        <div className="animate-fade">
            {/* SOS Emergency Panel */}
            <SOSPanel compact />

            {/* Leave Confirmation Dialog */}
            {showLeaveConfirm && (
                <div className="confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowLeaveConfirm(false); }}>
                    <div className="confirm-dialog">
                        <div className="confirm-icon" style={{ background: 'var(--danger-light)' }}>
                            <LogOut size={24} color="var(--danger)" />
                        </div>
                        <div className="confirm-title">Confirm Leave Status</div>
                        <div className="confirm-desc">
                            Setting your status to leave will notify all patients and reception. You won't receive new patients.
                        </div>
                        <div className="input-group" style={{ textAlign: 'left', marginBottom: 12 }}>
                            <label className="input-label">Reason (optional)</label>
                            <input className="input" placeholder="e.g. Personal emergency, Scheduled off" value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
                        </div>
                        <div className="input-group" style={{ textAlign: 'left', marginBottom: 20 }}>
                            <label className="input-label">Expected Return Time (optional)</label>
                            <input className="input" type="time" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} />
                        </div>
                        <div className="confirm-actions">
                            <button className="btn btn-outline" onClick={() => setShowLeaveConfirm(false)} style={{ minWidth: 100 }}>Cancel</button>
                            <button className="btn" style={{ background: 'var(--danger)', color: 'white', minWidth: 140 }} onClick={confirmLeave}>
                                Confirm Leave
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Selector */}
            <div className="card mb-6">
                <div className="card-header">
                    <h3 className="card-title">Your Status</h3>
                    <span className={`badge badge-dot ${status === 'available' ? 'badge-success' : status === 'with_patient' ? 'badge-info' : status === 'leave' ? 'badge-danger' : 'badge-warning'}`}>
                        {status.replace('_', ' ')}
                    </span>
                </div>
                <div className="status-selector">
                    {STATUSES.map(s => (
                        <button key={s.key} className={`status-btn ${status === s.key ? 'active' : ''}`}
                            data-status={s.key} onClick={() => handleStatusChange(s.key)}>
                            {s.emoji} {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card success">
                    <div className="stat-icon success"><CheckCircle size={22} /></div>
                    <div><div className="stat-value">{stats.todayCompleted}</div><div className="stat-label">Completed Today</div></div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><Clock size={22} /></div>
                    <div><div className="stat-value">{stats.todayPending}</div><div className="stat-label">Pending</div></div>
                </div>
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Users size={22} /></div>
                    <div><div className="stat-value">{stats.totalPatients}</div><div className="stat-label">Total Today</div></div>
                </div>
            </div>

            {/* Quick Prescription (Modal) */}
            {showPrescription && selectedPatient && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPrescription(false); }}>
                    <div className="modal" style={{ maxWidth: 700, maxHeight: '90vh' }}>
                        <div className="modal-header">
                            <div>
                                <div className="modal-title">Prescription Builder</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                    {selectedPatient.Patient.first_name} {selectedPatient.Patient.last_name} · {selectedPatient.Patient.age}y · {selectedPatient.Patient.blood_group}
                                    {selectedPatient.Patient.allergies?.length > 0 && (
                                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}> · ⚠️ Allergies: {selectedPatient.Patient.allergies.join(', ')}</span>
                                    )}
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowPrescription(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflow: 'auto' }}>
                            {/* Diagnosis */}
                            <div className="input-group">
                                <label className="input-label">Diagnosis</label>
                                <input className="input" placeholder="e.g. Viral Fever, Upper Respiratory Infection" value={diagnosis}
                                    onChange={e => handleDiagnosisChange(e.target.value)} />
                                {suggestedTemplates.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                                        {suggestedTemplates.map((t, i) => (
                                            <button key={i} className="badge badge-info" style={{ cursor: 'pointer', border: 'none', fontSize: 11 }}
                                                onClick={() => loadTemplate(t)} title="Click to apply">
                                                💡 {t.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Previous History with Quick Prescribe */}
                            {patientHistory.length > 0 && (
                                <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>
                                        <History size={13} /> PATIENT HISTORY
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                                        {patientHistory.slice(0, 4).map(prev => (
                                            <div key={prev.id} style={{ minWidth: 180, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(prev.created_at).toLocaleDateString()}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{prev.diagnosis || 'No diagnosis'}</div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{prev.items?.length || 0} medicines</div>
                                                <button className="btn btn-outline btn-sm" style={{ fontSize: 11, marginTop: 4 }} onClick={() => quickPrescribe(prev)}>
                                                    <Repeat size={10} /> Quick Prescribe
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Templates */}
                            {templates.length > 0 && (
                                <div className="mb-4">
                                    <label className="input-label">Quick Templates</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        {templates.map(t => (
                                            <button key={t.id} className="btn btn-outline btn-sm" onClick={() => loadTemplate(t)}>{t.name}</button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Medicines */}
                            <div className="flex items-center justify-between mb-2">
                                <label className="input-label" style={{ margin: 0 }}>Medicines</label>
                                <div className="flex gap-2">
                                    <button className="btn btn-outline btn-sm" onClick={handleVoiceInput}>
                                        <Mic size={14} color={isListening ? 'var(--danger)' : undefined} /> {isListening ? 'Listening...' : 'Voice'}
                                    </button>
                                    <button className="btn btn-primary btn-sm" onClick={addMedicine}><Plus size={14} /> Add</button>
                                </div>
                            </div>

                            {rxItems.map((item, idx) => (
                                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        {idx === 0 && <label className="input-label" style={{ fontSize: 11 }}>Medicine</label>}
                                        <input className="input" placeholder="Medicine name" value={item.medicine} onChange={e => updateRxItem(idx, 'medicine', e.target.value)} style={{ fontSize: 13 }} />
                                    </div>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        {idx === 0 && <label className="input-label" style={{ fontSize: 11 }}>Dosage</label>}
                                        <input className="input" placeholder="500mg" value={item.dosage} onChange={e => updateRxItem(idx, 'dosage', e.target.value)} style={{ fontSize: 13 }} />
                                    </div>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        {idx === 0 && <label className="input-label" style={{ fontSize: 11 }}>Frequency</label>}
                                        <select className="input" value={item.frequency} onChange={e => updateRxItem(idx, 'frequency', e.target.value)} style={{ fontSize: 13 }}>
                                            {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    </div>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        {idx === 0 && <label className="input-label" style={{ fontSize: 11 }}>Duration</label>}
                                        <input className="input" placeholder="5 days" value={item.duration} onChange={e => updateRxItem(idx, 'duration', e.target.value)} style={{ fontSize: 13 }} />
                                    </div>
                                    <div className="input-group" style={{ margin: 0 }}>
                                        {idx === 0 && <label className="input-label" style={{ fontSize: 11 }}>Route</label>}
                                        <select className="input" value={item.route} onChange={e => updateRxItem(idx, 'route', e.target.value)} style={{ fontSize: 13 }}>
                                            {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <button className="btn btn-ghost btn-icon" onClick={() => removeRxItem(idx)} style={{ marginBottom: 0 }}><X size={14} /></button>
                                </div>
                            ))}

                            <div className="input-group mt-4">
                                <label className="input-label">Notes for Pharmacist</label>
                                <textarea className="input" placeholder="Any special instructions..." value={rxNotes} onChange={e => setRxNotes(e.target.value)} rows={2} />
                            </div>
                        </div>

                        <div className="modal-footer">
                            {deliveryConfirmed ? (
                                <div className="flex items-center gap-2" style={{ color: 'var(--success)', fontWeight: 600 }}>
                                    <CheckCircle size={18} /> Prescription delivered to pharmacy! ✓
                                </div>
                            ) : (
                                <>
                                    <button className="btn btn-outline" onClick={() => setShowPrescription(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={sendPrescription} disabled={rxItems.length === 0}>
                                        <Send size={14} /> Send to Pharmacy
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Patient Queue */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title"><span className="live-dot" style={{ marginRight: 8 }}></span>Patient Queue</h3>
                    <div className="flex items-center gap-3">
                        <button className={`btn btn-sm ${callingNext ? 'btn-success' : 'btn-outline'}`} onClick={callNextPatient} disabled={callingNext || queue.length === 0}>
                            <Volume2 size={14} /> {callingNext ? '📢 Calling...' : 'Call Next'}
                        </button>
                        <span className="badge badge-primary">{queue.length} patients</span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {queue.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                            {loading ? 'Loading queue...' : 'No patients in queue'}
                        </div>
                    ) : queue.map((appt) => (
                        <div key={appt.id} style={{
                            display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                            background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)',
                            borderLeft: `4px solid ${sevColors[appt.triage_severity] || 'var(--border)'}`,
                        }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--primary-100), var(--primary-50))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, fontWeight: 700, color: 'var(--primary)',
                            }}>
                                #{appt.queue_position}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{appt.Patient?.first_name} {appt.Patient?.last_name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {appt.Patient?.patient_code} · {appt.Patient?.age}y · {appt.primary_symptom || 'General'}
                                </div>
                                {appt.Patient?.allergies?.length > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>
                                        ⚠️ Allergies: {appt.Patient.allergies.join(', ')}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                <Clock size={12} /> {new Date(appt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-outline btn-sm" onClick={() => goToConsultation(appt.Patient?.id)}>
                                    <FileText size={14} /> Consult
                                </button>
                                <button className="btn btn-primary btn-sm" onClick={() => startConsultation(appt)}>
                                    <Send size={14} /> Prescribe
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
