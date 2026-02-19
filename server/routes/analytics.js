import { Router } from 'express';
import { authenticateToken } from './auth.js';
import Order from '../models/Order.js';
import PriceSnapshot from '../models/PriceSnapshot.js';
import Portfolio from '../models/Portfolio.js';
import User from '../models/User.js';

const router = Router();

// GET /api/analytics/:portfolioId
router.get('/:portfolioId', authenticateToken, async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({ _id: req.params.portfolioId, user: req.user.id });
        if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

        // Check subscription for advanced metrics
        const user = await User.findById(req.user.id);
        const isPro = user.subscription_tier === 'pro';

        const orders = await Order.find({ portfolio: req.params.portfolioId }).sort({ date: 1 });

        if (orders.length === 0) {
            return res.json({
                summary: 'No orders yet. Add your first trade to see analytics.',
                metrics: {},
                pro_required: !isPro,
            });
        }

        // Calculate holdings by coin
        const holdingsByCoin = {};
        const fifoQueues = {};
        let totalRealizedPnl = 0;
        let totalFees = 0;

        for (const order of orders) {
            const { coin_id, coin_symbol, coin_name, type, quantity, price_usd, fee_usd } = order;
            totalFees += fee_usd;

            if (!holdingsByCoin[coin_id]) {
                holdingsByCoin[coin_id] = { coin_id, coin_symbol, coin_name, quantity: 0, totalCost: 0 };
            }
            if (!fifoQueues[coin_id]) fifoQueues[coin_id] = [];

            if (type === 'buy') {
                holdingsByCoin[coin_id].quantity += quantity;
                holdingsByCoin[coin_id].totalCost += quantity * price_usd;
                fifoQueues[coin_id].push({ quantity, price: price_usd });
            } else {
                holdingsByCoin[coin_id].quantity -= quantity;
                // FIFO realized PnL calculation
                let remaining = quantity;
                while (remaining > 0 && fifoQueues[coin_id].length > 0) {
                    const lot = fifoQueues[coin_id][0];
                    const used = Math.min(remaining, lot.quantity);
                    totalRealizedPnl += used * (price_usd - lot.price);
                    lot.quantity -= used;
                    remaining -= used;
                    if (lot.quantity <= 0) fifoQueues[coin_id].shift();
                }
            }
        }

        // Calculate FIFO cost basis for remaining holdings
        const fifoCostBasis = {};
        for (const [coinId, queue] of Object.entries(fifoQueues)) {
            fifoCostBasis[coinId] = queue.reduce((sum, lot) => sum + lot.quantity * lot.price, 0);
        }

        // WAC per coin
        const wacPerCoin = {};
        for (const [coinId, h] of Object.entries(holdingsByCoin)) {
            if (h.quantity > 0) {
                const buyOrders = orders.filter(o => o.coin_id === coinId && o.type === 'buy');
                const totalBought = buyOrders.reduce((s, o) => s + o.quantity, 0);
                const totalSpent = buyOrders.reduce((s, o) => s + o.quantity * o.price_usd, 0);
                wacPerCoin[coinId] = totalBought > 0 ? totalSpent / totalBought : 0;
            }
        }

        // Portfolio snapshots for time series analysis
        const snapshots = await PriceSnapshot.find({ portfolio: req.params.portfolioId }).sort({ snapshot_date: 1 });

        // Calculate returns from snapshots
        const dailyReturns = [];
        for (let i = 1; i < snapshots.length; i++) {
            if (snapshots[i - 1].total_value_usd > 0) {
                dailyReturns.push(
                    (snapshots[i].total_value_usd - snapshots[i - 1].total_value_usd) / snapshots[i - 1].total_value_usd
                );
            }
        }

        // Basic metrics (available to all)
        const metrics = {
            total_invested: Object.values(holdingsByCoin).reduce((s, h) => s + h.totalCost, 0),
            realized_pnl: totalRealizedPnl,
            total_fees: totalFees,
            num_trades: orders.length,
            first_trade_date: orders[0]?.date,
            holdings_count: Object.values(holdingsByCoin).filter(h => h.quantity > 0.00000001).length,
            wac_per_coin: wacPerCoin,
            fifo_cost_basis: fifoCostBasis,
        };

        // Advanced metrics (Pro only)
        let advancedMetrics = {};
        if (isPro && dailyReturns.length > 1) {
            const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
            const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1);
            const stdDev = Math.sqrt(variance);
            const annualizedVolatility = stdDev * Math.sqrt(365);

            // Sharpe Ratio (assuming 0% risk-free rate for crypto)
            const annualizedReturn = avgReturn * 365;
            const sharpeRatio = annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;

            // Sortino Ratio (downside deviation only)
            const negativeReturns = dailyReturns.filter(r => r < 0);
            const downsideVariance = negativeReturns.length > 0
                ? negativeReturns.reduce((s, r) => s + r * r, 0) / negativeReturns.length
                : 0;
            const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(365);
            const sortinoRatio = downsideDeviation > 0 ? annualizedReturn / downsideDeviation : 0;

            // Max Drawdown
            let peak = -Infinity;
            let maxDrawdown = 0;
            for (const snapshot of snapshots) {
                if (snapshot.total_value_usd > peak) peak = snapshot.total_value_usd;
                const drawdown = peak > 0 ? (peak - snapshot.total_value_usd) / peak : 0;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            }

            // Risk concentration (Herfindahl index)
            const activeHoldings = Object.values(holdingsByCoin).filter(h => h.quantity > 0.00000001);
            const totalCost = activeHoldings.reduce((s, h) => s + h.totalCost, 0);
            const concentrationIndex = totalCost > 0
                ? activeHoldings.reduce((s, h) => s + Math.pow(h.totalCost / totalCost, 2), 0)
                : 0;

            advancedMetrics = {
                volatility_annual: annualizedVolatility,
                sharpe_ratio: sharpeRatio,
                sortino_ratio: sortinoRatio,
                max_drawdown: maxDrawdown,
                avg_daily_return: avgReturn,
                concentration_index: concentrationIndex,
                concentration_risk: concentrationIndex > 0.5 ? 'HIGH' : concentrationIndex > 0.25 ? 'MEDIUM' : 'LOW',
            };
        }

        // Auto-generated analysis summary
        const analysis = generateAnalysisSummary(holdingsByCoin, metrics, advancedMetrics, isPro);

        res.json({
            metrics: { ...metrics, ...advancedMetrics },
            equity_curve: snapshots.map(s => ({ date: s.snapshot_date, value: s.total_value_usd })),
            summary: analysis,
            pro_required: !isPro,
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

function generateAnalysisSummary(holdings, metrics, advanced, isPro) {
    const lines = [];
    const activeHoldings = Object.values(holdings).filter(h => h.quantity > 0.00000001);

    lines.push(`Your portfolio contains ${activeHoldings.length} active asset${activeHoldings.length !== 1 ? 's' : ''} across ${metrics.num_trades} trades.`);

    if (metrics.realized_pnl > 0) {
        lines.push(`You have realized gains of $${metrics.realized_pnl.toFixed(2)}.`);
    } else if (metrics.realized_pnl < 0) {
        lines.push(`You have realized losses of $${Math.abs(metrics.realized_pnl).toFixed(2)}.`);
    }

    if (metrics.total_fees > 0) {
        lines.push(`Total fees paid: $${metrics.total_fees.toFixed(2)}.`);
    }

    if (isPro && advanced.volatility_annual !== undefined) {
        lines.push('');
        lines.push('--- Advanced Insights ---');

        if (advanced.sharpe_ratio !== undefined) {
            if (advanced.sharpe_ratio > 1) lines.push('✅ Excellent risk-adjusted returns (Sharpe > 1.0).');
            else if (advanced.sharpe_ratio > 0.5) lines.push('📊 Decent risk-adjusted returns (Sharpe > 0.5).');
            else lines.push('⚠️ Low risk-adjusted returns. Consider diversification.');
        }

        if (advanced.max_drawdown !== undefined) {
            if (advanced.max_drawdown > 0.3) lines.push(`🔴 High max drawdown of ${(advanced.max_drawdown * 100).toFixed(1)}%. Consider risk management.`);
            else lines.push(`📉 Max drawdown: ${(advanced.max_drawdown * 100).toFixed(1)}%.`);
        }

        if (advanced.concentration_risk) {
            if (advanced.concentration_risk === 'HIGH') lines.push('🔴 HIGH concentration risk. Portfolio heavily weighted in few assets.');
            else if (advanced.concentration_risk === 'MEDIUM') lines.push('🟡 Moderate concentration. Consider adding diversification.');
            else lines.push('🟢 Well-diversified portfolio.');
        }

        lines.push(`📈 Annualized volatility: ${(advanced.volatility_annual * 100).toFixed(1)}%.`);
    }

    return lines.join('\n');
}

// POST /api/analytics/:portfolioId/snapshot — Record daily snapshot
router.post('/:portfolioId/snapshot', authenticateToken, async (req, res) => {
    const { total_value_usd } = req.body;
    const today = new Date().toISOString().split('T')[0];

    try {
        // Find existing snapshot by matching string date (simple approach) or create new
        // Ideally we would query by date range, but string match works if we store UTC
        const startOfDay = new Date(today);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await PriceSnapshot.findOne({
            portfolio: req.params.portfolioId,
            snapshot_date: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existing) {
            existing.total_value_usd = total_value_usd;
            await existing.save();
        } else {
            await PriceSnapshot.create({
                portfolio: req.params.portfolioId,
                total_value_usd,
                snapshot_date: startOfDay
            });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Snapshot error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
