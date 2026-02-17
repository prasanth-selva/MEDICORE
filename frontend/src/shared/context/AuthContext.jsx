import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('medicore_token');
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
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('medicore_token', data.accessToken);
        localStorage.setItem('medicore_refresh_token', data.refreshToken);
        setUser(data.user);
        setProfile(data.profile);
        return data;
    };

    const register = async (userData) => {
        const { data } = await api.post('/auth/register', userData);
        localStorage.setItem('medicore_token', data.accessToken);
        localStorage.setItem('medicore_refresh_token', data.refreshToken);
        setUser(data.user);
        return data;
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        setProfile(null);
    };

    const value = { user, profile, loading, login, register, logout, loadProfile };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
