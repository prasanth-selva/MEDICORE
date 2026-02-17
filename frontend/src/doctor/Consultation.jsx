import { useState } from 'react';
import { useAuth } from '../shared/context/AuthContext';
import { FileText, Clock, User } from 'lucide-react';

export default function Consultation() {
    const { user } = useAuth();

    return (
        <div className="animate-fade">
            <div className="card">
                <div className="empty-state">
                    <FileText size={48} />
                    <h3>Select a Patient</h3>
                    <p>Choose a patient from the queue on the Dashboard to start a consultation.</p>
                </div>
            </div>
        </div>
    );
}
