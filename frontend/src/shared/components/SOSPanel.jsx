import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { AlertTriangle, CheckCircle, Phone, MapPin, Clock, X } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const SEVERITY_COLORS = ['', '#06A77D', '#3B82F6', '#F59E0B', '#EF4444', '#7C3AED'];
const SEVERITY_LABELS = ['', 'Minor', 'Moderate', 'Serious', 'Critical', 'Life-Threatening'];

export default function SOSPanel({ compact = false }) {
    const { socket } = useSocket();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        try {
            const res = await api.get('/sos?status=pending');
            setAlerts(Array.isArray(res.data) ? res.data : []);
        } catch {
            setAlerts([]);
        }
        setLoading(false);
    };

    useEffect(() => { fetchAlerts(); }, []);

    useEffect(() => {
        if (!socket) return;
        const handleSOS = (alert) => {
            setAlerts(prev => [alert, ...prev.filter(a => a.id !== alert.id)]);
            toast.error(`🚨 SOS Alert! ${alert.Patient?.first_name || 'Patient'} — Severity ${alert.severity}/5`, {
                duration: 8000,
                style: { background: '#7C3AED', color: '#fff', fontWeight: 700 },
            });
        };
        socket.on('SOS_ALERT', handleSOS);
        return () => socket.off('SOS_ALERT', handleSOS);
    }, [socket]);

    const acknowledge = async (alertId) => {
        try {
            await api.patch(`/sos/${alertId}/acknowledge`);
            setAlerts(prev => prev.filter(a => a.id !== alertId));
            toast.success('SOS Alert acknowledged');
        } catch {
            toast.error('Failed to acknowledge');
        }
    };

    const resolve = async (alertId) => {
        try {
            await api.patch(`/sos/${alertId}/resolve`, { notes: 'Resolved by staff' });
            setAlerts(prev => prev.filter(a => a.id !== alertId));
            toast.success('SOS Alert resolved');
        } catch {
            toast.error('Failed to resolve');
        }
    };

    if (loading) return null;
    if (alerts.length === 0 && compact) return null;

    return (
        <div className="card" style={{ borderLeft: '4px solid #EF4444', marginBottom: 20 }}>
            <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={18} color="#EF4444" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#EF4444' }}>
                    SOS Emergency Alerts {alerts.length > 0 && <span className="badge badge-danger" style={{ marginLeft: 8 }}>{alerts.length}</span>}
                </h3>
            </div>

            {alerts.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle size={14} color="var(--success)" /> No active SOS alerts
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {alerts.slice(0, compact ? 3 : 20).map(alert => {
                        const color = SEVERITY_COLORS[alert.severity] || '#EF4444';
                        const patient = alert.Patient || {};
                        return (
                            <div key={alert.id} style={{
                                background: `${color}10`,
                                border: `1px solid ${color}40`,
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 14px',
                            }}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span style={{
                                            background: color, color: '#fff',
                                            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700
                                        }}>
                                            SEV {alert.severity} — {SEVERITY_LABELS[alert.severity]}
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                                            {patient.first_name} {patient.last_name}
                                        </span>
                                        {patient.blood_group && (
                                            <span className="badge" style={{ fontSize: 10 }}>{patient.blood_group}</span>
                                        )}
                                    </div>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                                        {new Date(alert.created_at).toLocaleTimeString()}
                                    </span>
                                </div>

                                {alert.primary_symptom && (
                                    <div style={{ fontSize: 12, marginBottom: 6, color: 'var(--text-muted)' }}>
                                        <strong>Symptom:</strong> {alert.primary_symptom}
                                        {alert.symptoms && ` · ${alert.symptoms}`}
                                    </div>
                                )}

                                <div className="flex gap-2" style={{ flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                                    {patient.phone && (
                                        <a href={`tel:${patient.phone}`} className="flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                                            <Phone size={11} /> {patient.phone}
                                        </a>
                                    )}
                                    {alert.latitude && (
                                        <span className="flex items-center gap-1">
                                            <MapPin size={11} />
                                            <a href={`https://maps.google.com/?q=${alert.latitude},${alert.longitude}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                                                View Location
                                            </a>
                                        </span>
                                    )}
                                    {alert.is_alone !== undefined && <span>{alert.is_alone ? '⚠️ Alone' : '👥 Not alone'}</span>}
                                    {alert.can_walk !== undefined && <span>{alert.can_walk ? '🚶 Can walk' : '🛑 Cannot walk'}</span>}
                                </div>

                                <div className="flex gap-2">
                                    <button className="btn btn-sm btn-warning" onClick={() => acknowledge(alert.id)}>
                                        <CheckCircle size={13} /> Acknowledge
                                    </button>
                                    <button className="btn btn-sm btn-success" onClick={() => resolve(alert.id)}>
                                        <X size={13} /> Resolve
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
