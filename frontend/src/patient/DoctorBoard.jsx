import { useState, useEffect } from 'react';
import { useSocket } from '../shared/context/SocketContext';
import { Stethoscope, Phone, Calendar, Clock, MapPin, Star, Search, Filter } from 'lucide-react';

export default function DoctorBoard() {
    const { socket } = useSocket();
    const [doctors, setDoctors] = useState([]);
    const [search, setSearch] = useState('');
    const [filterSpec, setFilterSpec] = useState('all');
    const [showBooking, setShowBooking] = useState(null);

    useEffect(() => {
        setDoctors([
            { id: '1', name: 'Dr. Arun Sharma', specialty: 'General Medicine', status: 'available', rating: 4.8, experience: '15 years', queue: 3, phone: '+91 9876543210', schedule: '9 AM - 5 PM', fee: 500 },
            { id: '2', name: 'Dr. Priya Gupta', specialty: 'Pediatrics', status: 'with_patient', rating: 4.9, experience: '12 years', queue: 5, phone: '+91 9876543211', schedule: '10 AM - 6 PM', fee: 600 },
            { id: '3', name: 'Dr. Rajesh Reddy', specialty: 'Orthopedics', status: 'available', rating: 4.7, experience: '20 years', queue: 2, phone: '+91 9876543212', schedule: '9 AM - 4 PM', fee: 800 },
            { id: '4', name: 'Dr. Meera Shah', specialty: 'Cardiology', status: 'lunch', rating: 4.9, experience: '18 years', queue: 0, phone: '+91 9876543213', schedule: '10 AM - 5 PM', fee: 1000 },
            { id: '5', name: 'Dr. Vikram Desai', specialty: 'Dermatology', status: 'available', rating: 4.6, experience: '10 years', queue: 4, phone: '+91 9876543214', schedule: '11 AM - 7 PM', fee: 700 },
            { id: '6', name: 'Dr. Anjali Menon', specialty: 'Gynecology', status: 'with_patient', rating: 4.8, experience: '14 years', queue: 6, phone: '+91 9876543215', schedule: '9 AM - 3 PM', fee: 900 },
        ]);

        if (socket) {
            socket.on('DOCTOR_STATUS_CHANGED', (data) => {
                setDoctors(prev => prev.map(d => d.id === data.doctorId ? { ...d, status: data.status } : d));
            });
        }
    }, [socket]);

    const specialties = ['all', ...new Set(doctors.map(d => d.specialty))];
    const filtered = doctors
        .filter(d => filterSpec === 'all' || d.specialty === filterSpec)
        .filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

    const statusConfig = {
        available: { label: 'Available', badge: 'badge-success', dot: '🟢' },
        with_patient: { label: 'With Patient', badge: 'badge-info', dot: '🔵' },
        break: { label: 'Break', badge: 'badge-warning', dot: '🟡' },
        lunch: { label: 'Lunch Break', badge: 'badge-warning', dot: '🟠' },
        meeting: { label: 'Meeting', badge: 'badge-neutral', dot: '⚪' },
        leave: { label: 'Leave', badge: 'badge-danger', dot: '🔴' },
    };

    return (
        <div className="animate-fade">
            {/* Search / Filter */}
            <div className="flex items-center gap-3 mb-6">
                <div className="search-box" style={{ flex: 1 }}>
                    <Search />
                    <input className="input" placeholder="Search doctors by name..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input" value={filterSpec} onChange={e => setFilterSpec(e.target.value)} style={{ width: 200 }}>
                    {specialties.map(s => <option key={s} value={s}>{s === 'all' ? 'All Specialties' : s}</option>)}
                </select>
            </div>

            {/* Doctor Cards */}
            <div className="grid-2 gap-4">
                {filtered.map(doc => {
                    const sc = statusConfig[doc.status] || statusConfig.available;
                    return (
                        <div key={doc.id} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                            {/* Status indicator line */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: doc.status === 'available' ? 'var(--success)' : doc.status === 'with_patient' ? 'var(--info)' : 'var(--warning)' }}></div>

                            <div className="flex gap-4">
                                {/* Avatar */}
                                <div style={{
                                    width: 60, height: 60, borderRadius: 'var(--radius-lg)', flexShrink: 0,
                                    background: `linear-gradient(135deg, var(--primary-100), var(--primary-50))`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 24, fontWeight: 800, color: 'var(--primary)',
                                }}>
                                    {doc.name.charAt(4)}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700 }}>{doc.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.specialty} · {doc.experience}</div>
                                        </div>
                                        <span className={`badge ${sc.badge} badge-dot`}>{sc.label}</span>
                                    </div>

                                    <div className="flex items-center gap-4 mt-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        <span className="flex items-center gap-1"><Star size={12} color="#F59E0B" fill="#F59E0B" /> {doc.rating}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {doc.schedule}</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{doc.fee}</span>
                                    </div>

                                    <div className="flex items-center justify-between mt-3">
                                        <div>
                                            {doc.status === 'available' && (
                                                <span className="badge badge-primary">Queue: {doc.queue} patients</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <a href={`tel:${doc.phone}`} className="btn btn-outline btn-sm"><Phone size={14} /></a>
                                            <button className="btn btn-primary btn-sm" disabled={doc.status === 'leave'}
                                                onClick={() => setShowBooking(doc)}>
                                                <Calendar size={14} /> Book
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Booking Modal */}
            {showBooking && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowBooking(null); }}>
                    <div className="modal">
                        <div className="modal-header">
                            <div className="modal-title">Book Appointment</div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowBooking(null)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <div style={{
                                    width: 60, height: 60, borderRadius: '50%', margin: '0 auto 10px',
                                    background: 'linear-gradient(135deg, var(--primary-100), var(--primary-50))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 24, fontWeight: 700, color: 'var(--primary)',
                                }}>{showBooking.name.charAt(4)}</div>
                                <div style={{ fontSize: 16, fontWeight: 700 }}>{showBooking.name}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{showBooking.specialty} · ₹{showBooking.fee}</div>
                            </div>

                            <div className="input-group">
                                <label className="input-label">Date</label>
                                <input className="input" type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="input-group">
                                <label className="input-label">Preferred Time</label>
                                <select className="input">
                                    <option>09:00 AM</option><option>09:30 AM</option><option>10:00 AM</option>
                                    <option>10:30 AM</option><option>11:00 AM</option><option>11:30 AM</option>
                                    <option>02:00 PM</option><option>02:30 PM</option><option>03:00 PM</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Reason for Visit</label>
                                <textarea className="input" placeholder="Describe your symptoms..." rows={3}></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowBooking(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => { setShowBooking(null); }}>
                                <Calendar size={14} /> Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
