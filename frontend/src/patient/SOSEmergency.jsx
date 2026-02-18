import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { AlertTriangle, MapPin, Phone, CheckCircle, Shield, Clock, Heart, X, Activity } from 'lucide-react';
import api from '../shared/utils/api';

const SEVERITY_LABELS = ['Mild', 'Moderate', 'Serious', 'Severe', 'Critical'];
const SYMPTOMS = ['Chest Pain', 'Breathing Difficulty', 'Severe Bleeding', 'Loss of Consciousness', 'Seizure', 'Allergic Reaction', 'Fall / Injury', 'Stroke Symptoms', 'High Fever', 'Other'];

export default function SOSEmergency() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [step, setStep] = useState('idle'); // idle | confirm | countdown | sent | acknowledged
    const [severity, setSeverity] = useState(3);
    const [primarySymptom, setPrimarySymptom] = useState('');
    const [isAlone, setIsAlone] = useState(false);
    const [canWalk, setCanWalk] = useState(true);
    const [location, setLocation] = useState(null);
    const [countdown, setCountdown] = useState(3);
    const [responder, setResponder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const countdownRef = useRef(null);

    // Get location on mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                () => setLocation({ latitude: 11.0168, longitude: 76.9558 }) // Coimbatore fallback
            );
        }
    }, []);

    // Listen for SOS acknowledgments
    useEffect(() => {
        if (!socket) return;
        const handleAck = (data) => {
            setResponder(data);
            setStep('acknowledged');
        };
        socket.on('SOS_ACKNOWLEDGED', handleAck);
        return () => socket.off('SOS_ACKNOWLEDGED', handleAck);
    }, [socket]);

    // Countdown logic
    useEffect(() => {
        if (step !== 'countdown') return;
        if (countdown <= 0) {
            sendSOS();
            return;
        }
        countdownRef.current = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(countdownRef.current);
    }, [step, countdown]);

    const startSOS = () => setStep('confirm');

    const confirmSOS = () => {
        if (!primarySymptom) {
            setError('Please select a symptom');
            return;
        }
        setError('');
        setCountdown(3);
        setStep('countdown');
    };

    const cancelSOS = () => {
        clearTimeout(countdownRef.current);
        setStep('idle');
        setCountdown(3);
        setError('');
    };

    const sendSOS = async () => {
        setLoading(true);
        setStep('sent');
        try {
            await api.post('/sos', {
                patient_id: user?.id || user?.patient_id || 'demo-patient',
                severity,
                primary_symptom: primarySymptom,
                symptoms: [primarySymptom],
                is_alone: isAlone,
                can_walk: canWalk,
                latitude: location?.latitude,
                longitude: location?.longitude,
            });
        } catch (err) {
            // Even if API fails, emit directly via socket for demo
            if (socket) {
                socket.emit('SOS_ALERT', {
                    patient_id: user?.id,
                    severity,
                    primary_symptom: primarySymptom,
                    Patient: { first_name: user?.name?.split(' ')[0] || 'Patient', last_name: user?.name?.split(' ')[1] || '' },
                    latitude: location?.latitude,
                    longitude: location?.longitude,
                    created_at: new Date().toISOString(),
                });
            }
        }
        setLoading(false);
    };

    const resetSOS = () => {
        setStep('idle');
        setSeverity(3);
        setPrimarySymptom('');
        setIsAlone(false);
        setCanWalk(true);
        setResponder(null);
        setError('');
    };

    // ─── IDLE STATE ───
    if (step === 'idle') {
        return (
            <div className="animate-fade" style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #E63946, #DC2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(230,57,70,0.3)' }}>
                    <Shield size={36} color="white" />
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Emergency SOS</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
                    Press the button below to send an emergency alert to all available medical staff immediately.
                </p>
                <button className="sos-btn" onClick={startSOS} style={{ display: 'block', margin: '0 auto 24px', minWidth: 220 }}>
                    🚨 SOS EMERGENCY
                </button>
                <div className="card" style={{ textAlign: 'left', marginTop: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={16} /> Your Location
                    </h4>
                    {location ? (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </p>
                    ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Fetching location...</p>
                    )}
                </div>
            </div>
        );
    }

    // ─── CONFIRM STATE (Severity + Symptom Selection) ───
    if (step === 'confirm') {
        return (
            <div className="sos-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) cancelSOS(); }}>
                <div className="sos-modal">
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <AlertTriangle size={28} color="var(--danger)" />
                    </div>
                    <div className="sos-modal-title">Emergency Details</div>
                    <div className="sos-modal-desc">Help us respond faster — select severity and primary symptom.</div>

                    {/* Severity */}
                    <div style={{ marginBottom: 20, textAlign: 'left' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
                            Severity Level: <span style={{ color: 'var(--danger)', fontWeight: 800 }}>{severity} — {SEVERITY_LABELS[severity - 1]}</span>
                        </label>
                        <div className="sos-severity-grid">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} className={`sos-severity-btn ${severity === s ? 'active' : ''}`} onClick={() => setSeverity(s)}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Primary Symptom */}
                    <div style={{ marginBottom: 20, textAlign: 'left' }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Primary Symptom</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {SYMPTOMS.map(s => (
                                <button key={s} className={`btn btn-sm ${primarySymptom === s ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setPrimarySymptom(s); setError(''); }} style={{ fontSize: 12 }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        {error && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{error}</p>}
                    </div>

                    {/* Situation */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={isAlone} onChange={e => setIsAlone(e.target.checked)} /> I am alone
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!canWalk} onChange={e => setCanWalk(!e.target.checked)} /> Cannot walk
                        </label>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                        <button className="btn btn-outline" onClick={cancelSOS} style={{ minWidth: 100 }}>Cancel</button>
                        <button className="btn" style={{ background: 'var(--danger)', color: 'white', minWidth: 160 }} onClick={confirmSOS}>
                            🚨 Send SOS Alert
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ─── COUNTDOWN STATE ───
    if (step === 'countdown') {
        return (
            <div className="sos-modal-overlay">
                <div className="sos-modal">
                    <div style={{ fontSize: 72, fontWeight: 900, color: 'var(--danger)', marginBottom: 16, animation: 'pulse 1s ease-in-out infinite' }}>
                        {countdown}
                    </div>
                    <div className="sos-modal-title">Sending SOS in {countdown}s</div>
                    <div className="sos-modal-desc">Alert will be sent to all available medical staff.</div>
                    <button className="btn btn-outline" onClick={cancelSOS} style={{ marginTop: 12, minWidth: 140 }}>
                        Cancel SOS
                    </button>
                </div>
            </div>
        );
    }

    // ─── SENT STATE (Waiting for acknowledgment) ───
    if (step === 'sent') {
        return (
            <div className="animate-fade" style={{ maxWidth: 500, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', animation: 'pulse 2s ease-in-out infinite' }}>
                    <Activity size={32} color="var(--danger)" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)', marginBottom: 8 }}>🚨 SOS Alert Sent!</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                    Emergency alert has been broadcast to all available staff. Stay calm — help is on the way.
                </p>
                <div className="card" style={{ textAlign: 'left', marginBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={14} color="var(--danger)" /> <span><strong>Severity:</strong> {severity}/5 — {SEVERITY_LABELS[severity - 1]}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Heart size={14} color="var(--danger)" /> <span><strong>Symptom:</strong> {primarySymptom}</span>
                        </div>
                        {location && (
                            <div className="flex items-center gap-2">
                                <MapPin size={14} color="var(--info)" /> <span><strong>Location:</strong> {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="alert-banner warning" style={{ justifyContent: 'center' }}>
                    <Clock size={14} /> Waiting for staff acknowledgment...
                </div>
            </div>
        );
    }

    // ─── ACKNOWLEDGED STATE ───
    if (step === 'acknowledged') {
        return (
            <div className="animate-fade" style={{ maxWidth: 500, margin: '0 auto', padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <CheckCircle size={36} color="var(--success)" />
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)', marginBottom: 8 }}>Help is Coming!</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                    Your SOS has been acknowledged by the medical team.
                </p>
                {responder && (
                    <div className="card" style={{ textAlign: 'left', marginBottom: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Responding Staff</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{responder.responderName || 'Medical Staff'}</div>
                    </div>
                )}
                <button className="btn btn-primary" onClick={resetSOS} style={{ marginTop: 12 }}>
                    Done — Return to Safety
                </button>
            </div>
        );
    }

    return null;
}
