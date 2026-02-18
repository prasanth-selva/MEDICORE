import { useState, useEffect, useRef } from 'react';
import { Stethoscope, Search, Upload, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../shared/utils/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { available: '#06A77D', with_patient: '#3B82F6', break: '#F59E0B', leave: '#EF4444' };

export default function AdminDoctors() {
    const [doctors, setDoctors] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const fileRef = useRef(null);

    const fetchDoctors = async () => {
        setLoading(true);
        try {
            const params = search ? `?search=${search}` : '';
            const res = await api.get(`/doctors${params}`);
            setDoctors(Array.isArray(res.data) ? res.data : res.data?.doctors || []);
        } catch { setDoctors([]); }
        setLoading(false);
    };

    useEffect(() => { fetchDoctors(); }, [search]);

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/doctors/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setImportResult(res.data);
            toast.success(`Imported ${res.data.imported}/${res.data.total} doctors`);
            fetchDoctors();
        } catch { toast.error('Import failed'); }
        setImporting(false);
        e.target.value = '';
    };

    const downloadTemplate = () => {
        const csv = 'name,specialty,qualification,phone,email,room_number,consultation_fee,experience_years\nDr. Ravi Kumar,Cardiology,MBBS MD,9876543210,ravi@hospital.com,101,500,10\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'doctors_template.csv'; a.click();
    };

    return (
        <div className="animate-fade">
            <div className="flex items-center justify-between mb-4">
                <div className="search-box">
                    <Search size={16} />
                    <input className="input" placeholder="Search doctors..." value={search}
                        onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>
                        <Download size={14} /> Template
                    </button>
                    <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={handleImport} />
                    <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={importing}>
                        <Upload size={14} /> {importing ? 'Importing...' : 'Import CSV'}
                    </button>
                </div>
            </div>

            {importResult && (
                <div className="card mb-4" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Import Result: {importResult.imported}/{importResult.total} imported</div>
                    {importResult.errors?.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--danger)' }}>
                            {importResult.errors.slice(0, 5).map((e, i) => (
                                <div key={i}>Row {e.row}: {e.errors.join(', ')}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th><th>Specialty</th><th>Room</th>
                                <th>Status</th><th>Fee</th><th>Experience</th><th>Phone</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Loading...</td></tr>
                            ) : doctors.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No doctors found</td></tr>
                            ) : doctors.map(d => {
                                const color = STATUS_COLORS[d.status] || '#6B7280';
                                return (
                                    <tr key={d.id}>
                                        <td style={{ fontWeight: 600 }}>{d.name}</td>
                                        <td>{d.specialty}</td>
                                        <td>{d.room_number || '—'}</td>
                                        <td>
                                            <span style={{ background: `${color}20`, color, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                                                {d.status}
                                            </span>
                                        </td>
                                        <td>₹{d.consultation_fee}</td>
                                        <td>{d.experience_years}y</td>
                                        <td style={{ fontSize: 12 }}>{d.phone}</td>
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
