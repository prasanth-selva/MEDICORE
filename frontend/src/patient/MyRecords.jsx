import { useState } from 'react';
import { FileText, Pill, Calendar, Download, Eye } from 'lucide-react';

export default function MyRecords() {
    const [tab, setTab] = useState('prescriptions');

    const prescriptions = [
        { id: '1', date: 'Jan 15, 2024', doctor: 'Dr. Arun Sharma', diagnosis: 'Viral Fever', medicines: ['Paracetamol 500mg', 'Cetirizine 10mg', 'Vitamin C'], status: 'dispensed' },
        { id: '2', date: 'Jan 10, 2024', doctor: 'Dr. Priya Gupta', diagnosis: 'Regular Checkup', medicines: ['Multivitamin', 'Iron Supplement'], status: 'dispensed' },
        { id: '3', date: 'Dec 20, 2023', doctor: 'Dr. Reddy', diagnosis: 'Lower Back Pain', medicines: ['Diclofenac 50mg', 'Pantoprazole 40mg', 'Muscle Relaxant'], status: 'dispensed' },
        { id: '4', date: 'Nov 5, 2023', doctor: 'Dr. Shah', diagnosis: 'Hypertension Follow-up', medicines: ['Amlodipine 5mg', 'Telmisartan 40mg'], status: 'dispensed' },
    ];

    const visits = [
        { date: 'Jan 15, 2024', doctor: 'Dr. Sharma', type: 'Consultation', diagnosis: 'Viral Fever', notes: 'Patient presented with fever for 3 days. Advised rest and fluids.' },
        { date: 'Jan 10, 2024', doctor: 'Dr. Gupta', type: 'Checkup', diagnosis: 'Healthy', notes: 'Annual health checkup. All vitals normal.' },
        { date: 'Dec 20, 2023', doctor: 'Dr. Reddy', type: 'Consultation', diagnosis: 'Lumbar Strain', notes: 'X-ray normal. Physiotherapy recommended.' },
    ];

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

            {tab === 'prescriptions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {prescriptions.map(p => (
                        <div key={p.id} className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700 }}>{p.diagnosis}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.doctor} · {p.date}</div>
                                </div>
                                <span className="badge badge-success badge-dot">{p.status}</span>
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
                    {visits.map((v, i) => (
                        <div key={i} className="card" style={{ borderLeft: '4px solid var(--info)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div style={{ fontSize: 15, fontWeight: 700 }}>{v.diagnosis}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.doctor} · {v.date} · {v.type}</div>
                                </div>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>{v.notes}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
