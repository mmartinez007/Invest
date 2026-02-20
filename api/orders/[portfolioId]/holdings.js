import supabase from '../../../lib/supabase.js';
import { verifyToken, unauthorized, cors } from '../../../lib/auth.js';

export default async function handler(req, res) {
    cors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { portfolioId } = req.query;

    // Verify portfolio ownership
    const { data: portfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('id', portfolioId)
        .eq('user_id', decoded.id)
        .single();

    if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .eq('portfolio_id', portfolioId);

        // Aggregate in memory
        const holdingsMap = {};

        for (const o of (orders || [])) {
            if (!holdingsMap[o.coin_id]) {
                holdingsMap[o.coin_id] = {
                    coin_id: o.coin_id,
                    coin_symbol: o.coin_symbol,
                    coin_name: o.coin_name,
                    quantity: 0,
                    total_cost: 0,
                    total_bought: 0,
                    total_sold_value: 0,
                    total_fees: 0,
                    first_buy_date: o.date
                };
            }

            const h = holdingsMap[o.coin_id];
            h.total_fees += o.fee_usd;

            if (new Date(o.date) < new Date(h.first_buy_date)) {
                h.first_buy_date = o.date;
            }

            if (o.type === 'buy') {
                h.quantity += o.quantity;
                h.total_cost += o.quantity * o.price_usd;
                h.total_bought += o.quantity;
            } else {
                h.quantity -= o.quantity;
                h.total_sold_value += o.quantity * o.price_usd;
            }
        }

        const holdings = Object.values(holdingsMap)
            .filter(h => h.quantity > 0.00000001)
            .map(h => ({
                ...h,
                avg_cost: h.total_bought > 0 ? h.total_cost / h.total_bought : 0
            }))
            .sort((a, b) => b.total_cost - a.total_cost);

        res.json(holdings);
    } catch (err) {
        console.error('Holdings error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
