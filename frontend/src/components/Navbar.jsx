import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Navbar() {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        api.changes.getPendingCount()
            .then(data => setPendingCount(data.count || 0))
            .catch(() => { });
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <nav className="navbar">
            <div className="container navbar-content">
                <span className="navbar-brand">📍 Bilgi Doğrulama</span>
                <div className="navbar-nav">
                    <NavLink to="/admin/dashboard" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Kişiler
                    </NavLink>
                    <NavLink to="/admin/changes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Değişiklikler
                        {pendingCount > 0 && <span className="nav-badge">{pendingCount}</span>}
                    </NavLink>
                    <NavLink to="/admin/import" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        İçe Aktar
                    </NavLink>
                    <NavLink to="/admin/definitions" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        Tanımlar
                    </NavLink>
                    <button onClick={handleLogout} className="btn btn-secondary btn-sm">
                        Çıkış
                    </button>
                </div>
            </div>
        </nav>
    );
}
