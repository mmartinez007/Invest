import React, { useState, useEffect, useRef } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { TrendingUp, TrendingDown, Star, Search, Flame, BarChart2, RefreshCw, Newspaper, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CoinDetail from '../components/CoinDetail';
import { API_DOMAIN } from '../config';

export default function Market() {
    const { formatValue, convert } = useCurrency();
    const { token } = useAuth();
    const toast = useToast();
    const [data, setData] = useState({ trending: [], topCoins: [], global: null });
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('top');
    const [searchQuery, setSearchQuery] = useState('');
    const [watchlist, setWatchlist] = useState([]);
    const [selectedCoin, setSelectedCoin] = useState(null);
    const [fgi, setFgi] = useState(null);
    const [news, setNews] = useState([]);
    const [lastRefresh, setLastRefresh] = useState(Date.now());
    const [refreshing, setRefreshing] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        loadMarketData();
        loadWatchlist();
        loadFGI();
        loadNews();

        // Auto-refresh every 2 minutes
        intervalRef.current = setInterval(() => {
            loadMarketData(true);
        }, 120000);

        return () => clearInterval(intervalRef.current);
    }, []);

    async function loadMarketData(silent = false) {
        if (!silent) setLoading(true);
        setRefreshing(true);
        try {
            const res = await fetch(`${API_DOMAIN}/api/market?action=trending`);
            if (res.ok) {
                const d = await res.json();
                setData(d);
                setLastRefresh(Date.now());
            }
        } catch (err) {
            console.error('Market data error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    async function loadWatchlist() {
        try {
            const res = await fetch(`${API_DOMAIN}/api/watchlist`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const items = await res.json();
                setWatchlist(items.map(i => i.coin_id));
            }
        } catch { }
    }

    async function loadFGI() {
        try {
            const res = await fetch(`${API_DOMAIN}/api/market?action=fgi`);
            if (res.ok) setFgi(await res.json());
        } catch { }
    }

    async function loadNews() {
        try {
            const res = await fetch(`${API_DOMAIN}/api/market?action=news`);
            if (res.ok) setNews(await res.json());
        } catch { }
    }

    async function toggleWatchlist(coin) {
        const isWatched = watchlist.includes(coin.id);
        if (isWatched) {
            await fetch(`${API_DOMAIN}/api/watchlist?coinId=${coin.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            setWatchlist(prev => prev.filter(id => id !== coin.id));
            toast.info(`${coin.name || coin.symbol} removed from watchlist`);
        } else {
            await fetch(`${API_DOMAIN}/api/watchlist`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    coin_id: coin.id,
                    coin_symbol: coin.symbol,
                    coin_name: coin.name,
                    coin_thumb: coin.image,
                })
            });
            setWatchlist(prev => [...prev, coin.id]);
            toast.success(`${coin.name || coin.symbol} added to watchlist`);
        }
    }

    const getFilteredCoins = () => {
        let coins = [...(data.topCoins || [])];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            coins = coins.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
        }
        switch (tab) {
            case 'gainers':
                return coins.filter(c => (c.price_change_percentage_24h || 0) > 0).sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0));
            case 'losers':
                return coins.filter(c => (c.price_change_percentage_24h || 0) < 0).sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0));
            default:
                return coins;
        }
    };

    const globalData = data.global;
    const timeSinceRefresh = Math.floor((Date.now() - lastRefresh) / 1000);

    return (
        <div className="market-page">
            {/* Global Stats Bar */}
            <div className="global-stats-bar">
                {globalData && (
                    <>
                        <div className="global-stat">
                            <span className="global-stat-label">Market Cap</span>
                            <span className="global-stat-value">${(globalData.total_market_cap?.usd / 1e12).toFixed(2)}T</span>
                        </div>
                        <div className="global-stat">
                            <span className="global-stat-label">24h Volume</span>
                            <span className="global-stat-value">${(globalData.total_volume?.usd / 1e9).toFixed(1)}B</span>
                        </div>
                        <div className="global-stat">
                            <span className="global-stat-label">BTC Dom.</span>
                            <span className="global-stat-value">{globalData.market_cap_percentage?.btc?.toFixed(1)}%</span>
                        </div>
                        <div className="global-stat">
                            <span className="global-stat-label">ETH Dom.</span>
                            <span className="global-stat-value">{globalData.market_cap_percentage?.eth?.toFixed(1)}%</span>
                        </div>
                    </>
                )}
                {fgi && (
                    <div className="global-stat fgi-stat">
                        <span className="global-stat-label">Fear & Greed</span>
                        <div className="fgi-badge" data-level={getFgiLevel(fgi.value)}>
                            <span className="fgi-value">{fgi.value}</span>
                            <span className="fgi-label">{fgi.label}</span>
                        </div>
                    </div>
                )}
                <button
                    className="refresh-btn"
                    onClick={() => { loadMarketData(); loadFGI(); loadNews(); }}
                    disabled={refreshing}
                    title="Refresh market data"
                >
                    <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                </button>
            </div>

            {/* News Ticker */}
            {news.length > 0 && (
                <div className="news-ticker">
                    <div className="news-ticker-icon"><Newspaper size={14} /></div>
                    <div className="news-ticker-content">
                        {news.slice(0, 6).map((item, i) => (
                            <span key={item.id} className={`news-item ${item.type}`}>
                                {item.thumb && <img src={item.thumb} alt="" className="news-thumb" />}
                                {item.title}
                                {i < Math.min(news.length, 6) - 1 && <span className="news-sep">•</span>}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Search & Tabs */}
            <div className="market-controls">
                <div className="market-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search coins..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="market-tabs">
                    {[
                        { key: 'top', label: 'Top 50', icon: BarChart2 },
                        { key: 'trending', label: 'Trending', icon: Flame },
                        { key: 'gainers', label: 'Gainers', icon: TrendingUp },
                        { key: 'losers', label: 'Losers', icon: TrendingDown },
                    ].map(t => (
                        <button
                            key={t.key}
                            className={`market-tab ${tab === t.key ? 'active' : ''}`}
                            onClick={() => setTab(t.key)}
                        >
                            <t.icon size={14} />
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trending Section */}
            {tab === 'trending' && (
                <div className="trending-section">
                    <div className="trending-grid">
                        {data.trending.map((coin, i) => (
                            <div key={coin.id} className="trending-card" onClick={() => setSelectedCoin(coin)}>
                                <div className="trending-rank">#{i + 1}</div>
                                <img src={coin.thumb} alt={coin.name} className="trending-thumb" />
                                <div className="trending-info">
                                    <div className="trending-name">{coin.name}</div>
                                    <div className="trending-symbol">{coin.symbol.toUpperCase()}</div>
                                </div>
                                {coin.market_cap_rank && (
                                    <span className="trending-mcrank">MCap #{coin.market_cap_rank}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Coin Table */}
            {tab !== 'trending' && (
                <div className="coin-table">
                    <div className="coin-table-header">
                        <span className="col-rank">#</span>
                        <span className="col-name">Name</span>
                        <span className="col-price">Price</span>
                        <span className="col-change">1h</span>
                        <span className="col-change">24h</span>
                        <span className="col-change hide-mobile">7d</span>
                        <span className="col-mcap hide-mobile">Market Cap</span>
                        <span className="col-sparkline hide-mobile">7d Chart</span>
                        <span className="col-action"></span>
                    </div>

                    {loading ? (
                        <div className="loading-spinner"><div className="spinner" /></div>
                    ) : (
                        getFilteredCoins().map(coin => {
                            const change1h = coin.price_change_percentage_1h_in_currency || 0;
                            const change24h = coin.price_change_percentage_24h || 0;
                            const change7d = coin.price_change_percentage_7d_in_currency || 0;
                            const isWatched = watchlist.includes(coin.id);

                            return (
                                <div key={coin.id} className="coin-table-row" onClick={() => setSelectedCoin(coin)}>
                                    <span className="col-rank">{coin.market_cap_rank}</span>
                                    <div className="col-name">
                                        <img src={coin.image} alt="" className="coin-thumb" />
                                        <div>
                                            <span className="coin-name-text">{coin.name}</span>
                                            <span className="coin-symbol-text">{coin.symbol.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <span className="col-price">{formatValue(coin.current_price)}</span>
                                    <span className={`col-change ${change1h >= 0 ? 'positive' : 'negative'}`}>
                                        {change1h >= 0 ? '+' : ''}{change1h.toFixed(2)}%
                                    </span>
                                    <span className={`col-change ${change24h >= 0 ? 'positive' : 'negative'}`}>
                                        {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                                    </span>
                                    <span className={`col-change hide-mobile ${change7d >= 0 ? 'positive' : 'negative'}`}>
                                        {change7d >= 0 ? '+' : ''}{change7d.toFixed(2)}%
                                    </span>
                                    <span className="col-mcap hide-mobile">{formatValue(coin.market_cap)}</span>
                                    <span className="col-sparkline hide-mobile">
                                        {coin.sparkline_in_7d?.price && (
                                            <MiniSparkline data={coin.sparkline_in_7d.price} positive={change7d >= 0} />
                                        )}
                                    </span>
                                    <span className="col-action" onClick={e => { e.stopPropagation(); toggleWatchlist(coin); }}>
                                        <Star size={16} className={isWatched ? 'star-active' : 'star-inactive'} />
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {selectedCoin && (
                <CoinDetail coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
            )}
        </div>
    );
}

function getFgiLevel(value) {
    if (value <= 25) return 'extreme-fear';
    if (value <= 45) return 'fear';
    if (value <= 55) return 'neutral';
    if (value <= 75) return 'greed';
    return 'extreme-greed';
}

// Mini sparkline chart (pure SVG)
function MiniSparkline({ data, positive }) {
    if (!data || data.length === 0) return null;

    const step = Math.max(1, Math.floor(data.length / 30));
    const sampled = data.filter((_, i) => i % step === 0);

    const min = Math.min(...sampled);
    const max = Math.max(...sampled);
    const range = max - min || 1;
    const w = 100;
    const h = 30;

    const points = sampled.map((v, i) => {
        const x = (i / (sampled.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
    }).join(' ');

    const color = positive ? '#00d68f' : '#ff4757';

    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
