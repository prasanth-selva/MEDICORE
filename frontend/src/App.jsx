import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/context/AuthContext';
import { SocketProvider } from './shared/context/SocketContext';
import Login from './pages/Login';
import DashboardLayout from './shared/components/DashboardLayout';
import AdminDashboard from './admin/Dashboard';
import DoctorDashboard from './doctor/Dashboard';
import DoctorConsultation from './doctor/Consultation';
import PharmacyDashboard from './pharmacy/Dashboard';
import PharmacyInventory from './pharmacy/Inventory';
import PatientDashboard from './patient/Dashboard';
import PatientDoctors from './patient/DoctorBoard';
import PatientRecords from './patient/MyRecords';
import PatientSOS from './patient/SOSEmergency';
import AIPredictions from './pharmacy/AIPredictions';
import Billing from './pharmacy/Billing';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div className="loading-container"><div className="spinner"></div><span>Loading MediCore...</span></div>;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function AppRoutes() {
    const { user } = useAuth();

    const getDefaultRoute = () => {
        if (!user) return '/login';
        switch (user.role) {
            case 'admin': case 'receptionist': return '/admin';
            case 'doctor': return '/doctor';
            case 'pharmacist': return '/pharmacy';
            case 'patient': return '/patient';
            default: return '/admin';
        }
    };

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />

            {/* Admin Portal */}
            <Route path="/admin" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="inventory" element={<PharmacyInventory />} />
                <Route path="billing" element={<Billing />} />
                <Route path="predictions" element={<AIPredictions />} />
            </Route>

            {/* Doctor Portal */}
            <Route path="/doctor" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<DoctorDashboard />} />
                <Route path="consultation" element={<DoctorConsultation />} />
                <Route path="consultation/:patientId" element={<DoctorConsultation />} />
            </Route>

            {/* Pharmacy Portal */}
            <Route path="/pharmacy" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<PharmacyDashboard />} />
                <Route path="inventory" element={<PharmacyInventory />} />
                <Route path="billing" element={<Billing />} />
                <Route path="predictions" element={<AIPredictions />} />
            </Route>

            {/* Patient Portal */}
            <Route path="/patient" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route index element={<PatientDashboard />} />
                <Route path="doctors" element={<PatientDoctors />} />
                <Route path="records" element={<PatientRecords />} />
                <Route path="sos" element={<PatientSOS />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <SocketProvider>
                <AppRoutes />
            </SocketProvider>
        </AuthProvider>
    );
}
