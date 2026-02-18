import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS = {
    admin: 'Admin',
    doctor: 'Doctor',
    pharmacy: 'Pharmacy',
    patient: 'Patient',
    inventory: 'Inventory',
    billing: 'Billing',
    predictions: 'AI Predictions',
    consultation: 'Consultation',
    doctors: 'Find Doctors',
    records: 'My Records',
    sos: 'SOS Emergency',
};

export default function Breadcrumbs() {
    const location = useLocation();
    const segments = location.pathname.split('/').filter(Boolean);

    if (segments.length <= 1) return null; // Don't show on root dashboards

    return (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link to="/" className="breadcrumb-item breadcrumb-home">
                <Home size={14} />
            </Link>
            {segments.map((segment, i) => {
                const path = '/' + segments.slice(0, i + 1).join('/');
                const isLast = i === segments.length - 1;
                const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

                return (
                    <span key={path} className="breadcrumb-segment">
                        <ChevronRight size={14} className="breadcrumb-separator" />
                        {isLast ? (
                            <span className="breadcrumb-item breadcrumb-current">{label}</span>
                        ) : (
                            <Link to={path} className="breadcrumb-item">{label}</Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
