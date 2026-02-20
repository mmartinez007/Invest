import supabase from '../../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { portfolioId } = req.query;

    try {
        const { data: portfolio } = await supabase
            .from('portfolios')
            .select('id')
            .eq('id', portfolioId)
            .eq('user_id', decoded.id)
            .single();

        if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

        // Check subscription
        const { data: user } = await supabase
            .from('users')
            .select('subscription_tier')
            .eq('id', decoded.id)
            .single();

        const isPro = user.subscription_tier === 'pro';

        const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .eq('portfolio_id', portfolioId)
            .order('date', { ascending: true });

        if (!orders || orders.length === 0) {
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

        // FIFO cost basis
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

        // Snapshots
        const { data: snapshots } = await supabase
            .from('price_snapshots')
            .select('*')
            .eq('portfolio_id', portfolioId)
            .order('snapshot_date', { ascending: true });

        const dailyReturns = [];
        if (snapshots) {
            for (let i = 1; i < snapshots.length; i++) {
                if (snapshots[i - 1].total_value_usd > 0) {
                    dailyReturns.push(
                        (snapshots[i].total_value_usd - snapshots[i - 1].total_value_usd) / snapshots[i - 1].total_value_usd
                    );
                }
            }
        }

        // Basic metrics
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
            const annualizedReturn = avgReturn * 365;
            const sharpeRatio = annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;

            const negativeReturns = dailyReturns.filter(r => r < 0);
            const downsideVariance = negativeReturns.length > 0
                ? negativeReturns.reduce((s, r) => s + r * r, 0) / negativeReturns.length
                : 0;
            const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(365);
            const sortinoRatio = downsideDeviation > 0 ? annualizedReturn / downsideDeviation : 0;

            let peak = -Infinity;
            let maxDrawdown = 0;
            for (const snapshot of (snapshots || [])) {
                if (snapshot.total_value_usd > peak) peak = snapshot.total_value_usd;
                const drawdown = peak > 0 ? (peak - snapshot.total_value_usd) / peak : 0;
                if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            }

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

        // Summary
        const activeHoldings = Object.values(holdingsByCoin).filter(h => h.quantity > 0.00000001);
        const lines = [];
        lines.push(`Your portfolio contains ${activeHoldings.length} active asset${activeHoldings.length !== 1 ? 's' : ''} across ${metrics.num_trades} trades.`);
        if (metrics.realized_pnl > 0) lines.push(`You have realized gains of $${metrics.realized_pnl.toFixed(2)}.`);
        else if (metrics.realized_pnl < 0) lines.push(`You have realized losses of $${Math.abs(metrics.realized_pnl).toFixed(2)}.`);
        if (metrics.total_fees > 0) lines.push(`Total fees paid: $${metrics.total_fees.toFixed(2)}.`);

        if (isPro && advancedMetrics.sharpe_ratio !== undefined) {
            lines.push('', '--- Advanced Insights ---');
            if (advancedMetrics.sharpe_ratio > 1) lines.push('✅ Excellent risk-adjusted returns (Sharpe > 1.0).');
            else if (advancedMetrics.sharpe_ratio > 0.5) lines.push('📊 Decent risk-adjusted returns (Sharpe > 0.5).');
            else lines.push('⚠️ Low risk-adjusted returns. Consider diversification.');
            lines.push(`📉 Max drawdown: ${(advancedMetrics.max_drawdown * 100).toFixed(1)}%.`);
            lines.push(`📈 Annualized volatility: ${(advancedMetrics.volatility_annual * 100).toFixed(1)}%.`);
        }

        res.json({
            metrics: { ...metrics, ...advancedMetrics },
            equity_curve: (snapshots || []).map(s => ({ date: s.snapshot_date, value: s.total_value_usd })),
            summary: lines.join('\n'),
            pro_required: !isPro,
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
