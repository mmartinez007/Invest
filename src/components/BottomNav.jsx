import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Globe, Star, BarChart3, Settings, Clock } from 'lucide-react';

const navItems = [
    { path: '/', label: 'Portfolio', icon: LayoutDashboard },
    { path: '/market', label: 'Market', icon: Globe },
    { path: '/watchlist', label: 'Watchlist', icon: Star },
    { path: '/transactions', label: 'History', icon: Clock },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <div className="bottom-nav">
            <div className="bottom-nav-items">
                {navItems.map(item => (
                    <button
                        key={item.path}
                        className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <item.icon size={20} />
                        {item.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
