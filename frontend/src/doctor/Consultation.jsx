import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import api from '../shared/utils/api';
import { SkeletonCard, SkeletonTable } from '../shared/components/LoadingSkeletons';
import {
    FileText, Clock, User, Stethoscope, Pill, Save, ChevronLeft,
    AlertCircle, Heart, Activity, Calendar, Plus, Trash2, Search
} from 'lucide-react';

export default function Consultation() {
    const { user, profile } = useAuth();
    const { patientId } = useParams();
    const navigate = useNavigate();

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [history, setHistory] = useState([]);

    // Prescription form
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [items, setItems] = useState([{ medicine_name: '', dosage: '', frequency: '', duration: '', quantity: 1 }]);

    // Load patient if ID provided
    useEffect(() => {
        if (patientId) loadPatient(patientId);
    }, [patientId]);

    const loadPatient = async (id) => {
        setLoading(true);
        try {
            const [patientRes, historyRes] = await Promise.all([
                api.get(`/patients/${id}`),
                api.get(`/patients/${id}/history`).catch(() => ({ data: { diseases: [], prescriptions: [] } })),
            ]);
            setPatient(patientRes.data);
            setHistory(historyRes.data);
        } catch (err) {
            console.error('Failed to load patient:', err);
        } finally {
            setLoading(false);
        }
    };

    const searchPatients = async (q) => {
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        setSearching(true);
        try {
            const { data } = await api.get(`/patients/search?q=${encodeURIComponent(q)}`);
            setSearchResults(Array.isArray(data) ? data : data.patients || []);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setSearching(false);
        }
    };

    const selectPatient = (p) => {
        setSearchResults([]);
        setSearchQuery('');
        navigate(`/doctor/consultation/${p.id}`);
    };

    const addItem = () => {
        setItems([...items, { medicine_name: '', dosage: '', frequency: '', duration: '', quantity: 1 }]);
    };

    const removeItem = (index) => {
        if (items.length <= 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index, field, value) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    const savePrescription = async () => {
        if (!diagnosis.trim()) return alert('Please enter a diagnosis');
        if (!items[0].medicine_name.trim()) return alert('Please add at least one medication');

        setSaving(true);
        try {
            const demoDoctor = profile || { id: user.id };
            await api.post('/prescriptions', {
                patient_id: patient.id,
                doctor_id: demoDoctor.id,
                diagnosis,
                notes,
                follow_up_date: followUpDate || null,
                items: items.filter(i => i.medicine_name.trim()),
            });
            alert('Prescription sent to pharmacy!');
            // Reset form
            setDiagnosis('');
            setNotes('');
            setFollowUpDate('');
            setItems([{ medicine_name: '', dosage: '', frequency: '', duration: '', quantity: 1 }]);
            // Reload history
            loadPatient(patient.id);
        } catch (err) {
            console.error('Failed to save prescription:', err);
            alert('Failed to save: ' + (err.response?.data?.error || err.message));
        } finally {
            setSaving(false);
        }
    };

    // ─── No Patient Selected ─────────────────────────────────
    if (!patientId && !patient) {
        return (
            <div className="animate-fade">
                {/* Search bar */}
                <div className="card" style={{ marginBottom: 20 }}>
                    <h3 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={18} /> Find Patient
                    </h3>
                    <input
                        type="text"
                        placeholder="Search by name, code, or phone..."
                        value={searchQuery}
                        onChange={(e) => searchPatients(e.target.value)}
                        style={{ width: '100%' }}
                    />
                    {searching && <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 13 }}>Searching...</p>}
                    {searchResults.length > 0 && (
                        <div style={{ marginTop: 12, maxHeight: 300, overflowY: 'auto' }}>
                            {searchResults.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => selectPatient(p)}
                                    style={{
                                        padding: '10px 14px', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-light)', marginBottom: 6,
                                        transition: 'var(--transition)',
                                    }}
                                    className="hover-card"
                                >
                                    <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {p.patient_code} · {p.gender} · {p.blood_group} · {p.phone}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="card">
                    <div className="empty-state">
                        <FileText size={48} />
                        <h3>Select a Patient</h3>
                        <p>Search for a patient above, or choose one from the queue on the Dashboard.</p>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Loading ─────────────────────────────────────────────
    if (loading) {
        return (
            <div className="animate-fade">
                <SkeletonCard lines={5} />
                <div style={{ marginTop: 16 }}><SkeletonCard lines={3} /></div>
            </div>
        );
    }

    // ─── Patient Loaded — Consultation View ──────────────────
    return (
        <div className="animate-fade">
            {/* Back button */}
            <button onClick={() => navigate('/doctor')} className="btn btn-ghost" style={{ marginBottom: 12 }}>
                <ChevronLeft size={16} /> Back to Dashboard
            </button>

            {/* Patient Banner */}
            {patient && (
                <div className="card" style={{ marginBottom: 20, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary), var(--success))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: 20,
                        }}>
                            {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                                {patient.first_name} {patient.last_name}
                            </h2>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <span>📋 {patient.patient_code}</span>
                                <span>🩸 {patient.blood_group || 'N/A'}</span>
                                <span>📞 {patient.phone}</span>
                                {patient.allergies && <span style={{ color: 'var(--danger)' }}>⚠️ Allergies: {patient.allergies}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Left — Prescription Form */}
                <div>
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Stethoscope size={18} /> New Prescription
                        </h3>

                        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Diagnosis *</label>
                        <textarea
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="Enter diagnosis..."
                            rows={2}
                            style={{ width: '100%', marginBottom: 12 }}
                        />

                        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                            <Pill size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Medications
                        </label>
                        {items.map((item, i) => (
                            <div key={i} style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 60px 32px',
                                gap: 6, marginBottom: 8, alignItems: 'center',
                            }}>
                                <input placeholder="Medicine" value={item.medicine_name} onChange={(e) => updateItem(i, 'medicine_name', e.target.value)} />
                                <input placeholder="Dosage" value={item.dosage} onChange={(e) => updateItem(i, 'dosage', e.target.value)} />
                                <input placeholder="Frequency" value={item.frequency} onChange={(e) => updateItem(i, 'frequency', e.target.value)} />
                                <input placeholder="Duration" value={item.duration} onChange={(e) => updateItem(i, 'duration', e.target.value)} />
                                <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                                <button onClick={() => removeItem(i)} className="btn btn-ghost btn-icon" style={{ color: 'var(--danger)' }}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                        <button onClick={addItem} className="btn btn-ghost" style={{ fontSize: 12, marginBottom: 16 }}>
                            <Plus size={14} /> Add Medication
                        </button>

                        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Additional notes..."
                            rows={2}
                            style={{ width: '100%', marginBottom: 12 }}
                        />

                        <label style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                            <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Follow-up Date
                        </label>
                        <input
                            type="date"
                            value={followUpDate}
                            onChange={(e) => setFollowUpDate(e.target.value)}
                            style={{ width: '100%', marginBottom: 16 }}
                        />

                        <button
                            onClick={savePrescription}
                            className="btn btn-primary"
                            disabled={saving}
                            style={{ width: '100%' }}
                        >
                            <Save size={16} /> {saving ? 'Sending to Pharmacy...' : 'Send Prescription to Pharmacy'}
                        </button>
                    </div>
                </div>

                {/* Right — Patient History */}
                <div>
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={18} /> Patient History
                        </h3>

                        {history.prescriptions?.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {history.prescriptions.slice(0, 10).map(rx => (
                                    <div key={rx.id} style={{
                                        padding: 12, borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-light)',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{rx.diagnosis || 'No diagnosis'}</span>
                                            <span className={`badge badge-${rx.status === 'dispensed' ? 'success' : rx.status === 'pending' ? 'warning' : 'info'}`}>
                                                {rx.status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {new Date(rx.created_at).toLocaleDateString()} · {rx.items?.length || 0} medications
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '32px 0' }}>
                                <Heart size={36} />
                                <p>No medical history found</p>
                            </div>
                        )}

                        {history.diseases?.length > 0 && (
                            <>
                                <h4 style={{ marginTop: 20, marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
                                    Disease History
                                </h4>
                                {history.diseases.slice(0, 5).map((d, idx) => (
                                    <div key={d.id || idx} style={{
                                        padding: '8px 0', borderBottom: '1px solid var(--border-light)',
                                        fontSize: 12, display: 'flex', justifyContent: 'space-between',
                                    }}>
                                        <span>{d.diagnosis_name || d.diagnosis || 'Unknown'}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{d.diagnosed_date ? new Date(d.diagnosed_date).toLocaleDateString() : ''}</span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
