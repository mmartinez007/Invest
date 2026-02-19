import React from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { usePrices } from '../context/PriceContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function AssetRow({ holding, portfolioValue, viewMode }) {
    const { formatValue } = useCurrency();
    const { getPrice, get24hChange } = usePrices();

    const currentPrice = getPrice(holding.coin_id);
    const change24h = get24hChange(holding.coin_id);
    const currentValue = holding.quantity * currentPrice;
    const pnl = currentValue - holding.total_cost;
    const pnlPct = holding.total_cost > 0 ? (pnl / holding.total_cost) * 100 : 0;
    const allocation = portfolioValue > 0 ? (currentValue / portfolioValue) * 100 : 0;
    const avgCost = holding.avg_cost || (holding.total_bought > 0 ? holding.total_cost / holding.total_bought : 0);

    if (viewMode === 'advanced') {
        return (
            <div className="asset-row asset-row-advanced">
                <div className="asset-icon">
                    <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {holding.coin_symbol?.substring(0, 2).toUpperCase()}
                    </span>
                </div>

                <div className="asset-info" style={{ minWidth: '100px' }}>
                    <div className="asset-name">{holding.coin_name || holding.coin_symbol.toUpperCase()}</div>
                    <div className="asset-symbol">
                        {holding.quantity.toFixed(holding.quantity < 1 ? 6 : 4)} {holding.coin_symbol.toUpperCase()}
                    </div>
                </div>

                {/* Current Price */}
                <div className="asset-col">
                    <div className="asset-price">{formatValue(currentPrice)}</div>
                    <div className={`asset-change-mini ${change24h >= 0 ? 'positive' : 'negative'}`}>
                        {change24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {' '}{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                    </div>
                </div>

                {/* Avg Cost */}
                <div className="asset-col">
                    <div style={{ fontSize: '0.85rem' }}>{formatValue(avgCost)}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>avg cost</div>
                </div>

                {/* Value */}
                <div className="asset-col">
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatValue(currentValue)}</div>
                </div>

                {/* P&L */}
                <div className="asset-col">
                    <div className={`asset-pnl ${pnl >= 0 ? 'positive' : 'negative'}`}>
                        {pnl >= 0 ? '+' : ''}{formatValue(pnl)}
                    </div>
                    <div className={`asset-change-mini ${pnlPct >= 0 ? 'positive' : 'negative'}`}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                    </div>
                </div>

                {/* Allocation */}
                <div className="asset-col">
                    <div className="allocation-bar-wrapper">
                        <div className="allocation-bar-bg">
                            <div className="allocation-bar-fill" style={{ width: `${Math.min(allocation, 100)}%` }} />
                        </div>
                        <span className="asset-allocation">{allocation.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        );
    }

    // Simple mode — clean, minimal
    return (
        <div className="asset-row">
            <div className="asset-icon">
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                    {holding.coin_symbol?.substring(0, 2).toUpperCase()}
                </span>
            </div>

            <div className="asset-info">
                <div className="asset-name">{holding.coin_name || holding.coin_symbol.toUpperCase()}</div>
                <div className="asset-symbol">
                    {holding.quantity.toFixed(holding.quantity < 1 ? 6 : 4)} {holding.coin_symbol.toUpperCase()}
                </div>
            </div>

            <div className="asset-values">
                <div className="asset-price">{formatValue(currentValue)}</div>
                <div className={`asset-pnl ${pnl >= 0 ? 'positive' : 'negative'}`}>
                    {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                </div>
            </div>
        </div>
    );
}
