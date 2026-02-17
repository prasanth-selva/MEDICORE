import { useState, useEffect } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, DollarSign, Pill, AlertTriangle, Stethoscope, TrendingUp, Activity, Clock, Package } from 'lucide-react';
import api from '../shared/utils/api';

const COLORS = ['#0D7377', '#06A77D', '#457B9D', '#F4A261', '#E63946', '#2D6A4F'];

export default function AdminDashboard() {
    const { user } = useAuth();
    const { socket } = useSocket();
    const [stats, setStats] = useState({
        todayAppointments: 24, todayRevenue: 45600,
        totalPatients: 1250, activeDoctors: 5,
        pendingPrescriptions: 8, lowStockMeds: 3,
    });
    const [revenueData, setRevenueData] = useState([]);
    const [diseaseData, setDiseaseData] = useState([]);
    const [recentAppointments, setRecentAppointments] = useState([]);
    const [sosAlerts, setSosAlerts] = useState([]);

    useEffect(() => {
        // Generate mock chart data
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        setRevenueData(days.map(d => ({ name: d, revenue: Math.floor(30000 + Math.random() * 30000), patients: Math.floor(15 + Math.random() * 20) })));
        setDiseaseData([
            { name: 'Influenza', count: 45 }, { name: 'Dengue', count: 28 },
            { name: 'Hypertension', count: 32 }, { name: 'Diabetes', count: 25 },
            { name: 'Gastro', count: 18 }, { name: 'Bronchitis', count: 15 },
        ]);
        setRecentAppointments([
            { id: 1, patient: 'Ravi Kumar', doctor: 'Dr. Sharma', time: '10:30 AM', status: 'in_progress', severity: 2 },
            { id: 2, patient: 'Priya Patel', doctor: 'Dr. Gupta', time: '11:00 AM', status: 'booked', severity: 1 },
            { id: 3, patient: 'Arjun Singh', doctor: 'Dr. Reddy', time: '11:30 AM', status: 'booked', severity: 3 },
            { id: 4, patient: 'Sneha Iyer', doctor: 'Dr. Shah', time: '12:00 PM', status: 'confirmed', severity: 1 },
            { id: 5, patient: 'Amit Verma', doctor: 'Dr. Sharma', time: '12:30 PM', status: 'booked', severity: 4 },
        ]);

        // Listen for real-time events
        if (socket) {
            socket.on('SOS_ALERT', (data) => { setSosAlerts(prev => [data, ...prev]); });
            socket.on('QUEUE_UPDATED', () => { /* Refresh appointments */ });
        }

        // Try loading real data
        api.get('/dashboard/stats').then(r => setStats(r.data)).catch(() => { });
        api.get('/dashboard/diseases?days=30').then(r => {
            if (r.data.topDiseases?.length > 0) setDiseaseData(r.data.topDiseases.map(d => ({ name: d.diagnosis_name, count: parseInt(d.count) })));
        }).catch(() => { });
    }, [socket]);

    const statusLabel = { booked: 'Waiting', confirmed: 'Confirmed', in_progress: 'In Progress', completed: 'Done' };
    const statusBadge = { booked: 'badge-warning', confirmed: 'badge-info', in_progress: 'badge-primary', completed: 'badge-success' };

    return (
        <div className="animate-fade">
            {/* SOS Alert Banner */}
            {sosAlerts.length > 0 && (
                <div className="alert-banner danger">
                    <AlertTriangle size={16} /> <strong>Active SOS Alert!</strong> — {sosAlerts[0].Patient?.first_name} needs emergency assistance
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 'auto' }}>Respond</button>
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Calendar size={22} /></div>
                    <div>
                        <div className="stat-value">{stats.todayAppointments}</div>
                        <div className="stat-label">Today's Appointments</div>
                        <div className="stat-change up">↑ 12% from yesterday</div>
                    </div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success"><DollarSign size={22} /></div>
                    <div>
                        <div className="stat-value">₹{(stats.todayRevenue / 1000).toFixed(1)}K</div>
                        <div className="stat-label">Today's Revenue</div>
                        <div className="stat-change up">↑ 8% this week</div>
                    </div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><Users size={22} /></div>
                    <div>
                        <div className="stat-value">{stats.totalPatients.toLocaleString()}</div>
                        <div className="stat-label">Total Patients</div>
                        <div className="stat-change up">+15 this week</div>
                    </div>
                </div>
                <div className="stat-card danger">
                    <div className="stat-icon danger"><Package size={22} /></div>
                    <div>
                        <div className="stat-value">{stats.lowStockMeds}</div>
                        <div className="stat-label">Low Stock Alerts</div>
                        <div className="stat-change down">Needs attention</div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid-2 mb-6">
                <div className="chart-container">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Revenue Overview</h3>
                            <p className="card-subtitle">Daily revenue this week</p>
                        </div>
                        <div className="badge badge-success badge-dot">+8.2%</div>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                            <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }} />
                            <Bar dataKey="revenue" fill="#0D7377" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="chart-container">
                    <div className="card-header">
                        <div>
                            <h3 className="card-title">Disease Distribution</h3>
                            <p className="card-subtitle">Top diseases this month</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={diseaseData} cx="50%" cy="50%" outerRadius={90} dataKey="count" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                {diseaseData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Live Queue & Doctor Status */}
            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title"><span className="live-dot" style={{ marginRight: 8 }}></span>Live Patient Queue</h3>
                        <span className="badge badge-primary">{recentAppointments.length} waiting</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentAppointments.map(a => (
                            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: `var(--primary-${a.severity > 3 ? '200' : '50'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                                    {a.patient.charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.patient}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.doctor} · {a.time}</div>
                                </div>
                                {a.severity >= 4 && <span className="badge badge-danger">Urgent</span>}
                                <span className={`badge ${statusBadge[a.status]}`}>{statusLabel[a.status]}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Doctor Status Board</h3>
                        <span className="badge badge-success badge-dot">{stats.activeDoctors} Active</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[
                            { name: 'Dr. Arun Sharma', specialty: 'General Medicine', status: 'available', patients: 8 },
                            { name: 'Dr. Priya Gupta', specialty: 'Pediatrics', status: 'with_patient', patients: 5 },
                            { name: 'Dr. Rajesh Reddy', specialty: 'Orthopedics', status: 'available', patients: 6 },
                            { name: 'Dr. Meera Shah', specialty: 'Cardiology', status: 'lunch', patients: 7 },
                            { name: 'Dr. Vikram Desai', specialty: 'Dermatology', status: 'break', patients: 4 },
                        ].map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-100), var(--primary-50))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>
                                    {d.name.split(' ').pop().charAt(0)}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.specialty} · {d.patients} patients today</div>
                                </div>
                                <span className={`badge badge-dot ${d.status === 'available' ? 'badge-success' : d.status === 'with_patient' ? 'badge-info' : d.status === 'lunch' ? 'badge-warning' : 'badge-neutral'}`}>
                                    {d.status.replace('_', ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
