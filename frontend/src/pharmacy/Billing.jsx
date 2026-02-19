import { useState, useEffect } from 'react';
import { DollarSign, Plus, Search, CheckCircle, Clock, CreditCard, Banknote, Smartphone, FileText, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../shared/utils/api';

export default function Billing() {
    const [invoices, setInvoices] = useState([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [revenueData, setRevenueData] = useState([]);
    const [showCreateBill, setShowCreateBill] = useState(false);
    const [billForm, setBillForm] = useState({
        patient_id: '', amount: '', description: '', payment_method: '',
    });
    const [billMsg, setBillMsg] = useState('');
    const [patients, setPatients] = useState([]);
    const [patientSearch, setPatientSearch] = useState('');

    const loadBillingData = async () => {
        setLoading(true);
        try {
            const [billsRes, revenueRes, patientRes] = await Promise.allSettled([
                api.get('/billing'),
                api.get('/billing/revenue?period=7'),
                api.get('/patients?limit=100'),
            ]);

            if (billsRes.status === 'fulfilled') {
                const bills = billsRes.value.data.bills || billsRes.value.data || [];
                setInvoices(bills.map(b => ({
                    id: b.invoice_number || `INV-${b.id?.slice(0, 8)}`,
                    dbId: b.id,
                    patient: b.Patient ? `${b.Patient.first_name} ${b.Patient.last_name}` : 'Unknown',
                    amount: parseFloat(b.total_amount) || 0,
                    paid: parseFloat(b.paid_amount) || 0,
                    method: b.payment_method,
                    status: b.status || 'pending',
                    date: new Date(b.created_at).toLocaleDateString('en-IN'),
                    items: b.notes || (b.items?.length ? `${b.items.length} items` : 'Consultation'),
                })));
            }

            if (revenueRes.status === 'fulfilled' && revenueRes.value.data.daily?.length > 0) {
                setRevenueData(revenueRes.value.data.daily.map(d => ({
                    name: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
                    revenue: parseFloat(d.total) || 0,
                })));
            }

            if (patientRes.status === 'fulfilled') {
                setPatients(patientRes.value.data.patients || patientRes.value.data || []);
            }
        } catch (err) {
            console.error('Billing load error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadBillingData(); }, []);

    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const pending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
    const filtered = invoices
        .filter(i => filter === 'all' || i.status === filter)
        .filter(i => i.patient.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()));

    const methodIcon = { cash: <Banknote size={14} />, card: <CreditCard size={14} />, upi: <Smartphone size={14} />, insurance: <CreditCard size={14} /> };

    const processPayment = async (invoiceId, dbId, method) => {
        try {
            const invoice = invoices.find(i => i.id === invoiceId);
            await api.patch(`/billing/${dbId}/pay`, {
                payment_method: method,
                paid_amount: invoice?.amount || 0
            });
            loadBillingData();
        } catch (err) {
            console.error('Payment processing error:', err);
            // Optimistic update as fallback
            setInvoices(prev => prev.map(i =>
                i.id === invoiceId ? { ...i, status: 'paid', method, paid: i.amount } : i
            ));
        }
    };

    const handleCreateBill = async (e) => {
        e.preventDefault();
        setBillMsg('');
        try {
            await api.post('/billing', {
                patient_id: billForm.patient_id,
                total_amount: parseFloat(billForm.amount) || 0,
                subtotal: parseFloat(billForm.amount) || 0,
                tax_amount: 0,
                discount_amount: 0,
                items: billForm.description ? [{ name: billForm.description, amount: parseFloat(billForm.amount) || 0 }] : [],
                notes: billForm.description,
                payment_method: billForm.payment_method || null,
            });
            setBillMsg('✅ Invoice created successfully!');
            loadBillingData();
            setTimeout(() => { setShowCreateBill(false); setBillMsg(''); }, 1500);
        } catch (err) {
            setBillMsg(`❌ ${err.response?.data?.error || 'Failed to create invoice'}`);
        }
    };

    const filteredPatients = patients.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearch.toLowerCase())
    );

    return (
        <div className="animate-fade">
            <div className="flex items-center justify-between mb-4">
                <div></div>
                <button className="btn btn-primary btn-sm" onClick={() => { setShowCreateBill(true); setBillMsg(''); }}>
                    <Plus size={14} /> Create Invoice
                </button>
            </div>

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

            {revenueData.length > 0 && (
                <div className="chart-container mb-6">
                    <div className="card-header"><h3 className="card-title">Weekly Revenue</h3></div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94A3B8' }} />
                            <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} />
                            <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
                            <Bar dataKey="revenue" fill="#06A77D" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

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

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading invoices...</div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr><th>Invoice</th><th>Patient</th><th>Items</th><th>Amount</th><th>Method</th><th>Status</th><th>Action</th></tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No invoices found</td></tr>
                            ) : filtered.map(i => (
                                <tr key={i.id}>
                                    <td style={{ fontWeight: 600 }}>{i.id}</td>
                                    <td>{i.patient}</td>
                                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.items}</td>
                                    <td style={{ fontWeight: 700 }}>₹{i.amount.toLocaleString()}</td>
                                    <td>
                                        {i.method ? (
                                            <span className="badge badge-neutral">{methodIcon[i.method] || methodIcon.cash} {i.method.toUpperCase()}</span>
                                        ) : '—'}
                                    </td>
                                    <td><span className={`badge ${i.status === 'paid' ? 'badge-success' : 'badge-warning'} badge-dot`}>{i.status}</span></td>
                                    <td>
                                        {i.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button className="btn btn-success btn-sm" onClick={() => processPayment(i.id, i.dbId, 'cash')} title="Cash"><Banknote size={14} /></button>
                                                <button className="btn btn-primary btn-sm" onClick={() => processPayment(i.id, i.dbId, 'upi')} title="UPI/GPay"><Smartphone size={14} /></button>
                                                <button className="btn btn-outline btn-sm" onClick={() => processPayment(i.id, i.dbId, 'card')} title="Card"><CreditCard size={14} /></button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Invoice Modal */}
            {showCreateBill && (
                <div className="modal-overlay" onClick={() => setShowCreateBill(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h3><Plus size={18} /> Create Invoice</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowCreateBill(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreateBill}>
                            {billMsg && <div className={`alert-banner ${billMsg.startsWith('✅') ? 'success' : 'danger'}`} style={{ marginBottom: 12 }}>{billMsg}</div>}

                            <div className="form-group">
                                <label>Patient *</label>
                                <input className="form-input" placeholder="Search patient..." value={patientSearch}
                                    onChange={e => setPatientSearch(e.target.value)} />
                                {patientSearch && filteredPatients.length > 0 && (
                                    <div style={{ maxHeight: 120, overflowY: 'auto', background: 'var(--bg-primary)', borderRadius: 8, marginTop: 4 }}>
                                        {filteredPatients.slice(0, 5).map(p => (
                                            <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
                                                onClick={() => { setBillForm(f => ({ ...f, patient_id: p.id })); setPatientSearch(`${p.first_name} ${p.last_name}`); }}>
                                                {p.first_name} {p.last_name} — {p.patient_code}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label>Total Amount (₹) *</label>
                                <input className="form-input" type="number" step="0.01" required value={billForm.amount}
                                    onChange={e => setBillForm(f => ({ ...f, amount: e.target.value }))} />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <input className="form-input" value={billForm.description}
                                    onChange={e => setBillForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Consultation + Medicines" />
                            </div>

                            <div className="form-group">
                                <label>Payment Method (leave blank for pending)</label>
                                <select className="form-input" value={billForm.payment_method}
                                    onChange={e => setBillForm(f => ({ ...f, payment_method: e.target.value }))}>
                                    <option value="">— Pending —</option>
                                    <option value="cash">💵 Cash</option>
                                    <option value="card">💳 Card</option>
                                    <option value="upi">📱 UPI</option>
                                    <option value="insurance">🏥 Insurance</option>
                                </select>
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateBill(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
