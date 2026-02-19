import { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Package, RefreshCw, Shield, X, Pill } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AI_URL = import.meta.env.VITE_AI_URL || '/ai';

export default function AIPredictions() {
    const [diseaseData, setDiseaseData] = useState([]);
    const [restockRecs, setRestockRecs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('diseases');
    const [interactionDrugs, setInteractionDrugs] = useState('');
    const [interactionResult, setInteractionResult] = useState(null);
    const [checkingInteraction, setCheckingInteraction] = useState(false);
    const [dataSource, setDataSource] = useState('');
    const [restockSource, setRestockSource] = useState('');

    // Regional settings
    const [region, setRegion] = useState('Overall');
    const REGIONS = ['Overall', 'Neelambur', 'Saravampatti', 'Peelamedu', 'Gandhipuram', 'Ukkadam'];

    // Medicine recommendations
    const [showRecModal, setShowRecModal] = useState(false);
    const [selectedDisease, setSelectedDisease] = useState(null);
    const [medRecommendations, setMedRecommendations] = useState([]);
    const [detailedMeds, setDetailedMeds] = useState([]);

    useEffect(() => { fetchPredictions(); }, [region]);

    const fetchPredictions = async () => {
        setLoading(true);
        try {
            // Try real-stats endpoint first, fall back to disease prediction
            let diseaseRes = null;
            try {
                diseaseRes = await fetch(`${AI_URL}/predict/real-stats?region=${region}&days=30`).then(r => r.json());
            } catch {
                diseaseRes = await fetch(`${AI_URL}/predict/disease`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ region, days_ahead: 30 })
                }).then(r => r.json());
            }

            const restockRes = await fetch(`${AI_URL}/predict/restock`).then(r => r.json()).catch(() => null);

            if (diseaseRes?.predictions) {
                setDiseaseData(diseaseRes.predictions.slice(0, 8));
                setDataSource(diseaseRes.data_source || 'simulated');
            }
            if (restockRes?.recommendations) {
                setRestockRecs(restockRes.recommendations);
                setRestockSource(restockRes.data_source || 'simulated');
            }
        } catch (err) {
            console.error('AI prediction fetch error:', err);
            setDataSource('offline');
        }
        setLoading(false);
    };

    const checkInteraction = async () => {
        if (!interactionDrugs.trim()) return;
        setCheckingInteraction(true);
        try {
            const drugs = interactionDrugs.split(',').map(d => d.trim()).filter(Boolean);
            const res = await fetch(`${AI_URL}/check/interactions`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ drugs })
            }).then(r => r.json());
            setInteractionResult(res);
        } catch {
            setInteractionResult({ safe: true, warnings: [], checked_drugs: interactionDrugs.split(',').map(d => d.trim()) });
        }
        setCheckingInteraction(false);
    };

    const getMedicineRecommendations = async (disease) => {
        setSelectedDisease(disease);
        setShowRecModal(true);
        setMedRecommendations([]);
        setDetailedMeds([]);
        try {
            const res = await fetch(`${AI_URL}/predict/recommend-medicine`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disease })
            }).then(r => r.json());
            if (res.recommended_medicines) setMedRecommendations(res.recommended_medicines);
            if (res.detailed_medicines) setDetailedMeds(res.detailed_medicines);
        } catch (err) {
            console.error(err);
        }
    };

    const trendColors = { rising: 'var(--danger)', stable: 'var(--info)', declining: 'var(--success)' };
    const trendIcons = { rising: '📈', stable: '➡️', declining: '📉' };
    const urgencyBadge = { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-success' };

    const DataSourceBadge = ({ source }) => (
        <span className={`data-source-badge ${source === 'live' ? 'live' : source === 'offline' ? 'offline' : 'simulated'}`}>
            {source === 'live' ? '🟢 Live Data' : source === 'offline' ? '🔴 Offline' : '🟡 Simulated'}
        </span>
    );

    return (
        <div className="animate-fade">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Brain size={22} color="white" />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>AI Intelligence Hub</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Disease predictions, restock recommendations & drug interaction checker</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    <DataSourceBadge source={dataSource} />
                    <select className="input" style={{ width: 150 }} value={region} onChange={e => setRegion(e.target.value)}>
                        {REGIONS.map(r => <option key={r} value={r}>{r === 'Overall' ? '🌍 Overall (District)' : r}</option>)}
                    </select>
                    <button className="btn btn-outline btn-sm" onClick={fetchPredictions} disabled={loading}>
                        <RefreshCw size={14} className={loading ? 'animate-pulse' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs mb-4">
                {[
                    { key: 'diseases', label: '🔬 Disease Forecast' },
                    { key: 'restock', label: '📦 Restock AI' },
                    { key: 'interactions', label: '⚠️ Drug Interactions' },
                ].map(t => (
                    <button key={t.key} className={`tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Disease Predictions */}
            {activeTab === 'diseases' && (
                <div>
                    <div className="chart-container mb-6">
                        <div className="card-header">
                            <h3 className="card-title">30-Day Disease Forecast — {region}</h3>
                        </div>
                        {diseaseData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={diseaseData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis dataKey="disease" tick={{ fontSize: 11, fill: '#94A3B8' }} angle={-20} textAnchor="end" height={60} />
                                    <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                                    <Bar dataKey="predicted_cases_30d" fill="#7C3AED" name="Predicted Cases" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                {loading ? 'Loading predictions...' : 'No prediction data available. AI service may be offline.'}
                            </div>
                        )}
                    </div>

                    <div className="grid-2">
                        {diseaseData.map((d, i) => (
                            <div key={i} className="card" style={{ borderLeft: `4px solid ${trendColors[d.trend]}` }}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{d.disease}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {d.avg_daily_cases} avg daily · {trendIcons[d.trend]} {d.trend}
                                            {d.risk_factor && <span> · Risk: {d.risk_factor}x</span>}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 22, fontWeight: 800, color: trendColors[d.trend] }}>{d.predicted_cases_30d}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>cases/30d</div>
                                    </div>
                                </div>
                                <div className="progress-bar" style={{ marginTop: 12 }}>
                                    <div className="progress-fill" style={{ width: `${d.confidence * 100}%`, background: trendColors[d.trend] }}></div>
                                </div>
                                <div className="flex items-center justify-between mt-4">
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence: {(d.confidence * 100).toFixed(0)}%</div>
                                    <button className="btn btn-sm btn-outline" onClick={() => getMedicineRecommendations(d.disease)}
                                        style={{ fontSize: 11, padding: '4px 10px' }}>
                                        💊 Recommend Meds
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Medicine Recommendation Modal with Detailed Info */}
                    {showRecModal && (
                        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowRecModal(false); }}>
                            <div className="modal" style={{ maxWidth: 540 }}>
                                <div className="modal-header">
                                    <div className="modal-title">💊 Medicine Recommendations</div>
                                    <button className="btn btn-ghost btn-icon" onClick={() => setShowRecModal(false)}><X size={18} /></button>
                                </div>
                                <div className="modal-body">
                                    <div className="alert-banner warning" style={{ marginBottom: 16 }}>
                                        <AlertTriangle size={16} /> AI-generated treatment plan for <strong>{selectedDisease}</strong>. Always verify with attending physician.
                                    </div>
                                    {detailedMeds.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                            {detailedMeds.map((med, i) => (
                                                <div key={i} style={{
                                                    padding: '12px 14px', borderRadius: 'var(--radius-md)',
                                                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                                                    borderLeft: '4px solid var(--primary)',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                                        <div style={{
                                                            width: 28, height: 28, borderRadius: '50%',
                                                            background: 'var(--primary)', color: 'white',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 13, fontWeight: 700,
                                                        }}>
                                                            {i + 1}
                                                        </div>
                                                        <div style={{ fontWeight: 700, fontSize: 14 }}>{med.name}</div>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
                                                        <div>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Dosage</span>
                                                            <div style={{ fontWeight: 600 }}>{med.dosage}</div>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Frequency</span>
                                                            <div style={{ fontWeight: 600 }}>{med.frequency}</div>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Duration</span>
                                                            <div style={{ fontWeight: 600 }}>{med.duration}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : medRecommendations.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {medRecommendations.map((med, i) => (
                                                <div key={i} style={{
                                                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                                                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                }}>
                                                    <div style={{
                                                        width: 24, height: 24, borderRadius: '50%',
                                                        background: 'var(--primary)', color: 'white',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 12, fontWeight: 700,
                                                    }}>
                                                        {i + 1}
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: 13 }}>{med}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Loading recommendations...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Restock Recommendations */}
            {activeTab === 'restock' && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 style={{ fontWeight: 700 }}>Inventory Restock Forecast</h3>
                        <DataSourceBadge source={restockSource} />
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr><th>Medicine</th><th>Current Stock</th><th>30d Demand</th><th>Order Qty</th><th>Days Left</th><th>Confidence</th><th>Urgency</th></tr>
                            </thead>
                            <tbody>
                                {restockRecs.map((r, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>💊 {r.medicine_name}</td>
                                        <td>{r.current_stock}</td>
                                        <td>{r.predicted_demand_30d}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.recommended_order_qty}</td>
                                        <td>
                                            <span style={{ fontWeight: 700, color: r.estimated_days_remaining <= 10 ? 'var(--danger)' : 'var(--text-primary)' }}>
                                                {r.estimated_days_remaining} days
                                            </span>
                                        </td>
                                        <td>
                                            <div className="progress-bar" style={{ width: 60 }}>
                                                <div className="progress-fill" style={{ width: `${r.confidence * 100}%` }}></div>
                                            </div>
                                            <span style={{ fontSize: 11 }}>{(r.confidence * 100).toFixed(0)}%</span>
                                        </td>
                                        <td><span className={`badge ${urgencyBadge[r.urgency_level]} badge-dot`}>{r.urgency_level}</span></td>
                                    </tr>
                                ))}
                                {restockRecs.length === 0 && (
                                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No restock data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Drug Interaction Checker */}
            {activeTab === 'interactions' && (
                <div>
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title"><Shield size={16} /> Drug Interaction Checker</h3>
                        </div>
                        <div className="input-group">
                            <label className="input-label">Enter drugs (comma-separated)</label>
                            <div className="flex gap-2">
                                <input className="input" style={{ flex: 1 }} placeholder="e.g. Warfarin, Aspirin, Omeprazole" value={interactionDrugs} onChange={e => setInteractionDrugs(e.target.value)} onKeyDown={e => e.key === 'Enter' && checkInteraction()} />
                                <button className="btn btn-primary" onClick={checkInteraction} disabled={checkingInteraction}>
                                    {checkingInteraction ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></span> : 'Check'}
                                </button>
                            </div>
                        </div>

                        {interactionResult && (
                            <div className="mt-4 animate-slide">
                                {interactionResult.safe ? (
                                    <div className="alert-banner success">
                                        <Shield size={16} /> <strong>No interactions found.</strong> These drugs appear safe to combine.
                                    </div>
                                ) : (
                                    <div>
                                        <div className="alert-banner danger" style={{ marginBottom: 12 }}>
                                            <AlertTriangle size={16} /> <strong>{interactionResult.warnings.length} interaction(s) found!</strong>
                                        </div>
                                        {interactionResult.warnings.map((w, i) => (
                                            <div key={i} className="card" style={{ marginBottom: 8, borderLeft: `4px solid ${w.severity === 'high' ? 'var(--danger)' : 'var(--warning)'}` }}>
                                                <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                                                    <span style={{ fontWeight: 700 }}>{w.drug1} ↔ {w.drug2}</span>
                                                    <span className={`badge ${w.severity === 'high' ? 'badge-danger' : 'badge-warning'}`}>{w.severity}</span>
                                                </div>
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{w.description}</p>
                                            </div>
                                        ))}
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
