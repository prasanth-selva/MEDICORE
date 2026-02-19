import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
            '/api': { target: process.env.PROXY_BACKEND || 'http://localhost:5000', changeOrigin: true },
            '/socket.io': { target: process.env.PROXY_BACKEND || 'http://localhost:5000', ws: true },
            '/ai': {
                target: process.env.PROXY_AI || 'http://localhost:8000',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/ai/, ''),
            },
        },
    },
});
