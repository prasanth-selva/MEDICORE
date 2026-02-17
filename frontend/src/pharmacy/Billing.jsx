import { useState } from 'react';
import { DollarSign, Plus, Search, CheckCircle, Clock, CreditCard, Banknote, Smartphone, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Billing() {
    const [invoices, setInvoices] = useState([
        { id: 'INV-2024-001', patient: 'Ravi Kumar', amount: 1250, paid: 1250, method: 'upi', status: 'paid', date: '2024-01-15', items: 'Consultation + Medicines' },
        { id: 'INV-2024-002', patient: 'Priya Patel', amount: 850, paid: 0, method: null, status: 'pending', date: '2024-01-15', items: 'Lab Tests + Medicines' },
        { id: 'INV-2024-003', patient: 'Arjun Singh', amount: 2400, paid: 2400, method: 'card', status: 'paid', date: '2024-01-14', items: 'Surgery Consult + Medicines' },
        { id: 'INV-2024-004', patient: 'Sneha Iyer', amount: 600, paid: 600, method: 'cash', status: 'paid', date: '2024-01-14', items: 'Consultation' },
        { id: 'INV-2024-005', patient: 'Amit Verma', amount: 3200, paid: 0, method: null, status: 'pending', date: '2024-01-14', items: 'Emergency + Medicines + Lab' },
    ]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const revenueData = [
        { name: 'Mon', revenue: 18500 }, { name: 'Tue', revenue: 22000 },
        { name: 'Wed', revenue: 19800 }, { name: 'Thu', revenue: 28500 },
        { name: 'Fri', revenue: 32000 }, { name: 'Sat', revenue: 15000 },
    ];

    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const pending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
    const filtered = invoices
        .filter(i => filter === 'all' || i.status === filter)
        .filter(i => i.patient.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()));

    const methodIcon = { cash: <Banknote size={14} />, card: <CreditCard size={14} />, upi: <Smartphone size={14} /> };

    const processPayment = (id, method) => {
        setInvoices(prev => prev.map(i =>
            i.id === id ? { ...i, status: 'paid', method, paid: i.amount } : i
        ));
    };

    return (
        <div className="animate-fade">
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="stat-card success">
                    <div className="stat-icon success"><DollarSign size={22} /></div>
                    <div><div className="stat-value">₹{(totalRevenue / 1000).toFixed(1)}K</div><div className="stat-label">Total Collected</div></div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><Clock size={22} /></div>
                    <div><div className="stat-value">₹{(pending / 1000).toFixed(1)}K</div><div className="stat-label">Pending</div></div>
                </div>
                <div className="stat-card primary">
                    <div className="stat-icon primary"><FileText size={22} /></div>
                    <div><div className="stat-value">{invoices.length}</div><div className="stat-label">Total Invoices</div></div>
                </div>
            </div>

            <div className="chart-container mb-6">
                <div className="card-header"><h3 className="card-title">Weekly Revenue</h3></div>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                        <Bar dataKey="revenue" fill="#06A77D" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="search-box">
                        <Search />
                        <input className="input" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 260 }} />
                    </div>
                    <div className="tabs" style={{ marginBottom: 0 }}>
                        {['all', 'pending', 'paid'].map(f => (
                            <button key={f} className={`tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>Invoice</th><th>Patient</th><th>Items</th><th>Amount</th><th>Method</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        {filtered.map(i => (
                            <tr key={i.id}>
                                <td style={{ fontWeight: 600 }}>{i.id}</td>
                                <td>{i.patient}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.items}</td>
                                <td style={{ fontWeight: 700 }}>₹{i.amount.toLocaleString()}</td>
                                <td>
                                    {i.method ? (
                                        <span className="badge badge-neutral">{methodIcon[i.method]} {i.method.toUpperCase()}</span>
                                    ) : '—'}
                                </td>
                                <td><span className={`badge ${i.status === 'paid' ? 'badge-success' : 'badge-warning'} badge-dot`}>{i.status}</span></td>
                                <td>
                                    {i.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button className="btn btn-success btn-sm" onClick={() => processPayment(i.id, 'cash')} title="Cash"><Banknote size={14} /></button>
                                            <button className="btn btn-primary btn-sm" onClick={() => processPayment(i.id, 'upi')} title="UPI"><Smartphone size={14} /></button>
                                            <button className="btn btn-outline btn-sm" onClick={() => processPayment(i.id, 'card')} title="Card"><CreditCard size={14} /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
