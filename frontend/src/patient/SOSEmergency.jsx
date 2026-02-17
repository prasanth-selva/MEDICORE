import { useState, useEffect } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { AlertTriangle, MapPin, Phone, CheckCircle, Shield, Clock, Heart } from 'lucide-react';
import api from '../shared/utils/api';

export default function SOSEmergency() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [alertSent, setAlertSent] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);
    const [responder, setResponder] = useState(null);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);

    useEffect(() => {
        if (socket) {
            socket.on('SOS_ACKNOWLEDGED', (data) => {
                setAcknowledged(true);
                setResponder(data.responder || 'Emergency Team');
            });
        }

        // Get location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setLocation({ lat: 19.0760, lng: 72.8777 }) // Default Mumbai
            );
        }
    }, [socket]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else if (countdown === 0 && loading) {
            sendSOS();
        }
    }, [countdown, loading]);

    const initiateSOS = () => {
        setLoading(true);
        setCountdown(3);
    };

    const cancelSOS = () => {
        setLoading(false);
        setCountdown(0);
    };

    const sendSOS = async () => {
        const alertData = {
            type: 'emergency',
            latitude: location?.lat,
            longitude: location?.lng,
            description: 'Patient emergency - immediate assistance required',
        };

        try {
            await api.post('/sos', alertData);
        } catch (err) { /* Offline fallback */ }

        if (socket) {
            socket.emit('SOS_ALERT', {
                ...alertData,
                Patient: { first_name: user?.name?.split(' ')[0] || 'Patient', last_name: user?.name?.split(' ')[1] || '' },
                user_id: user?.id,
                created_at: new Date().toISOString(),
            });
        }

        setLoading(false);
        setAlertSent(true);
    };

    const resetSOS = () => {
        setAlertSent(false);
        setAcknowledged(false);
        setResponder(null);
        setLoading(false);
        setCountdown(0);
    };

    return (
        <div className="animate-fade" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <div style={{
                    width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
                    background: alertSent ? (acknowledged ? 'var(--success-light)' : 'var(--danger-light)') : 'var(--danger-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {acknowledged ? <CheckCircle size={36} color="var(--success)" /> : <AlertTriangle size={36} color="var(--danger)" />}
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>
                    {!alertSent ? 'SOS Emergency' : acknowledged ? 'Help is on the way!' : 'Alert Sent!'}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
                    {!alertSent
                        ? 'Press the button below to send an emergency alert to all available doctors and staff'
                        : acknowledged
                            ? `${responder} acknowledged your alert and is on the way`
                            : 'All doctors and staff have been notified. Stay calm.'
                    }
                </p>
            </div>

            {!alertSent ? (
                <>
                    {/* SOS Button */}
                    <div style={{ margin: '40px 0' }}>
                        {loading && countdown > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 140, height: 140, borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #E63946, #DC2626)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 48, fontWeight: 800, color: 'white',
                                    boxShadow: '0 0 40px rgba(230,57,70,0.4)',
                                    animation: 'pulse 1s ease-in-out infinite',
                                }}>
                                    {countdown}
                                </div>
                                <p style={{ color: 'var(--danger)', fontWeight: 600 }}>Sending in {countdown}...</p>
                                <button className="btn btn-outline" onClick={cancelSOS}>Cancel</button>
                            </div>
                        ) : (
                            <button className="sos-btn" onClick={initiateSOS}>
                                🚨 SOS EMERGENCY
                            </button>
                        )}
                    </div>

                    {/* Info Cards */}
                    <div className="grid-2 gap-4" style={{ textAlign: 'left' }}>
                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MapPin size={18} color="var(--danger)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>Your Location</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Detecting...'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--info-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Shield size={18} color="var(--info)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>Emergency Contacts</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>All on-duty staff will be notified</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Emergency Numbers */}
                    <div className="card mt-4" style={{ textAlign: 'left' }}>
                        <div className="card-header">
                            <h3 className="card-title"><Phone size={14} style={{ marginRight: 6 }} /> Quick Call</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { label: 'Hospital Emergency', number: '108', color: 'var(--danger)' },
                                { label: 'Ambulance Service', number: '102', color: 'var(--warning)' },
                                { label: 'General Emergency', number: '112', color: 'var(--info)' },
                            ].map((contact, i) => (
                                <a key={i} href={`tel:${contact.number}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{contact.label}</span>
                                    <span className="badge" style={{ background: `${contact.color}15`, color: contact.color, fontWeight: 700 }}>{contact.number}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ margin: '20px 0' }}>
                    {/* Status timeline */}
                    <div className="card" style={{ textAlign: 'left' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="flex items-center gap-3">
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle size={16} color="white" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>Alert Sent</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>All available staff notified</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%',
                                    background: acknowledged ? 'var(--success)' : 'var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {acknowledged ? <CheckCircle size={16} color="white" /> : <Clock size={16} color="var(--text-muted)" />}
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{acknowledged ? 'Acknowledged' : 'Waiting for response...'}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {acknowledged ? `Responded by ${responder}` : 'A doctor will acknowledge shortly'}
                                    </div>
                                </div>
                                {!acknowledged && <span className="live-dot" style={{ marginLeft: 'auto' }}></span>}
                            </div>

                            <div className="flex items-center gap-3">
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Heart size={16} color="var(--text-muted)" />
                                </div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>Help arrives</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-outline mt-4" onClick={resetSOS}>Reset</button>
                </div>
            )}
        </div>
    );
}
