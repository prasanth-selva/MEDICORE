import { useState, useEffect } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { FileText, Pill, Calendar, Download, Eye } from 'lucide-react';
import api from '../shared/utils/api';

export default function MyRecords() {
    const { profile } = useAuth();
    const [tab, setTab] = useState('prescriptions');
    const [prescriptions, setPrescriptions] = useState([]);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    const patientId = profile?.id;

    useEffect(() => {
        if (!patientId) { setLoading(false); return; }
        const load = async () => {
            setLoading(true);
            try {
                const [rxRes, histRes] = await Promise.allSettled([
                    api.get(`/prescriptions?patient_id=${patientId}`),
                    api.get(`/patients/${patientId}/history`),
                ]);

                if (rxRes.status === 'fulfilled') {
                    const rxs = rxRes.value.data.prescriptions || rxRes.value.data || [];
                    setPrescriptions(rxs.map(p => ({
                        id: p.id,
                        date: new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                        doctor: p.Doctor?.name || 'Doctor',
                        diagnosis: p.diagnosis || 'Consultation',
                        medicines: (p.items || []).map(i => i.medicine || i.name || 'Unknown'),
                        status: p.status || 'pending',
                    })));
                }

                if (histRes.status === 'fulfilled') {
                    const hist = histRes.value.data.appointments || histRes.value.data || [];
                    setVisits(hist.map(v => ({
                        date: new Date(v.scheduled_time || v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
                        doctor: v.Doctor?.name || 'Doctor',
                        type: v.type || 'Consultation',
                        diagnosis: v.diagnosis || v.primary_symptom || 'General',
                        notes: v.notes || '',
                    })));
                }
            } catch (err) {
                console.error('Records load error:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [patientId]);

    const handleDownloadPdf = async (prescriptionId) => {
        try {
            const res = await api.get(`/prescriptions/${prescriptionId}/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `prescription-${prescriptionId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('PDF download error:', err);
        }
    };

    return (
        <div className="animate-fade">
            <div className="tabs mb-6">
                <button className={`tab ${tab === 'prescriptions' ? 'active' : ''}`} onClick={() => setTab('prescriptions')}>
                    <Pill size={14} style={{ marginRight: 4 }} /> Prescriptions
                </button>
                <button className={`tab ${tab === 'visits' ? 'active' : ''}`} onClick={() => setTab('visits')}>
                    <Calendar size={14} style={{ marginRight: 4 }} /> Visit History
                </button>
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>
            ) : (
                <>
                    {tab === 'prescriptions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {prescriptions.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No prescriptions found</div>
                            ) : prescriptions.map(p => (
                                <div key={p.id} className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700 }}>{p.diagnosis}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.doctor} · {p.date}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span className={`badge ${p.status === 'dispensed' ? 'badge-success' : 'badge-warning'} badge-dot`}>{p.status}</span>
                                            <button className="btn btn-outline btn-sm" onClick={() => handleDownloadPdf(p.id)} title="Download PDF">
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                        {p.medicines.map((m, i) => (
                                            <span key={i} className="badge badge-neutral">💊 {m}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'visits' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {visits.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No visit history found</div>
                            ) : visits.map((v, i) => (
                                <div key={i} className="card" style={{ borderLeft: '4px solid var(--info)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <div style={{ fontSize: 15, fontWeight: 700 }}>{v.diagnosis}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.doctor} · {v.date} · {v.type}</div>
                                        </div>
                                    </div>
                                    {v.notes && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{v.notes}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
