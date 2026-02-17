import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/context/AuthContext';
import { Heart, Shield, Brain, Activity, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('patient');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isLogin) {
                const data = await login(email, password);
                const routes = { admin: '/admin', receptionist: '/admin', doctor: '/doctor', pharmacist: '/pharmacy', patient: '/patient' };
                navigate(routes[data.user.role] || '/');
            } else {
                await register({ name, email, password, role });
                const routes = { admin: '/admin', doctor: '/doctor', pharmacist: '/pharmacy', patient: '/patient' };
                navigate(routes[role] || '/');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    // Demo login buttons
    const demoLogins = [
        { role: 'admin', label: 'Admin', email: 'admin@medicore.com', icon: '👑' },
        { role: 'doctor', label: 'Doctor', email: 'dr.sharma@medicore.com', icon: '🩺' },
        { role: 'pharmacist', label: 'Pharmacist', email: 'pharmacy@medicore.com', icon: '💊' },
        { role: 'patient', label: 'Patient', email: 'patient@medicore.com', icon: '👤' },
    ];

    return (
        <div className="login-page">
            {/* Floating elements */}
            <div style={{ position: 'absolute', top: '10%', left: '8%', opacity: 0.08 }}>
                <Heart size={120} color="white" />
            </div>
            <div style={{ position: 'absolute', bottom: '15%', right: '10%', opacity: 0.06 }}>
                <Brain size={140} color="white" />
            </div>
            <div style={{ position: 'absolute', top: '60%', left: '5%', opacity: 0.05 }}>
                <Shield size={100} color="white" />
            </div>

            <div className="login-card animate-slide">
                <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{
                        width: 56, height: 56, margin: '0 auto 12px',
                        background: 'linear-gradient(135deg, #0D7377, #06A77D)',
                        borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Activity size={28} color="white" />
                    </div>
                </div>
                <h1>MediCore HMS</h1>
                <p>AI-Powered Hospital Management System</p>

                {error && (
                    <div className="alert-banner danger" style={{ marginBottom: 16 }}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="input-group">
                            <label className="input-label">Full Name</label>
                            <input className="input" placeholder="Dr. Arun Sharma" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                    )}

                    <div className="input-group">
                        <label className="input-label">Email Address</label>
                        <input className="input" type="email" placeholder="doctor@medicore.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <input className="input" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={password}
                                onChange={e => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
                            <button type="button" onClick={() => setShowPw(!showPw)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {!isLogin && (
                        <div className="input-group">
                            <label className="input-label">Role</label>
                            <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                                <option value="patient">Patient</option>
                                <option value="doctor">Doctor</option>
                                <option value="pharmacist">Pharmacist</option>
                                <option value="receptionist">Receptionist</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    )}

                    <button className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 4 }} disabled={loading}>
                        {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></span> : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', margin: '20px 0 16px', position: 'relative' }}>
                    <div style={{ height: 1, background: 'var(--border)', position: 'absolute', width: '100%', top: '50%' }}></div>
                    <span style={{ background: 'white', padding: '0 12px', position: 'relative', fontSize: 12, color: 'var(--text-muted)' }}>
                        Quick Demo Login
                    </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {demoLogins.map(d => (
                        <button key={d.role} className="btn btn-outline btn-sm" style={{ justifyContent: 'center' }}
                            onClick={() => { setEmail(d.email); setPassword('admin123'); setIsLogin(true); }}>
                            <span>{d.icon}</span> {d.label}
                        </button>
                    ))}
                </div>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)', fontWeight: 600 }}>
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>
                </div>
            </div>
        </div>
    );
}
