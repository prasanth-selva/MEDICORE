import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search, Plus, Upload, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../shared/utils/api';

export default function Inventory() {
    const [medicines, setMedicines] = useState([]);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [view, setView] = useState('list');

    useEffect(() => {
        setMedicines([
            { id: '1', name: 'Paracetamol 500mg', generic_name: 'Acetaminophen', category: 'Analgesic', current_stock: 5200, reorder_level: 1000, unit_price: 2.5, supplier: 'MedPharma Ltd', expiry: '2026-06-15', status: 'ok' },
            { id: '2', name: 'Azithromycin 500mg', generic_name: 'Azithromycin', category: 'Antibiotic', current_stock: 180, reorder_level: 500, unit_price: 45.0, supplier: 'CureAll Inc', expiry: '2025-12-01', status: 'low' },
            { id: '3', name: 'Cetirizine 10mg', generic_name: 'Cetirizine', category: 'Antihistamine', current_stock: 3200, reorder_level: 800, unit_price: 3.0, supplier: 'HealthFirst', expiry: '2026-03-20', status: 'ok' },
            { id: '4', name: 'Metformin 500mg', generic_name: 'Metformin', category: 'Antidiabetic', current_stock: 4100, reorder_level: 1500, unit_price: 5.5, supplier: 'DiabCare Ltd', expiry: '2026-09-30', status: 'ok' },
            { id: '5', name: 'Amoxicillin 500mg', generic_name: 'Amoxicillin', category: 'Antibiotic', current_stock: 90, reorder_level: 400, unit_price: 12.0, supplier: 'BioMed Corp', expiry: '2025-08-10', status: 'critical' },
            { id: '6', name: 'Amlodipine 5mg', generic_name: 'Amlodipine', category: 'Antihypertensive', current_stock: 2800, reorder_level: 600, unit_price: 8.0, supplier: 'HeartWell', expiry: '2026-11-15', status: 'ok' },
            { id: '7', name: 'Omeprazole 20mg', generic_name: 'Omeprazole', category: 'Antacid', current_stock: 1900, reorder_level: 500, unit_price: 6.0, supplier: 'GutHealth Ltd', expiry: '2026-01-28', status: 'ok' },
            { id: '8', name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', category: 'Analgesic', current_stock: 320, reorder_level: 800, unit_price: 4.0, supplier: 'MedPharma Ltd', expiry: '2025-11-20', status: 'low' },
        ]);
    }, []);

    const categories = ['all', ...new Set(medicines.map(m => m.category))];
    const filtered = medicines
        .filter(m => filterCategory === 'all' || m.category === filterCategory)
        .filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.generic_name.toLowerCase().includes(search.toLowerCase()));

    const statusBadge = { ok: 'badge-success', low: 'badge-warning', critical: 'badge-danger' };
    const statusLabel = { ok: 'In Stock', low: 'Low Stock', critical: 'Critical' };

    const stockData = medicines.slice(0, 8).map(m => ({ name: m.name.split(' ')[0], stock: m.current_stock, reorder: m.reorder_level }));

    return (
        <div className="animate-fade">
            {/* Alerts */}
            {medicines.filter(m => m.status === 'critical').length > 0 && (
                <div className="alert-banner danger">
                    <AlertTriangle size={16} /> <strong>{medicines.filter(m => m.status === 'critical').length} medicines</strong> are critically low on stock!
                </div>
            )}

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="stat-card primary">
                    <div className="stat-icon primary"><Package size={22} /></div>
                    <div><div className="stat-value">{medicines.length}</div><div className="stat-label">Total Medicines</div></div>
                </div>
                <div className="stat-card success">
                    <div className="stat-icon success"><TrendingUp size={22} /></div>
                    <div><div className="stat-value">{medicines.filter(m => m.status === 'ok').length}</div><div className="stat-label">In Stock</div></div>
                </div>
                <div className="stat-card warning">
                    <div className="stat-icon warning"><TrendingDown size={22} /></div>
                    <div><div className="stat-value">{medicines.filter(m => m.status === 'low').length}</div><div className="stat-label">Low Stock</div></div>
                </div>
                <div className="stat-card danger">
                    <div className="stat-icon danger"><AlertTriangle size={22} /></div>
                    <div><div className="stat-value">{medicines.filter(m => m.status === 'critical').length}</div><div className="stat-label">Critical</div></div>
                </div>
            </div>

            {/* Chart */}
            <div className="chart-container mb-6">
                <div className="card-header">
                    <h3 className="card-title">Stock Levels vs Reorder Points</h3>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stockData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                        <Bar dataKey="stock" fill="#0D7377" name="Current Stock" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="reorder" fill="#F4A261" name="Reorder Level" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="search-box">
                        <Search />
                        <input className="input" placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 280 }} />
                    </div>
                    <select className="input" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ width: 180 }}>
                        {categories.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm"><Upload size={14} /> Import CSV</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Medicine</button>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Medicine</th><th>Category</th><th>Stock</th><th>Reorder Level</th>
                            <th>Unit Price</th><th>Supplier</th><th>Expiry</th><th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(m => (
                            <tr key={m.id}>
                                <td>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.generic_name}</div>
                                </td>
                                <td><span className="badge badge-neutral">{m.category}</span></td>
                                <td style={{ fontWeight: 600, color: m.current_stock <= m.reorder_level ? 'var(--danger)' : 'var(--text-primary)' }}>
                                    {m.current_stock.toLocaleString()}
                                </td>
                                <td>{m.reorder_level.toLocaleString()}</td>
                                <td>₹{m.unit_price.toFixed(2)}</td>
                                <td>{m.supplier}</td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={12} color="var(--text-muted)" />
                                        {new Date(m.expiry).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                    </div>
                                </td>
                                <td><span className={`badge ${statusBadge[m.status]} badge-dot`}>{statusLabel[m.status]}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
