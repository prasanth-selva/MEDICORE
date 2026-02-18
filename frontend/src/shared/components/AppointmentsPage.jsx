import { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { booked: '#F59E0B', confirmed: '#3B82F6', in_progress: '#06A77D', completed: '#6B7280', cancelled: '#EF4444' };

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    const fetchAppointments = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ date, limit: 50 });
            if (status) params.set('status', status);
            const res = await api.get(`/appointments?${params}`);
            setAppointments(res.data?.appointments || []);
            setTotal(res.data?.total || 0);
        } catch { setAppointments([]); }
        setLoading(false);
    };

    useEffect(() => { fetchAppointments(); }, [date, status]);

    const updateStatus = async (id, newStatus) => {
        try {
            await api.patch(`/appointments/${id}/status`, { status: newStatus });
            toast.success('Status updated');
            fetchAppointments();
        } catch { toast.error('Update failed'); }
    };

    return (
        <div className="animate-fade">
            <div className="flex items-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
                <div className="input-group" style={{ margin: 0 }}>
                    <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <select className="input" style={{ width: 'auto' }} value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="booked">Booked</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} appointments</span>
            </div>

            <div className="card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th><th>Patient</th><th>Doctor</th><th>Time</th>
                                <th>Symptom</th><th>Status</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Loading...</td></tr>
                            ) : appointments.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No appointments found</td></tr>
                            ) : appointments.map(a => {
                                const p = a.Patient || {};
                                const d = a.Doctor || {};
                                const color = STATUS_COLORS[a.status] || '#6B7280';
                                return (
                                    <tr key={a.id}>
                                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{a.queue_position}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.patient_code}</div>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{d.name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.specialty}</div>
                                        </td>
                                        <td style={{ fontSize: 12 }}>{new Date(a.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td style={{ fontSize: 12 }}>{a.primary_symptom || '—'}</td>
                                        <td>
                                            <span style={{ background: `${color}20`, color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex gap-1">
                                                {a.status === 'booked' && (
                                                    <button className="btn btn-xs btn-primary" onClick={() => updateStatus(a.id, 'confirmed')}>Confirm</button>
                                                )}
                                                {['booked', 'confirmed'].includes(a.status) && (
                                                    <button className="btn btn-xs btn-outline" style={{ color: '#EF4444', borderColor: '#EF4444' }} onClick={() => updateStatus(a.id, 'cancelled')}>Cancel</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
