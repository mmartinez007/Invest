import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { usePrices } from '../context/PriceContext';
import { useToast } from '../context/ToastContext';
import PortfolioChart from '../components/PortfolioChart';
import AssetRow from '../components/AssetRow';
import AddOrderModal from '../components/AddOrderModal';
import SubscriptionBanner from '../components/SubscriptionBanner';
import AllocationChart from '../components/AllocationChart';
import { Plus, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

export default function Dashboard() {
    const { user, token, isPro } = useAuth();
    const { formatValue, convert, symbol, currency } = useCurrency();
    const { fetchPrices, getPrice, get24hChange, subscribe } = usePrices();
    const toast = useToast();

    const [portfolios, setPortfolios] = useState([]);
    const [activePortfolio, setActivePortfolio] = useState(null);
    const [holdings, setHoldings] = useState([]);
    const [showAddOrder, setShowAddOrder] = useState(false);
    const [viewMode, setViewMode] = useState('simple');
    const [loading, setLoading] = useState(true);
    const [equityCurve, setEquityCurve] = useState([]);

    const headers = { Authorization: `Bearer ${token}` };

    // Load portfolios
    useEffect(() => {
        loadPortfolios();
    }, []);

    async function loadPortfolios() {
        try {
            const res = await fetch('/api/portfolios', { headers });
            if (res.ok) {
                const data = await res.json();
                setPortfolios(data);
                if (data.length > 0 && !activePortfolio) {
                    setActivePortfolio(data[0]);
                }
            }
        } catch {
            console.error('Failed to load portfolios');
        }
    }

    // Load holdings when portfolio changes
    useEffect(() => {
        if (activePortfolio) {
            loadHoldings();
            loadEquityCurve();
        }
    }, [activePortfolio?.id]);

    async function loadHoldings() {
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${activePortfolio.id}/holdings`, { headers });
            if (res.ok) {
                const data = await res.json();
                setHoldings(data);
                // Fetch prices for all held coins
                const coinIds = data.map(h => h.coin_id);
                if (coinIds.length > 0) {
                    await fetchPrices(coinIds);
                    subscribe(coinIds);
                }
            }
        } catch {
            console.error('Failed to load holdings');
        } finally {
            setLoading(false);
        }
    }

    async function loadEquityCurve() {
        try {
            const res = await fetch(`/api/analytics/${activePortfolio.id}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setEquityCurve(data.equity_curve || []);
            }
        } catch {
            // ignore
        }
    }

    // Calculate portfolio totals
    const portfolioValue = holdings.reduce((sum, h) => {
        const price = getPrice(h.coin_id);
        return sum + h.quantity * price;
    }, 0);

    const totalCost = holdings.reduce((sum, h) => sum + h.total_cost, 0);
    const unrealizedPnl = portfolioValue - totalCost;
    const unrealizedPnlPct = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

    // Weighted 24h change
    const weighted24hChange = portfolioValue > 0
        ? holdings.reduce((sum, h) => {
            const price = getPrice(h.coin_id);
            const value = h.quantity * price;
            const change = get24hChange(h.coin_id);
            return sum + (value / portfolioValue) * change;
        }, 0)
        : 0;

    // Save snapshot
    useEffect(() => {
        if (activePortfolio && portfolioValue > 0) {
            fetch(`/api/analytics/${activePortfolio.id}/snapshot`, {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ total_value_usd: portfolioValue }),
            }).catch(() => { });
        }
    }, [activePortfolio?.id, Math.floor(portfolioValue)]);

    function handleOrderAdded() {
        setShowAddOrder(false);
        loadHoldings();
        toast.success('Trade added successfully!');
    }

    const handleRefresh = useCallback(async () => {
        const coinIds = holdings.map(h => h.coin_id);
        if (coinIds.length > 0) {
            await fetchPrices(coinIds);
            toast.info('Prices updated');
        }
    }, [holdings, fetchPrices]);

    return (
        <div>
            {/* Dashboard Header */}
            <div className="dashboard-header">
                <div className="dashboard-header-left">
                    <h2>{activePortfolio?.name || 'Portfolio'}</h2>
                    <p>Track your crypto investments in real time</p>
                </div>
                <div className="dashboard-actions">
                    <div className="mode-toggle">
                        <button
                            className={viewMode === 'simple' ? 'active' : ''}
                            onClick={() => setViewMode('simple')}
                        >
                            Simple
                        </button>
                        <button
                            className={viewMode === 'advanced' ? 'active' : ''}
                            onClick={() => setViewMode('advanced')}
                        >
                            Advanced
                        </button>
                    </div>
                    <button className="btn-icon" onClick={handleRefresh} title="Refresh prices">
                        <RefreshCw size={16} />
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddOrder(true)}>
                        <Plus size={16} /> Add Trade
                    </button>
                </div>
            </div>

            {/* Total Portfolio Value */}
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="card-header">
                    <span className="card-title">Total Portfolio Value</span>
                    <span className={`value-change ${weighted24hChange >= 0 ? 'positive' : 'negative'}`}>
                        {weighted24hChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {weighted24hChange >= 0 ? '+' : ''}{weighted24hChange.toFixed(2)}% (24h)
                    </span>
                </div>
                <div className="value-large">{formatValue(portfolioValue)}</div>
                <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        Invested: {formatValue(totalCost)}
                    </span>
                    <span className={`asset-pnl ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`} style={{ fontSize: '0.85rem' }}>
                        P&L: {unrealizedPnl >= 0 ? '+' : ''}{formatValue(unrealizedPnl)} ({unrealizedPnlPct >= 0 ? '+' : ''}{unrealizedPnlPct.toFixed(2)}%)
                    </span>
                </div>
            </div>

            {!isPro && <SubscriptionBanner />}

            {/* Chart + Holdings Grid */}
            <div className="dashboard-grid">
                {/* Chart */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Portfolio Performance</span>
                    </div>
                    <div className="chart-container">
                        <PortfolioChart
                            data={equityCurve.length > 0 ? equityCurve : [{ date: new Date().toISOString().split('T')[0], value: portfolioValue }]}
                            currency={currency}
                            symbol={symbol}
                            convert={convert}
                        />
                    </div>
                </div>

                {/* Holdings */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Holdings ({holdings.length})</span>
                    </div>
                    {loading ? (
                        <div className="loading-spinner"><div className="spinner" /></div>
                    ) : holdings.length === 0 ? (
                        <div className="empty-state">
                            <TrendingUp size={48} />
                            <h3>No holdings yet</h3>
                            <p>Add your first trade to start tracking your portfolio</p>
                            <button className="btn btn-primary" onClick={() => setShowAddOrder(true)}>
                                <Plus size={16} /> Add Trade
                            </button>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'advanced' && (
                                <div className="asset-row-header">
                                    <div style={{ width: '36px' }}></div>
                                    <div style={{ flex: 1, minWidth: '100px' }}>Asset</div>
                                    <div className="asset-col-header">Price</div>
                                    <div className="asset-col-header">Avg Cost</div>
                                    <div className="asset-col-header">Value</div>
                                    <div className="asset-col-header">P&L</div>
                                    <div className="asset-col-header">Alloc.</div>
                                </div>
                            )}
                            <div className="asset-list">
                                {holdings.map(holding => (
                                    <AssetRow
                                        key={holding.coin_id}
                                        holding={holding}
                                        portfolioValue={portfolioValue}
                                        viewMode={viewMode}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Advanced: extra metrics summary (simple inline) */}
            {viewMode === 'advanced' && holdings.length > 0 && (
                <div className="dashboard-grid">
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Quick Stats</span>
                        </div>
                        <div className="metrics-grid">
                            <div className="metric-card">
                                <div className="metric-label">Total Invested</div>
                                <div className="metric-value">{formatValue(totalCost)}</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Current Value</div>
                                <div className="metric-value">{formatValue(portfolioValue)}</div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Unrealized P&L</div>
                                <div className={`metric-value ${unrealizedPnl >= 0 ? 'positive' : 'negative'}`}>
                                    {unrealizedPnl >= 0 ? '+' : ''}{formatValue(unrealizedPnl)}
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">ROI</div>
                                <div className={`metric-value ${unrealizedPnlPct >= 0 ? 'positive' : 'negative'}`}>
                                    {unrealizedPnlPct >= 0 ? '+' : ''}{unrealizedPnlPct.toFixed(2)}%
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">Allocation</span>
                        </div>
                        <AllocationChart
                            holdings={holdings}
                            getPrice={getPrice}
                            portfolioValue={portfolioValue}
                            formatValue={formatValue}
                        />
                    </div>
                </div>
            )}

            {/* Add Order Modal */}
            {showAddOrder && activePortfolio && (
                <AddOrderModal
                    portfolioId={activePortfolio.id}
                    onClose={() => setShowAddOrder(false)}
                    onSuccess={handleOrderAdded}
                />
            )}
        </div>
    );
}
