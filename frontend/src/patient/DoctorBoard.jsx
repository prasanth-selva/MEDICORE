import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { useSocket } from '../shared/context/SocketContext';
import { Stethoscope, Phone, Calendar, Clock, MapPin, Star, Search, Filter, X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from '../shared/utils/api';
import toast from 'react-hot-toast';

const STATUS_MAP = {
    available: { label: 'Available', color: 'var(--success)', badge: 'badge-success', dot: '🟢' },
    with_patient: { label: 'With Patient', color: 'var(--info)', badge: 'badge-info', dot: '🔵' },
    break: { label: 'On Break', color: 'var(--warning)', badge: 'badge-warning', dot: '🟡' },
    lunch: { label: 'Lunch Break', color: '#F97316', badge: 'badge-warning', dot: '🟠' },
    meeting: { label: 'In Meeting', color: 'var(--text-muted)', badge: '', dot: '⚪' },
    leave: { label: 'On Leave', color: 'var(--danger)', badge: 'badge-danger', dot: '🔴' },
};

export default function DoctorBoard() {
    const { socket } = useSocket();
    const { profile, setProfile } = useAuth();
    const [doctors, setDoctors] = useState([]);
    const [search, setSearch] = useState('');
    const [filterSpec, setFilterSpec] = useState('all');
    const [filterAvail, setFilterAvail] = useState(false);
    const [showBooking, setShowBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingForm, setBookingForm] = useState({ date: '', time: '10:00', reason: '' });
    const [bookingMsg, setBookingMsg] = useState('');
    const [patientId, setPatientId] = useState(profile?.id || null);
    const refreshRef = useRef(null);

    const fetchDoctors = async () => {
        try {
            const res = await api.get('/doctors');
            setDoctors(res.data || []);
        } catch {
            // Demo data
            setDoctors([
                { id: 1, name: 'Dr. Arun Sharma', specialty: 'General Medicine', phone: '+91 9000000002', status: 'available', experience_years: 12, status_updated_at: new Date().toISOString() },
                { id: 2, name: 'Dr. Priya Nair', specialty: 'Pediatrics', phone: '+91 9000000003', status: 'with_patient', experience_years: 8, status_updated_at: new Date().toISOString() },
                { id: 3, name: 'Dr. Rajesh Kumar', specialty: 'Cardiology', phone: '+91 9000000004', status: 'available', experience_years: 15, status_updated_at: new Date().toISOString() },
                { id: 4, name: 'Dr. Meera Patel', specialty: 'Dermatology', phone: '+91 9000000005', status: 'leave', leave_reason: 'Personal', expected_return: '14:00', experience_years: 10, status_updated_at: new Date().toISOString() },
            ]);
        }
        setLoading(false);
    };

    // Fetch patient profile if not loaded yet (handles newly registered patients)
    useEffect(() => {
        if (profile?.id) {
            setPatientId(profile.id);
        } else {
            api.get('/auth/profile').then(res => {
                if (res.data?.profile?.id) setPatientId(res.data.profile.id);
            }).catch(() => { });
        }
    }, [profile]);

    useEffect(() => { fetchDoctors(); }, []);

    // Real-time doctor status updates
    useEffect(() => {
        if (!socket) return;
        const handleStatusChange = (data) => {
            setDoctors(prev => prev.map(doc =>
                doc.id === data.doctorId ? {
                    ...doc,
                    status: data.status,
                    status_updated_at: data.updatedAt || new Date().toISOString(),
                    leave_reason: data.leave_reason || '',
                    expected_return: data.expected_return || '',
                } : doc
            ));
        };
        socket.on('DOCTOR_STATUS_CHANGED', handleStatusChange);
        return () => socket.off('DOCTOR_STATUS_CHANGED', handleStatusChange);
    }, [socket]);

    // Auto-refresh every 30s
    useEffect(() => {
        refreshRef.current = setInterval(fetchDoctors, 30000);
        return () => clearInterval(refreshRef.current);
    }, []);

    const handleBooking = async () => {
        if (!bookingForm.date || !bookingForm.reason) {
            setBookingMsg('Please fill date and reason.');
            return;
        }
        if (!patientId) {
            setBookingMsg('Patient profile not found. Please complete your profile first.');
            return;
        }
        try {
            await api.post('/appointments', {
                patient_id: patientId,
                doctor_id: showBooking.id,
                appointment_date: bookingForm.date,
                appointment_time: bookingForm.time,
                reason: bookingForm.reason,
            });
            setBookingMsg('Appointment booked successfully! ✓');
            toast.success('Appointment booked!');
            setTimeout(() => { setShowBooking(null); setBookingMsg(''); setBookingForm({ date: '', time: '10:00', reason: '' }); }, 2000);
        } catch (err) {
            setBookingMsg(err.response?.data?.error || 'Booking failed. Please try again.');
        }
    };

    const specialties = [...new Set(doctors.map(d => d.specialty))].filter(Boolean);

    const filteredDoctors = doctors.filter(doc => {
        if (search && !doc.name.toLowerCase().includes(search.toLowerCase()) && !doc.specialty?.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterSpec !== 'all' && doc.specialty !== filterSpec) return false;
        if (filterAvail && doc.status !== 'available') return false;
        return true;
    });

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        return `${hrs}h ago`;
    };

    return (
        <div className="animate-fade">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, var(--primary), var(--success))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Stethoscope size={22} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Our Doctors</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {doctors.filter(d => d.status === 'available').length} available · Real-time status
                        </p>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
                <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
                    <Search size={16} />
                    <input className="input" placeholder="Search doctors by name or specialty..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input" style={{ width: 160 }} value={filterSpec} onChange={e => setFilterSpec(e.target.value)}>
                    <option value="all">All Specialties</option>
                    {specialties.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className={`btn btn-sm ${filterAvail ? 'btn-success' : 'btn-outline'}`} onClick={() => setFilterAvail(!filterAvail)}>
                    {filterAvail ? '✓ Available Only' : 'Available Only'}
                </button>
            </div>

            {/* Doctor Grid */}
            <div className="grid-2">
                {filteredDoctors.map(doc => {
                    const st = STATUS_MAP[doc.status] || STATUS_MAP.available;
                    return (
                        <div key={doc.id} className="card" style={{ borderTop: `3px solid ${st.color}`, position: 'relative' }}>
                            {/* Status Badge */}
                            <div style={{ position: 'absolute', top: 12, right: 12 }}>
                                <span className={`badge ${st.badge} badge-dot`} style={{ fontSize: 11 }}>
                                    {st.dot} {st.label}
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                                <div style={{
                                    width: 52, height: 52, borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${st.color}20, ${st.color}10)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 20, fontWeight: 700, color: st.color,
                                    border: `2px solid ${st.color}40`,
                                }}>
                                    {doc.name?.charAt(4) || 'D'}
                                </div>
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{doc.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.specialty}</div>
                                    {doc.experience_years && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {doc.experience_years} years experience
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Leave Info */}
                            {doc.status === 'leave' && (
                                <div className="alert-banner danger" style={{ marginBottom: 12, padding: '8px 12px', fontSize: 12 }}>
                                    <AlertTriangle size={14} />
                                    <div>
                                        <div><strong>On Leave</strong>{doc.leave_reason ? ` — ${doc.leave_reason}` : ''}</div>
                                        {doc.expected_return && (
                                            <div style={{ fontSize: 11, opacity: 0.8 }}>Expected back at {doc.expected_return}</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Status timestamp */}
                            {doc.status_updated_at && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
                                    <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                                    Status updated {timeAgo(doc.status_updated_at)}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8 }}>
                                {doc.phone && (
                                    <a href={`tel:${doc.phone}`} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                                        <Phone size={14} /> Call
                                    </a>
                                )}
                                <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => setShowBooking(doc)}
                                    disabled={doc.status === 'leave'}>
                                    <Calendar size={14} /> {doc.status === 'leave' ? 'Unavailable' : 'Book'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredDoctors.length === 0 && (
                <div className="empty-state">
                    <Stethoscope size={40} />
                    <h3>No doctors found</h3>
                    <p>Try adjusting your search or filters.</p>
                </div>
            )}

            {/* Booking Modal */}
            {showBooking && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowBooking(null); setBookingMsg(''); } }}>
                    <div className="modal" style={{ maxWidth: 440 }}>
                        <div className="modal-header">
                            <div className="modal-title">Book Appointment</div>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setShowBooking(null); setBookingMsg(''); }}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="alert-banner success" style={{ marginBottom: 16 }}>
                                <Stethoscope size={16} /> Booking with <strong>{showBooking.name}</strong> · {showBooking.specialty}
                            </div>
                            <div className="input-group">
                                <label className="input-label">Date</label>
                                <input className="input" type="date" value={bookingForm.date} onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })} min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Preferred Time</label>
                                <input className="input" type="time" value={bookingForm.time} onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Reason for Visit</label>
                                <textarea className="input" placeholder="Describe your symptoms or reason..." value={bookingForm.reason} onChange={e => setBookingForm({ ...bookingForm, reason: e.target.value })} rows={3} />
                            </div>
                            {bookingMsg && (
                                <div className={`alert-banner ${bookingMsg.includes('success') ? 'success' : 'danger'}`}>
                                    {bookingMsg.includes('success') ? <CheckCircle size={14} /> : <AlertTriangle size={14} />} {bookingMsg}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => { setShowBooking(null); setBookingMsg(''); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleBooking}>Confirm Booking</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
