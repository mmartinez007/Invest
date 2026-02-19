import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Settings as SettingsIcon, Download, Shield, CreditCard, Globe, Trash2 } from 'lucide-react';

export default function Settings() {
    const { user, token, isPro, upgradeToPro, logout } = useAuth();
    const { currency, toggleCurrency } = useCurrency();

    const headers = { Authorization: `Bearer ${token}` };

    async function handleExport() {
        try {
            const res = await fetch('/api/subscription/export', { headers });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cryptovault_export_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const data = await res.json();
                alert(data.error || 'Export failed');
            }
        } catch {
            alert('Export failed');
        }
    }

    return (
        <div>
            <h2 className="page-title">Settings</h2>

            {/* Account */}
            <div className="card settings-section">
                <h3><SettingsIcon size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Account</h3>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <h4>Email</h4>
                        <p>{user?.email}</p>
                    </div>
                </div>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <h4>Member since</h4>
                        <p>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Currency */}
            <div className="card settings-section">
                <h3><Globe size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Base Currency</h3>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <h4>Display Currency</h4>
                        <p>All values will be converted and displayed in your selected currency</p>
                    </div>
                    <div className="currency-toggle">
                        <button className={currency === 'USD' ? 'active' : ''} onClick={() => currency !== 'USD' && toggleCurrency()}>
                            $ USD
                        </button>
                        <button className={currency === 'EUR' ? 'active' : ''} onClick={() => currency !== 'EUR' && toggleCurrency()}>
                            € EUR
                        </button>
                    </div>
                </div>
            </div>

            {/* Subscription */}
            <div className="card settings-section">
                <h3><CreditCard size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Subscription</h3>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <h4>Current Plan</h4>
                        <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isPro ? (
                                <><span className="pro-badge">PRO</span> Full access to all features</>
                            ) : (
                                <>Free — Basic dashboard with 1 portfolio</>
                            )}
                        </p>
                    </div>
                    {!isPro && (
                        <button className="btn btn-primary" onClick={upgradeToPro}>
                            Upgrade to Pro — $9.99/mo
                        </button>
                    )}
                </div>
                {!isPro && (
                    <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontWeight: 600, marginBottom: 'var(--spacing-sm)' }}>Pro includes:</div>
                        <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xs)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <li>✅ Unlimited portfolios</li>
                            <li>✅ Advanced analytics</li>
                            <li>✅ Sharpe & Sortino ratios</li>
                            <li>✅ Max drawdown tracking</li>
                            <li>✅ Risk concentration alerts</li>
                            <li>✅ Tax CSV export</li>
                            <li>✅ Custom alerts</li>
                            <li>✅ API sync (coming soon)</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Data */}
            <div className="card settings-section">
                <h3><Download size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Data & Privacy</h3>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <h4>Export Data (CSV)</h4>
                        <p>Download all your trades in CSV format for tax reporting</p>
                    </div>
                    <button className="btn btn-secondary btn-small" onClick={handleExport}>
                        <Download size={14} /> Export
                    </button>
                </div>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <h4>GDPR Compliance</h4>
                        <p>Your data is stored securely. Request deletion at any time.</p>
                    </div>
                    <button className="btn btn-secondary btn-small">
                        <Shield size={14} /> Privacy Policy
                    </button>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="card settings-section" style={{ borderColor: 'rgba(255, 71, 87, 0.3)' }}>
                <h3 style={{ color: 'var(--red-text)' }}>
                    <Trash2 size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Danger Zone
                </h3>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <h4>Sign Out</h4>
                        <p>Sign out of your account on this device</p>
                    </div>
                    <button className="btn btn-danger btn-small" onClick={logout}>
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
