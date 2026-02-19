import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Search } from 'lucide-react';

export default function AddOrderModal({ portfolioId, onClose, onSuccess }) {
    const { token } = useAuth();
    const [step, setStep] = useState('search'); // search | form
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedCoin, setSelectedCoin] = useState(null);
    const [type, setType] = useState('buy');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [fee, setFee] = useState('0');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const searchTimeoutRef = useRef(null);

    // Search coins
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            return;
        }
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/prices/search?query=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults(data);
                }
            } catch {
                setResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
    }, [query]);

    function selectCoin(coin) {
        setSelectedCoin(coin);
        setStep('form');
        // Try to get current price
        fetch(`/api/prices?ids=${coin.id}`)
            .then(r => r.json())
            .then(data => {
                if (data.prices?.[coin.id]?.usd) {
                    setPrice(data.prices[coin.id].usd.toString());
                }
            })
            .catch(() => { });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (!quantity || !price || !date) {
            setError('Please fill all required fields');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/orders/${portfolioId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    coin_id: selectedCoin.id,
                    coin_symbol: selectedCoin.symbol,
                    coin_name: selectedCoin.name,
                    type,
                    quantity: parseFloat(quantity),
                    price_usd: parseFloat(price),
                    fee_usd: parseFloat(fee) || 0,
                    date,
                    notes,
                }),
            });

            // Safely parse the response
            let data;
            const text = await res.text();
            try {
                data = text ? JSON.parse(text) : {};
            } catch {
                data = {};
            }

            if (!res.ok) {
                throw new Error(data.error || `Server error (${res.status})`);
            }
            onSuccess?.();
        } catch (err) {
            setError(err.message || 'Failed to add order');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3>{step === 'search' ? 'Select Cryptocurrency' : `Add ${type === 'buy' ? 'Buy' : 'Sell'} Order`}</h3>
                    <button className="btn-icon" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {step === 'search' ? (
                        <>
                            <div className="search-container">
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Search cryptocurrency (e.g., Bitcoin, ETH)..."
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            {searching && <div className="loading-spinner" style={{ padding: 'var(--spacing-md)' }}><div className="spinner" /></div>}
                            {results.length > 0 && (
                                <div className="search-results" style={{ position: 'relative', marginTop: 'var(--spacing-sm)' }}>
                                    {results.map(coin => (
                                        <button key={coin.id} className="search-result-item" onClick={() => selectCoin(coin)}>
                                            {coin.thumb && <img src={coin.thumb} alt="" />}
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{coin.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{coin.symbol.toUpperCase()}</div>
                                            </div>
                                            {coin.market_cap_rank && (
                                                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    #{coin.market_cap_rank}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Selected coin */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--spacing-md)' }}>
                                {selectedCoin.thumb && <img src={selectedCoin.thumb} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} />}
                                <span style={{ fontWeight: 600 }}>{selectedCoin.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{selectedCoin.symbol.toUpperCase()}</span>
                                <button type="button" onClick={() => setStep('search')} style={{ marginLeft: 'auto', background: 'none', color: 'var(--accent)', fontSize: '0.8rem' }}>
                                    Change
                                </button>
                            </div>

                            {/* Buy/Sell toggle */}
                            <div className="form-group">
                                <div className="mode-toggle" style={{ width: '100%' }}>
                                    <button type="button" className={type === 'buy' ? 'active' : ''} onClick={() => setType('buy')} style={{ flex: 1 }}>Buy</button>
                                    <button type="button" className={type === 'sell' ? 'active' : ''} onClick={() => setType('sell')} style={{ flex: 1 }}>Sell</button>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Quantity *</label>
                                    <input type="number" step="any" min="0" placeholder="0.00" value={quantity} onChange={e => setQuantity(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Price per coin (USD) *</label>
                                    <input type="number" step="any" min="0" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} required />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fee (USD)</label>
                                    <input type="number" step="any" min="0" placeholder="0.00" value={fee} onChange={e => setFee(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Date *</label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Notes (optional)</label>
                                <input type="text" placeholder="Exchange, reason, etc." value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>

                            {quantity && price && (
                                <div style={{ padding: 'var(--spacing-sm)', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--spacing-md)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    Total: <strong style={{ color: 'var(--text-primary)' }}>${(parseFloat(quantity) * parseFloat(price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                                </div>
                            )}

                            {error && <div className="form-error">{error}</div>}

                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
                                <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                                    {loading ? 'Adding...' : `Add ${type === 'buy' ? 'Buy' : 'Sell'} Order`}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
