import { useState, useEffect, useRef } from 'react';
import { Package, AlertTriangle, Search, Plus, Upload, TrendingDown, TrendingUp, Calendar, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../shared/utils/api';

export default function Inventory() {
    const [medicines, setMedicines] = useState([]);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showImportCSV, setShowImportCSV] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const fileInputRef = useRef(null);

    // Add medicine form
    const [medForm, setMedForm] = useState({
        name: '', generic_name: '', category: '', manufacturer: '',
        unit_price: '', reorder_point: '', current_stock: '', unit: 'tablets',
    });
    const [formMsg, setFormMsg] = useState('');

    const loadMedicines = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventory/medicines');
            const meds = res.data || [];
            setMedicines(meds.map(m => ({
                ...m,
                reorder_level: m.reorder_point || m.reorder_level || 0,
                status: (m.current_stock || 0) <= (m.reorder_point || m.reorder_level || 100) * 0.25 ? 'critical'
                    : (m.current_stock || 0) <= (m.reorder_point || m.reorder_level || 100) ? 'low' : 'ok',
            })));
        } catch (err) {
            console.error('Inventory load error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadMedicines(); }, []);

    const handleAddMedicine = async (e) => {
        e.preventDefault();
        setFormMsg('');
        try {
            await api.post('/inventory/medicines', {
                ...medForm,
                unit_price: parseFloat(medForm.unit_price) || 0,
                reorder_point: parseInt(medForm.reorder_point) || 100,
                current_stock: parseInt(medForm.current_stock) || 0,
            });
            setFormMsg('✅ Medicine added successfully!');
            loadMedicines();
            setTimeout(() => { setShowAddModal(false); setFormMsg(''); }, 1500);
            setMedForm({ name: '', generic_name: '', category: '', manufacturer: '', unit_price: '', reorder_point: '', current_stock: '', unit: 'tablets' });
        } catch (err) {
            setFormMsg(`❌ ${err.response?.data?.error || 'Failed to add medicine'}`);
        }
    };

    const handleCSVImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImportLoading(true);
        setImportResult(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const { data } = await api.post('/inventory/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportResult(data);
            loadMedicines();
        } catch (err) {
            setImportResult({ error: err.response?.data?.error || 'Import failed' });
        } finally {
            setImportLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const categories = ['all', ...new Set(medicines.map(m => m.category).filter(Boolean))];
    const filtered = medicines
        .filter(m => filterCategory === 'all' || m.category === filterCategory)
        .filter(m => (m.name || '').toLowerCase().includes(search.toLowerCase()) || (m.generic_name || '').toLowerCase().includes(search.toLowerCase()));

    const statusBadge = { ok: 'badge-success', low: 'badge-warning', critical: 'badge-danger' };
    const statusLabel = { ok: 'In Stock', low: 'Low Stock', critical: 'Critical' };

    const stockData = filtered.slice(0, 8).map(m => ({
        name: (m.name || '').split(' ')[0],
        stock: m.current_stock || 0,
        reorder: m.reorder_level || 0,
    }));

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
            {stockData.length > 0 && (
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
            )}

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
                    <button className="btn btn-outline btn-sm" onClick={() => { setShowImportCSV(true); setImportResult(null); }}>
                        <Upload size={14} /> Import CSV
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}><Plus size={14} /> Add Medicine</button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading inventory...</div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Medicine</th><th>Category</th><th>Stock</th><th>Reorder Level</th>
                                <th>Unit Price</th><th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No medicines found</td></tr>
                            ) : filtered.map(m => (
                                <tr key={m.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.generic_name}</div>
                                    </td>
                                    <td><span className="badge badge-neutral">{m.category || 'General'}</span></td>
                                    <td style={{ fontWeight: 600, color: (m.current_stock || 0) <= (m.reorder_level || 0) ? 'var(--danger)' : 'var(--text-primary)' }}>
                                        {(m.current_stock || 0).toLocaleString()}
                                    </td>
                                    <td>{(m.reorder_level || 0).toLocaleString()}</td>
                                    <td>₹{(m.unit_price || 0).toFixed(2)}</td>
                                    <td><span className={`badge ${statusBadge[m.status]} badge-dot`}>{statusLabel[m.status]}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Medicine Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3><Plus size={18} /> Add Medicine</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowAddModal(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddMedicine}>
                            {formMsg && <div className={`alert-banner ${formMsg.startsWith('✅') ? 'success' : 'danger'}`} style={{ marginBottom: 12 }}>{formMsg}</div>}
                            <div className="form-grid-2">
                                <div className="form-group">
                                    <label>Medicine Name *</label>
                                    <input className="form-input" required value={medForm.name} onChange={e => setMedForm(p => ({ ...p, name: e.target.value }))} placeholder="Paracetamol 500mg" />
                                </div>
                                <div className="form-group">
                                    <label>Generic Name</label>
                                    <input className="form-input" value={medForm.generic_name} onChange={e => setMedForm(p => ({ ...p, generic_name: e.target.value }))} placeholder="Acetaminophen" />
                                </div>
                                <div className="form-group">
                                    <label>Category</label>
                                    <input className="form-input" value={medForm.category} onChange={e => setMedForm(p => ({ ...p, category: e.target.value }))} placeholder="Analgesic" />
                                </div>
                                <div className="form-group">
                                    <label>Manufacturer</label>
                                    <input className="form-input" value={medForm.manufacturer} onChange={e => setMedForm(p => ({ ...p, manufacturer: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Unit Price (₹)</label>
                                    <input className="form-input" type="number" step="0.01" value={medForm.unit_price} onChange={e => setMedForm(p => ({ ...p, unit_price: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Current Stock</label>
                                    <input className="form-input" type="number" value={medForm.current_stock} onChange={e => setMedForm(p => ({ ...p, current_stock: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label>Reorder Point</label>
                                    <input className="form-input" type="number" value={medForm.reorder_point} onChange={e => setMedForm(p => ({ ...p, reorder_point: e.target.value }))} placeholder="100" />
                                </div>
                                <div className="form-group">
                                    <label>Unit</label>
                                    <select className="form-input" value={medForm.unit} onChange={e => setMedForm(p => ({ ...p, unit: e.target.value }))}>
                                        <option value="tablets">Tablets</option>
                                        <option value="capsules">Capsules</option>
                                        <option value="ml">ML</option>
                                        <option value="vials">Vials</option>
                                        <option value="strips">Strips</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Medicine</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CSV Import Modal */}
            {showImportCSV && (
                <div className="modal-overlay" onClick={() => setShowImportCSV(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
                        <div className="modal-header">
                            <h3><Upload size={18} /> Import Medicines CSV</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowImportCSV(false)}><X size={18} /></button>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <h4 style={{ marginBottom: 8, fontSize: 13 }}>CSV Format Required:</h4>
                            <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 12, fontSize: 12, fontFamily: 'monospace', overflowX: 'auto' }}>
                                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Header row:</div>
                                <div>name,generic_name,category,manufacturer,unit_price,reorder_point,current_stock,unit</div>
                                <div style={{ color: 'var(--text-muted)', marginTop: 8, marginBottom: 4 }}>Example:</div>
                                <div>Paracetamol 500mg,Acetaminophen,Analgesic,Cipla,5.50,100,5000,tablets</div>
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVImport} className="form-input" disabled={importLoading} />
                        {importLoading && <div style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>Importing...</div>}
                        {importResult && (
                            <div style={{ marginTop: 12 }}>
                                {importResult.error ? (
                                    <div className="alert-banner danger">{importResult.error}</div>
                                ) : (
                                    <div className="alert-banner success">
                                        ✅ Imported {importResult.imported} of {importResult.total} medicines
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
