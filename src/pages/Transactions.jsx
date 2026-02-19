import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { Clock, Trash2, ArrowUpRight, ArrowDownRight, Filter } from 'lucide-react';
import { API_DOMAIN } from '../config';

export default function Transactions() {
    const { token } = useAuth();
    const { formatValue } = useCurrency();
    const toast = useToast();
    const [orders, setOrders] = useState([]);
    const [portfolioId, setPortfolioId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | buy | sell

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
                    loadOrders(data[0].id);
                } else {
                    setLoading(false);
                }
            }
        } catch {
            setLoading(false);
        }
    }

    async function loadOrders(pid) {
        setLoading(true);
        try {
            const res = await fetch(`${API_DOMAIN}/api/orders/${pid}`, { headers });
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch {
            console.error('Failed to load orders');
        } finally {
            setLoading(false);
        }
    }

    async function deleteOrder(orderId) {
        if (!confirm('Delete this transaction?')) return;
        try {
            const res = await fetch(`${API_DOMAIN}/api/orders/${portfolioId}/${orderId}`, {
                method: 'DELETE',
                headers
            });
            if (res.ok) {
                setOrders(prev => prev.filter(o => o.id !== orderId));
                toast.success('Transaction deleted');
            }
        } catch {
            toast.error('Failed to delete transaction');
        }
    }

    const filtered = filter === 'all' ? orders : orders.filter(o => o.type === filter);

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-left">
                    <h2>Transaction History</h2>
                    <p>{orders.length} transactions total</p>
                </div>
                <div className="dashboard-actions">
                    <div className="market-tabs" style={{ padding: '2px' }}>
                        {['all', 'buy', 'sell'].map(f => (
                            <button
                                key={f}
                                className={`market-tab ${filter === f ? 'active' : ''}`}
                                onClick={() => setFilter(f)}
                                style={{ padding: '6px 14px' }}
                            >
                                {f === 'all' ? 'All' : f === 'buy' ? 'Buys' : 'Sells'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Clock size={48} />
                        <h3>No transactions yet</h3>
                        <p>Add your first trade from the Portfolio tab</p>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="transaction-list">
                        {filtered.map(order => {
                            const total = order.quantity * order.price_usd;
                            const isBuy = order.type === 'buy';
                            return (
                                <div key={order.id} className="transaction-row">
                                    <div className={`transaction-type-icon ${isBuy ? 'buy' : 'sell'}`}>
                                        {isBuy ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
                                    </div>
                                    <div className="transaction-info">
                                        <div className="transaction-primary">
                                            <span className="transaction-coin">
                                                {order.coin_name || order.coin_symbol.toUpperCase()}
                                            </span>
                                            <span className={`transaction-type-badge ${isBuy ? 'buy' : 'sell'}`}>
                                                {isBuy ? 'BUY' : 'SELL'}
                                            </span>
                                        </div>
                                        <div className="transaction-secondary">
                                            <span>{order.quantity.toFixed(6)} {order.coin_symbol.toUpperCase()}</span>
                                            <span>@ {formatValue(order.price_usd)}</span>
                                            {order.fee_usd > 0 && <span>Fee: {formatValue(order.fee_usd)}</span>}
                                        </div>
                                    </div>
                                    <div className="transaction-values">
                                        <div className={`transaction-total ${isBuy ? 'negative' : 'positive'}`}>
                                            {isBuy ? '-' : '+'}{formatValue(total)}
                                        </div>
                                        <div className="transaction-date">
                                            {new Date(order.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <button
                                        className="btn-icon transaction-delete"
                                        onClick={() => deleteOrder(order.id)}
                                        title="Delete transaction"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
