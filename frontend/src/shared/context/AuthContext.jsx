import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

// Demo user profiles for offline mode (when backend is not running)
const DEMO_USERS = {
    'admin@medicore.com': { id: 'demo-admin', name: 'Admin MediCore', email: 'admin@medicore.com', role: 'admin', phone: '+91 9000000001' },
    'dr.sharma@medicore.com': { id: 'demo-doc', name: 'Dr. Arun Sharma', email: 'dr.sharma@medicore.com', role: 'doctor', phone: '+91 9000000002' },
    'pharmacy@medicore.com': { id: 'demo-pharma', name: 'Rahul Pharma', email: 'pharmacy@medicore.com', role: 'pharmacist', phone: '+91 9000000007' },
    'patient@medicore.com': { id: 'demo-patient', name: 'Ravi Kumar', email: 'patient@medicore.com', role: 'patient', phone: '+91 9000000010' },
    'reception@medicore.com': { id: 'demo-recept', name: 'Anita Reception', email: 'reception@medicore.com', role: 'receptionist', phone: '+91 9000000008' },
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('medicore_token');
        const demoUser = localStorage.getItem('medicore_demo_user');
        // Clear stale demo sessions — force re-login with real backend auth
        if (demoUser || token === 'demo-token') {
            localStorage.removeItem('medicore_demo_user');
            localStorage.removeItem('medicore_token');
            localStorage.removeItem('medicore_refresh_token');
            setLoading(false);
            return;
        }
        if (token) {
            loadProfile();
        } else {
            setLoading(false);
        }
    }, []);

    const loadProfile = async () => {
        try {
            const { data } = await api.get('/auth/profile');
            setUser(data.user);
            setProfile(data.profile);
        } catch (err) {
            localStorage.clear();
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        // Check if this is a demo email — if so, always fall back on error
        const isDemoEmail = !!DEMO_USERS[email];
        try {
            const { data } = await api.post('/auth/login', { email, password });
            localStorage.setItem('medicore_token', data.accessToken);
            localStorage.setItem('medicore_refresh_token', data.refreshToken);
            setUser(data.user);
            setProfile(data.profile);
            return data;
        } catch (err) {
            // Fall back to demo mode ONLY if backend is unreachable (network error)
            const isNetworkError = !err.response;
            if (isDemoEmail && isNetworkError) {
                return demoLogin(email);
            }
            throw err;
        }
    };

    const demoLogin = (email) => {
        const demoUser = DEMO_USERS[email];
        if (!demoUser) {
            throw { response: { data: { error: 'Demo user not found. Use one of the quick demo buttons.' } } };
        }
        localStorage.setItem('medicore_demo_user', JSON.stringify(demoUser));
        localStorage.setItem('medicore_token', 'demo-token');
        setUser(demoUser);
        return { user: demoUser };
    };

    const register = async (userData) => {
        try {
            const { data } = await api.post('/auth/register', userData);
            localStorage.setItem('medicore_token', data.accessToken);
            localStorage.setItem('medicore_refresh_token', data.refreshToken);
            setUser(data.user);
            return data;
        } catch (err) {
            if (!err.response || err.code === 'ERR_NETWORK') {
                // Demo registration
                const u = { id: `demo-${Date.now()}`, name: userData.name, email: userData.email, role: userData.role };
                localStorage.setItem('medicore_demo_user', JSON.stringify(u));
                setUser(u);
                return { user: u };
            }
            throw err;
        }
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        setProfile(null);
    };

    const value = { user, profile, loading, login, register, logout, loadProfile, demoLogin };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
