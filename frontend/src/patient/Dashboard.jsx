import { useState, useEffect } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { Calendar, Pill, FileText, AlertTriangle, Clock, CheckCircle, Stethoscope, Activity, Heart } from 'lucide-react';
import api from '../shared/utils/api';

export default function PatientDashboard() {
    const { user, profile } = useAuth();
    const { socket } = useSocket();
    const [appointments, setAppointments] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const patientId = profile?.id;

    const loadDashboardData = async () => {
        if (!patientId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [apptRes, rxRes] = await Promise.allSettled([
                api.get(`/appointments?patient_id=${patientId}&status=booked,confirmed&limit=5`),
                api.get(`/prescriptions?patient_id=${patientId}&limit=5`),
            ]);

            if (apptRes.status === 'fulfilled') {
                const appts = apptRes.value.data.appointments || apptRes.value.data || [];
                setAppointments(appts.map(a => ({
                    id: a.id,
                    doctor: a.Doctor?.name || 'Doctor',
                    specialty: a.Doctor?.specialty || '',
                    time: new Date(a.scheduled_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                    date: isToday(a.scheduled_time) ? 'Today' : isTomorrow(a.scheduled_time) ? 'Tomorrow' : new Date(a.scheduled_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                    status: a.status,
                    queue_position: a.queue_position,
                })));
            }

            if (rxRes.status === 'fulfilled') {
                const rxs = rxRes.value.data.prescriptions || rxRes.value.data || [];
                setPrescriptions(rxs.map(p => ({
                    id: p.id,
                    doctor: p.Doctor?.name || 'Doctor',
                    date: new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                    diagnosis: p.diagnosis || 'Consultation',
                    status: p.status || 'pending',
                    items_count: p.items?.length || 0,
                })));
            }
        } catch (err) {
            console.error('Patient dashboard load error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [patientId]);

    useEffect(() => {
        if (socket) {
            socket.on('PRESCRIPTION_DISPENSED', (data) => {
                setNotifications(prev => [{ type: 'success', message: 'Your prescription is ready for pickup!', time: 'Just now' }, ...prev]);
                loadDashboardData();
            });
            socket.on('QUEUE_UPDATED', () => loadDashboardData());
            return () => {
                socket.off('PRESCRIPTION_DISPENSED');
                socket.off('QUEUE_UPDATED');
            };
        }
    }, [socket]);

    function isToday(dateStr) {
        const d = new Date(dateStr);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    }
    function isTomorrow(dateStr) {
        const d = new Date(dateStr);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return d.toDateString() === tomorrow.toDateString();
    }

    return (
        <div className="animate-fade">
            {/* Welcome Card */}
            <div className="card mb-6" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-light))', color: 'white', border: 'none' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                            Welcome back, {user?.name?.split(' ')[0]} 👋
                        </h2>
                        <p style={{ opacity: 0.8, fontSize: 14 }}>Here's your health overview for today</p>
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800 }}>{appointments.length}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>Appointments</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 800 }}>{prescriptions.length}</div>
                            <div style={{ fontSize: 11, opacity: 0.7 }}>Prescriptions</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {notifications.length > 0 && notifications.map((n, i) => (
                <div key={i} className="alert-banner success mb-2">
                    <CheckCircle size={14} /> {n.message}
                </div>
            ))}

            <div className="grid-2 gap-6">
                {/* Upcoming Appointments */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><Calendar size={16} style={{ marginRight: 6 }} /> Upcoming Appointments</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {appointments.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                                {loading ? 'Loading...' : 'No upcoming appointments'}
                            </div>
                        ) : appointments.map(a => (
                            <div key={a.id} style={{
                                padding: '14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)',
                                borderLeft: `4px solid ${a.status === 'confirmed' ? 'var(--success)' : 'var(--info)'}`,
                            }}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{a.doctor}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{a.specialty}</div>
                                        <div className="flex items-center gap-2 mt-2" style={{ fontSize: 12 }}>
                                            <Clock size={12} /> {a.date}, {a.time}
                                            {a.queue_position && (
                                                <span className="badge badge-primary" style={{ marginLeft: 4 }}>Queue #{a.queue_position}</span>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`badge ${a.status === 'confirmed' ? 'badge-success' : 'badge-info'} badge-dot`}>
                                        {a.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Prescriptions */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><Pill size={16} style={{ marginRight: 6 }} /> Recent Prescriptions</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {prescriptions.length === 0 ? (
                            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                                {loading ? 'Loading...' : 'No prescriptions yet'}
                            </div>
                        ) : prescriptions.map(p => (
                            <div key={p.id} style={{
                                padding: '14px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)',
                                borderLeft: `4px solid var(--success)`,
                            }}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{p.diagnosis}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.doctor} · {p.date} · {p.items_count} medicines</div>
                                    </div>
                                    <span className={`badge ${p.status === 'dispensed' ? 'badge-success' : 'badge-warning'} badge-dot`}>{p.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
                <div className="grid-4">
                    {[
                        { icon: Stethoscope, label: 'Find Doctor', desc: 'Book appointment', color: '#0D7377', link: '/patient/doctors' },
                        { icon: FileText, label: 'My Records', desc: 'View history', color: '#457B9D', link: '/patient/records' },
                        { icon: AlertTriangle, label: 'SOS Emergency', desc: 'Get immediate help', color: '#E63946', link: '/patient/sos' },
                        { icon: Heart, label: 'Health Tips', desc: 'Stay healthy', color: '#06A77D', link: '#' },
                    ].map((action, i) => (
                        <a key={i} href={action.link} style={{ textDecoration: 'none' }}>
                            <div className="card" style={{ textAlign: 'center', cursor: 'pointer' }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 'var(--radius-md)', margin: '0 auto 10px',
                                    background: `${action.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <action.icon size={22} color={action.color} />
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{action.label}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{action.desc}</div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
