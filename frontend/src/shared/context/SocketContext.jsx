import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function SocketProvider({ children }) {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const s = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });

        s.on('connect', () => {
            setConnected(true);
            // Join role-based rooms
            const rooms = [];
            if (user.role === 'doctor') rooms.push('doctors');
            if (user.role === 'pharmacist') rooms.push('pharmacy');
            if (user.role === 'patient') rooms.push('patients');
            if (user.role === 'admin') rooms.push('admin');
            if (user.role === 'receptionist') rooms.push('reception', 'admin');
            rooms.forEach(room => s.emit('JOIN_ROOM', room));
            s.emit('JOIN_ROOM', `user_${user.id}`);
        });

        s.on('disconnect', () => setConnected(false));

        setSocket(s);
        return () => { s.disconnect(); };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
}

export const useSocket = () => useContext(SocketContext);
