import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { LayoutDashboard, BarChart3, Settings, LogOut, Zap, Globe, Star, Clock } from 'lucide-react';

const navItems = [
    { path: '/', label: 'Portfolio', icon: LayoutDashboard },
    { path: '/market', label: 'Market', icon: Globe },
    { path: '/watchlist', label: 'Watchlist', icon: Star },
    { path: '/transactions', label: 'History', icon: Clock },
    { path: '/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
    const { user, isPro, logout } = useAuth();
    const { currency, toggleCurrency } = useCurrency();
    const location = useLocation();
    const navigate = useNavigate();

    const initial = user?.email?.charAt(0).toUpperCase() || '?';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">⚡</div>
                <h1>CryptoVault</h1>
            </div>

            <nav className="sidebar-nav">
                {navItems.map(item => (
                    <button
                        key={item.path}
                        className={`sidebar-nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <item.icon size={20} />
                        {item.label}
                    </button>
                ))}

                <div style={{ flex: 1 }} />

                {/* Currency toggle */}
                <div style={{ padding: '8px 0' }}>
                    <div className="currency-toggle" style={{ width: '100%' }}>
                        <button
                            className={currency === 'USD' ? 'active' : ''}
                            onClick={() => currency !== 'USD' && toggleCurrency()}
                            style={{ flex: 1 }}
                        >
                            $ USD
                        </button>
                        <button
                            className={currency === 'EUR' ? 'active' : ''}
                            onClick={() => currency !== 'EUR' && toggleCurrency()}
                            style={{ flex: 1 }}
                        >
                            € EUR
                        </button>
                    </div>
                </div>

                {!isPro && (
                    <button
                        className="sidebar-nav-item"
                        onClick={() => navigate('/settings')}
                        style={{ background: 'rgba(108, 92, 231, 0.1)', color: 'var(--accent)', borderRadius: 'var(--radius-md)' }}
                    >
                        <Zap size={20} />
                        Upgrade to Pro
                    </button>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">{initial}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user?.email}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isPro ? <><span className="pro-badge">PRO</span></> : 'Free plan'}
                        </div>
                    </div>
                    <button className="btn-icon" onClick={logout} title="Sign out" style={{ width: '28px', height: '28px' }}>
                        <LogOut size={14} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
