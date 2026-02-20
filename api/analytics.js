import supabase from '../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const portfolioId = req.query.portfolioId || '';
    const action = req.query.action || '';

    if (!portfolioId) return res.status(400).json({ error: 'portfolioId required' });

    const { data: portfolio } = await supabase.from('portfolios').select('id').eq('id', portfolioId).eq('user_id', decoded.id).single();
    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    try {
        // ===== SNAPSHOT =====
        if (action === 'snapshot' && req.method === 'POST') {
            const { total_value_usd } = req.body;
            const today = new Date().toISOString().split('T')[0];

            const { data: existing } = await supabase.from('price_snapshots').select('id').eq('portfolio_id', portfolioId).eq('snapshot_date', today).single();
            if (existing) {
                await supabase.from('price_snapshots').update({ total_value_usd }).eq('id', existing.id);
            } else {
                await supabase.from('price_snapshots').insert({ portfolio_id: portfolioId, total_value_usd, snapshot_date: today });
            }
            return res.json({ success: true });
        }

        // ===== GET ANALYTICS =====
        if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

        const { data: user } = await supabase.from('users').select('subscription_tier').eq('id', decoded.id).single();
        const isPro = user.subscription_tier === 'pro';

        const { data: orders } = await supabase.from('orders').select('*').eq('portfolio_id', portfolioId).order('date', { ascending: true });

        if (!orders || orders.length === 0) {
            return res.json({ summary: 'No orders yet. Add your first trade to see analytics.', metrics: {}, pro_required: !isPro });
        }

        const holdingsByCoin = {};
        const fifoQueues = {};
        let totalRealizedPnl = 0, totalFees = 0;

        for (const order of orders) {
            totalFees += order.fee_usd;
            if (!holdingsByCoin[order.coin_id]) holdingsByCoin[order.coin_id] = { coin_id: order.coin_id, coin_symbol: order.coin_symbol, coin_name: order.coin_name, quantity: 0, totalCost: 0 };
            if (!fifoQueues[order.coin_id]) fifoQueues[order.coin_id] = [];

            if (order.type === 'buy') {
                holdingsByCoin[order.coin_id].quantity += order.quantity;
                holdingsByCoin[order.coin_id].totalCost += order.quantity * order.price_usd;
                fifoQueues[order.coin_id].push({ quantity: order.quantity, price: order.price_usd });
            } else {
                holdingsByCoin[order.coin_id].quantity -= order.quantity;
                let remaining = order.quantity;
                while (remaining > 0 && fifoQueues[order.coin_id].length > 0) {
                    const lot = fifoQueues[order.coin_id][0];
                    const used = Math.min(remaining, lot.quantity);
                    totalRealizedPnl += used * (order.price_usd - lot.price);
                    lot.quantity -= used;
                    remaining -= used;
                    if (lot.quantity <= 0) fifoQueues[order.coin_id].shift();
                }
            }
        }

        const fifoCostBasis = {};
        for (const [coinId, queue] of Object.entries(fifoQueues)) {
            fifoCostBasis[coinId] = queue.reduce((sum, lot) => sum + lot.quantity * lot.price, 0);
        }

        const wacPerCoin = {};
        for (const [coinId, h] of Object.entries(holdingsByCoin)) {
            if (h.quantity > 0) {
                const buyOrders = orders.filter(o => o.coin_id === coinId && o.type === 'buy');
                const totalBought = buyOrders.reduce((s, o) => s + o.quantity, 0);
                const totalSpent = buyOrders.reduce((s, o) => s + o.quantity * o.price_usd, 0);
                wacPerCoin[coinId] = totalBought > 0 ? totalSpent / totalBought : 0;
            }
        }

        const { data: snapshots } = await supabase.from('price_snapshots').select('*').eq('portfolio_id', portfolioId).order('snapshot_date', { ascending: true });

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

        let advancedMetrics = {};
        if (isPro && snapshots && snapshots.length > 1) {
            const dailyReturns = [];
            for (let i = 1; i < snapshots.length; i++) {
                if (snapshots[i - 1].total_value_usd > 0) dailyReturns.push((snapshots[i].total_value_usd - snapshots[i - 1].total_value_usd) / snapshots[i - 1].total_value_usd);
            }

            if (dailyReturns.length > 1) {
                const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
                const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (dailyReturns.length - 1);
                const stdDev = Math.sqrt(variance);
                const annualizedVolatility = stdDev * Math.sqrt(365);
                const annualizedReturn = avgReturn * 365;
                const sharpeRatio = annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;

                let peak = -Infinity, maxDrawdown = 0;
                for (const s of snapshots) { if (s.total_value_usd > peak) peak = s.total_value_usd; const dd = peak > 0 ? (peak - s.total_value_usd) / peak : 0; if (dd > maxDrawdown) maxDrawdown = dd; }

                advancedMetrics = { volatility_annual: annualizedVolatility, sharpe_ratio: sharpeRatio, max_drawdown: maxDrawdown, avg_daily_return: avgReturn };
            }
        }

        const activeHoldings = Object.values(holdingsByCoin).filter(h => h.quantity > 0.00000001);
        const lines = [`Your portfolio contains ${activeHoldings.length} active asset${activeHoldings.length !== 1 ? 's' : ''} across ${metrics.num_trades} trades.`];
        if (metrics.realized_pnl > 0) lines.push(`Realized gains: $${metrics.realized_pnl.toFixed(2)}.`);
        else if (metrics.realized_pnl < 0) lines.push(`Realized losses: $${Math.abs(metrics.realized_pnl).toFixed(2)}.`);
        if (metrics.total_fees > 0) lines.push(`Total fees: $${metrics.total_fees.toFixed(2)}.`);

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
