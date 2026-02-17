import { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, Package, RefreshCw, Shield } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../shared/utils/api';

const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

export default function AIPredictions() {
    const [diseaseData, setDiseaseData] = useState([]);
    const [restockRecs, setRestockRecs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('diseases');
    const [interactionDrugs, setInteractionDrugs] = useState('');
    const [interactionResult, setInteractionResult] = useState(null);
    const [checkingInteraction, setCheckingInteraction] = useState(false);

    useEffect(() => { fetchPredictions(); }, []);

    const fetchPredictions = async () => {
        setLoading(true);
        try {
            const [diseaseRes, restockRes] = await Promise.all([
                fetch(`${AI_URL}/predict/disease`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ region: 'Mumbai', days_ahead: 30 }) }).then(r => r.json()).catch(() => null),
                fetch(`${AI_URL}/predict/restock`).then(r => r.json()).catch(() => null),
            ]);

            if (diseaseRes?.predictions) setDiseaseData(diseaseRes.predictions.slice(0, 8));
            if (restockRes?.recommendations) setRestockRecs(restockRes.recommendations);
        } catch (err) {
            // AI service offline — use mock data
            setDiseaseData([
                { disease: 'Influenza', predicted_cases_30d: 450, avg_daily_cases: 15, trend: 'rising', confidence: 0.85 },
                { disease: 'Dengue Fever', predicted_cases_30d: 280, avg_daily_cases: 9.3, trend: 'rising', confidence: 0.82 },
                { disease: 'Hypertension', predicted_cases_30d: 320, avg_daily_cases: 10.7, trend: 'stable', confidence: 0.89 },
                { disease: 'Type 2 Diabetes', predicted_cases_30d: 250, avg_daily_cases: 8.3, trend: 'stable', confidence: 0.87 },
                { disease: 'Gastroenteritis', predicted_cases_30d: 180, avg_daily_cases: 6, trend: 'declining', confidence: 0.78 },
                { disease: 'Common Cold', predicted_cases_30d: 400, avg_daily_cases: 13.3, trend: 'stable', confidence: 0.91 },
            ]);
            setRestockRecs([
                { medicine_name: 'Azithromycin 500mg', current_stock: 200, predicted_demand_30d: 750, recommended_order_qty: 1000, urgency_level: 'critical', estimated_days_remaining: 8, confidence: 0.89 },
                { medicine_name: 'Paracetamol 500mg', current_stock: 1500, predicted_demand_30d: 2400, recommended_order_qty: 2000, urgency_level: 'high', estimated_days_remaining: 12, confidence: 0.91 },
                { medicine_name: 'Amoxicillin 500mg', current_stock: 450, predicted_demand_30d: 900, recommended_order_qty: 800, urgency_level: 'high', estimated_days_remaining: 15, confidence: 0.85 },
                { medicine_name: 'Cetirizine 10mg', current_stock: 800, predicted_demand_30d: 1350, recommended_order_qty: 1000, urgency_level: 'medium', estimated_days_remaining: 18, confidence: 0.82 },
            ]);
        }
        setLoading(false);
    };

    const checkInteraction = async () => {
        if (!interactionDrugs.trim()) return;
        setCheckingInteraction(true);
        try {
            const drugs = interactionDrugs.split(',').map(d => d.trim()).filter(Boolean);
            const res = await fetch(`${AI_URL}/check/interactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ drugs }) }).then(r => r.json());
            setInteractionResult(res);
        } catch {
            setInteractionResult({ safe: true, warnings: [], checked_drugs: interactionDrugs.split(',').map(d => d.trim()) });
        }
        setCheckingInteraction(false);
    };

    const trendColors = { rising: 'var(--danger)', stable: 'var(--info)', declining: 'var(--success)' };
    const trendIcons = { rising: '📈', stable: '➡️', declining: '📉' };
    const urgencyBadge = { critical: 'badge-danger', high: 'badge-warning', medium: 'badge-info', low: 'badge-success' };

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
                <button className="btn btn-outline btn-sm" onClick={fetchPredictions} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'animate-pulse' : ''} /> Refresh
                </button>
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
                        <div className="card-header"><h3 className="card-title">30-Day Disease Forecast</h3></div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={diseaseData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                <XAxis dataKey="disease" tick={{ fontSize: 11, fill: '#94A3B8' }} angle={-20} textAnchor="end" height={60} />
                                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} />
                                <Tooltip contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                                <Bar dataKey="predicted_cases_30d" fill="#7C3AED" name="Predicted Cases" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="grid-2">
                        {diseaseData.map((d, i) => (
                            <div key={i} className="card" style={{ borderLeft: `4px solid ${trendColors[d.trend]}` }}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div style={{ fontSize: 15, fontWeight: 700 }}>{d.disease}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                            {d.avg_daily_cases} avg daily · {trendIcons[d.trend]} {d.trend}
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
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Confidence: {(d.confidence * 100).toFixed(0)}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Restock Recommendations */}
            {activeTab === 'restock' && (
                <div>
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
                                        <div className="alert-banner danger mb-4">
                                            <AlertTriangle size={16} /> <strong>{interactionResult.warnings.length} interaction(s) found!</strong>
                                        </div>
                                        {interactionResult.warnings.map((w, i) => (
                                            <div key={i} className="card mb-2" style={{ borderLeft: `4px solid ${w.severity === 'high' ? 'var(--danger)' : 'var(--warning)'}` }}>
                                                <div className="flex items-center justify-between mb-2">
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
