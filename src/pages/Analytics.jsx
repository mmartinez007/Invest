import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import MetricCard from '../components/MetricCard';
import PortfolioChart from '../components/PortfolioChart';
import SubscriptionBanner from '../components/SubscriptionBanner';
import { BarChart3, AlertTriangle, TrendingUp, Shield } from 'lucide-react';
import { API_DOMAIN } from '../config';

export default function Analytics() {
    const { token, isPro } = useAuth();
    const { formatValue, convert, symbol, currency } = useCurrency();
    const [analytics, setAnalytics] = useState(null);
    const [portfolioId, setPortfolioId] = useState(null);
    const [loading, setLoading] = useState(true);

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        loadPortfolio();
    }, []);

    async function loadPortfolio() {
        try {
            const res = await fetch(`${API_DOMAIN}/api/portfolios`, { headers });
            if (res.ok) {
                const data = await res.json();
                if (data.length > 0) {
                    setPortfolioId(data[0].id);
                    loadAnalytics(data[0].id);
                } else {
                    setLoading(false);
                }
            }
        } catch {
            setLoading(false);
        }
    }

    async function loadAnalytics(pid) {
        setLoading(true);
        try {
            const res = await fetch(`${API_DOMAIN}/api/analytics/${pid}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch {
            console.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div className="loading-spinner"><div className="spinner" /></div>;
    }

    if (!analytics || !analytics.metrics.num_trades) {
        return (
            <div>
                <h2 className="page-title">Analytics</h2>
                <div className="empty-state">
                    <BarChart3 size={48} />
                    <h3>No data yet</h3>
                    <p>Add trades to your portfolio to see analytics and risk metrics</p>
                </div>
            </div>
        );
    }

    const m = analytics.metrics;

    return (
        <div>
            <h2 className="page-title">Analytics & Risk</h2>

            {!isPro && <SubscriptionBanner />}

            {/* Basic Metrics */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Portfolio Metrics
                </h3>
                <div className="metrics-grid">
                    <MetricCard
                        label="Total Invested"
                        value={formatValue(m.total_invested)}
                    />
                    <MetricCard
                        label="Realized P&L"
                        value={`${m.realized_pnl >= 0 ? '+' : ''}${formatValue(m.realized_pnl)}`}
                        positive={m.realized_pnl >= 0}
                    />
                    <MetricCard
                        label="Total Fees"
                        value={formatValue(m.total_fees)}
                        subtitle="Cumulative trading fees"
                    />
                    <MetricCard
                        label="Total Trades"
                        value={m.num_trades}
                    />
                    <MetricCard
                        label="Active Assets"
                        value={m.holdings_count}
                    />
                    <MetricCard
                        label="First Trade"
                        value={m.first_trade_date ? new Date(m.first_trade_date).toLocaleDateString() : 'N/A'}
                    />
                </div>
            </div>

            {/* Advanced Metrics (Pro) */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Shield size={16} /> Risk Metrics
                    {!isPro && <span className="pro-badge">PRO</span>}
                </h3>
                <div className={!isPro ? 'pro-locked' : ''}>
                    <div className="metrics-grid">
                        <MetricCard
                            label="Sharpe Ratio"
                            value={m.sharpe_ratio !== undefined ? m.sharpe_ratio.toFixed(3) : '—'}
                            subtitle="Risk-adjusted return"
                        />
                        <MetricCard
                            label="Sortino Ratio"
                            value={m.sortino_ratio !== undefined ? m.sortino_ratio.toFixed(3) : '—'}
                            subtitle="Downside risk-adjusted"
                        />
                        <MetricCard
                            label="Max Drawdown"
                            value={m.max_drawdown !== undefined ? `${(m.max_drawdown * 100).toFixed(1)}%` : '—'}
                            positive={false}
                            subtitle="Largest peak-to-trough"
                        />
                        <MetricCard
                            label="Annualized Volatility"
                            value={m.volatility_annual !== undefined ? `${(m.volatility_annual * 100).toFixed(1)}%` : '—'}
                            subtitle="Daily returns std dev × √365"
                        />
                        <MetricCard
                            label="Avg Daily Return"
                            value={m.avg_daily_return !== undefined ? `${(m.avg_daily_return * 100).toFixed(4)}%` : '—'}
                        />
                        <MetricCard
                            label="Concentration Risk"
                            value={m.concentration_risk || '—'}
                            subtitle={m.concentration_index !== undefined ? `HHI: ${m.concentration_index.toFixed(3)}` : ''}
                            positive={m.concentration_risk === 'LOW'}
                        />
                    </div>
                </div>
            </div>

            {/* Equity Curve */}
            {analytics.equity_curve && analytics.equity_curve.length > 1 && (
                <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card-header">
                        <span className="card-title">Equity Curve</span>
                    </div>
                    <div className="chart-container">
                        <PortfolioChart
                            data={analytics.equity_curve}
                            currency={currency}
                            symbol={symbol}
                            convert={convert}
                        />
                    </div>
                </div>
            )}

            {/* Written Analysis */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TrendingUp size={16} /> Automatic Analysis
                    </span>
                </div>
                <div className="analysis-summary">
                    {analytics.summary || 'Add more trades and price history to generate insights.'}
                </div>
            </div>
        </div>
    );
}
