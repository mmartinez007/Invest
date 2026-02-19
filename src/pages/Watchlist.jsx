import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { usePrices } from '../context/PriceContext';
import { Star, Trash2, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import CoinDetail from '../components/CoinDetail';

export default function Watchlist() {
    const { token } = useAuth();
    const { formatValue } = useCurrency();
    const { fetchPrices, getPrice, get24hChange } = usePrices();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCoin, setSelectedCoin] = useState(null);

    useEffect(() => {
        loadWatchlist();
    }, []);

    async function loadWatchlist() {
        setLoading(true);
        try {
            const res = await fetch('/api/watchlist', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
                // Fetch prices for watchlist coins
                const coinIds = data.map(i => i.coin_id);
                if (coinIds.length > 0) {
                    await fetchPrices(coinIds);
                }
            }
        } catch (err) {
            console.error('Watchlist error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function removeFromWatchlist(coinId) {
        await fetch(`/api/watchlist/${coinId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        setItems(prev => prev.filter(i => i.coin_id !== coinId));
    }

    return (
        <div>
            <div className="dashboard-header">
                <div className="dashboard-header-left">
                    <h2>Watchlist</h2>
                    <p>Track your favorite cryptocurrencies</p>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner"><div className="spinner" /></div>
            ) : items.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <Star size={48} />
                        <h3>Your watchlist is empty</h3>
                        <p>Go to the Market tab to find coins and add them to your watchlist</p>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="asset-list">
                        {items.map(item => {
                            const price = getPrice(item.coin_id);
                            const change = get24hChange(item.coin_id);
                            return (
                                <div key={item.coin_id} className="asset-row" onClick={() => setSelectedCoin(item)} style={{ cursor: 'pointer' }}>
                                    <div className="asset-icon">
                                        {item.coin_thumb ? (
                                            <img src={item.coin_thumb} alt="" />
                                        ) : (
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                                {item.coin_symbol?.substring(0, 2).toUpperCase()}
                                            </span>
                                        )}
                                    </div>
                                    <div className="asset-info">
                                        <div className="asset-name">{item.coin_name || item.coin_symbol.toUpperCase()}</div>
                                        <div className="asset-symbol">{item.coin_symbol.toUpperCase()}</div>
                                    </div>
                                    <div className="asset-values">
                                        <div className="asset-price">{formatValue(price)}</div>
                                        <div className={`asset-pnl ${change >= 0 ? 'positive' : 'negative'}`}>
                                            {change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                            {' '}{change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                        </div>
                                    </div>
                                    <button
                                        className="btn-icon"
                                        onClick={e => { e.stopPropagation(); removeFromWatchlist(item.coin_id); }}
                                        title="Remove from watchlist"
                                        style={{ width: 28, height: 28, marginLeft: 8 }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedCoin && (
                <CoinDetail coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
            )}
        </div>
    );
}
