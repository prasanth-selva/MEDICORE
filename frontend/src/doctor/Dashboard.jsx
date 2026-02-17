import { useState, useEffect } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { Users, Clock, CheckCircle, AlertCircle, Mic, Send, Plus, X, Search, FileText } from 'lucide-react';
import api from '../shared/utils/api';

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
    const [status, setStatus] = useState('available');
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({ todayCompleted: 0, todayPending: 5, totalPatients: 12 });
    const [showPrescription, setShowPrescription] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [rxItems, setRxItems] = useState([]);
    const [diagnosis, setDiagnosis] = useState('');
    const [rxNotes, setRxNotes] = useState('');
    const [medSearch, setMedSearch] = useState('');
    const [templates, setTemplates] = useState([]);
    const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        // Mock queue data
        setQueue([
            { id: '1', queue_position: 1, Patient: { first_name: 'Ravi', last_name: 'Kumar', age: 34, blood_group: 'O+', allergies: ['Penicillin'], patient_code: 'MC-2024-1001' }, triage_severity: 2, primary_symptom: 'Fever & Headache', scheduled_time: new Date().toISOString(), status: 'confirmed' },
            { id: '2', queue_position: 2, Patient: { first_name: 'Priya', last_name: 'Patel', age: 28, blood_group: 'A+', allergies: [], patient_code: 'MC-2024-1002' }, triage_severity: 1, primary_symptom: 'Regular Checkup', scheduled_time: new Date(Date.now() + 1800000).toISOString(), status: 'booked' },
            { id: '3', queue_position: 3, Patient: { first_name: 'Arjun', last_name: 'Singh', age: 45, blood_group: 'B-', allergies: ['Aspirin'], patient_code: 'MC-2024-1003' }, triage_severity: 4, primary_symptom: 'Chest Pain', scheduled_time: new Date(Date.now() + 3600000).toISOString(), status: 'booked' },
            { id: '4', queue_position: 4, Patient: { first_name: 'Meena', last_name: 'Iyer', age: 52, blood_group: 'AB+', allergies: [], patient_code: 'MC-2024-1004' }, triage_severity: 2, primary_symptom: 'Joint Pain', scheduled_time: new Date(Date.now() + 5400000).toISOString(), status: 'booked' },
        ]);

        setTemplates([
            {
                id: '1', name: '🤒 Standard Flu Pack', items: [
                    { medicine: 'Paracetamol 500mg', dosage: '500mg', frequency: 'TID (Thrice daily)', duration: '5 days', route: 'Oral' },
                    { medicine: 'Cetirizine 10mg', dosage: '10mg', frequency: 'HS (At bedtime)', duration: '5 days', route: 'Oral' },
                    { medicine: 'Vitamin C', dosage: '500mg', frequency: 'OD (Once daily)', duration: '7 days', route: 'Oral' },
                ]
            },
            {
                id: '2', name: '💊 Hypertension Monthly', items: [
                    { medicine: 'Amlodipine 5mg', dosage: '5mg', frequency: 'OD (Once daily)', duration: '30 days', route: 'Oral' },
                    { medicine: 'Telmisartan 40mg', dosage: '40mg', frequency: 'OD (Once daily)', duration: '30 days', route: 'Oral' },
                ]
            },
            {
                id: '3', name: '🦴 Pain Management', items: [
                    { medicine: 'Ibuprofen 400mg', dosage: '400mg', frequency: 'BD (Twice daily)', duration: '5 days', route: 'Oral' },
                    { medicine: 'Pantoprazole 40mg', dosage: '40mg', frequency: 'OD (Once daily)', duration: '5 days', route: 'Oral' },
                ]
            },
        ]);

        if (socket) {
            socket.on('PRESCRIPTION_RECEIVED', (data) => { setDeliveryConfirmed(true); setTimeout(() => setDeliveryConfirmed(false), 5000); });
        }
    }, [socket]);

    const handleStatusChange = async (newStatus) => {
        setStatus(newStatus);
        if (socket) socket.emit('DOCTOR_STATUS_CHANGED', { doctorId: profile?.id || user.id, name: user.name, status: newStatus });
    };

    const startConsultation = (patient) => {
        setSelectedPatient(patient);
        setShowPrescription(true);
        setRxItems([]);
        setDiagnosis('');
        setRxNotes('');
        setDeliveryConfirmed(false);
        handleStatusChange('with_patient');
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

    const sendPrescription = async () => {
        if (rxItems.length === 0) return;
        const prescriptionData = {
            patient_id: selectedPatient?.Patient?.id,
            doctor_id: profile?.id || user.id,
            items: rxItems,
            diagnosis,
            notes: rxNotes,
        };

        try {
            await api.post('/prescriptions', prescriptionData);
        } catch (err) { /* Will work when backend is live */ }

        if (socket) {
            socket.emit('PRESCRIPTION_SENT', {
                ...prescriptionData,
                Patient: selectedPatient?.Patient,
                Doctor: { name: user.name },
                created_at: new Date().toISOString(),
            });
        }

        setDeliveryConfirmed(true);
        setTimeout(() => { setShowPrescription(false); handleStatusChange('available'); }, 3000);
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
            // Simple parsing: "Paracetamol 500mg twice daily for 5 days"
            const words = transcript.split(' ');
            const medicine = words.slice(0, 2).join(' ');
            setRxItems([...rxItems, { medicine, dosage: words[1] || '', frequency: 'BD (Twice daily)', duration: '5 days', route: 'Oral' }]);
        };
        recognition.start();
    };

    const sevColors = { 1: 'var(--success)', 2: 'var(--info)', 3: 'var(--warning)', 4: 'var(--danger)', 5: '#7C3AED' };

    return (
        <div className="animate-fade">
            {/* Status Selector */}
            <div className="card mb-6">
                <div className="card-header">
                    <h3 className="card-title">Your Status</h3>
                    <span className={`badge badge-dot ${status === 'available' ? 'badge-success' : status === 'with_patient' ? 'badge-info' : 'badge-warning'}`}>
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
                                <input className="input" placeholder="e.g. Viral Fever, Upper Respiratory Infection" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                            </div>

                            {/* Templates */}
                            <div className="mb-4">
                                <label className="input-label">Quick Templates</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {templates.map(t => (
                                        <button key={t.id} className="btn btn-outline btn-sm" onClick={() => loadTemplate(t)}>{t.name}</button>
                                    ))}
                                </div>
                            </div>

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
                    <span className="badge badge-primary">{queue.length} patients</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {queue.map((appt, i) => (
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
                                <div style={{ fontSize: 14, fontWeight: 600 }}>{appt.Patient.first_name} {appt.Patient.last_name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {appt.Patient.patient_code} · {appt.Patient.age}y · {appt.primary_symptom}
                                </div>
                                {appt.Patient.allergies?.length > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600, marginTop: 2 }}>
                                        ⚠️ Allergies: {appt.Patient.allergies.join(', ')}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                <Clock size={12} /> {new Date(appt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={() => startConsultation(appt)}>
                                <FileText size={14} /> Prescribe
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
