import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
    LayoutDashboard, Users, Stethoscope, Pill, ClipboardList, BarChart3,
    AlertTriangle, Settings, LogOut, Package, DollarSign, Brain,
    Calendar, FileText, MapPin, Bell, Activity, Wifi, WifiOff, Heart
} from 'lucide-react';

const NAV_CONFIG = {
    admin: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Package, label: 'Inventory', path: '/admin/inventory' },
        { icon: DollarSign, label: 'Billing', path: '/admin/billing' },
        { icon: Brain, label: 'AI Predictions', path: '/admin/predictions' },
    ],
    receptionist: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
        { icon: Package, label: 'Inventory', path: '/admin/inventory' },
        { icon: DollarSign, label: 'Billing', path: '/admin/billing' },
    ],
    doctor: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/doctor' },
        { icon: Stethoscope, label: 'Consultation', path: '/doctor/consultation' },
    ],
    pharmacist: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/pharmacy' },
        { icon: Package, label: 'Inventory', path: '/pharmacy/inventory' },
        { icon: DollarSign, label: 'Billing', path: '/pharmacy/billing' },
        { icon: Brain, label: 'AI Predictions', path: '/pharmacy/predictions' },
    ],
    patient: [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/patient' },
        { icon: Stethoscope, label: 'Find Doctors', path: '/patient/doctors' },
        { icon: FileText, label: 'My Records', path: '/patient/records' },
        { icon: AlertTriangle, label: 'SOS Emergency', path: '/patient/sos' },
    ],
};

const TITLES = { admin: 'Admin Portal', receptionist: 'Reception', doctor: 'Doctor Portal', pharmacist: 'Pharmacy Portal', patient: 'Patient Portal' };

export default function DashboardLayout() {
    const { user, logout } = useAuth();
    const { connected } = useSocket();
    const location = useLocation();
    const navigate = useNavigate();

    if (!user) return null;
    const navItems = NAV_CONFIG[user.role] || NAV_CONFIG.admin;

    const handleLogout = () => { logout(); navigate('/login'); };

    const getPageTitle = () => {
        const item = navItems.find(n => n.path === location.pathname);
        return item?.label || 'Dashboard';
    };

    return (
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Activity size={20} />
                    </div>
                    <div>
                        <div className="sidebar-title">MediCore</div>
                        <div className="sidebar-subtitle">{TITLES[user.role]}</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">Navigation</div>
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}>
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                        {connected ? <><Wifi size={12} color="#06A77D" /> <span style={{ color: '#06A77D' }}>Connected</span></> : <><WifiOff size={12} /> Offline</>}
                    </div>
                    <div className="user-info">
                        <div className="user-avatar">{user.name?.charAt(0)?.toUpperCase()}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                            <div className="user-role">{user.role}</div>
                        </div>
                        <button onClick={handleLogout} className="btn btn-ghost btn-icon" style={{ color: 'rgba(255,255,255,0.5)' }} title="Logout">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-bar">
                    <h1 className="top-bar-title">{getPageTitle()}</h1>
                    <div className="top-bar-actions">
                        <button className="btn btn-ghost btn-icon" title="Notifications">
                            <Bell size={18} />
                        </button>
                    </div>
                </header>
                <div className="page-content animate-fade">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
