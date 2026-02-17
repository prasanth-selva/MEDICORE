import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('medicore_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
            try {
                const refreshToken = localStorage.getItem('medicore_refresh_token');
                if (refreshToken) {
                    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                    localStorage.setItem('medicore_token', data.accessToken);
                    localStorage.setItem('medicore_refresh_token', data.refreshToken);
                    error.config.headers.Authorization = `Bearer ${data.accessToken}`;
                    return api(error.config);
                }
            } catch (refreshError) {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
