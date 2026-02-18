import { useState, useEffect, useRef } from 'react';
import { Users, Search, UserPlus, Upload, Download, Phone, Calendar } from 'lucide-react';
import api from '../shared/utils/api';
import toast from 'react-hot-toast';

export default function AdminPatients() {
    const [patients, setPatients] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const fileRef = useRef(null);

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 20 });
            if (search) params.set('search', search);
            const res = await api.get(`/patients?${params}`);
            setPatients(res.data?.patients || []);
            setTotal(res.data?.total || 0);
        } catch { setPatients([]); }
        setLoading(false);
    };

    useEffect(() => { fetchPatients(); }, [page, search]);

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/patients/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(`Imported ${res.data.imported}/${res.data.total} patients`);
            if (res.data.errors?.length > 0) toast.error(`${res.data.errors.length} rows had errors`);
            fetchPatients();
        } catch { toast.error('Import failed'); }
        setImporting(false);
        e.target.value = '';
    };

    const downloadTemplate = () => {
        const csv = 'first_name,last_name,phone,email,age,gender,blood_group,address,city\nRavi,Kumar,9876543210,ravi@email.com,35,male,O+,123 Main St,Coimbatore\n';
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'patients_template.csv'; a.click();
    };

    return (
        <div className="animate-fade">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="search-box">
                        <Search size={16} />
                        <input className="input" placeholder="Search patients..." value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }} />
                    </div>
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

            <div className="card">
                <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Patient Code</th><th>Name</th><th>Phone</th>
                                <th>Age</th><th>Blood Group</th><th>City</th><th>Registered</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>Loading...</td></tr>
                            ) : patients.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No patients found</td></tr>
                            ) : patients.map(p => (
                                <tr key={p.id}>
                                    <td><code style={{ fontSize: 12 }}>{p.patient_code}</code></td>
                                    <td style={{ fontWeight: 600 }}>{p.first_name} {p.last_name}</td>
                                    <td>{p.phone}</td>
                                    <td>{p.age || '—'}</td>
                                    <td>{p.blood_group || '—'}</td>
                                    <td>{p.city || '—'}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between mt-3" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    <span>Total: {total} patients</span>
                    <div className="flex gap-2">
                        <button className="btn btn-sm btn-outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                        <span style={{ padding: '4px 8px' }}>Page {page}</span>
                        <button className="btn btn-sm btn-outline" disabled={patients.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
