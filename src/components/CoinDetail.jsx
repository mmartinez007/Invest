import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { X, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { API_DOMAIN } from '../config';

export default function CoinDetail({ coin, onClose }) {
    const { formatValue } = useCurrency();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState([]);
    const [chartDays, setChartDays] = useState('7');
    const [chartLoading, setChartLoading] = useState(false);
    const [hoverPoint, setHoverPoint] = useState(null);

    const coinId = coin.id || coin.coin_id;

    useEffect(() => {
        loadCoinDetail();
    }, [coinId]);

    useEffect(() => {
        loadChartData();
    }, [coinId, chartDays]);

    async function loadCoinDetail() {
        setLoading(true);
        try {
            const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`);
            if (res.ok) {
                const data = await res.json();
                setDetail(data);
            }
        } catch (err) {
            console.error('Coin detail error:', err);
        } finally {
            setLoading(false);
        }
    }

    async function loadChartData() {
        setChartLoading(true);
        try {
            const res = await fetch(`${API_DOMAIN}/api/market?action=chart&coinId=${coinId}&days=${chartDays}`);
            if (res.ok) {
                const data = await res.json();
                setChartData(data.prices || []);
            }
        } catch (err) {
            console.error('Chart error:', err);
        } finally {
            setChartLoading(false);
        }
    }

    const d = detail;
    const price = d?.market_data?.current_price?.usd || coin.current_price || 0;
    const change24h = d?.market_data?.price_change_percentage_24h || coin.price_change_percentage_24h || 0;
    const change7d = d?.market_data?.price_change_percentage_7d || 0;
    const change30d = d?.market_data?.price_change_percentage_30d || 0;
    const marketCap = d?.market_data?.market_cap?.usd || coin.market_cap || 0;
    const volume = d?.market_data?.total_volume?.usd || coin.total_volume || 0;
    const ath = d?.market_data?.ath?.usd || 0;
    const athChange = d?.market_data?.ath_change_percentage?.usd || 0;
    const atl = d?.market_data?.atl?.usd || 0;
    const circulatingSupply = d?.market_data?.circulating_supply || 0;
    const totalSupply = d?.market_data?.total_supply || 0;
    const maxSupply = d?.market_data?.max_supply || 0;
    const high24h = d?.market_data?.high_24h?.usd || 0;
    const low24h = d?.market_data?.low_24h?.usd || 0;
    const pricePosition = high24h > low24h ? ((price - low24h) / (high24h - low24h)) * 100 : 50;

    const coinImage = d?.image?.large || d?.image?.small || coin.image || coin.thumb || coin.coin_thumb || '';
    const coinName = d?.name || coin.name || coin.coin_name || '';
    const coinSymbol = (d?.symbol || coin.symbol || coin.coin_symbol || '').toUpperCase();

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content coin-detail-modal">
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {coinImage && <img src={coinImage} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />}
                        <div>
                            <h3>{coinName}</h3>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{coinSymbol}</span>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading-spinner"><div className="spinner" /></div>
                    ) : (
                        <>
                            {/* Price Header */}
                            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                <div className="value-large" style={{ fontSize: '2rem' }}>
                                    {hoverPoint ? formatValue(hoverPoint.v) : formatValue(price)}
                                </div>
                                {hoverPoint ? (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {new Date(hoverPoint.t).toLocaleString()}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                        <span className={`value-change ${change24h >= 0 ? 'positive' : 'negative'}`}>
                                            {change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% (24h)
                                        </span>
                                        <span className={`value-change ${change7d >= 0 ? 'positive' : 'negative'}`}>
                                            {change7d >= 0 ? '+' : ''}{change7d.toFixed(2)}% (7d)
                                        </span>
                                        <span className={`value-change ${change30d >= 0 ? 'positive' : 'negative'}`}>
                                            {change30d >= 0 ? '+' : ''}{change30d.toFixed(2)}% (30d)
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Interactive Price Chart */}
                            <div className="coin-chart-section">
                                <div className="chart-timeframes">
                                    {[
                                        { key: '1', label: '24H' },
                                        { key: '7', label: '7D' },
                                        { key: '30', label: '1M' },
                                        { key: '90', label: '3M' },
                                        { key: '365', label: '1Y' },
                                        { key: 'max', label: 'ALL' },
                                    ].map(tf => (
                                        <button
                                            key={tf.key}
                                            className={`tf-btn ${chartDays === tf.key ? 'active' : ''}`}
                                            onClick={() => setChartDays(tf.key)}
                                        >
                                            {tf.label}
                                        </button>
                                    ))}
                                </div>
                                {chartLoading ? (
                                    <div className="loading-spinner" style={{ height: 180 }}><div className="spinner" /></div>
                                ) : (
                                    <InteractiveChart
                                        data={chartData}
                                        onHover={setHoverPoint}
                                        formatValue={formatValue}
                                    />
                                )}
                            </div>

                            {/* 24h Range */}
                            <div className="coin-range-section">
                                <div className="range-labels">
                                    <span>Low: {formatValue(low24h)}</span>
                                    <span className="range-title">24h Range</span>
                                    <span>High: {formatValue(high24h)}</span>
                                </div>
                                <div className="range-bar">
                                    <div className="range-fill" style={{ width: `${pricePosition}%` }} />
                                    <div className="range-indicator" style={{ left: `${pricePosition}%` }} />
                                </div>
                            </div>

                            {/* Market Data Grid */}
                            <div className="coin-stats-grid">
                                <div className="coin-stat">
                                    <span className="coin-stat-label">Market Cap</span>
                                    <span className="coin-stat-value">{formatValue(marketCap)}</span>
                                </div>
                                <div className="coin-stat">
                                    <span className="coin-stat-label">24h Volume</span>
                                    <span className="coin-stat-value">{formatValue(volume)}</span>
                                </div>
                                <div className="coin-stat">
                                    <span className="coin-stat-label">Circulating Supply</span>
                                    <span className="coin-stat-value">{circulatingSupply.toLocaleString()} {coinSymbol}</span>
                                </div>
                                {totalSupply > 0 && (
                                    <div className="coin-stat">
                                        <span className="coin-stat-label">Total Supply</span>
                                        <span className="coin-stat-value">{totalSupply.toLocaleString()}</span>
                                    </div>
                                )}
                                {maxSupply > 0 && (
                                    <div className="coin-stat">
                                        <span className="coin-stat-label">Max Supply</span>
                                        <span className="coin-stat-value">{maxSupply.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="coin-stat">
                                    <span className="coin-stat-label">All-Time High</span>
                                    <span className="coin-stat-value">
                                        {formatValue(ath)}
                                        <span className="coin-stat-sub negative"> ({athChange.toFixed(1)}%)</span>
                                    </span>
                                </div>
                                <div className="coin-stat">
                                    <span className="coin-stat-label">All-Time Low</span>
                                    <span className="coin-stat-value">{formatValue(atl)}</span>
                                </div>
                                {d?.market_cap_rank && (
                                    <div className="coin-stat">
                                        <span className="coin-stat-label">Market Cap Rank</span>
                                        <span className="coin-stat-value">#{d.market_cap_rank}</span>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {d?.description?.en && (
                                <div className="coin-description">
                                    <h4>About {coinName}</h4>
                                    <p dangerouslySetInnerHTML={{ __html: truncateHTML(d.description.en, 500) }} />
                                </div>
                            )}

                            {/* Links */}
                            {d?.links && (
                                <div className="coin-links">
                                    {d.links.homepage?.[0] && (
                                        <a href={d.links.homepage[0]} target="_blank" rel="noopener noreferrer" className="coin-link">
                                            <ExternalLink size={12} /> Website
                                        </a>
                                    )}
                                    {d.links.blockchain_site?.[0] && (
                                        <a href={d.links.blockchain_site[0]} target="_blank" rel="noopener noreferrer" className="coin-link">
                                            <ExternalLink size={12} /> Explorer
                                        </a>
                                    )}
                                    {d.links.subreddit_url && (
                                        <a href={d.links.subreddit_url} target="_blank" rel="noopener noreferrer" className="coin-link">
                                            <ExternalLink size={12} /> Reddit
                                        </a>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// Interactive SVG chart with hover tooltip
function InteractiveChart({ data, onHover, formatValue }) {
    const svgRef = useRef(null);
    const [dims] = useState({ w: 500, h: 180 });

    const handleMouseMove = useCallback((e) => {
        if (!svgRef.current || data.length === 0) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const pct = x / rect.width;
        const idx = Math.min(data.length - 1, Math.max(0, Math.round(pct * (data.length - 1))));
        onHover(data[idx]);
    }, [data, onHover]);

    const handleMouseLeave = useCallback(() => {
        onHover(null);
    }, [onHover]);

    if (!data || data.length === 0) {
        return <div style={{ height: dims.h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No chart data</div>;
    }

    const prices = data.map(p => p.v);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    const pad = 10;
    const positive = prices[prices.length - 1] >= prices[0];
    const color = positive ? '#00d68f' : '#ff4757';

    // Downsample to 150 points for performance
    const step = Math.max(1, Math.floor(data.length / 150));
    const sampled = data.filter((_, i) => i % step === 0 || i === data.length - 1);
    const sampledPrices = sampled.map(p => p.v);

    const points = sampledPrices.map((v, i) => {
        const x = pad + (i / (sampledPrices.length - 1)) * (dims.w - 2 * pad);
        const y = pad + (1 - (v - min) / range) * (dims.h - 2 * pad);
        return `${x},${y}`;
    }).join(' ');

    // Gradient area fill
    const firstPoint = `${pad},${dims.h - pad}`;
    const lastPoint = `${pad + (1) * (dims.w - 2 * pad)},${dims.h - pad}`;
    const areaPoints = `${firstPoint} ${points} ${lastPoint}`;

    return (
        <svg
            ref={svgRef}
            width="100%"
            height={dims.h}
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'crosshair', display: 'block' }}
        >
            <defs>
                <linearGradient id={`chartGrad_${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            {/* Area fill */}
            <polygon
                points={areaPoints}
                fill={`url(#chartGrad_${positive ? 'up' : 'down'})`}
            />
            {/* Line */}
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
            {/* Y-axis labels */}
            <text x={dims.w - 4} y={pad + 4} textAnchor="end" fill="var(--text-muted)" fontSize="9">
                {formatShort(max)}
            </text>
            <text x={dims.w - 4} y={dims.h - pad} textAnchor="end" fill="var(--text-muted)" fontSize="9">
                {formatShort(min)}
            </text>
        </svg>
    );
}

function formatShort(n) {
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
    if (n >= 1) return `$${n.toFixed(2)}`;
    return `$${n.toFixed(6)}`;
}

function truncateHTML(html, maxLen) {
    const text = html.replace(/<[^>]*>/g, '');
    if (text.length <= maxLen) return html;
    return text.substring(0, maxLen) + '...';
}
