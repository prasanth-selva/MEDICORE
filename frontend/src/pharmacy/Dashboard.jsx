import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../shared/context/SocketContext';
import { Pill, Clock, CheckCircle, AlertTriangle, Search, Eye, Package } from 'lucide-react';
import api from '../shared/utils/api';

export default function PharmacyDashboard() {
    const { socket } = useSocket();
    const [prescriptions, setPrescriptions] = useState([]);
    const [filter, setFilter] = useState('all');
    const [sosAlert, setSosAlert] = useState(null);
    const [stats, setStats] = useState({ pending: 3, dispensedToday: 12, totalToday: 15 });

    useEffect(() => {
        // Mock prescriptions
        setPrescriptions([
            {
                id: '1', patient_name: 'Ravi Kumar', doctor_name: 'Dr. Sharma', status: 'pending',
                created_at: new Date(Date.now() - 300000).toISOString(), diagnosis: 'Viral Fever',
                items: [
                    { medicine: 'Paracetamol 500mg', dosage: '500mg', frequency: 'TID', duration: '5 days' },
                    { medicine: 'Cetirizine 10mg', dosage: '10mg', frequency: 'HS', duration: '5 days' },
                ],
                notes: 'Patient allergic to Penicillin',
            },
            {
                id: '2', patient_name: 'Priya Patel', doctor_name: 'Dr. Gupta', status: 'pending',
                created_at: new Date(Date.now() - 600000).toISOString(), diagnosis: 'UTI',
                items: [
                    { medicine: 'Ciprofloxacin 500mg', dosage: '500mg', frequency: 'BD', duration: '7 days' },
                    { medicine: 'Cranberry Extract', dosage: '400mg', frequency: 'BD', duration: '14 days' },
                ],
            },
            {
                id: '3', patient_name: 'Arjun Singh', doctor_name: 'Dr. Reddy', status: 'dispensed',
                created_at: new Date(Date.now() - 3600000).toISOString(), diagnosis: 'Knee Osteoarthritis',
                items: [
                    { medicine: 'Diclofenac 50mg', dosage: '50mg', frequency: 'BD', duration: '7 days' },
                    { medicine: 'Pantoprazole 40mg', dosage: '40mg', frequency: 'OD', duration: '7 days' },
                ],
            },
        ]);

        if (socket) {
            socket.on('PRESCRIPTION_SENT', (data) => {
                const newRx = {
                    id: Date.now().toString(),
                    patient_name: `${data.Patient?.first_name || 'Unknown'} ${data.Patient?.last_name || ''}`,
                    doctor_name: data.Doctor?.name || 'Unknown',
                    status: 'pending',
                    created_at: data.created_at,
                    diagnosis: data.diagnosis || '',
                    items: data.items || [],
                    notes: data.notes || '',
                };
                setPrescriptions(prev => [newRx, ...prev]);
                setStats(prev => ({ ...prev, pending: prev.pending + 1, totalToday: prev.totalToday + 1 }));
            });

            socket.on('SOS_ALERT', (data) => { setSosAlert(data); });
        }
    }, [socket]);

    const handleDispense = (id) => {
        setPrescriptions(prev => prev.map(p =>
            p.id === id ? { ...p, status: 'dispensed', dispensed_at: new Date().toISOString() } : p
        ));
        setStats(prev => ({ ...prev, pending: prev.pending - 1, dispensedToday: prev.dispensedToday + 1 }));

        if (socket) {
            const rx = prescriptions.find(p => p.id === id);
            socket.emit('PRESCRIPTION_DISPENSED', { id, patient_name: rx?.patient_name });
        }
    };

    const filtered = prescriptions.filter(p => filter === 'all' || p.status === filter);
    const timeAgo = (ts) => {
        const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        return `${Math.floor(mins / 60)}h ago`;
    };

    return (
        <div className="animate-fade">
            {/* SOS Alert Banner */}
            {sosAlert && (
                <div className="alert-banner danger">
                    <AlertTriangle size={16} /> <strong>🚨 SOS Alert!</strong> — {sosAlert.Patient?.first_name} needs emergency assistance
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSosAlert(null)}>Dismiss</button>
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><Clock size={22} /></div>
                    <div><div className="stat-value">{stats.pending}</div><div className="stat-label">Pending Prescriptions</div></div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success"><CheckCircle size={22} /></div>
                    <div><div className="stat-value">{stats.dispensedToday}</div><div className="stat-label">Dispensed Today</div></div>
                </div>
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Package size={22} /></div>
                    <div><div className="stat-value">{stats.totalToday}</div><div className="stat-label">Total Today</div></div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center justify-between mb-4">
                <div className="tabs">
                    {[
                        { key: 'all', label: 'All' },
                        { key: 'pending', label: `Pending (${prescriptions.filter(p => p.status === 'pending').length})` },
                        { key: 'dispensed', label: 'Dispensed' },
                    ].map(t => (
                        <button key={t.key} className={`tab ${filter === t.key ? 'active' : ''}`}
                            onClick={() => setFilter(t.key)}>{t.label}</button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <span className="live-dot"></span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live Feed</span>
                </div>
            </div>

            {/* Prescriptions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map(rx => (
                    <div key={rx.id} className={`rx-card ${rx.status}`}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div style={{
                                    width: 40, height: 40, borderRadius: '50%',
                                    background: rx.status === 'pending' ? 'var(--warning-light)' : 'var(--success-light)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: rx.status === 'pending' ? 'var(--warning)' : 'var(--success)',
                                }}>
                                    {rx.status === 'pending' ? <Clock size={18} /> : <CheckCircle size={18} />}
                                </div>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{rx.patient_name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{rx.doctor_name} · {rx.diagnosis} · {timeAgo(rx.created_at)}</div>
                                </div>
                            </div>
                            <span className={`badge ${rx.status === 'pending' ? 'badge-warning' : 'badge-success'} badge-dot`}>
                                {rx.status === 'pending' ? 'Pending' : 'Dispensed'}
                            </span>
                        </div>

                        {/* Medicines */}
                        <div style={{ marginLeft: 52 }}>
                            <div className="table-wrapper" style={{ marginBottom: rx.notes ? 8 : 0 }}>
                                <table>
                                    <thead>
                                        <tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>
                                    </thead>
                                    <tbody>
                                        {rx.items.map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>💊 {item.medicine}</td>
                                                <td>{item.dosage}</td>
                                                <td>{item.frequency}</td>
                                                <td>{item.duration}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {rx.notes && (
                                <div style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 500, padding: '4px 0' }}>
                                    📝 Note: {rx.notes}
                                </div>
                            )}

                            {rx.status === 'pending' && (
                                <div className="flex gap-2 mt-4">
                                    <button className="btn btn-success btn-sm" onClick={() => handleDispense(rx.id)}>
                                        <CheckCircle size={14} /> Dispense & Bill
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="empty-state">
                        <Pill size={48} />
                        <h3>No prescriptions</h3>
                        <p>Waiting for prescriptions from doctors...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
